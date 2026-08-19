# Database Simulator

**Database Simulator** là một web app giáo dục giúp nhìn thấy database xử lý query từng bước. Ứng dụng chạy hoàn toàn ở client, không gửi query lên server và được thiết kế để deploy trên GitHub Pages.

## Có gì trong bản MVP

Ứng dụng hiện mô phỏng hai dialect riêng biệt:

| Dialect | Được hỗ trợ |
| --- | --- |
| SQL | `SELECT`, một bảng, `WHERE` với so sánh, `ORDER BY`, `LIMIT`, projection, sequential table scan và educational index lookup. |
| MongoDB-like | `db.users.find(filter, projection)`, equality, `$gt/$gte/$lt/$lte`, `$and/$or`, projection, `.sort()` và `.limit()`. |

Mỗi query được chuyển thành execution events gồm scan/lookup, filter/match, projection, sort, limit và result. Playback controls cho phép chạy từng bước; các row/document tương ứng được highlight, còn item bị loại được đánh dấu trực tiếp.

Bản MVP cũng có **Play mode** cho SQL Sequential Scan và `WHERE`. Người chơi lần lượt xử lý từng row trong source table bằng cách chọn `Send to result` hoặc `Filter out`. Hành động sai không làm mất tiến trình nhưng bị trừ điểm và giải thích nguyên nhân; khi hoàn tất, result table, filtered tray, score và số lỗi được hiển thị.

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

Query nằm ngoài subset hỗ trợ sẽ hiển thị diagnostic thân thiện thay vì chạy code tùy ý.

## Kiến trúc

```text
Query editor → dialect parser/validator → normalized execution model
→ deterministic simulator → timeline + metrics + explanation → animated renderer
```

`src/lib/simulator.ts` là source of truth của execution semantics; UI chỉ render plan và events, giúp test lõi không phụ thuộc vào DOM.

## Deploy

Mỗi lần push lên `main`, GitHub Actions chạy `pnpm install --frozen-lockfile`, build và deploy `dist/` lên GitHub Pages. Repository cần bật Pages với source **GitHub Actions** trong Settings → Pages.
