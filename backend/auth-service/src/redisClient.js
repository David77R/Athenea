/**
 * Cliente Redis: revocación ligera de sesiones / rate limit / caché de JWKS futura.
 * URL desde variable de entorno REDIS_URL.
 */
const { createClient } = require("redis");

let client;

async function getRedis() {
  if (client && client.isOpen) return client;
  client = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" });
  client.on("error", (err) => console.error("Redis Client Error", err));
  await client.connect();
  return client;
}

module.exports = { getRedis };
