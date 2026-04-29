// ══════════════════════════════════════════════════════════════
// useFormValidation — Reusable React hook for all form pages
// Usage:
//   const v = useFormValidation('inventory_org')
//   // In setField:  v.clearError(k)
//   // On blur:       v.handleBlur(k, formData, options)
//   // On submit:     const ok = v.runValidation(formData, options)
//   // In JSX:        error={v.fieldError('inv_org_name')}
// ══════════════════════════════════════════════════════════════
import { useState, useCallback } from 'react';
import { validate } from './validationEngine';

export function useFormValidation(formName) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitFailed, setSubmitFailed] = useState(false);

  /** Clear a single field error (call in setField) */
  const clearError = useCallback((key) => {
    setErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /** Mark field touched + run full validation (call onBlur) */
  const handleBlur = useCallback((key, formData, options = {}) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    // Trim string fields
    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const { errors: valErrors } = validate(formName, trimmedData, options);
    setErrors(valErrors);
  }, [formName]);

  /** Run full validation, mark all touched, return isValid (call on submit) */
  const runValidation = useCallback((formData, options = {}) => {
    // Trim string fields
    const trimmedData = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
    );
    const { errors: valErrors, isValid } = validate(formName, trimmedData, options);
    setErrors(valErrors);
    setSubmitFailed(!isValid);
    setTouched(
      Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    return isValid;
  }, [formName]);

  /** Alias for runValidation */
  const validateForm = useCallback((formData, options = {}) => {
    return runValidation(formData, options);
  }, [runValidation]);

  /** Get error for a field (only if touched) */
  const fieldError = useCallback((key) => {
    return (touched[key] || submitFailed) ? errors[key] : undefined;
  }, [errors, touched, submitFailed]);

  /** Reset all errors and touched state */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
    setSubmitFailed(false);
  }, []);

  /** Check if there are any errors and at least one field is touched */
  const hasErrors = Object.keys(errors).length > 0 && Object.keys(touched).length > 0;

  return {
    errors,
    touched,
    submitFailed,
    hasErrors,
    clearError,
    handleBlur,
    runValidation,
    validate: validateForm, // Alias
    fieldError,
    reset,
    setErrors,
    setTouched,
    setSubmitFailed,
  };
}

export default useFormValidation;
