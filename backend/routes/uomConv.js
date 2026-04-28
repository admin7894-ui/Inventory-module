const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/uomConv');
const { validate, validateUomConv } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateUomConv), ctrl.create);
router.put('/:id', validate(validateUomConv), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
