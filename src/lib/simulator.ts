import type { Dialect, EventKind, QueryPlan, RowData, SimEvent } from './types'

const idOf = (row: RowData, index: number) => String(row.id ?? index)
const value = (row: RowData, field: string) => row[field]

function nodesFor(dialect: Dialect, hasFilter: boolean, hasProject: boolean, hasSort: boolean, hasLimit: boolean, indexed: boolean) {
  const scan = dialect === 'sql' ? 'Table scan' : 'Collection scan'
  const nodes = [{ id: 'source', label: indexed ? 'Index lookup' : scan, caption: indexed ? 'Tìm các entry phù hợp' : 'Đọc lần lượt từng item', tone: indexed ? 'violet' : 'blue' }]
  if (hasFilter) nodes.push({ id: 'filter', label: dialect === 'sql' ? 'WHERE filter' : 'Match predicate', caption: 'Kiểm tra điều kiện', tone: 'amber' })
  if (hasProject) nodes.push({ id: 'project', label: dialect === 'sql' ? 'Projection' : 'Projection', caption: 'Chọn field cần trả về', tone: 'mint' })
  if (hasSort) nodes.push({ id: 'sort', label: 'Sort', caption: 'Sắp xếp kết quả', tone: 'pink' })
  if (hasLimit) nodes.push({ id: 'limit', label: 'Limit', caption: 'Cắt số lượng output', tone: 'orange' })
  nodes.push({ id: 'result', label: 'Result', caption: 'Trả về client', tone: 'green' })
  return nodes
}

function event(kind: EventKind, node: string, title: string, detail: string, activeIds: string[], extra: Partial<SimEvent> = {}): SimEvent {
  return { id: `${kind}-${activeIds.join('-')}-${Math.random()}`, kind, node, title, detail, activeIds, duration: 700, ...extra }
}

function parseSql(query: string) {
  const normalized = query.trim().replace(/;$/, '')
  const match = normalized.match(/^select\s+(.+?)\s+from\s+([\w]+)(.*)$/i)
  if (!match) throw new Error('SQL MVP cần có dạng SELECT ... FROM users')
  const [, selectPart, collection, tail] = match
  const whereMatch = tail.match(/\bwhere\s+([\w]+)\s*(=|!=|>=|<=|>|<)\s*['"]?([^\s'";]+)['"]?/i)
  const orderMatch = tail.match(/\border\s+by\s+(\w+)\s*(asc|desc)?/i)
  const limitMatch = tail.match(/\blimit\s+(\d+)/i)
  const projection = selectPart.trim() === '*' ? null : selectPart.split(',').map((s) => s.trim()).filter(Boolean)
  const condition = whereMatch ? { field: whereMatch[1], op: whereMatch[2], raw: whereMatch[3] } : null
  return { collection, projection, condition, order: orderMatch ? { field: orderMatch[1], direction: (orderMatch[2] ?? 'asc').toLowerCase() } : null, limit: limitMatch ? Number(limitMatch[1]) : null }
}

function parseNoSql(query: string) {
  const match = query.match(/find\s*\(\s*(\{[\s\S]*?\})(?:\s*,\s*(\{[\s\S]*?\}))?\s*\)/i)
  if (!match) throw new Error('NoSQL MVP cần có dạng db.users.find({ ... })')
  let filter: Record<string, unknown>
  let projection: Record<string, number> | null = null
  try { filter = JSON.parse(match[1].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')) } catch { throw new Error('Filter NoSQL cần là object đơn giản, ví dụ { age: { $gt: 18 } }') }
  if (match[2]) { try { projection = JSON.parse(match[2].replace(/(\w+)\s*:/g, '"$1":').replace(/'/g, '"')) } catch { throw new Error('Projection NoSQL không hợp lệ') } }
  const sortMatch = query.match(/\.sort\s*\(\s*\{\s*(\w+)\s*:\s*(-?1)\s*\}\s*\)/i)
  const limitMatch = query.match(/\.limit\s*\(\s*(\d+)\s*\)/i)
  return { filter, projection, sort: sortMatch ? { field: sortMatch[1], direction: Number(sortMatch[2]) < 0 ? 'desc' : 'asc' } : null, limit: limitMatch ? Number(limitMatch[1]) : null }
}

function compare(actual: unknown, op: string, expectedRaw: string | number) {
  const expected = typeof expectedRaw === 'number' ? expectedRaw : Number.isNaN(Number(expectedRaw)) ? expectedRaw : Number(expectedRaw)
  if (op === '=') return actual === expected || String(actual) === String(expected)
  if (op === '!=') return actual !== expected && String(actual) !== String(expected)
  if (op === '>') return Number(actual) > Number(expected)
  if (op === '<') return Number(actual) < Number(expected)
  if (op === '>=') return Number(actual) >= Number(expected)
  if (op === '<=') return Number(actual) <= Number(expected)
  return false
}

function matches(row: RowData, filter: Record<string, unknown>): boolean {
  const entries = Object.entries(filter)
  return entries.every(([field, expected]) => {
    if (field === '$and' && Array.isArray(expected)) return expected.every((item) => matches(row, item as Record<string, unknown>))
    if (field === '$or' && Array.isArray(expected)) return expected.some((item) => matches(row, item as Record<string, unknown>))
    if (expected && typeof expected === 'object') return Object.entries(expected as Record<string, unknown>).every(([op, val]) => compare(value(row, field), op.replace('$', ''), val as string | number))
    return compare(value(row, field), '=', expected as string | number)
  })
}

function project(row: RowData, fields: string[] | null, projection: Record<string, number> | null): RowData {
  if (fields) return Object.fromEntries(fields.map((field) => [field, row[field]]))
  if (projection) return Object.fromEntries(Object.entries(projection).filter(([, include]) => include).map(([field]) => [field, row[field]]))
  return row
}

export function simulate(dialect: Dialect, query: string, dataset: RowData[]): QueryPlan {
  const parsed: any = dialect === 'sql' ? parseSql(query) : parseNoSql(query)
  const collection = dialect === 'sql' ? parsed.collection : 'users'
  const condition = dialect === 'sql' ? parsed.condition : Object.keys(parsed.filter).length ? parsed.filter : null
  const hasFilter = Boolean(condition)
  const hasProject = dialect === 'sql' ? Boolean(parsed.projection) : Boolean(parsed.projection)
  const hasSort = dialect === 'sql' ? Boolean(parsed.order) : Boolean(parsed.sort)
  const hasLimit = Boolean(parsed.limit)
  const indexed = Boolean(condition && ((dialect === 'sql' && parsed.condition?.field === 'city') || (dialect === 'nosql' && Object.keys(parsed.filter).includes('active'))))
  const nodes = nodesFor(dialect, hasFilter, hasProject, hasSort, hasLimit, indexed)
  const events: SimEvent[] = []
  const sourceRows = indexed ? dataset.filter((row) => matches(row, dialect === 'sql' ? { [parsed.condition!.field]: parsed.condition!.raw } : parsed.filter)) : dataset
  const scanned = sourceRows.length
  const matchedRows = sourceRows.filter((row) => dialect === 'sql' ? (!parsed.condition || compare(row[parsed.condition.field], parsed.condition.op, parsed.condition.raw)) : (!Object.keys(parsed.filter).length || matches(row, parsed.filter)))
  const matchedIds = matchedRows.map(idOf)
  const rejectedIds = sourceRows.filter((row, index) => !matchedIds.includes(idOf(row, index))).map((row, index) => idOf(row, index))
  events.push(event('scan', 'source', indexed ? 'Lookup index' : dialect === 'sql' ? 'Scan table' : 'Scan collection', indexed ? `Index giúp thu hẹp tập ứng viên còn ${scanned} item.` : `Đã đọc ${scanned} ${dialect === 'sql' ? 'row' : 'document'} từ nguồn dữ liệu.`, sourceRows.map(idOf)))
  if (hasFilter) events.push(event('filter', 'filter', 'Evaluate condition', `Giữ ${matchedRows.length}, loại ${rejectedIds.length} item không đạt predicate.`, matchedIds, { passedIds: matchedIds, rejectedIds }))
  let result = matchedRows.map((row) => project(row, dialect === 'sql' ? parsed.projection : null, dialect === 'nosql' ? parsed.projection : null))
  if (hasProject) events.push(event('project', 'project', 'Project fields', 'Chỉ truyền các field mà query yêu cầu về bước sau.', result.map(idOf)))
  if (hasSort) {
    const sort = dialect === 'sql' ? parsed.order! : parsed.sort!
    result = [...result].sort((a, b) => String(a[sort.field]).localeCompare(String(b[sort.field]), undefined, { numeric: true }) * (sort.direction === 'desc' ? -1 : 1))
    events.push(event('sort', 'sort', 'Sort results', `Sắp xếp theo ${sort.field} (${sort.direction}).`, result.map(idOf)))
  }
  if (hasLimit) { result = result.slice(0, parsed.limit!); events.push(event('limit', 'limit', 'Apply limit', `Giữ lại tối đa ${parsed.limit} item.`, result.map(idOf))) }
  events.push(event('result', 'result', 'Return result', `Hoàn tất: trả ${result.length} item cho client.`, result.map(idOf)))
  return { dialect, query, collection, nodes, events, result, metrics: { scanned, matched: matchedRows.length, returned: result.length, rejected: scanned - matchedRows.length, strategy: indexed ? 'Index-assisted lookup' : dialect === 'sql' ? 'Sequential table scan' : 'Sequential collection scan' }, explanation: hasFilter ? `Query có điều kiện nên mỗi item phải đi qua bước ${dialect === 'sql' ? 'WHERE' : 'match'}.` : 'Query không có điều kiện: database không thể bỏ qua item nào và phải duyệt toàn bộ nguồn.' }
}
