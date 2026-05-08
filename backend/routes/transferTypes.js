const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/transferTypes');
const { validate, validateTransferType } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateTransferType), ctrl.create);
router.put('/:id', validate(validateTransferType), ctrl.update);
router.patch('/:id/status', ctrl.updateStatus);
router.delete('/:id', ctrl.remove);

module.exports = router;
