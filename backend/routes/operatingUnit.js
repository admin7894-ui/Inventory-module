const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/operatingUnit');
const { validate, validateOperatingUnit } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateOperatingUnit), ctrl.create);
router.put('/:id', validate(validateOperatingUnit), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
