const Historia = require('../models/historia');

async function crearHistoria(req, res) {
    try {
        const historia = new Historia({
            ...req.body,
            optometrista_id: req.usuario.sub,
        });

        await historia.save();
        return res.status(201).json(historia);
    } catch (e) {
        if (e.name === 'ValidationError') {
            return res.status(400).json({ error: e.message });
        }

        console.error(e);
        return res.status(500).json({ error: 'Error interno :('});
    }
}

async function obtenerHistorias(req, res) {
    try {
        const { cedula, nombre } = req.query;
        
        const filtro = { optometrista_id: req.usuario.sub };
        
        if (cedula) {
            filtro['paciente.cedula'] = { $regex: cedula, $options: 'i' };
        }
        if (nombre) {
            filtro['paciente.nombre'] = { $regex: nombre, $options: 'i' };
        }

        const historias = await Historia.find(filtro).sort({ fecha_consulta: -1 });
        return res.json(historias);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Error historias' });
    }
}

async function obtenerHistoriaPorId(req, res) {
  try {
    const historia = await Historia.findById(req.params.id);
    if (!historia) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    return res.json(historia);
  } catch (e) {
    return res.status(500).json({ error: 'Error interno' });
  }
}

module.exports = { crearHistoria, obtenerHistorias, obtenerHistoriaPorId };