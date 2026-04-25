/**
 * Punto de entrada del auth-service.
 * - Carga variables desde process.env (inyectadas por Docker).
 * - Inicializa esquema PostgreSQL y expone rutas REST.
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool, initSchema } = require("./db");
const { getRedis } = require("./redisClient");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

function assertEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatoria");
  }
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw new Error("JWT_SECRET debe existir y tener longitud razonable");
  }
}

/**
 * Registro: crea usuario con rol por defecto (optometrist = id esperado 1).
 */
app.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email y password requeridos" });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role_id)
       VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'optometrist' LIMIT 1))
       RETURNING id, email, role_id, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { sub: user.id, email: user.email, role_id: user.role_id },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    const redis = await getRedis();
    await redis.setEx(`session:${user.id}`, 60 * 60 * 8, token);
    return res.status(201).json({ user: { id: user.id, email: user.email }, token });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ error: "email ya registrado" });
    }
    console.error(e);
    return res.status(500).json({ error: "error interno" });
  }
});

/**
 * Login: valida credencial y emite JWT firmado.
 */
app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email y password requeridos" });
  }
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "credenciales inválidas" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "credenciales inválidas" });
  const token = jwt.sign(
    { sub: user.id, email: user.email, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  const redis = await getRedis();
  await redis.setEx(`session:${user.id}`, 60 * 60 * 8, token);
  return res.json({ token });
});

/**
 * Verificación simple del token (el gateway o servicios downstream pueden replicar con jwt.verify).
 */
app.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "sin token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ user: payload });
  } catch {
    return res.status(401).json({ error: "token inválido" });
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
