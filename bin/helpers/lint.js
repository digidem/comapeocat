import { hasProperty } from 'dot-prop-extra'
import * as v from 'valibot'

import { addRefToMap, getCategoryIdsForDocType } from '../../src/lib/utils.js'
import { validateReferences } from '../../src/lib/validate-references.js'
import { CategorySchema } from '../../src/schema/category.js'
import { parseMessageId } from './messages-to-translations.js'
import { migrateDefaults } from './migrate-defaults.js'
import { migrateGeometry } from './migrate-geometry.js'
import { readFiles } from './read-files.js'
import { validateCategoryTags } from './validate-category-tags.js'

/** @import {CategorySelectionInput} from '../../src/schema/categorySelection.js' */
/** @import {MetadataInput} from '../../src/schema/metadata.js' */
/** @import {CategoryInput, CategoryOutput, CategoryDeprecatedSortInput, CategoryDeprecatedGeometryInput} from '../../src/schema/category.js' */
/** @import {FieldInput} from '../../src/schema/field.js' */
/** @import {Entries} from 'type-fest' */
/**
 * Lint and validate categories in a folder
 * @param {string} dir - Directory path
 */
export async function lint(dir) {
	/** @type {Map<string, Set<string>>} */
	const fieldRefs = new Map()
	/** @type {Map<string, Set<string>>} */
	const iconRefs = new Map()
	/** @type {Map<string, FieldInput>} */
	const fields = new Map()
	/** @type {Set<string>} */
	const iconIds = new Set()
	/** @type {Map<string, CategoryOutput>} */
	const categories = new Map()
	/** @type {CategorySelectionInput | undefined} */
	let categorySelection = undefined
	/** @type {Map<string, import('../../src/schema/messages.js').MessagesInput>} */
	const messages = new Map()
	/** @type {string[]} */
	const messagesWarnings = []
	/** @type {string[]} */
	const warnings = []
	/** @type {string[]} */
	const successes = []

	const counts = {
		category: 0,
		field: 0,
		icon: 0,
		messages: 0,
		categorySelection: 0,
		defaults: 0,
		metadata: 0,
	}

	let usesCategorySort = false
	let usesCategoryGeometry = false

	for await (const { type, id, value } of readFiles(dir)) {
		counts[type]++
		switch (type) {
			case 'field':
				fields.set(id, value)
				break
			case 'icon':
				iconIds.add(id)
				break
			case 'category': {
				if ('sort' in value && typeof value.sort === 'number') {
					usesCategorySort = true
				}
				if ('geometry' in value && Array.isArray(value.geometry)) {
					usesCategoryGeometry = true
				}
				const migratedCategory = v.parse(CategorySchema, migrateGeometry(value))
				categories.set(id, migratedCategory)
				for (const fieldRef of migratedCategory.fields) {
					addRefToMap(fieldRefs, fieldRef, id)
				}
				if (migratedCategory.icon) {
					addRefToMap(iconRefs, migratedCategory.icon, id)
				}
				break
			}
			case 'categorySelection':
				if (categorySelection) {
					warnings.push(
						'⚠️ Warning: Both defaults.json and categorySelection.json found, ignoring defaults.json',
					)
				}
				categorySelection = value
				break
			case 'defaults':
				if (categorySelection) {
					warnings.push(
						'⚠️ Warning: Both defaults.json and categorySelection.json found, ignoring defaults.json',
					)
				} else {
					categorySelection = migrateDefaults(value)
					warnings.push(
						'⚠️ Warning: defaults.json is deprecated, please update to categorySelection.json',
					)
				}
				break
			case 'messages':
				messages.set(id, value)
				break
		}
	}

	if (usesCategoryGeometry) {
		warnings.push(
			'⚠️ Warning: Some categories use the deprecated "geometry" property, please update to use "appliesTo" instead',
		)
	}

	if (usesCategorySort) {
		warnings.push(
			'⚠️ Warning: Some categories use the deprecated "sort" property, please update to use "categorySelection.json"',
		)
		if (counts.categorySelection) {
			warnings.push(
				`⚠️ Warning: Category sorting is defined in categorySelection.json, the "sort" property will be ignored`,
			)
		} else if (counts.defaults) {
			warnings.push(
				`⚠️ Warning: Category sorting is defined in defaults.json, the "sort" property will be ignored`,
			)
		}
	}

	for (const [type, count] of Object.entries(counts)) {
		if (count) {
			successes.push(`✓ ${count} valid ${type} file${count > 1 ? 's' : ''}`)
			continue
		}
		if (
			type === 'categorySelection' ||
			type === 'metadata' ||
			type === 'defaults'
		) {
			// These are optional
			continue
		}
		warnings.push(`⚠️ Warning: No ${type} file found`)
	}

	if (counts.categorySelection === 0 && counts.defaults === 0) {
		warnings.push(
			'⚠️ Warning: No categorySelection.json or defaults.json file found: all categories will be selectable',
		)
	}

	// Validate messages
	for (const [lang, msgs] of messages) {
		for (const msgId of Object.keys(msgs)) {
			const { docType, docId, propertyRef } = parseMessageId(msgId)
			/** @type {CategoryInput | FieldInput | undefined} */
			let doc
			if (docType === 'category') {
				doc = categories.get(docId)
			} else if (docType === 'field') {
				doc = fields.get(docId)
			}
			if (!doc) {
				messagesWarnings.push(
					`⚠️ Warning: Message ID "${msgId}" (${lang}) references non-existent ${docType} "${docId}"`,
				)
				continue
			}
			if (!hasProperty(doc, propertyRef) && msgs[msgId].message) {
				messagesWarnings.push(
					`⚠️ Warning: Message ID "${msgId}" (${lang}) references non-existent property "${propertyRef}" in ${docType} "${docId}"`,
				)
			}
		}
	}
	if (!messagesWarnings.length && messages.size > 0) {
		successes.push(
			`✓ All ${messages.size} message${messages.size > 1 ? 's' : ''} files valid`,
		)
	} else {
		warnings.push(...messagesWarnings)
	}

	validateCategoryTags(categories)
	successes.push(`✓ All categories have tags which are unique`)
	const fieldIds = new Set(fields.keys())
	validateReferences({ categories, fieldIds, iconIds, categorySelection })
	successes.push(`✓ All categories reference existing fields and icons`)
	if (categorySelection) {
		successes.push(`✓ CategorySelection file references existing categories`)
		successes.push(
			`✓ CategorySelection file references categories with matching document types`,
		)
	}

	// Currently validateReferences does not report warnings, so lint does that below:

	for (const fieldId of fieldIds) {
		if (fieldRefs.delete(fieldId)) {
			fieldIds.delete(fieldId)
		}
	}

	let extraFieldWarning = ''
	if (fieldIds.size > 0) {
		extraFieldWarning = `⚠️ Warning: ${fieldIds.size} field file${
			fieldIds.size > 1 ? 's' : ''
		} found with no categories referencing them:\n${[...fieldIds]
			.map((id) => `   - ${id}`)
			.join('\n')}`
	}
	if (extraFieldWarning) {
		warnings.push(extraFieldWarning)
	} else {
		successes.push(`✓ All field files are referenced by at least one category`)
	}

	for (const iconId of iconIds) {
		if (iconRefs.delete(iconId)) {
			iconIds.delete(iconId)
		}
	}

	let extraIconWarning = ''
	if (iconIds.size > 0) {
		extraIconWarning = `⚠️ Warning: ${iconIds.size} icon file${
			iconIds.size > 1 ? 's' : ''
		} found with no categories referencing them:\n${[...iconIds]
			.map((id) => `   - ${id}`)
			.join('\n')}`
	}
	if (extraIconWarning) {
		warnings.push(extraIconWarning)
	} else {
		successes.push(`✓ All icon files are referenced by at least one category`)
	}

	if (categorySelection) {
		const obsCatIds = getCategoryIdsForDocType(categories, 'observation')
		const obsCatIdsNotInSelection = diffArrays(
			obsCatIds,
			categorySelection.observation,
		)
		if (obsCatIdsNotInSelection.length) {
			warnings.push(
				`⚠️ Warning: ${obsCatIdsNotInSelection.length} observation categor${
					obsCatIdsNotInSelection.length > 1 ? 'ies' : 'y'
				} not included in categorySelection.json
   These categories will not be shown to the user by default:
${obsCatIdsNotInSelection.map((id) => `   - ${id}`).join('\n')}`,
			)
		}
		const trackCatIds = getCategoryIdsForDocType(categories, 'track')
		const trackCatIdsNotInSelection = diffArrays(
			trackCatIds,
			categorySelection.track,
		)
		if (trackCatIdsNotInSelection.length) {
			warnings.push(
				`⚠️ Warning: ${trackCatIdsNotInSelection.length} track categor${
					trackCatIdsNotInSelection.length > 1 ? 'ies' : 'y'
				} not included in categorySelection.json
   These categories will not be shown to the user by default:
${trackCatIdsNotInSelection.map((id) => `   - ${id}`).join('\n')}`,
			)
		}
	}

	// Write to stderr, because stdout could be used for piping output
	console.warn(successes.join('\n'))
	if (warnings.length > 0) {
		console.warn('\n' + warnings.join('\n'))
	}
}

/**
 * Get items in arr1 which are not in arr2
 * @param {string[]} arr1
 * @param {string[]} arr2
 * @returns {string[]}
 */
function diffArrays(arr1, arr2) {
	return arr1.filter((item) => !arr2.includes(item))
}
