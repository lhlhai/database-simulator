import { useMemo, useState, type CSSProperties } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Database, ChevronRight, CircleHelp, Zap } from 'lucide-react'
import { presets, users } from './data/datasets'
import { simulate } from './lib/simulator'
import type { Dialect, QueryPlan } from './lib/types'
import './styles.css'

const initial = presets[0]

function App() {
  const [dialect, setDialect] = useState<Dialect>(initial.dialect)
  const [query, setQuery] = useState(initial.query)
  const [plan, setPlan] = useState<QueryPlan>(() => simulate(initial.dialect, initial.query, users))
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [speed, setSpeed] = useState(1)

  const current = plan.events[Math.max(step, 0)]
  const visibleRows = useMemo<Array<(typeof users)[number] & { __state?: string }>>(() => {
    const active = current?.activeIds
    if (!active) return users
    return users.map((row, index) => ({ ...row, __state: active.includes(String(row.id ?? index)) ? 'active' : 'muted' }))
  }, [current])

  const run = (nextDialect = dialect, nextQuery = query) => {
    try { setError(''); setPlan(simulate(nextDialect, nextQuery, users)); setStep(-1) }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể mô phỏng query này.') }
  }
  const chooseDialect = (next: Dialect) => {
    const nextPreset = presets.find((item) => item.dialect === next)!
    setDialect(next); setQuery(nextPreset.query); run(next, nextPreset.query)
  }
  const choosePreset = (id: string) => {
    const preset = presets.find((item) => item.id === id)!
    setDialect(preset.dialect); setQuery(preset.query); run(preset.dialect, preset.query)
  }
  const play = () => setStep((value) => value >= plan.events.length - 1 ? 0 : value + 1)
  const isDone = step >= plan.events.length - 1

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

      <section className="panel simulation-panel"><div className="panel-heading simulation-heading"><div><span className="section-kicker">02 / EXECUTION TIMELINE</span><h2>Follow the data</h2></div><div className="playback"><button aria-label="Reset" onClick={() => setStep(-1)}><RotateCcw size={15} /></button><button className="play-main" aria-label={isDone ? 'Replay' : 'Play next step'} onClick={play}>{isDone ? <RotateCcw size={16} /> : step >= 0 ? <SkipForward size={16} /> : <Play size={16} fill="currentColor" />}</button><button aria-label="Pause" onClick={() => setStep(step)}><Pause size={15} /></button><label>Speed <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={1.5}>1.5×</option></select></label></div></div>
          <div className="timeline">{plan.nodes.map((node, index) => <div className={`timeline-node ${current?.node === node.id ? 'current' : ''} ${index <= plan.events.findIndex((event) => event.node === node.id) && step >= 0 ? 'visited' : ''}`} key={node.id}><div className={`node-circle ${node.tone}`}>{String(index + 1).padStart(2, '0')}</div><span>{node.label}</span>{index < plan.nodes.length - 1 && <div className="connector" />}</div>)}</div>
          <div className="event-strip"><div className="event-label"><span className="event-pulse" />{step < 0 ? 'Ready to simulate' : current.title}</div><div className="event-detail">{step < 0 ? 'Bấm play để tiến qua từng bước xử lý.' : current.detail}</div><div className="step-count">{step < 0 ? '0' : step + 1} <span>/ {plan.events.length}</span></div></div>
          <div className="data-view"><div className="data-caption"><span>{dialect === 'sql' ? 'users table' : 'users collection'}</span><span>{current ? `highlighting ${current.activeIds.length} items` : 'waiting for execution'}</span></div><div className="row-grid">{visibleRows.map((row, index) => <div key={String(row.id)} className={`data-card ${row.__state ?? ''} ${current?.rejectedIds?.includes(String(row.id ?? index)) ? 'rejected' : ''}`} style={{ '--delay': `${index * 45}ms`, '--speed': `${1 / speed}s` } as CSSProperties}><div className="card-top"><span className="row-id">{dialect === 'sql' ? 'ROW' : 'DOC'} {String(row.id).padStart(3, '0')}</span><span className="row-dot" /></div><strong>{String(row.name)}</strong><div className="card-fields"><span>age <b>{String(row.age)}</b></span><span>{String(row.city)}</span></div>{current?.rejectedIds?.includes(String(row.id ?? index)) && <div className="rejected-label">filtered out</div>}</div>)}</div></div>
      </section>

      <section className="bottom-grid"><div className="panel metrics-panel"><div className="panel-heading"><div><span className="section-kicker">03 / OBSERVATIONS</span><h2>What changed?</h2></div></div><div className="metrics"><Metric label="SCANNED" value={plan.metrics.scanned} tone="blue" /><Metric label="MATCHED" value={plan.metrics.matched} tone="amber" /><Metric label="REJECTED" value={plan.metrics.rejected} tone="pink" /><Metric label="RETURNED" value={plan.metrics.returned} tone="green" /></div><div className="explanation"><span className="explanation-mark">i</span><p>{plan.explanation}</p></div></div><div className="panel result-panel"><div className="panel-heading"><div><span className="section-kicker">RESULT PREVIEW</span><h2>Client receives</h2></div><span className="result-count">{plan.result.length} items</span></div><div className="result-list">{plan.result.slice(0, 4).map((row, index) => <div className="result-row" key={index}><span className="result-index">{String(index + 1).padStart(2, '0')}</span><span>{Object.entries(row).map(([key, val]) => <b key={key}>{key}: {String(val)} </b>)}</span></div>)}</div></div></section>
      <footer><span>Database Simulator · built for learning, not benchmarking</span><span>Press <kbd>Step</kbd> to slow down the invisible.</span></footer>
    </main>
  </div>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="metric"><span className={`metric-icon ${tone}`} /><span className="metric-label">{label}</span><strong>{value}</strong></div> }

export default App
