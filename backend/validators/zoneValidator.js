const { isEmpty, validateActiveFlag, validateDateRange } = require('./commonValidator');

const validateZone = (data) => {
  const errors = {};

  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.business_type_id)) errors.business_type_id = 'Business Type is required';
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Zone Name
  if (isEmpty(data.zone_name)) {
    errors.zone_name = 'Zone Name is required';
  } else if (data.zone_name.length < 2 || data.zone_name.length > 100) {
    errors.zone_name = '2-100 characters';
  }  


  

  // Zone Code
  if (isEmpty(data.zone_code)) {
    errors.zone_code = 'Zone Code is required';
  } else {
    const codeRegex = /^[Z]_[A-Z0-9_]{1,18}$/;
    if (!codeRegex.test(data.zone_code)) {
      errors.zone_code = 'Must start with Z_ and be max 20 chars';
    }
  }

  // Zone Type (STORAGE, COLD, GENERAL)
  if (isEmpty(data.zone_type)) {
    errors.zone_type = 'Zone Type is required';
  }

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = validateZone;
