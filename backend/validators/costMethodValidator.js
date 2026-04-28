// ── Cost Method Backend Validator ───────────────────────────
const { isEmpty, REGEX, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateCostMethod = (data) => {
  const errors = {};
  validateCompanyGroup(errors, data);

  if (isEmpty(data.cost_method_name)) errors.cost_method_name = 'Cost Method Name is required';
  else if (!REGEX.NAME.test(data.cost_method_name)) errors.cost_method_name = 'Name: 3–100 chars';

  if (isEmpty(data.cost_method_code)) errors.cost_method_code = 'Cost Method Code is required';
  else if (!REGEX.CODE.test(data.cost_method_code)) errors.cost_method_code = 'Must be 2–20 uppercase alphanumeric or _';

  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  validateDateRange(errors, data);
  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateCostMethod };
