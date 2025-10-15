import { Valimock as ValimockOriginal } from 'valimock'

// Wrapper around Valimock to ensure unique 'value' fields in generated options
export class Valimock {
	#valimockOriginal
	/** @param {import("valimock").ValimockOptions} options */
	constructor(options) {
		this.#valimockOriginal = new ValimockOriginal(options)
	}
	/** @type {ValimockOriginal['mock']} */
	mock(schema) {
		const instance = this.#valimockOriginal.mock(schema)
		if ('options' in instance && Array.isArray(instance.options)) {
			// Filter out any duplicate options by value
			instance.options = instance.options.filter(
				// @ts-expect-error
				(option, index, self) =>
					// @ts-expect-error
					index === self.findIndex((o) => o.value === option.value),
			)
		}
		return instance
	}
}
