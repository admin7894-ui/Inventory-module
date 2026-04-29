const { isEmpty, REGEX, validateCompanyGroup, validateDateRange } = require('./commonValidator');

const validateTransactionReason = (data) => {
  const errors = {};

  validateCompanyGroup(errors, data);

  if (isEmpty(data.txn_reason)) {
    errors.txn_reason = 'Transaction Reason is required';
  }

  if (isEmpty(data.reason_code)) {
    errors.reason_code = 'Invalid Reason Code format';
  } else if (!REGEX.CODE.test(data.reason_code)) {
    errors.reason_code = 'Invalid Reason Code format';
  }

  if (isEmpty(data.module_id)) {
    errors.module_id = 'Module is required';
  }

  validateDateRange(errors, data);

  return { errors, isValid: Object.keys(errors).length === 0 };
};

module.exports = { validateTransactionReason };
