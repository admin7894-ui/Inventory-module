const db = require('../data/db');

/**
 * Get the base UOM for a given item.
 * @param {string} itemId 
 * @returns {string} baseUOMId
 */
function getItemBaseUOM(itemId) {
  const item = (db.item_master || []).find(i => i.item_id === itemId);
  if (!item) throw new Error(`Item ${itemId} not found`);
  return item.primary_uom_id;
}

/**
 * Get UOM conversion rate for a given item and UOM pair.
 * @param {string} itemId 
 * @param {string} fromUomId 
 * @param {string} toUomId 
 * @returns {object|null} conversion record
 */
function getUOMConversion(itemId, fromUomId, toUomId) {
  return (db.uom_conv || []).find(c => 
    c.item_id === itemId && 
    c.from_uom_id === fromUomId && 
    c.to_uom_id === toUomId &&
    (c.active_flag === 'Y' || c.active_flag === 'True' || c.active_flag === true)
  );
}

/**
 * Convert quantity from one UOM to base UOM.
 * @param {string} itemId 
 * @param {string} fromUomId 
 * @param {number} qty 
 * @returns {number} convertedQty
 */
function convertToBaseUOM(itemId, fromUomId, qty) {
  const baseUomId = getItemBaseUOM(itemId);
  if (fromUomId === baseUomId) return qty;

  const conversion = getUOMConversion(itemId, fromUomId, baseUomId);
  if (!conversion) {
    throw new Error("UOM conversion not defined for selected UOMs");
  }

  const rate = parseFloat(conversion.conversion_rate || 1);
  return qty * rate;
}

module.exports = {
  getItemBaseUOM,
  getUOMConversion,
  convertToBaseUOM
};
