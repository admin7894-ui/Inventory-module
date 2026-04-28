const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/intercompany');
const { validate, validateIntercompany } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateIntercompany), ctrl.create);
router.put('/:id', validate(validateIntercompany), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
