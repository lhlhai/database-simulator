import alasql from 'alasql'
import type { QueryPlan, RowData, SimEvent } from './types'
import type { UserTable } from './dataset'

function event(id: string, node: string, title: string, detail: string): SimEvent { return { id, node, kind: 'result', title, detail, activeIds: [], duration: 500 } }

export function runComplexSql(query: string, tables: UserTable[]): { rows: RowData[]; elapsedMs: number; plan: QueryPlan } {
  if (!query.trim()) throw new Error('Query không được để trống.')
  const bindings: RowData[][] = []
  const normalized = query.replace(/\b(FROM|JOIN)\s+([a-zA-Z_][\w]*)/gi, (full, keyword: string, tableName: string) => {
    const table = tables.find((item) => item.name.toLowerCase() === tableName.toLowerCase())
    if (!table) throw new Error(`Không tìm thấy table "${tableName}" trong dataset hiện tại.`)
    bindings.push(table.rows)
    return `${keyword} ?`
  })
  if (!bindings.length) throw new Error('Complex SQL cần có FROM table hoặc JOIN table.')
  const started = performance.now()
  let output: unknown
  try { output = alasql(normalized, bindings) } catch (error) { throw new Error(`SQL complex chưa chạy được: ${error instanceof Error ? error.message : 'syntax error'}`) }
  const elapsedMs = Number((performance.now() - started).toFixed(2))
  const rows = (Array.isArray(output) ? output : []).map((row) => ({ ...row })) as RowData[]
  const hasJoin = /\bjoin\b/i.test(query)
  const hasAggregate = /\b(count|sum|avg|min|max)\s*\(/i.test(query) || /\bgroup\s+by\b/i.test(query)
  const nodes = [
    { id: 'source', label: 'Read tables', caption: `${bindings.length} table${bindings.length > 1 ? 's' : ''}`, tone: 'blue' },
    ...(hasJoin ? [{ id: 'join', label: 'Join', caption: 'Combine matching rows', tone: 'violet' }] : []),
    ...(hasAggregate ? [{ id: 'aggregate', label: 'Aggregate', caption: 'Group and calculate', tone: 'amber' }] : []),
    { id: 'result', label: 'Result', caption: `${rows.length} rows`, tone: 'green' },
  ]
  const events = [event('complex-source', 'source', 'Read source tables', `Đọc ${bindings.reduce((sum, table) => sum + table.length, 0)} row từ ${bindings.length} table.`)]
  if (hasJoin) events.push(event('complex-join', 'join', 'Execute join', 'Ghép các row theo điều kiện ON của query.'))
  if (hasAggregate) events.push(event('complex-aggregate', 'aggregate', 'Aggregate result', 'Thực hiện GROUP BY hoặc hàm aggregate.'))
  events.push(event('complex-result', 'result', 'Return result', `Query trả về ${rows.length} row trong ${elapsedMs} ms.`))
  const plan: QueryPlan = { dialect: 'sql', query, collection: tables.map((table) => table.name).join(', '), nodes, events, result: rows, metrics: { scanned: bindings.reduce((sum, table) => sum + table.length, 0), matched: rows.length, returned: rows.length, rejected: 0, strategy: hasJoin ? 'Complex SQL / join pipeline' : 'Complex SQL pipeline' }, explanation: `Đây là execution model giáo dục cho query phức tạp. Thời gian ${elapsedMs} ms là thời gian chạy trong browser, không phải benchmark database production.` }
  return { rows, elapsedMs, plan }
}
