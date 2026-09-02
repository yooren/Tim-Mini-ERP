// 数据库后端选择器：按 DB_TYPE 环境变量（server/.env，默认 sqlite）加载对应实现。
// 两个实现（db-sqlite.js / db-mysql.js）暴露完全一样的 async 方法接口，
// server.js 统一 await 调用，不需要关心具体用的是哪个数据库。
const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

let impl;
if (DB_TYPE === 'mysql') {
  impl = require('./db-mysql');
} else if (DB_TYPE === 'sqlite') {
  impl = require('./db-sqlite');
} else {
  throw new Error(`不支持的 DB_TYPE: "${DB_TYPE}"，请在 server/.env 中设置为 "sqlite" 或 "mysql"`);
}

module.exports = impl;
