**Objetivo de Athenea**
Realizar un diagnostico preliminar local de historias clinicas recibidas tanto por voz como por texto y sincronizarlas cuando haya conexion a internet. Con el enfoque Offline-First, se hace primero en el SQLite local eliminando asi la dependencia de conexion a internet.

**PostgreSQL para** Usuarios, roles, sesiones
**Mongo Atlas para** Historias clinicas y diagnosticos
**Redis para** Colas, eventos, cache, sesiones rapidas
**SQLite para** Datos locales offline

**Microservicios** Gateway (entrada unica, autenticacion y ruteo) auth-service (identidad y acceso) clinical-service (persistencia de historias clinicas y sync online)

**Flujo offline-online**
- Guardar local en SQLite
- Marcar como pending_sync
- Detectar conexión
- Enviar al gateway
- Persistir en Mongo
- Confirmación synced