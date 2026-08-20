# Theme visual verification

Preview: http://localhost:5180/database-simulator/

The topbar exposes a Light button in dark mode. Clicking it switches the document to light theme and changes the control label to Dark. The hero, dataset bar, dialect cards, Query Studio editor, lesson cards and execution workbench show light surfaces with dark text while mint/amber/pink semantic accents remain visible.

Theme state is stored in localStorage under `database-simulator-theme` and is applied via `data-theme` on the document root.
