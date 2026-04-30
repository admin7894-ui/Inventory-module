const express = require('express');
const cors = require('cors');
require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./data/db');
const { initCounters } = require('./utils/idGenerator');
const { decoratePayload } = require('./utils/fkDisplay');
const { filterPayload } = require('./utils/scopeFilter');

// Initialize ID counters from existing data
initCounters(db);

const app = express();
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.use('/api', (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (payload) => {
    const scopedPayload = req.method === 'GET' ? filterPayload(payload, req.user) : payload;
    if (req.method === 'GET' && scopedPayload?.data === null && scopedPayload?.message === 'Not found') {
      res.status(404);
    }
    return json(decoratePayload(scopedPayload));
  };
  next();
});

// ── Auth middleware ───────────────────────────────────────────
app.use(require('./middleware/auth'));
app.use(require('./middleware/audit'));

// ── Health ────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', tables: 46, time: new Date() }));

// ── All 46 routes (exact Excel order) ────────────────────────
app.use('/api/departments',               require('./routes/departments'));
app.use('/api/roles',                     require('./routes/roles'));
app.use('/api/designation',               require('./routes/designation'));
app.use('/api/module',                    require('./routes/module'));
app.use('/api/business-type',             require('./routes/businessType'));
app.use('/api/location',                  require('./routes/location'));
app.use('/api/company',                   require('./routes/company'));
app.use('/api/business-group',            require('./routes/businessGroup'));
app.use('/api/security-profile',          require('./routes/securityProfile'));
app.use('/api/profile-access',            require('./routes/profileAccess'));
app.use('/api/security-roles',            require('./routes/securityRoles'));
app.use('/api/table-access',              require('./routes/tableAccess'));
app.use('/api/legal-entity',              require('./routes/legalEntity'));
app.use('/api/operating-unit',            require('./routes/operatingUnit'));
app.use('/api/inventory-org',             require('./routes/inventoryOrg'));
app.use('/api/workday-calendar',          require('./routes/workdayCalendar'));
app.use('/api/cost-method',               require('./routes/costMethod'));
app.use('/api/cost-type',                 require('./routes/costType'));
app.use('/api/org-parameter',             require('./routes/orgParameter'));
app.use('/api/ship-method',               require('./routes/shipMethod'));
app.use('/api/ship-network',              require('./routes/shipNetwork'));
app.use('/api/intercompany',              require('./routes/intercompany'));
app.use('/api/uom-type',                  require('./routes/uomType'));
app.use('/api/uom',                       require('./routes/uom'));
app.use('/api/category-set',              require('./routes/categorySet'));
app.use('/api/item-category',             require('./routes/itemCategory'));
app.use('/api/item-sub-category',         require('./routes/itemSubCategory'));
app.use('/api/brand',                     require('./routes/brand'));
app.use('/api/item-type',                 require('./routes/itemType'));
app.use('/api/item-master',               require('./routes/itemMaster'));
app.use('/api/zone',                      require('./routes/zone'));
app.use('/api/subinventory',              require('./routes/subinventory'));
app.use('/api/locator',                   require('./routes/locator'));
app.use('/api/item-subinv-restriction',   require('./routes/itemSubinvRestriction'));
app.use('/api/item-org-assignment',       require('./routes/itemOrgAssignment'));
app.use('/api/uom-conv',                  require('./routes/uomConv'));
app.use('/api/lot-master',                require('./routes/lotMaster'));
app.use('/api/serial-master',             require('./routes/serialMaster'));
app.use('/api/transaction-type',          require('./routes/transactionType'));
app.use('/api/transaction-reason',        require('./routes/transactionReason'));
app.use('/api/opening-stock',             require('./routes/openingStock'));
app.use('/api/inventory-transaction',     require('./routes/inventoryTransaction'));
app.use('/api/item-stock',                require('./routes/itemStock'));
app.use('/api/stock-ledger',              require('./routes/stockLedger'));
app.use('/api/stock-adjustment',          require('./routes/stockAdjustment'));
app.use('/api/batch-serial-tracking',     require('./routes/batchSerialTracking'));
app.use('/api/auth',                      require('./routes/auth'));

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, message: err.message });
});
app.use((req, res) => res.status(404).json({ success: false, message: `${req.path} not found` }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 ERP Backend → http://localhost:${PORT}`);
  console.log(`📋 46 tables | All routes active\n`);
});
module.exports = app;
