// 读写 server/.env 的小工具，供「后台一键配置数据库」功能使用。
// 只做按行的 KEY=value 更新/追加，不引入额外的 .env 解析库。
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '.env.example');

function readEnvLines() {
  const source = fs.existsSync(ENV_PATH) ? ENV_PATH : ENV_EXAMPLE_PATH;
  if (!fs.existsSync(source)) return [];
  return fs.readFileSync(source, 'utf-8').split(/\r?\n/);
}

// updates: { KEY: value, ... } —— 更新已存在的 KEY=... 行，不存在的追加到末尾。
// 写入前会把当前 .env（如果存在）备份成 .env.bak，避免写坏了没法恢复。
function writeEnvUpdates(updates) {
  let lines = readEnvLines();
  const seen = new Set();
  lines = lines.map(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (m && Object.prototype.hasOwnProperty.call(updates, m[1])) {
      seen.add(m[1]);
      return `${m[1]}=${updates[m[1]]}`;
    }
    return line;
  });
  Object.keys(updates).forEach(key => {
    if (!seen.has(key)) lines.push(`${key}=${updates[key]}`);
  });

  if (fs.existsSync(ENV_PATH)) {
    fs.copyFileSync(ENV_PATH, ENV_PATH + '.bak');
  }
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}

module.exports = { writeEnvUpdates, ENV_PATH };
