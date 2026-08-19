import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Database, ChevronRight, CircleHelp, Zap, Copy, Check, Pickaxe, Gem, Trophy, ArrowDown, ShieldCheck, X } from 'lucide-react'
import { builtInTables, presets, users } from './data/datasets'
import { simulate } from './lib/simulator'
import type { Dialect, QueryPlan, RowData } from './lib/types'
import { createPlayState, expectedAction, isPlaySupported, isRowPlaySupported, takePlayAction, type PlayAction, type PlayState } from './lib/playMode'
import { DATASET_LIMITS, parseDatasetFiles, type UserTable } from './lib/dataset'
import { runForComparisonAsync, type ComparisonResult } from './lib/compare'
import { runDuckDbPlan } from './lib/duckdbPlanner'
import './styles.css'

const initial = presets[0]

function App() {
  const [dialect, setDialect] = useState<Dialect>(initial.dialect)
  const [query, setQuery] = useState(initial.query)
  const [plan, setPlan] = useState<QueryPlan>(() => simulate(initial.dialect, initial.query, users))
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(false)
  const [viewMode, setViewMode] = useState<'watch' | 'play'>('play')
  const [playState, setPlayState] = useState<PlayState>(() => createPlayState())
  const [tables, setTables] = useState<UserTable[]>(builtInTables)
  const [datasetMessage, setDatasetMessage] = useState('Using built-in users, orders and products tables')
  const [compareOpen, setCompareOpen] = useState(false)
  const [lessonCategory, setLessonCategory] = useState<'all' | 'foundations' | 'filtering' | 'shaping' | 'joins' | 'analytics' | 'nosql'>('all')
  const [compareA, setCompareA] = useState('SELECT * FROM users WHERE age > 18;')
  const [compareB, setCompareB] = useState('SELECT name, age FROM users WHERE age > 18;')
  const [comparison, setComparison] = useState<[ComparisonResult, ComparisonResult] | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const datasetRows = tables[0]?.rows ?? users

  const current = plan.events[Math.max(step, 0)]
  const visibleRows = useMemo<Array<RowData & { __state?: string }>>(() => {
    const active = current?.activeIds
    if (!active) return datasetRows
    return datasetRows.map((row, index) => ({ ...row, __state: active.includes(String(row.id ?? index)) ? 'active' : 'muted' }))
  }, [current, datasetRows])

  const run = async (nextDialect = dialect, nextQuery = query) => {
    try {
      setError(''); setPlaying(false); setPlayState(createPlayState()); setStep(-1); setSelectedNode(null)
      if (nextDialect === 'sql' && /(\bjoin\b|\bgroup\s+by\b|\b(count|sum|avg|min|max)\s*\(|\bhaving\b|\bunion\b)/i.test(nextQuery)) {
        const complex = await runDuckDbPlan(nextQuery, tables)
        setPlan(complex)
      } else setPlan(simulate(nextDialect, nextQuery, datasetRows))
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể mô phỏng query này.') }
  }
  const compareQueries = async () => {
    try { setError(''); setComparison(await Promise.all([runForComparisonAsync(compareA, dialect, datasetRows, tables), runForComparisonAsync(compareB, dialect, datasetRows, tables)]) as [ComparisonResult, ComparisonResult]) }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể chạy comparison.') }
  }
  const handleUpload = async (files: FileList | null) => {
    if (!files) return
    try {
      const loaded = await parseDatasetFiles(files)
      setTables(loaded)
      setDatasetMessage(`${loaded.length} uploaded table${loaded.length > 1 ? 's' : ''}: ${loaded.map((table) => `${table.name} (${table.rows.length} rows)`).join(', ')}`)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đọc dataset.'); setDatasetMessage('Upload failed') }
  }
  const chooseDialect = (next: Dialect) => {
    const nextPreset = presets.find((item) => item.dialect === next)!
    setDialect(next); setLessonCategory('all'); setQuery(nextPreset.query); setViewMode(nextPreset.mode === 'watch' ? 'watch' : 'play'); run(next, nextPreset.query)
  }
  const choosePreset = (id: string) => {
    const preset = presets.find((item) => item.id === id)!
    setDialect(preset.dialect); setQuery(preset.query); setViewMode(preset.mode === 'watch' ? 'watch' : 'play'); run(preset.dialect, preset.query)
  }
  const advance = () => setStep((value) => value >= plan.events.length - 1 ? 0 : value + 1)
  const playAction = (action: PlayAction) => setPlayState((state) => takePlayAction(plan, state, datasetRows, action))
  const isDone = step >= plan.events.length - 1
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setStep((value) => {
        if (value >= plan.events.length - 1) { setPlaying(false); return value }
        return value + 1
      })
    }, 1100 / speed)
    return () => window.clearInterval(timer)
  }, [playing, plan.events.length, speed])

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Database size={18} /></span><span>database<span className="brand-accent">/</span>simulator</span></div>
      <div className="topbar-note"><span className="live-dot" /> Client-side educational model</div>
    </header>
    <main className="workspace">
      <section className="hero">
        <div><p className="eyebrow">QUERY EXPLAINED VISUALLY</p><h1>See the database think.</h1><p className="hero-copy">Viết một query. Bấm play. Nhìn từng row/document đi qua pipeline xử lý — từ scan đến kết quả.</p></div>
        <div className="hero-stat"><span className="stat-label">CURRENT STRATEGY</span><strong>{plan.metrics.strategy}</strong><span>Educational simulation · not a vendor optimizer</span></div>
      </section>

      <section className="dataset-bar"><div><span className="section-kicker">DATASET</span><strong>{datasetMessage}</strong><small>CSV/TXT · tối đa {DATASET_LIMITS.maxFiles} files · {DATASET_LIMITS.maxRows} rows/table · {DATASET_LIMITS.maxColumns} columns</small></div><div className="dataset-actions"><button onClick={() => fileInput.current?.click()}><Database size={14} /> Upload table(s)</button><button className="compare-trigger" onClick={() => setCompareOpen((value) => !value)}><Zap size={14} /> Compare 2 queries</button></div><input ref={fileInput} type="file" accept=".csv,.txt,.tsv,text/csv,text/plain" multiple hidden onChange={(event) => { void handleUpload(event.target.files); event.currentTarget.value = '' }} /></section>
      {compareOpen && <ComparePanel dialect={dialect} rows={datasetRows} queryA={compareA} queryB={compareB} setQueryA={setCompareA} setQueryB={setCompareB} comparison={comparison} onRun={compareQueries} />}
      <div className="mode-switch" role="tablist" aria-label="Database dialect">
        <button className={dialect === 'sql' ? 'mode active sql' : 'mode'} onClick={() => chooseDialect('sql')}><span className="mode-icon">SQL</span><span><strong>Relational</strong><small>Tables · rows · predicates</small></span></button>
        <button className={dialect === 'nosql' ? 'mode active nosql' : 'mode'} onClick={() => chooseDialect('nosql')}><span className="mode-icon">{`{ }`}</span><span><strong>Document</strong><small>Collections · documents · match</small></span></button>
      </div>

      <section className="control-grid">
        <div className="panel editor-panel"><div className="panel-heading"><div><span className="section-kicker">01 / QUERY INPUT</span><h2>Tell the database what to do</h2></div><span className="dialect-chip">{dialect === 'sql' ? 'SQL' : 'MONGODB-LIKE'}</span></div>
          <div className="query-input-wrap"><textarea aria-label="Query editor" value={query} onChange={(e) => setQuery(e.target.value)} spellCheck={false} /><CopyButton text={query} label="Copy query" /></div>
          <div className="editor-footer"><span><CircleHelp size={14} /> Query Studio · safe parser + physical EXPLAIN</span><div className="editor-actions"><button className="tool-button" onClick={() => setQuery(query.trim().replace(/\s+/g, ' '))}>Format</button><button className="tool-button" onClick={() => { setViewMode('watch'); setStep(-1); setSelectedNode(plan.nodes[0]?.id ?? null) }}>Explain</button><button className="run-button" onClick={() => run()}><Zap size={15} /> Run & animate <ChevronRight size={15} /></button></div></div>
          {error && <div className="error-box">{error}</div>}
        </div>
        <div className="panel presets-panel"><div className="panel-heading"><div><span className="section-kicker">LESSONS · {presets.filter((item) => item.dialect === dialect).length} paths</span><h2>Choose your next mission</h2></div></div><div className="lesson-categories">{[['all','All'],['foundations','Foundations'],['filtering','Filtering'],['shaping','Shaping'],['joins','Joins'],['analytics','Analytics'],['nosql','NoSQL']].map(([value, label]) => <button key={value} className={lessonCategory === value ? 'active' : ''} onClick={() => setLessonCategory(value as typeof lessonCategory)}>{label}</button>)}</div><div className="preset-list">{presets.filter((item) => item.dialect === dialect && (lessonCategory === 'all' || item.category === lessonCategory)).map((item) => <button key={item.id} className={`preset ${query === item.query ? 'selected' : ''}`} onClick={() => choosePreset(item.id)}><span className="preset-dot" /><span><strong>{item.label}</strong><small>{item.description}</small><em className={`lesson-meta ${item.difficulty ?? 'beginner'}`}>{item.difficulty ?? 'beginner'} · {item.mode === 'row-play' ? 'Gold Mine' : item.mode === 'pipeline-play' ? 'Pipeline Play' : 'Watch'}</em></span><ChevronRight size={15} /></button>)}</div></div>
      </section>

      <section className="panel simulation-panel"><div className="panel-heading simulation-heading"><div><span className="section-kicker">02 / EXECUTION TIMELINE</span><h2>{viewMode === 'play' ? 'Play the query' : 'Follow the data'}</h2></div><div className="view-switch"><button className={viewMode === 'watch' ? 'selected' : ''} onClick={() => setViewMode('watch')}>Watch</button><button className={viewMode === 'play' ? 'selected' : ''} disabled={!isPlaySupported(plan)} onClick={() => { setViewMode('play'); setPlaying(false); setPlayState(createPlayState()) }}>Play mode</button>{viewMode === 'watch' && <div className="playback"><button aria-label="Reset" onClick={() => { setPlaying(false); setStep(-1) }}><RotateCcw size={15} /></button><button className="play-main" aria-label={playing ? 'Pause animation' : isDone ? 'Replay animation' : 'Play animation'} onClick={() => { if (isDone) setStep(-1); setPlaying((value) => !value) }}>{playing ? <Pause size={16} /> : isDone ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}</button><button aria-label="Step forward" onClick={() => { setPlaying(false); advance() }}><SkipForward size={15} /></button><label>Speed <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div>}</div></div>
          <div className="timeline">{plan.nodes.map((node, index) => <div className={`timeline-node ${current?.node === node.id ? 'current' : ''} ${index <= plan.events.findIndex((event) => event.node === node.id) && step >= 0 ? 'visited' : ''}`} key={node.id}><div className={`node-circle ${node.tone}`}>{String(index + 1).padStart(2, '0')}</div><span>{node.label}</span>{index < plan.nodes.length - 1 && <div className="connector" />}</div>)}</div>
          <div className="event-strip"><div className="event-label"><span className="event-pulse" />{step < 0 ? 'Ready to simulate' : current.title}</div><div className="event-detail">{step < 0 ? 'Bấm play để tiến qua từng bước xử lý.' : current.detail}</div><div className="step-count">{step < 0 ? '0' : step + 1} <span>/ {plan.events.length}</span></div></div>
          <PlanInspector plan={plan} selectedNode={selectedNode} onSelect={setSelectedNode} />
          {viewMode === 'play' && isPlaySupported(plan) ? <PlayBoard state={playState} rows={datasetRows} plan={plan} onAction={playAction} onReset={() => setPlayState(createPlayState())} /> : <div className="data-view"><div className="data-caption"><span>{dialect === 'sql' ? `${tables[0]?.name ?? 'users'} table` : `${tables[0]?.name ?? 'users'} collection`}</span><span>{current ? `highlighting ${current.activeIds.length} items` : 'waiting for execution'}</span></div><div className="row-grid">{visibleRows.map((row, index) => <div key={String(row.id)} className={`data-card ${row.__state ?? ''} ${current?.rejectedIds?.includes(String(row.id ?? index)) ? 'rejected' : ''}`} style={{ '--delay': `${index * 45}ms`, '--speed': `${1 / speed}s` } as CSSProperties}><div className="card-top"><span className="row-id">{dialect === 'sql' ? 'ROW' : 'DOC'} {String(row.id).padStart(3, '0')}</span><span className="row-dot" /></div><strong>{String(row.name)}</strong><div className="card-fields"><span>age <b>{String(row.age)}</b></span><span>{String(row.city)}</span></div>{current?.rejectedIds?.includes(String(row.id ?? index)) && <div className="rejected-label">filtered out</div>}</div>)}</div></div>}
      </section>

      <section className="bottom-grid"><div className="panel metrics-panel"><div className="panel-heading"><div><span className="section-kicker">03 / OBSERVATIONS</span><h2>What changed?</h2></div></div><div className="metrics"><Metric label="SCANNED" value={plan.metrics.scanned} tone="blue" /><Metric label="MATCHED" value={plan.metrics.matched} tone="amber" /><Metric label="REJECTED" value={plan.metrics.rejected} tone="pink" /><Metric label="RETURNED" value={plan.metrics.returned} tone="green" /></div><div className="explanation"><span className="explanation-mark">i</span><p>{plan.explanation}</p></div></div><div className="panel result-panel"><div className="panel-heading"><div><span className="section-kicker">RESULT PREVIEW</span><h2>Client receives</h2></div><span className="result-count">{plan.result.length} items</span></div><div className="result-list">{plan.result.slice(0, 4).map((row, index) => <div className="result-row" key={index}><span className="result-index">{String(index + 1).padStart(2, '0')}</span><span>{Object.entries(row).map(([key, val]) => <b key={key}>{key}: {String(val)} </b>)}</span></div>)}</div></div></section>
      <footer><span>Database Simulator · built for learning, not benchmarking</span><span>Press <kbd>Step</kbd> to slow down the invisible.</span></footer>
    </main>
  </div>
}

function PlanInspector({ plan, selectedNode, onSelect }: { plan: QueryPlan; selectedNode: string | null; onSelect: (node: string) => void }) {
  const activeId = selectedNode ?? plan.nodes[0]?.id
  const activeNode = plan.nodes.find((node) => node.id === activeId) ?? plan.nodes[0]
  const activeEvent = plan.events.find((event) => event.node === activeNode?.id)
  const activeIndex = activeNode ? plan.nodes.findIndex((node) => node.id === activeNode.id) : -1
  return <div className="pro-inspector"><div className="inspector-topline"><div><span className="section-kicker">PHYSICAL PLAN INSPECTOR</span><strong>{plan.physicalPlan ? 'Engine-backed operator tree' : 'Logical execution model'}</strong></div><span className="plan-badge">{plan.nodes.length} operators</span></div><div className="inspector-grid"><div className="operator-tree">{plan.nodes.map((node, index) => { const event = plan.events.find((item) => item.node === node.id); const status = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending'; return <button key={node.id} className={`operator-node ${status} ${activeId === node.id ? 'selected' : ''}`} onClick={() => onSelect(node.id)}><span className={`operator-dot ${node.tone}`}>{String(index + 1).padStart(2, '0')}</span><span><strong>{node.label}</strong><small>{node.caption}</small></span><em>{status}</em></button> })}</div><div className="operator-detail"><div className="detail-heading"><span className={`operator-dot ${activeNode?.tone ?? 'blue'}`}>OP</span><div><span>SELECTED OPERATOR</span><strong>{activeNode?.label ?? 'Execution'}</strong></div></div><div className="detail-grid"><span>input rows <b>{activeEvent?.activeIds.length ?? plan.metrics.scanned}</b></span><span>output rows <b>{activeEvent?.passedIds?.length ?? plan.metrics.returned}</b></span><span>rejected <b>{activeEvent?.rejectedIds?.length ?? plan.metrics.rejected}</b></span><span>duration <b>{activeEvent?.duration ?? 0} ms</b></span></div><p>{activeEvent?.detail ?? plan.explanation}</p><div className="data-flow-summary"><span className="flow-relation">{plan.collection}</span><ChevronRight size={13} /><span className="flow-operator">{activeNode?.label ?? 'operator'}</span><ChevronRight size={13} /><span className="flow-relation">result</span></div></div></div>{plan.physicalPlan && <details className="raw-plan"><summary>View raw EXPLAIN physical plan</summary><pre>{plan.physicalPlan}</pre></details>}</div>
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }
  return <button className={`copy-button ${copied ? 'copied' : ''}`} type="button" aria-label={copied ? 'Copied' : label} title={copied ? 'Copied' : label} onClick={() => { void copy() }}>{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? 'Copied' : 'Copy'}</span></button>
}

function StagePlayBoard({ plan, autoEnabled = false }: { plan: QueryPlan; autoEnabled?: boolean }) {
  const [stage, setStage] = useState(-1)
  const [autoPlaying, setAutoPlaying] = useState(autoEnabled)
  useEffect(() => setAutoPlaying(autoEnabled), [autoEnabled])
  const done = stage >= plan.events.length - 1
  useEffect(() => { if (!autoPlaying || done) return; const timer = window.setInterval(() => setStage((value) => value >= plan.events.length - 1 ? value : value + 1), 900); return () => window.clearInterval(timer) }, [autoPlaying, done, plan.events.length])
  const current = stage >= 0 ? plan.events[stage] : undefined
  const operatorSignature = plan.nodes.map((node) => node.label).join(' → ')
  return <div className="stage-play-board"><div className="stage-play-copy"><span className="game-badge"><Zap size={13} /> PHYSICAL PLAN PLAY</span><h3>{plan.nodes[0]?.label ?? 'Execution'} → {plan.nodes[plan.nodes.length - 1]?.label ?? 'Result'}</h3><p>Query-specific plan: <code>{operatorSignature}</code></p><small className="stage-query">{plan.query}</small></div><div className="stage-track">{plan.events.map((item, index) => <div className={`stage-step ${index === stage ? 'current' : ''} ${index < stage ? 'visited' : ''}`} key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div></div>)}</div><div className="stage-controls"><button className="auto-game" onClick={() => setAutoPlaying((value) => !value)}>{autoPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />} {autoPlaying ? 'Pause auto' : 'Auto play'}</button><button className="reset-game" onClick={() => { setAutoPlaying(false); setStage(-1) }}><RotateCcw size={13} /> Reset stages</button><button className="stage-next" onClick={() => setStage((value) => value >= plan.events.length - 1 ? 0 : value + 1)}>{done ? 'Replay' : 'Next stage'} <SkipForward size={13} /></button></div>{current && <div className="stage-feedback"><span>ACTIVE STAGE</span><strong>{current.title}</strong><p>{current.detail}</p></div>}{plan.physicalPlan && <details className="physical-plan"><summary>Show raw DuckDB physical plan</summary><pre>{plan.physicalPlan}</pre></details>}{done && <div className="complete-banner"><span>Pipeline complete</span><strong>{plan.result.length} rows returned</strong><button onClick={() => { setAutoPlaying(false); setStage(-1) }}>Play again</button></div>}</div>
}

function ComparePanel({ dialect, rows, queryA, queryB, setQueryA, setQueryB, comparison, onRun }: { dialect: Dialect; rows: RowData[]; queryA: string; queryB: string; setQueryA: (value: string) => void; setQueryB: (value: string) => void; comparison: [ComparisonResult, ComparisonResult] | null; onRun: () => void }) {
  const [stateA, setStateA] = useState<PlayState>(() => createPlayState())
  const [stateB, setStateB] = useState<PlayState>(() => createPlayState())
  const [bothAuto, setBothAuto] = useState(false)
  useEffect(() => { setStateA(createPlayState()); setStateB(createPlayState()); setBothAuto(false) }, [comparison])
  return <section className="compare-panel panel"><div className="compare-head"><div><span className="section-kicker">04 / DUAL PLAY MODE</span><h2>Play both queries side by side</h2><p>Mỗi query có source table, action station, result table, score và autoplay riêng trên cùng dataset.</p></div><div className="compare-head-actions"><button className="run-button" onClick={onRun}><Zap size={14} /> Run both</button>{comparison && <button className="auto-both-button" onClick={() => setBothAuto((value) => !value)}>{bothAuto ? <Pause size={14} /> : <Play size={14} fill="currentColor" />} {bothAuto ? 'Pause both' : 'Auto play both'}</button>}</div></div><div className="compare-editors"><label><span>QUERY A</span><div className="query-input-wrap compare-input"><textarea value={queryA} onChange={(event) => setQueryA(event.target.value)} spellCheck={false} /><CopyButton text={queryA} label="Copy Query A" /></div></label><label><span>QUERY B</span><div className="query-input-wrap compare-input"><textarea value={queryB} onChange={(event) => setQueryB(event.target.value)} spellCheck={false} /><CopyButton text={queryB} label="Copy Query B" /></div></label></div>{comparison ? <><div className="dual-play-grid">{comparison.map((item, index) => <div className="dual-play-card" key={index}><div className="dual-play-heading"><span>QUERY {index === 0 ? 'A' : 'B'}</span><strong>{item.plan.metrics.strategy}</strong><b>{item.elapsedMs} ms</b></div>{isPlaySupported(item.plan) ? <PlayBoard state={index === 0 ? stateA : stateB} rows={rows} plan={item.plan} onAction={(action) => index === 0 ? setStateA((state) => takePlayAction(item.plan, state, rows, action)) : setStateB((state) => takePlayAction(item.plan, state, rows, action))} onReset={() => index === 0 ? setStateA(createPlayState()) : setStateB(createPlayState())} autoEnabled={bothAuto} /> : <div className="compare-empty">Query này có pipeline phức tạp nên chưa có luật Play mode riêng. Watch/explain metrics vẫn khả dụng.</div>}</div>)}</div><div className="compare-results">{comparison.map((item, index) => <div className="compare-card" key={index}><div className="compare-card-title"><span>QUERY {index === 0 ? 'A' : 'B'}</span><strong>{item.plan.metrics.strategy}</strong><b>{item.elapsedMs} ms</b></div><div className="compare-metrics"><span>scanned <b>{item.plan.metrics.scanned}</b></span><span>matched <b>{item.plan.metrics.matched}</b></span><span>returned <b>{item.plan.metrics.returned}</b></span></div><p>{item.plan.explanation}</p></div>)}</div></> : <div className="compare-empty">Chưa chạy comparison. Chọn hai query trên cùng dataset rồi bấm Run both.</div>}<small className="compare-disclaimer">Dialect: {dialect.toUpperCase()} · tốc độ phụ thuộc kích thước dataset, browser và thời điểm chạy; không phải benchmark production.</small></section>
}

function MinePlayBoard({ state, rows, plan, onAction, onReset, autoEnabled = false }: { state: PlayState; rows: RowData[]; plan: QueryPlan; onAction: (action: PlayAction) => void; onReset: () => void; autoEnabled?: boolean }) {
  const [autoPlaying, setAutoPlaying] = useState(autoEnabled)
  const [dragging, setDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const chestRef = useRef<HTMLDivElement>(null)
  const pitRef = useRef<HTMLDivElement>(null)
  useEffect(() => setAutoPlaying(autoEnabled), [autoEnabled])
  useEffect(() => {
    if (!autoPlaying || state.complete) return
    const timer = window.setInterval(() => {
      const row = rows[state.cursor]
      if (row) onAction(expectedAction(plan, row, state.cursor))
    }, 900)
    return () => window.clearInterval(timer)
  }, [autoPlaying, state.complete, state.cursor, rows, plan, onAction])
  const current = rows[state.cursor]
  const completedRows = rows.filter((row, index) => state.resultIds.includes(String(row.id ?? index)))
  const filteredRows = rows.filter((row, index) => state.filteredIds.includes(String(row.id ?? index)))
  const whereText = plan.query.match(/where\s+(.+?)(?:;|$)/i)?.[1] ?? 'full scan — every nugget goes to the chest'
  const isFilterGame = plan.metrics.rejected > 0
  const progress = rows.length ? Math.round(((state.resultIds.length + state.filteredIds.length) / rows.length) * 100) : 0
  const handlePointerMove = (event: React.PointerEvent) => { if (!dragging) return; setDragPosition({ x: event.clientX, y: event.clientY }) }
  const handlePointerUp = (event: React.PointerEvent) => {
    if (!dragging) return
    const point = document.elementFromPoint(event.clientX, event.clientY)
    const droppedOnChest = Boolean(point && chestRef.current?.contains(point))
    const droppedOnPit = Boolean(point && pitRef.current?.contains(point))
    setDragging(false)
    if (droppedOnChest) onAction('result')
    else if (droppedOnPit) onAction('filter')
  }
  const beginDrag = (event: React.PointerEvent) => { if (!current || state.complete || autoPlaying) return; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); setDragPosition({ x: event.clientX, y: event.clientY }) }
  const beginNativeDrag = () => { if (!current || state.complete || autoPlaying) return; setDragging(true) }
  const dropNative = (event: React.DragEvent, action: PlayAction) => { event.preventDefault(); setDragging(false); onAction(action) }
  return <div className="mine-game" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
    <div className="mine-header"><div><span className="mine-kicker"><Pickaxe size={14} /> GOLD MINE / PLAY MODE</span><h3>Dig through the data</h3><p>{isFilterGame ? <>Find the nuggets that pass <code>{whereText}</code>; send the rest down the filter chute.</> : 'Every row is buried treasure. Dig each one out and deliver it to the result chest.'}</p></div><div className="mine-stats"><div><span>SCORE</span><strong>{state.score}</strong></div><div><span>DEPTH</span><strong>{state.cursor}<small>/{rows.length}</small></strong></div></div></div>
    <div className="mine-progress"><span style={{ width: `${progress}%` }} /><b>{progress}% excavated</b></div>
    {state.feedback && <div className={`mine-feedback ${state.feedback.tone}`}><span>{state.feedback.tone === 'success' ? <ShieldCheck size={15} /> : state.feedback.tone === 'error' ? <X size={15} /> : <Gem size={15} />}</span><p>{state.feedback.text}</p></div>}
    <div className="mine-layout"><section className="mine-shaft"><div className="shaft-label"><span>DATA MINE</span><small>{state.complete ? 'ALL TREASURE EXCAVATED' : current ? `NUGGET ${state.cursor + 1} / ${rows.length}` : 'READY TO DIG'}</small></div><div className="ore-wall">{rows.map((row, index) => { const id = String(row.id ?? index); const mined = state.resultIds.includes(id) || state.filteredIds.includes(id); const active = current && id === String(current.id ?? state.cursor) && !state.complete; return <div className={`ore-nugget ${mined ? 'mined' : ''} ${active ? 'dig-target' : ''} ${dragging && active ? 'being-dragged' : ''}`} key={id} onPointerDown={active ? beginDrag : undefined} onDragStart={active ? beginNativeDrag : undefined} onDragEnd={() => setDragging(false)} draggable={Boolean(active && !autoPlaying)} role={active ? 'button' : undefined} aria-label={active ? `Drag ${String(row.name ?? id)} to a processing zone` : undefined}><span className="ore-glint"><Gem size={16} /></span><div><strong>{String(row.name ?? `row_${id}`)}</strong><small>{id} · {String(row.age ?? '—')} · {String(row.city ?? row.role ?? 'data')}</small></div>{active && <span className="dig-label"><Pickaxe size={11} /> DIG</span>}{mined && <ShieldCheck size={15} className="mined-mark" />}</div> })}</div><div className="miner-line"><Pickaxe size={17} /><span>Mining one record at a time keeps the invisible execution visible.</span></div></section><section className="mine-actions"><div className="station-title"><span>PROCESSING STATION</span><small>What should the miner do?</small></div><button className="mine-action treasure" disabled={!current || state.complete} onClick={() => onAction('result')}><span className="action-orb"><Trophy size={18} /></span><span><strong>Send to treasure chest</strong><small>{isFilterGame ? 'Passes the WHERE gate' : 'Keep this row in result'}</small></span><ArrowDown size={15} /></button>{isFilterGame && <button className="mine-action chute" disabled={!current || state.complete} onClick={() => onAction('filter')}><span className="action-orb"><ArrowDown size={18} /></span><span><strong>Drop into filter chute</strong><small>Does not pass the predicate</small></span><X size={15} /></button>}<button className="mine-auto" onClick={() => setAutoPlaying((value) => !value)}>{autoPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />} {autoPlaying ? 'Pause auto-miner' : 'Start auto-miner'}</button><button className="mine-reset" onClick={() => { setAutoPlaying(false); onReset() }}><RotateCcw size={13} /> Reset mine</button></section><section className="treasure-chest" ref={chestRef} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropNative(event, 'result')}><div className="chest-heading"><Trophy size={16} /><div><strong>RESULT CHEST</strong><small>{completedRows.length} treasure{completedRows.length === 1 ? '' : 's'} collected</small></div></div><div className="chest-body">{completedRows.length === 0 ? <div className="chest-empty"><Gem size={22} /><span>Empty chest</span><small>Correct rows land here</small></div> : completedRows.map((row, index) => <div className="chest-item" key={String(row.id ?? index)}><Gem size={14} /><span><strong>{String(row.name ?? `row_${row.id}`)}</strong><small>{String(row.id ?? index)} · {String(row.age ?? '—')}</small></span><ShieldCheck size={14} /></div>)}</div><div className="filter-pit drop-zone-pit" ref={pitRef} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropNative(event, 'filter')}><span>FILTER PIT</span>{filteredRows.length ? filteredRows.map((row, index) => <b key={String(row.id ?? index)}><X size={10} /> {String(row.name ?? row.id)}</b>) : <small>nothing discarded yet</small>}</div></section></div>
    {dragging && current && <div className="drag-ghost" style={{ left: dragPosition.x, top: dragPosition.y }}><Gem size={15} /><span>{String(current.name ?? `row_${current.id}`)}</span></div>}{dragging && <div className="drop-hint">Drop the nugget into a zone</div>}{state.complete && <div className="mine-complete"><Trophy size={18} /><div><strong>Mine cleared!</strong><span>{completedRows.length} treasure{completedRows.length === 1 ? '' : 's'} recovered · {filteredRows.length} filtered out</span></div><button onClick={() => { setAutoPlaying(false); onReset() }}>Play again</button></div>}
  </div>
}

function PlayBoard({ state, rows, plan, onAction, onReset, autoEnabled = false }: { state: PlayState; rows: RowData[]; plan: QueryPlan; onAction: (action: PlayAction) => void; onReset: () => void; autoEnabled?: boolean }) {
  const rowPlay = isRowPlaySupported(plan)
  if (plan.physicalPlan || !rowPlay) return <StagePlayBoard plan={plan} autoEnabled={autoEnabled} />
  return <MinePlayBoard state={state} rows={rows} plan={plan} onAction={onAction} onReset={onReset} autoEnabled={autoEnabled} />
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="metric"><span className={`metric-icon ${tone}`} /><span className="metric-label">{label}</span><strong>{value}</strong></div> }

export default App
