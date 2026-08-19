import Papa from 'papaparse'
import type { RowData } from './types'

export const DATASET_LIMITS = { maxFiles: 4, maxFileBytes: 2 * 1024 * 1024, maxRows: 5000, maxColumns: 32, maxCellChars: 512 }
export type UserTable = { name: string; rows: RowData[]; columns: string[]; source: string }

const safeName = (fileName: string, fallback: string) => fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_]+/g, '_').toLowerCase() || fallback

export function parseDatasetFile(file: File, index = 0): Promise<UserTable> {
  if (file.size > DATASET_LIMITS.maxFileBytes) return Promise.reject(new Error(`${file.name}: file vượt giới hạn 2 MB.`))
  return new Promise((resolve, reject) => {
    Papa.parse<RowData>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      worker: false,
      complete: (result) => {
        const rows = result.data.filter((row) => Object.values(row).some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''))
        const columns = result.meta.fields ?? []
        if (!columns.length) return reject(new Error(`${file.name}: cần có header ở dòng đầu tiên.`))
        if (columns.length > DATASET_LIMITS.maxColumns) return reject(new Error(`${file.name}: tối đa ${DATASET_LIMITS.maxColumns} columns.`))
        if (rows.length > DATASET_LIMITS.maxRows) return reject(new Error(`${file.name}: tối đa ${DATASET_LIMITS.maxRows} rows.`))
        if (rows.some((row) => Object.values(row).some((cell) => String(cell ?? '').length > DATASET_LIMITS.maxCellChars))) return reject(new Error(`${file.name}: mỗi cell tối đa ${DATASET_LIMITS.maxCellChars} ký tự.`))
        if (result.errors.length) return reject(new Error(`${file.name}: không thể đọc dòng ${(result.errors[0]?.row ?? 0) + 1}.`))
        resolve({ name: safeName(file.name, `table_${index + 1}`), rows, columns, source: file.name })
      },
      error: (error) => reject(new Error(`${file.name}: ${error.message}`)),
    })
  })
}

export async function parseDatasetFiles(files: FileList | File[]): Promise<UserTable[]> {
  const selected = Array.from(files)
  if (!selected.length) return []
  if (selected.length > DATASET_LIMITS.maxFiles) throw new Error(`Chỉ upload tối đa ${DATASET_LIMITS.maxFiles} files mỗi lần.`)
  return Promise.all(selected.map((file, index) => parseDatasetFile(file, index)))
}
