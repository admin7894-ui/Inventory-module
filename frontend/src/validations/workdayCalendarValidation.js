export const validateWorkdayCalendar = (formData) => {
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

  // Calendar Name
  if (!formData.calendar_name) {
    errors.calendar_name = "Calendar Name is required";
  }

  // Year
  if (!formData.year) {
    errors.year = "Year is required";
  } else if (!/^\d{4}$/.test(formData.year)) {
    errors.year = "Year must be a 4-digit number";
  }

  // Weekly Off Days
  if (!formData.weekly_off_days || formData.weekly_off_days.length === 0) {
    errors.weekly_off_days = "Select at least one weekly off day";
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

  // Holidays Validation
  if (formData.holidays && Array.isArray(formData.holidays)) {
    formData.holidays.forEach((h, index) => {
      if (!h.holiday_name) {
        errors[`holiday_name_${index}`] = "Holiday name required";
      }
      if (!h.holiday_date) {
        errors[`holiday_date_${index}`] = "Holiday date required";
      } else {
        // Check if holiday date is within effective range
        const hDate = new Date(h.holiday_date);
        const fromDate = new Date(formData.effective_from);
        const toDate = formData.effective_to ? new Date(formData.effective_to) : null;

        if (hDate < fromDate || (toDate && hDate > toDate)) {
          errors[`holiday_date_${index}`] = "Date must be within effective range";
        }
      }
    });
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
