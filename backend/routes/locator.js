const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/locator');

const { validate, validateLocator } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateLocator), ctrl.create);
router.put('/:id', validate(validateLocator), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
