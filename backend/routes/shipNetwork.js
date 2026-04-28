const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shipNetwork');
const { validate, validateShipNetwork } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateShipNetwork), ctrl.create);
router.put('/:id', validate(validateShipNetwork), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
