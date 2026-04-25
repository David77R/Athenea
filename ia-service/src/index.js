const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', servicio: 'ia-service' });
});

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`IA-service corriendo en el puerto ${PORT}`);
}); 