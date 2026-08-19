import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Database, ChevronRight, CircleHelp, Zap } from 'lucide-react'
import { presets, users } from './data/datasets'
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
  const [tables, setTables] = useState<UserTable[]>([{ name: 'users', rows: users, columns: Object.keys(users[0]), source: 'built-in sample' }])
  const [datasetMessage, setDatasetMessage] = useState('Using built-in users table')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareA, setCompareA] = useState('SELECT * FROM users WHERE age > 18;')
  const [compareB, setCompareB] = useState('SELECT name, age FROM users WHERE age > 18;')
  const [comparison, setComparison] = useState<[ComparisonResult, ComparisonResult] | null>(null)
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
      setError(''); setPlaying(false); setPlayState(createPlayState()); setStep(-1)
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
    setDialect(next); setQuery(nextPreset.query); run(next, nextPreset.query)
  }
  const choosePreset = (id: string) => {
    const preset = presets.find((item) => item.id === id)!
    setDialect(preset.dialect); setQuery(preset.query); run(preset.dialect, preset.query)
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
          <textarea aria-label="Query editor" value={query} onChange={(e) => setQuery(e.target.value)} spellCheck={false} />
          <div className="editor-footer"><span><CircleHelp size={14} /> MVP syntax · safe parser only</span><button className="run-button" onClick={() => run()}><Zap size={15} /> Run simulation <ChevronRight size={15} /></button></div>
          {error && <div className="error-box">{error}</div>}
        </div>
        <div className="panel presets-panel"><div className="panel-heading"><div><span className="section-kicker">LESSONS</span><h2>Start with a pattern</h2></div></div><div className="preset-list">{presets.filter((item) => item.dialect === dialect).map((item) => <button key={item.id} className={`preset ${query === item.query ? 'selected' : ''}`} onClick={() => choosePreset(item.id)}><span className="preset-dot" /><span><strong>{item.label}</strong><small>{item.description}</small></span><ChevronRight size={15} /></button>)}</div></div>
      </section>

      <section className="panel simulation-panel"><div className="panel-heading simulation-heading"><div><span className="section-kicker">02 / EXECUTION TIMELINE</span><h2>{viewMode === 'play' ? 'Play the query' : 'Follow the data'}</h2></div><div className="view-switch"><button className={viewMode === 'watch' ? 'selected' : ''} onClick={() => setViewMode('watch')}>Watch</button><button className={viewMode === 'play' ? 'selected' : ''} disabled={!isPlaySupported(plan)} onClick={() => { setViewMode('play'); setPlaying(false); setPlayState(createPlayState()) }}>Play mode</button>{viewMode === 'watch' && <div className="playback"><button aria-label="Reset" onClick={() => { setPlaying(false); setStep(-1) }}><RotateCcw size={15} /></button><button className="play-main" aria-label={playing ? 'Pause animation' : isDone ? 'Replay animation' : 'Play animation'} onClick={() => { if (isDone) setStep(-1); setPlaying((value) => !value) }}>{playing ? <Pause size={16} /> : isDone ? <RotateCcw size={16} /> : <Play size={16} fill="currentColor" />}</button><button aria-label="Step forward" onClick={() => { setPlaying(false); advance() }}><SkipForward size={15} /></button><label>Speed <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div>}</div></div>
          <div className="timeline">{plan.nodes.map((node, index) => <div className={`timeline-node ${current?.node === node.id ? 'current' : ''} ${index <= plan.events.findIndex((event) => event.node === node.id) && step >= 0 ? 'visited' : ''}`} key={node.id}><div className={`node-circle ${node.tone}`}>{String(index + 1).padStart(2, '0')}</div><span>{node.label}</span>{index < plan.nodes.length - 1 && <div className="connector" />}</div>)}</div>
          <div className="event-strip"><div className="event-label"><span className="event-pulse" />{step < 0 ? 'Ready to simulate' : current.title}</div><div className="event-detail">{step < 0 ? 'Bấm play để tiến qua từng bước xử lý.' : current.detail}</div><div className="step-count">{step < 0 ? '0' : step + 1} <span>/ {plan.events.length}</span></div></div>
          {viewMode === 'play' && isPlaySupported(plan) ? <PlayBoard state={playState} rows={datasetRows} plan={plan} onAction={playAction} onReset={() => setPlayState(createPlayState())} /> : <div className="data-view"><div className="data-caption"><span>{dialect === 'sql' ? `${tables[0]?.name ?? 'users'} table` : `${tables[0]?.name ?? 'users'} collection`}</span><span>{current ? `highlighting ${current.activeIds.length} items` : 'waiting for execution'}</span></div><div className="row-grid">{visibleRows.map((row, index) => <div key={String(row.id)} className={`data-card ${row.__state ?? ''} ${current?.rejectedIds?.includes(String(row.id ?? index)) ? 'rejected' : ''}`} style={{ '--delay': `${index * 45}ms`, '--speed': `${1 / speed}s` } as CSSProperties}><div className="card-top"><span className="row-id">{dialect === 'sql' ? 'ROW' : 'DOC'} {String(row.id).padStart(3, '0')}</span><span className="row-dot" /></div><strong>{String(row.name)}</strong><div className="card-fields"><span>age <b>{String(row.age)}</b></span><span>{String(row.city)}</span></div>{current?.rejectedIds?.includes(String(row.id ?? index)) && <div className="rejected-label">filtered out</div>}</div>)}</div></div>}
      </section>

      <section className="bottom-grid"><div className="panel metrics-panel"><div className="panel-heading"><div><span className="section-kicker">03 / OBSERVATIONS</span><h2>What changed?</h2></div></div><div className="metrics"><Metric label="SCANNED" value={plan.metrics.scanned} tone="blue" /><Metric label="MATCHED" value={plan.metrics.matched} tone="amber" /><Metric label="REJECTED" value={plan.metrics.rejected} tone="pink" /><Metric label="RETURNED" value={plan.metrics.returned} tone="green" /></div><div className="explanation"><span className="explanation-mark">i</span><p>{plan.explanation}</p></div></div><div className="panel result-panel"><div className="panel-heading"><div><span className="section-kicker">RESULT PREVIEW</span><h2>Client receives</h2></div><span className="result-count">{plan.result.length} items</span></div><div className="result-list">{plan.result.slice(0, 4).map((row, index) => <div className="result-row" key={index}><span className="result-index">{String(index + 1).padStart(2, '0')}</span><span>{Object.entries(row).map(([key, val]) => <b key={key}>{key}: {String(val)} </b>)}</span></div>)}</div></div></section>
      <footer><span>Database Simulator · built for learning, not benchmarking</span><span>Press <kbd>Step</kbd> to slow down the invisible.</span></footer>
    </main>
  </div>
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
  return <section className="compare-panel panel"><div className="compare-head"><div><span className="section-kicker">04 / DUAL PLAY MODE</span><h2>Play both queries side by side</h2><p>Mỗi query có source table, action station, result table, score và autoplay riêng trên cùng dataset.</p></div><div className="compare-head-actions"><button className="run-button" onClick={onRun}><Zap size={14} /> Run both</button>{comparison && <button className="auto-both-button" onClick={() => setBothAuto((value) => !value)}>{bothAuto ? <Pause size={14} /> : <Play size={14} fill="currentColor" />} {bothAuto ? 'Pause both' : 'Auto play both'}</button>}</div></div><div className="compare-editors"><label><span>QUERY A</span><textarea value={queryA} onChange={(event) => setQueryA(event.target.value)} spellCheck={false} /></label><label><span>QUERY B</span><textarea value={queryB} onChange={(event) => setQueryB(event.target.value)} spellCheck={false} /></label></div>{comparison ? <><div className="dual-play-grid">{comparison.map((item, index) => <div className="dual-play-card" key={index}><div className="dual-play-heading"><span>QUERY {index === 0 ? 'A' : 'B'}</span><strong>{item.plan.metrics.strategy}</strong><b>{item.elapsedMs} ms</b></div>{isPlaySupported(item.plan) ? <PlayBoard state={index === 0 ? stateA : stateB} rows={rows} plan={item.plan} onAction={(action) => index === 0 ? setStateA((state) => takePlayAction(item.plan, state, rows, action)) : setStateB((state) => takePlayAction(item.plan, state, rows, action))} onReset={() => index === 0 ? setStateA(createPlayState()) : setStateB(createPlayState())} autoEnabled={bothAuto} /> : <div className="compare-empty">Query này có pipeline phức tạp nên chưa có luật Play mode riêng. Watch/explain metrics vẫn khả dụng.</div>}</div>)}</div><div className="compare-results">{comparison.map((item, index) => <div className="compare-card" key={index}><div className="compare-card-title"><span>QUERY {index === 0 ? 'A' : 'B'}</span><strong>{item.plan.metrics.strategy}</strong><b>{item.elapsedMs} ms</b></div><div className="compare-metrics"><span>scanned <b>{item.plan.metrics.scanned}</b></span><span>matched <b>{item.plan.metrics.matched}</b></span><span>returned <b>{item.plan.metrics.returned}</b></span></div><p>{item.plan.explanation}</p></div>)}</div></> : <div className="compare-empty">Chưa chạy comparison. Chọn hai query trên cùng dataset rồi bấm Run both.</div>}<small className="compare-disclaimer">Dialect: {dialect.toUpperCase()} · tốc độ phụ thuộc kích thước dataset, browser và thời điểm chạy; không phải benchmark production.</small></section>
}

function PlayBoard({ state, rows, plan, onAction, onReset, autoEnabled = false }: { state: PlayState; rows: RowData[]; plan: QueryPlan; onAction: (action: PlayAction) => void; onReset: () => void; autoEnabled?: boolean }) {
  const rowPlay = isRowPlaySupported(plan)
  const current = rows[state.cursor]
  const completedRows = rows.filter((row, index) => state.resultIds.includes(String(row.id ?? index)))
  const filteredRows = rows.filter((row, index) => state.filteredIds.includes(String(row.id ?? index)))
  const [autoPlaying, setAutoPlaying] = useState(autoEnabled)
  useEffect(() => setAutoPlaying(autoEnabled), [autoEnabled])
  useEffect(() => {
    if (!rowPlay || !autoPlaying || state.complete) return
    const timer = window.setInterval(() => {
      const row = rows[state.cursor]
      if (row) onAction(expectedAction(plan, row, state.cursor))
    }, 850)
    return () => window.clearInterval(timer)
  }, [rowPlay, autoPlaying, state.complete, state.cursor, rows, plan, onAction])
  if (!rowPlay) return <StagePlayBoard plan={plan} autoEnabled={autoEnabled} />
  const whereText = plan.query.match(/where\s+(.+?)(?:;|$)/i)?.[1] ?? 'không có WHERE'
  return <div className="play-board">
    <div className="play-intro"><div><span className="game-badge"><Zap size={13} /> MINI-GAME</span><h3>Route every row through the query</h3><p>{plan.metrics.rejected ? <>Đọc từng row rồi quyết định: <code>{whereText}</code> đạt hay bị loại?</> : 'Không có WHERE — mọi row đều phải được đưa vào result table.'}</p></div><div className="score-box"><span>SCORE</span><strong>{state.score}</strong><small>{state.mistakes} mistake{state.mistakes === 1 ? '' : 's'}</small></div></div>
    {state.feedback && <div className={`game-feedback ${state.feedback.tone}`}><span>{state.feedback.tone === 'success' ? '✓' : state.feedback.tone === 'error' ? '!' : 'i'}</span>{state.feedback.text}</div>}
    <div className="game-columns"><div className="game-source"><div className="game-title"><span>01</span><div><strong>Source table</strong><small>{state.complete ? 'All rows processed' : current ? `Pick row ${state.cursor + 1} of ${rows.length}` : 'Ready'}</small></div></div><div className="source-stack">{rows.map((row, index) => { const id = String(row.id ?? index); const processed = state.resultIds.includes(id) || state.filteredIds.includes(id); const active = id === String(current?.id ?? '') && !state.complete; return <div className={`game-row ${processed ? 'processed' : ''} ${active ? 'active' : ''}`} key={id}><span className="game-row-index">{String(index + 1).padStart(2, '0')}</span><span className="game-row-main"><strong>{String(row.name)}</strong><small>id {id} · age {String(row.age)} · {String(row.city)}</small></span>{active && <span className="current-tag">YOUR TURN</span>}{processed && <span className="processed-mark">✓</span>}</div> })}</div></div><div className="game-stations"><div className="game-title"><span>02</span><div><strong>Choose an action</strong><small>{state.complete ? 'Round complete' : 'What should database do?'}</small></div></div><button className="action-card send" disabled={!current || state.complete} onClick={() => onAction('result')}><span className="action-icon">↗</span><span><strong>Send to result</strong><small>{plan.metrics.rejected ? 'Row passes WHERE' : 'Append row to output'}</small></span></button>{plan.metrics.rejected > 0 && <button className="action-card discard" disabled={!current || state.complete} onClick={() => onAction('filter')}><span className="action-icon">×</span><span><strong>Filter out</strong><small>Row fails WHERE</small></span></button>}<button className="auto-game" onClick={() => setAutoPlaying((value) => !value)}>{autoPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />} {autoPlaying ? 'Pause auto' : 'Auto play'}</button><button className="reset-game" onClick={() => { setAutoPlaying(false); onReset() }}><RotateCcw size={13} /> Reset round</button></div><div className="game-result"><div className="game-title"><span>03</span><div><strong>Result table</strong><small>{completedRows.length} rows collected</small></div></div><div className="result-stack">{completedRows.length === 0 ? <div className="empty-table"><span>∅</span><small>Empty result table</small></div> : completedRows.map((row, index) => <div className="game-row result" key={String(row.id)}><span className="game-row-index">{String(index + 1).padStart(2, '0')}</span><span className="game-row-main"><strong>{String(row.name)}</strong><small>id {String(row.id)} · age {String(row.age)}</small></span><span className="processed-mark">✓</span></div>)}</div><div className="filtered-tray"><span>FILTERED OUT</span>{filteredRows.length === 0 ? <small>none yet</small> : filteredRows.map((row) => <b key={String(row.id)}>{String(row.name)}</b>)}</div></div></div>
    {state.complete && <div className="complete-banner"><span>Round complete</span><strong>{completedRows.length} rows returned · {filteredRows.length} filtered out</strong><button onClick={() => { setAutoPlaying(false); onReset() }}>Play again</button></div>}
  </div>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="metric"><span className={`metric-icon ${tone}`} /><span className="metric-label">{label}</span><strong>{value}</strong></div> }

export default App
