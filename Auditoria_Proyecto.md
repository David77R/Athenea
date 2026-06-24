# Auditoría Técnica de Desarrollo — Sistema Athenea

## Descripción del Sistema

Athenea es una plataforma de gestión clínica orientada a consultorios de optometría, fundamentada en una arquitectura distribuida de microservicios con persistencia políglota. El sistema incorpora un módulo de inteligencia artificial para el procesamiento de voz offline y la estructuración automatizada de datos clínicos, reduciendo significativamente el tiempo de registro de historias por parte del especialista.

El proyecto fue concebido bajo el paradigma **offline-first**, garantizando la continuidad operativa del sistema ante condiciones de red variables o ausencia total de conectividad, problemática frecuente en este país

---

## Marzo 2026 — Diseño de Arquitectura y Modelado de Datos

### Decisión de arquitectura

El equipo adoptó una arquitectura de microservicios desacoplados en lugar de una solución monolítica. Esta decisión responde a la necesidad de separar responsabilidades: el servicio de autenticación, el servicio clínico y el servicio de inteligencia artificial operan de forma independiente, lo que permite escalar, actualizar o reemplazar cada componente sin afectar a los demás.

### Configuración del entorno de desarrollo

Durante la fase inicial se presentaron conflictos de dependencias entre el SDK de Expo y las versiones de Node.js disponibles. La librería `expo-router` fue descartada por incompatibilidad con la versión del SDK seleccionada, optándose por `@react-navigation/native` con `createNativeStackNavigator`, solución con mayor estabilidad documentada para el stack utilizado.

El archivo `babel.config.js` fue configurado exclusivamente con `babel-preset-expo`, decisión que evitó conflictos con el plugin de transformación de `react-native-reanimated`. Para las animaciones del drawer lateral se empleó la API `Animated` nativa de React Native, eliminando dependencias adicionales.

### Modelado de la persistencia políglota

**PostgreSQL — datos transaccionales**

Se seleccionó PostgreSQL 16 como motor relacional para la gestión de usuarios y roles. La justificación técnica radica en las propiedades ACID que garantiza el motor:

- **Atomicidad:** el registro de un especialista es una operación indivisible. Si el proceso falla en cualquier punto, la transacción se revierte completamente.
- **Consistencia:** las restricciones definidas en el esquema (email UNIQUE, role_id FOREIGN KEY hacia la tabla roles, campos NOT NULL) garantizan que ningún dato viola las reglas de integridad referencial.
- **Aislamiento:** múltiples operaciones concurrentes de registro no interfieren entre sí.
- **Durabilidad:** una vez confirmado el INSERT con código 201, el dato persiste en disco incluso ante fallos de hardware.

La estructura de la tabla `users` contempla: `id` (UUID generado automáticamente), `email` (único), `password_hash` (texto), `role_id` (clave foránea), `nombre`, `telefono`, `cedula` y `created_at`.

**MongoDB — datos clínicos no estructurados**

Para el almacenamiento de historias clínicas se seleccionó MongoDB 7 por su modelo de documentos JSON, que se adapta a la naturaleza variable de los registros clínicos. No todos los pacientes presentan los mismos hallazgos: algunos requieren registro de biomicroscopía, otros de fondo de ojo, adición en refracción, entre otros. Un esquema relacional rígido obligaría a definir columnas para cada posible campo, generando una tabla dispersa con un alto porcentaje de valores nulos.

El modelo `Historia` en Mongoose define los campos esenciales como requeridos (`paciente.nombre`, `paciente.cedula`, `optometrista_id`) y los restantes como opcionales, adaptándose a cada consulta.

### Estándares de seguridad iniciales

Se estableció como política de desarrollo la prohibición del hardcoding de credenciales. Todas las variables sensibles (`JWT_SECRET`, `DATABASE_URL`, `POSTGRES_PASSWORD`, `GROQ_API_KEY`) fueron externalizadas a archivos `.env` excluidos del repositorio mediante `.gitignore`.

---

## Abril 2026 — Infraestructura Docker y Servicio de Autenticación

### Orquestación con Docker Compose

Se configuró Docker Desktop con WSL2 (Windows Subsystem for Linux 2) para ejecutar contenedores Linux en el entorno de desarrollo Windows. La orquestación del sistema se realizó mediante Docker Compose, herramienta que permite definir y ejecutar aplicaciones multicontenedor con un único archivo de configuración.

El archivo `docker-compose.yml` define los siguientes servicios:

| Servicio         | Imagen                   | Puerto externo | Función                             |
| ---------------- | ------------------------ | -------------- | ----------------------------------- |
| auth-service     | athenea-auth-service     | 3001           | Autenticación y gestión de usuarios |
| clinical-service | athenea-clinical-service | 3002           | Gestión de historias clínicas       |
| ia-service       | athenea-ia-service       | 3003           | Transcripción y estructuración IA   |
| gateway          | Nginx                    | 8080           | API Gateway, punto de entrada único |
| postgres         | postgres:16-alpine       | 5433           | Base de datos relacional            |
| mongo            | mongo:7                  | 27017          | Base de datos documental            |
| redis            | redis:7-alpine           | 6379           | Caché de sesiones                   |

La adopción de Docker Compose garantiza la portabilidad y reproducibilidad del entorno: cualquier máquina con Docker instalado puede levantar los 7 servicios mediante un único comando garantizando así funcionalidad en cualquier tipo de equipo

### Implementación del servicio de autenticación

El `auth-service` implementa dos endpoints principales:

**POST /register** — recibe `email`, `password`, `nombre`, `telefono` y `cedula`. La contraseña es procesada con `bcryptjs` Al completar el registro exitosamente, se emite un JWT firmado con `JWT_SECRET` y se almacena en Redis con TTL de 8 horas.

**POST /login** — valida las credenciales mediante `bcrypt.compare`, que compara la contraseña en texto plano contra el hash almacenado sin necesidad de desencriptar. Si la validación es exitosa, emite un nuevo JWT.

`optometrista_id` que identifica al especialista en cada historia clínica se extrae del `sub` del JWT verificado en el servidor (`req.usuario.sub`), no del cuerpo de la solicitud. Si se tomara del body, un usuario malicioso podría enviar el ID de otro especialista y acceder a sus historias. Al extraerlo del token firmado con `JWT_SECRET`, esta suplantación es computacionalmente inviable.

**Justificación del JWT:** el uso de JSON Web Tokens responde a la naturaleza stateless de la arquitectura de microservicios. A diferencia de las sesiones tradicionales que requieren almacenamiento compartido entre servicios, el JWT es autocontenido — incluye el `sub` (ID del usuario), `email` y `role_id` en su payload — y puede ser verificado por cualquier servicio que conozca el `JWT_SECRET` sin consultar una base de datos de sesiones.

---

## Mayo 2026 — Frontend, SQLite y Motor de Inteligencia Artificial

### Formulario wizard de historias clínicas

El formulario de registro clínico fue estructurado como un wizard de 4 pasos secuenciales: Paciente, Anamnesis, Examen Visual y Diagnóstico. Esta arquitectura de pasos múltiples responde a la cantidad de campos clínicos requeridos — presentarlos en una sola pantalla generaría una experiencia de usuario deficiente en dispositivos móviles.

Cada paso implementa su propia función `validarPaso()` que verifica los campos obligatorios antes de permitir el avance. Se utilizó `useSafeAreaInsets` del paquete `react-native-safe-area-context` para calcular el espacio reservado por la barra de navegación del sistema operativo, evitando que los botones de acción queden ocultos.

### Persistencia local con SQLite

La librería `expo-sqlite` fue seleccionada para la persistencia local, implementando el patrón offline-first. La tabla `historias_pendientes` almacena cada historia serializada como JSON en el campo `datos`, con un campo `sincronizado` (0/1) que indica el estado de sincronización.

El módulo `syncEngine.js` implementa la sincronización automática mediante un intervalo de 60 segundos. El proceso consiste en: consultar los registros con `sincronizado = 0`, intentar el POST al `clinical-service` con el JWT del usuario autenticado, y en caso de respuesta exitosa (código 201), actualizar el campo a `sincronizado = 1` mediante `marcarComoSincronizada()`. Si la sincronización falla por ausencia de conectividad, el registro permanece pendiente y se reintenta en el siguiente ciclo.

Se implementó la función `convertirFecha()` para transformar el formato de fecha DD/MM/AAAA (utilizado en el formulario) al formato ISO 8601 requerido por MongoDB para el tipo `Date`.

### Motor de inteligencia artificial — ia-service

**Transcripción offline con Vosk**

Se integró Vosk con el modelo `vosk-model-small-es-0.42` para el reconocimiento de voz en español sin conectividad. Vosk utiliza el framework Kaldi internamente, ampliamente adoptado en sistemas de reconocimiento de voz de producción.

El script `transcribir.py` actúa como puente entre Node.js y Vosk. Recibe la ruta del archivo WAV como argumento de línea de comandos, procesa el audio en bloques de 4000 frames para optimizar el uso de memoria, y retorna el texto transcrito por stdout. Node.js invoca el script como proceso hijo mediante `child_process.spawn` y captura la salida.

El pipeline de audio completo es: React Native graba en formato M4A (nativo de iOS/Android) → el archivo se envía al servidor mediante multipart/form-data → `ffmpeg` lo convierte a WAV monocanal a 16kHz y el modelo de Vosk transcribe → el texto es retornado al cliente.

**Estructuración con Groq API**

El texto transcrito por Vosk es enviado al endpoint `/structure`, que lo procesa mediante la API de Groq con el modelo `llama-3.3-70b-versatile`. Se seleccionó este modelo por su superior comprensión del español coloquial y su capacidad para interpretar correctamente los errores de transcripción inherentes a Vosk.

La función `convertirTextoANumeros()` preprocesa el texto antes de enviarlo a Groq, convirtiendo palabras numéricas a dígitos ("veinte cuarenta" → "20/40", "menos uno punto veinticinco" → "-1.25"). Esto mejora significativamente la precisión de extracción de valores numéricos como la refracción y la presión intraocular.

El prompt fue configurado con `temperature: 0.1` para minimizar la aleatoriedad en las respuestas y garantizar extracción determinista de datos clínicos. Se definieron reglas explícitas de separación de campos para evitar que el modelo mezclara información de distintas secciones del formulario.

Se implementó un parser local como fallback: si la API de Groq no está disponible, el sistema utiliza expresiones regulares para extraer los datos clínicos del texto transcrito, garantizando la continuidad del flujo de trabajo.

---

## Junio 2026 — Refinamiento, Correcciones y Funcionalidades Avanzadas

### Sistema de alertas personalizadas

Los `Alert.alert` nativos de React Native fueron reemplazados en su totalidad por el componente `AlertaPersonalizada`. La justificación técnica es que las alertas nativas del sistema operativo no pueden ser estilizadas — utilizan los colores y tipografías del sistema, rompiendo la coherencia visual de la aplicación.

Se implementó el hook `useAlerta` que expone una función `mostrar()` y el componente `AlertaPersonalizada`. La animación utiliza `Animated.parallel` para ejecutar simultáneamente la transición de escala y opacidad del modal. El componente soporta tres tipos: éxito, error y confirmación (con dos botones de acción).

### Correcciones de bugs críticos

**Mapeo de refracción:** los valores negativos de refracción (como -1.25 en el esférico) no se cargaban en el formulario. La causa fue que la condición `if(ref.esf_od)` evalúa `false` para valores numéricos negativos en JavaScript, ya que `-1.25` es un valor truthy pero la cadena `"-1.25"` no lo es en todos los contextos. La solución fue reemplazar la condición por `ref.esf_od != null && ref.esf_od !== ''`.

**Sistema de navegación condicional:** el logout no producía la redirección a la pantalla de autenticación. El `Stack.Navigator` con `initialRouteName` fijo no reacciona a cambios en el estado del token. La solución fue implementar un renderizado condicional directamente en el navigator: `{!token ? <pantallas de auth> : <pantallas principales>}`. De esta forma, cuando `setToken(null)` se ejecuta, React re-renderiza el navigator automáticamente mostrando las pantallas de autenticación.

**Nombre del especialista en el dashboard:** tras el login, el Home mostraba "Especialista" en lugar del nombre real. El `useFocusEffect` no se dispara en el primer montaje del componente — solo cuando la pantalla recibe el foco tras haber estado en segundo plano. La solución fue agregar un `useEffect` con array de dependencias vacío que ejecuta `cargarDatos()` en el montaje inicial.

**Persistencia de datos entre sesiones:** al cerrar sesión, los datos almacenados en SQLite permanecían en el dispositivo. Si un segundo especialista iniciaba sesión en el mismo dispositivo, podía visualizar las historias del anterior. Se resolvió ejecutando `borrarTodasLasHistorias()` como parte del proceso de cierre de sesión, tanto en el drawer como en la pantalla de perfil.

### Generación de recetas en PDF

Se implementó el módulo `generarReceta.js` que genera un documento HTML con los datos clínicos de la historia seleccionada y lo convierte a PDF mediante `expo-print`. La distribución del archivo se realiza con `expo-sharing`, que invoca el sistema nativo de compartición del dispositivo.

El acceso a la generación de receta se integró en el modal de detalle del historial clínico, añadiendo un botón "Generar Receta PDF" que navega a la pantalla con los datos de la historia pre-cargados.

### Corrección del registro de especialistas

Se identificó que el endpoint de registro no recibía correctamente los campos `nombre`, `telefono` y `cedula` porque la función `intentarRegistroServidor` no los incluía en el body del fetch. Adicionalmente, la columna `cedula` no existía en la tabla `users` de PostgreSQL, requiriendo la ejecución de `ALTER TABLE users ADD COLUMN cedula VARCHAR(20) NOT NULL DEFAULT ''` para agregar el campo sin afectar los registros existentes.

---

## Justificación del Stack Tecnológico

| Tecnología              | Justificación técnica                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **React Native + Expo** | Desarrollo multiplataforma (iOS/Android) con una única base de código. Expo provee acceso simplificado a APIs nativas (micrófono, sistema de archivos, impresión) sin necesidad de código nativo en Swift/Kotlin. |

| **PostgreSQL 16** | Motor relacional con soporte completo de propiedades ACID. Seleccionado para datos transaccionales que requieren integridad referencial estricta (usuarios, roles).

| **MongoDB 7** | Base de datos documental con esquema flexible. Seleccionada para historias clínicas cuya estructura varía por paciente y tipo de consulta.

| **Redis 7** | Almacén en memoria de alta velocidad. Utilizado para caché de sesiones JWT, reduciendo la latencia en la verificación de tokens activos.

| **Nginx** | Servidor web de alto rendimiento configurado como API Gateway. Actúa como punto de entrada único, enrutando las solicitudes al microservicio correspondiente según la ruta.

| **Vosk + modelo es-0.42** | Motor de reconocimiento de voz basado en Kaldi que opera completamente offline. Eliminó la dependencia de APIs externas con costo por uso y requisito de conectividad permanente.

| **Groq + llama-3.3-70b** | API de inferencia de alta velocidad con modelo de lenguaje de gran tamaño. Seleccionado por su comprensión superior del español coloquial para la estructuración de datos clínicos dictados.

| **SQLite (expo-sqlite)** | Motor de base de datos embebido en el dispositivo. Implementa el patrón offline-first permitiendo el registro de historias sin conexión a
internet.

| **Docker Compose** | Herramienta de orquestación de contenedores que garantiza la reproducibilidad del entorno de desarrollo y producción mediante la declaración de servicios en un único archivo YAML.

| **bcryptjs** | Librería de hashing de contraseñas con algoritmo bcrypt adaptativo. Los 12 rounds de sal configurados garantizan resistencia a ataques de fuerza bruta incluso con hardware especializado.

| **JWT (jsonwebtoken)** | Estándar de tokens de acceso stateless que permite la autenticación entre microservicios sin necesidad de almacenamiento compartido de sesiones. El payload incluye el identificador del especialista como `sub`.|
