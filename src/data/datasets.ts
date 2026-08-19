import type { Preset, RowData } from '../lib/types'

export const users: RowData[] = [
  { id: 101, name: 'An', age: 17, role: 'student', active: true, city: 'Hanoi' },
  { id: 102, name: 'Bình', age: 24, role: 'engineer', active: true, city: 'Da Nang' },
  { id: 103, name: 'Chi', age: 31, role: 'designer', active: false, city: 'HCMC' },
  { id: 104, name: 'Dũng', age: 42, role: 'engineer', active: true, city: 'Hanoi' },
  { id: 105, name: 'Hà', age: 19, role: 'student', active: true, city: 'HCMC' },
  { id: 106, name: 'Lan', age: 28, role: 'pm', active: false, city: 'Da Nang' },
]

export const presets: Preset[] = [
  { id: 'sql-scan', dialect: 'sql', label: 'Full table scan', query: 'SELECT * FROM users;', description: 'Không có WHERE: database phải đọc toàn bộ bảng.' },
  { id: 'sql-filter', dialect: 'sql', label: 'Filter theo tuổi', query: 'SELECT * FROM users WHERE age > 18;', description: 'Đọc row, kiểm tra predicate và loại các row không đạt.' },
  { id: 'sql-index', dialect: 'sql', label: 'Index + projection', query: "SELECT name, city FROM users WHERE city = 'Hanoi' ORDER BY age DESC LIMIT 2;", description: 'Tìm theo index thành phố, sắp xếp và giới hạn kết quả.' },
  { id: 'mongo-scan', dialect: 'nosql', label: 'Collection scan', query: 'db.users.find({})', description: 'Filter rỗng: MongoDB-like engine duyệt toàn bộ document.' },
  { id: 'mongo-filter', dialect: 'nosql', label: 'Match document', query: 'db.users.find({ age: { $gt: 18 } })', description: 'Match predicate trên từng document.' },
  { id: 'mongo-project', dialect: 'nosql', label: 'Projection + limit', query: "db.users.find({ active: true }, { name: 1, role: 1, _id: 0 }).limit(3)", description: 'Match, chỉ giữ field cần thiết và trả tối đa 3 document.' },
]
