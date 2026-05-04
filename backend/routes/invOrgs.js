const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dependencyFilters');

router.get('/all', ctrl.getInvOrgs);
router.get('/', ctrl.getInvOrgs);

module.exports = router;

