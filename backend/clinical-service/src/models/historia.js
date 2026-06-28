const mongoose = require ('mongoose');

const historiaSchema = new mongoose.Schema({
    paciente:{
        nombre: { type: String, required: true},
        cedula: { type: String, required: true},
        fecha_nacimiento: { type: Date},
        telefono: { type: String},
    },
    
    optometrista_id: { type: String, required: true},
    fecha_consulta: { type: Date, default: Date.now},
    motivo_consulta: { type: String, required: true},
    agudeza_visual: {
        ojo_derecho: { type: String},
        ojo_izquierdo: { type: String },
    },

    refraccion: {
        ojo_derecho: { esferico: Number, cilindrico: Number, eje: Number },
        ojo_izquierdo: { esferico: Number, cilindrico: Number, eje: Number },
    },

    presion_intraocular: {
        ojo_derecho: { type: Number },
        ojo_izquierdo: { type: Number },
    },

    examen_especializado: {
        tonometria: { type: String },
        lensometria: { type: String },
        autorrefractometria: { type: String },
        oftalmoscopio: { type: String },
        derivacion: { type: String },
    },

    diagnostico: { type: String},
    tratamiento: { type: String},
    observaciones: { type: String },
    sincronizado: { type: Boolean, default:true },
}, {timestamps: true});

module.exports = mongoose.model('Historia', historiaSchema);