require('dotenv').config();
const express = require('express');
const { conectarMongo } = require('./db');
const historiasRouter = require('./routes/historiasR');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'Funcionanding', servicio: 'clinical-service' });
});

app.use('/historias', historiasRouter);

async function main() {
  await conectarMongo();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Clinical-service de Mongo corriendo en el puerto ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});