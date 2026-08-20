# sql-visualiser reference analysis

Source: https://github.com/yashkantharia/sql-visualiser
Live demo: https://yashkantharia.github.io/sql-visualiser

## Product patterns to reproduce and improve

The reference positions itself as a fully client-side SQL workbench powered by SQL.js/WASM. Its core experience is not a generic operator slideshow; it breaks the query into an explicit logical lifecycle such as FROM -> JOIN -> WHERE -> SELECT and tracks Pending, Active and Done stages in a sidebar.

The most important interaction is real-time row-by-row animation. It uses visual states to distinguish scanning rows, reading comparison cells, and matched rows. During JOIN, intermediate tables are built while the join is running, rather than only showing the final result after execution.

The reference also treats data as editable input, not as a fixed fixture. It supports adding/removing tables, columns and rows, inline editing of headers and cells, tooltips for truncated values, and CSV import. The query editor is IDE-like with syntax highlighting and synchronized layout.

The output is streamed: rows appear in the final output as soon as they match, and collisions such as Orders.id versus Customers.id are given aliases in intermediate views. Errors are surfaced through a Messages/console tab instead of only a toast or a silent fallback.

## Professional upgrade for database-simulator

The current app should adopt a four-pane workbench: Schema/Data Studio, SQL Editor, Execution Pipeline, and Output/Messages. Gold Mine should remain a guided learning skin for beginner row-level lessons, while the primary complex-query view should be a data-flow visualizer with actual intermediate relations and cell-level highlights.

The DuckDB-Wasm physical plan remains the source of truth for complex SQL. The UI should combine its operator tree with a logical query lifecycle and row packets. For JOIN, the visualizer should show left input, right input, join condition, current comparison key, matched pair, unmatched row, and intermediate joined relation. For filters, it should highlight predicate columns and show keep/reject reasons. For projection, it should dim dropped columns. For aggregate, it should show group buckets and updates to aggregate values.

## Feature mapping

| Reference capability | Professional implementation target |
| --- | --- |
| FROM -> JOIN -> WHERE -> SELECT | Query-specific logical + physical plan lanes |
| Pending/Active/Done sidebar | Operator navigator synchronized with current data packet |
| Row-by-row animation | Animated row/document packets and cell highlights |
| Intermediate JOIN tables | Explicit temporary relation panel |
| Editable schema | Table/column/row editor using the current in-memory dataset |
| CSV import | Keep current upload with validation and add table management |
| IDE SQL editor | Preserve Query Studio and add syntax/error message states |
| Live output | Stream result rows into output panel during playback |
| Error console | Add Messages tab with parser/planner/runtime diagnostics |

## Scope decision

Do not copy the reference code. Rebuild the interaction model using the current React/Vite architecture, preserving DuckDB-Wasm, compare mode, lesson curriculum, deterministic simulator tests, and GitHub Pages deployment.
