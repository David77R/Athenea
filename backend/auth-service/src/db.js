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
  await pool.query(`
    INSERT INTO roles (name) VALUES ('optometrist'), ('admin')
    ON CONFLICT (name) DO NOTHING;
  `);
}

module.exports = { pool, initSchema };
