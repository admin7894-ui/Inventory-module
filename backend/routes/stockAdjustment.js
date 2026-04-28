const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockAdjustment');
const { validate, validateStockAdjustment } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateStockAdjustment), ctrl.create);
router.put('/:id', validate(validateStockAdjustment), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
