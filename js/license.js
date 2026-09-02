// ===========================
// 授权管理（软性使用期限控制）
// ===========================
//
// 说明：这不是真正的密码学安全授权方案——签名算法和密钥都在前端源码里，
// 愿意读代码的人可以自己伪造授权码。它的目的是防止普通用户在试用期/授权到期后
// 无意/随手继续使用，而不是防范蓄意破解的高级用户。如果需要更强的保护，
// 需要把校验逻辑放到服务端做（当前 server/ 后端未接入此校验）。
//
// 使用规则：
//   1. 首次安装（第一次在这台设备/浏览器上创建账套）起，自动获得 90 天免费试用，
//      试用起始日期记录在 data.js 的 init() 里（wms_trialStartDate）。
//   2. 试用期内 / 已激活有效授权码期间，系统正常使用。
//   3. 试用期满 90 天、且未激活有效授权码时，启动会被拦截，显示到期提示和联系方式。
//   4. 激活了授权码之后，以授权码的到期日期为准（不再看试用期）；授权码过期后同样拦截。
//
// 授权码格式：base64(JSON.stringify(payload)) + '.' + 十六位签名
// payload 字段：
//   c  客户名称
//   i  签发日期 (YYYY-MM-DD)
//   e  到期日期 (YYYY-MM-DD)，到期日当天仍可使用，次日零点后视为过期
//   n  备注（可选）
//   id 授权编号（仅供人工核对，不做唯一性校验）
//   u  最大并发在线用户数（可选，仅对正式授权生效，试用期不限）。
//      只有连接了后端数据库服务（多端共享模式）时才能统计"同一账套同时在线人数"，
//      由 js/app.js 的 SessionGuard 通过心跳向 server/server.js 上报/校验，
//      纯本地单机模式没有中心节点可统计，不受此项限制。
//
// 与 tools/授权码生成工具.html 中的算法和密钥必须保持完全一致。

const LicenseGate = {
  // 签名密钥：仅用于生成/校验授权码的完整性，不是真正的保密密钥（源码可见）
  _SECRET: 'wms-license-v1-8f3a2c91',
  _STORAGE_KEY: 'wms_license',
  _TRIAL_START_KEY: 'wms_trialStartDate',
  _TRIAL_DAYS: 90,

  CONTACT: { wechat: 'yoyouren', email: '360479727@qq.com' },

  // 简单的带密钥哈希（cyrb128 变体），不依赖 Web Crypto API，
  // 保证在 file:// 协议下双击打开也能正常工作（crypto.subtle 在部分环境下受安全上下文限制）
  _keyedHash(secret, str) {
    const s = secret + '::' + str;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  },

  // Unicode 安全的 base64（客户名称可能含中文）
  _b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  },
  _b64decode(b64) {
    return decodeURIComponent(escape(atob(b64)));
  },

  // 生成授权码（生成工具和这里都会用到同一份逻辑）
  generate(payload) {
    const json = JSON.stringify(payload);
    const b64 = this._b64encode(json);
    const sig = this._keyedHash(this._SECRET, b64);
    return b64 + '.' + sig;
  },

  // 校验授权码格式与签名，返回 { valid, payload, error }
  parse(code) {
    if (!code || typeof code !== 'string' || !code.includes('.')) {
      return { valid: false, error: '授权码格式不正确' };
    }
    const dotIdx = code.lastIndexOf('.');
    const b64 = code.slice(0, dotIdx);
    const sig = code.slice(dotIdx + 1);
    if (this._keyedHash(this._SECRET, b64) !== sig) {
      return { valid: false, error: '授权码签名校验失败，可能被篡改或输入有误' };
    }
    let payload;
    try {
      payload = JSON.parse(this._b64decode(b64));
    } catch (e) {
      return { valid: false, error: '授权码内容解析失败' };
    }
    if (!payload || !payload.e) {
      return { valid: false, error: '授权码缺少到期日期信息' };
    }
    return { valid: true, payload };
  },

  // 校验授权码签名是否有效、是否在有效期内，返回 { valid, expired, payload, error }
  verify(code) {
    const parsed = this.parse(code);
    if (!parsed.valid) return { valid: false, expired: false, error: parsed.error };
    const today = new Date().toISOString().slice(0, 10);
    const expired = parsed.payload.e < today;
    return { valid: !expired, expired, payload: parsed.payload };
  },

  // 激活（保存）一个新授权码；成功返回 { ok: true, payload }，失败返回 { ok: false, error }
  activate(code) {
    const trimmed = (code || '').trim();
    const result = this.verify(trimmed);
    if (result.error) return { ok: false, error: result.error };
    if (result.expired) return { ok: false, error: `该授权码已于 ${result.payload.e} 到期，请联系提供方获取新授权码` };
    localStorage.setItem(this._STORAGE_KEY, trimmed);
    return { ok: true, payload: result.payload };
  },

  // 清除已保存的授权码（回到试用期计算逻辑）
  clear() {
    localStorage.removeItem(this._STORAGE_KEY);
  },

  // 试用期状态：{ startDate, endDate, daysLeft, active }
  // daysLeft 为负数表示已超出试用期多少天
  getTrialStatus() {
    const startDate = localStorage.getItem(this._TRIAL_START_KEY) || new Date().toISOString().slice(0, 10);
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(start.getTime() + this._TRIAL_DAYS * 86400000);
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00');
    const daysLeft = Math.round((end - today) / 86400000);
    return {
      startDate,
      endDate: end.toISOString().slice(0, 10),
      daysLeft,
      active: daysLeft >= 0
    };
  },

  // 综合状态：优先看已激活的授权码，没有/无效则回退到试用期
  // 返回 { mode: 'license'|'trial', valid, expired, payload, trial }
  getStatus() {
    const code = localStorage.getItem(this._STORAGE_KEY);
    const trial = this.getTrialStatus();
    if (code) {
      const result = this.verify(code);
      if (result.error) {
        // 授权码存在但格式损坏：视同无授权码，回退到试用期逻辑，避免因为存储损坏被永久锁死
        return { mode: 'trial', valid: trial.active, expired: !trial.active, payload: null, trial, codeError: result.error };
      }
      return { mode: 'license', valid: result.valid, expired: result.expired, payload: result.payload, trial };
    }
    return { mode: 'trial', valid: trial.active, expired: !trial.active, payload: null, trial };
  },

  // 系统启动时调用：试用期内或已激活有效授权码则不拦截，否则拦截
  isBlocked() {
    const status = this.getStatus();
    return !status.valid;
  }
};
