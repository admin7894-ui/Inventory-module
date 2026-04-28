const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/legalEntity');
const { validate, validateLegalEntity } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateLegalEntity), ctrl.create);
router.put('/:id', validate(validateLegalEntity), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
