// 智能业务管理系统 - 服务端数据库后端
// Node.js + Express + better-sqlite3
// 与前端 js/data.js 的 localStorage 语义一一对应：
//   DB.get(key)        <-> GET  /api/:accountId/:collection
//   DB.set(key, val)   <-> PUT  /api/:accountId/:collection
//   账套整体拉取/写入   <-> GET/PUT /api/:accountId/_all
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s => s.trim()) }));

// 集合名/账套ID 只允许字母数字下划线短横线，防止路径注入类问题
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,64}$/;
function validKey(v) { return typeof v === 'string' && SAFE_KEY.test(v); }

function asyncRoute(fn) {
  return (req, res) => {
    try {
      fn(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'internal_error' });
    }
  };
}

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ===== 账套管理 =====
app.get('/api/accounts', asyncRoute((req, res) => {
  res.json(db.listAccounts());
}));

app.post('/api/accounts', asyncRoute((req, res) => {
  const { name, desc, id: clientId } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name_required' });
  // 允许前端传入已经生成好的账套 id（保持本地 localStorage 与服务端账套 id 一致），
  // 不传则由服务端生成，兼容直接调用 API 的场景
  let id = clientId;
  if (id !== undefined) {
    if (!validKey(id)) return res.status(400).json({ error: 'invalid_account_id' });
    if (db.getAccount(id)) return res.status(409).json({ error: 'account_already_exists' });
  } else {
    id = 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }
  const acc = db.createAccount(id, name, desc);
  res.status(201).json(acc);
}));

app.put('/api/accounts/:id', asyncRoute((req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  const { name, desc } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name_required' });
  const acc = db.renameAccount(req.params.id, name, desc);
  if (!acc) return res.status(404).json({ error: 'account_not_found' });
  res.json(acc);
}));

app.delete('/api/accounts/:id', asyncRoute((req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  if (req.params.id === 'default') return res.status(400).json({ error: 'cannot_delete_default_account' });
  const ok = db.deleteAccount(req.params.id);
  if (!ok) return res.status(404).json({ error: 'account_not_found' });
  res.json({ ok: true });
}));

app.get('/api/accounts/:id/stats', asyncRoute((req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  res.json(db.getAccountStats(req.params.id));
}));

// ===== 全局配置（系统名称/主题/打印设置等，不随账套隔离） =====
app.get('/api/config/:key', asyncRoute((req, res) => {
  if (!validKey(req.params.key)) return res.status(400).json({ error: 'invalid_key' });
  const value = db.getConfig(req.params.key);
  res.json({ key: req.params.key, value });
}));

app.put('/api/config/:key', asyncRoute((req, res) => {
  if (!validKey(req.params.key)) return res.status(400).json({ error: 'invalid_key' });
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'value_required' });
  db.setConfig(req.params.key, value);
  res.json({ ok: true });
}));

// ===== 账套内集合批量同步（前端初始化/切换账套时一次性拉取全部集合） =====
app.get('/api/:accountId/_all', asyncRoute((req, res) => {
  if (!validKey(req.params.accountId)) return res.status(400).json({ error: 'invalid_account_id' });
  if (!db.getAccount(req.params.accountId)) return res.status(404).json({ error: 'account_not_found' });
  res.json(db.getAllCollections(req.params.accountId));
}));

app.put('/api/:accountId/_all', asyncRoute((req, res) => {
  if (!validKey(req.params.accountId)) return res.status(400).json({ error: 'invalid_account_id' });
  const dataMap = req.body;
  if (!dataMap || typeof dataMap !== 'object' || Array.isArray(dataMap)) {
    return res.status(400).json({ error: 'object_body_required' });
  }
  db.setAllCollections(req.params.accountId, dataMap);
  res.json({ ok: true });
}));

// ===== 单个集合读写（前端每次 DB.set(key, val) 触发一次） =====
app.get('/api/:accountId/:collection', asyncRoute((req, res) => {
  const { accountId, collection } = req.params;
  if (!validKey(accountId) || !validKey(collection)) return res.status(400).json({ error: 'invalid_key' });
  if (!db.getAccount(accountId)) return res.status(404).json({ error: 'account_not_found' });
  res.json(db.getCollection(accountId, collection));
}));

app.put('/api/:accountId/:collection', asyncRoute((req, res) => {
  const { accountId, collection } = req.params;
  if (!validKey(accountId) || !validKey(collection)) return res.status(400).json({ error: 'invalid_key' });
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'array_body_required' });
  db.setCollection(accountId, collection, req.body);
  res.json({ ok: true });
}));

app.use((req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`WMS API server listening on http://localhost:${PORT}`);
});
