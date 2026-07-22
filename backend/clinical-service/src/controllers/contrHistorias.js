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
        if (e.code === 11000) {
            return res.status(409).json({
                error: 'Ya existe una historia con ese identificador (historia_id duplicado).',
            });
        }

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

async function obtenerHistoriasPorPaciente(req, res) {
    try {
        const { paciente_id } = req.params;
        const historias = await Historia.find({
            paciente_id,
            optometrista_id: req.usuario.sub,
        }).sort({ fecha_consulta: -1 });
        return res.json(historias);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Error interno' });
    }
}

async function obtenerHistoriaPorId(req, res) {
  try {
    const { id } = req.params;

    let historia = await Historia.findOne({
      historia_id: id,
      optometrista_id: req.usuario.sub,
    });

    if (!historia && /^[0-9a-fA-F]{24}$/.test(id)) {
      historia = await Historia.findOne({
        _id: id,
        optometrista_id: req.usuario.sub,
      });
    }

    if (!historia) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }
    return res.json(historia);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}

async function actualizarHistoria(req, res) {
    try {
        const { id } = req.params;

        const historia = await Historia.findOne({
            historia_id: id,
            optometrista_id: req.usuario.sub,
        });

        if (!historia) {
            return res.status(404).json({ error: 'Historia no encontrada' });
        }

        const actualizaciones = { ...req.body };
        delete actualizaciones.historia_id;
        delete actualizaciones.optometrista_id;
        delete actualizaciones._id;

        if (actualizaciones.paciente?.cedula) {
            actualizaciones.paciente_id = actualizaciones.paciente.cedula;
        }

        Object.assign(historia, actualizaciones);
        await historia.save();

        return res.json(historia);
    } catch (e) {
        if (e.name === 'ValidationError') {
            return res.status(400).json({ error: e.message });
        }
        console.error(e);
        return res.status(500).json({ error: 'Error interno' });
    }
}

module.exports = { crearHistoria, obtenerHistorias, obtenerHistoriaPorId, obtenerHistoriasPorPaciente, actualizarHistoria };