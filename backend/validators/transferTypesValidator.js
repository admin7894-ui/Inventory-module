const {
  validateCompanyGroup,
  validateDateRange,
  requireDropdown,
  isEmpty,
} = require('./commonValidator');

const CODE_REGEX = /^TT-[A-Z0-9]+$/;

const validateTransferType = (data) => {
  const errors = {};
  const computedCode = String(data.transfer_type_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const transferCode = data.transfer_type_code || (computedCode ? `TT-${computedCode}` : '');

  validateCompanyGroup(errors, {
    ...data,
    bg_id: data.bg_id || data.business_group_id,
    COMPANY_id: data.COMPANY_id || data.company_id,
  });

  if (isEmpty(data.transfer_type_name)) {
    errors.transfer_type_name = 'Transfer Type Name is required';
  }

  if (isEmpty(transferCode)) {
    errors.transfer_type_code = 'Transfer Type Code is required';
  } else if (!CODE_REGEX.test(String(transferCode).trim().toUpperCase())) {
    errors.transfer_type_code = 'Transfer Type Code must be in TT-XXXXX format';
  }

  if (isEmpty(data.is_active) && isEmpty(data.active_flag)) {
    errors.is_active = 'Active status is required';
  }

  requireDropdown(errors, data, 'module_id', 'Module');
  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateTransferType };
