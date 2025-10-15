/**
 * @param {import("../../src/schema/defaults.js").DefaultsDeprecatedInput} defaults
 * @return {import("../../src/schema/categorySelection.js").CategorySelectionInput}
 */
export function migrateDefaults(defaults) {
	return {
		observation: defaults.point,
		track: defaults.line,
	}
}
