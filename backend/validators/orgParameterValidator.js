// ── Org Parameter Backend Validator ───────────────────────────
const { isEmpty, REGEX, isNonNegativeNumber, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateOrgParameter = (data) => {
  const errors = {};
  validateCompanyGroup(errors, data);

  if (isEmpty(data.inv_org_id)) errors.inv_org_id = 'Inventory Org is required';

  if (isEmpty(data.org_code)) errors.org_code = 'Org Code is required';
  else if (!REGEX.CODE.test(data.org_code)) errors.org_code = 'Must be 2–20 uppercase alphanumeric or _';

  if (isEmpty(data.workday_calendar_id)) errors.workday_calendar_id = 'Workday Calendar is required';
  if (isEmpty(data.cost_method_id)) errors.cost_method_id = 'Cost Method is required';
  if (isEmpty(data.cost_type_id)) errors.cost_type_id = 'Cost Type is required';

  if (!isEmpty(data.move_order_timeout_days) && !isNonNegativeNumber(data.move_order_timeout_days))
    errors.move_order_timeout_days = 'Timeout days must be ≥ 0';

  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  validateDateRange(errors, data);
  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateOrgParameter };
