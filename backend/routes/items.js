const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dependencyFilters');

router.get('/all', ctrl.getItems);
router.get('/', ctrl.getItems);

module.exports = router;

