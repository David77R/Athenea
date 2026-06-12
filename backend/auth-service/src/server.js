require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const { pool, initSchema } = require("./db");
const { getRedis } = require("./redisClient");

const app        = express();
const PORT       = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

function assertEnv() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL es obligatoria");
  if (!JWT_SECRET || JWT_SECRET.length < 16) throw new Error("JWT_SECRET inválido");
}

// ── Middleware verificar token ────────────────────────────────────────────────
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

// ── POST /register ────────────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  console.log('registro recibido:', req.body);
const { email, password, nombre = '', telefono = '', cedula = '' } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password requeridos" });

  const passwordHash = await bcrypt.hash(password, 12);
  try {
  const result = await pool.query(
  `INSERT INTO users (email, password_hash, role_id, nombre, telefono, cedula)
   VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'optometrist' LIMIT 1), $3, $4, $5)
   RETURNING id, email, role_id, nombre, telefono, cedula, created_at`,
  [email.toLowerCase(), passwordHash, nombre.trim(), telefono.trim(), cedula.trim()]
);
    const user  = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    const redis = await getRedis();
    await redis.setEx(`session:${user.id}`, 60 * 60 * 8, token);
  return res.status(201).json({
  token,
  user: { 
    id:       user.id, 
    email:    user.email, 
    nombre:   user.nombre   || '',
    telefono: user.telefono || '',
    cedula:   user.cedula   || '',
  },
});
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "email ya registrado" });
    console.error(e);
    return res.status(500).json({ error: "error interno" });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email y password requeridos" });

  const result = await pool.query(
    `SELECT u.*, r.name AS rol
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.email = $1`,
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "credenciales inválidas" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "credenciales inválidas" });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
  const redis = await getRedis();
  await redis.setEx(`session:${user.id}`, 60 * 60 * 8, token);

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

// ── GET /me ───────────────────────────────────────────────────────────────────
app.get("/me", verificarToken, (req, res) => {
  res.json({ user: req.usuario });
});

// ── GET /perfil ───────────────────────────────────────────────────────────────
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

// ── PUT /perfil ───────────────────────────────────────────────────────────────
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

// ── GET /health ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));

async function main() {
  assertEnv();
  await initSchema();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`auth-service escuchando en :${PORT}`);
  });
}

main().catch((err) => { console.error(err); process.exit(1); });
