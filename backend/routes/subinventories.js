const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dependencyFilters');

router.get('/all', ctrl.getSubinventories);
router.get('/', ctrl.getSubinventories);

module.exports = router;

