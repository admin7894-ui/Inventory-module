const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemSubCategory');
const { validate, validateItemSubCategory } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateItemSubCategory), ctrl.create);
router.put('/:id', validate(validateItemSubCategory), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
