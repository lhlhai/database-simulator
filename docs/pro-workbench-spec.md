# Pro Workbench specification

## Product direction

Database Simulator will evolve from a single educational board into a client-side execution workbench. The product should show not only whether a query returns the expected rows, but also how the selected engine forms, orders, and executes its plan.

## Layout

The desktop experience uses three coordinated surfaces. The left surface is **Data Studio**, containing schema/table cards, editable cells, upload state and row counts. The center surface is **Execution Canvas**, containing the logical plan, physical plan, animated data packets and intermediate relations. The right surface is **Query Studio**, containing an IDE-style editor, query diagnostics, run controls, speed/step controls and metrics. On small screens these surfaces become tabs or stacked sections without hiding the current execution state.

## Query-to-plan pipeline

```text
SQL / NoSQL input
  → parser and validation
  → engine execution / EXPLAIN
  → logical plan
  → physical plan
  → normalized operator tree
  → deterministic event stream
  → animated data flow + metrics + diagnostics
```

The physical plan from DuckDB-Wasm is authoritative for complex SQL. The app must never invent a join order or claim a build/probe side unless the engine exposes it. When details are unavailable, the UI should say `engine did not expose this detail` and still show the operator tree.

## Professional execution surfaces

The Execution Canvas must show a tree of operator cards, not a generic list. Each card contains operator type, relation/table, estimated or actual rows when available, predicate/join condition, input/output counts, elapsed time, and status (`pending`, `active`, `done`). Edges carry animated row/document packets. Selecting an operator opens an inspector with its raw plan text and explanation.

A secondary **Data Flow** view shows source relation, intermediate relation and final output relation as real table snapshots. For joins, it shows left input, right input, matching key cells, joined row, and unmatched rows for LEFT/RIGHT/FULL JOIN. For filters, it highlights the exact predicate cell that caused acceptance or rejection.

## Play mode

Play mode remains available as a guided layer on top of the actual plan. The Gold Mine interaction is used for simple row-level lessons. Complex queries use a plan-aware operator challenge: the user can inspect or route packets through the active operator, but the engine remains authoritative. Watch mode is the default for a new complex query; Play mode is available when the plan has an interaction adapter.

## Query Studio

Query Studio includes syntax highlighting, copy, format, run, explain-only, run-and-animate, pause, step, replay, speed, reduced-motion support and a Messages tab. Diagnostics point to the query fragment or operator that failed.

## Compare mode

Compare mode runs two queries against one dataset and renders two independent plan canvases. Each side has its own operator tree, data flow, metrics, timeline and playback. A shared **Play both** control synchronizes only the clock; plans and stages remain independent.

## Initial professional milestone

The first milestone should not attempt to redesign every screen at once. It should ship: a Query Studio toolbar with explain/run/step/replay/speed, a physical-plan operator tree visible beside the Gold Mine board, an operator inspector, Data Flow table snapshots, and a persistent Messages/Diagnostics panel. This establishes the professional baseline before adding richer join-specific interaction.
