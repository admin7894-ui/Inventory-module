const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemStock');
const { validate, validateItemStock } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateItemStock), ctrl.create);
router.put('/:id', validate(validateItemStock), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
