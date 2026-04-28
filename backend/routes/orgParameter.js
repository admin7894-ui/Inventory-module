const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orgParameter');
const { validate, validateOrgParameter } = require('../validators');

router.get('/all', ctrl.getAll);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', validate(validateOrgParameter), ctrl.create);
router.put('/:id', validate(validateOrgParameter), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
