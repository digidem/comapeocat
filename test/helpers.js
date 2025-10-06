import { Writer } from '../src/writer.js'

export function createTestWriter() {
	const writer = new Writer()
	writer.setMetadata({ name: 'Test' })
	writer.setCategorySelection({ observation: [], track: [] })
	return writer
}
