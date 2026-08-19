// ===========================
// 审计日志
// ===========================

const audit = {
  page: 1,
  pageSize: 20,
  moduleFilter: '',
  operatorFilter: '',
  dateFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <select class="filter-select" onchange="audit.moduleFilter=this.value;audit.page=1;audit.reload()">
            <option value="">全部模块</option>
            <option value="supplier">供应商管理</option>
            <option value="customer">客户管理</option>
            <option value="goods">商品管理</option>
            <option value="inbound">入库管理</option>
            <option value="outbound">出库管理</option>
            <option value="inventory">库存盘点</option>
            <option value="settings">系统设置</option>
          </select>
          <select class="filter-select" onchange="audit.operatorFilter=this.value;audit.page=1;audit.reload()">
            <option value="">全部操作员</option>
            ${this.getOperators().map(u => `<option value="${u}">${u}</option>`).join('')}
          </select>
          <input type="date" class="filter-select" value="${this.dateFilter}"
            onchange="audit.dateFilter=this.value;audit.page=1;audit.reload()">
        </div>
        <div class="action-bar-right">
          <span style="color:var(--text-muted);font-size:13px">共 ${this.getTotal()} 条记录</span>
        </div>
      </div>
      <div class="card">${this.renderTable()}</div>
    </div>`;
  },

  getTotal() {
    return this.getFiltered().length;
  },

  getFiltered() {
    let list = DB.get('audit');
    if (this.moduleFilter) list = list.filter(r => r.module === this.moduleFilter);
    if (this.operatorFilter) list = list.filter(r => r.operator === this.operatorFilter);
    if (this.dateFilter) list = list.filter(r => r.date === this.dateFilter);
    return list.sort((a, b) => b.id - a.id);
  },

  getOperators() {
    const users = DB.get('users');
    return users.map(u => u.username);
  },

  renderTable() {
    const list = this.getFiltered();
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无审计记录</div></div>`;

    const actionColors = {
      '新增': { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      '编辑': { bg: 'rgba(79,110,247,0.1)', color: '#4f6ef7' },
      '删除': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      '入库': { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      '出库': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      '启用': { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      '停用': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      '盘点': { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6' },
      '新增分类': { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      '删除分类': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      '新增用户': { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
      '编辑用户': { bg: 'rgba(79,110,247,0.1)', color: '#4f6ef7' },
      '删除用户': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      '修改密码': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
      '清空记录': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      '重置数据': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      '恢复数据': { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }
    };

    const moduleNames = {
      supplier: '供应商管理',
      customer: '客户管理',
      goods: '商品管理',
      inbound: '入库管理',
      outbound: '出库管理',
      inventory: '库存盘点',
      settings: '系统设置'
    };

    return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>时间</th>
            <th>操作员</th>
            <th>模块</th>
            <th>操作类型</th>
            <th>操作对象</th>
            <th>详情</th>
            <th>IP地址</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(r => {
            const actionStyle = actionColors[r.action] || { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
            return `
              <tr>
                <td style="font-size:12px;color:var(--text-muted)">${r.time}</td>
                <td><span style="font-weight:500">${r.operator}</span></td>
                <td>${moduleNames[r.module] || r.module}</td>
                <td>
                  <span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500;background:${actionStyle.bg};color:${actionStyle.color}">
                    ${r.action}
                  </span>
                </td>
                <td style="font-weight:500">${r.target}</td>
                <td style="font-size:12px;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.detail}">${r.detail}</td>
                <td style="font-size:12px;color:var(--text-muted)">${r.ip || '本地'}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${renderPagination(total, this.page, this.pageSize, 'audit.goPage')}`;
  },

  reload() {
    const card = document.querySelector('.card');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },

  init() {},

  // 记录审计日志
  log(module, action, target, detail = '') {
    const now = new Date();
    const logs = DB.get('audit');
    const id = logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1;
    logs.push({
      id,
      module,
      action,
      target,
      detail,
      operator: currentUser ? currentUser.username : '系统',
      operatorName: currentUser ? currentUser.name : '系统',
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: now.getTime(),
      ip: '127.0.0.1'
    });
    DB.set('audit', logs);
  }
};

// 初始化审计数据（按当前账套隔离存储，而非全局共享）
(function() {
  if (!localStorage.getItem(DB._prefix('audit'))) {
    const sampleLogs = [
      { id: 1, module: 'supplier', action: '新增', target: '深圳华强电子', detail: '新增供应商', operator: 'admin', operatorName: '系统管理员', date: '2025-01-05', time: '09:30:15', timestamp: 1736043015000, ip: '127.0.0.1' },
      { id: 2, module: 'goods', action: '新增', target: 'iPhone 15 Pro Max', detail: '新增商品', operator: 'admin', operatorName: '系统管理员', date: '2025-01-10', time: '10:15:30', timestamp: 1736478930000, ip: '127.0.0.1' },
      { id: 3, module: 'inbound', action: '入库', target: 'iPhone 15 Pro Max', detail: '入库数量: 50', operator: 'staff', operatorName: '仓库管理员', date: '2025-01-10', time: '14:22:45', timestamp: 1736494965000, ip: '127.0.0.1' },
      { id: 4, module: 'outbound', action: '出库', target: '华为Mate 60 Pro', detail: '出库数量: 10', operator: 'staff', operatorName: '仓库管理员', date: '2025-01-11', time: '16:08:20', timestamp: 1736584100000, ip: '127.0.0.1' },
      { id: 5, module: 'customer', action: '新增', target: '阿里巴巴集团', detail: '新增客户', operator: 'admin', operatorName: '系统管理员', date: '2025-01-06', time: '11:05:00', timestamp: 1736144700000, ip: '127.0.0.1' },
      { id: 6, module: 'inventory', action: '盘点', target: 'IC202501', detail: '月末例行盘点, 差异: -2', operator: 'admin', operatorName: '系统管理员', date: '2025-01-31', time: '17:30:00', timestamp: 1738402200000, ip: '127.0.0.1' },
      { id: 7, module: 'supplier', action: '编辑', target: '北京机械零件厂', detail: '状态改为停用', operator: 'admin', operatorName: '系统管理员', date: '2025-02-01', time: '09:00:00', timestamp: 1738441200000, ip: '127.0.0.1' }
    ];
    DB.set('audit', sampleLogs);
  }
})();
