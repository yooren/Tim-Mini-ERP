// 数据库访问层 - MySQL 实现：用 mysql2/promise 连接独立部署的 MySQL/MariaDB 数据库。
// 接口与 db-sqlite.js 完全一致（都是 async 方法），server.js 不需要关心当前用的是哪个后端，
// 只由 db.js 根据 DB_TYPE 环境变量选择加载哪一个。
//
// 环境变量（server/.env，参考 .env.example）：
//   DB_TYPE=mysql
//   MYSQL_HOST=localhost
//   MYSQL_PORT=3306
//   MYSQL_USER=root
//   MYSQL_PASSWORD=你的密码
//   MYSQL_DATABASE=wms_db
//
// 需要先执行 `npm install`（package.json 已包含 mysql2 依赖）。
// 目标 MySQL/MariaDB 账号需要有 CREATE DATABASE 权限（首次启动会自动建库建表），
// 如果账号权限受限没有建库权限，请先手动执行:
//   CREATE DATABASE wms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
const mysql = require('mysql2/promise');

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = Number(process.env.MYSQL_PORT) || 3306;
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'wms_db';

let pool = null;
// 首次真正用到数据库之前完成建库建表；ready 是这个初始化过程的 Promise，
// 所有导出的方法都先 await ready 再执行，避免"表还没建好就先查询"的时序问题。
const ready = (async () => {
  // 先不指定 database 连一次，负责建库（多数托管 MySQL 也允许普通账号建库；
  // 如果账号没有建库权限，这一步会失败，此时请按上面注释手动建库后重启服务）
  const bootstrapConn = await mysql.createConnection({
    host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER, password: MYSQL_PASSWORD
  });
  await bootstrapConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrapConn.end();

  pool = mysql.createPool({
    host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER, password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4_unicode_ci'
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      \`desc\` TEXT,
      created_at VARCHAR(32) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS global_config (
      \`key\` VARCHAR(191) PRIMARY KEY,
      value LONGTEXT NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // data 用 LONGTEXT：单个集合（比如商品带图片base64）可能超过 TEXT 的 64KB 上限
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collections (
      account_id VARCHAR(64) NOT NULL,
      collection VARCHAR(191) NOT NULL,
      data LONGTEXT NOT NULL,
      updated_at VARCHAR(32) NOT NULL,
      PRIMARY KEY (account_id, collection),
      INDEX idx_collections_account (account_id),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await pool.execute('SELECT id FROM accounts WHERE id = ?', ['default']);
  if (rows.length === 0) {
    await pool.execute(
      'INSERT INTO accounts (id, name, `desc`, created_at) VALUES (?, ?, ?, ?)',
      ['default', '演示账套', '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放', new Date().toISOString().slice(0, 10)]
    );
  }
})();

const now = () => new Date().toISOString();

module.exports = {
  type: 'mysql',
  get raw() { return pool; },

  // ===== 账套 =====
  async listAccounts() {
    await ready;
    const [rows] = await pool.execute(
      'SELECT id, name, `desc`, created_at AS createdAt FROM accounts ORDER BY created_at'
    );
    return rows;
  },
  async getAccount(id) {
    await ready;
    const [rows] = await pool.execute(
      'SELECT id, name, `desc`, created_at AS createdAt FROM accounts WHERE id = ?', [id]
    );
    return rows[0] || null;
  },
  async createAccount(id, name, desc) {
    await ready;
    await pool.execute(
      'INSERT INTO accounts (id, name, `desc`, created_at) VALUES (?, ?, ?, ?)',
      [id, name, desc || '', new Date().toISOString().slice(0, 10)]
    );
    return this.getAccount(id);
  },
  async renameAccount(id, name, desc) {
    await ready;
    const acc = await this.getAccount(id);
    if (!acc) return null;
    await pool.execute(
      'UPDATE accounts SET name = ?, `desc` = COALESCE(?, `desc`) WHERE id = ?',
      [name, desc ?? null, id]
    );
    return this.getAccount(id);
  },
  async deleteAccount(id) {
    await ready;
    if (id === 'default') return false;
    const [result] = await pool.execute('DELETE FROM accounts WHERE id = ?', [id]);
    // collections 通过外键 ON DELETE CASCADE 自动一起删除，这里不用再手动删一次
    return result.affectedRows > 0;
  },

  // ===== 全局配置（不随账套变化，如系统名称/主题/打印设置） =====
  async getConfig(key) {
    await ready;
    const [rows] = await pool.execute('SELECT value FROM global_config WHERE `key` = ?', [key]);
    return rows.length ? rows[0].value : null;
  },
  async setConfig(key, value) {
    await ready;
    await pool.execute(
      `INSERT INTO global_config (\`key\`, value, updated_at) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
      [key, value, now()]
    );
  },

  // ===== 账套内集合（每个 key 对应前端一个 localStorage 数组，如 goods/inbounds/...） =====
  async getCollection(accountId, collection) {
    await ready;
    const [rows] = await pool.execute(
      'SELECT data FROM collections WHERE account_id = ? AND collection = ?', [accountId, collection]
    );
    return rows.length ? JSON.parse(rows[0].data) : [];
  },
  async setCollection(accountId, collection, data) {
    await ready;
    if (!(await this.getAccount(accountId))) throw new Error('account_not_found');
    await pool.execute(
      `INSERT INTO collections (account_id, collection, data, updated_at) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
      [accountId, collection, JSON.stringify(data), now()]
    );
  },
  async getAllCollections(accountId) {
    await ready;
    const [rows] = await pool.execute(
      'SELECT collection, data FROM collections WHERE account_id = ?', [accountId]
    );
    const out = {};
    rows.forEach(r => { out[r.collection] = JSON.parse(r.data); });
    return out;
  },
  async setAllCollections(accountId, dataMap) {
    await ready;
    if (!(await this.getAccount(accountId))) throw new Error('account_not_found');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const ts = now();
      for (const [collection, data] of Object.entries(dataMap)) {
        await conn.execute(
          `INSERT INTO collections (account_id, collection, data, updated_at) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
          [accountId, collection, JSON.stringify(data), ts]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  async getAccountStats(accountId) {
    await ready;
    const [rows] = await pool.execute(
      'SELECT collection, data FROM collections WHERE account_id = ?', [accountId]
    );
    let dataCount = 0;
    rows.forEach(r => {
      try {
        const v = JSON.parse(r.data);
        if (Array.isArray(v)) dataCount += v.length;
      } catch (e) {}
    });
    return { keyCount: rows.length, dataCount };
  }
};
