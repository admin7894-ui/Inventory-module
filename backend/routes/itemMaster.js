const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/itemMaster');
const { validate, validateItemMaster } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateItemMaster), ctrl.create);
router.put('/:id', validate(validateItemMaster), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
