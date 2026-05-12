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

### transcribir.py

Script Python que actúa como puente entre Node.js y Vosk.
Procesa audio WAV en bloques de 4000 frames para no saturar
la memoria del servidor. Vosk usa el algoritmo Kaldi internamente,
el mismo usado en sistemas de reconocimiento de voz profesionales.
El resultado se imprime en stdout y Node.js lo captura via IPC.

Plan — historialClinico.js

Pantalla de listado de historias clínicas guardadas localmente en SQLite, con indicador visual de cuáles están pendientes de sincronizar a MongoDB Atlas. Estilo turquesa coherente con home.js.

Alcance

Leer historias desde SQLite local (mismas tablas que usa formulario.js).

Mostrar tarjetas por historia con datos clave del paciente.

Badge global "N pendientes de sync" en el header.

Badge por tarjeta cuando sincronizado = 0.

Búsqueda local por cédula/nombre.

Pull-to-refresh para recargar lista.

Tap en una tarjeta → navega al detalle (reutilizando formulario.js en modo lectura o pantalla nueva — ver Decisión 1).

Estado vacío amigable cuando no hay historias.

UI (estilo turquesa de home.js)

┌─────────────────────────────────┐
│ ← Historial Clínico [3 ⏳]│ header turquesa + badge pendientes
├─────────────────────────────────┤
│ 🔍 Buscar por cédula o nombre │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Juan Pérez ⏳ sync│ │ card blanca, badge ámbar si pendiente
│ │ C.I. 12.345.678 │ │
│ │ 11/05/2026 · Miopía │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ María López ✓ │ │ check turquesa si sincronizado
│ │ C.I. 9.876.543 │ │
│ │ 10/05/2026 · Control │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

Pasos de implementación

Helper SQLite de lectura (pantallas/historialClinico.js o extraer a servicios/db.js si no existe ya):

obtenerHistorias() → SELECT id, cedula, nombre, apellido, fecha_creacion, diagnostico, sincronizado FROM historias ORDER BY fecha_creacion DESC.

contarPendientes() → SELECT COUNT(\*) WHERE sincronizado = 0.

Componente HistorialClinico:

useState: historias, pendientes, busqueda, refreshing.

useFocusEffect (de @react-navigation/native) para recargar al volver a la pantalla.

Filtrado local por busqueda sobre cédula y nombre completo.

Render:

Header turquesa con botón back, título y badge {pendientes} ⏳.

Input de búsqueda con ícono.

FlatList de historias con RefreshControl.

Card por ítem: nombre completo, cédula formateada, fecha corta, diagnóstico (truncado), badge de estado de sync.

ListEmptyComponent con ilustración/texto "Aún no hay historias registradas".

Navegación:

onPress de card → navigation.navigate('FormularioDetalle', { historiaId }) (ver Decisión 1).

Integración con sync futuro:

Exponer recargar() para que syncEngine pueda dispararla cuando termine una sincronización (evento o callback). Por ahora solo recarga al hacer focus o pull-to-refresh.

Decisiones pendientes (las resuelvo al implementar salvo que indiques otra cosa)

Detalle de historia: ¿abrir formulario.js en modo solo-lectura cargando los datos, o crear una pantalla detalleHistoria.js nueva? Propongo crear detalleHistoria.js simple (más rápido y no toca el wizard).

Formato de cédula: aplicar máscara V-12.345.678 al mostrar.

Estado de sync por ítem: usar el campo sincronizado (0/1) ya existente en SQLite — no consulto al backend desde esta pantalla.

Detalles técnicos

Sin dependencias nuevas. Usa expo-sqlite ya instalado.

Sin @react-navigation/drawer (nota del proyecto). Solo useFocusEffect de @react-navigation/native.

Sin Reanimated.

Colores: reutilizar tokens turquesa de home.js (definir constantes locales si no hay theme central).

Sin llamadas a red en esta pantalla — todo desde SQLite.

Archivos a tocar

backend/app/athenea-app/pantallas/historialClinico.js — implementar pantalla completa.

backend/app/athenea-app/pantallas/detalleHistoria.js — nueva, solo si confirmas Decisión 1.

backend/app/athenea-app/navegacion/appnav.js — registrar DetalleHistoria si aplica.

Fuera de alcance (siguiente tarea)

servicios/syncEngine.js con NetInfo.

Push automático a MongoDB Atlas.

Endpoints PostgreSQL de pacientes.
