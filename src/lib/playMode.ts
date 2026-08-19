import type { QueryPlan, RowData } from './types'

export type PlayAction = 'result' | 'filter'
export type PlayFeedback = { tone: 'success' | 'error' | 'info'; text: string } | null

export type PlayState = {
  cursor: number
  score: number
  resultIds: string[]
  filteredIds: string[]
  mistakes: number
  feedback: PlayFeedback
  complete: boolean
}

export function isPlaySupported(plan: QueryPlan) {
  if (plan.dialect !== 'sql') return false
  const kinds = plan.events.map((event) => event.kind)
  return kinds.every((kind) => kind === 'scan' || kind === 'filter' || kind === 'result') && kinds.includes('scan') && kinds.includes('result')
}

export function createPlayState(): PlayState {
  return { cursor: 0, score: 0, resultIds: [], filteredIds: [], mistakes: 0, feedback: null, complete: false }
}

export function expectedAction(plan: QueryPlan, row: RowData, index: number): PlayAction {
  const filterEvent = plan.events.find((event) => event.kind === 'filter')
  const id = String(row.id ?? index)
  return filterEvent?.passedIds?.includes(id) === false ? 'filter' : 'result'
}

export function takePlayAction(plan: QueryPlan, state: PlayState, rows: RowData[], action: PlayAction): PlayState {
  if (state.complete || !rows[state.cursor]) return state
  const row = rows[state.cursor]
  const id = String(row.id ?? state.cursor)
  const expected = expectedAction(plan, row, state.cursor)
  if (action !== expected) {
    return { ...state, score: Math.max(0, state.score - 10), mistakes: state.mistakes + 1, feedback: { tone: 'error', text: expected === 'filter' ? `Chưa đúng. age = ${String(row.age)} không thỏa điều kiện WHERE.` : 'Row này đạt điều kiện, hãy đưa nó sang bảng kết quả.' } }
  }
  const nextCursor = state.cursor + 1
  const complete = nextCursor >= rows.length
  const isFilter = action === 'filter'
  return { ...state, cursor: nextCursor, score: state.score + (isFilter ? 15 : 10), resultIds: isFilter ? state.resultIds : [...state.resultIds, id], filteredIds: isFilter ? [...state.filteredIds, id] : state.filteredIds, feedback: { tone: 'success', text: isFilter ? 'Đúng rồi — row bị WHERE loại ra.' : 'Chính xác — row đi vào result table.' }, complete }
}
