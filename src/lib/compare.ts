import type { Dialect, QueryPlan, RowData } from './types'
import type { UserTable } from './dataset'
import { simulate } from './simulator'
import { runComplexSql } from './complexSql'

export type ComparisonResult = { query: string; plan: QueryPlan; elapsedMs: number }

const isComplex = (query: string) => /\b(join|group\s+by|count\s*\(|sum\s*\(|avg\s*\(|having|union)\b/i.test(query)

export function runForComparison(query: string, dialect: Dialect, rows: RowData[], tables: UserTable[]): ComparisonResult {
  const started = performance.now()
  const plan = dialect === 'sql' && isComplex(query) ? runComplexSql(query, tables).plan : simulate(dialect, query, rows)
  return { query, plan, elapsedMs: Number((performance.now() - started).toFixed(2)) }
}
