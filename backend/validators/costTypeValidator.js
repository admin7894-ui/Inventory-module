// ── Cost Type Backend Validator ───────────────────────────
const { isEmpty, REGEX, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateCostType = (data) => {
  const errors = {};
  validateCompanyGroup(errors, data);

  if (isEmpty(data.cost_type_name)) errors.cost_type_name = 'Cost Type Name is required';
  else if (!REGEX.NAME.test(data.cost_type_name)) errors.cost_type_name = 'Name: 3–100 chars';

  if (isEmpty(data.cost_type_code)) errors.cost_type_code = 'Cost Type Code is required';
  else if (!REGEX.CODE.test(data.cost_type_code)) errors.cost_type_code = 'Must be 2–20 uppercase alphanumeric or _';

  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  validateDateRange(errors, data);
  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateCostType };
