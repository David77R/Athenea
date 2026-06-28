const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id   SERIAL PRIMARY KEY,
      name VARCHAR(64) UNIQUE NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email         VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id       INTEGER NOT NULL REFERENCES roles(id),
      nombre        VARCHAR(255) NOT NULL DEFAULT '',
      telefono      VARCHAR(64)  NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS nombre   VARCHAR(255) NOT NULL DEFAULT '';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(64)  NOT NULL DEFAULT '';`);

  // Cédula: la usa /register desde hace tiempo pero faltaba en el schema (bug detectado en Fase 4).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cedula VARCHAR(20) NOT NULL DEFAULT '';`);

  // Verificación de cuenta por correo (Fase 4b).
  // DEFAULT true: las cuentas que ya existen en la base quedan verificadas automáticamente
  // al aplicar esta migración, para no bloquear el acceso de usuarios ya registrados.
  // Los registros nuevos (vía /register) sobreescriben este default explícitamente a false.
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT true;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS token_verificacion VARCHAR(128);`);

  await pool.query(`
    INSERT INTO roles (name) VALUES ('optometrist'), ('admin')
    ON CONFLICT (name) DO NOTHING;
  `);
}

module.exports = { pool, initSchema };