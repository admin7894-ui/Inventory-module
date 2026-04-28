const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/costMethod');
const { validate, validateCostMethod } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateCostMethod), ctrl.create);
router.put('/:id', validate(validateCostMethod), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
