const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categorySet');
const { validate, validateCategorySet } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateCategorySet), ctrl.create);
router.put('/:id', validate(validateCategorySet), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
