# Benchmark findings

## AnimateSQL

Source: https://animatesql.com/

The public app exposes metadata describing itself as an SQL learning visualizer where users choose a keyword, press Visualize, and customize queries. The sandbox runtime rendered only a blank page, so exact interaction details remain unavailable from the live site.

## Closest inspectable reference: SQL Visualiser

Source: https://github.com/yashkantharia/sql-visualiser
Live demo: https://yashkantharia.github.io/sql-visualiser

The reference README describes a fully client-side SQL workbench using SQL.js/WASM. Its product surface includes a granular execution pipeline (`FROM → JOIN → WHERE → SELECT`), a Pending/Active/Done execution sidebar, row-by-row animation, nested-loop color states (scan/read/match), intermediate join results, an editable schema/table editor, CSV import, an IDE-style SQL editor, live output streaming, and a Messages tab for SQL errors.

The live demo confirmed a professional baseline layout: left schema editor with Products/Customers/Orders tables and inline editable cells; top-right SQL editor with syntax-highlighted JOIN query; speed slider; Theme and Reset controls; Execution Plan panel; Messages tab; Run & Visualize button; Process Visualization area; and Final Output area.

Implications for database-simulator: the next professional version should combine the current physical-plan correctness and drag-and-drop game with a real three-pane workbench: schema/data studio, query/plan studio, and execution viewport. It should show logical and physical plans separately, stream intermediate relations, color-code row/cell states, expose speed/step controls, show operator details and metrics, and provide a persistent messages/diagnostics console. The Gold Mine skin can remain as an optional Play layer rather than the only visualization.
