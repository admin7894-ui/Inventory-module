const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dependencyFilters');

router.get('/all', ctrl.getLocators);
router.get('/', ctrl.getLocators);

module.exports = router;

