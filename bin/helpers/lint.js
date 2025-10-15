import { hasProperty } from 'dot-prop-extra'
import * as v from 'valibot'

import { addRefToMap } from '../../src/lib/utils.js'
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

	for (const [type, count] of Object.entries(counts)) {
		if (['metadata', 'categorySelection'].includes(type) && count === 0) {
			warnings.push(`⚠️ Warning: No ${type}.json file found`)
			continue
		}
		if (count) {
			successes.push(`✓ ${count} valid ${type} file${count > 1 ? 's' : ''}`)
		} else {
			warnings.push(`⚠️ Warning: No ${type} file found`)
		}
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
			.map((id) => `  - ${id}`)
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
			.map((id) => `  - ${id}`)
			.join('\n')}`
	}
	if (extraIconWarning) {
		warnings.push(extraIconWarning)
	} else {
		successes.push(`✓ All icon files are referenced by at least one category`)
	}

	// Write to stderr, because stdout could be used for piping output
	console.warn(successes.join('\n'))
	if (warnings.length > 0) {
		console.warn('\n' + warnings.join('\n'))
	}
}
