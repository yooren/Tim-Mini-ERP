// ===========================
// 系统设置
// ===========================

const settings = {
  activeTab: 'users',

  // 处理用户头像上传
  handleUserAvatar(input, previewId, urlInputId) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('图片大小不能超过2MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      document.getElementById(urlInputId).value = base64;
      const preview = document.getElementById(previewId);
      preview.style.background = 'transparent';
      preview.style.padding = '0';
      preview.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    reader.readAsDataURL(file);
  },

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div id="settingsTabs" style="display:flex;gap:4px;background:white;padding:6px;border-radius:12px;margin-bottom:16px;box-shadow:var(--shadow);width:fit-content">
        ${[
          ['users','👥 用户管理'],
          ['roles','🏷 角色管理'],
          ['accountSets','📂 账套管理'],
          ['permissions','🔐 权限管理'],
          ['printSettings','🖨 打印设置'],
          ['system','⚙️ 系统信息'],
          ['data','💾 数据管理']
        ].map(([k,v]) => `
          <button onclick="settings.switchTab('${k}')"
            style="padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;font-family:inherit;
            ${this.activeTab===k?'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(79,110,247,0.4)':'background:transparent;color:var(--text-muted)'}"
          >${v}</button>`).join('')}
      </div>
      <div id="settingsContent">${this.renderTabContent()}</div>
    </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabs = [
      ['users','👥 用户管理'],
      ['roles','🏷 角色管理'],
      ['accountSets','📂 账套管理'],
      ['permissions','🔐 权限管理'],
      ['printSettings','🖨 打印设置'],
      ['system','⚙️ 系统信息'],
      ['data','💾 数据管理']
    ];
    document.getElementById('settingsTabs').innerHTML = tabs.map(([k,v]) => `
      <button onclick="settings.switchTab('${k}')"
        style="padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;font-family:inherit;
        ${this.activeTab===k?'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(79,110,247,0.4)':'background:transparent;color:var(--text-muted)'}"
      >${v}</button>`).join('');
    document.getElementById('settingsContent').innerHTML = this.renderTabContent();
    if (tab === 'system' && DB._syncEnabled) { this.refreshDbConfigCurrentType(); this.loadUpgradeStatus(); }
  },

  // 查询后端当前实际使用的数据库类型，回填到"后端数据库类型配置"下拉框，
  // 避免用户不知道当前到底连的是 sqlite 还是 mysql
  async refreshDbConfigCurrentType() {
    try {
      const res = await fetch(`${DB.getApiBase()}/api/health`);
      const data = await res.json();
      const sel = document.getElementById('dbConfigType');
      if (sel && data.dbType) {
        sel.value = data.dbType;
        this.toggleDbConfigFields();
      }
    } catch (e) {}
  },

  // ===== 版本升级（本地上传升级包，参照传统进销存软件的做法：不依赖联网检查更新） =====
  async loadUpgradeStatus() {
    const verEl = document.getElementById('upgradeCurrentVersion');
    if (!verEl) return;
    try {
      const res = await fetch(`${DB.getApiBase()}/api/admin/upgrade-status`);
      const data = await res.json();
      verEl.textContent = data.currentVersion || '-';
      this._upgradeBackups = data.backups || [];
      this.renderUpgradeBackupList();
    } catch (e) {
      verEl.textContent = '获取失败';
      const listEl = document.getElementById('upgradeBackupList');
      if (listEl) listEl.innerHTML = '<div style="padding:8px 0">获取升级历史失败：' + e.message + '</div>';
    }
  },

  renderUpgradeBackupList() {
    const listEl = document.getElementById('upgradeBackupList');
    if (!listEl) return;
    const backups = this._upgradeBackups || [];
    if (!backups.length) { listEl.innerHTML = '<div style="padding:8px 0">暂无升级记录</div>'; return; }
    listEl.innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>时间</th><th>版本变化</th><th>操作人</th><th>操作</th></tr></thead>
        <tbody>${backups.map(b => `
          <tr>
            <td style="font-size:12px">${(b.appliedAt || '').replace('T', ' ').slice(0, 19)}</td>
            <td style="font-size:12px">${b.fromVersion || '-'} → ${b.toVersion || '-'}</td>
            <td style="font-size:12px">${b.operator || '-'}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="settings.confirmRollback('${b.stamp}')">回滚到此前</button></td>
          </tr>`).join('')}</tbody>
      </table></div>`;
  },

  selectUpgradeFile() {
    document.getElementById('upgradeFileInput').click();
  },

  handleUpgradeFile(file) {
    this._upgradeFile = file || null;
    document.getElementById('upgradeFilePath').value = file ? file.name : '';
    document.getElementById('applyUpgradeBtn').disabled = !file;
  },

  confirmApplyUpgrade() {
    if (!this._upgradeFile) return;
    openModal('确认应用升级包',
      `<div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(59,110,255,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⬆️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确定要应用「${this._upgradeFile.name}」这个升级包吗？</div>
        <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;margin-top:8px">
          会替换程序文件（不影响账套业务数据），应用前自动备份，可随时回滚
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="settings.doApplyUpgrade()">确定应用</button>`
    );
  },

  async doApplyUpgrade() {
    closeModal();
    const file = this._upgradeFile;
    if (!file) return;
    const msgEl = document.getElementById('upgradeMsg');
    msgEl.classList.remove('hidden', 'success', 'error');
    msgEl.textContent = '正在上传并应用升级包...';
    const btn = document.getElementById('applyUpgradeBtn');
    if (btn) btn.disabled = true;
    try {
      const form = new FormData();
      form.append('package', file);
      form.append('operator', currentUser ? currentUser.username : '');
      const res = await fetch(`${DB.getApiBase()}/api/admin/upgrade`, { method: 'POST', body: form });
      const data = await res.json();
      if (!data.ok) {
        msgEl.classList.add('error');
        msgEl.textContent = '应用失败：' + (data.error || '未知错误');
        if (btn) btn.disabled = false;
        return;
      }
      msgEl.classList.add('success');
      msgEl.innerHTML = `已升级到 ${data.version}，<b>需要手动重启后端服务后才会生效</b>` +
        (data.releaseNotes ? `<br>更新说明：${data.releaseNotes}` : '') +
        (data.dependenciesChanged ? `<br><span style="color:#d97706">⚠️ 检测到依赖有变化，重启前请先在 server 目录手动执行一次 npm install</span>` : '');
      toast('升级包已应用，请手动重启后端服务', 'success');
      this.handleUpgradeFile(null);
      this.loadUpgradeStatus();
    } catch (e) {
      msgEl.classList.add('error');
      msgEl.textContent = '请求失败：' + e.message;
      if (btn) btn.disabled = false;
    }
  },

  confirmRollback(stamp) {
    const b = (this._upgradeBackups || []).find(x => x.stamp === stamp);
    openModal('确认回滚',
      `<div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确定要回滚到「${b ? b.fromVersion : ''}」这个版本吗？</div>
        <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;margin-top:8px">
          会把程序文件还原到这次升级之前的状态，同样需要重启后端服务才会生效
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="settings.doRollback('${stamp}')">确定回滚</button>`
    );
  },

  async doRollback(stamp) {
    closeModal();
    try {
      const res = await fetch(`${DB.getApiBase()}/api/admin/upgrade/rollback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stamp, operator: currentUser ? currentUser.username : '' })
      });
      const data = await res.json();
      if (!data.ok) { toast('回滚失败：' + (data.error || '未知错误'), 'error'); return; }
      toast('已回滚，请手动重启后端服务', 'success');
      this.loadUpgradeStatus();
    } catch (e) {
      toast('请求失败：' + e.message, 'error');
    }
  },

  renderTabContent() {
    if (this.activeTab === 'users') return this.renderUsers();
    if (this.activeTab === 'roles') return this.renderRoleManagement();
    if (this.activeTab === 'accountSets') return this.renderAccountSets();
    if (this.activeTab === 'permissions') return this.renderPermissions();
    if (this.activeTab === 'printSettings') return this.renderPrintSettings();
    if (this.activeTab === 'system') return this.renderSystem();
    if (this.activeTab === 'data') return this.renderData();
    return '';
  },

  renderUsers() {
    const users = DB.get('users');
    return `
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>👥 用户列表</span>
        ${currentUser.role === 'admin' ? '<button class="btn btn-primary" onclick="settings.openAddUser()">+ 新增用户</button>' : ''}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>头像</th><th>用户名</th><th>姓名</th><th>角色</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  ${u.avatar && u.avatar.startsWith('data:') || u.avatar && u.avatar.startsWith('http') ?
                    `<img src="${u.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` :
                    `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">
                      ${u.avatar || u.name?.slice(0,1).toUpperCase() || '?'}
                    </div>`
                  }
                </td>
                <td style="font-family:monospace;font-weight:600">${u.username}</td>
                <td>${u.name}</td>
                <td>${roleBadge(u.role)}</td>
                <td>${u.status ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-default">禁用</span>'}</td>
                <td style="font-size:12px;color:var(--text-muted)">${u.createdAt}</td>
                <td>
                  ${currentUser.role === 'admin' && u.id !== currentUser.id ? `
                    <div style="display:flex;gap:4px">
                      <button class="btn btn-outline btn-sm" onclick="settings.editUser(${u.id})">✏️ 编辑</button>
                      <button class="btn btn-danger btn-sm" onclick="settings.delUser(${u.id})">🗑</button>
                    </div>` : `<span style="color:var(--text-muted);font-size:12px">${u.id===currentUser.id?'(当前用户)':'无权限'}</span>`}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">🔑 修改密码</div>
      <div style="max-width:360px">
        <div class="form-item" style="margin-bottom:14px">
          <label>当前密码</label>
          <input type="password" id="oldPwd" placeholder="请输入当前密码">
        </div>
        <div class="form-item" style="margin-bottom:14px">
          <label>新密码</label>
          <input type="password" id="newPwd" placeholder="请输入新密码（至少6位）">
        </div>
        <div class="form-item" style="margin-bottom:16px">
          <label>确认新密码</label>
          <input type="password" id="confirmPwd" placeholder="请再次输入新密码">
        </div>
        <button class="btn btn-primary" onclick="settings.changePwd()">🔒 修改密码</button>
      </div>
    </div>`;
  },

  async connectApiBase() {
    const url = document.getElementById('apiBaseInput').value.trim();
    if (!url) { toast('请输入服务端地址', 'error'); return; }
    DB.setApiBase(url);
    toast('正在连接服务端...', 'info');
    const ok = await DB.checkSync();
    if (!ok) {
      toast('连接失败，请检查地址是否正确、后端是否已启动', 'error');
      this.switchTab('system');
      return;
    }
    await DB._ensureServerAccount(DB._currentAccount);
    await DB._syncAccountFromServer(DB._currentAccount);
    toast('已连接服务端并完成同步！', 'success');
    this.switchTab('system');
  },

  disconnectApiBase() {
    DB.setApiBase('');
    DB._syncEnabled = false;
    toast('已断开服务端连接，切换为本地模式', 'info');
    this.switchTab('system');
  },

  // ==================== 后台一键配置数据库 ====================
  toggleDbConfigFields() {
    const type = document.getElementById('dbConfigType').value;
    const fields = document.getElementById('dbConfigMysqlFields');
    if (fields) fields.style.display = type === 'mysql' ? 'block' : 'none';
  },

  _collectDbConfigPayload() {
    const dbType = document.getElementById('dbConfigType').value;
    const payload = { dbType };
    if (dbType === 'mysql') {
      payload.mysql = {
        host: document.getElementById('dbConfigHost').value.trim(),
        port: document.getElementById('dbConfigPort').value.trim(),
        user: document.getElementById('dbConfigUser').value.trim(),
        password: document.getElementById('dbConfigPassword').value,
        database: document.getElementById('dbConfigDatabase').value.trim()
      };
    }
    return payload;
  },

  async testDbConfig() {
    const msgEl = document.getElementById('dbConfigMsg');
    msgEl.classList.remove('hidden', 'success', 'error');
    msgEl.textContent = '正在测试连接...';
    try {
      const res = await fetch(`${DB.getApiBase()}/api/admin/test-db-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._collectDbConfigPayload())
      });
      const data = await res.json();
      if (data.ok) {
        msgEl.classList.add('success');
        msgEl.textContent = data.version ? `连接成功！MySQL 版本: ${data.version}` : '连接成功！';
      } else {
        msgEl.classList.add('error');
        msgEl.textContent = '连接失败: ' + (data.error || '未知错误');
      }
    } catch (e) {
      msgEl.classList.add('error');
      msgEl.textContent = '请求失败: ' + e.message;
    }
  },

  async applyDbConfig() {
    const msgEl = document.getElementById('dbConfigMsg');
    msgEl.classList.remove('hidden', 'success', 'error');
    msgEl.textContent = '正在保存配置...';
    try {
      const res = await fetch(`${DB.getApiBase()}/api/admin/apply-db-config`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this._collectDbConfigPayload())
      });
      const data = await res.json();
      if (!data.ok) {
        msgEl.classList.add('error');
        msgEl.textContent = '保存失败: ' + (data.error || '未知错误');
        return;
      }
      msgEl.classList.add('success');
      msgEl.textContent = '配置已保存，后端正在重启，请稍候...';
      toast('数据库配置已保存，后端服务重启中', 'success');
      this._pollBackendRestart();
    } catch (e) {
      msgEl.classList.add('error');
      msgEl.textContent = '请求失败: ' + e.message;
    }
  },

  // 后端重启期间端口会短暂不可用，这里轮询健康检查接口直到它重新上线
  _pollBackendRestart(attempt) {
    attempt = attempt || 0;
    if (attempt > 20) { toast('后端重启超时，请手动检查服务是否正常运行', 'warning'); return; }
    setTimeout(async () => {
      try {
        const res = await fetch(`${DB.getApiBase()}/api/health`);
        const data = await res.json();
        if (data.ok) {
          toast(`后端已重新上线，当前数据库类型: ${data.dbType}`, 'success');
          if (settings.activeTab === 'system') settings.switchTab('system');
          return;
        }
      } catch (e) {}
      settings._pollBackendRestart(attempt + 1);
    }, 1000);
  },

  // ==================== 登录页风格 ====================
  // 三种风格对应三个色系：蓝色/绿色/黑白，开机欢迎页与登录表单页配色联动，
  // 具体配色规则见 css/login.css 里 #welcomePage / #loginPage 的 login-style-* 规则
  _loginStyles: [
    {
      key: 'split', name: '经典分屏 · 蓝色', desc: '左侧品牌与功能介绍，右侧登录表单',
      mockup: `<div style="display:flex;height:70px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:38%;background:linear-gradient(155deg,#0f172a,#1e3a8a)"></div>
        <div style="flex:1;background:#fff;display:flex;flex-direction:column;justify-content:center;padding:8px 10px;gap:4px">
          <div style="width:60%;height:5px;background:#e2e8f0;border-radius:2px"></div>
          <div style="width:80%;height:8px;background:#3b6eff;border-radius:2px;margin-top:4px"></div>
        </div>
      </div>`
    },
    {
      key: 'centered', name: '简约居中 · 绿色', desc: '单张居中卡片，清新配色，简洁不分散注意力',
      mockup: `<div style="height:70px;border-radius:8px;background:#eef7f1;display:flex;align-items:center;justify-content:center;border:1px solid var(--border)">
        <div style="width:56%;height:52px;background:#fff;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
          <div style="width:16px;height:16px;border-radius:4px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)"></div>
          <div style="width:50%;height:6px;background:#10b981;border-radius:2px;margin-top:4px"></div>
        </div>
      </div>`
    },
    {
      key: 'dark', name: '科技暗色 · 黑白', desc: '暗色毛玻璃卡片，纯灰阶不带彩色，网格辉光背景',
      mockup: `<div style="height:70px;border-radius:8px;background:linear-gradient(150deg,#030304,#0c0c0e);display:flex;align-items:center;justify-content:center;border:1px solid var(--border)">
        <div style="width:56%;height:52px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
          <div style="width:16px;height:16px;border-radius:4px;background:rgba(255,255,255,0.25)"></div>
          <div style="width:50%;height:6px;background:#e2e8f0;border-radius:2px;margin-top:4px;box-shadow:0 0 6px rgba(255,255,255,0.6)"></div>
        </div>
      </div>`
    },
    {
      key: 'gold', name: '典雅通栏 · 暖金', desc: '品牌区从侧边面板改为顶部横幅，单卡片纵向布局，暖金配色',
      mockup: `<div style="height:70px;border-radius:8px;overflow:hidden;border:1px solid var(--border);display:flex;flex-direction:column">
        <div style="height:22px;background:linear-gradient(120deg,#92400e,#d97706,#f59e0b)"></div>
        <div style="flex:1;background:#fffdf9;display:flex;flex-direction:column;justify-content:center;padding:6px 10px;gap:4px">
          <div style="width:60%;height:5px;background:#fde8d0;border-radius:2px"></div>
          <div style="width:80%;height:8px;background:#d97706;border-radius:2px;margin-top:4px"></div>
        </div>
      </div>`
    }
  ],

  renderLoginStyleCard() {
    const current = localStorage.getItem('wms_loginStyle') || 'split';
    return `
    <div class="card" style="margin-top:16px">
      <div class="card-title">🎨 登录页风格</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">选择登录页的视觉风格，点击"预览"可在不影响当前登录状态的情况下先看效果，点击"使用此风格"保存后下次显示登录页时生效。</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
        ${this._loginStyles.map(s => `
          <div style="border:2px solid ${current===s.key?'var(--primary)':'var(--border)'};border-radius:12px;padding:14px;transition:all 0.2s">
            ${s.mockup}
            <div style="font-weight:700;margin-top:10px;font-size:13px">${s.name}${current===s.key?' <span style="color:var(--primary);font-weight:600;font-size:11px">（使用中）</span>':''}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s.desc}</div>
            <div style="display:flex;gap:6px;margin-top:10px">
              <button class="btn btn-outline btn-sm" style="flex:1" onclick="settings.previewLoginStyle('${s.key}')">👁 预览</button>
              <button class="btn ${current===s.key?'btn-ghost':'btn-primary'} btn-sm" style="flex:1" ${current===s.key?'disabled':''} onclick="settings.applyLoginStyleChoice('${s.key}')">${current===s.key?'✓ 使用中':'使用此风格'}</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  },

  applyLoginStyleChoice(key) {
    localStorage.setItem('wms_loginStyle', key);
    toast(`登录页风格已切换为「${this._loginStyles.find(s=>s.key===key)?.name||key}」`, 'success');
    this.switchTab('system');
  },

  // 预览登录页风格：直接把真实的 #loginPage 显示出来（不调用 logout，不影响当前登录状态），
  // 并临时禁用登录按钮，避免预览时误触发登录/切换账套等真实操作
  previewLoginStyle(key) {
    const lp = document.getElementById('loginPage');
    if (!lp) return;
    applyLoginStyle(key);
    lp.classList.remove('hidden');
    lp.style.zIndex = '9999';
    // 直接用 classList 切换显隐不会像"页面首次加载"那样天然触发 CSS 的 fadeIn 入场动画，
    // 若动画一直卡在起始帧会导致元素停在 opacity:0（不可见但仍占位/可交互）。这里强制
    // 设为可见，避免预览时"什么都看不到"。
    lp.style.opacity = '1';

    const btn = document.querySelector('#loginPage .login-btn');
    if (btn && !this._previewOriginalOnclick) {
      this._previewOriginalOnclick = btn.getAttribute('onclick');
      btn.setAttribute('onclick', "toast('预览模式下无法登录，请先点击右上角「退出预览」','warning')");
    }

    let exitBtn = document.getElementById('exitLoginPreviewBtn');
    if (!exitBtn) {
      exitBtn = document.createElement('button');
      exitBtn.id = 'exitLoginPreviewBtn';
      exitBtn.textContent = '✕ 退出预览';
      exitBtn.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;padding:10px 18px;background:#0f172a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.35);font-family:inherit';
      exitBtn.onclick = () => settings.exitLoginPreview();
      document.body.appendChild(exitBtn);
    }
  },

  exitLoginPreview() {
    const lp = document.getElementById('loginPage');
    if (lp) {
      lp.classList.add('hidden');
      lp.style.zIndex = '';
      lp.style.opacity = '';
    }
    const btn = document.querySelector('#loginPage .login-btn');
    if (btn && this._previewOriginalOnclick) {
      btn.setAttribute('onclick', this._previewOriginalOnclick);
      this._previewOriginalOnclick = null;
    }
    const exitBtn = document.getElementById('exitLoginPreviewBtn');
    if (exitBtn) exitBtn.remove();
    // 恢复为已保存的正式风格，避免预览态残留
    applyLoginStyle();
  },

  // ==================== 主界面配色 ====================
  // 登录成功后系统主界面（侧边栏/卡片/按钮等）的整体配色，和上面的"登录页风格"是两回事：
  // 登录页风格只影响登录前看到的页面，这里影响登录后天天在用的主界面。
  // 具体配色变量定义见 css/main.css 里的 .theme-* 规则，颜色预览用的十六进制值需要跟那边保持一致。
  _mainThemeSwatches: {
    'theme-default': ['#3b6eff', '#0f172a'],
    'theme-business': ['#1e40af', '#0f172a'],
    'theme-green': ['#059669', '#064e3b'],
    'theme-purple': ['#7c3aed', '#2e1065'],
    'theme-orange': ['#ea580c', '#431407'],
    'theme-dark': ['#60a5fa', '#0a0a0a'],
    'theme-pink': ['#ec4899', '#831843'],
    'theme-teal': ['#0d9488', '#042f2e']
  },

  renderMainThemeCard() {
    const current = ThemeManager.current;
    return `
    <div class="card" style="margin-top:16px">
      <div class="card-title">🖌 主界面配色</div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:14px">登录后系统主界面（侧边栏、按钮、图表等）的整体配色，点击即可切换，立即生效，不影响登录页风格。</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        ${ThemeManager.themes.map(t => {
          const [primary, sidebar] = this._mainThemeSwatches[t.id] || ['#3b6eff', '#0f172a'];
          const active = current === t.id;
          return `
          <div onclick="settings.applyMainTheme('${t.id}')"
            style="border:2px solid ${active ? 'var(--primary)' : 'var(--border)'};border-radius:12px;padding:12px;cursor:pointer;transition:all 0.2s"
            onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='${active ? 'var(--primary)' : 'var(--border)'}'">
            <div style="display:flex;height:34px;border-radius:8px;overflow:hidden;border:1px solid var(--border)">
              <div style="width:34%;background:${sidebar}"></div>
              <div style="flex:1;background:${primary}"></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:8px">
              <span style="font-size:14px">${t.icon}</span>
              <span style="font-weight:600;font-size:12px">${t.name}</span>
              ${active ? '<span style="color:var(--primary);font-weight:600;font-size:11px;margin-left:auto">✓ 使用中</span>' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  applyMainTheme(themeId) {
    ThemeManager.apply(themeId);
    toast(`主界面配色已切换为「${ThemeManager.themes.find(t => t.id === themeId)?.name || themeId}」`, 'success');
    this.switchTab('system');
  },

  renderSystem() {
    const goods = DB.get('goods');
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');
    const suppliers = DB.get('suppliers');
    const customers = DB.get('customers');
    const tickets = DB.get('serviceTickets') || [];
    const productionOrders = DB.get('productionOrders');
    const equipment = DB.get('equipment');
    const transportPlans = DB.get('transportPlans');

    // 计算存储大小
    let storageSize = 0;
    for (let key in localStorage) {
      if (key.startsWith('wms_')) storageSize += localStorage[key].length * 2;
    }

    // 自动备份开关状态
    const autoBackup = localStorage.getItem('wms_autoBackup') === 'true'; // 默认关闭
    // 自动同步开关状态
    const autoSync = localStorage.getItem('wms_autoSync') !== 'false'; // 默认开启
    // 自动备份间隔（分钟）
    const autoBackupInterval = localStorage.getItem('wms_autoBackupInterval') || '30';

    return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="justify-content:space-between">
        <span>🗄 服务端数据库同步</span>
        <span style="font-size:12px;font-weight:600;color:${DB._syncEnabled ? '#10b981' : '#94a3b8'}">${DB._syncEnabled ? '● 已连接' : '○ 未连接（本地模式）'}</span>
      </div>
      <div style="padding:10px 14px;background:rgba(59,130,246,0.04);border:1px solid rgba(59,130,246,0.12);border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:12px">
        💡 默认使用浏览器 localStorage 本地存储，各电脑数据互不相通。填写并连接 <code>server/</code> 目录下的 Node.js 后端地址后，
        可实现多台电脑共享同一份数据；留空则始终使用本地模式，不影响现有使用方式。
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="apiBaseInput" value="${DB.getApiBase()}" placeholder="如: http://192.168.1.100:3000" style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
        <button class="btn btn-primary" onclick="settings.connectApiBase()">连接并同步</button>
        ${DB.getApiBase() ? `<button class="btn btn-ghost" onclick="settings.disconnectApiBase()">断开</button>` : ''}
      </div>
    </div>
    ${DB._syncEnabled ? `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">🐬 后端数据库类型配置</div>
      <div style="padding:10px 14px;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:14px">
        💡 如果这台电脑（或后端所在的电脑）上已经装好了 MySQL，这里可以直接测试连接、一键切换
        后端使用的数据库类型，不用手动改 <code>server/.env</code> 文件。点击"保存并应用"后后端服务
        会自动重启生效，大约几秒钟。
      </div>
      <div class="form-row cols-2" style="margin-bottom:12px">
        <div class="form-item">
          <label>数据库类型</label>
          <select id="dbConfigType" onchange="settings.toggleDbConfigFields()">
            <option value="sqlite">SQLite（默认，零配置）</option>
            <option value="mysql">MySQL（独立数据库）</option>
          </select>
        </div>
      </div>
      <div id="dbConfigMysqlFields" style="display:none">
        <div class="form-row cols-2" style="margin-bottom:12px">
          <div class="form-item"><label>主机地址</label><input id="dbConfigHost" value="localhost" placeholder="localhost"></div>
          <div class="form-item"><label>端口</label><input id="dbConfigPort" type="number" value="3306" placeholder="3306"></div>
        </div>
        <div class="form-row cols-2" style="margin-bottom:12px">
          <div class="form-item"><label>用户名</label><input id="dbConfigUser" value="root" placeholder="root"></div>
          <div class="form-item"><label>密码</label><input id="dbConfigPassword" type="password" placeholder="密码"></div>
        </div>
        <div class="form-item" style="margin-bottom:12px"><label>数据库名</label><input id="dbConfigDatabase" value="wms_db" placeholder="wms_db"></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="settings.testDbConfig()">🔌 测试连接</button>
        <button class="btn btn-primary" onclick="settings.applyDbConfig()">💾 保存并应用（自动重启）</button>
      </div>
      <div id="dbConfigMsg" class="license-activate-msg hidden" style="margin-top:10px"></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">🔄 版本升级</div>
      <div style="padding:10px 14px;background:rgba(59,130,246,0.04);border:1px solid rgba(59,130,246,0.12);border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:14px">
        💡 升级包由软件出品方（Tim Ren Studio 工作室）打包提供，不需要联网，本地上传即可。
        应用前会自动备份当前的程序文件，出问题可以随时一键回滚。应用完成后需要<b>手动重启一次后端服务</b>才会生效
        （重新运行"一键启动"脚本，或重新执行 <code>node server.js</code>）。
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg);border-radius:8px;margin-bottom:12px">
        <span style="color:var(--text-muted);font-size:13px">当前版本</span>
        <span style="font-weight:600;font-size:14px" id="upgradeCurrentVersion">加载中...</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="text" id="upgradeFilePath" placeholder='点击"选择升级包"选择 .zip 文件' readonly style="flex:1;cursor:pointer" onclick="settings.selectUpgradeFile()">
        <button class="btn btn-outline" onclick="settings.selectUpgradeFile()" style="white-space:nowrap">📂 选择升级包</button>
        <button class="btn btn-primary" id="applyUpgradeBtn" onclick="settings.confirmApplyUpgrade()" disabled style="white-space:nowrap">⬆️ 应用升级</button>
      </div>
      <input type="file" id="upgradeFileInput" accept=".zip" style="display:none" onchange="settings.handleUpgradeFile(this.files[0])">
      <div id="upgradeMsg" class="license-activate-msg hidden" style="margin-top:10px"></div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="justify-content:space-between">
        <span>📜 升级历史（可回滚）</span>
        <button class="btn btn-ghost" style="padding:2px 10px;font-size:12px" onclick="settings.loadUpgradeStatus()">刷新</button>
      </div>
      <div id="upgradeBackupList" style="font-size:12px;color:var(--text-muted)">加载中...</div>
    </div>
    ` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-title">📊 核心数据统计</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['商品种类', goods.length + ' 种'],
            ['入库记录', inbounds.length + ' 条'],
            ['出库记录', outbounds.length + ' 条'],
            ['供应商', suppliers.length + ' 家'],
            ['客户', customers.length + ' 个'],
            ['数据占用', (storageSize / 1024).toFixed(2) + ' KB']
          ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg);border-radius:8px">
              <span style="color:var(--text-muted);font-size:13px">${k}</span>
              <span style="font-weight:600;font-size:14px">${v}</span>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">🏭 业务模块统计</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['售后工单', tickets.length + ' 单'],
            ['生产工单', productionOrders.length + ' 单'],
            ['设备台账', equipment.length + ' 台'],
            ['运输计划', transportPlans.length + ' 条'],
            ['员工数量', DB.get('employees').length + ' 人'],
            ['部门数量', DB.get('departments').length + ' 个']
          ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg);border-radius:8px">
              <span style="color:var(--text-muted);font-size:13px">${k}</span>
              <span style="font-weight:600;font-size:14px">${v}</span>
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">🏷️ 品牌与登录页自定义</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
          <div style="font-weight:600;font-size:13px;margin-bottom:10px">系统名称</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input id="brandSysName" value="${localStorage.getItem('wms_sysName') || 'Tim Mini ERP'}" placeholder="系统名称" style="flex:1;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
            <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">登录页+侧边栏+浏览器标签</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">系统版本号</div>
            <input id="brandSysVersion" value="${localStorage.getItem('wms_sysVersion') || 'v1.0.0'}" placeholder="如 v1.0.0" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">品牌副标题</div>
            <input id="brandSysSubtitle" value="${localStorage.getItem('wms_sysSubtitle') || '做更顺手的软件与工具'}" placeholder="登录页品牌副标题" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">登录标题</div>
            <input id="brandLoginTitle" value="${localStorage.getItem('wms_loginTitle') || '欢迎回来'}" placeholder="登录表单标题" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">登录副标题</div>
            <input id="brandLoginSubtitle" value="${localStorage.getItem('wms_loginSubtitle') || '请登录您的账号以继续使用'}" placeholder="登录表单副标题" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
        </div>
        <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
          <div style="font-weight:600;font-size:13px;margin-bottom:10px">登录提示文字</div>
          <input id="brandLoginTip" value="${localStorage.getItem('wms_loginTip') || ''}" placeholder="登录按钮下方的提示文字（留空则不显示）" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">默认管理员账号</div>
            <input id="brandDefaultUser" value="${localStorage.getItem('wms_defaultUser') || 'admin'}" placeholder="登录页默认账号" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
          <div style="padding:12px 14px;background:var(--bg);border-radius:8px">
            <div style="font-weight:600;font-size:13px;margin-bottom:10px">默认管理员密码</div>
            <input id="brandDefaultPwd" value="${localStorage.getItem('wms_defaultPwd') || '123456'}" placeholder="登录页默认密码" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="settings.resetBranding()">↩️ 恢复默认</button>
          <button class="btn btn-primary" onclick="settings.saveBranding()">💾 保存并应用</button>
        </div>
      </div>
    </div>
    ${this.renderLoginStyleCard()}
    ${this.renderMainThemeCard()}
    <div class="card" style="margin-top:16px">
      <div class="card-title">ℹ️ 系统信息</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          ['系统名称', localStorage.getItem('wms_sysName') || 'Tim Mini ERP'],
          ['系统版本', localStorage.getItem('wms_sysVersion') || 'v1.0.0'],
          ['当前用户', currentUser.name],
          ['用户角色', getRoleName(currentUser.role)],
          ['浏览器', navigator.userAgent.split('Chrome')[0] ? 'Chrome' : 'Other'],
          ['数据存储', 'LocalStorage（本地）'],
          ['系统状态', '<span class="badge badge-success">运行正常</span>']
        ].map(([k,v]) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg);border-radius:8px">
            <span style="color:var(--text-muted);font-size:13px">${k}</span>
            <span style="font-weight:600;font-size:14px">${v}</span>
          </div>`).join('')}
        <div style="text-align:center;font-size:12px;color:var(--text-muted);padding:8px 4px 0;line-height:1.7">
          做更顺手的软件与工具。从实际需求出发，把复杂的事情，做得简单一点。<br>Tim Ren Studio 工作室出品 · 联系邮箱：237826424@qq.com
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">🔊 音效设置</div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg);border-radius:8px">
        <div>
          <div style="font-weight:600;font-size:14px">系统音效</div>
          <div style="color:var(--text-muted);font-size:12px;margin-top:2px">开启/关闭提示音、错误音等系统音效</div>
        </div>
        <button class="btn ${AudioSys.enabled ? 'btn-primary' : 'btn-outline'}" onclick="settings.toggleSound()">
          ${AudioSys.enabled ? '🔔 已开启' : '🔕 已关闭'}
        </button>
      </div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn-outline btn-sm" onclick="AudioSys.success();toast('成功提示音测试','success',1500)">✅ 测试成功音</button>
        <button class="btn btn-outline btn-sm" onclick="AudioSys.error();toast('错误提示音测试','error',1500)">❌ 测试错误音</button>
        <button class="btn btn-outline btn-sm" onclick="AudioSys.warning();toast('警告提示音测试','warning',1500)">⚠️ 测试警告音</button>
        <button class="btn btn-outline btn-sm" onclick="AudioSys.delete();toast('删除音效测试','info',1500)">🗑 测试删除音</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">📑 标签页设置</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
          <div>
            <div style="font-weight:600;font-size:14px">最大标签页数量</div>
            <div style="color:var(--text-muted);font-size:12px;margin-top:2px">控制同时打开的菜单标签页上限，超出后需关闭已有标签才能打开新页面</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <select id="maxTabsSelect" onchange="settings.setMaxTabs(this.value)" style="padding:6px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;min-width:100px">
              ${[3,4,5,6,7,8,9,10,12,15,20,25,30].map(n => `<option value="${n}" ${TabManager.maxTabs===n?'selected':''}>${n} 个</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="padding:10px 14px;background:rgba(59,110,255,0.04);border:1px solid rgba(59,110,255,0.12);border-radius:8px;font-size:12px;color:var(--text-muted)">
          💡 当前已打开 <strong style="color:var(--primary)">${TabManager.tabs.length}</strong> 个标签页，上限 <strong style="color:var(--primary)">${TabManager.maxTabs}</strong> 个。修改后立即生效。
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">🔄 自动备份与同步</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
          <div>
            <div style="font-weight:600;font-size:14px">自动备份数据</div>
            <div style="color:var(--text-muted);font-size:12px;margin-top:2px">定时自动将系统数据备份到本地，防止数据丢失</div>
          </div>
          <button class="btn ${autoBackup ? 'btn-primary' : 'btn-outline'}" onclick="settings.toggleAutoBackup()">
            ${autoBackup ? '✅ 已开启' : '⏹ 已关闭'}
          </button>
        </div>
        <div id="autoBackupIntervalWrap" style="display:${autoBackup ? 'block' : 'none'};padding:12px 14px;background:var(--bg);border-radius:8px">
          <div style="font-weight:600;font-size:13px;margin-bottom:8px">备份间隔</div>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="autoBackupIntervalSelect" onchange="settings.setAutoBackupInterval(this.value)" style="padding:6px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit">
              <option value="10" ${autoBackupInterval==='10'?'selected':''}>每 10 分钟</option>
              <option value="30" ${autoBackupInterval==='30'?'selected':''}>每 30 分钟</option>
              <option value="60" ${autoBackupInterval==='60'?'selected':''}>每 1 小时</option>
              <option value="120" ${autoBackupInterval==='120'?'selected':''}>每 2 小时</option>
            </select>
            <span style="color:var(--text-muted);font-size:12px">数据变更后按设定间隔自动触发备份</span>
          </div>
          <div style="margin-top:8px;font-size:11px;color:var(--text-muted)">
            💡 自动备份文件保存到浏览器本地存储（IndexedDB），可在「数据管理」中手动导出
          </div>
        </div>
        <div style="height:1px;background:var(--border)"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
          <div>
            <div style="font-weight:600;font-size:14px">自动同步数据</div>
            <div style="color:var(--text-muted);font-size:12px;margin-top:2px">数据变更后自动同步保存，确保多标签页数据一致</div>
          </div>
          <button class="btn ${autoSync ? 'btn-primary' : 'btn-outline'}" onclick="settings.toggleAutoSync()">
            ${autoSync ? '✅ 已开启' : '⏹ 已关闭'}
          </button>
        </div>
        <div id="autoSyncStatus" style="padding:10px 14px;background:${autoSync?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)'};border:1px solid ${autoSync?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'};border-radius:8px;font-size:12px;color:${autoSync?'var(--success)':'var(--danger)'}">
          ${autoSync ? '✅ 数据同步已开启，所有数据变更将实时保存' : '⚠️ 数据同步已关闭，多标签页数据可能不一致'}
        </div>
      </div>
    </div>`;
  },

  // 切换音效开关
  toggleSound() {
    const enabled = AudioSys.toggle();
    toast(enabled ? '音效已开启' : '音效已关闭', enabled ? 'success' : 'info');
    this.switchTab('system');
  },

  // 设置标签页上限
  setMaxTabs(val) {
    const v = parseInt(val);
    if (v < 3 || v > 30) { toast('标签页数量需在 3~30 之间', 'error'); return; }
    TabManager.maxTabs = v;
    audit.log('settings', '修改标签页上限', '系统设置', `最大标签页: ${v} 个`);
    toast(`标签页上限已设为 ${v} 个`, 'success');
    // 如果当前打开数超过新上限，自动关闭多余的
    while (TabManager.tabs.length > TabManager.maxTabs) {
      TabManager.close(TabManager.tabs[TabManager.tabs.length - 1].id);
    }
    this.switchTab('system');
  },

  // 保存品牌/登录页自定义
  saveBranding() {
    const sysName = document.getElementById('brandSysName').value.trim();
    const sysVersion = document.getElementById('brandSysVersion').value.trim();
    const sysSubtitle = document.getElementById('brandSysSubtitle').value.trim();
    const loginTitle = document.getElementById('brandLoginTitle').value.trim();
    const loginSubtitle = document.getElementById('brandLoginSubtitle').value.trim();
    const loginTip = document.getElementById('brandLoginTip').value.trim();
    const defaultUser = document.getElementById('brandDefaultUser').value.trim();
    const defaultPwd = document.getElementById('brandDefaultPwd').value.trim();

    if (!sysName) { toast('系统名称不能为空', 'error'); return; }

    localStorage.setItem('wms_sysName', sysName);
    if (sysVersion) localStorage.setItem('wms_sysVersion', sysVersion);
    localStorage.setItem('wms_sysSubtitle', sysSubtitle);
    localStorage.setItem('wms_loginTitle', loginTitle);
    localStorage.setItem('wms_loginSubtitle', loginSubtitle);
    localStorage.setItem('wms_loginTip', loginTip);
    if (defaultUser) localStorage.setItem('wms_defaultUser', defaultUser);
    if (defaultPwd) localStorage.setItem('wms_defaultPwd', defaultPwd);

    // 立即应用
    applyBranding();
    audit.log('settings', '修改品牌设置', '系统设置', `系统名称: ${sysName}, 版本: ${sysVersion || 'v1.0.0'}`);
    toast('品牌设置已保存并生效！', 'success');
    this.switchTab('system');
  },

  // 恢复品牌默认值
  resetBranding() {
    const keys = ['wms_sysName', 'wms_sysVersion', 'wms_sysSubtitle', 'wms_loginTitle', 'wms_loginSubtitle', 'wms_loginTip', 'wms_defaultUser', 'wms_defaultPwd'];
    keys.forEach(k => localStorage.removeItem(k));
    applyBranding();
    audit.log('settings', '恢复品牌默认', '系统设置', '已恢复默认品牌设置');
    toast('已恢复默认设置', 'info');
    this.switchTab('system');
  },

  // 切换自动备份开关
  toggleAutoBackup() {
    const current = localStorage.getItem('wms_autoBackup') === 'true';
    const newVal = !current;
    localStorage.setItem('wms_autoBackup', newVal ? 'true' : 'false');
    if (newVal) {
      // 启动自动备份定时器
      AutoBackupSync.startAutoBackup();
      audit.log('settings', '开启自动备份', '系统设置', '自动备份数据已开启');
      toast('自动备份已开启', 'success');
    } else {
      AutoBackupSync.stopAutoBackup();
      audit.log('settings', '关闭自动备份', '系统设置', '自动备份数据已关闭');
      toast('自动备份已关闭', 'info');
    }
    this.switchTab('system');
  },

  // 设置自动备份间隔
  setAutoBackupInterval(val) {
    localStorage.setItem('wms_autoBackupInterval', val);
    // 如果自动备份已开启，重启定时器
    if (localStorage.getItem('wms_autoBackup') === 'true') {
      AutoBackupSync.stopAutoBackup();
      AutoBackupSync.startAutoBackup();
    }
    toast('备份间隔已更新为 ' + (val >= 60 ? (val / 60) + ' 小时' : val + ' 分钟'), 'success');
  },

  // 切换自动同步开关
  toggleAutoSync() {
    const current = localStorage.getItem('wms_autoSync') !== 'false';
    const newVal = !current;
    localStorage.setItem('wms_autoSync', newVal ? 'true' : 'false');
    if (newVal) {
      AutoBackupSync.startAutoSync();
      audit.log('settings', '开启自动同步', '系统设置', '自动同步数据已开启');
      toast('自动同步已开启', 'success');
    } else {
      AutoBackupSync.stopAutoSync();
      audit.log('settings', '关闭自动同步', '系统设置', '自动同步数据已关闭');
      toast('自动同步已关闭', 'info');
    }
    this.switchTab('system');
  },

  renderData() {
    // 计算 localStorage 使用情况
    let totalSize = 0;
    let wmsKeys = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wms_')) {
        wmsKeys++;
        totalSize += (localStorage.getItem(key) || '').length;
      }
    }
    const sizeKB = (totalSize / 1024).toFixed(1);
    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    const maxMB = 5; // localStorage 通常限制 5-10MB
    const usagePercent = Math.min(100, (totalSize / 1024 / 1024 / maxMB * 100)).toFixed(1);
    const accounts = DB.getAccounts();

    return `
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">💾 数据存储状态</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px">
        <div style="padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:11px;color:var(--text-muted)">存储方式</div>
          <div style="font-size:16px;font-weight:700;color:var(--primary)">localStorage</div>
          <div style="font-size:11px;color:var(--text-muted)">浏览器本地存储</div>
        </div>
        <div style="padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:11px;color:var(--text-muted)">已用空间</div>
          <div style="font-size:16px;font-weight:700;color:${usagePercent > 80 ? 'var(--danger)' : '#10b981'}">${sizeKB > 1024 ? sizeMB + ' MB' : sizeKB + ' KB'}</div>
          <div style="font-size:11px;color:var(--text-muted)">上限约 ${maxMB} MB</div>
        </div>
        <div style="padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:11px;color:var(--text-muted)">数据键数</div>
          <div style="font-size:16px;font-weight:700;color:#f59e0b">${wmsKeys}</div>
          <div style="font-size:11px;color:var(--text-muted)">${accounts.length} 个账套</div>
        </div>
        <div style="padding:12px;background:var(--bg);border-radius:8px">
          <div style="font-size:11px;color:var(--text-muted)">使用率</div>
          <div style="font-size:16px;font-weight:700;color:${usagePercent > 80 ? 'var(--danger)' : 'var(--primary)'}">${usagePercent}%</div>
          <div style="width:100%;height:4px;background:var(--border);border-radius:2px;margin-top:6px"><div style="width:${usagePercent}%;height:100%;background:${usagePercent > 80 ? 'var(--danger)' : 'var(--primary)'};border-radius:2px"></div></div>
        </div>
      </div>
      <div style="padding:14px;background:var(--bg);border-radius:8px;font-size:13px">
        <div style="font-weight:600;margin-bottom:8px;color:var(--text)">📋 存储说明与升级路径</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div style="font-weight:600;color:#10b981;margin-bottom:4px">✅ 当前：localStorage 本地存储</div>
            <ul style="margin:0;padding-left:16px;color:var(--text-muted);font-size:12px;line-height:1.8">
              <li>数据存储在浏览器本地，无需服务器</li>
              <li>适合单机/小规模场景（1-5人使用）</li>
              <li>清除浏览器数据会导致数据丢失</li>
              <li>不同浏览器/设备间数据不互通</li>
              <li>建议定期通过“数据备份”导出备份</li>
            </ul>
          </div>
          <div>
            <div style="font-weight:600;color:var(--primary);margin-bottom:4px">🚀 升级：后端数据库方案</div>
            <ul style="margin:0;padding-left:16px;color:var(--text-muted);font-size:12px;line-height:1.8">
              <li><strong>MySQL / PostgreSQL</strong> — 适合中大规模多用户场景，需配合 Node.js/Java/Python 后端</li>
              <li><strong>SQLite</strong> — 轻量级方案，适合单机多用户，文件型数据库无需额外服务</li>
              <li><strong>IndexedDB</strong> — 浏览器端升级，容量更大（数百MB），支持结构化查询</li>
              <li>升级时需将 localStorage 数据迁移至后端，可通过“数据备份”导出 JSON 后导入新系统</li>
              <li>多用户并发场景建议部署后端服务 + 数据库，避免 localStorage 冲突</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-title">📤 数据备份</div>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">将系统数据备份到指定位置，支持完整备份和分类备份</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-item">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">备份文件名</label>
            <input type="text" id="backupFilename" placeholder="输入备份文件名" value="wms_backup" style="width:100%">
          </div>
          <div class="form-item" style="margin-bottom:8px">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">选择备份位置</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="backupPath" placeholder="点击\"浏览\"选择备份文件夹" readonly style="flex:1;cursor:pointer" onclick="settings.selectBackupPath()">
              <button class="btn btn-outline" onclick="settings.selectBackupPath()" style="white-space:nowrap">📁 浏览</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-primary" onclick="settings.backupAll()">💾 完整备份（所有数据）</button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="btn btn-outline btn-sm" onclick="settings.backupGoods()">📦 商品数据</button>
              <button class="btn btn-outline btn-sm" onclick="settings.backupRecords()">📋 出入库记录</button>
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📥 数据恢复</div>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">从备份文件恢复数据，支持完整恢复和分类恢复</p>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div class="form-item">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">选择备份文件</label>
            <div style="display:flex;gap:8px">
              <input type="text" id="restoreFilePath" placeholder="点击\"选择文件\"选择备份文件" readonly style="flex:1;cursor:pointer" onclick="settings.selectRestoreFile()">
              <button class="btn btn-outline" onclick="settings.selectRestoreFile()" style="white-space:nowrap">📂 选择文件</button>
            </div>
            <input type="file" id="restoreFileInput" accept=".json" style="display:none" onchange="settings.handleRestoreFile(this.files[0])">
          </div>
          <div style="padding:12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--text-muted)">
            <div style="margin-bottom:8px;font-weight:600;color:var(--text)">⚠️ 恢复说明：</div>
            <ul style="margin:0;padding-left:16px">
              <li>完整恢复将覆盖所有现有数据</li>
              <li>分类恢复只恢复选中的数据</li>
              <li>建议在恢复前先进行数据备份</li>
            </ul>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-success" onclick="settings.restoreAll()">🔄 完整恢复</button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="btn btn-outline btn-sm" onclick="settings.restoreGoods()">📦 恢复商品</button>
              <button class="btn btn-outline btn-sm" onclick="settings.restoreRecords()">📋 恢复记录</button>
            </div>
          </div>
          <div style="height:1px;background:var(--border);margin:4px 0"></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-outline" onclick="settings.showAutoBackups()">📦 自动备份记录</button>
            <div style="font-size:11px;color:var(--text-muted)">查看和管理系统自动备份的数据快照</div>
          </div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title" style="color:var(--danger)">⚠️ 危险操作</div>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">以下操作不可逆，请谨慎执行</p>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="flex:1;display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-warning" onclick="settings.clearLogs()">🗑 清空出入库记录</button>
          <div style="padding:12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:12px;color:var(--warning)">
            ⚠️ 清空操作将删除所有出入库记录，但保留商品数据
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;gap:10px">
          <button class="btn btn-danger" onclick="settings.resetAll()">💥 重置全部数据</button>
          <div style="padding:12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:12px;color:var(--danger)">
            ⚠️ 重置操作将清除所有数据，包括商品、记录、用户（保留admin）等，此操作不可恢复！
          </div>
        </div>
      </div>
    </div>`;
  },

  openAddUser() {
    openModal('新增用户', `
      <div style="display:flex;gap:24px;align-items:flex-start">
        <div style="text-align:center;flex-shrink:0">
          <div id="newUserAvatarPreview" onclick="document.getElementById('newUserAvatarInput').click()"
            style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:700;cursor:pointer;border:3px dashed var(--border);transition:all 0.2s">
            +
          </div>
          <input type="file" id="newUserAvatarInput" accept="image/*" style="display:none" onchange="settings.handleUserAvatar(this, 'newUserAvatarPreview', 'newUserAvatarUrl')">
          <input type="hidden" id="newUserAvatarUrl">
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击上传头像</div>
        </div>
        <div style="flex:1">
          <div class="form-row cols-2">
            <div class="form-item"><label>用户名 *</label><input id="unName" placeholder="登录用户名"></div>
            <div class="form-item"><label>姓名 *</label><input id="unDisplayName" placeholder="显示名称"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-item"><label>密码 *</label><input id="unPwd" type="password" placeholder="初始密码"></div>
            <div class="form-item"><label>角色</label>
              <select id="unRole">${roleOptions('staff')}</select>
            </div>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="settings.saveUser()">创建用户</button>`
    );
  },

  saveUser() {
    const username = document.getElementById('unName').value.trim();
    const name = document.getElementById('unDisplayName').value.trim();
    const password = document.getElementById('unPwd').value;
    if (!username || !name || !password) { toast('请填写完整信息', 'error'); return; }
    const users = DB.get('users');
    if (users.find(u => u.username === username)) { toast('用户名已存在', 'error'); return; }
    const role = document.getElementById('unRole').value;
    const avatarUrl = document.getElementById('newUserAvatarUrl')?.value || name.slice(0,1).toUpperCase();
    DB.add('users', {
      username, name, password,
      role,
      avatar: avatarUrl,
      status: 1
    });
    audit.log('settings', '新增用户', username, `姓名: ${name}, 角色: ${role}`);
    closeModal();
    toast('用户创建成功！');
    this.switchTab('users');
  },

  editUser(id) {
    const u = DB.findById('users', id);
    if (!u) return;
    const hasAvatar = u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'));
    openModal('编辑用户', `
      <div style="display:flex;gap:24px;align-items:flex-start">
        <div style="text-align:center;flex-shrink:0">
          <div id="editUserAvatarPreview" onclick="document.getElementById('editUserAvatarInput').click()"
            style="width:80px;height:80px;border-radius:50%;${hasAvatar ? 'padding:0;overflow:hidden' : 'background:linear-gradient(135deg,var(--primary),var(--secondary))'};display:flex;align-items:center;justify-content:center;color:white;font-size:28px;font-weight:700;cursor:pointer;border:3px dashed var(--border);transition:all 0.2s">
            ${hasAvatar ? `<img src="${u.avatar}" style="width:100%;height:100%;object-fit:cover">` : (u.avatar || u.name?.slice(0,1).toUpperCase() || '+')}
          </div>
          <input type="file" id="editUserAvatarInput" accept="image/*" style="display:none" onchange="settings.handleUserAvatar(this, 'editUserAvatarPreview', 'editUserAvatarUrl')">
          <input type="hidden" id="editUserAvatarUrl" value="${u.avatar || ''}">
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击更换头像</div>
        </div>
        <div style="flex:1">
          <div class="form-row cols-2">
            <div class="form-item"><label>用户名</label><input value="${u.username}" readonly style="background:#f0f2f8"></div>
            <div class="form-item"><label>姓名</label><input id="euName" value="${u.name}"></div>
          </div>
          <div class="form-row cols-2">
            <div class="form-item"><label>新密码（留空不修改）</label><input id="euPwd" type="password" placeholder="输入新密码"></div>
            <div class="form-item"><label>角色</label>
              <select id="euRole">${roleOptions(u.role)}</select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item"><label>状态</label>
              <select id="euStatus">
                <option value="1" ${u.status===1?'selected':''}>启用</option>
                <option value="0" ${u.status===0?'selected':''}>禁用</option>
              </select>
            </div>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="settings.saveEditUser(${id})">保存修改</button>`
    );
  },

  saveEditUser(id) {
    const u = DB.findById('users', id);
    const changes = [];
    if (document.getElementById('euName').value !== u.name) changes.push('姓名');
    if (document.getElementById('euRole').value !== u.role) changes.push('角色');
    if (+document.getElementById('euStatus').value !== u.status) changes.push('状态');
    const pwd = document.getElementById('euPwd').value;
    if (pwd) changes.push('密码');
    const newAvatar = document.getElementById('editUserAvatarUrl')?.value;
    if (newAvatar !== u.avatar) changes.push('头像');

    const updates = {
      name: document.getElementById('euName').value,
      role: document.getElementById('euRole').value,
      status: +document.getElementById('euStatus').value
    };
    if (pwd) updates.password = pwd;
    if (newAvatar) updates.avatar = newAvatar;
    DB.update('users', id, updates);
    audit.log('settings', '编辑用户', u.username, `修改: ${changes.join(', ') || '无变化'}`);
    closeModal();
    toast('用户信息已更新！');
    this.switchTab('users');
  },

  delUser(id) {
    openModal('确认删除',
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除该用户吗？</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="settings.confirmDelUser(${id})">确认删除</button>`
    );
  },

  confirmDelUser(id) {
    const u = DB.findById('users', id);
    DB.delete('users', id);
    if (u) audit.log('settings', '删除用户', u.username, `姓名: ${u.name}, 角色: ${u.role}`);
    closeModal();
    toast('用户已删除', 'warning');
    this.switchTab('users');
  },

  changePwd() {
    const old = document.getElementById('oldPwd').value;
    const nw = document.getElementById('newPwd').value;
    const cf = document.getElementById('confirmPwd').value;
    if (old !== currentUser.password) { toast('当前密码错误', 'error'); return; }
    if (nw.length < 6) { toast('新密码至少6位', 'error'); return; }
    if (nw !== cf) { toast('两次密码不一致', 'error'); return; }
    // 更新数据库中的密码
    DB.update('users', currentUser.id, { password: nw });
    // 更新内存中的当前用户
    currentUser.password = nw;
    // 清除自动登录缓存，强制重新登录
    localStorage.removeItem('wms_autologin');
    audit.log('settings', '修改密码', currentUser.username, '用户修改了自己的登录密码');
    toast('密码修改成功，请重新登录');
    setTimeout(() => logout(), 1200);
  },

  // 选择备份保存位置
  selectBackupPath() {
    if (window.showSaveFilePicker || window.showDirectoryPicker) {
      toast('备份时将自动弹出保存位置选择框，可直接选择保存路径', 'success');
      document.getElementById('backupPath').value = '备份时弹窗选择保存位置';
      document.getElementById('backupPath').dataset.dirHandle = '';
      document.getElementById('backupPath').dataset.dirName = '';
      document.getElementById('backupPath').dataset.useFS = 'true';
    } else {
      toast('您的浏览器不支持选择保存位置，备份文件将保存到浏览器默认下载文件夹', 'warning');
      document.getElementById('backupPath').value = '浏览器下载（默认位置）';
      document.getElementById('backupPath').dataset.dirHandle = '';
      document.getElementById('backupPath').dataset.dirName = '';
      document.getElementById('backupPath').dataset.useFS = 'false';
    }
  },

  // 降级方案：提示使用浏览器下载
  _fallbackDownload() {
    toast('将使用浏览器下载方式保存备份文件，请在弹出的保存对话框中选择位置', 'info');
    document.getElementById('backupPath').value = '浏览器下载（保存时选择位置）';
    document.getElementById('backupPath').dataset.dirHandle = '';
    document.getElementById('backupPath').dataset.dirName = '';
    document.getElementById('backupPath').dataset.useFS = 'false';
  },

  // 获取备份文件名
  getBackupFilename(suffix = '') {
    const input = document.getElementById('backupFilename');
    let name = input ? input.value.trim() : 'wms_backup';
    if (!name) name = 'wms_backup';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${name}${suffix}_${date}.json`;
  },

  // 完整备份
  async backupAll() {
    const data = {};
    ['users', 'goods', 'categories', 'units', 'locations', 'suppliers', 'customers', 'departments', 'employees', 'claimRecords',
      'inbounds', 'outbounds', 'inventories', 'audits', 'transfers', 'warehouses',
      'invoices', 'customerPrices', 'carriers', 'freightTemplates', 'transportPlans', 'deliveryOrders',
      'boms', 'bomSubstitutes', 'ecns', 'productionOrders', 'processes', 'orderProcesses', 'workReports',
      'equipment', 'tools', 'outsourcingOrders', 'outsourcingMaterials',
      'incomingInspections', 'processInspections', 'finalInspections', 'qualityNCRs', 'spcRecords', 'qualityCertificates',
      'serviceTickets'
    ].forEach(k => {
      data[k] = DB.get(k);
    });
    data._backupInfo = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy: currentUser.username,
      type: 'full',
      accountId: DB.getCurrentAccount(),
      accountName: (() => { const accs = DB.getAccounts(); const a = accs.find(x => x.id === DB.getCurrentAccount()); return a ? a.name : '演示账套'; })()
    };
    
    const filename = this.getBackupFilename('_full');
    await this.saveBackup(data, filename);
    toast('完整备份成功！', 'success');
  },

  // 备份商品
  async backupGoods() {
    const data = {
      goods: DB.get('goods'),
      categories: DB.get('categories'),
      suppliers: DB.get('suppliers'),
      customers: DB.get('customers'),
      _backupInfo: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.username,
        type: 'goods'
      }
    };
    const filename = this.getBackupFilename('_goods');
    await this.saveBackup(data, filename);
    toast('商品数据备份成功！', 'success');
  },

  // 备份记录
  async backupRecords() {
    const data = {
      inbounds: DB.get('inbounds'),
      outbounds: DB.get('outbounds'),
      inventories: DB.get('inventories'),
      _backupInfo: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.username,
        type: 'records'
      }
    };
    const filename = this.getBackupFilename('_records');
    await this.saveBackup(data, filename);
    toast('出入库记录备份成功！', 'success');
  },

  // 保存备份（支持 File System Access API 或传统下载）
  async saveBackup(data, filename) {
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    // 优先使用 showSaveFilePicker（用户可直接选择保存位置）
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: '备份文件',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        toast('备份已保存到: ' + handle.name, 'success');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // 用户取消
        console.warn('showSaveFilePicker 失败，降级为传统下载:', e.message);
      }
    }

    // 传统下载方式（浏览器默认下载位置）
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast('备份文件已开始下载，请查看浏览器下载列表', 'info');
  },

  // 选择恢复文件
  selectRestoreFile() {
    document.getElementById('restoreFileInput').click();
  },

  // 处理选择的恢复文件
  handleRestoreFile(file) {
    if (!file) return;
    document.getElementById('restoreFilePath').value = file.name;
    document.getElementById('restoreFilePath').dataset.fileContent = '';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('restoreFilePath').dataset.fileContent = e.target.result;
      try {
        const data = JSON.parse(e.target.result);
        if (data._backupInfo) {
          toast(`已加载 ${data._backupInfo.type} 备份，日期: ${data._backupInfo.createdAt.slice(0,10)}`, 'success');
        } else {
          toast('已加载备份文件', 'success');
        }
      } catch (err) {
        toast('文件格式错误，无法解析', 'error');
        document.getElementById('restoreFilePath').value = '';
      }
    };
    reader.readAsText(file);
  },

  // 查看自动备份记录
  showAutoBackups() {
    try {
      const request = indexedDB.open('WMS_Backup', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const backups = getAll.result.sort((a, b) => b.timestamp - a.timestamp);
          if (!backups.length) {
            openModal('自动备份记录', `
              <div style="text-align:center;padding:40px 0">
                <div style="font-size:48px;margin-bottom:12px">📭</div>
                <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">暂无自动备份</div>
                <div style="color:var(--text-muted);font-size:13px">请在「系统信息」中开启自动备份功能</div>
              </div>`,
              `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`,
              true
            );
            return;
          }
          openModal('自动备份记录', `
            <div style="color:var(--text-muted);font-size:12px;margin-bottom:12px">共 ${backups.length} 个备份（保留最近 5 个），每条可恢复或导出</div>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto">
              ${backups.map((b, i) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:var(--bg);border-radius:8px">
                  <div>
                    <div style="font-weight:600;font-size:13px">
                      ${b.data ? '<span style="color:var(--success)">●</span>' : '<span style="color:var(--text-muted)">○</span>'}
                      ${i === 0 ? '最新备份' : '备份 #' + (backups.length - i)}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                      ${b.date} · ${b.size ? (b.size / 1024).toFixed(1) + ' KB' : '-'}
                    </div>
                  </div>
                  <div style="display:flex;gap:6px">
                    <button class="btn btn-success btn-sm" onclick="settings.restoreAutoBackup('${b.id}')" ${!b.data?'disabled':''}>🔄 恢复</button>
                    <button class="btn btn-outline btn-sm" onclick="settings.exportAutoBackup('${b.id}')" ${!b.data?'disabled':''}>📥 导出</button>
                  </div>
                </div>
              `).join('')}
            </div>`,
            `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`,
            true
          );
        };
        request.onerror = () => {
          toast('无法读取备份记录', 'error');
        };
      };
    } catch (e) {
      toast('浏览器不支持 IndexedDB', 'error');
    }
  },

  // 从自动备份恢复
  restoreAutoBackup(backupId) {
    try {
      const request = indexedDB.open('WMS_Backup', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getReq = store.get(backupId);
        getReq.onsuccess = () => {
          const backup = getReq.result;
          if (!backup || !backup.data) { toast('备份数据不存在', 'error'); return; }
          closeModal();
          // 将备份内容设置为 restoreFilePath 的内容，复用已有恢复逻辑
          setTimeout(() => {
            const el = document.getElementById('restoreFilePath');
            if (el) {
              el.value = '自动备份_' + backup.date.replace(/[\/:]/g, '-') + '.json';
              el.dataset.fileContent = backup.data;
            }
            settings.restoreAll();
          }, 300);
        };
      };
    } catch (e) {
      toast('恢复失败', 'error');
    }
  },

  // 导出自动备份为文件
  exportAutoBackup(backupId) {
    try {
      const request = indexedDB.open('WMS_Backup', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('backups', 'readonly');
        const store = tx.objectStore('backups');
        const getReq = store.get(backupId);
        getReq.onsuccess = () => {
          const backup = getReq.result;
          if (!backup || !backup.data) { toast('备份数据不存在', 'error'); return; }
          const blob = new Blob([backup.data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'wms_autobackup_' + backup.date.replace(/[\/:]/g, '-') + '.json';
          a.click();
          URL.revokeObjectURL(url);
          toast('备份文件已导出', 'success');
        };
      };
    } catch (e) {
      toast('导出失败', 'error');
    }
  },

  // 完整恢复
  restoreAll() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) { toast('请先选择备份文件', 'error'); return; }
    
    openModal('确认恢复',
      `<div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(245,158,11,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⚠️</div>
        <div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px">确定要完整恢复数据吗？</div>
        <div style="font-size:13px;color:#64748b">此操作将<span style="color:#ef4444;font-weight:600">覆盖所有现有数据</span>，包括用户、商品、记录等</div>
        <div style="margin-top:12px;padding:10px;background:#fef3c7;border-radius:6px;font-size:12px;color:#92400e">💡 建议先进行数据备份</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-warning" onclick="settings.confirmRestoreAll()">确认恢复</button>`
    );
  },

  confirmRestoreAll() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) { toast('请先选择备份文件', 'error'); return; }
    
    try {
      const data = JSON.parse(content);
      const keys = ['users', 'goods', 'categories', 'units', 'locations', 'suppliers', 'customers', 'departments', 'employees', 'claimRecords',
        'inbounds', 'outbounds', 'inventories', 'audits', 'transfers', 'warehouses',
        'invoices', 'customerPrices', 'carriers', 'freightTemplates', 'transportPlans', 'deliveryOrders',
        'boms', 'bomSubstitutes', 'ecns', 'productionOrders', 'processes', 'orderProcesses', 'workReports',
        'equipment', 'tools', 'outsourcingOrders', 'outsourcingMaterials',
        'incomingInspections', 'processInspections', 'finalInspections', 'qualityNCRs', 'spcRecords', 'qualityCertificates',
        'serviceTickets'];
      const counts = {};
      keys.forEach(k => {
        if (data[k]) {
          DB.set(k, data[k]);
          counts[k] = data[k].length;
        }
      });
      closeModal();
      toast(`数据恢复成功！已恢复 ${keys.filter(k => counts[k]).length} 类数据`, 'success');
      audit.log('settings', '恢复数据', '完整恢复', `恢复数据类型: ${Object.keys(counts).join(', ')}`);
      setTimeout(() => location.reload(), 800);
    } catch (e) {
      toast('恢复失败：' + e.message, 'error');
    }
  },

  // 恢复商品
  restoreGoods() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) { toast('请先选择备份文件', 'error'); return; }
    
    openModal('确认恢复商品',
      `<div style="text-align:center;padding:20px 0">
        <div style="font-size:14px;color:#64748b;margin-bottom:8px">确定要恢复商品数据吗？</div>
        <div style="font-size:13px;color:#94a3b8">将恢复商品、分类、供应商、客户信息</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-success" onclick="settings.confirmRestoreGoods()">确认恢复</button>`
    );
  },

  confirmRestoreGoods() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) return;
    
    try {
      const data = JSON.parse(content);
      const counts = { goods: data.goods?.length || 0, categories: data.categories?.length || 0, suppliers: data.suppliers?.length || 0, customers: data.customers?.length || 0 };
      if (data.goods) DB.set('goods', data.goods);
      if (data.categories) DB.set('categories', data.categories);
      if (data.suppliers) DB.set('suppliers', data.suppliers);
      if (data.customers) DB.set('customers', data.customers);
      closeModal();
      toast(`商品数据恢复成功！商品${counts.goods}条、分类${counts.categories}条、供应商${counts.suppliers}条、客户${counts.customers}条`, 'success');
      audit.log('settings', '恢复数据', '商品数据', `恢复商品${counts.goods}条, 分类${counts.categories}条, 供应商${counts.suppliers}条, 客户${counts.customers}条`);
      // 刷新当前页面显示最新数据
      showPage('settings');
      updateWarningBadge();
    } catch (e) {
      toast('恢复失败：' + e.message, 'error');
    }
  },

  // 恢复记录
  restoreRecords() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) { toast('请先选择备份文件', 'error'); return; }
    
    openModal('确认恢复记录',
      `<div style="text-align:center;padding:20px 0">
        <div style="font-size:14px;color:#64748b;margin-bottom:8px">确定要恢复出入库记录吗？</div>
        <div style="font-size:13px;color:#94a3b8">将恢复入库、出库和盘点记录</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-success" onclick="settings.confirmRestoreRecords()">确认恢复</button>`
    );
  },

  confirmRestoreRecords() {
    const content = document.getElementById('restoreFilePath')?.dataset?.fileContent;
    if (!content) return;
    
    try {
      const data = JSON.parse(content);
      const counts = { inbounds: data.inbounds?.length || 0, outbounds: data.outbounds?.length || 0, inventories: data.inventories?.length || 0 };
      if (data.inbounds) DB.set('inbounds', data.inbounds);
      if (data.outbounds) DB.set('outbounds', data.outbounds);
      if (data.inventories) DB.set('inventories', data.inventories);
      closeModal();
      toast(`出入库记录恢复成功！入库${counts.inbounds}条、出库${counts.outbounds}条、盘点${counts.inventories}条`, 'success');
      audit.log('settings', '恢复数据', '出入库记录', `恢复入库${counts.inbounds}条, 出库${counts.outbounds}条, 盘点${counts.inventories}条`);
      // 刷新当前页面显示最新数据
      showPage('settings');
    } catch (e) {
      toast('恢复失败：' + e.message, 'error');
    }
  },

  clearLogs() {
    openModal('确认清空记录',
      `<div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(245,158,11,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⚠️</div>
        <div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px">确定要清空所有出入库记录吗？</div>
        <div style="font-size:13px;color:#64748b">此操作将删除所有出入库记录，<span style="color:#f59e0b;font-weight:600">同时重置商品库存为0</span></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-warning" onclick="settings.confirmClearLogs()">确认清空</button>`
    );
  },

  confirmClearLogs() {
    const inCount = DB.get('inbounds').length;
    const outCount = DB.get('outbounds').length;
    DB.set('inbounds', []);
    DB.set('outbounds', []);
    // 同时重置商品库存为0
    const goods = DB.get('goods') || [];
    goods.forEach(g => g.stock = 0);
    DB.set('goods', goods);
    audit.log('settings', '清空记录', '出入库记录', `清空入库${inCount}条, 出库${outCount}条, 重置${goods.length}个商品库存`);
    closeModal();
    toast(`出入库记录已清空，${goods.length}个商品库存已重置为0`, 'warning');
    // 刷新仪表盘数据（使用 TabManager 直接渲染确保刷新）
    if (typeof TabManager !== 'undefined') {
      TabManager.renderPage('dashboard');
    } else {
      document.getElementById('pageContainer').innerHTML = dashboard.render();
    }
  },

  resetAll() {
    openModal('⚠️ 危险操作确认',
      `<div style="text-align:center;padding:20px 0">
        <div style="width:70px;height:70px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px">💥</div>
        <div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:8px">确定要重置全部数据吗？</div>
        <div style="font-size:13px;color:#ef4444;font-weight:600;margin-bottom:12px">此操作将清除所有数据，不可恢复！</div>
        <div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px;color:#991b1b;text-align:left">
          将清除：<br>
          • 所有商品信息<br>
          • 所有出入库记录<br>
          • 所有供应商和客户<br>
          • 所有用户（保留admin）<br>
          • 所有盘点记录<br>
          • 所有审计日志
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="settings.confirmResetAll()">确认重置</button>`
    );
  },

  confirmResetAll() {
    // 仅清除当前账套自身的业务数据（商品/记录/用户/权限等），不能像之前那样
    // 按 'wms_' 前缀清空整个 localStorage —— 那样会连账套列表(wms_accounts)和
    // 其它账套的数据一起删掉，重启后账套列表只剩硬编码的默认账套，
    // 表现为"新建账套凭空消失、恢复成默认账套"。
    const accountId = DB.getCurrentAccount();
    const accountName = (DB.getAccounts().find(a => a.id === accountId) || {}).name || accountId;
    DB._accountKeys.forEach(key => localStorage.removeItem(DB._prefix(key)));
    localStorage.removeItem('wms_' + accountId + '_initialized');
    audit.log('settings', '重置数据', '全部数据', `账套「${accountName}」的数据已重置为初始状态`);
    closeModal();
    toast(`账套「${accountName}」的数据已重置，即将刷新...`, 'warning');
    setTimeout(() => location.reload(), 1500);
  },

  // ==================== 账套管理 ====================
  renderAccountSets() {
    if (currentUser.role !== 'admin') {
      return '<div class="card"><div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">🔒</div><div>只有超级管理员才能管理账套</div></div></div>';
    }
    const accounts = DB.getAccounts();
    const currentId = DB.getCurrentAccount();

    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="justify-content:space-between">
          <span>📂 账套管理</span>
          <button class="btn btn-primary" onclick="settings.openAddAccount()">+ 新建账套</button>
        </div>
        <div style="margin-bottom:12px;padding:10px 14px;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.12);border-radius:8px;font-size:12px;color:var(--text-muted)">
          💡 账套用于隔离不同业务单元的数据（如不同公司、仓库、部门）。每个账套拥有独立的用户、商品、出入库记录等数据。切换账套后需重新登录。
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px">
          ${accounts.map(a => {
            const stats = DB.getAccountStats(a.id);
            const isCurrent = a.id === currentId;
            return `
            <div style="border:2px solid ${isCurrent?'var(--primary)':'var(--border)'};border-radius:12px;padding:16px;background:${isCurrent?'rgba(79,110,247,0.02)':'white'};transition:all 0.2s;position:relative">
              ${isCurrent ? '<div style="position:absolute;top:12px;right:12px;background:var(--primary);color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600">当前使用</div>' : ''}
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:40px;height:40px;border-radius:10px;background:var(--primary);background:${isCurrent?'var(--primary)':'var(--text-muted)'}18;display:flex;align-items:center;justify-content:center;font-size:18px">📁</div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:15px">${a.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${a.desc || '无描述'}</div>
                </div>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:12px">
                <div style="flex:1;text-align:center;padding:8px;background:var(--bg);border-radius:8px">
                  <div style="font-size:18px;font-weight:700">${stats.keyCount}</div>
                  <div style="font-size:11px;color:var(--text-muted)">数据表</div>
                </div>
                <div style="flex:1;text-align:center;padding:8px;background:var(--bg);border-radius:8px">
                  <div style="font-size:18px;font-weight:700">${stats.dataCount}</div>
                  <div style="font-size:11px;color:var(--text-muted)">记录数</div>
                </div>
                <div style="flex:1;text-align:center;padding:8px;background:var(--bg);border-radius:8px">
                  <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${a.createdAt || '-'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">创建日期</div>
                </div>
              </div>
              <div style="display:flex;gap:6px">
                ${!isCurrent ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="settings.switchToAccount('${a.id}')">🔄 切换到此账套</button>` : `<button class="btn btn-outline btn-sm" style="flex:1" disabled>当前使用中</button>`}
                ${a.id !== 'default' ? `
                  <button class="btn btn-outline btn-sm" onclick="settings.openEditAccount('${a.id}')">✏️</button>
                  <button class="btn btn-outline btn-sm" onclick="settings.exportAccountData('${a.id}')">📤</button>
                  ${!isCurrent ? `<button class="btn btn-danger btn-sm" onclick="settings.deleteAccountConfirm('${a.id}')">🗑</button>` : ''}
                ` : `<button class="btn btn-ghost btn-sm" disabled style="opacity:0.4;font-size:11px">演示</button>`}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 存储使用说明</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.8">
          <div>• 当前浏览器 localStorage 总使用: <strong>${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB</strong></div>
          <div>• 账套数量: <strong>${accounts.length}</strong> 个</div>
          <div>• 每个账套独立存储用户、商品、出入库记录、权限配置等数据</div>
          <div>• 系统配置（品牌、打印设置、主题）为全局共享，不随账套切换</div>
          <div style="margin-top:8px;padding:8px 12px;background:#fef3c7;border-radius:8px;color:#92400e">
            ⚠️ localStorage 容量有限（一舨 5-10MB），大量数据请定期导出备份或升级为服务器数据库版本
          </div>
        </div>
      </div>
    </div>`;
  },

  openAddAccount() {
    openModal('新建账套', `
      <div class="form-row">
        <div class="form-item"><label>账套名称 *</label><input id="accName" placeholder="如: 上海分公司、A仓库"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>账套描述</label><input id="accDesc" placeholder="账套用途说明（可选）"></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="settings.saveNewAccount()">创建账套</button>
    `);
  },

  saveNewAccount() {
    const name = document.getElementById('accName').value.trim();
    const desc = document.getElementById('accDesc').value.trim();
    if (!name) { toast('请输入账套名称', 'error'); return; }
    const id = DB.createAccount(name, desc);
    audit.log('settings', '新建账套', id, `名称: ${name}`);
    closeModal();
    toast(`账套「${name}」创建成功！`, 'success');
    this.switchTab('accountSets');
  },

  openEditAccount(id) {
    const accounts = DB.getAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    openModal('编辑账套', `
      <div class="form-row">
        <div class="form-item"><label>账套名称 *</label><input id="eaName" value="${acc.name}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>账套描述</label><input id="eaDesc" value="${acc.desc||''}"></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="settings.saveEditAccount('${id}')">保存</button>
    `);
  },

  saveEditAccount(id) {
    const name = document.getElementById('eaName').value.trim();
    const desc = document.getElementById('eaDesc').value.trim();
    if (!name) { toast('请输入账套名称', 'error'); return; }
    DB.renameAccount(id, name, desc);
    audit.log('settings', '编辑账套', id, `名称: ${name}`);
    closeModal();
    toast('账套已更新', 'success');
    this.switchTab('accountSets');
  },

  switchToAccount(id) {
    openModal('切换账套', `
      <div style="padding:16px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px">🔄</div>
        <div style="font-size:14px;margin-bottom:8px">切换到新账套后，当前会话将结束，需要重新登录。</div>
        <div style="font-size:12px;color:var(--text-muted)">确定继续？</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="settings.confirmSwitchAccount('${id}')">确认切换</button>
    `);
  },

  confirmSwitchAccount(id) {
    if (currentUser) SessionGuard.release(DB.getCurrentAccount()); // 先释放旧账套的并发名额，再切换，避免名额被错误挂在新账套下
    DB.switchAccount(id);
    audit.log('settings', '切换账套', id, '');
    closeModal();
    toast('账套已切换，请重新登录', 'info');
    // 清除登录状态并跳转登录页
    localStorage.removeItem('wms_autologin');
    setTimeout(() => location.reload(), 800);
  },

  deleteAccountConfirm(id) {
    const accounts = DB.getAccounts();
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    const stats = DB.getAccountStats(id);
    openModal('确认删除账套', `
      <div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确定删除账套「${acc.name}」？</div>
        <div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;margin-top:8px">
          ⚠️ 该账套包含 <strong>${stats.keyCount}</strong> 个数据表、<strong>${stats.dataCount}</strong> 条记录，删除后数据将无法恢复！
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">建议先导出备份再删除</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="settings.confirmDeleteAccount('${id}')">确认删除</button>
    `);
  },

  confirmDeleteAccount(id) {
    const ok = DB.deleteAccount(id);
    closeModal();
    if (!ok) { toast('该账套当前正在使用中或为默认账套，无法删除', 'error'); return; }
    audit.log('settings', '删除账套', id, '');
    toast('账套已删除', 'warning');
    this.switchTab('accountSets');
  },

  exportAccountData(id) {
    const data = DB.exportAccount(id);
    const accounts = DB.getAccounts();
    const acc = accounts.find(a => a.id === id);
    const exportObj = { _accountExport: true, accountId: id, accountName: acc ? acc.name : id, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `账套备份_${acc ? acc.name : id}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('账套数据已导出', 'success');
  },

  // ==================== 角色管理 ====================
  renderRoleManagement() {
    if (currentUser.role !== 'admin') {
      return '<div class="card"><div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">🔒</div><div>只有超级管理员才能管理角色</div></div></div>';
    }
    const allRoles = getAllRoles();
    const customRoles = getCustomRoles();
    const users = DB.get('users');
    const permData = this._getPermData();

    // 统计每个角色的用户数
    const roleUserCount = {};
    users.forEach(u => { roleUserCount[u.role] = (roleUserCount[u.role]||0) + 1; });

    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="justify-content:space-between">
          <span>🏷 角色列表</span>
          <button class="btn btn-primary" onclick="settings.openAddRole()">+ 新建角色</button>
        </div>
        <div style="margin-bottom:12px;padding:10px 14px;background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);border-radius:8px;font-size:12px;color:var(--text-muted)">
          💡 系统内置 3 个基础角色（不可删除），您可以创建自定义角色来满足业务需求。自定义角色标记 ✦ 符号。
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
          ${allRoles.map(r => {
            const permCount = r.builtIn && r.key === 'admin' ? '全部' : (() => {
              const rp = permData[r.key] || {};
              let c = 0;
              Object.values(rp).forEach(arr => c += arr.length);
              return c;
            })();
            const userCount = roleUserCount[r.key] || 0;
            return `
            <div style="border:1.5px solid ${r.color}33;border-radius:12px;padding:16px;background:white;transition:all 0.2s;position:relative">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <div style="width:40px;height:40px;border-radius:10px;background:${r.color}18;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:${r.color}">${r.name.slice(0,1)}</div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:15px;color:${r.color}">${r.name} ${!r.builtIn?'<span style="font-size:10px;color:var(--text-muted)">✦自定义</span>':''}</div>
                  <div style="font-size:11px;color:var(--text-muted);font-family:monospace">${r.key}</div>
                </div>
              </div>
              ${r.desc ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${r.desc}</div>` : ''}
              <div style="display:flex;gap:12px;margin-bottom:12px">
                <div style="flex:1;text-align:center;padding:8px;background:var(--bg);border-radius:8px">
                  <div style="font-size:18px;font-weight:700;color:var(--text)">${userCount}</div>
                  <div style="font-size:11px;color:var(--text-muted)">用户数</div>
                </div>
                <div style="flex:1;text-align:center;padding:8px;background:var(--bg);border-radius:8px">
                  <div style="font-size:18px;font-weight:700;color:var(--text)">${permCount}</div>
                  <div style="font-size:11px;color:var(--text-muted)">权限项</div>
                </div>
              </div>
              <div style="display:flex;gap:6px">
                <button class="btn btn-outline btn-sm" style="flex:1" onclick="settings._permEditRole='${r.key}';settings.switchTab('permissions')">🔐 配置权限</button>
                ${!r.builtIn ? `
                  <button class="btn btn-outline btn-sm" onclick="settings.openEditRole('${r.key}')">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="settings.deleteRole('${r.key}')">🗑</button>
                ` : `<button class="btn btn-ghost btn-sm" disabled style="opacity:0.4;font-size:11px">内置</button>`}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  },

  openAddRole() {
    const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];
    openModal('新建角色', `
      <div class="form-row cols-2">
        <div class="form-item"><label>角色名称 *</label><input id="roleName" placeholder="如: 销售经理、质检员"></div>
        <div class="form-item"><label>角色标识 *</label><input id="roleKey" placeholder="英文标识，如: sales_mgr"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>角色描述</label><input id="roleDesc" placeholder="角色职责描述（可选）"></div>
      </div>
      <div class="form-item">
        <label>角色颜色</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${colors.map((c,i) => `<label style="cursor:pointer"><input type="radio" name="roleColor" value="${c}" ${i===4?'checked':''} style="display:none"><div onclick="this.parentElement.querySelectorAll('div').forEach(d=>d.style.border='2px solid transparent');this.style.border='2px solid ${c}'" class="role-color-opt" style="width:32px;height:32px;border-radius:8px;background:${c};border:2px solid ${i===4?c:'transparent'};transition:all 0.2s"></div></label>`).join('')}
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="settings.saveNewRole()">创建角色</button>
    `);
  },

  saveNewRole() {
    const name = document.getElementById('roleName').value.trim();
    const key = document.getElementById('roleKey').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const desc = document.getElementById('roleDesc').value.trim();
    const colorEl = document.querySelector('input[name="roleColor"]:checked');
    const color = colorEl ? colorEl.value : '#8b5cf6';

    if (!name) { toast('请输入角色名称', 'error'); return; }
    if (!key) { toast('请输入角色标识', 'error'); return; }
    if (key.length < 2) { toast('角色标识至少2个字符', 'error'); return; }

    // 检查是否重复
    const existing = getAllRoles();
    if (existing.find(r => r.key === key)) { toast('角色标识已存在，请更换', 'error'); return; }
    if (existing.find(r => r.name === name)) { toast('角色名称已存在', 'error'); return; }

    const customRoles = getCustomRoles();
    customRoles.push({ key, name, desc, color, builtIn: false, createdAt: new Date().toISOString() });
    saveCustomRoles(customRoles);

    // 权限矩阵未配置时 hasPerm() 默认拒绝，新角色若不给基础权限将完全无法使用，
    // 这里直接复用"智能填充默认"里自定义角色的那套默认值（不含审核/删除/导入/系统设置）
    this.applyDefaultPermsSilently(key);

    audit.log('settings', '新建角色', key, `名称: ${name}`);
    closeModal();
    toast(`角色「${name}」创建成功！`, 'success');
    this.switchTab('roles');
  },

  openEditRole(key) {
    const customRoles = getCustomRoles();
    const role = customRoles.find(r => r.key === key);
    if (!role) { toast('只能编辑自定义角色', 'warning'); return; }
    const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

    openModal('编辑角色 - ' + role.name, `
      <div class="form-row cols-2">
        <div class="form-item"><label>角色名称 *</label><input id="erName" value="${role.name}"></div>
        <div class="form-item"><label>角色标识</label><input id="erKey" value="${role.key}" readonly style="background:var(--bg)"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>角色描述</label><input id="erDesc" value="${role.desc||''}"></div>
      </div>
      <div class="form-item">
        <label>角色颜色</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${colors.map(c => `<label style="cursor:pointer"><input type="radio" name="erColor" value="${c}" ${c===role.color?'checked':''} style="display:none"><div onclick="this.parentElement.querySelectorAll('div').forEach(d=>d.style.border='2px solid transparent');this.style.border='2px solid ${c}'" style="width:32px;height:32px;border-radius:8px;background:${c};border:2px solid ${c===role.color?c:'transparent'};transition:all 0.2s"></div></label>`).join('')}
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="settings.saveEditRole('${key}')">保存修改</button>
    `);
  },

  saveEditRole(key) {
    const customRoles = getCustomRoles();
    const idx = customRoles.findIndex(r => r.key === key);
    if (idx < 0) { toast('角色不存在', 'error'); return; }

    const name = document.getElementById('erName').value.trim();
    const desc = document.getElementById('erDesc').value.trim();
    const colorEl = document.querySelector('input[name="erColor"]:checked');
    const color = colorEl ? colorEl.value : customRoles[idx].color;

    if (!name) { toast('角色名称不能为空', 'error'); return; }

    // 检查名称重复（排除自己）
    const allRoles = getAllRoles();
    if (allRoles.find(r => r.name === name && r.key !== key)) { toast('角色名称已存在', 'error'); return; }

    customRoles[idx].name = name;
    customRoles[idx].desc = desc;
    customRoles[idx].color = color;
    saveCustomRoles(customRoles);

    audit.log('settings', '编辑角色', key, `名称: ${name}`);
    closeModal();
    toast('角色已更新', 'success');
    this.switchTab('roles');
  },

  deleteRole(key) {
    const customRoles = getCustomRoles();
    const role = customRoles.find(r => r.key === key);
    if (!role) { toast('只能删除自定义角色', 'warning'); return; }

    // 检查是否有用户使用
    const users = DB.get('users');
    const userCount = users.filter(u => u.role === key).length;

    openModal('确认删除角色', `
      <div style="text-align:center;padding:20px 0">
        <div style="width:60px;height:60px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">⚠️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确定删除角色「${role.name}」？</div>
        ${userCount > 0 ? `<div style="padding:10px;background:#fef3c7;border-radius:8px;font-size:12px;color:#92400e;margin-top:8px">⚠️ 当前有 <strong>${userCount}</strong> 个用户使用此角色，删除后这些用户将变为“只读用户”</div>` : ''}
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">此操作不可撤销</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="settings.confirmDeleteRole('${key}')">确认删除</button>
    `);
  },

  confirmDeleteRole(key) {
    let customRoles = getCustomRoles();
    customRoles = customRoles.filter(r => r.key !== key);
    saveCustomRoles(customRoles);

    // 将使用此角色的用户迁移到 viewer
    const users = DB.get('users');
    let migrated = 0;
    users.forEach(u => {
      if (u.role === key) { u.role = 'viewer'; migrated++; }
    });
    DB.set('users', users);

    // 清除该角色的权限配置
    const permData = this._getPermData();
    delete permData[key];
    this._savePermData(permData);

    audit.log('settings', '删除角色', key, `迁移${migrated}个用户`);
    closeModal();
    toast('角色已删除' + (migrated ? `，${migrated}个用户已迁移为只读用户` : ''), 'warning');
    this.switchTab('roles');
  },

  // ==================== 权限管理 ====================
  _permModules: [
    { key: 'dashboard', name: '数据看板', icon: '📊' },
    { key: 'goods', name: '商品管理', icon: '📦' },
    { key: 'inbound', name: '入库管理', icon: '📥' },
    { key: 'outbound', name: '出库管理', icon: '📤' },
    { key: 'inventory', name: '库存盘点', icon: '📋' },
    { key: 'record', name: '出入库明细', icon: '📄' },
    { key: 'transfer', name: '仓库调拨', icon: '🔄' },
    { key: 'warehouse', name: '仓库管理', icon: '🏭' },
    { key: 'supplier', name: '供应商管理', icon: '🏭' },
    { key: 'customer', name: '客户管理', icon: '👥' },
    { key: 'department', name: '部门管理', icon: '🏢' },
    { key: 'report', name: '报表中心', icon: '📈' },
    { key: 'finance', name: '财务管理', icon: '💰' },
    { key: 'hrm', name: '人力资源', icon: '👤' },
    { key: 'crm', name: '客户关系', icon: '💼' },
    { key: 'analytics', name: '数据分析', icon: '📉' },
    { key: 'salesKpi', name: '销售KPI', icon: '🎯' },
    { key: 'eam', name: '售后管理', icon: '🔧' },
    { key: 'invoice', name: '发票管理', icon: '🧾' },
    { key: 'customerPrice', name: '客户价格', icon: '💲' },
    { key: 'carrier', name: '承运商管理', icon: '🚛' },
    { key: 'transportPlan', name: '运输计划', icon: '🗺' },
    { key: 'freight', name: '运费管理', icon: '💵' },
    { key: 'tracking', name: '物流跟踪', icon: '📍' },
    { key: 'delivery', name: '配送管理', icon: '🚚' },
    { key: 'bom', name: 'BOM管理', icon: '🧩' },
    { key: 'productionPlan', name: '生产计划', icon: '🏭' },
    { key: 'mes', name: '车间管理', icon: '⚙️' },
    { key: 'outsourcing', name: '委外加工', icon: '🔩' },
    { key: 'quality', name: '质量管理', icon: '✅' },
    { key: 'warning', name: '预警中心', icon: '⚠️' },
    { key: 'audit', name: '审计日志', icon: '📑' },
    { key: 'roles', name: '角色管理', icon: '🏷' },
    { key: 'settings', name: '系统设置', icon: '⚙️' }
  ],

  _permActions: [
    { key: 'view', name: '查看', icon: '👁' },
    { key: 'create', name: '新建', icon: '➕' },
    { key: 'edit', name: '编辑', icon: '✏️' },
    { key: 'delete', name: '删除', icon: '🗑' },
    { key: 'export', name: '导出', icon: '📥' },
    { key: 'import', name: '导入', icon: '📤' },
    { key: 'print', name: '打印', icon: '🖨' },
    { key: 'approve', name: '审核', icon: '✅' }
  ],

  _getPermData() {
    const raw = localStorage.getItem(DB._prefix('permissions'));
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    // 默认权限
    return {
      admin: {},  // admin拥有所有权限（空对象表示全部允许）
      staff: {},  // staff默认大部分权限，但某些操作受限
      viewer: {}  // viewer只有查看权限
    };
  },

  _savePermData(data) {
    localStorage.setItem(DB._prefix('permissions'), JSON.stringify(data));
  },

  // 获取角色在某模块的权限集合
  _getRolePerms(role) {
    const data = this._getPermData();
    return data[role] || {};
  },

  renderPermissions() {
    if (currentUser.role !== 'admin') {
      return '<div class="card"><div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">🔒</div><div>只有超级管理员才能配置权限</div></div></div>';
    }
    const modules = this._permModules;
    const actions = this._permActions;
    const permData = this._getPermData();
    const roles = getAllRoles();
    const selRole = this._permEditRole || 'staff';
    const rolePerms = permData[selRole] || {};

    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title" style="justify-content:space-between">
          <span>🔐 权限配置矩阵</span>
          <div style="display:flex;gap:8px;align-items:center">
            <span style="font-size:12px;color:var(--text-muted)">配置角色：</span>
            ${roles.map(r => `
              <button onclick="settings._permEditRole='${r.key}';settings.switchTab('permissions')"
                style="padding:6px 14px;border:2px solid ${selRole===r.key?r.color:'var(--border)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;
                background:${selRole===r.key?r.color+'11':'white'};color:${selRole===r.key?r.color:'var(--text-muted)'};transition:all 0.2s">
                ${r.name}
              </button>
            `).join('')}
          </div>
        </div>
        <div style="margin-bottom:12px;padding:10px 14px;background:rgba(59,130,246,0.04);border:1px solid rgba(59,130,246,0.12);border-radius:8px;font-size:12px;color:var(--text-muted)">
          💡 勾选表示该角色拥有对应操作权限。<strong>超级管理员</strong>默认拥有所有权限，无需配置。
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:var(--bg)">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid var(--border);min-width:120px;position:sticky;left:0;background:var(--bg);z-index:1">模块</th>
                ${actions.map(a => `<th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);min-width:60px">${a.icon} ${a.name}</th>`).join('')}
                <th style="padding:10px 8px;text-align:center;border-bottom:2px solid var(--border);min-width:60px">全部</th>
              </tr>
            </thead>
            <tbody>
              ${modules.map(m => {
                const mPerms = rolePerms[m.key] || [];
                const allChecked = actions.every(a => mPerms.includes(a.key));
                return `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:8px 12px;font-weight:600;position:sticky;left:0;background:white;z-index:1">${m.icon} ${m.name}</td>
                  ${actions.map(a => {
                    const checked = mPerms.includes(a.key);
                    return `<td style="padding:8px;text-align:center"><label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center">
                      <input type="checkbox" ${checked?'checked':''} onchange="settings.togglePerm('${selRole}','${m.key}','${a.key}')" style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
                    </label></td>`;
                  }).join('')}
                  <td style="padding:8px;text-align:center"><label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center">
                    <input type="checkbox" ${allChecked?'checked':''} onchange="settings.toggleAllPerm('${selRole}','${m.key}',this.checked)" style="width:16px;height:16px;cursor:pointer;accent-color:var(--primary)">
                  </label></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost" onclick="settings.resetPerms('${selRole}')">↩️ 恢复默认</button>
          <button class="btn btn-primary" onclick="settings.applyDefaultPerms('${selRole}')">✨ 智能填充默认</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 权限概览</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px">
          ${roles.map(r => {
            const rp = permData[r.key] || {};
            let totalPerms = 0;
            Object.values(rp).forEach(arr => totalPerms += arr.length);
            const maxPerms = modules.length * actions.length;
            const pct = r.key === 'admin' ? 100 : Math.round(totalPerms / maxPerms * 100);
            return `
            <div style="padding:16px;background:var(--bg);border-radius:12px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:${r.color}">${pct}%</div>
              <div style="font-size:13px;font-weight:600;margin-top:4px">${r.name}</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${r.key==='admin'?'全部权限（不受限）':totalPerms+' / '+maxPerms+' 项权限'}</div>
              <div style="height:4px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${r.color};border-radius:2px"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  },

  togglePerm(role, module, action) {
    const data = this._getPermData();
    if (!data[role]) data[role] = {};
    if (!data[role][module]) data[role][module] = [];
    const idx = data[role][module].indexOf(action);
    if (idx >= 0) data[role][module].splice(idx, 1);
    else data[role][module].push(action);
    this._savePermData(data);
    this.switchTab('permissions');
  },

  toggleAllPerm(role, module, checked) {
    const data = this._getPermData();
    if (!data[role]) data[role] = {};
    if (checked) {
      data[role][module] = this._permActions.map(a => a.key);
    } else {
      data[role][module] = [];
    }
    this._savePermData(data);
    this.switchTab('permissions');
  },

  applyDefaultPerms(role) {
    this.applyDefaultPermsSilently(role);
    toast('默认权限已应用', 'success');
    this.switchTab('permissions');
  },

  // 与 applyDefaultPerms 相同的默认值计算逻辑，但不弹 toast / 不刷新当前 tab，
  // 供 saveNewRole() 在后台为新建角色初始化权限时调用
  applyDefaultPermsSilently(role) {
    const data = this._getPermData();
    const allModules = this._permModules.map(m => m.key);
    const allActions = this._permActions.map(a => a.key);
    if (role === 'admin') {
      data[role] = {};
    } else if (role === 'staff') {
      // 仓库管理员：除了系统设置和权限/角色管理外，大部分操作都有权限
      const rp = {};
      allModules.forEach(m => {
        if (m === 'settings') rp[m] = ['view'];
        else rp[m] = [...allActions];
      });
      data[role] = rp;
    } else if (role === 'viewer') {
      // 只读用户：只能查看和导出
      const rp = {};
      allModules.forEach(m => {
        rp[m] = ['view', 'export', 'print'];
      });
      data[role] = rp;
    } else {
      // 自定义角色：默认给予查看、导出、打印、新建、编辑权限（不含审核/删除/导入/系统设置）
      const rp = {};
      allModules.forEach(m => {
        if (m === 'settings' || m === 'roles' || m === 'permissions') rp[m] = ['view'];
        else rp[m] = ['view', 'create', 'edit', 'export', 'print'];
      });
      data[role] = rp;
    }
    this._savePermData(data);
  },

  resetPerms(role) {
    const data = this._getPermData();
    data[role] = {};
    this._savePermData(data);
    toast('权限已重置', 'info');
    this.switchTab('permissions');
  },

  // ==================== 打印设置 ====================
  _getPrintSettings() {
    const raw = localStorage.getItem('wms_printSettings');
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return {
      companyName: localStorage.getItem('wms_sysName') || 'Tim Mini ERP',
      companySub: 'Tim Mini ERP ' + (localStorage.getItem('wms_sysVersion') || 'v1.0').replace(/^v/, ''),
      showLogo: true,
      logoUrl: 'LOGO.svg',
      paperSize: 'A4',
      fontSize: 14,
      showFooter: true,
      footerText: '本单据由系统自动生成',
      signLines: 4,
      autoPrint: false,
      showBarcode: true,
      showQrCode: false
    };
  },

  _savePrintSettings() {
    const s = {
      companyName: document.getElementById('psCompanyName').value.trim(),
      companySub: document.getElementById('psCompanySub').value.trim(),
      showLogo: document.getElementById('psShowLogo').checked,
      logoUrl: document.getElementById('psLogoUrl').value.trim() || 'LOGO.svg',
      paperSize: document.getElementById('psPaperSize').value,
      fontSize: parseInt(document.getElementById('psFontSize').value),
      showFooter: document.getElementById('psShowFooter').checked,
      footerText: document.getElementById('psFooterText').value.trim(),
      signLines: parseInt(document.getElementById('psSignLines').value),
      autoPrint: document.getElementById('psAutoPrint').checked,
      showBarcode: document.getElementById('psShowBarcode').checked,
      showQrCode: document.getElementById('psShowQrCode').checked
    };
    localStorage.setItem('wms_printSettings', JSON.stringify(s));
    toast('打印设置已保存！', 'success');
    audit.log('settings', '修改打印设置', '系统设置', `公司: ${s.companyName}`);
    // 应用 Logo 设置到界面
    applyLogoSettings();
    this.switchTab('printSettings');
  },

  renderPrintSettings() {
    const s = this._getPrintSettings();
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">🏢 单据抬头信息</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-item">
            <label>公司/系统名称</label>
            <input id="psCompanyName" value="${s.companyName}" placeholder="显示在单据顶部">
          </div>
          <div class="form-item">
            <label>副标题/版本信息</label>
            <input id="psCompanySub" value="${s.companySub}" placeholder="显示在公司名称下方">
          </div>
          <div class="form-item">
            <label>Logo图片路径</label>
            <input id="psLogoUrl" value="${s.logoUrl}" placeholder="如: LOGO.svg">
          </div>
          <div class="form-item" style="display:flex;align-items:flex-end;gap:12px">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="psShowLogo" ${s.showLogo?'checked':''} style="width:16px;height:16px;accent-color:var(--primary)">
              在单据中显示Logo
            </label>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">📄 纸张与字体</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
          <div class="form-item">
            <label>纸张大小</label>
            <select id="psPaperSize" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit">
              <option value="A4" ${s.paperSize==='A4'?'selected':''}>A4 (210×297mm)</option>
              <option value="A5" ${s.paperSize==='A5'?'selected':''}>A5 (148×210mm)</option>
              <option value="B5" ${s.paperSize==='B5'?'selected':''}>B5 (176×250mm)</option>
              <option value="Letter" ${s.paperSize==='Letter'?'selected':''}>Letter (216×279mm)</option>
              <option value="自定义" ${s.paperSize==='自定义'?'selected':''}>自定义</option>
            </select>
          </div>
          <div class="form-item">
            <label>字体大小 (px)</label>
            <input id="psFontSize" type="number" value="${s.fontSize}" min="10" max="20" step="1">
          </div>
          <div class="form-item">
            <label>签名栏数量</label>
            <select id="psSignLines" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit">
              <option value="2" ${s.signLines===2?'selected':''}>2 栏</option>
              <option value="3" ${s.signLines===3?'selected':''}>3 栏</option>
              <option value="4" ${s.signLines===4?'selected':''}>4 栏</option>
              <option value="5" ${s.signLines===5?'selected':''}>5 栏</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">🔧 打印选项</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
            <div>
              <div style="font-weight:600;font-size:14px">自动弹出打印对话框</div>
              <div style="color:var(--text-muted);font-size:12px;margin-top:2px">打开打印预览后自动弹出浏览器打印对话框</div>
            </div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="psAutoPrint" ${s.autoPrint?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)">
              ${s.autoPrint ? '已开启' : '已关闭'}
            </label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
            <div>
              <div style="font-weight:600;font-size:14px">显示页脚文字</div>
              <div style="color:var(--text-muted);font-size:12px;margin-top:2px">在单据底部显示自定义页脚文字</div>
            </div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="psShowFooter" ${s.showFooter?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)">
              ${s.showFooter ? '已开启' : '已关闭'}
            </label>
          </div>
          ${s.showFooter ? `<div class="form-item"><label>页脚文字</label><input id="psFooterText" value="${s.footerText}" placeholder="如: 本单据由系统自动生成"></div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
            <div>
              <div style="font-weight:600;font-size:14px">显示条形码</div>
              <div style="color:var(--text-muted);font-size:12px;margin-top:2px">在单据中显示单据编号的条形码</div>
            </div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="psShowBarcode" ${s.showBarcode?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)">
              ${s.showBarcode ? '已开启' : '已关闭'}
            </label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--bg);border-radius:8px">
            <div>
              <div style="font-weight:600;font-size:14px">显示二维码</div>
              <div style="color:var(--text-muted);font-size:12px;margin-top:2px">在单据中显示二维码（包含单据详情）</div>
            </div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" id="psShowQrCode" ${s.showQrCode?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)">
              ${s.showQrCode ? '已开启' : '已关闭'}
            </label>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="localStorage.removeItem('wms_printSettings');toast('已恢复默认','info');settings.switchTab('printSettings')">↩️ 恢复默认</button>
        <button class="btn btn-outline" onclick="PrintManager.printPreviewTest()">🖨 打印测试</button>
        <button class="btn btn-primary" onclick="settings._savePrintSettings()">💾 保存设置</button>
      </div>
    </div>`;
  },

  init() {}
};
