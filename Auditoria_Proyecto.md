# Diseño de los microservicios que va a contener las Historias Clínicas (MongoDB) y los datos relacionales (PostGreSQL)

**Fecha de Inicio:** 17/03/2026

**Actividad** Elaboración de la arquitectura de carpetas para el microservicio de Entidades Transaccionales que van a ir en PostgreSQL (Usuarios,ID, Datos de Acceso, Roles, Estado de la Cuenta) así como también la arquitectura de MongoDB (Documento clinico, ID_Cita, Antecedentes, Datos de Agudeza Visual, Presión Intraocular, Diagnóstico Preliminar, Observaciones)

**Decisión Técnica**
git version 2.53.0.windows.3
node -v v24.14.1
**Solución a Problema**

### Estándar de seguridad aplicado

- Se creó .gitignore para evitar subir node_modules y archivos .env al repositorio
- No se hará hardcoding de contraseñas en ningún servicio
