import type { Preset, RowData } from '../lib/types'
import type { UserTable } from '../lib/dataset'

export const users: RowData[] = [
  { id: 101, name: 'An', age: 17, role: 'student', active: true, city: 'Hanoi' },
  { id: 102, name: 'Bình', age: 24, role: 'engineer', active: true, city: 'Da Nang' },
  { id: 103, name: 'Chi', age: 31, role: 'designer', active: false, city: 'HCMC' },
  { id: 104, name: 'Dũng', age: 42, role: 'engineer', active: true, city: 'Hanoi' },
  { id: 105, name: 'Hà', age: 19, role: 'student', active: true, city: 'HCMC' },
  { id: 106, name: 'Lan', age: 28, role: 'pm', active: false, city: 'Da Nang' },
]

export const orders: RowData[] = [
  { id: 1001, user_id: 102, product_id: 201, amount: 1200, status: 'paid' },
  { id: 1002, user_id: 102, product_id: 202, amount: 25, status: 'paid' },
  { id: 1003, user_id: 103, product_id: 203, amount: 300, status: 'pending' },
  { id: 1004, user_id: 104, product_id: 201, amount: 1200, status: 'paid' },
  { id: 1005, user_id: 105, product_id: 202, amount: 25, status: 'cancelled' },
]

export const products: RowData[] = [
  { id: 201, name: 'Laptop', category: 'hardware', price: 1200 },
  { id: 202, name: 'Mouse', category: 'hardware', price: 25 },
  { id: 203, name: 'Monitor', category: 'hardware', price: 300 },
]

export const builtInTables: UserTable[] = [
  { name: 'users', rows: users, columns: Object.keys(users[0]), source: 'built-in sample' },
  { name: 'orders', rows: orders, columns: Object.keys(orders[0]), source: 'built-in sample' },
  { name: 'products', rows: products, columns: Object.keys(products[0]), source: 'built-in sample' },
]

export const presets: Preset[] = [
  { id: 'sql-scan', dialect: 'sql', label: '01 · Read every row', query: 'SELECT * FROM users;', description: 'Thấy rõ sequential scan khi query không có predicate.', category: 'foundations', difficulty: 'beginner', mode: 'row-play', goal: 'Đào toàn bộ row vào Result Chest.' },
  { id: 'sql-filter', dialect: 'sql', label: '02 · Keep or discard', query: 'SELECT * FROM users WHERE age > 18;', description: 'Mỗi row phải đi qua cổng WHERE để được giữ hoặc loại.', category: 'filtering', difficulty: 'beginner', mode: 'row-play', goal: 'Phân loại row vào Result hoặc Filter Pit.' },
  { id: 'sql-null-filter', dialect: 'sql', label: '03 · Combine predicates', query: "SELECT * FROM users WHERE age >= 18 AND active = true;", description: 'So sánh cách AND yêu cầu row vượt qua nhiều điều kiện.', category: 'filtering', difficulty: 'beginner', mode: 'row-play', goal: 'Theo dõi predicate kết hợp trên từng row.' },
  { id: 'sql-project', dialect: 'sql', label: '04 · Shape the payload', query: 'SELECT name, city FROM users WHERE active = true;', description: 'Filter trước, sau đó chỉ gửi các column cần thiết về client.', category: 'shaping', difficulty: 'beginner', mode: 'row-play', goal: 'Hiểu projection làm payload nhỏ hơn thế nào.' },
  { id: 'sql-order-limit', dialect: 'sql', label: '05 · Sort then limit', query: 'SELECT name, age FROM users ORDER BY age DESC LIMIT 3;', description: 'Quan sát ORDER BY và LIMIT thay đổi output cuối.', category: 'shaping', difficulty: 'intermediate', mode: 'pipeline-play', goal: 'Nhận biết LIMIT không thay thế việc scan nguồn.' },
  { id: 'sql-index', dialect: 'sql', label: '06 · Index-assisted lookup', query: "SELECT name, city FROM users WHERE city = 'Hanoi' ORDER BY age DESC LIMIT 2;", description: 'So sánh lookup theo index giáo dục với sequential scan.', category: 'filtering', difficulty: 'intermediate', mode: 'pipeline-play', goal: 'Hiểu trade-off giữa scan và index lookup.' },
  { id: 'sql-inner-join', dialect: 'sql', label: '07 · Match two tables', query: 'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id;', description: 'Theo dõi hai input relation và các cặp row match.', category: 'joins', difficulty: 'intermediate', mode: 'pipeline-play', goal: 'Đọc join condition và intermediate relation.' },
  { id: 'sql-left-join', dialect: 'sql', label: '08 · Keep unmatched rows', query: 'SELECT u.name, o.amount FROM users u LEFT JOIN orders o ON u.id = o.user_id;', description: 'LEFT JOIN giữ user không có order tương ứng.', category: 'joins', difficulty: 'advanced', mode: 'pipeline-play', goal: 'Phân biệt matched và preserved-left rows.' },
  { id: 'sql-aggregate', dialect: 'sql', label: '09 · Group the revenue', query: 'SELECT u.city, SUM(o.amount) AS revenue FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.city;', description: 'Join, gom nhóm và tính tổng theo city.', category: 'analytics', difficulty: 'advanced', mode: 'pipeline-play', goal: 'Theo dõi aggregate tạo intermediate groups.' },
  { id: 'sql-join-filter', dialect: 'sql', label: '10 · Filter before the join', query: "SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = 'paid';", description: 'Xem DuckDB có đẩy filter xuống trước JOIN hay không.', category: 'joins', difficulty: 'advanced', mode: 'pipeline-play', goal: 'Đọc physical plan và filter pushdown.' },
  { id: 'mongo-scan', dialect: 'nosql', label: '01 · Scan a collection', query: 'db.users.find({})', description: 'Collection scan khi filter rỗng.', category: 'nosql', difficulty: 'beginner', mode: 'row-play', goal: 'Đưa mọi document qua collection output.' },
  { id: 'mongo-filter', dialect: 'nosql', label: '02 · Match documents', query: 'db.users.find({ age: { $gt: 18 } })', description: 'Match predicate trên từng document.', category: 'nosql', difficulty: 'beginner', mode: 'row-play', goal: 'Phân loại document theo predicate.' },
  { id: 'mongo-and', dialect: 'nosql', label: '03 · Match multiple rules', query: 'db.users.find({ $and: [{ active: true }, { age: { $gte: 18 } }] })', description: 'Kết hợp nhiều điều kiện trong document query.', category: 'nosql', difficulty: 'intermediate', mode: 'row-play', goal: 'Hiểu $and khi nhiều predicate cùng tồn tại.' },
  { id: 'mongo-project', dialect: 'nosql', label: '04 · Project documents', query: "db.users.find({ active: true }, { name: 1, role: 1, _id: 0 }).limit(3)", description: 'Match, projection và limit trong một document pipeline.', category: 'nosql', difficulty: 'intermediate', mode: 'pipeline-play', goal: 'Quan sát document shape thay đổi qua pipeline.' },
  { id: 'mongo-sort', dialect: 'nosql', label: '05 · Sort the collection', query: 'db.users.find({}).sort({ age: -1 }).limit(3)', description: 'Sort và limit sau collection scan.', category: 'nosql', difficulty: 'intermediate', mode: 'pipeline-play', goal: 'Phân biệt scan, sort và limit.' },
]
