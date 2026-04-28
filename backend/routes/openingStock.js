const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/openingStock');
const { validate, validateOpeningStock } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateOpeningStock), ctrl.create);
router.put('/:id', validate(validateOpeningStock), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
