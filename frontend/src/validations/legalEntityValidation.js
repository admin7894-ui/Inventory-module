export const validateLegalEntity = (formData) => {
  const errors = {};

  // Company
  if (!formData.COMPANY_id) {
    errors.COMPANY_id = "Please select a valid option";
  }

  // Business Group
  if (formData.COMPANY_id && !formData.bg_id) {
    errors.bg_id = "Please select a valid option";
  } else if (!formData.COMPANY_id) {
    errors.bg_id = "Select Company first";
  }

  // Business Type
  if (formData.COMPANY_id && !formData.business_type_id) {
    errors.business_type_id = "Please select a valid option";
  } else if (!formData.COMPANY_id) {
    errors.business_type_id = "Select Company first";
  }

  // Le Name
  const leNameRegex = /^[A-Za-z0-9 &()\-]{3,100}$/;
  if (!formData.le_name) {
    errors.le_name = "Legal Entity Name is required";
  } else if (!leNameRegex.test(formData.le_name)) {
    errors.le_name = "Legal Entity Name must be 3–100 characters, no special characters except & ( ) -";
  }

  // Tax Registration No
  const taxRegex = /^[0-9A-Z]{15}$/;
  if (!formData.tax_registration_no) {
    errors.tax_registration_no = "Tax Registration No is required";
  } else if (!taxRegex.test(formData.tax_registration_no)) {
    errors.tax_registration_no = "Tax Registration No must be 15 uppercase alphanumeric characters";
  }

  // Location
  if (!formData.location_id) {
    errors.location_id = "Please select a valid option";
  }

  // Currency Code
  const currencyRegex = /^[A-Z]{3}$/;
  if (!formData.currency_code) {
    errors.currency_code = "Currency code is required";
  } else if (!currencyRegex.test(formData.currency_code)) {
    errors.currency_code = "Currency code must be 3 uppercase letters (e.g., INR, USD)";
  }

  // Module
  if (!formData.module_id) {
    errors.module_id = "Module is required";
  }

  // Active
  if (formData.active_flag === undefined || formData.active_flag === null) {
    errors.active_flag = "Please select active status";
  }

  // Effective From
  if (!formData.effective_from) {
    errors.effective_from = "Effective From date is required";
  }

  // Effective To
  if (formData.effective_from && formData.effective_to) {
    if (new Date(formData.effective_to) < new Date(formData.effective_from)) {
      errors.effective_to = "Effective To must be greater than or equal to Effective From";
    }
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
