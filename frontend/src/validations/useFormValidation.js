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
    const { errors: valErrors } = validate(formName, formData, options);
    setErrors(valErrors);
  }, [formName]);

  /** Run full validation, mark all touched, return isValid (call on submit) */
  const runValidation = useCallback((formData, options = {}) => {
    const { errors: valErrors, isValid } = validate(formName, formData, options);
    setErrors(valErrors);
    setTouched(
      Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    return isValid;
  }, [formName]);

  /** Get error for a field (only if touched) */
  const fieldError = useCallback((key) => {
    return touched[key] ? errors[key] : undefined;
  }, [errors, touched]);

  /** Reset all errors and touched state */
  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /** Check if there are any errors and at least one field is touched */
  const hasErrors = Object.keys(errors).length > 0 && Object.keys(touched).length > 0;

  return {
    errors,
    touched,
    hasErrors,
    clearError,
    handleBlur,
    runValidation,
    fieldError,
    reset,
    setErrors,
    setTouched,
  };
}

export default useFormValidation;
