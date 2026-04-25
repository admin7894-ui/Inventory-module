const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockAdjustment');

const { validateMiddleware } = require('../validations/index');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validateMiddleware('stock_adjustment'), ctrl.create);
router.put('/:id', validateMiddleware('stock_adjustment'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
