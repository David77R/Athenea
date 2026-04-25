const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: '3002 Clinic funcionanding', servicio: 'clinical-service'});
});

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    console.log(`Funcionando en el puerto: ${PORT}`);
});