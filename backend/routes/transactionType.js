const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transactionType');

const { validateMiddleware } = require('../validations/index');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validateMiddleware('transaction_type'), ctrl.create);
router.put('/:id', validateMiddleware('transaction_type'), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
