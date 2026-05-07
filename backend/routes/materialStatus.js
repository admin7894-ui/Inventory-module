const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/materialStatus');
const { validate, validateMaterialStatus } = require('../validators');

router.get('/list', (req, res) => {
  req.query.active_only = 'true';
  ctrl.getAll(req, res);
});

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateMaterialStatus), ctrl.create);
router.put('/:id', validate(validateMaterialStatus), ctrl.update);
router.patch('/status/:id', ctrl.toggleStatus);
router.delete('/:id', ctrl.remove);

module.exports = router;
