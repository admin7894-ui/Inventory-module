const { isEmpty, validateActiveFlag, validateDateRange } = require('./commonValidator');

const validateBrand = (data) => {
  const errors = {};

  // Required: bg_id, COMPANY_id, business_type_id, module_id
  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.business_type_id)) errors.business_type_id = 'Business Type is required';
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Brand Name: ^[A-Za-z0-9 &()\-]{2,100}$
  if (isEmpty(data.brand_name)) {
    errors.brand_name = 'Brand Name is required';
  } else {
    const nameRegex = /^[A-Za-z0-9 &()\-]{2,100}$/;
    if (!nameRegex.test(data.brand_name)) {
      errors.brand_name = '2-100 chars, alphanumeric and &()\- only';
    }
  }

  // Brand Code
  if (isEmpty(data.brand_code)) {
    errors.brand_code = 'Brand Code is required';
  } else {
    const codeRegex = /^[A-Z0-9_]{2,20}$/;
    if (!codeRegex.test(data.brand_code)) {
      errors.brand_code = '2-20 chars, uppercase and underscore only';
    }
  }

  // Description (max 250)
  if (data.description && data.description.length > 250) {
    errors.description = 'Max 250 characters';
  }

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = validateBrand;
