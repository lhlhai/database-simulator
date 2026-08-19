export type Dialect = 'sql' | 'nosql'
export type RowData = Record<string, string | number | boolean | null>
export type EventKind = 'scan' | 'filter' | 'project' | 'sort' | 'limit' | 'result'

export type SimEvent = {
  id: string
  kind: EventKind
  node: string
  title: string
  detail: string
  activeIds: string[]
  passedIds?: string[]
  rejectedIds?: string[]
  duration: number
}

export type QueryPlan = {
  dialect: Dialect
  query: string
  collection: string
  nodes: { id: string; label: string; caption: string; tone: string }[]
  events: SimEvent[]
  result: RowData[]
  metrics: { scanned: number; matched: number; returned: number; rejected: number; strategy: string }
  explanation: string
  physicalPlan?: string
}

export type LessonMode = 'row-play' | 'pipeline-play' | 'watch'
export type LessonCategory = 'foundations' | 'filtering' | 'shaping' | 'joins' | 'analytics' | 'nosql'

export type Preset = {
  id: string
  dialect: Dialect
  label: string
  query: string
  description: string
  category?: LessonCategory
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  mode?: LessonMode
  goal?: string
}
