-- Roles de la aplicacion 
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS usuarios(
    id UUID PRIMARY KEY DEAFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id),
    creadoo_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);
INSERT INTO roles (nombre)
VALUES ('admin'),
    ('optometrista'),
    ('recepcionista') ON CONFLICT (nombre) DO NOTHING;