import type { Dialect, QueryPlan, RowData } from './types'
import type { UserTable } from './dataset'
import { simulate } from './simulator'
import { runComplexSql } from './complexSql'
import { runDuckDbPlan } from './duckdbPlanner'

export type ComparisonResult = { query: string; plan: QueryPlan; elapsedMs: number }

const isComplex = (query: string) => /(\bjoin\b|\bgroup\s+by\b|\b(count|sum|avg|min|max)\s*\(|\bhaving\b|\bunion\b)/i.test(query)

export async function runForComparisonAsync(query: string, dialect: Dialect, rows: RowData[], tables: UserTable[]): Promise<ComparisonResult> {
  const started = performance.now()
  const plan = dialect === 'sql' && isComplex(query) ? await runDuckDbPlan(query, tables) : simulate(dialect, query, rows)
  return { query, plan, elapsedMs: Number((performance.now() - started).toFixed(2)) }
}

export function runForComparison(query: string, dialect: Dialect, rows: RowData[], tables: UserTable[]): ComparisonResult {
  const started = performance.now()
  const plan = dialect === 'sql' && isComplex(query) ? runComplexSql(query, tables).plan : simulate(dialect, query, rows)
  return { query, plan, elapsedMs: Number((performance.now() - started).toFixed(2)) }
}
