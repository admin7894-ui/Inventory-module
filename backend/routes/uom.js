const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/uom');
const { validate, validateUom } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateUom), ctrl.create);
router.put('/:id', validate(validateUom), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
