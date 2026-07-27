const mongoose = require('mongoose');

async function conectarMongo(intentos = 5, esperaMs = 5000) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('Se requiere MONGO_URI');

    }

    for (let intento = 1; intento <= intentos; intento++) {
        try {
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 20000,
            });
            console.log('Conectadeishon al Mongo');
            return;
        } catch (e) {
            console.error(`Intento ${intento}/${intentos} de conexión a Mongo falló: ${e.message}`);
            if (intento === intentos) {
                throw e;
            }
            await new Promise((resolve) => setTimeout(resolve, esperaMs));
        }
    }
}

module.exports = { conectarMongo };