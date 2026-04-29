const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/zone');

const { validate, validateZone } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateZone), ctrl.create);
router.put('/:id', validate(validateZone), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
