import re

with open('backend/controllers/stockAdjustment.js', 'r') as f:
    content = f.read()

# Replace basic required fields
content = re.sub(
    r"const requiredFields = \['bg_id', 'COMPANY_id', 'business_type_id', 'item_id', 'txn_type_id', 'inv_org_id', 'subinventory_id', 'uom_id', 'adjustment_date'\];\s*for \(const f of requiredFields\) \{\s*if \(!body\[f\]\) return res\.status\(400\)\.json\(\{ success: false, message: \$\{f\.replace\('_id', ''\)\.replace\('COMPANY', 'Company'\)\} is required \}\);\s*\}",
    "const requiredFields = ['bg_id', 'COMPANY_id', 'business_type_id', 'item_id', 'txn_type_id', 'inv_org_id', 'subinventory_id', 'uom_id', 'adjustment_date'];\n    const fieldErrors = {};\n    for (const f of requiredFields) {\n      if (!body[f]) fieldErrors[f] = ${f.replace('_id', '').replace('COMPANY', 'Company')} is required;\n    }",
    content
)

content = re.sub(
    r"const item = \(db\.item_master \|\| \[\]\)\.find\(i => i\.item_id === body\.item_id\);\s*if \(!item\) return res\.status\(400\)\.json\(\{ success: false, message: 'Invalid Item' \}\);",
    "const item = (db.item_master || []).find(i => i.item_id === body.item_id);\n    if (!item && body.item_id) fieldErrors.item_id = 'Invalid Item';",
    content
)

content = re.sub(
    r"if \(isLotControlled && !body\.lot_id\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: 'Lot is required for this item' \}\);\s*\}",
    "if (isLotControlled && !body.lot_id) {\n      fieldErrors.lot_id = 'Lot is required for this item';\n    }",
    content
)

content = re.sub(
    r"if \(serials\.length === 0\) return res\.status\(400\)\.json\(\{ success: false, message: 'Serials are required for this item' \}\);",
    "if (serials.length === 0) fieldErrors.serial_ids = 'Serials are required for this item';",
    content
)

content = re.sub(
    r"if \(!body\.to_inv_org_id \|\| !body\.to_subinventory_id\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: 'Destination Org and Subinventory are required' \}\);\s*\}",
    "if (!body.to_inv_org_id) fieldErrors.to_inv_org_id = 'Destination Org is required';\n      if (!body.to_subinventory_id) fieldErrors.to_subinventory_id = 'Destination Subinventory is required';\n      if (!body.to_locator_id) fieldErrors.to_locator_id = 'Destination Locator is required';\n      if (!body.subinventory_id) fieldErrors.subinventory_id = 'Subinventory is required';\n      if (!body.locator_id) fieldErrors.locator_id = 'Locator is required';",
    content
)

content = re.sub(
    r"if \(requested <= 0\) return res\.status\(400\)\.json\(\{ success: false, message: 'Transfer quantity must be greater than 0' \}\);",
    "if (requested <= 0) fieldErrors.physical_qty = 'Transfer quantity must be > 0';",
    content
)

content = re.sub(
    r"if \(requested > availableQty\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: Insufficient available stock \(Available: \$\{availableQty\}\) \}\);\s*\}",
    "if (requested > availableQty) {\n        fieldErrors.physical_qty = 'Insufficient stock';\n      }",
    content
)

content = re.sub(
    r"if \(body\.inv_org_id === body\.to_inv_org_id && body\.subinventory_id === body\.to_subinventory_id && \(body\.locator_id \|\| ''\) === \(body\.to_locator_id \|\| ''\)\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: 'Source and Destination cannot be the same' \}\);\s*\}",
    "if (body.inv_org_id === body.to_inv_org_id && body.subinventory_id === body.to_subinventory_id && (body.locator_id || '') === (body.to_locator_id || '') && body.subinventory_id) {\n        fieldErrors.to_subinventory_id = 'Source and destination cannot be same';\n        fieldErrors.to_locator_id = 'Source and destination cannot be same';\n      }",
    content
)

content = re.sub(
    r"if \(!destRestriction\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: 'Destination location is not mapped/active for this item' \}\);\s*\}",
    "if (!destRestriction) {\n        fieldErrors.to_subinventory_id = 'Destination location is not mapped/active for this item';\n      }",
    content
)

content = re.sub(
    r"if \(reduction > availableQty\) \{\s*return res\.status\(400\)\.json\(\{ success: false, message: Insufficient available stock for reduction \(Avail: \$\{availableQty\}\) \}\);\s*\}",
    "if (reduction > availableQty) {\n          fieldErrors.physical_qty = 'Insufficient stock';\n        }",
    content
)

content = re.sub(
    r"body\.adjustment_value = \(body\.adjustment_qty \* parseFloat\(body\.unit_cost \|\| 0\)\)\.toFixed\(4\);",
    "if (Object.keys(fieldErrors).length > 0) {\n      return res.status(400).json({ success: false, errors: fieldErrors });\n    }\n\n    body.adjustment_value = (body.adjustment_qty * parseFloat(body.unit_cost || 0)).toFixed(4);",
    content
)

with open('backend/controllers/stockAdjustment.js', 'w') as f:
    f.write(content)

print('Replaced')
