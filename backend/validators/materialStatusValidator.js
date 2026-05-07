const validateMaterialStatus = (data) => {
  const errors = {};

  if (!data.status_name || !data.status_name.trim()) {
    errors.status_name = "Status Name is required";
  }

  // status_code is auto-generated if not provided, but we can validate it if it is
  if (data.status_code && !data.status_code.trim()) {
    errors.status_code = "Status Code cannot be empty";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

module.exports = { validateMaterialStatus };
