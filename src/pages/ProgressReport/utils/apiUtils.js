/**
 * apiUtils.js - API Payload Construction & Field Validation
 * 
 * RESPONSIBILITY: Build API request payloads with proper field selection,
 * validate fields against entity schema, and construct API parameters.
 * 
 * ARCHITECTURE LAYER: Business Logic Layer (Pure Functions)
 * - No React dependencies ✓
 * - No API calls ✓
 * - Fully unit-testable ✓
 * - Reusable across all pages ✓
 * 
 * USAGE:
 *   const fields = buildRequestFields(visibleColumns, currentEntityColumns, defaults);
 *   const validated = validateFieldAgainstSchema('name', 'Mothers');
 * 
 * EXPORTS:
 *   - buildRequestFields(visibleColumns, currentEntityColumns, defaultVisibleColumns)
 *   - validateFieldAgainstSchema(fieldId, entity)
 *   - buildApiQueryParams(filters)
 *   - extractFieldNames(columns)
 */

/**
 * Build the list of fields to request from the API based on visible columns
 * 
 * Returns either the selected visible columns or defaults if none selected.
 * Ensures all selected fields are valid for the entity type.
 * 
 * @param {Array<string>} visibleColumns - IDs of columns user selected as visible
 * @param {Array<Object>} currentEntityColumns - Available columns for current entity
 * @param {Array<string>} defaultVisibleColumns - Default fallback columns
 * @returns {Array<string>} Field IDs to request from API
 * 
 * @example
 * const fields = buildRequestFields(
 *   ['name', 'risk', 'progress'],
 *   allMotherColumns,
 *   defaultMotherColumns
 * );
 * // Returns: ['name', 'risk', 'progress'] (if all valid)
 */
export const buildRequestFields = (visibleColumns, currentEntityColumns, defaultVisibleColumns) => {
  const selectedIds = visibleColumns.filter((id) =>
    currentEntityColumns.some((column) => column.id === id)
  );

  return selectedIds.length ? selectedIds : defaultVisibleColumns;
};

/**
 * Validate that all requested fields are allowed by the backend
 */
export const validateFieldAgainstSchema = (fieldId, allowedFields) => {
  return allowedFields.includes(fieldId);
};

/**
 * Build API query parameters for fetching beneficiary data
 */
export const buildApiQueryParams = (fields, additionalParams = {}) => {
  return {
    ...additionalParams,
    fields: fields.join(','),
  };
};

/**
 * Extract just the field names from column definitions
 */
export const extractFieldNames = (columns) => columns.map((col) => col.id);
