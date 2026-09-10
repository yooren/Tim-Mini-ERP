// 本地升级包机制：参照传统进销存软件的做法，面向"客户部署环境不一定联网"的场景，
// 走"厂商打好升级包 -> 客户在系统设置里自己上传 -> 系统就地替换代码文件"的路线，
// 不依赖任何外网检查更新的接口，客户完全离线也能升级。
//
// 升级包的约定格式（zip，由 tools/build-upgrade-package.js 打包生成）：
//   version.json            { "version": "1.1.0", "releaseNotes": "..." }
//   web-src/                里面的每一项（TimMiniERP.html、LOGO.svg、css/、js/、docs/ ...）
//                           原样覆盖到安装目录根下的同名文件/文件夹
//   server-src/             里面的每一项（server.js、db.js、db-sqlite.js ... 等 *.js 文件）
//                           原样覆盖到 server/ 目录下的同名文件（不含 node_modules/、data/）
//   server-package.json     （可选）新的 server/package.json，仅用于比对依赖是否变化，
//                           不会自动覆盖真正的 package.json、也不会自动跑 npm install——
//                           依赖变了会在返回结果里提示，交给管理员自己决定何时手动处理
//
// 覆盖前会把即将被替换的每一项，从当前安装目录复制一份到 server/data/upgrade-backups/<时间戳>/，
// 出问题可以用 rollback 一键复原；server/data/ 目录本身（账套数据库文件）和 .env 配置
// 永远不在替换范围内，不会被升级包影响。
//
// 不做自动重启：Node 进程在没有守护进程（pm2/systemd等）看管的情况下自己重启自己并不可靠——
// 万一新代码有问题，进程退出后可能就没人把它重新拉起来了。应用完成后提示管理员手动重启一次
// （重新运行"一键启动"脚本，或手动重新执行 node server.js）。
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const SERVER_DIR = __dirname; // .../server
const INSTALL_ROOT = path.join(SERVER_DIR, '..'); // 安装目录根，TimMiniERP.html 所在位置
const TMP_DIR = path.join(SERVER_DIR, 'data', 'upgrade-tmp');
const BACKUP_ROOT = path.join(SERVER_DIR, 'data', 'upgrade-backups');

// 无论升级包里写了什么，这些名字永远不允许被当作 web-src 的顶层条目替换，
// 防止升级包（不管是恶意的还是打包时手滑）把 server 目录本身或其数据覆盖掉
const FORBIDDEN_WEB_ENTRIES = new Set(['server', 'node_modules', '.git']);
const FORBIDDEN_SERVER_ENTRIES = new Set(['node_modules', 'data', '.env']);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function err(message, status) {
  return Object.assign(new Error(message), { expose: true, status: status || 400 });
}

// zip-slip 防护：确保解压出来的每个文件都落在预期目录内，不能靠文件名里的 ../ 跳出去
function safeExtract(zip, destDir) {
  ensureDir(destDir);
  const resolvedDest = path.resolve(destDir);
  for (const entry of zip.getEntries()) {
    const target = path.resolve(destDir, entry.entryName);
    if (target !== resolvedDest && !target.startsWith(resolvedDest + path.sep)) {
      throw err('升级包内容不合法（存在越界路径），已拒绝解压');
    }
  }
  zip.extractAllTo(destDir, true);
}

function readVersionInfo(extractedDir) {
  const versionFile = path.join(extractedDir, 'version.json');
  if (!fs.existsSync(versionFile)) throw err('升级包缺少 version.json，无法识别版本信息');
  let info;
  try {
    info = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
  } catch {
    throw err('version.json 格式不正确');
  }
  if (!info.version) throw err('version.json 缺少 version 字段');
  return info;
}

// 列出一个目录下的顶层条目名（文件或文件夹），目录不存在则返回空数组
function listTopLevel(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

async function applyPackage(zipFilePath, operator, db) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extractDir = path.join(TMP_DIR, stamp);

  const zip = new AdmZip(zipFilePath);
  safeExtract(zip, extractDir);

  try {
    return await applyExtracted(extractDir, stamp, operator, db);
  } finally {
    // 不管应用成功还是校验失败中途抛出，临时解压目录都要清掉，避免每次失败尝试都留一份垃圾数据
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

async function applyExtracted(extractDir, stamp, operator, db) {
  const versionInfo = readVersionInfo(extractDir);
  const newWebSrcDir = path.join(extractDir, 'web-src');
  const newServerSrcDir = path.join(extractDir, 'server-src');
  const newPkgPath = path.join(extractDir, 'server-package.json');

  const webEntries = listTopLevel(newWebSrcDir).filter(e => !FORBIDDEN_WEB_ENTRIES.has(e.toLowerCase()));
  const serverEntries = listTopLevel(newServerSrcDir).filter(e => !FORBIDDEN_SERVER_ENTRIES.has(e.toLowerCase()));

  if (!webEntries.length && !serverEntries.length) {
    throw err('升级包内既没有 web-src 也没有 server-src 的有效内容，无内容可应用');
  }

  // package.json 变了通常意味着依赖也变了，npm install 这种耗时且可能失败的操作不适合
  // 放在一次 HTTP 请求里自动跑，这里只检测并如实告知，交给管理员自己决定何时手动执行
  let dependenciesChanged = false;
  if (fs.existsSync(newPkgPath)) {
    try {
      const newPkg = JSON.parse(fs.readFileSync(newPkgPath, 'utf-8'));
      const curPkg = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf-8'));
      dependenciesChanged = JSON.stringify(newPkg.dependencies || {}) !== JSON.stringify(curPkg.dependencies || {});
    } catch {
      dependenciesChanged = true; // 读不出来就保守地提醒一下，让人自己核实
    }
  }

  // 备份：把即将被替换的每一项，从当前安装目录复制一份到 backupDir 下，结构跟 web-src/server-src 一一对应
  const backupDir = path.join(BACKUP_ROOT, stamp);
  const backupWebDir = path.join(backupDir, 'web-src');
  const backupServerDir = path.join(backupDir, 'server-src');
  webEntries.forEach(entry => {
    const src = path.join(INSTALL_ROOT, entry);
    if (fs.existsSync(src)) {
      ensureDir(backupWebDir);
      fs.cpSync(src, path.join(backupWebDir, entry), { recursive: true });
    }
  });
  serverEntries.forEach(entry => {
    const src = path.join(SERVER_DIR, entry);
    if (fs.existsSync(src)) {
      ensureDir(backupServerDir);
      fs.cpSync(src, path.join(backupServerDir, entry), { recursive: true });
    }
  });
  const fromVersion = (db && (await db.getConfig('appVersion'))) || readCurrentPackageVersion();
  ensureDir(backupDir);
  fs.writeFileSync(path.join(backupDir, 'meta.json'), JSON.stringify({
    fromVersion, toVersion: versionInfo.version, appliedAt: new Date().toISOString(),
    operator, webEntries, serverEntries
  }, null, 2));

  // 真正替换：逐项覆盖，而不是整目录删了重建，避免误伤没在这次升级包范围内的其它文件
  webEntries.forEach(entry => {
    const dest = path.join(INSTALL_ROOT, entry);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(newWebSrcDir, entry), dest, { recursive: true });
  });
  serverEntries.forEach(entry => {
    const dest = path.join(SERVER_DIR, entry);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(newServerSrcDir, entry), dest, { recursive: true });
  });
  // package.json 本身不自动覆盖——依赖变化只提醒，真正落地交给管理员手动 npm install 完再确认，
  // 避免自动改了依赖清单但没装包，导致服务起不来

  if (db) await db.setConfig('appVersion', versionInfo.version);

  return {
    version: versionInfo.version, releaseNotes: versionInfo.releaseNotes || '',
    dependenciesChanged, backupStamp: stamp, webEntries, serverEntries
  };
}

function readCurrentPackageVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'package.json'), 'utf-8')).version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function getCurrentVersion(db) {
  const fromConfig = db && (await db.getConfig('appVersion'));
  return fromConfig || readCurrentPackageVersion();
}

async function listBackups() {
  ensureDir(BACKUP_ROOT);
  const dirs = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true }).filter(d => d.isDirectory());
  const rows = [];
  for (const d of dirs) {
    const metaPath = path.join(BACKUP_ROOT, d.name, 'meta.json');
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch { meta = {}; }
    }
    rows.push({ stamp: d.name, ...meta });
  }
  return rows.sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1));
}

async function rollback(stamp, operator, db) {
  if (!/^[0-9TZ.\-]+$/.test(stamp || '')) throw err('备份标识不合法');
  const backupDir = path.join(BACKUP_ROOT, stamp);
  if (!fs.existsSync(backupDir)) throw err('找不到这份备份', 404);

  const backupWebDir = path.join(backupDir, 'web-src');
  const backupServerDir = path.join(backupDir, 'server-src');
  listTopLevel(backupWebDir).forEach(entry => {
    const dest = path.join(INSTALL_ROOT, entry);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(backupWebDir, entry), dest, { recursive: true });
  });
  listTopLevel(backupServerDir).forEach(entry => {
    const dest = path.join(SERVER_DIR, entry);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(backupServerDir, entry), dest, { recursive: true });
  });

  let meta = {};
  try { meta = JSON.parse(fs.readFileSync(path.join(backupDir, 'meta.json'), 'utf-8')); } catch { meta = {}; }
  if (meta.fromVersion && db) await db.setConfig('appVersion', meta.fromVersion);
  return { restoredVersion: meta.fromVersion || null };
}

module.exports = { applyPackage, listBackups, rollback, getCurrentVersion, TMP_DIR };
