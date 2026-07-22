import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('athenea_db');

export async function inicializarDB() {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS historias_pendientes(
      id          TEXT PRIMARY KEY,
      datos       TEXT NOT NULL,
      sincronizado INTEGER DEFAULT 0,
      creado_en   TEXT DEFAULT (datetime('now'))
    );
  `);

  try {
    await db.execAsync(`ALTER TABLE historias_pendientes ADD COLUMN actualizado_en TEXT;`);
  } catch (e) {
    // La columna ya existe (proyectos ya inicializados antes de este cambio)
  }

  console.log('Base de datos local lista ✓');
}

export async function guardarHistoriaLocal(id, datos) {
  await db.runAsync(
    `INSERT INTO historias_pendientes (id, datos, sincronizado, actualizado_en)
     VALUES (?, ?, 0, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       datos = excluded.datos,
       sincronizado = 0,
       actualizado_en = datetime('now')`,
    [id, JSON.stringify(datos)]
  );
}

export async function obtenerHistoriasPendientes() {
  return await db.getAllAsync(
    'SELECT * FROM historias_pendientes WHERE sincronizado = 0 ORDER BY creado_en DESC'
  );
}

export async function marcarComoSincronizada(id) {
  await db.runAsync(
    'UPDATE historias_pendientes SET sincronizado = 1 WHERE id = ?',
    [id]
  );
}

export async function obtenerTodasLasHistorias() {
  return await db.getAllAsync(
    'SELECT * FROM historias_pendientes ORDER BY creado_en DESC'
  );
}

export async function obtenerHistoriaPorId(id) {
  return await db.getFirstAsync(
    'SELECT * FROM historias_pendientes WHERE id = ?',
    [id]
  );
}

export async function contarHistoriasPendientes() {
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) as total FROM historias_pendientes WHERE sincronizado = 0'
  );
  return result?.total ?? 0;
}

export async function eliminarSincronizadas() {
  await db.runAsync(
    'DELETE FROM historias_pendientes WHERE sincronizado = 1'
  );
}

export async function buscarHistoriasLocales(termino) {
  return await db.getAllAsync(
    `SELECT * FROM historias_pendientes
     WHERE datos LIKE ? ORDER BY creado_en DESC`,
    [`%${termino}%`]
  );
}

export async function borrarHistoriaPorId(id) {
  await db.runAsync('DELETE FROM historias_pendientes WHERE id = ?', [id]);
}

export async function borrarTodasLasHistorias() {
  await db.runAsync('DELETE FROM historias_pendientes');
}