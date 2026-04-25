const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const {
  crearHistoria,
  obtenerHistorias,
  obtenerHistoriaPorId
} = require('../controllers/contrHistorias');

router.use(verificarToken);

router.post('/', crearHistoria);
router.get('/', obtenerHistorias);
router.get('/:id', obtenerHistoriaPorId);

module.exports = router;