const mongoose = require('mongoose');

async function conectarMongo() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('Se requiere MONGO_URI');

    }

    await mongoose.connect(uri);
    console.log('Conectadeishon al Mongo');
}

module.exports = { conectarMongo };