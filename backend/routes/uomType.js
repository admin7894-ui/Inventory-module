const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/uomType');
const { validate, validateUomType } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateUomType), ctrl.create);
router.put('/:id', validate(validateUomType), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
