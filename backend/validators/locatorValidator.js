const { isEmpty, validateActiveFlag, validateDateRange } = require('./commonValidator');

const validateLocator = (data) => {
  const errors = {};

  if (isEmpty(data.bg_id)) errors.bg_id = 'Business Group is required';
  if (isEmpty(data.COMPANY_id)) errors.COMPANY_id = 'Company is required';
  if (isEmpty(data.business_type_id)) errors.business_type_id = 'Business Type is required';
  if (isEmpty(data.module_id)) errors.module_id = 'Module is required';

  // Subinventory Id
  if (isEmpty(data.subinventory_id)) {
    errors.subinventory_id = 'Subinventory is required';
  }

  // Locator Name
  if (isEmpty(data.locator_name)) {
    errors.locator_name = 'Locator Name is required';
  }

  // Locator Code
  if (isEmpty(data.locator_code)) {
    errors.locator_code = 'Locator Code is required';
  } else {
    const codeRegex = /^L_[A-Z0-9_]{1,18}$/;
    if (!codeRegex.test(data.locator_code)) {
      errors.locator_code = 'Must start with L_ and be max 20 chars';
    }
  }

  // Locator Type & Usage
  if (isEmpty(data.locator_type)) errors.locator_type = 'Locator Type is required';
  if (isEmpty(data.locator_usage)) errors.locator_usage = 'Locator Usage is required';

  // Max Weight & Volume >= 0
  if (!isEmpty(data.max_weight_kg) && Number(data.max_weight_kg) < 0) {
    errors.max_weight_kg = 'Weight must be >= 0';
  }
  if (!isEmpty(data.max_volume_cbm) && Number(data.max_volume_cbm) < 0) {
    errors.max_volume_cbm = 'Volume must be >= 0';
  }

  // Material Status & Temp
  if (isEmpty(data.material_status)) errors.material_status = 'Material Status is required';
  if (isEmpty(data.temperature_range)) errors.temperature_range = 'Temperature Range is required';

  validateActiveFlag(errors, data);
  validateDateRange(errors, data);

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = validateLocator;
