# Database Simulator

**Database Simulator** là một web app giáo dục giúp nhìn thấy database xử lý query từng bước. Ứng dụng chạy hoàn toàn ở client, không gửi query lên server và được thiết kế để deploy trên GitHub Pages.

## Có gì trong bản MVP

Ứng dụng hiện mô phỏng hai dialect riêng biệt:

| Dialect | Được hỗ trợ |
| --- | --- |
| SQL | `SELECT`, một bảng, `WHERE` với so sánh, `ORDER BY`, `LIMIT`, projection, sequential table scan và educational index lookup. |
| MongoDB-like | `db.users.find(filter, projection)`, equality, `$gt/$gte/$lt/$lte`, `$and/$or`, projection, `.sort()` và `.limit()`. |

Mỗi query được chuyển thành execution events gồm scan/lookup, filter/match, projection, sort, limit và result. Playback controls cho phép chạy từng bước; các row/document tương ứng được highlight, còn item bị loại được đánh dấu trực tiếp.

Bản MVP cũng có **Play mode** cho SQL Sequential Scan và `WHERE`, và đây hiện là chế độ mặc định của execution panel. Người chơi kéo nugget/row hiện tại từ **Data Mine** vào **Treasure Chest** hoặc **Filter Pit** bằng pointer/touch drag và native HTML5 drag/drop. Thả đúng sẽ đưa row qua execution flow; thả sai bị engine trừ điểm, giải thích nguyên nhân và snap-back về lượt hiện tại. Khi hoàn tất, result chest, filter pit, score và số lỗi được hiển thị. Nút **Auto-miner** có thể tự đi qua các quyết định đúng để người dùng quan sát flow.

## Professional workbench

Database Simulator hiện có lớp **Query Studio + Physical Plan Inspector** lấy cảm hứng từ các SQL visualizer chuyên dụng nhưng dùng DuckDB-Wasm physical plan làm nguồn sự thật cho complex SQL. Query Studio có Format, Explain, Copy, Run & animate và playback controls. Physical Plan Inspector hiển thị operator tree query-specific, trạng thái pending/active/done, input/output/rejected rows, duration, data-flow summary và raw `EXPLAIN` khi engine cung cấp.

Execution Canvas vẫn giữ Gold Mine Play mode cho bài học row-level, còn complex query được giải thích qua operator tree thật. Người dùng có thể chọn từng operator để xem chi tiết thay vì chỉ nhìn một pipeline text chung. Compare mode giữ hai plan/canvas độc lập và có Auto play both.

## SQL Visualiser-style workbench

The workbench now follows the interaction model of SQL Visualiser more closely: Query Studio sits above an execution workspace with `Visualize`, `Schema & Data` and `Messages` tabs. Schema & Data exposes the current in-memory tables and inline editable cells; Visualize keeps the operator tree, row flow and Gold Mine/Pipeline Play; Messages exposes query-specific diagnostics and the active execution signature. The visual system is available in both **Dark** and **Light** themes through the topbar switcher, and the selection persists in the browser.

## Lesson curriculum

Khu vực Lessons hiện được tổ chức theo lộ trình và category thay vì một danh sách preset phẳng. Các nhóm gồm Foundations, Filtering, Shaping, Joins, Analytics và NoSQL. Mỗi card hiển thị difficulty và mode đề xuất: **Gold Mine** cho row-level scan/filter, **Pipeline Play** cho operator tree và complex query, hoặc Watch khi bài học cần quan sát plan trước.

Bộ bài học mẫu bao phủ full scan, predicate đơn, AND predicates, projection, sort/limit, index-assisted lookup, INNER JOIN, LEFT JOIN, aggregate theo nhóm, filter pushdown, collection scan, MongoDB match, `$and`, projection và sort/limit document. Dataset mặc định có sẵn `users`, `orders` và `products`, nên các bài JOIN/aggregate chạy ngay trước khi upload dữ liệu riêng.

Bản mở rộng có **Complex SQL mode** chạy qua DuckDB-Wasm trong browser. Với query complex, app gọi `EXPLAIN` để lấy physical operator tree thật rồi dựng Play mode từ plan đó, thay vì tự đoán thứ tự. Người dùng có thể xem raw plan để hiểu `HASH_JOIN`, join condition, child order, scan, filter, aggregate, sort, projection và limit. Nút `Auto play` chạy theo operator tree; Compare mode có `Auto play both` để chạy hai physical plan đồng thời. Đây là plan của DuckDB, không phải execution plan của PostgreSQL/MySQL; các chi tiết như build/probe chỉ được hiển thị khi engine thực sự cung cấp, không tự suy luận.

Ứng dụng cho phép upload tối đa 4 file CSV/TXT/TSV cùng lúc. Dòng đầu tiên phải là header; tên file trở thành tên table, ví dụ `users.csv` và `orders.csv` có thể dùng trong query `FROM users JOIN orders ...`. Giới hạn hiện tại là 2 MB/file, 5.000 rows/table, 32 columns và 512 ký tự/cell. Đây là giới hạn bảo vệ trình duyệt, không phải giới hạn của database production.

**Compare mode** chạy hai query trên cùng dataset trong cùng browser session. Sau khi bấm `Run both`, mỗi query mở thành một PlayBoard riêng với source table, action station, result table, score, filtered tray và Auto play riêng; người dùng có thể chạy hai board song song hoặc tự thao tác từng bên. Bên dưới vẫn hiển thị elapsed time client-side cùng scanned/matched/returned và execution strategy. Elapsed time chỉ dùng để minh họa tương đối; người dùng không nên xem đây là benchmark production.

> Đây là mô hình trực quan hóa cho học tập, không phải benchmark và không tuyên bố tái tạo chính xác optimizer của PostgreSQL, MySQL hay MongoDB production.

## Chạy local

```bash
pnpm install
pnpm dev
```

Kiểm tra semantics và production bundle:

```bash
pnpm test
pnpm run build
```

## Query syntax mẫu

```sql
SELECT * FROM users WHERE age > 18;
SELECT name, city FROM users WHERE city = 'Hanoi' ORDER BY age DESC LIMIT 2;
```

```js
db.users.find({ age: { $gt: 18 } })
db.users.find({ active: true }, { name: 1, role: 1, _id: 0 }).limit(3)
```

Ví dụ complex SQL sau khi upload `users.csv` và `orders.csv`:

```sql
SELECT u.name, SUM(o.amount) AS total_amount
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.name;
```

Query được đưa trực tiếp vào DuckDB-Wasm nên độ bao phủ SQL rộng hơn adapter giáo dục cũ; nếu DuckDB không parse/execute được, app hiển thị diagnostic cụ thể thay vì chạy code tùy ý. DuckDB-Wasm làm bundle lớn hơn đáng kể, vì vậy complex planner nên được lazy-load ở milestone tối ưu tiếp theo nếu cần giảm thời gian tải ban đầu.

## Kiến trúc

```text
Query editor → dialect parser/validator → normalized execution model
→ deterministic simulator → timeline + metrics + explanation → animated renderer
```

`src/lib/simulator.ts` là source of truth của execution semantics; UI chỉ render plan và events, giúp test lõi không phụ thuộc vào DOM.

## Deploy

Mỗi lần push lên `main`, GitHub Actions chạy `pnpm install --frozen-lockfile`, build và deploy `dist/` lên GitHub Pages. Repository cần bật Pages với source **GitHub Actions** trong Settings → Pages.
