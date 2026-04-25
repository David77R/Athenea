### Problema resuelto

Docker no encontraba los archivos nuevos porque los nombres no coincidían
exactamente con los require() en index.js. Solución: verificar nombres
reales con "docker run --rm -it ... find /app/src -type f"

### Componente desarrollado

clinical-service completo: modelo Historia con Mongoose, middleware JWT,
controladores CRUD y rutas REST. Conectado exitosamente a MongoDB Atlas.
