import {
	CategoryRefError,
	InvalidCategorySelectionError,
	CategorySelectionRefError,
	MissingCategoriesError,
} from './errors.js'
import { addRefToMap, getCategoryIdsForDocType, typedEntries } from './utils.js'

/**
 * Validate category references to fields, icons, and category selection document types.
 * Throws errors if any invalid references are found.
 *
 * @param {object} params
 * @param {Map<string, {fields: string[], icon?: string, appliesTo: string[]}>} params.categories - Map of category ID to category data
 * @param {Set<string> | Map<string, unknown>} params.fieldIds - Set of field IDs or Map with field IDs as keys
 * @param {Set<string>} params.iconIds - Set of icon IDs
 * @param {Record<string, string[]>} [params.categorySelection] - Optional category selection object mapping document types to category IDs
 * @throws {CategoryRefError} When field or icon references are missing
 * @throws {import('./errors.js').InvalidCategorySelectionError} When categories in category selection don't support the document type
 */

export function validateReferences({
	categories,
	fieldIds,
	iconIds,
	categorySelection,
}) {
	/** @type {Map<string, Set<string>>} */
	const missingIconRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const missingFieldRefs = new Map()

	// Convert Map to Set if needed
	const fieldIdSet =
		fieldIds instanceof Map ? new Set(fieldIds.keys()) : fieldIds

	// Check field and icon references in categories
	for (const [categoryId, category] of categories.entries()) {
		for (const fieldId of category.fields) {
			if (!fieldIdSet.has(fieldId)) {
				addRefToMap(missingFieldRefs, fieldId, categoryId)
			}
		}
		if (category.icon && !iconIds.has(category.icon)) {
			addRefToMap(missingIconRefs, category.icon, categoryId)
		}
	}

	if (missingFieldRefs.size > 0) {
		throw new CategoryRefError({
			missingRefs: missingFieldRefs,
			property: 'field',
		})
	}
	if (missingIconRefs.size > 0) {
		throw new CategoryRefError({
			missingRefs: missingIconRefs,
			property: 'icon',
		})
	}

	// Check that there are categories for both observation and track documents
	if (getCategoryIdsForDocType(categories, 'observation').length === 0) {
		throw new MissingCategoriesError({ docType: 'observation' })
	}
	if (getCategoryIdsForDocType(categories, 'track').length === 0) {
		throw new MissingCategoriesError({ docType: 'track' })
	}

	// Check category selection document types if provided
	if (categorySelection) {
		/** @type {Map<string, Set<string>>} */
		const invalidDocTypeRefs = new Map()

		for (const [documentType, categoryIds] of typedEntries(categorySelection)) {
			for (const categoryId of categoryIds) {
				const category = categories.get(categoryId)
				if (!category) {
					throw new CategorySelectionRefError({ categoryId, documentType })
				}
				if (category && !category.appliesTo.includes(documentType)) {
					addRefToMap(invalidDocTypeRefs, documentType, categoryId)
				}
			}
		}

		if (invalidDocTypeRefs.size > 0) {
			throw new InvalidCategorySelectionError({
				invalidRefs: invalidDocTypeRefs,
			})
		}
	}
}
