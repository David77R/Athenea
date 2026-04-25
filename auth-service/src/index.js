const express = require( 'express');
const dotenv = require( 'dotenv');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', servicio: 'auth-service'});
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () =>{
  console.log(`Auth-service corriendo en el puerto ${PORT}`);

});