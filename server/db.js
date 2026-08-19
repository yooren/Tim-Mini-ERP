// 数据库访问层：使用 Node.js 内置 node:sqlite（Node 22.5+ 自带，无需原生编译依赖）。
// schema 设计与前端 localStorage 的 "账套(account) + 集合(collection) => JSON数组" 模型
// 一一对应，前端 js/data.js 的 get/set 语义可以零改造地映射到 HTTP API。
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'wms.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    desc TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS global_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS collections (
    account_id TEXT NOT NULL,
    collection TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (account_id, collection),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_collections_account ON collections(account_id);
`);

// 确保默认（演示）账套存在
const defaultAccount = db.prepare('SELECT id FROM accounts WHERE id = ?').get('default');
if (!defaultAccount) {
  db.prepare('INSERT INTO accounts (id, name, desc, created_at) VALUES (?, ?, ?, ?)')
    .run('default', '演示账套', '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放', new Date().toISOString().slice(0, 10));
}

const now = () => new Date().toISOString();

module.exports = {
  raw: db,

  // ===== 账套 =====
  listAccounts() {
    return db.prepare('SELECT id, name, desc, created_at as createdAt FROM accounts ORDER BY created_at').all();
  },
  getAccount(id) {
    return db.prepare('SELECT id, name, desc, created_at as createdAt FROM accounts WHERE id = ?').get(id);
  },
  createAccount(id, name, desc) {
    db.prepare('INSERT INTO accounts (id, name, desc, created_at) VALUES (?, ?, ?, ?)')
      .run(id, name, desc || '', new Date().toISOString().slice(0, 10));
    return this.getAccount(id);
  },
  renameAccount(id, name, desc) {
    const acc = this.getAccount(id);
    if (!acc) return null;
    db.prepare('UPDATE accounts SET name = ?, desc = COALESCE(?, desc) WHERE id = ?')
      .run(name, desc ?? null, id);
    return this.getAccount(id);
  },
  deleteAccount(id) {
    if (id === 'default') return false;
    const info = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    db.prepare('DELETE FROM collections WHERE account_id = ?').run(id);
    return info.changes > 0;
  },

  // ===== 全局配置（不随账套变化，如系统名称/主题/打印设置） =====
  getConfig(key) {
    const row = db.prepare('SELECT value FROM global_config WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  setConfig(key, value) {
    db.prepare(`
      INSERT INTO global_config (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now());
  },

  // ===== 账套内集合（每个 key 对应前端一个 localStorage 数组，如 goods/inbounds/...） =====
  getCollection(accountId, collection) {
    const row = db.prepare('SELECT data FROM collections WHERE account_id = ? AND collection = ?')
      .get(accountId, collection);
    return row ? JSON.parse(row.data) : [];
  },
  setCollection(accountId, collection, data) {
    // 账套必须存在才允许写入集合数据，避免脏数据堆积
    if (!this.getAccount(accountId)) throw new Error('account_not_found');
    db.prepare(`
      INSERT INTO collections (account_id, collection, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, collection) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `).run(accountId, collection, JSON.stringify(data), now());
  },
  getAllCollections(accountId) {
    const rows = db.prepare('SELECT collection, data FROM collections WHERE account_id = ?').all(accountId);
    const out = {};
    rows.forEach(r => { out[r.collection] = JSON.parse(r.data); });
    return out;
  },
  setAllCollections(accountId, dataMap) {
    if (!this.getAccount(accountId)) throw new Error('account_not_found');
    const stmt = db.prepare(`
      INSERT INTO collections (account_id, collection, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, collection) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    `);
    db.exec('BEGIN');
    try {
      const ts = now();
      for (const [collection, data] of Object.entries(dataMap)) {
        stmt.run(accountId, collection, JSON.stringify(data), ts);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  },
  getAccountStats(accountId) {
    const rows = db.prepare('SELECT collection, data FROM collections WHERE account_id = ?').all(accountId);
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
