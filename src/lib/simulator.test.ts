import { describe, expect, it } from 'vitest'
import { users } from '../data/datasets'
import { simulate } from './simulator'

describe('database execution simulator', () => {
  it('explains a SQL query without WHERE as a full scan', () => {
    const plan = simulate('sql', 'SELECT * FROM users;', users)
    expect(plan.metrics.scanned).toBe(6)
    expect(plan.metrics.matched).toBe(6)
    expect(plan.metrics.rejected).toBe(0)
    expect(plan.metrics.strategy).toBe('Sequential table scan')
    expect(plan.events.map((event) => event.kind)).toEqual(['scan', 'result'])
  })

  it('filters SQL rows and exposes rejected ids', () => {
    const plan = simulate('sql', 'SELECT * FROM users WHERE age > 18;', users)
    expect(plan.metrics.matched).toBe(5)
    expect(plan.metrics.rejected).toBe(1)
    expect(plan.events.find((event) => event.kind === 'filter')?.rejectedIds).toContain('101')
  })

  it('uses the educational index strategy for city lookup', () => {
    const plan = simulate('sql', "SELECT name FROM users WHERE city = 'Hanoi';", users)
    expect(plan.metrics.strategy).toBe('Index-assisted lookup')
    expect(plan.result).toHaveLength(2)
  })

  it('evaluates MongoDB-like operators and projection', () => {
    const plan = simulate('nosql', 'db.users.find({ age: { $gt: 18 } })', users)
    expect(plan.metrics.matched).toBe(5)
    expect(plan.result[0]).toHaveProperty('name')
  })

  it('returns an actionable error for unsupported syntax', () => {
    expect(() => simulate('sql', 'DELETE FROM users;', users)).toThrow('SQL MVP')
  })
})
