# 🏭 ERP Inventory Management System
## Complete Full-Stack — 46 Tables (Excel Schema)

---

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm start
# → http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 🔑 Login Credentials

| Username | Password | Role |
|---|---|---|
| software_user | Pass@1234 | Software Org |
| warehouse_user | Pass@1234 | Warehouse |
| medical_user | Pass@1234 | Medical |

---

## 📋 All 46 Tables (Excel Order)

1. Departments → /departments
2. Roles → /roles
3. Designation → /designation
4. Module → /module
5. Business_Type → /business-type
6. Location → /location
7. Company → /company
8. Business_Group → /business-group
9. Security_Profile → /security-profile
10. Profile_Access → /profile-access
11. Security_Roles → /security-roles
12. Table_Access → /table-access
13. Legal_Entity → /legal-entity
14. Operating_Unit → /operating-unit
15. Inventory_Org → /inventory-org
16. Workday_Calendar → /workday-calendar
17. Cost_Method → /cost-method
18. Cost_Type → /cost-type
19. Org_Parameter → /org-parameter
20. Ship_Method → /ship-method
21. Ship_Network → /ship-network
22. Intercompany → /intercompany
23. UOM_Type → /uom-type
24. UOM → /uom
25. Category_Set → /category-set
26. Item_Category → /item-category
27. Item_Sub_Category → /item-sub-category
28. Brand → /brand
29. Item_Type → /item-type
30. Item_Master → /item-master
31. Zone → /zone
32. Subinventory → /subinventory
33. Locator/Bin → /locator
34. Item_Subinv_Restriction → /item-subinv-restriction
35. Item_Org_Assignment → /item-org-assignment
36. UOM_Conv → /uom-conv
37. Lot_Master → /lot-master
38. Serial_Master → /serial-master
39. Transaction_Type → /transaction-type
40. Transaction_Reason → /transaction-reason
41. Opening_Stock → /opening-stock
42. Inventory_Transaction → /inventory-transaction
43. Item_Stock → /item-stock
44. Stock_Ledger → /stock-ledger
45. Stock_Adjustment → /stock-adjustment
46. Batch/Serial_Tracking → /batch-serial-tracking

---

## 🏗️ Architecture

```
/backend
  index.js           ← Main Express server
  routes/            ← 46 route files (one per table)
  controllers/       ← 46 controller files (one per table)
  data/db.js         ← In-memory datastore (168 seed rows)
  middleware/
    auth.js          ← JWT authentication + RLS
    validate.js      ← Validation rules
  utils/
    idGenerator.js   ← Auto PK generation

/frontend
  src/
    App.jsx          ← All 46 routes
    pages/           ← 46 page components (one per table)
    components/
      ui/index.jsx   ← DataTable, FormPage, Toggle, Select, DateInput, ConfirmDialog
      layout/        ← Sidebar, Layout
    hooks/
      useTableData.js ← Generic data + CRUD hook
    services/api.js  ← All 46 API endpoints
    context/         ← Auth + Theme contexts
```

---

## ⚙️ Key Features

- **46 Tables** — exact schema from Excel, no additions/removals
- **Per-table routes + controllers** (no generic CRUD)
- **In-memory datastore** with real seed data
- **JWT Auth + RLS** (data filtered by company)
- **Auto PK generation** (PREFIX-001 format)
- **Full dropdown flow** — all FKs load from parent tables
- **Toggle switches** for boolean flags
- **Stock Update Flow** — Transaction → Ledger → Item Stock
- **Stock Adjustment Approval** → auto-creates Inventory Transaction
- **Dark/Light mode**
- **Search + Sort + Pagination** on every table
- **Validation** — Sheet2 regex patterns enforced
