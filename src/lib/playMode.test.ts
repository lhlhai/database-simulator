import { describe, expect, it } from 'vitest'
import { users } from '../data/datasets'
import { simulate } from './simulator'
import { createPlayState, isPlaySupported, takePlayAction } from './playMode'

describe('play mode', () => {
  it('lets a sequential scan route every row to result', () => {
    const plan = simulate('sql', 'SELECT * FROM users;', users)
    expect(isPlaySupported(plan)).toBe(true)
    let state = createPlayState()
    for (let i = 0; i < users.length; i += 1) state = takePlayAction(plan, state, users, 'result')
    expect(state.complete).toBe(true)
    expect(state.resultIds).toHaveLength(6)
    expect(state.score).toBe(60)
  })

  it('routes WHERE failures to the filtered tray', () => {
    const plan = simulate('sql', 'SELECT * FROM users WHERE age > 18;', users)
    let state = createPlayState()
    state = takePlayAction(plan, state, users, 'result')
    expect(state.mistakes).toBe(1)
    state = takePlayAction(plan, state, users, 'filter')
    expect(state.filteredIds).toContain('101')
    expect(state.resultIds).toHaveLength(0)
  })

  it('accepts the correct WHERE action for the underage row', () => {
    const plan = simulate('sql', 'SELECT * FROM users WHERE age > 18;', users)
    let state = createPlayState()
    state = takePlayAction(plan, state, users, 'filter')
    for (let i = 0; i < 5; i += 1) state = takePlayAction(plan, state, users, 'result')
    expect(state.complete).toBe(true)
    expect(state.filteredIds).toEqual(['101'])
    expect(state.resultIds).toHaveLength(5)
  })
})
