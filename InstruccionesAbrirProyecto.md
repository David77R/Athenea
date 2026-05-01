## Tecnologías principales

- **Backend:** Node.js + Express (microservicios)
- **Bases de datos:** PostgreSQL (auth), MongoDB Atlas (historias), SQLite (offline móvil)
- **Caché:** Redis
- **Gateway:** Nginx
- **Orquestación:** Docker Compose
- **App móvil:** React Native + Expo

---

## Requisitos previos

- Node.js v20 LTS
- Docker Desktop
- Git
- Expo Go (en el teléfono)

---

## Configuración del backend

### 1. Clonar el repositorio

```bash
git clone https://github.com/David77R/Athenea.git
cd Athenea/backend
```

### 3. Configurar la IP del servidor

Abre el archivo `config.js` y cambia la IP por la de tu PC en la red WiFi:

(cmd + ipconfig la que dice ipv4)

```javascript
const CONFIG = {
  API_URL: "http://la ip de tu compu",
};
```

## Ramas del proyecto

| Rama              | Responsable                       | Descripción |
| ----------------- | --------------------------------- | ----------- |
| `backend-athenea` | Backend completo y lógica offline |

| `frontend` UI/UX de la app móvil

---

## Flujo de trabajo con Git

### Convención de commits

| Prefijo    | Uso                      |
| ---------- | ------------------------ |
| `feat`     | Nueva funcionalidad      |
| `fix`      | Corrección de bug        |
| `docs`     | Documentación            |
| `style`    | Cambios de UI/estilos    |
| `refactor` | Reorganización de código |

---

## Pantallas de la app

| Pantalla   | Archivo                    | Descripción                    |
| ---------- | -------------------------- | ------------------------------ |
| Splash     | `pantallas/animaciones.js` | Animación de bienvenida        |
| Login      | `pantallas/login.js`       | Autenticación con validaciones |
| Registro   | `pantallas/registro.js`    | Crear cuenta nueva             |
| Home       | `pantallas/home.js`        | Panel principal del usuario    |
| Formulario | `pantallas/formulario.js`  | Registro de historia clínica   |

---
