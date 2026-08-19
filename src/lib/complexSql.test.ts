import { describe, expect, it } from 'vitest'
import { runComplexSql } from './complexSql'
import { runForComparison } from './compare'
import type { UserTable } from './dataset'

const tables: UserTable[] = [
  { name: 'orders', source: 'orders.csv', columns: ['id', 'user_id', 'amount'], rows: [{ id: 1, user_id: 10, amount: 20 }, { id: 2, user_id: 11, amount: 35 }] },
  { name: 'users', source: 'users.csv', columns: ['id', 'name'], rows: [{ id: 10, name: 'An' }, { id: 11, name: 'Bình' }] },
]

describe('complex SQL adapter', () => {
  it('runs a JOIN over two in-memory tables', () => {
    const result = runComplexSql('SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id;', tables)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toMatchObject({ name: 'An', amount: 20 })
    expect(result.plan.metrics.strategy).toBe('Complex SQL / join pipeline')
  })

  it('runs GROUP BY aggregation', () => {
    const result = runComplexSql('SELECT user_id, SUM(amount) AS total_amount FROM orders GROUP BY user_id;', tables)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toHaveProperty('total_amount')
  })

  it('returns comparable metrics for two queries', () => {
    const a = runForComparison('SELECT * FROM orders;', 'sql', tables[0].rows, tables)
    const b = runForComparison('SELECT o.amount, u.name FROM orders o JOIN users u ON o.user_id = u.id;', 'sql', tables[0].rows, tables)
    expect(a.plan).toBeDefined()
    expect(b.plan.metrics.strategy).toContain('Complex SQL')
    expect(a.elapsedMs).toBeGreaterThanOrEqual(0)
    expect(b.elapsedMs).toBeGreaterThanOrEqual(0)
  })
})
