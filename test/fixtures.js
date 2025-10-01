import archiver from 'archiver'
import { createWriteStream } from 'node:fs'

export const fixtures = /** @type {const} */ ({
	presets: {
		tree: {
			name: 'Tree',
			geometry: ['point'],
			tags: { natural: 'tree' },
			fields: [],
		},
		treeWithFields: {
			name: 'Tree',
			geometry: ['point'],
			tags: { natural: 'tree' },
			fields: ['species', 'height'],
			icon: 'tree',
			color: '#228B22',
		},
		treeComplete: {
			name: 'Tree',
			geometry: ['point'],
			tags: { natural: 'tree' },
			addTags: { natural: 'tree', source: 'survey' },
			removeTags: { natural: 'tree', source: 'survey' },
			fields: ['species', 'height', 'condition'],
			icon: 'tree',
			color: '#228B22',
			terms: ['árbol', 'arbre'],
			sort: 1,
		},
		river: {
			name: 'River',
			geometry: ['line'],
			tags: { natural: 'water', water: 'river' },
			fields: [],
		},
		riverWithFields: {
			name: 'River',
			geometry: ['line'],
			tags: { natural: 'water', water: 'river' },
			fields: ['name'],
		},
		water: {
			name: 'Water',
			geometry: ['area'],
			tags: { natural: 'water' },
			fields: [],
		},
		forest: {
			name: 'Forest',
			geometry: ['area'],
			tags: { natural: 'wood', wood: 'forest' },
			fields: ['name', 'area_size'],
			icon: 'forest',
			color: '#006400',
			sort: 10,
		},
		multiGeometry: {
			name: 'Water',
			geometry: ['point', 'line', 'area'],
			tags: { natural: 'water' },
			fields: [],
		},
	},

	fields: {
		species: {
			type: 'text',
			tagKey: 'species',
			label: 'Species',
			appearance: 'singleline',
		},
		speciesComplete: {
			type: 'text',
			tagKey: 'species',
			label: 'Species',
			appearance: 'singleline',
			placeholder: 'e.g., Quercus robur',
			helperText: 'Enter the scientific name',
		},
		height: {
			type: 'number',
			tagKey: 'height',
			label: 'Height (m)',
		},
		name: {
			type: 'text',
			tagKey: 'name',
			label: 'Name',
		},
		condition: {
			type: 'selectOne',
			tagKey: 'condition',
			label: 'Tree Condition',
			options: [
				{ label: 'Healthy', value: 'healthy' },
				{ label: 'Damaged', value: 'damaged' },
				{ label: 'Dead', value: 'dead' },
			],
		},
		features: {
			type: 'selectMultiple',
			tagKey: 'features',
			label: 'Features',
			options: [
				{ label: 'Water', value: 'water' },
				{ label: 'Trees', value: 'trees' },
				{ label: 'Wildlife', value: 'wildlife' },
			],
		},
		description: {
			type: 'text',
			tagKey: 'description',
			label: 'Description',
			appearance: 'multiline',
		},
		area_size: {
			type: 'number',
			tagKey: 'area',
			label: 'Area (hectares)',
		},
		width: {
			type: 'number',
			tagKey: 'width',
			label: 'Width (m)',
		},
	},

	defaults: {
		point: {
			point: ['tree'],
			line: [],
			area: [],
		},
		all: {
			point: ['tree'],
			line: ['river'],
			area: ['water'],
		},
	},

	metadata: {
		minimal: {
			name: 'Test',
			buildDateValue: 1000000,
		},
		complete: {
			name: 'Test Categories',
			version: '1.2.3',
			buildDateValue: 1234567890,
		},
	},

	icons: {
		simple: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>',
		tree: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><rect x="11" y="12" width="2" height="10"/></svg>',
		forest:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L8 8h8z"/></svg>',
		complex:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L14 8L20 8L15 12L17 18L12 14L7 18L9 12L4 8L10 8Z"/></svg>',
	},

	translations: {
		es: {
			preset: {
				tree: [{ propertyRef: 'name', message: 'Árbol' }],
			},
			field: {},
		},
		esComplete: {
			preset: {
				tree: [
					{ propertyRef: 'name', message: 'Árbol' },
					{ propertyRef: 'terms', message: 'tree, plant' },
				],
			},
			field: {
				species: [
					{ propertyRef: 'label', message: 'Especie' },
					{ propertyRef: 'placeholder', message: 'ej. Quercus robur' },
				],
				condition: [
					{ propertyRef: 'label', message: 'Condición del árbol' },
					{ propertyRef: 'options.0', message: 'Saludable' },
					{ propertyRef: 'options.1', message: 'Dañado' },
					{ propertyRef: 'options.2', message: 'Muerto' },
				],
			},
		},
		fr: {
			preset: {
				tree: [{ propertyRef: 'name', message: 'Arbre' }],
			},
			field: {},
		},
	},
})

/**
 * Create a zip file for testing
 * @param {Object} options
 * @param {string} options.filepath - Path to write the zip file
 * @param {Object.<string, any>} [options.files] - Files to add (key: filename, value: content)
 * @param {string | null} [options.version] - Version string to add to VERSION file
 * @returns {Promise<void>}
 */
export async function createTestZip({ filepath, files = {}, version = '1.0' }) {
	const archive = archiver('zip', { zlib: { level: 9 } })
	const output = createWriteStream(filepath)

	const archivePromise = new Promise((resolve, reject) => {
		// @ts-expect-error
		output.on('close', resolve)
		archive.on('error', reject)
	})

	archive.pipe(output)

	if (version !== null) {
		archive.append(version, { name: 'VERSION' })
	}

	for (const [name, content] of Object.entries(files)) {
		if (typeof content === 'string') {
			archive.append(content, { name })
		} else {
			archive.append(JSON.stringify(content, null, 2), { name })
		}
	}

	archive.finalize()
	await archivePromise
}
