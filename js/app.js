// ===========================
// 主应用逻辑
// ===========================

let currentUser = null;
let currentPage = 'dashboard';
let sidebarCollapsed = false;

// ===== 主题系统 =====
const ThemeManager = {
  themes: [
    { id: 'theme-default', name: '清新蓝', icon: '💙' },
    { id: 'theme-business', name: '商务蓝', icon: '💼' },
    { id: 'theme-green', name: '活力绿', icon: '💚' },
    { id: 'theme-purple', name: '优雅紫', icon: '💜' },
    { id: 'theme-orange', name: '温暖橙', icon: '🧡' },
    { id: 'theme-dark', name: '暗夜黑', icon: '🌙' },
    { id: 'theme-pink', name: '粉色浪漫', icon: '💗' }
  ],
  
  current: 'theme-default',
  
  init() {
    const saved = localStorage.getItem('wms_theme') || 'theme-default';
    this.apply(saved);
  },
  
  apply(themeId) {
    // 移除所有主题
    this.themes.forEach(t => document.body.classList.remove(t.id));
    // 应用新主题
    document.body.classList.add(themeId);
    this.current = themeId;
    localStorage.setItem('wms_theme', themeId);
  },
  
  getHtml() {
    return this.themes.map(t => `
      <div onclick="ThemeManager.apply('${t.id}');closeModal()"
        style="padding:12px 16px;border-radius:10px;cursor:pointer;border:2px solid ${this.current === t.id ? 'var(--primary)' : 'var(--border)'};background:${this.current === t.id ? 'var(--primary-light)' : 'var(--card-bg)'};display:flex;align-items:center;gap:10px;transition:all 0.2s"
        onmouseenter="this.style.borderColor='var(--primary)'"
        onmouseleave="this.style.borderColor='${this.current === t.id ? 'var(--primary)' : 'var(--border)'}'">
        <span style="font-size:20px">${t.icon}</span>
        <div>
          <div style="font-weight:600;font-size:13px;color:${this.current === t.id ? 'var(--primary)' : 'var(--text)'}">${t.name}</div>
          ${this.current === t.id ? '<div style="font-size:11px;color:var(--primary)">✓ 当前使用</div>' : ''}
        </div>
      </div>
    `).join('');
  }
};

// ===== 音频系统 =====
const AudioSys = {
  ctx: null,
  enabled: true,
  
  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.log('音频不支持');
    }
  },
  
  // 成功提示音 - 清脆的"叮"
  success() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(880, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.2), 80);
  },
  
  // 错误提示音 - 低沉的"咚"
  error() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(200, 0.3, 'triangle', 0.4);
    setTimeout(() => this.playTone(150, 0.4, 'triangle', 0.3), 150);
  },
  
  // 警告提示音 - 中音"嗡"
  warning() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(440, 0.2, 'sawtooth', 0.25);
  },
  
  // 点击音效 - 轻微的"嗒"
  click() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(1200, 0.05, 'sine', 0.1);
  },
  
  // 删除音效 - 下降的"嗖"
  delete() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(600, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(300, 0.2, 'sine', 0.15), 100);
  },
  
  // 播放音调
  playTone(freq, duration, type = 'sine', volume = 0.3) {
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  
  // 切换开关
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
};

// ===== 自动备份与同步模块 =====
const AutoBackupSync = {
  backupTimer: null,
  syncChannel: null,
  lastSyncHash: '',
  dirty: false,

  // 计算当前所有数据的哈希指纹（用于检测变更）
  getHash() {
    const keys = ['users','goods','categories','suppliers','customers','departments','employees','claimRecords','inbounds','outbounds','inventories','audit',
      'invoices','customerPrices','carriers','freightTemplates','transportPlans','deliveryOrders',
      'boms','bomSubstitutes','ecns','productionOrders','processes','orderProcesses','workReports',
      'equipment','tools','outsourcingOrders','outsourcingMaterials',
      'incomingInspections','processInspections','finalInspections','qualityNCRs','spcRecords','qualityCertificates',
      'serviceTickets'];
    let data = '';
    keys.forEach(k => { data += localStorage.getItem('wms_' + k) || ''; });
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const chr = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString(36);
  },

  // 标记数据已变更
  markDirty() {
    this.dirty = true;
    // 如果自动同步已开启，立即同步
    if (localStorage.getItem('wms_autoSync') !== 'false') {
      this._broadcastSync();
    }
  },

  // === 自动备份逻辑 ===
  startAutoBackup() {
    this.stopAutoBackup();
    const interval = parseInt(localStorage.getItem('wms_autoBackupInterval') || '30') * 60 * 1000;
    // 首次立即检查一次
    this._doBackupCheck();
    this.backupTimer = setInterval(() => this._doBackupCheck(), interval);
  },

  stopAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  },

  _doBackupCheck() {
    const currentHash = this.getHash();
    if (currentHash === this.lastSyncHash) return; // 数据没变，跳过
    this.lastSyncHash = currentHash;
    this._saveBackup();
  },

  _saveBackup() {
    try {
      const data = {};
      ['users','goods','categories','units','locations','suppliers','customers','departments','employees','claimRecords',
        'inbounds','outbounds','inventories','audits',
        'invoices','customerPrices','carriers','freightTemplates','transportPlans','deliveryOrders',
        'boms','bomSubstitutes','ecns','productionOrders','processes','orderProcesses','workReports',
        'equipment','tools','outsourcingOrders','outsourcingMaterials',
        'incomingInspections','processInspections','finalInspections','qualityNCRs','spcRecords','qualityCertificates',
        'serviceTickets'
      ].forEach(k => {
        data[k] = JSON.parse(localStorage.getItem('wms_' + k) || '[]');
      });
      data._backupInfo = {
        version: '3.0.0',
        createdAt: new Date().toISOString(),
        type: 'auto',
        auto: true
      };
      // 保存到 IndexedDB（比 localStorage 容量更大）
      const request = indexedDB.open('WMS_Backup', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readwrite');
        const store = tx.objectStore('backups');
        // 保留最近 5 个自动备份
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const backups = getAll.result.sort((a, b) => b.timestamp - a.timestamp);
          // 删除超出数量的旧备份
          if (backups.length >= 5) {
            backups.slice(5).forEach(b => store.delete(b.id));
          }
        };
        // 写入新备份
        store.put({
          id: 'auto_' + Date.now(),
          timestamp: Date.now(),
          date: new Date().toLocaleString('zh-CN'),
          size: JSON.stringify(data).length,
          data: JSON.stringify(data)
        });
        console.log('[WMS] 自动备份完成', new Date().toLocaleTimeString('zh-CN'));
      };
      request.onerror = () => {
        console.warn('[WMS] IndexedDB 不可用，自动备份跳过');
      };
    } catch (e) {
      console.warn('[WMS] 自动备份失败:', e.message);
    }
  },

  // === 自动同步逻辑（多标签页数据一致性） ===
  startAutoSync() {
    this.stopAutoSync();
    this.lastSyncHash = this.getHash();
    // 监听 storage 事件（其他标签页的变更）
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('wms_')) {
        this.lastSyncHash = this.getHash();
      }
    });
  },

  stopAutoSync() {
    // 移除监听通过 storage 事件自动处理
    this.lastSyncHash = '';
  },

  _broadcastSync() {
    // 利用 localStorage 事件广播机制
    // storage 事件只在其他标签页触发，当前标签页通过 hash 对比即可
    this.dirty = false;
  },

  // 初始化：根据设置自动启动
  init() {
    this.lastSyncHash = this.getHash();
    // 自动备份默认关闭，如果用户已开启则启动
    if (localStorage.getItem('wms_autoBackup') === 'true') {
      this.startAutoBackup();
    }
    // 自动同步默认开启
    if (localStorage.getItem('wms_autoSync') !== 'false') {
      this.startAutoSync();
    }
    // 包装 DB.set 以支持变更检测
    const originalSet = DB.set.bind(DB);
    DB.set = function(key, val) {
      originalSet(key, val);
      AutoBackupSync.markDirty();
    };
  }
};

// ===== 欢迎页进度条 =====
function runWelcome() {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  const steps = [
    [15, '正在加载数据...'],
    [35, '初始化模块...'],
    [55, '加载用户配置...'],
    [75, '准备界面组件...'],
    [90, '最后一步...'],
    [100, '启动完成！']
  ];
  let i = 0;
  const run = () => {
    if (i < steps.length) {
      const [pct, msg] = steps[i];
      fill.style.width = pct + '%';
      text.textContent = msg;
      i++;
      setTimeout(run, 350 + Math.random() * 250);
    } else {
      setTimeout(() => {
        document.getElementById('welcomePage').style.opacity = '0';
        document.getElementById('welcomePage').style.transition = 'opacity 0.6s ease';
        setTimeout(() => {
          document.getElementById('welcomePage').classList.add('hidden');
          checkAutoLogin();
        }, 600);
      }, 400);
    }
  };
  setTimeout(run, 600);
}

// ===== 隐藏的授权管理入口 =====
// 连续点击侧边栏版本号 5 次（2 秒内）打开授权管理面板，不出现在任何菜单里
let _versionClickCount = 0;
let _versionClickTimer = null;
function handleVersionClick() {
  _versionClickCount++;
  clearTimeout(_versionClickTimer);
  _versionClickTimer = setTimeout(() => { _versionClickCount = 0; }, 2000);
  if (_versionClickCount >= 5) {
    _versionClickCount = 0;
    openLicensePanel();
  }
}

function openLicensePanel() {
  const status = LicenseGate.getStatus();
  let statusClass = 'ok', statusHtml = '';
  if (status.mode === 'license') {
    const daysLeft = Math.round((new Date(status.payload.e) - new Date(new Date().toISOString().slice(0,10))) / 86400000);
    statusClass = status.valid ? (daysLeft <= 7 ? 'warn' : 'ok') : 'danger';
    statusHtml = `
      <div style="font-weight:700;margin-bottom:6px">${status.valid ? '✅ 授权有效' : '❌ 授权已过期'}</div>
      <div style="font-size:13px;color:var(--text-muted);line-height:1.8">
        客户名称：${status.payload.c || '-'}<br>
        签发日期：${status.payload.i || '-'}<br>
        到期日期：${status.payload.e}<br>
        ${status.valid ? `剩余 ${daysLeft} 天` : `已过期 ${-daysLeft} 天`}
        ${status.payload.n ? `<br>备注：${status.payload.n}` : ''}
      </div>`;
  } else {
    statusClass = status.valid ? (status.trial.daysLeft <= 7 ? 'warn' : 'ok') : 'danger';
    statusHtml = `
      <div style="font-weight:700;margin-bottom:6px">${status.valid ? '🕐 试用期内' : '❌ 试用期已结束'}</div>
      <div style="font-size:13px;color:var(--text-muted);line-height:1.8">
        试用开始：${status.trial.startDate}<br>
        试用截止：${status.trial.endDate}<br>
        ${status.valid ? `剩余 ${status.trial.daysLeft} 天` : `已超出 ${-status.trial.daysLeft} 天`}
        ${status.codeError ? `<br><span style="color:var(--danger)">（曾保存的授权码已损坏：${status.codeError}，已回退为试用期计算）</span>` : ''}
      </div>`;
  }

  openModal('🔑 授权管理', `
    <div class="license-status-card ${statusClass}">${statusHtml}</div>
    <div style="margin-bottom:16px;padding:10px 14px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--text-muted)">
      联系方式 — 微信：<strong>${LicenseGate.CONTACT.wechat}</strong> ｜ 邮箱：<strong>${LicenseGate.CONTACT.email}</strong>
    </div>
    <div class="form-item">
      <label>激活新授权码</label>
      <textarea id="licPanelInput" rows="3" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:monospace;font-size:12.5px;box-sizing:border-box" placeholder="粘贴授权码..."></textarea>
    </div>
    <div id="licPanelMsg" class="license-activate-msg hidden"></div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">关闭</button>
    ${status.mode === 'license' ? `<button class="btn btn-outline" onclick="clearLicenseFromPanel()">清除已保存授权码</button>` : ''}
    <button class="btn btn-primary" onclick="activateLicenseFromPanel()">激活</button>
  `);
}

function activateLicenseFromPanel() {
  const input = document.getElementById('licPanelInput');
  const msgEl = document.getElementById('licPanelMsg');
  const result = LicenseGate.activate(input.value);
  msgEl.classList.remove('hidden', 'success', 'error');
  if (result.ok) {
    msgEl.classList.add('success');
    msgEl.textContent = `激活成功！有效期至 ${result.payload.e}`;
    toast('授权码已激活', 'success');
    setTimeout(() => openLicensePanel(), 800);
  } else {
    msgEl.classList.add('error');
    msgEl.textContent = result.error;
  }
}

function clearLicenseFromPanel() {
  LicenseGate.clear();
  toast('已清除已保存的授权码，回退为试用期计算', 'info');
  openLicensePanel();
}

// ===== 授权拦截 =====
// 试用期/授权码到期后，用这个页面代替登录页，不让继续进入系统
function showLicenseBlock() {
  const status = LicenseGate.getStatus();
  const titleEl = document.getElementById('licBlockTitle');
  const descEl = document.getElementById('licBlockDesc');
  if (status.mode === 'license') {
    titleEl.textContent = '授权已到期';
    descEl.textContent = `当前授权码已于 ${status.payload.e} 到期，请联系我们获取新的授权码后继续使用。`;
  } else {
    titleEl.textContent = '试用期已结束';
    descEl.textContent = `90 天免费试用期已于 ${status.trial.endDate} 结束，请联系我们获取正式授权码后继续使用。`;
  }
  document.getElementById('licContactWechat').textContent = LicenseGate.CONTACT.wechat;
  document.getElementById('licContactEmail').textContent = LicenseGate.CONTACT.email;
  document.getElementById('licenseBlockPage').classList.remove('hidden');
}

function activateLicenseFromBlock() {
  const input = document.getElementById('licActivateInput');
  const msgEl = document.getElementById('licActivateMsg');
  const result = LicenseGate.activate(input.value);
  msgEl.classList.remove('hidden', 'success', 'error');
  if (result.ok) {
    msgEl.classList.add('success');
    msgEl.textContent = `激活成功！授权有效期至 ${result.payload.e}，正在进入系统...`;
    setTimeout(() => {
      document.getElementById('licenseBlockPage').classList.add('hidden');
      checkAutoLogin();
    }, 1000);
  } else {
    msgEl.classList.add('error');
    msgEl.textContent = result.error;
  }
}

// ===== 并发在线人数控制（配合正式授权码里的最大并发用户数限制）=====
// 只有连接了后端数据库服务（多端共享模式）时才能统计"同一账套同时在线人数"，
// 纯本地单机模式下 DB._syncEnabled 为 false，不做任何限制（技术上也无法判断）。
const SessionGuard = {
  _timer: null,

  // 每个浏览器标签页一个 sessionId（同一标签刷新页面沿用同一个，关闭标签后失效）
  getSessionId() {
    let id = sessionStorage.getItem('wms_sessionId');
    if (!id) {
      id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('wms_sessionId', id);
    }
    return id;
  },

  // 登录时尝试占用一个并发名额；未连接后端或未设置上限时直接放行
  async acquire(accountId, maxUsers) {
    if (!maxUsers || !DB._syncEnabled) return { ok: true };
    try {
      const res = await fetch(DB.getApiBase() + '/api/session/acquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, sessionId: this.getSessionId(), maxUsers })
      });
      return await res.json();
    } catch (e) {
      // 后端请求异常（比如刚好断网）：按软性限制的原则，不因为网络问题把人挡在外面
      return { ok: true };
    }
  },

  startHeartbeat(accountId) {
    this.stopHeartbeat();
    if (!DB._syncEnabled) return;
    this._timer = setInterval(() => {
      fetch(DB.getApiBase() + '/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, sessionId: this.getSessionId() })
      }).catch(() => {});
    }, 20000);
  },

  stopHeartbeat() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  release(accountId) {
    this.stopHeartbeat();
    if (!DB._syncEnabled) return;
    try {
      fetch(DB.getApiBase() + '/api/session/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, sessionId: this.getSessionId() }),
        keepalive: true
      }).catch(() => {});
    } catch (e) { /* 忽略：释放名额是尽力而为，不影响退出登录本身 */ }
  }
};

window.addEventListener('beforeunload', () => {
  if (currentUser) SessionGuard.release(DB.getCurrentAccount());
});

// ===== 登录相关 =====
async function checkAutoLogin() {
  if (LicenseGate.isBlocked()) {
    showLicenseBlock();
    return;
  }
  const saved = localStorage.getItem('wms_autologin');
  if (saved) {
    const user = JSON.parse(saved);
    const licenseStatus = LicenseGate.getStatus();
    const maxUsers = licenseStatus.mode === 'license' ? licenseStatus.payload.u : null;
    if (maxUsers && DB.getApiBase()) {
      await DB.checkSync();
      const acquireResult = await SessionGuard.acquire(DB.getCurrentAccount(), maxUsers);
      if (!acquireResult.ok) {
        // 记住登录但并发名额已满：不强行进入，退回登录页让用户看到提示并手动重试
        document.getElementById('loginPage').classList.remove('hidden');
        const loginErrorEl = document.getElementById('loginError');
        loginErrorEl.textContent = `当前账套并发在线人数已达授权上限（${maxUsers}人），请等待其他用户下线后再试`;
        loginErrorEl.classList.remove('hidden');
        return;
      }
      SessionGuard.startHeartbeat(DB.getCurrentAccount());
    }
    loginSuccess(user);
  } else {
    document.getElementById('loginPage').classList.remove('hidden');
  }
}

async function doLogin() {
  // 防御性二次校验：极端情况下（比如登录页停留跨越了到期日）避免绕过拦截
  if (LicenseGate.isBlocked()) {
    document.getElementById('loginPage').classList.add('hidden');
    showLicenseBlock();
    return;
  }
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  // 切换账套（如果用户选择了不同的账套）
  const accSelect = document.getElementById('loginAccountSet');
  if (accSelect) {
    const selectedAcc = accSelect.value;
    const currentAcc = DB.getCurrentAccount();
    if (selectedAcc !== currentAcc) {
      DB.switchAccount(selectedAcc);
      DB.init(); // 重新初始化账套数据
    }
  }
  const users = DB.get('users');
  const user = users.find(u => u.username === username && u.password === password && u.status === 1);
  const loginErrorEl = document.getElementById('loginError');
  if (!user) {
    AudioSys.error();
    loginErrorEl.textContent = '账号或密码错误，请重试';
    loginErrorEl.classList.remove('hidden');
    document.getElementById('loginPassword').style.borderColor = '#ef4444';
    return;
  }
  // 正式授权且设置了最大并发在线人数、且配置了后端地址时，登录前先占用一个名额
  const licenseStatus = LicenseGate.getStatus();
  const maxUsers = licenseStatus.mode === 'license' ? licenseStatus.payload.u : null;
  if (maxUsers && DB.getApiBase()) {
    await DB.checkSync(); // 现测一次后端是否可达，避免用到过期的 _syncEnabled 状态
    const acquireResult = await SessionGuard.acquire(DB.getCurrentAccount(), maxUsers);
    if (!acquireResult.ok) {
      AudioSys.error();
      loginErrorEl.textContent = `当前账套并发在线人数已达授权上限（${maxUsers}人），请等待其他用户下线后再试`;
      loginErrorEl.classList.remove('hidden');
      return;
    }
  }
  AudioSys.success();
  loginErrorEl.classList.add('hidden');
  // 记住登录
  const remember = document.querySelector('.remember-me input').checked;
  if (remember) localStorage.setItem('wms_autologin', JSON.stringify({ ...user, _account: DB.getCurrentAccount() }));
  loginSuccess(user);
  if (maxUsers) SessionGuard.startHeartbeat(DB.getCurrentAccount());
}

function loginSuccess(user) {
  currentUser = user;
  document.getElementById('loginPage').style.opacity = '0';
  document.getElementById('loginPage').style.transition = 'opacity 0.4s ease';
  setTimeout(() => {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    initApp();
  }, 400);
}

function logout() {
  if (currentUser) SessionGuard.release(DB.getCurrentAccount());
  localStorage.removeItem('wms_autologin');
  currentUser = null;
  document.getElementById('mainApp').classList.add('hidden');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('loginPage').style.opacity = '1';
  // 重新应用品牌设置并刷新账套列表
  applyBranding();
  populateLoginAccountSets();
}

function togglePwd() {
  const inp = document.getElementById('loginPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ===== 初始化应用 =====
function initApp() {
  // 应用品牌自定义
  applyBranding();

  // 显示当前账套名称
  const accEl = document.getElementById('sidebarAccountName');
  if (accEl) {
    const accounts = DB.getAccounts();
    const currentAcc = DB.getCurrentAccount();
    const acc = accounts.find(a => a.id === currentAcc);
    accEl.textContent = acc ? `[${acc.name}] ` : '';
  }

  // 更新用户信息
  document.getElementById('currentUserName').textContent = currentUser.name;
  document.getElementById('currentUserRole').innerHTML = roleBadge(currentUser.role);
  updateUserAvatar();

  // 时钟
  updateTime();
  setInterval(updateTime, 1000);

  // 预警徽章
  updateWarningBadge();

  // 初始化自动备份与同步
  AutoBackupSync.init();

  // 加载默认页
  showPage('dashboard');

  // 授权/试用期临近到期提醒（登录后检查一次，不打扰正常使用）
  checkLicenseReminder();
}

// 授权码或试用期还剩 ≤7 天时提醒一次；已过期的情况在 checkAutoLogin() 里已经被拦截页挡住了，不会走到这里
function checkLicenseReminder() {
  const status = LicenseGate.getStatus();
  let daysLeft;
  if (status.mode === 'license') {
    daysLeft = Math.round((new Date(status.payload.e) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  } else {
    daysLeft = status.trial.daysLeft;
  }
  if (daysLeft >= 0 && daysLeft <= 7) {
    const what = status.mode === 'license' ? '授权' : '试用期';
    toast(`⏰ ${what}将于 ${daysLeft} 天后到期，请及时联系微信 ${LicenseGate.CONTACT.wechat} 或邮箱 ${LicenseGate.CONTACT.email} 续期`, 'warning');
  }
}

// 更新用户头像显示
function updateUserAvatar() {
  const avatarEl = document.getElementById('userAvatar');
  const avatar = currentUser.avatar;
  if (avatar && (avatar.startsWith('data:') || avatar.startsWith('http'))) {
    avatarEl.innerHTML = `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    avatarEl.textContent = avatar || currentUser.name?.slice(0,1).toUpperCase() || '?';
  }
}

// 打开编辑当前用户头像
function openEditMyAvatar() {
  const avatar = currentUser.avatar || '';
  const hasAvatar = avatar && (avatar.startsWith('data:') || avatar.startsWith('http'));
  openModal('修改头像', `
    <div style="text-align:center;padding:20px">
      <div id="myAvatarPreview" onclick="document.getElementById('myAvatarInput').click()"
        style="width:100px;height:100px;border-radius:50%;${hasAvatar ? 'padding:0;overflow:hidden' : 'background:linear-gradient(135deg,var(--primary),var(--secondary))'};display:flex;align-items:center;justify-content:center;color:white;font-size:36px;font-weight:700;cursor:pointer;margin:0 auto;border:3px dashed var(--border);transition:all 0.2s">
        ${hasAvatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover">` : (avatar || currentUser.name?.slice(0,1).toUpperCase() || '+')}
      </div>
      <input type="file" id="myAvatarInput" accept="image/*" style="display:none" onchange="handleMyAvatar(this)">
      <div style="font-size:12px;color:var(--text-muted);margin-top:12px">点击选择图片（不超过2MB）</div>
      ${hasAvatar ? `<button class="btn btn-ghost btn-sm" onclick="removeMyAvatar()" style="margin-top:8px">移除头像</button>` : ''}
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="saveMyAvatar()">保存</button>`);
}

// 处理头像上传
function handleMyAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('图片大小不能超过2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('myAvatarPreview');
    preview.style.background = 'transparent';
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    preview.dataset.newAvatar = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 移除头像
function removeMyAvatar() {
  const preview = document.getElementById('myAvatarPreview');
  preview.style.background = 'linear-gradient(135deg,var(--primary),var(--secondary))';
  preview.innerHTML = currentUser.name?.slice(0,1).toUpperCase() || '+';
  preview.dataset.removed = 'true';
}

// 保存头像
function saveMyAvatar() {
  try {
    const preview = document.getElementById('myAvatarPreview');
    if (!preview) {
      console.error('头像预览元素不存在');
      toast('保存失败：界面元素缺失', 'error');
      return;
    }
    
    const newAvatar = preview.dataset.newAvatar;
    const removed = preview.dataset.removed === 'true';
    
    // 检查 currentUser 是否有效
    if (!currentUser || currentUser.id === undefined) {
      console.error('当前用户信息无效');
      toast('保存失败：用户信息无效', 'error');
      return;
    }
    
    let avatarToSave = currentUser.avatar;
    if (removed) {
      avatarToSave = currentUser.name?.slice(0,1).toUpperCase() || 'A';
    } else if (newAvatar) {
      avatarToSave = newAvatar;
    }
    
    // 执行保存
    const result = DB.update('users', currentUser.id, { avatar: avatarToSave });
    if (!result) {
      console.error('数据库更新失败，ID:', currentUser.id);
      toast('保存失败：数据更新异常', 'error');
      return;
    }
    
    currentUser.avatar = avatarToSave;
    
    // 更新localStorage中的自动登录信息
    const autologin = localStorage.getItem('wms_autologin');
    if (autologin) {
      const userData = JSON.parse(autologin);
      if (userData.id === currentUser.id) {
        userData.avatar = avatarToSave;
        localStorage.setItem('wms_autologin', JSON.stringify(userData));
      }
    }
    
    updateUserAvatar();
    closeModal();
    toast('头像已更新！', 'success');
  } catch (e) {
    console.error('保存头像时出错:', e);
    toast('保存失败：' + e.message, 'error');
  }
}

function updateTime() {
  const el = document.getElementById('topbarTime');
  if (!el) return;
  const now = new Date();
  const weekdays = ['日','一','二','三','四','五','六'];
  el.textContent = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
    ' 周' + weekdays[now.getDay()] + ' ' +
    now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function updateWarningBadge() {
  const goods = DB.get('goods');
  const today = new Date().toISOString().slice(0, 10);
  // 库存预警
  const stockCount = goods.filter(g => g.stock <= g.minStock).length;
  // 设备维护到期预警
  const equipment = DB.get('equipment');
  const equipCount = equipment.filter(e => e.nextMaintenance && e.nextMaintenance < today && e.status !== '报废').length;
  // 售后超时工单预警
  const tickets = DB.get('serviceTickets') || [];
  const ticketCount = tickets.filter(t => [0, 1].includes(t.status) && t.dueDate && t.dueDate < today).length;

  const count = stockCount + equipCount + ticketCount;
  const badge = document.getElementById('badge-warning');
  const dot = document.getElementById('notifDot');
  if (count > 0) {
    badge.textContent = count;
    dot.classList.add('show');
  } else {
    badge.textContent = '';
    dot.classList.remove('show');
  }
}

// ===== 多标签页系统 =====
const TabManager = {
  tabs: [], // { id, page, name }
  _defaultMax: 10,

  get maxTabs() {
    const v = parseInt(localStorage.getItem('wms_maxTabs'));
    return (v >= 3 && v <= 30) ? v : this._defaultMax;
  },
  set maxTabs(val) {
    const v = parseInt(val);
    if (v >= 3 && v <= 30) {
      localStorage.setItem('wms_maxTabs', v);
    }
  },

  // 页面名称映射
  names: {
    dashboard: '数据看板', goods: '商品管理', inbound: '入库管理',
    outbound: '出库管理', record: '出入库明细', inventory: '库存盘点', transfer: '仓库调拨', warehouse: '仓库管理',
    supplier: '供应商管理',
    customer: '客户管理', department: '部门管理', report: '报表中心', finance: '财务管理', warning: '预警中心',
    audit: '审计日志', settings: '系统设置',
    invoice: '发票管理', customerPrice: '客户价格',
    carrier: '承运商管理', transportPlan: '运输计划', freight: '运费管理', tracking: '物流跟踪', delivery: '配送管理',
    bom: 'BOM管理', productionPlan: '生产计划', mes: '车间管理', outsourcing: '委外加工', quality: '质量管理',
    eam: '售后管理', hrm: '人力资源', crm: '客户关系管理', analytics: '数据分析中心', salesKpi: '销售KPI'
  },

  // 页面渲染器映射
  pages: null,

  // 添加或切换到标签页
  open(page) {
    if (!canAccessPage(page)) {
      toast('您没有权限访问该模块', 'error');
      return;
    }
    // 检查是否已存在
    let tab = this.tabs.find(t => t.page === page);
    if (tab) {
      this.active(tab.id);
    } else {
      // 添加新标签
      if (this.tabs.length >= this.maxTabs) {
        toast('标签页已达上限，请先关闭部分标签', 'warning');
        return;
      }
      tab = { id: Date.now(), page, name: this.names[page] || page };
      this.tabs.push(tab);
      this.active(tab.id);
    }
    this.render();
  },

  // 切换到指定标签
  active(id) {
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) return;
    this.activeId = id;
    this.renderPage(tab.page);
    this.render();
  },

  // 关闭标签
  close(id) {
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    this.tabs.splice(idx, 1);

    // 如果关闭的是当前标签，切换到上一个或下一个
    if (this.activeId === id) {
      if (this.tabs.length > 0) {
        const newIdx = Math.min(idx, this.tabs.length - 1);
        this.active(this.tabs[newIdx].id);
      } else {
        this.activeId = null;
        this.renderPage('dashboard');
      }
    }
    this.render();
  },

  // 关闭全部标签
  closeAll() {
    this.tabs = [];
    this.activeId = null;
    this.renderPage('dashboard');
    this.render();
  },

  // 渲染页面
  renderPage(page) {
    try {
      if (!canAccessPage(page)) {
        currentPage = page;
        document.getElementById('breadcrumb').textContent = this.names[page] || page;
        document.getElementById('pageContainer').innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">🔒</div><div>您没有权限访问该模块</div></div>';
        return;
      }
      currentPage = page;
      // 更新导航高亮
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const active = document.querySelector(`[data-page="${page}"]`);
      if (active) active.classList.add('active');

      // 更新面包屑
      document.getElementById('breadcrumb').textContent = this.names[page] || page;

      // 初始化页面映射（延迟初始化以确保所有模块已加载）
      if (!this.pages) {
        this.pages = { dashboard, goods, inbound, outbound, record, inventory, transfer, warehouse, supplier, customer, department, report, finance, warning, audit, settings,
          invoice, customerPrice, carrier, transportPlan, freight, tracking, delivery,
          bom, productionPlan, mes, outsourcing, quality,
          eam, hrm, crm, analytics, salesKpi
        };
      }

      // 渲染页面
      const renderer = this.pages[page];
      if (renderer) {
        const html = renderer.render();
        document.getElementById('pageContainer').innerHTML = html;
        renderer.init && renderer.init();
      } else {
        document.getElementById('pageContainer').innerHTML = '<div style="padding:40px;text-align:center;color:#999">页面模块未找到: ' + page + '</div>';
      }
    } catch(e) {
      console.error('渲染页面失败:', page, e);
      document.getElementById('pageContainer').innerHTML = '<div style="padding:40px;text-align:center;color:#f00">渲染失败: ' + e.message + '</div>';
    }
  },

  // 渲染标签栏
  render() {
    const tabList = document.getElementById('tabList');
    if (!tabList) return;

    tabList.innerHTML = this.tabs.map(tab => `
      <div class="tab-item ${tab.id === this.activeId ? 'active' : ''}" onclick="TabManager.active(${tab.id})">
        <span class="tab-item-title">${tab.name}</span>
        <span class="tab-item-close" onclick="event.stopPropagation();TabManager.close(${tab.id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      </div>
    `).join('');
  }
};

// 包装原来的 showPage，保持向后兼容
function showPage(page) {
  // 使用 TabManager 打开页面（自动处理标签页逻辑）
  TabManager.open(page);
}

// 关闭所有标签页
function closeAllTabs() {
  TabManager.closeAll();
}

// 导航点击使用 TabManager.open（初始化时 initApp 已调用 showPage，tabs 不为空，避免重复 open）
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.onclick = () => TabManager.open(el.dataset.page);
  });
});

// ===== 侧边栏折叠 =====
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  const mainApp = document.getElementById('mainApp');
  const collapseIcon = sidebar.querySelector('.icon-collapse');
  const expandIcon = sidebar.querySelector('.icon-expand');

  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  mainApp.classList.toggle('sidebar-collapsed', sidebarCollapsed);

  // 切换折叠/展开图标
  if (collapseIcon && expandIcon) {
    collapseIcon.style.display = sidebarCollapsed ? 'none' : '';
    expandIcon.style.display = sidebarCollapsed ? '' : 'none';
  }
}

// ===== 全局搜索（支持多模块） =====
function globalSearchFn() {
  const q = document.getElementById('globalSearch').value.trim().toLowerCase();
  if (!q) return;

  // 搜索范围：商品、供应商、客户、入库单、出库单、运输计划
  const results = [];
  const maxPerType = 3;

  // 商品
  const goods = DB.get('goods').filter(g =>
    (g.name || '').toLowerCase().includes(q) || (g.code || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  goods.forEach(g => results.push({ type: '商品', label: g.name, sub: g.code, page: 'goods', icon: '📦' }));

  // 供应商
  const suppliers = DB.get('suppliers').filter(s =>
    (s.name || '').toLowerCase().includes(q) || (s.contact || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  suppliers.forEach(s => results.push({ type: '供应商', label: s.name, sub: s.contact, page: 'supplier', icon: '🏭' }));

  // 客户
  const customers = DB.get('customers').filter(c =>
    (c.name || '').toLowerCase().includes(q) || (c.contact || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  customers.forEach(c => results.push({ type: '客户', label: c.name, sub: c.contact, page: 'customer', icon: '👥' }));

  // 入库单
  const inbounds = DB.get('inbounds').filter(r =>
    (r.code || '').toLowerCase().includes(q) || (r.goodsName || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  inbounds.forEach(r => results.push({ type: '入库单', label: r.code, sub: r.goodsName, page: 'inbound', icon: '📥' }));

  // 出库单
  const outbounds = DB.get('outbounds').filter(r =>
    (r.code || '').toLowerCase().includes(q) || (r.goodsName || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  outbounds.forEach(r => results.push({ type: '出库单', label: r.code, sub: r.goodsName, page: 'outbound', icon: '📤' }));

  // 运输计划
  const plans = DB.get('transportPlans').filter(p =>
    (p.planNo || '').toLowerCase().includes(q) || (p.customerName || '').toLowerCase().includes(q)
  ).slice(0, maxPerType);
  plans.forEach(p => results.push({ type: '运输计划', label: p.planNo, sub: p.customerName, page: 'transportPlan', icon: '🚚' }));

  if (results.length === 0) {
    toast('未找到匹配结果', 'info');
    return;
  }

  // 如果有精确匹配，直接跳转；否则显示搜索建议
  if (results.length === 1) {
    showPage(results[0].page);
    return;
  }

  // 显示搜索结果弹窗
  const html = `<div style="max-height:400px;overflow-y:auto">
    ${results.map((r, i) => `
      <div onclick="closeModal();showPage('${r.page}')" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;cursor:pointer;transition:background 0.15s;border-bottom:1px solid var(--border)"
        onmouseenter="this.style.background='var(--bg)'" onmouseleave="this.style.background='transparent'">
        <span style="font-size:20px">${r.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;color:var(--text)">${r.label}</div>
          <div style="font-size:11px;color:var(--text-muted)">${r.type} · ${r.sub || ''}</div>
        </div>
        <span class="badge badge-default" style="font-size:11px">${r.type}</span>
      </div>
    `).join('')}
  </div>`;
  openModal(`搜索结果（${results.length}条）`, html, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
}

// ===== 模态框 =====
function openModal(title, bodyHtml, footerHtml, wide = false) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('modalBox').className = 'modal-box' + (wide ? ' wide' : '');
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

// 点击遮罩关闭
document.getElementById('modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ===== Toast 提示 =====
function toast(msg, type = 'success', duration = 2800) {
  // 播放对应音效
  if (AudioSys[type]) AudioSys[type]();
  
  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${icons[type]}<span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ===== 确认框 =====
function confirm(msg, callback) {
  // 播放警告音效
  AudioSys.warning();
  
  openModal('确认操作',
    `<div style="text-align:center;padding:24px 0">
      <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div style="font-size:15px;color:#0f172a;font-weight:600;">${msg}</div>
      <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销，请谨慎操作</div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-danger" onclick="closeModal();AudioSys.delete();(${callback.toString()})()">确认删除</button>`
  );
}

// ===== 分页工具 =====
function renderPagination(total, page, pageSize, onPage) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return '';
  let html = `<div class="pagination">
    <div class="pagination-info">共 ${total} 条，第 ${page}/${totalPages} 页</div>
    <div class="pagination-btns">`;
  html += `<button class="page-btn" onclick="${onPage}(${page - 1})" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) {
      if (i === page - 3 || i === page + 3) html += `<button class="page-btn" disabled>...</button>`;
      continue;
    }
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${onPage}(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="${onPage}(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>›</button>`;
  html += `</div></div>`;
  return html;
}

// ===== 数字格式化 =====
function fmt(n) { return Number(n).toLocaleString('zh-CN'); }
function fmtMoney(n) { return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(s) { return s ? s.slice(0, 10) : '-'; }

// ===== 权限检查函数 =====
// 检查当前用户是否有权限执行某操作
// module: 模块key (如 'goods', 'inbound')
// action: 操作类型 (如 'view', 'create', 'edit', 'delete', 'export', 'import', 'print', 'approve')
function hasPerm(module, action) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true; // 管理员拥有所有权限
  const raw = localStorage.getItem(DB._prefix('permissions'));
  if (!raw) return false; // 未配置权限时默认拒绝，避免越权（新账套初始化时会自动写入默认矩阵）
  let data;
  try { data = JSON.parse(raw); } catch(e) { return false; }
  const rolePerms = data[currentUser.role];
  if (!rolePerms) return false; // 角色未配置时默认拒绝
  const modulePerms = rolePerms[module];
  if (!modulePerms) return false; // 模块未配置时默认拒绝
  if (Array.isArray(modulePerms) && modulePerms.length === 0) return false; // 模块已配置但无权限
  return modulePerms.includes(action);
}

// 检查是否可以访问某页面（用于侧边栏和路由）
function canAccessPage(page) {
  return hasPerm(page, 'view');
}

// ===== 角色管理辅助函数 =====
// 内置角色定义
const BUILTIN_ROLES = [
  { key: 'admin', name: '超级管理员', color: '#ef4444', builtIn: true, desc: '拥有系统所有权限，不可删除' },
  { key: 'staff', name: '仓库管理员', color: '#3b82f6', builtIn: true, desc: '负责日常仓库操作，不可删除' },
  { key: 'viewer', name: '只读用户', color: '#94a3b8', builtIn: true, desc: '只能查看数据和导出，不可删除' }
];

// 获取自定义角色列表
function getCustomRoles() {
  const raw = localStorage.getItem(DB._prefix('customRoles'));
  if (raw) { try { return JSON.parse(raw); } catch(e) {} }
  return [];
}

// 保存自定义角色列表
function saveCustomRoles(roles) {
  localStorage.setItem(DB._prefix('customRoles'), JSON.stringify(roles));
}

// 获取所有角色（内置 + 自定义）
function getAllRoles() {
  return [...BUILTIN_ROLES, ...getCustomRoles()];
}

// 根据角色key获取角色名
function getRoleName(roleKey) {
  const all = getAllRoles();
  const found = all.find(r => r.key === roleKey);
  return found ? found.name : roleKey;
}

// 根据角色key获取角色颜色
function getRoleColor(roleKey) {
  const all = getAllRoles();
  const found = all.find(r => r.key === roleKey);
  return found ? found.color : '#94a3b8';
}

// 生成角色 badge HTML
function roleBadge(roleKey) {
  const name = getRoleName(roleKey);
  const color = getRoleColor(roleKey);
  return `<span style="background:${color}18;color:${color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600">${name}</span>`;
}

// 生成角色下拉 <option> HTML
function roleOptions(selectedKey) {
  return getAllRoles().map(r =>
    `<option value="${r.key}" ${r.key===selectedKey?'selected':''}>${r.name}${r.builtIn?'':'✦'}</option>`
  ).join('');
}

// ===== Logo 设置应用 =====
function applyLogoSettings() {
  let ps = {};
  try { ps = JSON.parse(localStorage.getItem('wms_printSettings') || '{}'); } catch(e) {}
  const showLogo = ps.showLogo !== false; // 默认显示
  const logoUrl = ps.logoUrl || 'LOGO.png';
  
  // 更新所有 Logo 图片
  const logoImgs = document.querySelectorAll('#welcomeLogo, #loginLogo, #loginLogoCompact, #sidebarLogo img');
  logoImgs.forEach(img => {
    if (!showLogo) {
      img.style.display = 'none';
      // 隐藏父容器（侧边栏 Logo 容器）
      if (img.parentElement.id === 'sidebarLogo') {
        img.parentElement.style.display = 'none';
      }
    } else {
      img.style.display = '';
      img.src = logoUrl;
      if (img.parentElement.id === 'sidebarLogo') {
        img.parentElement.style.display = '';
      }
    }
  });
}

// ===== CSV 导入/导出工具函数 =====

// 下载CSV文件（全局通用）
function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 导出表格数据为CSV
function exportTableToCSV(headers, rows, filename) {
  const BOM = '\uFEFF';
  const csv = BOM + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`)).join('\n')].join('\n');
  downloadCSV(csv, filename);
}

// 解析CSV文本为二维数组
function parseCSVText(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const result = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') inQuote = false;
        else cur += ch;
      } else {
        if (ch === '"') inQuote = true;
        else if (ch === ',') { result.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  });
}

// 生成导入模板并下载
function downloadImportTemplate(headers, sampleRow, filename) {
  const BOM = '\uFEFF';
  const rows = sampleRow ? [headers, sampleRow] : [headers];
  const csv = BOM + rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadCSV(csv, filename);
  toast('模板已下载', 'success');
}

// 打开CSV文件导入预览弹窗
function openImportPreview(file, collection, fieldMap, requiredFields, onSave) {
  const reader = new FileReader();
  reader.onload = function(e) {
    let text = e.target.result;
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // 去BOM
    const allRows = parseCSVText(text);
    if (allRows.length < 2) { toast('文件中没有数据行', 'error'); return; }

    const fileHeaders = allRows[0];
    const dataRows = allRows.slice(1);
    window._importData = { collection, fieldMap, fileHeaders, dataRows, requiredFields, onSave };

    let previewRows = dataRows.slice(0, 5).map((row, ri) =>
      '<tr>' + row.map(cell => `<td style="font-size:11px;padding:4px 6px;border:1px solid var(--border);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cell || ''}</td>`).join('') + '</tr>'
    ).join('');

    openModal('导入数据预览', `
      <div style="margin-bottom:12px;padding:10px;background:var(--primary-light);border-radius:8px;font-size:13px">
        📊 共检测到 <b>${dataRows.length}</b> 条数据，文件列：${fileHeaders.map(h => '<span style="display:inline-block;padding:2px 6px;background:white;border-radius:4px;margin:2px;font-size:11px">' + h + '</span>').join('')}
      </div>
      <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">前 ${Math.min(5, dataRows.length)} 条预览（共 ${dataRows.length} 条）：</div>
      <div class="table-wrap" style="max-height:220px;overflow:auto">
        <table style="font-size:12px">
          <thead><tr>${fileHeaders.map(h => '<th style="font-size:11px;white-space:nowrap">' + h + '</th>').join('')}</tr></thead>
          <tbody>${previewRows}</tbody>
        </table>
      </div>
      ${dataRows.length > 5 ? '<div style="font-size:12px;color:var(--text-muted);margin-top:8px">... 还有 ' + (dataRows.length - 5) + ' 条数据</div>' : ''}
    `, '<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="confirmImport()">确认导入</button>');
  };
  reader.readAsText(file, 'utf-8');
}

// 确认导入
function confirmImport() {
  const d = window._importData;
  if (!d) return;
  let count = 0;
  d.dataRows.forEach(row => {
    const obj = {};
    d.fileHeaders.forEach((h, i) => {
      const field = d.fieldMap[h];
      if (field) obj[field] = row[i] || '';
    });
    // 检查必填字段
    if (d.requiredFields && d.requiredFields.length) {
      const hasAll = d.requiredFields.every(f => obj[f] && obj[f].trim());
      if (!hasAll) return;
    }
    // 去除id字段，让DB自动分配
    delete obj.id;
    if (typeof d.onSave === 'function') {
      d.onSave(obj);
    } else {
      DB.add(d.collection, obj);
    }
    count++;
  });
  closeModal();
  toast(`成功导入 ${count} 条数据`, 'success');
  // 刷新当前页面
  if (typeof showPage === 'function') showPage(currentPage);
}

// ===== 图片预览浮层鼠标跟随 =====
document.addEventListener('mousemove', function(e) {
  const el = document.getElementById('goodsImgPreview');
  if (!el || !el.classList.contains('active')) return;
  const W = window.innerWidth, H = window.innerHeight;
  const pw = 240, ph = 280;
  let x = e.clientX + 18, y = e.clientY + 18;
  if (x + pw > W - 16) x = e.clientX - pw - 18;
  if (y + ph > H - 16) y = e.clientY - ph - 18;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
});

// ===== 品牌/登录文字自定义 =====
function applyBranding() {
  const sysName = localStorage.getItem('wms_sysName') || '综合业务管理系统';
  const sysSubtitle = localStorage.getItem('wms_sysSubtitle') || 'Integrated business management system';
  const loginTitle = localStorage.getItem('wms_loginTitle') || '欢迎回来';
  const loginSubtitle = localStorage.getItem('wms_loginSubtitle') || '请登录您的账号以继续使用';
  const loginTip = localStorage.getItem('wms_loginTip') || '';
  const defaultUser = localStorage.getItem('wms_defaultUser') || 'admin';
  const defaultPwd = localStorage.getItem('wms_defaultPwd') || '123456';

  // 文档标题
  const docTitle = document.getElementById('docTitle');
  if (docTitle) docTitle.textContent = sysName;

  // 登录页左侧品牌（分屏风格）
  const brandName = document.getElementById('loginBrandName');
  if (brandName) brandName.textContent = sysName;
  const brandEn = document.getElementById('loginBrandEn');
  if (brandEn) brandEn.textContent = sysSubtitle;

  // 登录页精简品牌区（居中/暗色风格）
  const brandNameCompact = document.getElementById('loginBrandNameCompact');
  if (brandNameCompact) brandNameCompact.textContent = sysName;
  const brandEnCompact = document.getElementById('loginBrandEnCompact');
  if (brandEnCompact) brandEnCompact.textContent = sysSubtitle;

  // 登录表单标题
  const formTitle = document.getElementById('loginFormTitle');
  if (formTitle) formTitle.textContent = loginTitle;
  const formSubtitle = document.getElementById('loginFormSubtitle');
  if (formSubtitle) formSubtitle.textContent = loginSubtitle;

  // 登录提示
  const tipWrap = document.getElementById('loginTipWrap');
  const tipText = document.getElementById('loginTipText');
  if (tipText) tipText.textContent = loginTip;
  if (tipWrap) tipWrap.style.display = loginTip ? '' : 'none';

  // 默认账号密码
  const userInput = document.getElementById('loginUsername');
  if (userInput && !userInput.value) userInput.value = defaultUser;
  const pwdInput = document.getElementById('loginPassword');
  if (pwdInput && !pwdInput.value) pwdInput.value = defaultPwd;

  // 侧边栏名称
  const sidebarName = document.getElementById('sidebarName');
  if (sidebarName) sidebarName.textContent = sysName;

  // 侧边栏版本号
  const sidebarVersion = document.getElementById('sidebarVersion');
  const sysVersion = localStorage.getItem('wms_sysVersion') || 'v3.0.0';
  if (sidebarVersion) sidebarVersion.textContent = sysVersion;

  // Logo 设置
  applyLogoSettings();

  // 填充登录页账套下拉
  populateLoginAccountSets();

  // 应用登录页风格
  applyLoginStyle();
}

// 登录页风格：'split'（蓝色经典分屏，默认）/ 'centered'（绿色简约居中）/ 'dark'（黑白科技暗色）
// 同一个 class 同时应用到开机欢迎页(#welcomePage)和登录表单页(#loginPage)，
// 保证"开机动画 → 登录页"是同一套配色，不会切换风格后中途跳色。
function applyLoginStyle(styleKey) {
  const key = styleKey || localStorage.getItem('wms_loginStyle') || 'split';
  const styleClasses = ['login-style-split', 'login-style-centered', 'login-style-dark'];
  [document.getElementById('welcomePage'), document.getElementById('loginPage')].forEach(el => {
    if (!el) return;
    el.classList.remove(...styleClasses);
    el.classList.add('login-style-' + key);
  });
}

// 填充登录页账套下拉框
function populateLoginAccountSets() {
  const select = document.getElementById('loginAccountSet');
  if (!select) return;
  const accounts = DB.getAccounts();
  const currentAcc = DB.getCurrentAccount();
  select.innerHTML = accounts.map(a =>
    `<option value="${a.id}" ${a.id === currentAcc ? 'selected' : ''}>${a.name}</option>`
  ).join('');
  // 始终显示账套选择器（不同账套数据独立，用户需要明确选择）
  const group = document.getElementById('loginAccountGroup');
  if (group) group.style.display = '';
}

// 登录页新建账套
function loginCreateAccount() {
  openModal('新建账套', `
    <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text-muted)">
      💡 每个账套拥有完全独立的数据空间（商品、库存、订单等），适用于不同分公司或业务线。
    </div>
    <div class="form-row">
      <div class="form-item"><label>账套名称 *</label><input id="newAccName" placeholder="如: 上海分公司"></div>
    </div>
    <div class="form-row">
      <div class="form-item"><label>账套说明</label><input id="newAccDesc" placeholder="可选，如：上海分公司独立账套"></div>
    </div>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">取消</button>
    <button class="btn btn-primary" onclick="confirmLoginCreateAccount()">创建账套</button>
  `);
}

function confirmLoginCreateAccount() {
  const name = document.getElementById('newAccName').value.trim();
  if (!name) { toast('请输入账套名称', 'error'); return; }
  const desc = document.getElementById('newAccDesc').value.trim();
  const newId = DB.createAccount(name, desc);
  // 切换到新账套
  DB.switchAccount(newId);
  DB.init();
  // 刷新登录页账套下拉
  populateLoginAccountSets();
  const select = document.getElementById('loginAccountSet');
  if (select) select.value = newId;
  closeModal();
  toast(`账套「${name}」创建成功！默认账号: admin / 123456`, 'success');
}

// 恢复自动登录时的账套
function restoreAutoLoginAccount() {
  const raw = localStorage.getItem('wms_autologin');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data._account) {
      DB.switchAccount(data._account);
      DB.init();
      // 更新登录页账套下拉
      const select = document.getElementById('loginAccountSet');
      if (select) select.value = data._account;
    }
  } catch(e) {}
}

// ===== 启动 =====
DB.init();
restoreAutoLoginAccount(); // 先恢复账套
applyBranding();
runWelcome();

// 初始化音频系统（需要用户交互后才能播放）
document.addEventListener('click', () => {
  if (!AudioSys.ctx) AudioSys.init();
}, { once: true });
