import * as duckdb from '@duckdb/duckdb-wasm'
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import type { UserTable } from './dataset'
import type { QueryPlan, RowData, SimEvent } from './types'

let databasePromise: Promise<duckdb.AsyncDuckDB> | null = null

async function getDatabase() {
  if (!databasePromise) databasePromise = (async () => {
    const worker = new Worker(duckdbWorker)
    const database = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker)
    await database.instantiate(duckdbWasm)
    return database
  })()
  return databasePromise
}

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`
const quoteLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`
const operatorLabel = (operator: string) => operator.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter: string) => letter.toUpperCase())

function physicalOperators(text: string) {
  const operators = text.match(/(?:SEQ_SCAN|TABLE_SCAN|COLUMN_DATA_SCAN|HASH_JOIN|PIECEWISE_MERGE_JOIN|NESTED_LOOP_JOIN|DELIM_JOIN|CROSS_PRODUCT|PROJECTION|FILTER|ORDER_BY|TOP_N|STREAMING_LIMIT|HASH_GROUP_BY|PERFECT_HASH_GROUP_BY|UNGROUPED_AGGREGATE|WINDOW|UNION|CTE_SCAN|EMPTY_RESULT)/g) ?? []
  return [...new Set(operators)]
}

function planFromExplain(query: string, explainText: string, result: RowData[], scanned: number): QueryPlan {
  const operators = physicalOperators(explainText)
  const visible = operators.length ? operators : ['SEQ_SCAN', 'PROJECTION']
  const nodes = visible.map((operator, index) => ({ id: `physical-${index}`, label: operatorLabel(operator), caption: 'DuckDB physical operator', tone: operator.includes('JOIN') ? 'violet' : operator.includes('SCAN') ? 'blue' : operator.includes('AGGREGATE') || operator.includes('GROUP') ? 'amber' : 'green' }))
  const events: SimEvent[] = visible.map((operator, index) => {
    const isJoin = operator.includes('JOIN')
    const details = isJoin ? `Physical plan chọn ${operatorLabel(operator)}. Xem join condition và thứ tự hai child trong plan.` : `DuckDB thực thi ${operatorLabel(operator)} theo physical plan.`
    return { id: `physical-event-${index}`, kind: index === visible.length - 1 ? 'result' : operator.includes('SCAN') ? 'scan' : operator.includes('FILTER') ? 'filter' : operator.includes('PROJECTION') ? 'project' : operator.includes('ORDER') || operator.includes('TOP_N') ? 'sort' : operator.includes('LIMIT') ? 'limit' : 'result', node: `physical-${index}`, title: operatorLabel(operator), detail: details, activeIds: [], duration: 700 }
  })
  return { dialect: 'sql', query, collection: 'DuckDB physical plan', nodes, events, result, metrics: { scanned, matched: result.length, returned: result.length, rejected: Math.max(0, scanned - result.length), strategy: 'DuckDB physical EXPLAIN plan' }, explanation: `Physical plan lấy trực tiếp từ DuckDB EXPLAIN. Join order/operator không được tự suy đoán; mở plan để xem ${visible.length} operator thực tế.`, physicalPlan: explainText }
}

export async function runDuckDbPlan(query: string, tables: UserTable[]): Promise<QueryPlan> {
  const database = await getDatabase()
  const connection = await database.connect()
  try {
    for (const table of tables) {
      const fileName = `${table.name}.json`
      await database.registerFileText(fileName, JSON.stringify(table.rows))
      await connection.query(`CREATE OR REPLACE TABLE ${quoteIdentifier(table.name)} AS SELECT * FROM read_json_auto(${quoteLiteral(fileName)})`)
    }
    const explain = await connection.query(`EXPLAIN ${query.replace(/;\s*$/, '')}`)
    const explainRows = explain.toArray().map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)]))) as RowData[]
    const explainText = String(explainRows[0]?.explain_value ?? explainRows[0]?.physical_plan ?? '')
    const resultTable = await connection.query(query)
    const result = resultTable.toArray().map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))) as RowData[]
    const scanned = tables.reduce((total, table) => total + table.rows.length, 0)
    return planFromExplain(query, explainText, result, scanned)
  } finally { await connection.close() }
}
