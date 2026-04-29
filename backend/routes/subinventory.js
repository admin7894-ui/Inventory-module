const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/subinventory');

const { validate, validateSubinventory } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateSubinventory), ctrl.create);
router.put('/:id', validate(validateSubinventory), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
