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
const BLOQUEO_SEGUNDOS    = 15 * 60; // 15 minutos

app.use(cors());
app.use(express.json());

function assertEnv() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatoria");
  if (!JWT_SECRET || JWT_SECRET.length < 16) throw new Error("JWT_SECRET inválido");
}

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

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE CONTRASEÑA ESTILO BANCARIO
// Reglas: mínimo 8 caracteres, mayúscula, minúscula, número y símbolo especial.
// Se valida también aquí (no solo en el frontend) porque el frontend se puede
// saltar llamando directo a la API — esta es la capa que de verdad protege.
// ─────────────────────────────────────────────────────────────────────────────
function validarPassword(password) {
  const errores = [];
  if (!password || password.length < 8)        errores.push("mínimo 8 caracteres");
  if (!/[A-Z]/.test(password || ''))            errores.push("al menos una mayúscula");
  if (!/[a-z]/.test(password || ''))            errores.push("al menos una minúscula");
  if (!/[0-9]/.test(password || ''))            errores.push("al menos un número");
  if (!/[^A-Za-z0-9]/.test(password || ''))     errores.push("al menos un símbolo especial (ej: !@#$%)");
  return errores;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING DE LOGIN (Fase 4a) — bloqueo temporal tras intentos fallidos
// ─────────────────────────────────────────────────────────────────────────────

function claveIntentos(email) {
  return `login_attempts:${email.toLowerCase()}`;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICACIÓN DE EMAIL (Fase 4b) — Gmail + Nodemailer
// ─────────────────────────────────────────────────────────────────────────────

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
    subject: "Confirma tu cuenta en Athenea",
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

// Página HTML mostrada al usuario cuando toca el link de verificación desde
// su correo (se abre en el navegador del celular, no dentro de la app).
// Diseño tipo "tarjeta de alerta" centrada, siguiendo la paleta de Athenea.
function paginaConfirmacion({ exito, titulo, mensaje }) {
  const colorPrincipal = exito ? '#0B7B8B' : '#C62828';
  const colorFondoIcono = exito ? '#E8F8F9' : '#FDEAEA';
  const icono = exito
    ? `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M20 6L9 17l-5-5" stroke="${colorPrincipal}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M18 6L6 18M6 6l12 12" stroke="${colorPrincipal}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo} — Athenea</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #0D3B44, #0B7B8B);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .tarjeta {
      background: #fff;
      border-radius: 24px;
      padding: 40px 32px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
    .icono-circulo {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: ${colorFondoIcono};
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px;
    }
    h1 {
      font-size: 22px;
      color: #0D3B44;
      margin-bottom: 12px;
      font-weight: 800;
    }
    p {
      font-size: 15px;
      color: #6A9BAB;
      line-height: 1.6;
    }
    .marca {
      margin-top: 32px;
      font-size: 12px;
      color: #AAC4CC;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="tarjeta">
    <div class="icono-circulo">${icono}</div>
    <h1>${titulo}</h1>
    <p>${mensaje}</p>
    <div class="marca">Athenea</div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

app.post("/register", async (req, res) => {
  console.log('registro recibido:', { ...req.body, password: '[REDACTADO]' });
  const { email, password, nombre = '', telefono = '', cedula = '' } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password requeridos" });

  // Validación de contraseña estilo bancario — capa de seguridad real,
  // independiente de la validación que ya hace el frontend.
  const erroresPassword = validarPassword(password);
  if (erroresPassword.length > 0) {
    return res.status(400).json({
      error: "contraseña insegura",
      mensaje: `La contraseña debe tener: ${erroresPassword.join(', ')}.`,
      requisitos: erroresPassword,
    });
  }

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

    // No se espera (await) el envío del correo antes de responder — el envío
    // por Gmail puede tardar más de lo razonable para que el celular lo espere,
    // y bloquear la respuesta HTTP hasta que Gmail confirme provoca que la app
    // aborte por timeout y caiga al modo local, aunque el registro sí se haya
    // completado correctamente en el servidor.
    enviarCorreoVerificacion(user.email, tokenVerificacion).catch((errCorreo) => {
      console.error("[/register] Error enviando correo de verificación:", errCorreo.message);
    });

    // No se devuelve token: la cuenta no puede usarse hasta confirmar el correo.
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
    return res.status(400).send(paginaConfirmacion({
      exito: false,
      titulo: 'Enlace inválido',
      mensaje: 'Este enlace de confirmación no es válido.',
    }));
  }

  try {
    const result = await pool.query(
      `UPDATE users SET email_verificado = true, token_verificacion = NULL
       WHERE token_verificacion = $1
       RETURNING id, email`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).send(paginaConfirmacion({
        exito: false,
        titulo: 'Enlace ya utilizado',
        mensaje: 'Este enlace de verificación ya no es válido. Si tu cuenta ya está confirmada, puedes iniciar sesión con normalidad.',
      }));
    }

    return res.send(paginaConfirmacion({
      exito: true,
      titulo: '¡Cuenta confirmada!',
      mensaje: 'Ya puede volver a la aplicación e iniciar sesión.',
    }));
  } catch (e) {
    console.error(e);
    return res.status(500).send(paginaConfirmacion({
      exito: false,
      titulo: 'Error interno',
      mensaje: 'No se pudo verificar la cuenta. Intenta de nuevo más tarde.',
    }));
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

  if (!user.email_verificado) {
    return res.status(403).json({
      error: "email no verificado",
      mensaje: "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
    });
  }

  await limpiarIntentosFallidos(redis, email);

  // JWT eterno: no se pasa "expiresIn", por lo que el token no incluye
  // claim "exp" y jwt.verify() lo trata como válido indefinidamente.
  // Decisión explícita del proyecto — ver advertencia de seguridad asociada.
  const token = jwt.sign(
    { sub: user.id, email: user.email, role_id: user.role_id },
    JWT_SECRET
  );

  // La clave de sesión en Redis también queda sin expiración, por consistencia
  // con la filosofía de sesión "eterna" (aunque esta clave no es la que
  // realmente autoriza el acceso — eso lo hace jwt.verify sobre el token).
  await redis.set(`session:${user.id}`, token);

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