const SCOPE_FIELDS = [
  { key: 'bg_id', aliases: ['bg_id', 'business_group_id'] },
  { key: 'company_id', aliases: ['COMPANY_id', 'company_id'] },
  { key: 'business_type_id', aliases: ['business_type_id'] },
];

function firstValue(...values) {
  return values.find(v => v !== undefined && v !== null && String(v).trim() !== '');
}

function getScope(source = {}) {
  return {
    bg_id: firstValue(source.bg_id, source.business_group_id),
    company_id: firstValue(source.company_id, source.COMPANY_id),
    business_type_id: firstValue(source.business_type_id),
  };
}

function hasOwnAny(record, aliases) {
  return aliases.some(alias => Object.prototype.hasOwnProperty.call(record, alias));
}

function valueFor(record, aliases) {
  for (const alias of aliases) {
    const value = record?.[alias];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return undefined;
}

function recordMatchesScope(record, scope) {
  if (!record || typeof record !== 'object') return true;

  return SCOPE_FIELDS.every(({ key, aliases }) => {
    const selected = scope?.[key];
    if (!selected) return true;

    const recordValue = valueFor(record, aliases);
    if (recordValue === undefined) return !hasOwnAny(record, aliases);

    return String(recordValue) === String(selected);
  });
}

function applyScopeFilter(data, user = {}) {
  const scope = getScope(user);
  if (!Array.isArray(data)) return data;
  if (!scope.bg_id && !scope.company_id && !scope.business_type_id) return data;

  return data.filter(row => recordMatchesScope(row, scope));
}

function filterPayload(payload, user = {}) {
  if (!payload || typeof payload !== 'object') return payload;

  if (Array.isArray(payload)) return applyScopeFilter(payload, user);

  if (Array.isArray(payload.data)) {
    const nextData = applyScopeFilter(payload.data, user);
    return {
      ...payload,
      data: nextData,
      total: nextData.length,
      pages: payload.limit ? Math.ceil(nextData.length / Number(payload.limit || 1)) : payload.pages,
    };
  }

  if (payload.data && typeof payload.data === 'object') {
    const scope = getScope(user);
    if ((scope.bg_id || scope.company_id || scope.business_type_id) && !recordMatchesScope(payload.data, scope)) {
      return { ...payload, success: false, data: null, message: 'Not found' };
    }
  }

  return payload;
}

module.exports = { applyScopeFilter, filterPayload, getScope };
