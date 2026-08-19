# Database Simulator

**Database Simulator** là một web app giáo dục giúp nhìn thấy database xử lý query từng bước. Ứng dụng chạy hoàn toàn ở client, không gửi query lên server và được thiết kế để deploy trên GitHub Pages.

## Có gì trong bản MVP

Ứng dụng hiện mô phỏng hai dialect riêng biệt:

| Dialect | Được hỗ trợ |
| --- | --- |
| SQL | `SELECT`, một bảng, `WHERE` với so sánh, `ORDER BY`, `LIMIT`, projection, sequential table scan và educational index lookup. |
| MongoDB-like | `db.users.find(filter, projection)`, equality, `$gt/$gte/$lt/$lte`, `$and/$or`, projection, `.sort()` và `.limit()`. |

Mỗi query được chuyển thành execution events gồm scan/lookup, filter/match, projection, sort, limit và result. Playback controls cho phép chạy từng bước; các row/document tương ứng được highlight, còn item bị loại được đánh dấu trực tiếp.

Bản MVP cũng có **Play mode** cho SQL Sequential Scan và `WHERE`, và đây hiện là chế độ mặc định của execution panel. Người chơi lần lượt xử lý từng row trong source table bằng cách chọn `Send to result` hoặc `Filter out`. Hành động sai không làm mất tiến trình nhưng bị trừ điểm và giải thích nguyên nhân; khi hoàn tất, result table, filtered tray, score và số lỗi được hiển thị. Nút **Auto play** có thể tự đi qua các quyết định đúng để người dùng quan sát flow.

Bản mở rộng có **Complex SQL mode** dùng AlaSQL client-side cho JOIN, GROUP BY, các hàm `COUNT/SUM/AVG/MIN/MAX`, HAVING, UNION và các query phức tạp mà engine hỗ trợ. Các query phức tạp được biểu diễn bằng pipeline tổng quát `Read tables → Join → Aggregate → Result`; đây là explain model giáo dục, không phải execution plan của một vendor cụ thể.

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

Query nằm ngoài subset hỗ trợ sẽ hiển thị diagnostic thân thiện thay vì chạy code tùy ý.

## Kiến trúc

```text
Query editor → dialect parser/validator → normalized execution model
→ deterministic simulator → timeline + metrics + explanation → animated renderer
```

`src/lib/simulator.ts` là source of truth của execution semantics; UI chỉ render plan và events, giúp test lõi không phụ thuộc vào DOM.

## Deploy

Mỗi lần push lên `main`, GitHub Actions chạy `pnpm install --frozen-lockfile`, build và deploy `dist/` lên GitHub Pages. Repository cần bật Pages với source **GitHub Actions** trong Settings → Pages.
