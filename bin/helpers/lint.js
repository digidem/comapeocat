import { hasProperty } from 'dot-prop'

import { addRefToMap } from '../../src/lib/utils.js'
import { validateReferences } from '../../src/lib/validate-references.js'
import { parseMessageId } from './messages-to-translations.js'
import { readFiles } from './read-files.js'
import { validatePresetTags } from './validate-preset-tags.js'

/** @import {DefaultsInput} from '../../src/schema/defaults.js' */
/** @import {MetadataInput} from '../../src/schema/metadata.js' */
/** @import {PresetInput, PresetDeprecatedInput} from '../../src/schema/preset.js' */
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
	/** @type {Map<string, PresetInput | PresetDeprecatedInput>} */
	const presets = new Map()
	/** @type {DefaultsInput | undefined} */
	let defaults = undefined
	/** @type {Set<import('../../src/schema/messages.js').MessagesInput>} */
	const messages = new Set()
	/** @type {string[]} */
	const messagesWarnings = []
	/** @type {string[]} */
	const warnings = []
	/** @type {string[]} */
	const successes = []

	const counts = {
		preset: 0,
		field: 0,
		icon: 0,
		messages: 0,
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
			case 'preset':
				presets.set(id, value)
				for (const fieldRef of value.fields) {
					addRefToMap(fieldRefs, fieldRef, id)
				}
				if (value.icon) {
					addRefToMap(iconRefs, value.icon, id)
				}
				break
			case 'defaults':
				defaults = value
				break
			case 'messages':
				messages.add(value)
				break
		}
	}

	for (const [type, count] of Object.entries(counts)) {
		if (['metadata', 'defaults'].includes(type) && count === 0) {
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
	for (const msgs of messages) {
		for (const msgId of Object.keys(msgs)) {
			const { docType, docId, propertyRef } = parseMessageId(msgId)
			/** @type {PresetInput | FieldInput | undefined} */
			let doc
			if (docType === 'preset') {
				doc = presets.get(docId)
			} else if (docType === 'field') {
				doc = fields.get(docId)
			}
			if (!doc) {
				messagesWarnings.push(
					`⚠️ Warning: Message ID "${msgId}" references non-existent ${docType} "${docId}"`,
				)
				continue
			}
			if (!hasProperty(doc, propertyRef)) {
				messagesWarnings.push(
					`⚠️ Warning: Message ID "${msgId}" references non-existent property "${propertyRef}" in ${docType} "${docId}"`,
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

	validatePresetTags(presets)
	successes.push(`✓ All presets have tags which are unique`)
	const fieldIds = new Set(fields.keys())
	validateReferences({ presets, fieldIds, iconIds, defaults })
	successes.push(`✓ All presets reference existing fields and icons`)
	if (defaults) {
		successes.push(`✓ Defaults file references existing presets`)
		successes.push(`✓ Defaults file references presets with matching geometry`)
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
		} found with no presets referencing them:\n${[...fieldIds]
			.map((id) => `  - ${id}`)
			.join('\n')}`
	}
	if (extraFieldWarning) {
		warnings.push(extraFieldWarning)
	} else {
		successes.push(`✓ All field files are referenced by at least one preset`)
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
		} found with no presets referencing them:\n${[...iconIds]
			.map((id) => `  - ${id}`)
			.join('\n')}`
	}
	if (extraIconWarning) {
		warnings.push(extraIconWarning)
	} else {
		successes.push(`✓ All icon files are referenced by at least one preset`)
	}

	// Write to stderr, because stdout could be used for piping output
	console.warn(successes.join('\n'))
	if (warnings.length > 0) {
		console.warn('\n' + warnings.join('\n'))
	}
}
