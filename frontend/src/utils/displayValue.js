export const EMPTY_PLACEHOLDER = '--'

export function isDisplayEmpty(value) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    value === '?'
  )
}

export function displayValue(value, placeholder = EMPTY_PLACEHOLDER) {
  return isDisplayEmpty(value) ? placeholder : value
}

export function resolveDisplayValue(candidates = [], placeholder = EMPTY_PLACEHOLDER) {
  for (const candidate of candidates) {
    if (!isDisplayEmpty(candidate)) return candidate
  }
  return placeholder
}
