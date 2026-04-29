const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemType');

const { validate, validateItemType } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateItemType), ctrl.create);
router.put('/:id', validate(validateItemType), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
