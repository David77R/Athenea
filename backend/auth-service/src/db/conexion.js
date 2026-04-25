const { Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});

pool.on('connect', () => {
    console.log('Conectado a PostgreSQL 😁');
});

pool.on('error', (err) => {
    console.error('Verifica tu vaina 😒: ', err.message);
});

module.exports = pool;