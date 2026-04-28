const { isEmpty, REGEX, validateCompanyGroup, validateDateRange, validateActiveFlag } = require('./commonValidator');

const validateOperatingUnit = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.le_id)) errors.le_id = 'Legal Entity is required';

  if (isEmpty(data.ou_name)) {
    errors.ou_name = 'OU Name is required';
  } else if (!REGEX.NAME.test(data.ou_name)) {
    errors.ou_name = 'OU Name must be 3–100 characters, no invalid special characters';
  }

  if (isEmpty(data.ou_short_code)) {
    errors.ou_short_code = 'OU Short Code is required';
  } else if (!REGEX.CODE.test(data.ou_short_code)) {
    errors.ou_short_code = 'OU Short Code must be 2–20 uppercase alphanumeric characters or underscores';
  }

  if (isEmpty(data.location_id)) errors.location_id = 'Location is required';

  if (isEmpty(data.currency_code)) {
    errors.currency_code = 'Currency Code is required';
  } else if (!REGEX.CURRENCY.test(data.currency_code)) {
    errors.currency_code = 'Currency must be 3 uppercase letters (e.g., INR)';
  }

  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateOperatingUnit };
