import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mappingPath = path.resolve(__dirname, '../config/data_mapping.json')

export function loadMapping() {
  try {
    const raw = fs.readFileSync(mappingPath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to read mapping', err)
    return {}
  }
}
