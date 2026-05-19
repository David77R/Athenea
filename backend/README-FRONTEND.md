# Athenea — Guía para el equipo Frontend

## Requisitos previos

- Node.js v20 LTS → https://nodejs.org
- Git → https://git-scm.com
- Expo Go en tu teléfono (Play Store o App Store)

## Clonar el proyecto

```bash
git clone https://github.com/David77R/Athenea.git
cd Athenea
git checkout frontend
```

## Instalar dependencias de la app

```bash
cd backend/app/athenea-app
npm install
```

## Configurar la IP del servidor

Abre el archivo `config.js` y cambia la IP por la de la PC donde corre el backend:

```javascript
const CONFIG = {
  API_URL: "http://IP_DEL_BACKEND:3001",
  CLINICAL_URL: "http://IP_DEL_BACKEND:3002",
  IA_URL: "http://IP_DEL_BACKEND:3003",
};
export default CONFIG;
```

Para encontrar la IP del backend ejecuta en esa PC:

- Windows: `ipconfig` → busca "Dirección IPv4"
- Mac/Linux: `ifconfig` → busca "inet"

## Arrancar la app

```bash
npx expo start --clear
```

Escanea el QR con **Expo Go** desde tu teléfono. El teléfono debe estar en la misma red WiFi que la PC del backend.

## Estructura de pantallas
