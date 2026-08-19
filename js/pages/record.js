// ===========================
// 出入库明细（精准筛选）
// ===========================

const record = {
  page: 1,
  pageSize: 15,
  filters: {
    type: '',           // '' | 'in' | 'out'
    keyword: '',        // 单号/商品名/编码
    dateFrom: '',       // 起始日期
    dateTo: '',         // 截止日期
    status: '',         // '' | '待审核' | '已审核' | '已驳回' | '已完成'
    category: '',       // 商品分类
    supplier: '',       // 供应商/客户（入库看供应商，出库看客户）
    operator: ''        // 操作员
  },

  render() {
    // 收集筛选选项数据
    const categories = DB.get('categories');
    const suppliers = DB.get('suppliers');
    const customers = DB.get('customers');
    const users = DB.get('users').filter(u => u.status === 1);
    const operators = [...new Set([
      ...DB.get('inbounds').map(r => r.operator),
      ...DB.get('outbounds').map(r => r.operator)
    ])].filter(Boolean);

    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 筛选区域 -->
      <div class="card" style="margin-bottom:16px">
        <div style="font-size:14px;font-weight:600;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          精准筛选
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
          <!-- 单据类型 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">单据类型</label>
            <select class="filter-select" style="width:100%" onchange="record.filters.type=this.value;record.page=1;record.reload()">
              <option value="">全部（入库+出库）</option>
              <option value="in" ${this.filters.type==='in'?'selected':''}>📥 仅入库</option>
              <option value="out" ${this.filters.type==='out'?'selected':''}>📤 仅出库</option>
            </select>
          </div>
          <!-- 关键词 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">关键词搜索</label>
            <div class="search-input-wrap">
              <span>🔍</span>
              <input type="text" placeholder="单号/商品名/编码..." value="${this.filters.keyword}"
                oninput="record.filters.keyword=this.value;record.page=1;record.reload()">
            </div>
          </div>
          <!-- 商品分类 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">商品分类</label>
            <select class="filter-select" style="width:100%" onchange="record.filters.category=this.value;record.page=1;record.reload()">
              <option value="">全部分类</option>
              ${categories.map(c => `<option value="${c.id}" ${this.filters.category==c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <!-- 供应商/客户 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">供应商 / 客户</label>
            <select class="filter-select" style="width:100%" onchange="record.filters.supplier=this.value;record.page=1;record.reload()">
              <option value="">全部</option>
              <optgroup label="供应商">
                ${suppliers.map(s => `<option value="s_${s.id}" ${this.filters.supplier==='s_'+s.id?'selected':''}>${s.name}</option>`).join('')}
              </optgroup>
              <optgroup label="客户">
                ${customers.map(c => `<option value="c_${c.id}" ${this.filters.supplier==='c_'+c.id?'selected':''}>${c.name}</option>`).join('')}
              </optgroup>
            </select>
          </div>
          <!-- 操作员 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">操作员</label>
            <select class="filter-select" style="width:100%" onchange="record.filters.operator=this.value;record.page=1;record.reload()">
              <option value="">全部</option>
              ${operators.map(o => `<option value="${o}" ${this.filters.operator===o?'selected':''}>${o}</option>`).join('')}
            </select>
          </div>
          <!-- 审核状态 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">审核状态</label>
            <select class="filter-select" style="width:100%" onchange="record.filters.status=this.value;record.page=1;record.reload()">
              <option value="">全部状态</option>
              <option value="待审核" ${this.filters.status==='待审核'?'selected':''}>⏳ 待审核</option>
              <option value="已审核" ${this.filters.status==='已审核'?'selected':''}>✅ 已审核</option>
              <option value="已完成" ${this.filters.status==='已完成'?'selected':''}>✅ 已完成</option>
              <option value="已驳回" ${this.filters.status==='已驳回'?'selected':''}>❌ 已驳回</option>
            </select>
          </div>
          <!-- 日期范围 -->
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">起始日期</label>
            <input type="date" class="filter-select" style="width:100%" value="${this.filters.dateFrom}"
              onchange="record.filters.dateFrom=this.value;record.page=1;record.reload()">
          </div>
          <div class="form-item" style="margin:0">
            <label style="font-size:12px;color:var(--text-muted);margin-bottom:4px">截止日期</label>
            <input type="date" class="filter-select" style="width:100%" value="${this.filters.dateTo}"
              onchange="record.filters.dateTo=this.value;record.page=1;record.reload()">
          </div>
        </div>
        <!-- 快捷日期 + 重置 -->
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center">
          <span style="font-size:12px;color:var(--text-muted)">快捷：</span>
          <button class="btn btn-ghost btn-sm" onclick="record.quickDate('today')">今天</button>
          <button class="btn btn-ghost btn-sm" onclick="record.quickDate('week')">本周</button>
          <button class="btn btn-ghost btn-sm" onclick="record.quickDate('month')">本月</button>
          <button class="btn btn-ghost btn-sm" onclick="record.quickDate('lastMonth')">上月</button>
          <button class="btn btn-ghost btn-sm" onclick="record.quickDate('quarter')">本季度</button>
          <div style="flex:1"></div>
          <button class="btn btn-outline btn-sm" onclick="record.exportCSV()">📥 导出 CSV</button>
          <button class="btn btn-ghost btn-sm" onclick="record.resetFilters()">🔄 重置筛选</button>
        </div>
      </div>

      <!-- 统计摘要 -->
      <div class="card" id="recordSummary" style="margin-bottom:16px">${this.renderSummary()}</div>

      <!-- 数据表格 -->
      <div class="card" id="recordCard">${this.renderTable()}</div>
    </div>`;
  },

  // 快捷日期
  quickDate(preset) {
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    let from, to;
    switch (preset) {
      case 'today':
        from = to = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        break;
      case 'week': {
        const day = today.getDay() || 7;
        const mon = new Date(y, m, d - day + 1);
        const sun = new Date(y, m, d - day + 7);
        from = mon.toISOString().slice(0,10);
        to = sun.toISOString().slice(0,10);
        break;
      }
      case 'month':
        from = `${y}-${String(m+1).padStart(2,'0')}-01`;
        to = `${y}-${String(m+1).padStart(2,'0')}-${new Date(y, m+1, 0).getDate()}`;
        break;
      case 'lastMonth': {
        const lm = m === 0 ? 11 : m - 1;
        const ly = m === 0 ? y - 1 : y;
        from = `${ly}-${String(lm+1).padStart(2,'0')}-01`;
        to = `${ly}-${String(lm+1).padStart(2,'0')}-${new Date(ly, lm+1, 0).getDate()}`;
        break;
      }
      case 'quarter': {
        const q = Math.floor(m / 3);
        from = `${y}-${String(q*3+1).padStart(2,'0')}-01`;
        const qm = q * 3 + 3;
        to = `${y}-${String(qm).padStart(2,'0')}-${new Date(y, qm, 0).getDate()}`;
        break;
      }
    }
    this.filters.dateFrom = from;
    this.filters.dateTo = to;
    this.page = 1;
    this.reload();
    // 更新日期输入框
    const fromInput = document.querySelector('input[type="date"][oninput*="dateFrom"]') ||
                      document.querySelectorAll('input[type="date"]')[0];
    const toInput = document.querySelectorAll('input[type="date"]')[1];
    if (fromInput) fromInput.value = from;
    if (toInput) toInput.value = to;
  },

  // 获取筛选后的数据
  getFilteredData() {
    const f = this.filters;
    let inList = DB.get('inbounds');
    let outList = DB.get('outbounds');

    // 根据类型筛选
    let result = [];
    if (f.type === '' || f.type === 'in') {
      result = result.concat(inList.map(r => ({ ...r, _type: 'in' })));
    }
    if (f.type === '' || f.type === 'out') {
      result = result.concat(outList.map(r => ({ ...r, _type: 'out' })));
    }

    // 关键词
    if (f.keyword) {
      const kw = f.keyword.toLowerCase();
      result = result.filter(r =>
        r.code.toLowerCase().includes(kw) ||
        r.goodsName.toLowerCase().includes(kw) ||
        r.goodsCode.toLowerCase().includes(kw)
      );
    }

    // 日期范围
    if (f.dateFrom) result = result.filter(r => r.date >= f.dateFrom);
    if (f.dateTo) result = result.filter(r => r.date <= f.dateTo);

    // 状态
    if (f.status) result = result.filter(r => (r.status || '已完成') === f.status);

    // 商品分类
    if (f.category) {
      const catId = +f.category;
      const goods = DB.get('goods');
      const goodsInCat = new Set(goods.filter(g => g.category === catId).map(g => g.id));
      result = result.filter(r => goodsInCat.has(r.goodsId));
    }

    // 供应商/客户
    if (f.supplier) {
      const [prefix, id] = [f.supplier.slice(0, 2), +f.supplier.slice(2)];
      if (prefix === 's_') {
        result = result.filter(r => r._type === 'in' && r.supplierId === id);
      } else if (prefix === 'c_') {
        result = result.filter(r => r._type === 'out' && r.customerId === id);
      }
    }

    // 操作员
    if (f.operator) result = result.filter(r => r.operator === f.operator);

    // 按日期倒序
    result.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

    return result;
  },

  // 统计摘要
  renderSummary() {
    const data = this.getFilteredData();
    const inData = data.filter(r => r._type === 'in');
    const outData = data.filter(r => r._type === 'out');

    const inCount = inData.length;
    const inTotal = inData.reduce((s, r) => s + r.total, 0);
    const inQty = inData.reduce((s, r) => s + r.qty, 0);
    const outCount = outData.length;
    const outTotal = outData.reduce((s, r) => s + r.total, 0);
    const outQty = outData.reduce((s, r) => s + r.qty, 0);

    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
      <div style="background:rgba(79,110,247,0.06);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted)">筛选结果</div>
        <div style="font-size:22px;font-weight:700;color:var(--primary);margin-top:4px">${data.length}</div>
        <div style="font-size:11px;color:var(--text-muted)">条记录</div>
      </div>
      <div style="background:rgba(34,197,94,0.06);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted)">📥 入库</div>
        <div style="font-size:22px;font-weight:700;color:var(--success);margin-top:4px">${inCount}</div>
        <div style="font-size:11px;color:var(--text-muted)">${fmtMoney(inTotal)} / +${fmt(inQty)}件</div>
      </div>
      <div style="background:rgba(239,68,68,0.06);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted)">📤 出库</div>
        <div style="font-size:22px;font-weight:700;color:var(--danger);margin-top:4px">${outCount}</div>
        <div style="font-size:11px;color:var(--text-muted)">${fmtMoney(outTotal)} / -${fmt(outQty)}件</div>
      </div>
      <div style="background:rgba(249,115,22,0.06);border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text-muted)">待审核</div>
        <div style="font-size:22px;font-weight:700;color:var(--warning);margin-top:4px">${data.filter(r => (r.status||'已完成') === '待审核').length}</div>
        <div style="font-size:11px;color:var(--text-muted)">条待处理</div>
      </div>
    </div>`;
  },

  // 数据表格
  renderTable() {
    const data = this.getFilteredData();
    const total = data.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = data.slice(start, start + this.pageSize);

    if (!pageData.length) {
      return `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">没有找到匹配的出入库记录</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">试试调整筛选条件</div>
      </div>`;
    }

    const stBadge = s => s === '待审核' ? 'badge-warning' : s === '已驳回' ? 'badge-danger' : 'badge-success';

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th style="width:36px"></th>
        <th>单号</th><th>类型</th><th>商品名称</th><th>商品编码</th>
        <th>数量</th><th>单价</th><th>金额</th>
        <th>${this.filters.type === 'out' ? '客户' : this.filters.type === 'in' ? '供应商' : '往来单位'}</th>
        <th>日期</th><th>操作员</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const st = r.status || '已完成';
          const isIn = r._type === 'in';
          return `<tr>
            <td style="text-align:center;font-size:16px">${isIn ? '📥' : '📤'}</td>
            <td><span style="color:${isIn ? 'var(--primary)' : 'var(--danger)'};font-size:12px;font-family:monospace">${r.code}</span></td>
            <td><span class="badge ${isIn ? 'badge-success' : 'badge-danger'}" style="font-size:11px">${isIn ? '入库' : '出库'}</span></td>
            <td style="font-weight:600">${r.goodsName}</td>
            <td><span style="font-size:12px;color:var(--text-muted)">${r.goodsCode}</span></td>
            <td><span style="font-weight:700;color:${isIn ? 'var(--success)' : 'var(--danger)'}">${isIn ? '+' : '-'}${r.qty}</span></td>
            <td>${fmtMoney(r.price)}</td>
            <td style="font-weight:600">${fmtMoney(r.total)}</td>
            <td style="font-size:12px">${isIn ? (r.supplierName || '-') : (r.customerName || '-')}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
            <td><span style="font-size:12px">${r.operator}</span></td>
            <td><span class="badge ${stBadge(st)}">${st}</span></td>
            <td>
              <button class="btn btn-ghost btn-sm" onclick="record.viewDetail(${r.id},'${r._type}')">👁</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'record.goPage')}`;
  },

  reload() {
    const summary = document.getElementById('recordSummary');
    const card = document.getElementById('recordCard');
    if (summary) summary.innerHTML = this.renderSummary();
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },

  // 查看详情（跳转到对应页面）
  viewDetail(id, type) {
    if (type === 'in') {
      showPage('inbound');
      setTimeout(() => inbound.view(id), 100);
    } else {
      showPage('outbound');
      setTimeout(() => outbound.view(id), 100);
    }
  },

  // 重置筛选
  resetFilters() {
    this.filters = { type: '', keyword: '', dateFrom: '', dateTo: '', status: '', category: '', supplier: '', operator: '' };
    this.page = 1;
    showPage('record');
  },

  // 导出 CSV
  exportCSV() {
    if (!hasPerm('record', 'export')) { toast('没有导出权限', 'error'); return; }
    const data = this.getFilteredData();
    if (!data.length) { toast('没有可导出的数据', 'warning'); return; }

    const BOM = '\uFEFF';
    const headers = ['单号', '类型', '商品名称', '商品编码', '数量', '单价', '金额', '往来单位', '日期', '操作员', '状态', '备注'];
    const rows = data.map(r => [
      r.code,
      r._type === 'in' ? '入库' : '出库',
      r.goodsName,
      r.goodsCode,
      r.qty,
      r.price,
      r.total,
      r._type === 'in' ? (r.supplierName || '') : (r.customerName || ''),
      r.date,
      r.operator,
      r.status || '已完成',
      r.note || ''
    ]);

    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出入库明细_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${data.length} 条记录`, 'success');
  },

  init() {}
};
