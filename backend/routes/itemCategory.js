const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemCategory');
const { validate, validateItemCategory } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateItemCategory), ctrl.create);
router.put('/:id', validate(validateItemCategory), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
