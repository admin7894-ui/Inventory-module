const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shipMethod');
const { validate, validateShipMethod } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateShipMethod), ctrl.create);
router.put('/:id', validate(validateShipMethod), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
