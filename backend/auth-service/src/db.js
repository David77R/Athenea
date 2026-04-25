/**
 * Capa de acceso a PostgreSQL.
 * DATABASE_URL debe venir del entorno (Docker Compose / .env), nunca hardcodeada.
 */
const { Pool } = require("pg");

const pool = new Pool({
  user: 'athenea',
  host: 'postgres',
  database: 'athenea_db',
  password: 'athenea_dev',
  port: 5432,
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

/**
 * Crea tablas mínimas para la tesis: usuarios y roles con integridad referencial.
 * En producción migrarías esto a herramientas tipo Knex/Flyway.
 */
async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) UNIQUE NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL REFERENCES roles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    INSERT INTO roles (name) VALUES ('optometrist'), ('admin')
    ON CONFLICT (name) DO NOTHING;
  `);
}

module.exports = { pool, initSchema };
