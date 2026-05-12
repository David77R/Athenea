import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('athenea_db');

export async function inicializarDB() {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS historias_pendientes(
            id TEXT PRIMARY KEY,
            datos TEXT NOT NULL,
            sincronizado INTEGER DEFAULT 0,
            creado_en TEXT DEFAULT (datetime('now'))
        );
    `);
    console.log('Base de datos local funcionando al 100%');
}

export async function guardarHistoriaLocal(id, datos) {
    await db.runAsync(
        'INSERT INTO historias_pendientes (id, datos, sincronizado) VALUES (?, ?, 0)',
        [id, JSON.stringify(datos)]
    );
}

export async function obtenerHistoriasPendientes() {
    return await db.getAllAsync(
        'SELECT * FROM historias_pendientes WHERE sincronizado = 0'
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
