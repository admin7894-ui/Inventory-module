const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/costType');
const { validate, validateCostType } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateCostType), ctrl.create);
router.put('/:id', validate(validateCostType), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
