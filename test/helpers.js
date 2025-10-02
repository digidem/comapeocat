import { Writer } from '../src/writer.js'

export function createTestWriter() {
	const writer = new Writer()
	writer.setMetadata({ name: 'Test' })
	writer.setDefaults({ point: [], line: [], area: [] })
	return writer
}
