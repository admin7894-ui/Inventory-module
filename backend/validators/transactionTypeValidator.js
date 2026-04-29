const { isEmpty, REGEX, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateTransactionType = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.txn_type_name)) {
    errors.txn_type_name = 'Transaction Type Name is required';
  }

  if (isEmpty(data.txn_type_code)) {
    errors.txn_type_code = 'Transaction Type Code is required';
  } else if (!REGEX.CODE.test(data.txn_type_code)) {
    errors.txn_type_code = 'Invalid Transaction Type Code format';
  }

  if (isEmpty(data.txn_action)) {
    errors.txn_action = 'Transaction Action is required';
  }

  if (isEmpty(data.txn_category)) {
    errors.txn_category = 'Transaction Category is required';
  }

  if (isEmpty(data.module_id)) {
    errors.module_id = 'Module is required';
  }

  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateTransactionType };
