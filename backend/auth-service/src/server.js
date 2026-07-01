require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const nodemailer = require("nodemailer");
const { pool, initSchema } = require("./db");
const { getRedis } = require("./redisClient");

const app        = express();
const PORT       = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET;

const MAX_INTENTOS_LOGIN  = 5;
const BLOQUEO_SEGUNDOS    = 15 * 60; 

app.use(cors());
app.use(express.json());

function assertEnv() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatoria");
  if (!JWT_SECRET || JWT_SECRET.length < 16) throw new Error("JWT_SECRET inválido");
}

/**
 * se implementa el middleware para validar el jwt
 * de ser valido agrega el payload decodificado en req.usuario.
 * @param {Object} req - Solicitud HTTP con header Authorization: Bearer <token>.
 * @param {Object} res - Respuesta HTTP.
 * @param {Function} next - Siguiente middleware en la cadena.
 */

function verificarToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'sin token' });
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'token inválido' });
  }
}

/**
 * Bloquea por intentos fallidos y verifica con nodemailer
 * @param {string} email
 * @returns {string} clave login_attempts:<email>
 */
function claveIntentos(email) {
  return `login_attempts:${email.toLowerCase()}`;
}

/**
 * contador de intentos fallidos en redis para un email
 * al primer fallido reinicia con un ttl 15 mins
 * @param {Object} redis - Cliente Redis activo
 * @param {string} email - Correo del usuario que falló el login
 * @returns {Promise<number>} total intentos
 */

async function registrarIntentoFallido(redis, email) {
  const key = claveIntentos(email);
  const intentos = await redis.incr(key);
  if (intentos === 1) {
    await redis.expire(key, BLOQUEO_SEGUNDOS);
  }
  return intentos;
}

async function obtenerEstadoBloqueo(redis, email) {
  const key = claveIntentos(email);
  const intentos = await redis.get(key);
  if (!intentos || Number(intentos) < MAX_INTENTOS_LOGIN) {
    return { bloqueado: false };
  }
  const ttl = await redis.ttl(key);
  const minutosRestantes = ttl > 0 ? Math.ceil(ttl / 60) : 0;
  return { bloqueado: true, minutosRestantes };
}

async function limpiarIntentosFallidos(redis, email) {
  await redis.del(claveIntentos(email));
}


let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

function generarTokenVerificacion() {
  return crypto.randomBytes(32).toString("hex");
}

async function enviarCorreoVerificacion(email, token) {
  const baseUrl = process.env.AUTH_SERVICE_PUBLIC_URL || `http://localhost:${PORT}`;
  const urlVerificacion = `${baseUrl}/verificar-email?token=${token}`;

  await getTransporter().sendMail({
    from: `"Athenea" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Confirme su cuenta en Athenea",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0B7B8B;">Bienvenido a Athenea</h2>
        <p>Para activar tu cuenta, confirma tu correo electrónico haciendo clic en el siguiente botón:</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${urlVerificacion}" style="background: #0B7B8B; color: #fff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Confirmar mi cuenta
          </a>
        </p>
        <p style="color: #6A9BAB; font-size: 13px;">Si no creaste esta cuenta, puedes ignorar este correo.</p>
      </div>
    `,
  });
}



app.post("/register", async (req, res) => {
  console.log('registro recibido:', req.body);
  const { email, password, nombre = '', telefono = '', cedula = '' } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password requeridos" });

  const passwordHash = await bcrypt.hash(password, 12);
  const tokenVerificacion = generarTokenVerificacion();

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role_id, nombre, telefono, cedula, email_verificado, token_verificacion)
       VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'optometrist' LIMIT 1), $3, $4, $5, false, $6)
       RETURNING id, email, role_id, nombre, telefono, cedula, created_at`,
      [email.toLowerCase(), passwordHash, nombre.trim(), telefono.trim(), cedula.trim(), tokenVerificacion]
    );
    const user = result.rows[0];

    try {
      await enviarCorreoVerificacion(user.email, tokenVerificacion);
    } catch (errCorreo) {
  /**
   * El registro ya quedó guardado, solo falló el correo - Se registra el error pero no se cancela el registro
   */
      console.error("[/register] Error enviando correo de verificación:", errCorreo.message);
    }

    /**
     * no devuelve token no se puede usar hasta confirm email 
     */
    return res.status(201).json({
      mensaje: "Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.",
      email: user.email,
    });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "email ya registrado" });
    console.error(e);
    return res.status(500).json({ error: "error interno" });
  }
});

app.get("/verificar-email", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send("<h2>Enlace inválido.</h2>");
  }

  try {
    const result = await pool.query(
      `UPDATE users SET email_verificado = true, token_verificacion = NULL
       WHERE token_verificacion = $1
       RETURNING id, email`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
          <h2 style="color: #C62828;">Enlace inválido o ya utilizado</h2>
          <p>Este enlace de verificación ya no es válido. Si tu cuenta ya está confirmada, puedes iniciar sesión normalmente.</p>
        </body></html>
      `);
    }

    return res.send(`
      <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
        <h2 style="color: #0B7B8B;">¡Cuenta confirmada!</h2>
        <p>Tu correo fue verificado correctamente. Ya puedes volver a la app de Athenea e iniciar sesión.</p>
      </body></html>
    `);
  } catch (e) {
    console.error(e);
    return res.status(500).send("<h2>Error interno al verificar la cuenta.</h2>");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password requeridos" });

  const redis = await getRedis();

  const estadoBloqueo = await obtenerEstadoBloqueo(redis, email);
  if (estadoBloqueo.bloqueado) {
    return res.status(429).json({
      error: "demasiados intentos fallidos",
      mensaje: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${estadoBloqueo.minutosRestantes} minuto(s).`,
      minutosRestantes: estadoBloqueo.minutosRestantes,
    });
  }

  const result = await pool.query(
    `SELECT u.*, r.name AS rol
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) {
    await registrarIntentoFallido(redis, email);
    return res.status(401).json({ error: "credenciales inválidas" });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const intentos = await registrarIntentoFallido(redis, email);
    const restantes = Math.max(0, MAX_INTENTOS_LOGIN - intentos);
    return res.status(401).json({
      error: "credenciales inválidas",
      intentosRestantes: restantes,
    });
  }

  /**
   * procesa la verificación de email sin mostrar si una cuenta existe
   */
  if (!user.email_verificado) {
    return res.status(403).json({
      error: "email no verificado",
      mensaje: "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
    });
  }

  await limpiarIntentosFallidos(redis, email);

  const token = jwt.sign(
    { sub: user.id, email: user.email, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
  await redis.setEx(`session:${user.id}`, 60 * 60 * 24 * 30, token);
  return res.json({
    token,
    user: {
      id:       user.id,
      email:    user.email,
      nombre:   user.nombre   || '',
      telefono: user.telefono || '',
      cedula: user.cedula     || '',
      rol:      user.rol      || 'optometrist',
    },
  });
});

app.get("/me", verificarToken, (req, res) => {
  res.json({ user: req.usuario });
});

app.get("/perfil", verificarToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.nombre, u.telefono, r.name AS rol, u.created_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [req.usuario.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'error interno' });
  }
});

app.put("/perfil", verificarToken, async (req, res) => {
  const { nombre = '', telefono = '' } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE users SET nombre = $1, telefono = $2 WHERE id = $3
       RETURNING id, email, nombre, telefono`,
      [nombre.trim(), telefono.trim(), req.usuario.sub]
    );
    res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'error interno' });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));

async function main() {
  assertEnv();
  await initSchema();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`auth-service escuchando en :${PORT}`);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });