// Tim Mini ERP - 服务端数据库后端（Tim Ren Studio 工作室出品）
// Node.js + Express + 可选 SQLite（默认，内置 node:sqlite）或 MySQL（DB_TYPE=mysql，见 db-mysql.js）
// 与前端 js/data.js 的 localStorage 语义一一对应：
//   DB.get(key)        <-> GET  /api/:accountId/:collection
//   DB.set(key, val)   <-> PUT  /api/:accountId/:collection
//   账套整体拉取/写入   <-> GET/PUT /api/:accountId/_all
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const db = require('./db');
const { writeEnvUpdates } = require('./env-config');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s => s.trim()) }));

// 集合名/账套ID 只允许字母数字下划线短横线，防止路径注入类问题
const SAFE_KEY = /^[a-zA-Z0-9_-]{1,64}$/;
function validKey(v) { return typeof v === 'string' && SAFE_KEY.test(v); }

// db.js 里两个后端实现的方法都是 async 的，这里统一 await，
// 出错（包括 MySQL 连接失败等）统一落到这个 catch 里返回 500
function asyncRoute(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch(err => {
      console.error(err);
      res.status(500).json({ error: err.message || 'internal_error' });
    });
  };
}

// ===== 健康检查 =====
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), dbType: db.type });
});

// ===== 账套管理 =====
app.get('/api/accounts', asyncRoute(async (req, res) => {
  res.json(await db.listAccounts());
}));

app.post('/api/accounts', asyncRoute(async (req, res) => {
  const { name, desc, id: clientId } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name_required' });
  // 允许前端传入已经生成好的账套 id（保持本地 localStorage 与服务端账套 id 一致），
  // 不传则由服务端生成，兼容直接调用 API 的场景
  let id = clientId;
  if (id !== undefined) {
    if (!validKey(id)) return res.status(400).json({ error: 'invalid_account_id' });
    if (await db.getAccount(id)) return res.status(409).json({ error: 'account_already_exists' });
  } else {
    id = 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  }
  const acc = await db.createAccount(id, name, desc);
  res.status(201).json(acc);
}));

app.put('/api/accounts/:id', asyncRoute(async (req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  const { name, desc } = req.body || {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name_required' });
  const acc = await db.renameAccount(req.params.id, name, desc);
  if (!acc) return res.status(404).json({ error: 'account_not_found' });
  res.json(acc);
}));

app.delete('/api/accounts/:id', asyncRoute(async (req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  if (req.params.id === 'default') return res.status(400).json({ error: 'cannot_delete_default_account' });
  const ok = await db.deleteAccount(req.params.id);
  if (!ok) return res.status(404).json({ error: 'account_not_found' });
  res.json({ ok: true });
}));

app.get('/api/accounts/:id/stats', asyncRoute(async (req, res) => {
  if (!validKey(req.params.id)) return res.status(400).json({ error: 'invalid_account_id' });
  res.json(await db.getAccountStats(req.params.id));
}));

// ===== 全局配置（系统名称/主题/打印设置等，不随账套隔离） =====
app.get('/api/config/:key', asyncRoute(async (req, res) => {
  if (!validKey(req.params.key)) return res.status(400).json({ error: 'invalid_key' });
  const value = await db.getConfig(req.params.key);
  res.json({ key: req.params.key, value });
}));

app.put('/api/config/:key', asyncRoute(async (req, res) => {
  if (!validKey(req.params.key)) return res.status(400).json({ error: 'invalid_key' });
  const { value } = req.body || {};
  if (value === undefined) return res.status(400).json({ error: 'value_required' });
  await db.setConfig(req.params.key, value);
  res.json({ ok: true });
}));

// ===== 账套内集合批量同步（前端初始化/切换账套时一次性拉取全部集合） =====
app.get('/api/:accountId/_all', asyncRoute(async (req, res) => {
  if (!validKey(req.params.accountId)) return res.status(400).json({ error: 'invalid_account_id' });
  if (!(await db.getAccount(req.params.accountId))) return res.status(404).json({ error: 'account_not_found' });
  res.json(await db.getAllCollections(req.params.accountId));
}));

app.put('/api/:accountId/_all', asyncRoute(async (req, res) => {
  if (!validKey(req.params.accountId)) return res.status(400).json({ error: 'invalid_account_id' });
  const dataMap = req.body;
  if (!dataMap || typeof dataMap !== 'object' || Array.isArray(dataMap)) {
    return res.status(400).json({ error: 'object_body_required' });
  }
  await db.setAllCollections(req.params.accountId, dataMap);
  res.json({ ok: true });
}));

// ===== 单个集合读写（前端每次 DB.set(key, val) 触发一次） =====
app.get('/api/:accountId/:collection', asyncRoute(async (req, res) => {
  const { accountId, collection } = req.params;
  if (!validKey(accountId) || !validKey(collection)) return res.status(400).json({ error: 'invalid_key' });
  if (!(await db.getAccount(accountId))) return res.status(404).json({ error: 'account_not_found' });
  res.json(await db.getCollection(accountId, collection));
}));

app.put('/api/:accountId/:collection', asyncRoute(async (req, res) => {
  const { accountId, collection } = req.params;
  if (!validKey(accountId) || !validKey(collection)) return res.status(400).json({ error: 'invalid_key' });
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'array_body_required' });
  await db.setCollection(accountId, collection, req.body);
  res.json({ ok: true });
}));

// ===== 后台一键配置数据库（写 .env + 自动重启后端使配置生效） =====
// 注意：和其它接口一样没有做身份校验，跟当前项目"局域网内网自用、无登录鉴权"的
// 整体安全模型一致；如果部署在不受信任的网络里，请自行加一层反向代理鉴权。
function validateDbConfigInput(body) {
  const dbType = body.dbType;
  if (dbType !== 'sqlite' && dbType !== 'mysql') return '数据库类型只能是 sqlite 或 mysql';
  if (dbType === 'mysql') {
    const m = body.mysql || {};
    if (!m.host || typeof m.host !== 'string') return 'MySQL 主机地址不能为空';
    if (!m.port || isNaN(Number(m.port))) return 'MySQL 端口必须是数字';
    if (!m.user || typeof m.user !== 'string') return 'MySQL 用户名不能为空';
    if (!m.database || typeof m.database !== 'string') return 'MySQL 数据库名不能为空';
  }
  return null;
}

async function testMysqlConnection(m) {
  const conn = await mysql.createConnection({
    host: m.host, port: Number(m.port), user: m.user, password: m.password || '',
    connectTimeout: 5000
  });
  try {
    const [rows] = await conn.query('SELECT VERSION() AS v');
    return { ok: true, version: rows[0].v };
  } finally {
    await conn.end();
  }
}

app.post('/api/admin/test-db-config', asyncRoute(async (req, res) => {
  const err = validateDbConfigInput(req.body || {});
  if (err) return res.status(400).json({ ok: false, error: err });
  if (req.body.dbType === 'sqlite') return res.json({ ok: true });
  try {
    const result = await testMysqlConnection(req.body.mysql);
    res.json(result);
  } catch (e) {
    // 连接失败是正常的用户输入错误场景，不当成服务端异常，200 返回 ok:false 让前端展示具体原因
    res.json({ ok: false, error: e.code || e.message });
  }
}));

app.post('/api/admin/apply-db-config', asyncRoute(async (req, res) => {
  const err = validateDbConfigInput(req.body || {});
  if (err) return res.status(400).json({ ok: false, error: err });

  if (req.body.dbType === 'mysql') {
    // 应用前再测一次连接，避免保存了一个连不上的配置导致重启后服务起不来
    try {
      await testMysqlConnection(req.body.mysql);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'MySQL 连接测试失败：' + (e.code || e.message) });
    }
  }

  const updates = { DB_TYPE: req.body.dbType };
  if (req.body.dbType === 'mysql') {
    const m = req.body.mysql;
    updates.MYSQL_HOST = m.host;
    updates.MYSQL_PORT = String(m.port);
    updates.MYSQL_USER = m.user;
    updates.MYSQL_PASSWORD = m.password || '';
    updates.MYSQL_DATABASE = m.database;
  }
  writeEnvUpdates(updates);

  res.json({ ok: true, message: '配置已保存，服务即将自动重启以生效...' });

  // 延迟一下，确保上面的 HTTP 响应先真正发出去，再重启进程；
  // 用同一个 node 可执行文件重新拉起 server.js（stdio 继承，日志还是打在原来的窗口/终端里）。
  //
  // 坑：child_process.spawn 默认会把当前进程的 process.env 整个继承给子进程；
  // 而当前进程早先用 dotenv.config() 加载过旧的 .env，已经把 DB_TYPE/MYSQL_* 这些
  // 写进了 process.env 里。dotenv 的默认行为是"环境变量已存在就不覆盖"，所以子进程
  // 再执行 dotenv.config() 读新 .env 时，会因为这些 key 在继承来的 env 里已经有旧值
  // 而被跳过，实际还是用的旧配置——表现为"重启了但配置没生效"。这里显式把这次改动
  // 涉及的 key 从 process.env 里删掉，子进程继承到的就是"干净"的环境，dotenv 才能
  // 真正从新写好的 .env 文件里把新值灌进去。
  Object.keys(updates).forEach(key => { delete process.env[key]; });

  setTimeout(() => {
    const child = spawn(process.argv[0], [__filename], {
      cwd: __dirname,
      detached: true,
      stdio: 'inherit'
    });
    child.unref();
    process.exit(0);
  }, 300);
}));

// ===== 并发在线人数会话追踪（配合正式授权码里的最大并发用户数限制） =====
// 只在"连接了本后端"的场景下才有意义——内存里按账套维护一个 sessionId -> 最后心跳时间
// 的表，服务重启后表清空（相当于所有人重新计数一次），符合本项目"局域网内网自用、
// 软性限制"的整体安全模型，不追求防绕过。
const SESSION_TIMEOUT_MS = 60 * 1000; // 60秒没有心跳视为已离线
const sessionsByAccount = new Map(); // accountId -> Map(sessionId -> lastSeenMs)

function pruneAccountSessions(accountId) {
  const sessions = sessionsByAccount.get(accountId);
  if (!sessions) return new Map();
  const now = Date.now();
  for (const [sid, lastSeen] of sessions) {
    if (now - lastSeen > SESSION_TIMEOUT_MS) sessions.delete(sid);
  }
  return sessions;
}

function validSessionBody(body) {
  return body && validKey(body.accountId) && typeof body.sessionId === 'string' && body.sessionId.length > 0 && body.sessionId.length <= 128;
}

// 登录时调用：尝试占用一个并发名额。已在线（同一 sessionId 已存在）视为续期，直接放行。
app.post('/api/session/acquire', (req, res) => {
  if (!validSessionBody(req.body)) return res.status(400).json({ ok: false, error: 'invalid_body' });
  const { accountId, sessionId } = req.body;
  const maxUsers = Number(req.body.maxUsers);
  let sessions = pruneAccountSessions(accountId);
  if (!sessions.has(sessionId) && Number.isInteger(maxUsers) && maxUsers > 0 && sessions.size >= maxUsers) {
    return res.json({ ok: false, count: sessions.size });
  }
  if (!sessionsByAccount.has(accountId)) sessionsByAccount.set(accountId, sessions);
  sessions.set(sessionId, Date.now());
  res.json({ ok: true, count: sessions.size });
});

// 登录后定时调用：续期，避免超时被判定离线；服务端重启导致名额表清空时顺便补registered。
app.post('/api/session/heartbeat', (req, res) => {
  if (!validSessionBody(req.body)) return res.status(400).json({ ok: false, error: 'invalid_body' });
  const { accountId, sessionId } = req.body;
  const sessions = pruneAccountSessions(accountId);
  if (!sessionsByAccount.has(accountId)) sessionsByAccount.set(accountId, sessions);
  sessions.set(sessionId, Date.now());
  res.json({ ok: true });
});

// 退出登录/关闭页面时调用：主动释放名额（尽力而为，不保证一定送达）。
app.post('/api/session/release', (req, res) => {
  if (!validSessionBody(req.body)) return res.status(400).json({ ok: false, error: 'invalid_body' });
  const { accountId, sessionId } = req.body;
  const sessions = sessionsByAccount.get(accountId);
  if (sessions) sessions.delete(sessionId);
  res.json({ ok: true });
});

app.use((req, res) => res.status(404).json({ error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`WMS API server listening on http://localhost:${PORT} (DB_TYPE=${db.type})`);
});
