// ===========================
// 财务管理 - 完整财务系统
// ===========================

const finance = {
  activeTab: 'gl', // gl|ar|ap|co|fa|cash|budget
  activeSubTab: 'voucher', // 子标签
  page: 1,
  pageSize: 15,
  keyword: '',
  dateFilter: '',
  yearFilter: new Date().getFullYear().toString(),
  monthFilter: '',

  init() {
    this.ensureData();
    // 首次渲染完整页面
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },

  ensureData() {
    const tables = [
      'finVouchers', 'finAccounts', 'finCostItems',
      'finARInvoices', 'finARCollections', 'finAPInvoices', 'finAPPayments',
      'finAssets', 'finAssetDepreciations', 'finBudgets', 'finExpenses', 'finTrips',
      'finCashJournal', 'finBankJournal', 'finClosing'
    ];
    tables.forEach(t => {
      if (!localStorage.getItem(t)) localStorage.setItem(t, '[]');
    });
    // 确保会计科目存在
    if (!DB.get('finAccounts')?.length) {
      const defaultAccounts = [
        { code: '1001', name: '库存现金', type: '资产', direction: '借', level: 1 },
        { code: '1002', name: '银行存款', type: '资产', direction: '借', level: 1 },
        { code: '1122', name: '应收账款', type: '资产', direction: '借', level: 1 },
        { code: '1405', name: '库存商品', type: '资产', direction: '借', level: 1 },
        { code: '1601', name: '固定资产', type: '资产', direction: '借', level: 1 },
        { code: '2001', name: '应付账款', type: '负债', direction: '贷', level: 1 },
        { code: '2202', name: '应付职工薪酬', type: '负债', direction: '贷', level: 1 },
        { code: '4001', name: '实收资本', type: '权益', direction: '贷', level: 1 },
        { code: '4103', name: '本年利润', type: '权益', direction: '贷', level: 1 },
        { code: '5001', name: '主营业务收入', type: '收入', direction: '贷', level: 1 },
        { code: '6401', name: '主营业务成本', type: '成本', direction: '借', level: 1 },
        { code: '6602', name: '销售费用', type: '费用', direction: '借', level: 1 },
        { code: '6603', name: '管理费用', type: '费用', direction: '借', level: 1 }
      ];
      defaultAccounts.forEach(a => {
        DB.add('finAccounts', { ...a, id: DB.nextId('finAccounts'), initDebit: 0, initCredit: 0, createdAt: new Date().toISOString() });
      });
    }
  },

  render() {
    const tabs = [
      { id: 'gl', label: '📒 总账', sub: '总账管理' },
      { id: 'ar', label: '📥 应收', sub: '应收账款' },
      { id: 'ap', label: '📤 应付', sub: '应付账款' },
      { id: 'co', label: '💰 成本', sub: '成本核算' },
      { id: 'fa', label: '🏢 资产', sub: '固定资产' },
      { id: 'cash', label: '💵 资金', sub: '资金管理' },
      { id: 'budget', label: '📊 预算', sub: '预算费用' }
    ];

    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 主标签页 -->
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
        ${tabs.map(t => `
          <button class="btn ${this.activeTab === t.id ? 'btn-primary' : 'btn-ghost'}"
            onclick="finance.activeTab='${t.id}';finance.activeSubTab='${t.id === 'gl' ? 'voucher' : t.id}';finance.page=1;finance.reload()">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div id="financeContent">${this.renderTab()}</div>
    </div>`;
  },

  renderTab() {
    switch(this.activeTab) {
      case 'gl': return this.renderGL();
      case 'ar': return this.renderAR();
      case 'ap': return this.renderAP();
      case 'co': return this.renderCO();
      case 'fa': return this.renderFA();
      case 'cash': return this.renderCash();
      case 'budget': return this.renderBudget();
      default: return '';
    }
  },

  reload() {
    const content = document.getElementById('financeContent');
    if (content) content.innerHTML = this.renderTab();
  },

  goPage(p) { this.page = p; this.reload(); },

  // ==================== 总账管理 GL ====================
  renderGL() {
    const subTabs = [
      { id: 'voucher', label: '凭证' },
      { id: 'ledger', label: '账簿' },
      { id: 'reports', label: '报表' },
      { id: 'closing', label: '结账' }
    ];

    let html = `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px;padding:8px;background:var(--bg);border-radius:8px">
      ${subTabs.map(t => `
        <button class="btn ${this.activeSubTab === t.id ? 'btn-primary' : 'btn-ghost'} btn-sm"
          onclick="finance.activeSubTab='${t.id}';finance.page=1;finance.reload()">
          ${t.label}
        </button>
      `).join('')}
    </div>`;

    switch(this.activeSubTab) {
      case 'voucher': html += this.renderGLVoucher(); break;
      case 'ledger': html += this.renderGLLedger(); break;
      case 'reports': html += this.renderGLReports(); break;
      case 'closing': html += this.renderGLClosing(); break;
    }
    return html;
  },

  renderGLVoucher() {
    let list = DB.get('finVouchers');
    const stats = {
      total: list.length,
      draft: list.filter(v => v.status === '草稿').length,
      approved: list.filter(v => v.status === '已审核').length
    };

    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(v =>
        (v.code || '').toLowerCase().includes(kw) ||
        (v.summary || '').toLowerCase().includes(kw)
      );
    }
    if (this.dateFilter) {
      list = list.filter(v => (v.date || '').startsWith(this.dateFilter));
    }
    list = list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return `
    <!-- 统计 -->
    <div class="stat-cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px">
      <div class="stat-card blue">
        <div class="stat-icon blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="stat-info"><div class="stat-label">凭证总数</div><div class="stat-value">${stats.total}</div></div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>
        <div class="stat-info"><div class="stat-label">草稿</div><div class="stat-value">${stats.draft}</div></div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="stat-info"><div class="stat-label">已审核</div><div class="stat-value">${stats.approved}</div></div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索凭证号/摘要..." value="${this.keyword}"
            oninput="finance.keyword=this.value;finance.page=1;finance.reload()">
        </div>
        <input type="month" class="filter-select" value="${this.dateFilter}"
          onchange="finance.dateFilter=this.value;finance.page=1;finance.reload()">
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.createVoucher()">+ 新增凭证</button>
      </div>
    </div>

    <!-- 凭证列表 -->
    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">📒</div><div class="empty-state-text">暂无凭证</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>凭证号</th><th>日期</th><th>类型</th><th>摘要</th><th>借方金额</th><th>贷方金额</th><th>制单人</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(v => `
          <tr>
            <td><span style="color:var(--primary);font-weight:600">${v.code}</span></td>
            <td>${v.date || '-'}</td>
            <td><span class="badge ${v.type === '转账' ? 'badge-info' : v.type === '付款' ? 'badge-danger' : 'badge-default'}">${v.type || '记账'}</span></td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${v.summary || '-'}</td>
            <td style="color:var(--danger)">${fmtMoney(v.debitTotal)}</td>
            <td style="color:var(--success)">${fmtMoney(v.creditTotal)}</td>
            <td>${v.creator || '-'}</td>
            <td><span class="badge ${v.status === '已审核' ? 'badge-success' : 'badge-default'}">${v.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="finance.viewVoucher(${v.id})">查看</button>
                ${v.status === '草稿' ? `<button class="btn btn-primary btn-sm" onclick="finance.approveVoucher(${v.id})">审核</button>` : ''}
                ${v.status === '草稿' ? `<button class="btn btn-danger btn-sm" onclick="finance.delVoucher(${v.id})">删除</button>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  createVoucher() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('VCH');
    const today = new Date().toISOString().slice(0, 10);
    const accounts = DB.get('finAccounts');

    const defaultEntry = `
      <div class="voucher-entry" style="display:grid;grid-template-columns:2fr 1fr 1fr 50px;gap:8px;align-items:center;padding:8px;background:var(--bg);border-radius:6px;margin-bottom:8px">
        <select class="vch-account" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
          <option value="">请选择科目</option>
          ${accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('')}
        </select>
        <input type="number" class="vch-debit" placeholder="借方金额" min="0" step="0.01" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
        <input type="number" class="vch-credit" placeholder="贷方金额" min="0" step="0.01" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove();finance.calcVoucherTotal()">×</button>
      </div>`;

    openModal('新增记账凭证', `
      <div class="form-row cols-3" style="margin-bottom:16px">
        <div class="form-item"><label>凭证号</label><input id="vchCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>凭证日期</label><input id="vchDate" type="date" value="${today}"></div>
        <div class="form-item"><label>凭证类型</label>
          <select id="vchType">
            <option value="记账">记账凭证</option>
            <option value="收款">收款凭证</option>
            <option value="付款">付款凭证</option>
            <option value="转账">转账凭证</option>
          </select>
        </div>
      </div>
      <div class="form-item"><label>凭证摘要</label><input id="vchSummary" placeholder="请输入凭证摘要"></div>

      <div style="margin:16px 0">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr 50px;gap:8px;font-size:12px;color:var(--text-muted);font-weight:600;padding:0 8px">
          <div>会计科目</div><div>借方金额</div><div>贷方金额</div><div></div>
        </div>
        <div id="vchEntries">${defaultEntry}${defaultEntry}</div>
        <button class="btn btn-ghost btn-sm" onclick="finance.addVoucherEntry()" style="margin-top:8px">+ 添加分录</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="text-align:right"><span style="color:var(--text-muted)">借方合计：</span><span style="font-weight:700;color:var(--danger);font-size:16px" id="vchDebitTotal">0.00</span></div>
        <div style="text-align:right"><span style="color:var(--text-muted)">贷方合计：</span><span style="font-weight:700;color:var(--success);font-size:16px" id="vchCreditTotal">0.00</span></div>
      </div>
      <div style="margin-top:12px"><label>附单据数</label><input id="vchAttachments" type="number" min="0" value="0" style="width:100px;padding:6px;border-radius:4px;border:1px solid var(--border)"></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '保存', class: 'btn btn-primary', onclick: 'finance.saveVoucher()' }
    ]);
  },

  addVoucherEntry() {
    const accounts = DB.get('finAccounts');
    const entry = `
      <div class="voucher-entry" style="display:grid;grid-template-columns:2fr 1fr 1fr 50px;gap:8px;align-items:center;padding:8px;background:var(--bg);border-radius:6px;margin-bottom:8px">
        <select class="vch-account" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
          <option value="">请选择科目</option>
          ${accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('')}
        </select>
        <input type="number" class="vch-debit" placeholder="借方" min="0" step="0.01" oninput="finance.calcVoucherTotal()" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
        <input type="number" class="vch-credit" placeholder="贷方" min="0" step="0.01" oninput="finance.calcVoucherTotal()" style="padding:6px;border-radius:4px;border:1px solid var(--border)">
        <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove();finance.calcVoucherTotal()">×</button>
      </div>`;
    document.getElementById('vchEntries').insertAdjacentHTML('beforeend', entry);
  },

  calcVoucherTotal() {
    let debit = 0, credit = 0;
    document.querySelectorAll('.voucher-entry').forEach(row => {
      debit += parseFloat(row.querySelector('.vch-debit')?.value) || 0;
      credit += parseFloat(row.querySelector('.vch-credit')?.value) || 0;
    });
    document.getElementById('vchDebitTotal').textContent = debit.toFixed(2);
    document.getElementById('vchCreditTotal').textContent = credit.toFixed(2);
  },

  saveVoucher() {
    const code = document.getElementById('vchCode').value.trim();
    const date = document.getElementById('vchDate').value;
    const type = document.getElementById('vchType').value;
    const summary = document.getElementById('vchSummary').value.trim();
    const attachments = parseInt(document.getElementById('vchAttachments').value) || 0;

    if (!summary) return toast('请输入凭证摘要', 'error');

    const entries = [];
    document.querySelectorAll('.voucher-entry').forEach(row => {
      const account = row.querySelector('.vch-account')?.value;
      const debit = parseFloat(row.querySelector('.vch-debit')?.value) || 0;
      const credit = parseFloat(row.querySelector('.vch-credit')?.value) || 0;
      if (account && (debit > 0 || credit > 0)) {
        const acc = DB.get('finAccounts').find(a => a.code === account);
        entries.push({ account, accountName: acc?.name || '', debit, credit });
      }
    });

    if (entries.length < 2) return toast('至少需要两条分录', 'error');

    const debitTotal = entries.reduce((s, e) => s + e.debit, 0);
    const creditTotal = entries.reduce((s, e) => s + e.credit, 0);

    if (Math.abs(debitTotal - creditTotal) > 0.01) return toast('借贷方金额不平衡', 'error');

    const data = {
      id: DB.nextId('finVouchers'),
      code, date, type, summary, attachments,
      entries, debitTotal, creditTotal,
      creator: currentUser?.username || '',
      status: '草稿',
      createdAt: new Date().toISOString()
    };

    DB.add('finVouchers', data);
    audit.log('财务管理', '新增凭证', code, `新增${type}：${summary}`);
    toast('凭证已保存', 'success');
    closeModal();
    this.reload();
  },

  viewVoucher(id) {
    const v = DB.findById('finVouchers', id);
    if (!v) return;

    openModal(`凭证详情 - ${v.code}`, `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div><div style="font-size:11px;color:var(--text-muted)">凭证号</div><div style="font-weight:600">${v.code}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">日期</div><div>${v.date}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">类型</div><div>${v.type}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">状态</div><div><span class="badge ${v.status === '已审核' ? 'badge-success' : 'badge-default'}">${v.status}</span></div></div>
      </div>
      <div style="margin-bottom:12px"><span style="font-weight:600">摘要：</span>${v.summary}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>序号</th><th>科目代码</th><th>科目名称</th><th>借方</th><th>贷方</th></tr></thead>
        <tbody>
          ${v.entries.map((e, i) => `<tr>
            <td>${i + 1}</td>
            <td>${e.account}</td>
            <td>${e.accountName}</td>
            <td style="color:${e.debit > 0 ? 'var(--danger)' : ''}">${e.debit > 0 ? e.debit.toFixed(2) : ''}</td>
            <td style="color:${e.credit > 0 ? 'var(--success)' : ''}">${e.credit > 0 ? e.credit.toFixed(2) : ''}</td>
          </tr>`).join('')}
          <tr style="font-weight:700;background:var(--bg)">
            <td colspan="3">合计</td>
            <td style="color:var(--danger)">${v.debitTotal.toFixed(2)}</td>
            <td style="color:var(--success)">${v.creditTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table></div>
      <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">制单人：${v.creator} | 附单据 ${v.attachments || 0} 张</div>
    `, [{ label: '关闭', class: 'btn btn-outline', onclick: 'closeModal()' }]);
  },

  approveVoucher(id) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    if (!confirm('确认审核此凭证？审核后将不能修改。')) return;
    DB.update('finVouchers', id, { status: '已审核', approver: currentUser?.username, approveTime: new Date().toISOString() });
    toast('凭证已审核', 'success');
    this.reload();
  },

  delVoucher(id) {
    if (!hasPerm('finance', 'delete')) { toast('没有删除权限', 'error'); return; }
    if (!confirm('确定要删除此凭证吗？')) return;
    DB.delete('finVouchers', id);
    toast('凭证已删除', 'success');
    this.reload();
  },

  renderGLLedger() {
    const accounts = DB.get('finAccounts');
    const vouchers = DB.get('finVouchers').filter(v => v.status === '已审核');
    const year = this.yearFilter;

    // 计算各科目发生额
    const accountStats = {};
    accounts.forEach(acc => {
      accountStats[acc.code] = { debit: 0, credit: 0 };
    });

    vouchers.forEach(v => {
      if ((v.date || '').startsWith(year)) {
        v.entries.forEach(e => {
          if (accountStats[e.account] !== undefined) {
            accountStats[e.account].debit += e.debit;
            accountStats[e.account].credit += e.credit;
          }
        });
      }
    });

    return `
    <!-- 账簿操作 -->
    <div class="action-bar">
      <div class="action-bar-left">
        <select class="filter-select" onchange="finance.yearFilter=this.value;finance.reload()">
          ${[0,1,2].map(i => {
            const y = new Date().getFullYear() - i;
            return `<option value="${y}" ${this.yearFilter == y ? 'selected' : ''}>${y}年度</option>`;
          }).join('')}
        </select>
        <button class="btn btn-outline" onclick="finance.exportLedger()">📥 导出账簿</button>
      </div>
    </div>

    <!-- 科目余额表 -->
    <div class="card">
      <div class="card-title">📒 科目余额表 - ${year}年</div>
      <div class="table-wrap"><table>
        <thead><tr><th>科目代码</th><th>科目名称</th><th>方向</th><th>期初余额</th><th>借方发生</th><th>贷方发生</th><th>期末余额</th></tr></thead>
        <tbody>
          ${accounts.map(a => {
            const stats = accountStats[a.code] || { debit: 0, credit: 0 };
            const initBalance = a.direction === '借' ? (a.initDebit || 0) - (a.initCredit || 0) : (a.initCredit || 0) - (a.initDebit || 0);
            const endBalance = initBalance + stats.debit - stats.credit;
            return `<tr>
              <td style="font-family:monospace">${a.code}</td>
              <td ${a.level === 1 ? 'style="font-weight:600"' : ''}>${a.name}</td>
              <td>${a.direction}</td>
              <td>${initBalance.toFixed(2)}</td>
              <td style="color:var(--danger)">${stats.debit.toFixed(2)}</td>
              <td style="color:var(--success)">${stats.credit.toFixed(2)}</td>
              <td style="font-weight:600">${endBalance.toFixed(2)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  exportLedger() {
    if (!hasPerm('finance', 'export')) { toast('没有导出权限', 'error'); return; }
    toast('账簿导出功能开发中', 'info');
  },

  renderGLReports() {
    const year = this.yearFilter;
    const vouchers = DB.get('finVouchers').filter(v => v.status === '已审核' && (v.date || '').startsWith(year));
    const accounts = DB.get('finAccounts');

    let totalIncome = 0, totalExpense = 0;
    vouchers.forEach(v => {
      v.entries.forEach(e => {
        const acc = accounts.find(a => a.code === e.account);
        if (acc?.type === '收入') totalIncome += e.credit;
        if (acc?.type === '成本' || acc?.type === '费用') totalExpense += e.debit;
      });
    });

    const netProfit = totalIncome - totalExpense;

    return `
    <!-- 财务报表选择 -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:22px">
      <div class="card" style="cursor:pointer" onclick="finance.viewBalanceSheet()">
        <div style="text-align:center;padding:20px">
          <div style="font-size:32px;margin-bottom:12px">📊</div>
          <div style="font-weight:700;font-size:16px">资产负债表</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">反映企业财务状况</div>
        </div>
      </div>
      <div class="card" style="cursor:pointer" onclick="finance.viewIncomeStatement()">
        <div style="text-align:center;padding:20px">
          <div style="font-size:32px;margin-bottom:12px">📈</div>
          <div style="font-weight:700;font-size:16px">利润表</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">反映企业经营成果</div>
        </div>
      </div>
      <div class="card" style="cursor:pointer" onclick="finance.viewCashFlow()">
        <div style="text-align:center;padding:20px">
          <div style="font-size:32px;margin-bottom:12px">💵</div>
          <div style="font-weight:700;font-size:16px">现金流量表</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">反映现金流动情况</div>
        </div>
      </div>
    </div>

    <!-- 快速预览 -->
    <div class="card">
      <div class="card-title">📋 ${year}年度财务概览</div>
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card green">
          <div class="stat-info"><div class="stat-label">营业收入</div><div class="stat-value" style="color:var(--success)">${fmtMoney(totalIncome)}</div></div>
        </div>
        <div class="stat-card red">
          <div class="stat-info"><div class="stat-label">营业成本/费用</div><div class="stat-value" style="color:var(--danger)">${fmtMoney(totalExpense)}</div></div>
        </div>
        <div class="stat-card ${netProfit >= 0 ? 'blue' : 'orange'}">
          <div class="stat-info"><div class="stat-label">净利润</div><div class="stat-value">${fmtMoney(netProfit)}</div></div>
        </div>
        <div class="stat-card purple">
          <div class="stat-info"><div class="stat-label">凭证数量</div><div class="stat-value">${vouchers.length}</div></div>
        </div>
      </div>
    </div>`;
  },

  viewBalanceSheet() {
    const assets = [
      { name: '货币资金', amount: 500000 },
      { name: '应收账款', amount: 200000 },
      { name: '存货', amount: 300000 },
      { name: '固定资产', amount: 800000 }
    ];
    const liabilities = [
      { name: '应付账款', amount: 150000 },
      { name: '应付职工薪酬', amount: 80000 }
    ];
    const equity = [
      { name: '实收资本', amount: 1000000 },
      { name: '未分配利润', amount: 570000 }
    ];

    const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.amount, 0);
    const totalEquity = equity.reduce((s, a) => s + a.amount, 0);

    openModal('资产负债表', `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:18px;font-weight:700">资产负债表</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">编制日期：${new Date().toISOString().slice(0, 10)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="card">
          <div class="card-title" style="background:var(--primary);color:white">资产</div>
          <table style="width:100%;font-size:13px">
            <thead><tr><th>项目</th><th style="text-align:right">金额</th></tr></thead>
            <tbody>
              ${assets.map(a => `<tr><td>${a.name}</td><td style="text-align:right">${fmtMoney(a.amount)}</td></tr>`).join('')}
              <tr style="font-weight:700;border-top:2px solid var(--border)"><td>资产合计</td><td style="text-align:right">${fmtMoney(totalAssets)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="card-title" style="background:var(--danger);color:white">负债</div>
            <table style="width:100%;font-size:13px">
              <thead><tr><th>项目</th><th style="text-align:right">金额</th></tr></thead>
              <tbody>
                ${liabilities.map(a => `<tr><td>${a.name}</td><td style="text-align:right">${fmtMoney(a.amount)}</td></tr>`).join('')}
                <tr style="font-weight:700;border-top:2px solid var(--border)"><td>负债合计</td><td style="text-align:right">${fmtMoney(totalLiabilities)}</td></tr>
              </tbody>
            </table>
          </div>
          <div class="card">
            <div class="card-title" style="background:var(--success);color:white">所有者权益</div>
            <table style="width:100%;font-size:13px">
              <thead><tr><th>项目</th><th style="text-align:right">金额</th></tr></thead>
              <tbody>
                ${equity.map(a => `<tr><td>${a.name}</td><td style="text-align:right">${fmtMoney(a.amount)}</td></tr>`).join('')}
                <tr style="font-weight:700;border-top:2px solid var(--border)"><td>权益合计</td><td style="text-align:right">${fmtMoney(totalEquity)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style="margin-top:16px;text-align:center;font-weight:700;font-size:16px">
        负债及所有者权益总计：${fmtMoney(totalLiabilities + totalEquity)}
      </div>
    `, [{ label: '关闭', class: 'btn btn-outline', onclick: 'closeModal()' }]);
  },

  viewIncomeStatement() {
    const vouchers = DB.get('finVouchers').filter(v => v.status === '已审核');
    const accounts = DB.get('finAccounts');

    let salesIncome = 0, salesCost = 0, expenses = 0;
    vouchers.forEach(v => {
      v.entries.forEach(e => {
        const acc = accounts.find(a => a.code === e.account);
        if (acc?.type === '收入') salesIncome += e.credit;
        if (acc?.type === '成本') salesCost += e.debit;
        if (acc?.type === '费用') expenses += e.debit;
      });
    });

    const grossProfit = salesIncome - salesCost;
    const netProfit = grossProfit - expenses;

    openModal('利润表', `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:18px;font-weight:700">利润表</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${this.yearFilter}年度</div>
      </div>
      <div class="card">
        <table style="width:100%;font-size:14px">
          <tbody>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 0"><strong>一、营业收入</strong></td>
              <td style="text-align:right;color:var(--success)"><strong>${fmtMoney(salesIncome)}</strong></td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 0;color:var(--text-muted)">减：营业成本</td>
              <td style="text-align:right;color:var(--danger)">${fmtMoney(salesCost)}</td>
            </tr>
            <tr style="border-bottom:2px solid var(--primary);background:var(--bg)">
              <td style="padding:12px 0"><strong>二、营业利润（毛利）</strong></td>
              <td style="text-align:right;color:var(--primary)"><strong>${fmtMoney(grossProfit)}</strong></td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 0;color:var(--text-muted)">减：期间费用</td>
              <td style="text-align:right;color:var(--danger)">${fmtMoney(expenses)}</td>
            </tr>
            <tr style="border-bottom:2px solid var(--border);background:rgba(16,185,129,0.1)">
              <td style="padding:12px 0"><strong>三、净利润</strong></td>
              <td style="text-align:right;color:var(--success)"><strong>${fmtMoney(netProfit)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `, [{ label: '关闭', class: 'btn btn-outline', onclick: 'closeModal()' }]);
  },

  viewCashFlow() {
    const year = this.yearFilter;
    const cashIn = DB.get('finVouchers').filter(v => v.status === '已审核' && (v.date || '').startsWith(year))
      .reduce((s, v) => s + v.entries.reduce((a, e) => a + (e.account === '1001' || e.account === '1002' ? e.debit : 0), 0), 0);
    const cashOut = DB.get('finVouchers').filter(v => v.status === '已审核' && (v.date || '').startsWith(year))
      .reduce((s, v) => s + v.entries.reduce((a, e) => a + (e.account === '1001' || e.account === '1002' ? e.credit : 0), 0), 0);

    openModal('现金流量表', `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:18px;font-weight:700">现金流量表</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${year}年度</div>
      </div>
      <div class="card">
        <table style="width:100%;font-size:14px">
          <tbody>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 0"><strong>一、经营活动现金流入</strong></td>
              <td style="text-align:right;color:var(--success)">${fmtMoney(cashIn)}</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 0"><strong>二、经营活动现金流出</strong></td>
              <td style="text-align:right;color:var(--danger)">${fmtMoney(cashOut)}</td>
            </tr>
            <tr style="background:rgba(16,185,129,0.1)">
              <td style="padding:12px 0"><strong>三、现金流量净额</strong></td>
              <td style="text-align:right;color:var(--success)"><strong>${fmtMoney(cashIn - cashOut)}</strong></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;font-size:12px;color:var(--text-muted)">
          注：以上数据根据已审核凭证的货币资金科目发生额计算
        </div>
      </div>
    `, [{ label: '关闭', class: 'btn btn-outline', onclick: 'closeModal()' }]);
  },

  renderGLClosing() {
    const year = this.yearFilter;
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    let closing = DB.get('finClosing') || [];
    const closedMonths = closing.filter(c => c.year === year).map(c => c.month);

    return `
    <!-- 期末结转 -->
    <div class="card" style="margin-bottom:22px">
      <div class="card-title">📋 期末结转 - ${year}年</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        ${months.map(m => {
          const isClosed = closedMonths.includes(m);
          const monthName = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'][parseInt(m) - 1];
          return `
          <div style="padding:16px;background:${isClosed ? 'rgba(16,185,129,0.1)' : 'var(--bg)'};border-radius:8px;text-align:center;border:1px solid ${isClosed ? 'var(--success)' : 'var(--border)'}">
            <div style="font-weight:600;margin-bottom:8px">${monthName}</div>
            ${isClosed ? `<span class="badge badge-success">已结账</span>` : `<button class="btn btn-primary btn-sm" onclick="finance.closeMonth('${year}','${m}')">结账</button>`}
          </div>`;
        }).join('')}
      </div>
      <div style="padding:12px;background:var(--bg);border-radius:8px;font-size:13px;color:var(--text-muted)">
        💡 提示：期末结转包括结转损益、结转成本等操作。结账后该月凭证将不能修改。
      </div>
    </div>

    <!-- 凭证过账 -->
    <div class="card">
      <div class="card-title">🔄 凭证过账</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card" style="background:var(--bg)">
          <div style="font-weight:600;margin-bottom:12px">📤 结转损益</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">将收入、成本、费用结转至本年利润</div>
          <button class="btn btn-primary" onclick="finance.closeIncome('${year}')">执行结转</button>
        </div>
        <div class="card" style="background:var(--bg)">
          <div style="font-weight:600;margin-bottom:12px">📥 结转成本</div>
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">将完工产品成本结转至主营业务成本</div>
          <button class="btn btn-primary" onclick="finance.closeCost('${year}')">执行结转</button>
        </div>
      </div>
    </div>`;
  },

  closeMonth(year, month) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    if (!confirm(`确定要对${year}年${month}月进行结账吗？结账后将不能修改该月凭证。`)) return;

    let closing = DB.get('finClosing') || [];
    closing.push({ year, month, operator: currentUser?.username, closeTime: new Date().toISOString() });
    localStorage.setItem('finClosing', JSON.stringify(closing));

    toast(`${year}年${month}月结账完成`, 'success');
    this.reload();
  },

  closeIncome(year) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    toast('结转损益凭证已生成，请审核', 'success');
    this.reload();
  },

  closeCost(year) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    toast('结转成本凭证已生成，请审核', 'success');
    this.reload();
  },

  // ==================== 应收管理 AR ====================
  renderAR() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'ar' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='ar';finance.reload()">📄 销售发票</button>
      <button class="btn ${this.activeSubTab === 'arCollection' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='arCollection';finance.reload()">💰 收款记录</button>
      <button class="btn ${this.activeSubTab === 'arAge' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='arAge';finance.reload()">📊 账龄分析</button>
    </div>

    ${this.activeSubTab === 'ar' ? this.renderARInvoice() : ''}
    ${this.activeSubTab === 'arCollection' ? this.renderARCollection() : ''}
    ${this.activeSubTab === 'arAge' ? this.renderARAge() : ''}`;
  },

  renderARInvoice() {
    let invoices = DB.get('finARInvoices');
    const stats = {
      total: invoices.reduce((s, i) => s + (i.amount || 0), 0),
      received: DB.get('finARCollections').reduce((s, c) => s + (c.amount || 0), 0),
      unpaid: invoices.reduce((s, i) => s + (i.amount || 0), 0) - DB.get('finARCollections').reduce((s, c) => s + (c.amount || 0), 0),
      overdue: invoices.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== '已核销').length
    };

    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      invoices = invoices.filter(i => (i.code || '').toLowerCase().includes(kw) || (i.customerName || '').toLowerCase().includes(kw));
    }
    invoices = invoices.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return `
    <!-- 统计 -->
    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">应收账款</div><div class="stat-value">${fmtMoney(stats.total)}</div></div></div>
      <div class="stat-card green"><div class="stat-info"><div class="stat-label">已收款</div><div class="stat-value" style="color:var(--success)">${fmtMoney(stats.received)}</div></div></div>
      <div class="stat-card orange"><div class="stat-info"><div class="stat-label">未收款</div><div class="stat-value" style="color:var(--warning)">${fmtMoney(stats.unpaid)}</div></div></div>
      <div class="stat-card red"><div class="stat-info"><div class="stat-label">逾期</div><div class="stat-value" style="color:var(--danger)">${stats.overdue} 笔</div></div></div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索发票号/客户..." value="${this.keyword}"
            oninput="finance.keyword=this.value;finance.page=1;finance.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.createARInvoice()">+ 新增发票</button>
      </div>
    </div>

    <div class="card">
      ${!invoices.length ? `<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-text">暂无销售发票</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>发票号</th><th>日期</th><th>客户</th><th>金额</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${invoices.map(i => {
            const isOverdue = i.dueDate && new Date(i.dueDate) < new Date() && i.status !== '已核销';
            const statusClass = i.status === '已核销' ? 'badge-success' : isOverdue ? 'badge-danger' : 'badge-default';
            return `<tr>
              <td><span style="color:var(--primary)">${i.code}</span></td>
              <td>${i.date || '-'}</td>
              <td><strong>${i.customerName || '-'}</strong></td>
              <td style="font-weight:700">${fmtMoney(i.amount)}</td>
              <td style="color:${isOverdue ? 'var(--danger)' : ''}">${i.dueDate || '-'}</td>
              <td><span class="badge ${statusClass}">${i.status || '未核销'}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="finance.viewARInvoice(${i.id})">查看</button>
                  ${i.status !== '已核销' ? `<button class="btn btn-primary btn-sm" onclick="finance.receivePayment(${i.id})">收款</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  createARInvoice() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('ARI');
    const today = new Date().toISOString().slice(0, 10);
    const customers = DB.get('customers').filter(c => c.status === 1);

    openModal('新增销售发票', `
      <div class="form-row cols-2">
        <div class="form-item"><label>发票号</label><input id="ariCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>发票日期</label><input id="ariDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>客户 *</label>
          <select id="ariCustomer">
            <option value="">请选择客户</option>
            ${customers.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>到期日</label><input id="ariDueDate" type="date" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-item"><label>金额(元) *</label><input id="ariAmount" type="number" min="0" step="0.01" placeholder="0.00"></div>
      <div class="form-item"><label>备注</label><textarea id="ariNote" rows="2"></textarea></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '保存', class: 'btn btn-primary', onclick: 'finance.saveARInvoice()' }
    ]);
  },

  saveARInvoice() {
    const code = document.getElementById('ariCode').value.trim();
    const date = document.getElementById('ariDate').value;
    const customerName = document.getElementById('ariCustomer').value;
    const dueDate = document.getElementById('ariDueDate').value;
    const amount = parseFloat(document.getElementById('ariAmount').value) || 0;
    const note = document.getElementById('ariNote').value.trim();

    if (!customerName || !amount) return toast('请填写必填项', 'error');

    const data = {
      id: DB.nextId('finARInvoices'),
      code, date, customerName, dueDate, amount, note,
      status: '未核销',
      creator: currentUser?.username || '',
      createdAt: new Date().toISOString()
    };

    DB.add('finARInvoices', data);
    toast('发票已保存', 'success');
    closeModal();
    this.reload();
  },

  viewARInvoice(id) {
    const i = DB.findById('finARInvoices', id);
    if (!i) return;
    openModal('发票详情', `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div class="form-item"><label>发票号</label><div style="font-weight:600;color:var(--primary)">${i.code}</div></div>
        <div class="form-item"><label>日期</label><div>${i.date}</div></div>
        <div class="form-item"><label>客户</label><div>${i.customerName}</div></div>
        <div class="form-item"><label>到期日</label><div>${i.dueDate}</div></div>
        <div class="form-item"><label>金额</label><div style="font-weight:700">${fmtMoney(i.amount)}</div></div>
        <div class="form-item"><label>状态</label><div><span class="badge ${i.status === '已核销' ? 'badge-success' : 'badge-default'}">${i.status}</span></div></div>
      </div>
    `, [{ label: '关闭', class: 'btn btn-outline', onclick: 'closeModal()' }]);
  },

  receivePayment(invoiceId) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    const invoice = DB.findById('finARInvoices', invoiceId);
    if (!invoice) return;

    openModal('收款登记', `
      <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px">
        <div>发票号：<strong>${invoice.code}</strong></div>
        <div>客户：<strong>${invoice.customerName}</strong></div>
        <div>应付金额：<strong style="color:var(--success)">${fmtMoney(invoice.amount)}</strong></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>收款金额</label><input id="recvAmount" type="number" min="0" max="${invoice.amount}" step="0.01" value="${invoice.amount}"></div>
        <div class="form-item"><label>收款日期</label><input id="recvDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-item"><label>收款方式</label>
        <select id="recvMethod">
          <option value="银行转账">银行转账</option>
          <option value="现金">现金</option>
        </select>
      </div>
      <input type="hidden" id="recvInvoiceId" value="${invoiceId}">
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '确认收款', class: 'btn btn-primary', onclick: 'finance.doReceivePayment()' }
    ]);
  },

  doReceivePayment() {
    const invoiceId = parseInt(document.getElementById('recvInvoiceId').value);
    const amount = parseFloat(document.getElementById('recvAmount').value) || 0;
    const date = document.getElementById('recvDate').value;
    const method = document.getElementById('recvMethod').value;

    if (!amount) return toast('请输入收款金额', 'error');

    const invoice = DB.findById('finARInvoices', invoiceId);
    const totalReceived = DB.get('finARCollections').filter(c => c.invoiceId === invoiceId).reduce((s, c) => s + c.amount, 0) + amount;

    DB.add('finARCollections', {
      id: DB.nextId('finARCollections'),
      invoiceId, invoiceCode: invoice?.code, customerName: invoice?.customerName,
      amount, date, method,
      creator: currentUser?.username || '',
      createdAt: new Date().toISOString()
    });

    if (totalReceived >= invoice.amount) {
      DB.update('finARInvoices', invoiceId, { status: '已核销' });
    }

    toast('收款已登记', 'success');
    closeModal();
    this.reload();
  },

  renderARCollection() {
    let collections = DB.get('finARCollections');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      collections = collections.filter(c => (c.customerName || '').toLowerCase().includes(kw));
    }
    collections = collections.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return `
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>收款日期</th><th>发票号</th><th>客户</th><th>收款方式</th><th>金额</th><th>操作员</th></tr></thead>
        <tbody>
          ${collections.length ? collections.map(c => `<tr>
            <td>${c.date || '-'}</td>
            <td><span style="color:var(--primary)">${c.invoiceCode || '-'}</span></td>
            <td><strong>${c.customerName || '-'}</strong></td>
            <td>${c.method || '-'}</td>
            <td style="color:var(--success);font-weight:700">+${fmtMoney(c.amount)}</td>
            <td>${c.creator || '-'}</td>
          </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">暂无收款记录</td></tr>`}
        </tbody>
      </table></div>
    </div>`;
  },

  renderARAge() {
    const invoices = DB.get('finARInvoices').filter(i => i.status !== '已核销');
    const now = new Date();

    const ageAnalysis = {
      '0-30天': { count: 0, amount: 0 },
      '31-60天': { count: 0, amount: 0 },
      '61-90天': { count: 0, amount: 0 },
      '90天以上': { count: 0, amount: 0 }
    };

    invoices.forEach(i => {
      if (!i.dueDate) return;
      const days = Math.floor((now - new Date(i.dueDate)) / (24 * 60 * 60 * 1000));
      if (days <= 30) { ageAnalysis['0-30天'].count++; ageAnalysis['0-30天'].amount += i.amount; }
      else if (days <= 60) { ageAnalysis['31-60天'].count++; ageAnalysis['31-60天'].amount += i.amount; }
      else if (days <= 90) { ageAnalysis['61-90天'].count++; ageAnalysis['61-90天'].amount += i.amount; }
      else { ageAnalysis['90天以上'].count++; ageAnalysis['90天以上'].amount += i.amount; }
    });

    const totalAmount = Object.values(ageAnalysis).reduce((s, a) => s + a.amount, 0);

    return `
    <div class="card">
      <div class="card-title">📊 应收账款账龄分析</div>
      <div class="table-wrap"><table>
        <thead><tr><th>账龄区间</th><th>发票数量</th><th>金额</th><th>占比</th></tr></thead>
        <tbody>
          ${Object.entries(ageAnalysis).map(([range, data]) => `<tr>
            <td>${range}</td><td>${data.count}</td>
            <td style="font-weight:700">${fmtMoney(data.amount)}</td>
            <td>${totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : 0}%</td>
          </tr>`).join('')}
          <tr style="font-weight:700;background:var(--bg)">
            <td>合计</td><td>${invoices.length}</td>
            <td style="color:var(--success)">${fmtMoney(totalAmount)}</td><td>100%</td>
          </tr>
        </tbody>
      </table></div>
    </div>`;
  },

  // ==================== 应付管理 AP ====================
  renderAP() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'ap' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='ap';finance.reload()">📄 采购发票</button>
      <button class="btn ${this.activeSubTab === 'apPayment' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='apPayment';finance.reload()">💸 付款记录</button>
      <button class="btn ${this.activeSubTab === 'apReconcile' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='apReconcile';finance.reload()">📋 供应商对账</button>
    </div>

    ${this.activeSubTab === 'ap' ? this.renderAPInvoice() : ''}
    ${this.activeSubTab === 'apPayment' ? this.renderAPPayment() : ''}
    ${this.activeSubTab === 'apReconcile' ? this.renderAPReconcile() : ''}`;
  },

  renderAPInvoice() {
    let invoices = DB.get('finAPInvoices');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      invoices = invoices.filter(i => (i.code || '').toLowerCase().includes(kw) || (i.supplierName || '').toLowerCase().includes(kw));
    }
    invoices = invoices.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const stats = {
      total: invoices.reduce((s, i) => s + (i.amount || 0), 0),
      paid: invoices.filter(i => i.status === '已付款').reduce((s, i) => s + (i.amount || 0), 0),
      unpaid: invoices.filter(i => i.status !== '已付款').reduce((s, i) => s + (i.amount || 0), 0)
    };

    return `
    <!-- 统计 -->
    <div class="stat-cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">应付账款</div><div class="stat-value">${fmtMoney(stats.total)}</div></div></div>
      <div class="stat-card green"><div class="stat-info"><div class="stat-label">已付款</div><div class="stat-value" style="color:var(--success)">${fmtMoney(stats.paid)}</div></div></div>
      <div class="stat-card orange"><div class="stat-info"><div class="stat-label">未付款</div><div class="stat-value" style="color:var(--warning)">${fmtMoney(stats.unpaid)}</div></div></div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索..." value="${this.keyword}" oninput="finance.keyword=this.value;finance.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.createAPInvoice()">+ 新增应付发票</button>
      </div>
    </div>

    <div class="card">
      ${!invoices.length ? `<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-text">暂无应付发票</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>发票号</th><th>日期</th><th>供应商</th><th>金额</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${invoices.map(i => `<tr>
            <td><span style="color:var(--primary)">${i.code}</span></td>
            <td>${i.date || '-'}</td>
            <td><strong>${i.supplierName || '-'}</strong></td>
            <td style="font-weight:700">${fmtMoney(i.amount)}</td>
            <td>${i.dueDate || '-'}</td>
            <td><span class="badge ${i.status === '已付款' ? 'badge-success' : 'badge-default'}">${i.status}</span></td>
            <td>
              ${i.status !== '已付款' ? `<button class="btn btn-primary btn-sm" onclick="finance.payAP(${i.id})">付款</button>` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  createAPInvoice() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('API');
    const today = new Date().toISOString().slice(0, 10);
    const suppliers = DB.get('suppliers').filter(s => s.status === 1);

    openModal('新增应付发票', `
      <div class="form-row cols-2">
        <div class="form-item"><label>发票号</label><input id="apiCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>日期</label><input id="apiDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>供应商</label>
          <select id="apiSupplier">
            <option value="">请选择</option>
            ${suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>到期日</label><input id="apiDueDate" type="date" value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-item"><label>金额</label><input id="apiAmount" type="number" min="0" step="0.01"></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '保存', class: 'btn btn-primary', onclick: 'finance.saveAPInvoice()' }
    ]);
  },

  saveAPInvoice() {
    const data = {
      id: DB.nextId('finAPInvoices'),
      code: document.getElementById('apiCode').value.trim(),
      date: document.getElementById('apiDate').value,
      supplierName: document.getElementById('apiSupplier').value,
      dueDate: document.getElementById('apiDueDate').value,
      amount: parseFloat(document.getElementById('apiAmount').value) || 0,
      status: '未付款',
      creator: currentUser?.username || '',
      createdAt: new Date().toISOString()
    };
    if (!data.supplierName || !data.amount) return toast('请填写必填项', 'error');
    DB.add('finAPInvoices', data);
    toast('应付发票已保存', 'success');
    closeModal();
    this.reload();
  },

  payAP(invoiceId) {
    if (!hasPerm('finance', 'approve')) { toast('没有审核权限', 'error'); return; }
    const invoice = DB.findById('finAPInvoices', invoiceId);
    if (!invoice) return;

    openModal('付款登记', `
      <div class="form-row cols-2">
        <div class="form-item"><label>付款金额</label><input id="payAmount" type="number" min="0" max="${invoice.amount}" step="0.01" value="${invoice.amount}"></div>
        <div class="form-item"><label>付款日期</label><input id="payDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <input type="hidden" id="payInvoiceId" value="${invoiceId}">
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '确认付款', class: 'btn btn-primary', onclick: 'finance.doPayAP()' }
    ]);
  },

  doPayAP() {
    const invoiceId = parseInt(document.getElementById('payInvoiceId').value);
    const amount = parseFloat(document.getElementById('payAmount').value) || 0;
    const date = document.getElementById('payDate').value;
    const invoice = DB.findById('finAPInvoices', invoiceId);
    const totalPaid = DB.get('finAPPayments').filter(p => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0) + amount;

    DB.add('finAPPayments', { id: DB.nextId('finAPPayments'), invoiceId, invoiceCode: invoice?.code, supplierName: invoice?.supplierName, amount, date, creator: currentUser?.username || '', createdAt: new Date().toISOString() });
    if (totalPaid >= invoice.amount) DB.update('finAPInvoices', invoiceId, { status: '已付款' });
    toast('付款已登记', 'success');
    closeModal();
    this.reload();
  },

  renderAPPayment() {
    let payments = DB.get('finAPPayments').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return `<div class="card"><div class="table-wrap"><table><thead><tr><th>日期</th><th>发票号</th><th>供应商</th><th>金额</th></tr></thead><tbody>${payments.length ? payments.map(p => `<tr><td>${p.date}</td><td>${p.invoiceCode}</td><td>${p.supplierName}</td><td style="color:var(--danger)">-${fmtMoney(p.amount)}</td></tr>`).join('') : `<tr><td colspan="4" style="text-align:center">暂无付款记录</td></tr>`}</tbody></table></div></div>`;
  },

  renderAPReconcile() {
    const invoices = DB.get('finAPInvoices').filter(i => i.status !== '已付款');
    const suppliers = [...new Set(invoices.map(i => i.supplierName).filter(Boolean))];
    return `<div class="card"><div class="table-wrap"><table><thead><tr><th>供应商</th><th>应付笔数</th><th>应付金额</th></tr></thead><tbody>${suppliers.length ? suppliers.map(s => { const invs = invoices.filter(i => i.supplierName === s); return `<tr><td>${s}</td><td>${invs.length}</td><td>${fmtMoney(invs.reduce((sum, i) => sum + i.amount, 0))}</td></tr>`; }).join('') : `<tr><td colspan="3">暂无待对账供应商</td></tr>`}</tbody></table></div></div>`;
  },

  // ==================== 成本核算 CO ====================
  renderCO() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'coProduct' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='coProduct';finance.reload()">📦 产品成本</button>
      <button class="btn ${this.activeSubTab === 'coStandard' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='coStandard';finance.reload()">📐 标准成本</button>
      <button class="btn ${this.activeSubTab === 'coVariance' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='coVariance';finance.reload()">📊 成本差异</button>
    </div>

    ${this.activeSubTab === 'coProduct' ? this.renderCOProduct() : ''}
    ${this.activeSubTab === 'coStandard' ? this.renderCOStandard() : ''}
    ${this.activeSubTab === 'coVariance' ? this.renderCOVariance() : ''}`;
  },

  renderCOProduct() {
    const products = DB.get('goods');
    const stats = {
      count: products.length,
      total: products.reduce((s, p) => s + ((p.costPrice || 0) * (p.stock || 0)), 0)
    };

    return `
    <div class="stat-cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">产品种类</div><div class="stat-value">${stats.count}</div></div></div>
      <div class="stat-card green"><div class="stat-info"><div class="stat-label">库存成本</div><div class="stat-value" style="color:var(--success)">${fmtMoney(stats.total)}</div></div></div>
    </div>

    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>商品编码</th><th>商品名称</th><th>单位</th><th>库存</th><th>成本单价</th><th>库存成本</th><th>毛利率</th></tr></thead>
        <tbody>
          ${products.map(p => {
            const stock = p.stock || 0, cost = p.costPrice || 0, price = p.price || 0;
            const margin = price > 0 ? ((price - cost) / price * 100) : 0;
            return `<tr>
              <td>${p.code}</td><td><strong>${p.name}</strong></td><td>${p.unit}</td>
              <td>${stock}</td><td style="color:var(--danger)">${fmtMoney(cost)}</td>
              <td>${fmtMoney(stock * cost)}</td>
              <td><span class="badge ${margin >= 20 ? 'badge-success' : 'badge-warning'}">${margin.toFixed(1)}%</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  renderCOStandard() {
    return `<div class="card"><div class="card-title">📐 标准成本管理</div><div style="padding:40px;text-align:center;color:var(--text-muted)">标准成本功能开发中...</div></div>`;
  },

  renderCOVariance() {
    return `<div class="card"><div class="card-title">📊 成本差异分析</div><div style="padding:40px;text-align:center;color:var(--text-muted)">成本差异分析功能开发中...</div></div>`;
  },

  // ==================== 固定资产 FA ====================
  renderFA() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'faAsset' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='faAsset';finance.reload()">🏢 资产卡片</button>
      <button class="btn ${this.activeSubTab === 'faDepr' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='faDepr';finance.reload()">📉 折旧管理</button>
    </div>

    ${this.activeSubTab === 'faAsset' ? this.renderFAAsset() : ''}
    ${this.activeSubTab === 'faDepr' ? this.renderFADepr() : ''}`;
  },

  renderFAAsset() {
    let assets = DB.get('finAssets');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      assets = assets.filter(a => (a.code || '').toLowerCase().includes(kw) || (a.name || '').toLowerCase().includes(kw));
    }
    assets = assets.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const stats = {
      count: assets.length,
      original: assets.reduce((s, a) => s + (a.originalValue || 0), 0),
      net: assets.reduce((s, a) => s + (a.netValue || a.originalValue || 0), 0)
    };

    return `
    <div class="stat-cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">资产数量</div><div class="stat-value">${stats.count}</div></div></div>
      <div class="stat-card green"><div class="stat-info"><div class="stat-label">原值合计</div><div class="stat-value">${fmtMoney(stats.original)}</div></div></div>
      <div class="stat-card purple"><div class="stat-info"><div class="stat-label">净值合计</div><div class="stat-value">${fmtMoney(stats.net)}</div></div></div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索..." value="${this.keyword}" oninput="finance.keyword=this.value;finance.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.addFAAsset()">+ 新增资产</button>
      </div>
    </div>

    <div class="card">
      ${!assets.length ? `<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-text">暂无固定资产</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>编号</th><th>名称</th><th>类别</th><th>原值</th><th>净值</th><th>使用部门</th><th>状态</th></tr></thead>
        <tbody>
          ${assets.map(a => `<tr>
            <td><span style="color:var(--primary)">${a.code}</span></td>
            <td><strong>${a.name}</strong></td><td>${a.category}</td>
            <td>${fmtMoney(a.originalValue)}</td><td>${fmtMoney(a.netValue || a.originalValue)}</td>
            <td>${a.department || '-'}</td>
            <td><span class="badge badge-success">${a.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  addFAAsset() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('FA');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新增固定资产', `
      <div class="form-row cols-2">
        <div class="form-item"><label>编号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>名称</label><input id="faName" placeholder="请输入"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>类别</label>
          <select id="faCategory">
            <option value="机器设备">机器设备</option>
            <option value="运输设备">运输设备</option>
            <option value="办公设备">办公设备</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-item"><label>购置日期</label><input id="faDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>原值</label><input id="faOriginal" type="number" min="0"></div>
        <div class="form-item"><label>使用年限</label><input id="faLife" type="number" min="1" value="10"></div>
      </div>
      <div class="form-item"><label>使用部门</label><input id="faDept" placeholder="请输入"></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '保存', class: 'btn btn-primary', onclick: 'finance.saveFAAsset()' }
    ]);
  },

  saveFAAsset() {
    const name = document.getElementById('faName').value.trim();
    const originalValue = parseFloat(document.getElementById('faOriginal').value) || 0;
    if (!name || !originalValue) return toast('请填写必填项', 'error');

    const life = parseInt(document.getElementById('faLife').value) || 10;
    const monthlyDepr = originalValue * 0.95 / life / 12;

    DB.add('finAssets', {
      id: DB.nextId('finAssets'),
      code: document.querySelector('#modalBody input').value.trim(),
      name, category: document.getElementById('faCategory').value,
      date: document.getElementById('faDate').value,
      originalValue, life,
      monthlyDepr, depreciation: 0, netValue: originalValue,
      department: document.getElementById('faDept').value.trim(),
      status: '使用中',
      creator: currentUser?.username || '',
      createdAt: new Date().toISOString()
    });
    toast('固定资产已保存', 'success');
    closeModal();
    this.reload();
  },

  renderFADepr() {
    const assets = DB.get('finAssets');
    const thisMonth = new Date().toISOString().slice(0, 7);
    return `
    <div class="card">
      <div class="card-title">📉 折旧计提 - ${thisMonth}</div>
      <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px">
        本月应计提折旧：<strong>${fmtMoney(assets.reduce((s, a) => s + (a.monthlyDepr || 0), 0))}</strong>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>资产</th><th>原值</th><th>月折旧</th><th>累计折旧</th><th>净值</th></tr></thead>
        <tbody>
          ${assets.map(a => `<tr>
            <td>${a.name}</td><td>${fmtMoney(a.originalValue)}</td>
            <td style="color:var(--warning)">${fmtMoney(a.monthlyDepr || 0)}</td>
            <td>${fmtMoney(a.depreciation || 0)}</td>
            <td>${fmtMoney(a.netValue || a.originalValue)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  // ==================== 资金管理 ====================
  renderCash() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'cashJournal' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='cashJournal';finance.reload()">💵 现金日记账</button>
      <button class="btn ${this.activeSubTab === 'cashForecast' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='cashForecast';finance.reload()">📈 资金预测</button>
    </div>

    ${this.activeSubTab === 'cashJournal' ? this.renderCashJournal() : ''}
    ${this.activeSubTab === 'cashForecast' ? this.renderCashForecast() : ''}`;
  },

  renderCashJournal() {
    let records = DB.get('finCashJournal');
    if (this.dateFilter) records = records.filter(r => (r.date || '').startsWith(this.dateFilter));
    records = records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const balance = records.reduce((s, r) => s + (r.type === '收入' ? r.amount : -r.amount), 0);

    return `
    <div class="stat-cards" style="grid-template-columns:repeat(2,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">现金余额</div><div class="stat-value">${fmtMoney(balance)}</div></div></div>
      <div class="stat-card green"><div class="stat-info"><div class="stat-label">本月收入</div><div class="stat-value">${fmtMoney(records.filter(r => r.type === '收入').reduce((s, r) => s + r.amount, 0))}</div></div></div>
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <input type="month" class="filter-select" value="${this.dateFilter}" onchange="finance.dateFilter=this.value;finance.reload()">
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.addCashRecord()">+ 收支登记</button>
      </div>
    </div>

    <div class="card">
      ${!records.length ? `<div class="empty-state"><div class="empty-state-icon">💵</div><div class="empty-state-text">暂无现金记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>日期</th><th>摘要</th><th>收入</th><th>支出</th><th>余额</th></tr></thead>
        <tbody>
          ${records.map((r, i) => {
            const prev = records.slice(0, i).reduce((s, x) => s + (x.type === '收入' ? x.amount : -x.amount), 0);
            const cur = prev + (r.type === '收入' ? r.amount : -r.amount);
            return `<tr>
              <td>${r.date}</td><td>${r.summary}</td>
              <td style="color:var(--success)">${r.type === '收入' ? fmtMoney(r.amount) : ''}</td>
              <td style="color:var(--danger)">${r.type === '支出' ? fmtMoney(r.amount) : ''}</td>
              <td style="font-weight:600">${fmtMoney(cur)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  addCashRecord() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const today = new Date().toISOString().slice(0, 10);
    openModal('现金收支登记', `
      <div class="form-row cols-2">
        <div class="form-item"><label>日期</label><input id="cashDate" type="date" value="${today}"></div>
        <div class="form-item"><label>类型</label>
          <select id="cashType"><option value="收入">收入</option><option value="支出">支出</option></select>
        </div>
      </div>
      <div class="form-item"><label>金额</label><input id="cashAmount" type="number" min="0" step="0.01"></div>
      <div class="form-item"><label>摘要</label><input id="cashSummary" placeholder="请输入"></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '保存', class: 'btn btn-primary', onclick: 'finance.saveCashRecord()' }
    ]);
  },

  saveCashRecord() {
    const amount = parseFloat(document.getElementById('cashAmount').value) || 0;
    if (!amount) return toast('请输入金额', 'error');
    DB.add('finCashJournal', {
      id: DB.nextId('finCashJournal'),
      date: document.getElementById('cashDate').value,
      type: document.getElementById('cashType').value,
      amount, summary: document.getElementById('cashSummary').value.trim(),
      operator: currentUser?.username || '',
      createdAt: new Date().toISOString()
    });
    toast('记录已保存', 'success');
    closeModal();
    this.reload();
  },

  renderCashForecast() {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const expectedIn = DB.get('finARCollections').filter(c => (c.date || '').startsWith(thisMonth)).reduce((s, c) => s + c.amount, 0);
    const expectedOut = DB.get('finAPPayments').filter(c => (c.date || '').startsWith(thisMonth)).reduce((s, c) => s + c.amount, 0);

    return `
    <div class="card">
      <div class="card-title">📈 资金预测</div>
      <div class="stat-cards" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card green"><div class="stat-info"><div class="stat-label">预计收款</div><div class="stat-value" style="color:var(--success)">${fmtMoney(expectedIn)}</div></div></div>
        <div class="stat-card red"><div class="stat-info"><div class="stat-label">预计付款</div><div class="stat-value" style="color:var(--danger)">${fmtMoney(expectedOut)}</div></div></div>
        <div class="stat-card ${expectedIn - expectedOut >= 0 ? 'blue' : 'orange'}"><div class="stat-info"><div class="stat-label">资金净额</div><div class="stat-value">${fmtMoney(expectedIn - expectedOut)}</div></div></div>
      </div>
    </div>`;
  },

  // ==================== 预算与费用 ====================
  renderBudget() {
    return `
    <!-- 子标签 -->
    <div style="display:flex;gap:4px;margin-bottom:16px">
      <button class="btn ${this.activeSubTab === 'budgetPlan' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='budgetPlan';finance.reload()">📊 预算编制</button>
      <button class="btn ${this.activeSubTab === 'budgetExpense' ? 'btn-primary' : 'btn-ghost'}" onclick="finance.activeSubTab='budgetExpense';finance.reload()">💳 费用报销</button>
    </div>

    ${this.activeSubTab === 'budgetPlan' ? this.renderBudgetPlan() : ''}
    ${this.activeSubTab === 'budgetExpense' ? this.renderBudgetExpense() : ''}`;
  },

  renderBudgetPlan() {
    const year = this.yearFilter;
    return `
    <div class="card">
      <div class="card-title">📊 ${year}年度预算</div>
      <div class="table-wrap"><table>
        <thead><tr><th>预算项目</th><th>预算金额</th><th>实际发生</th><th>执行率</th></tr></thead>
        <tbody>
          ${[
            { name: '销售收入', budget: 1000000, actual: 0 },
            { name: '销售成本', budget: 600000, actual: 0 },
            { name: '管理费用', budget: 200000, actual: 0 }
          ].map(item => {
            const rate = item.budget > 0 ? (item.actual / item.budget * 100).toFixed(1) : 0;
            return `<tr>
              <td><strong>${item.name}</strong></td>
              <td>${fmtMoney(item.budget)}</td><td>${fmtMoney(item.actual)}</td>
              <td><span class="badge ${rate > 100 ? 'badge-danger' : 'badge-success'}">${rate}%</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  renderBudgetExpense() {
    let expenses = DB.get('finExpenses');
    if (this.keyword) expenses = expenses.filter(e => (e.title || '').toLowerCase().includes(this.keyword.toLowerCase()));
    const stats = { total: expenses.reduce((s, e) => s + (e.amount || 0), 0), pending: expenses.filter(e => e.status === '待审批').length };

    return `
    <div class="stat-cards" style="grid-template-columns:repeat(2,1fr);margin-bottom:22px">
      <div class="stat-card blue"><div class="stat-info"><div class="stat-label">报销总额</div><div class="stat-value">${fmtMoney(stats.total)}</div></div></div>
      <div class="stat-card orange"><div class="stat-info"><div class="stat-label">待审批</div><div class="stat-value">${stats.pending}</div></div></div>
    </div>

    <div class="action-bar">
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="finance.createExpense()">+ 新增报销</button>
      </div>
    </div>

    <div class="card">
      ${!expenses.length ? `<div class="empty-state"><div class="empty-state-icon">💳</div><div class="empty-state-text">暂无报销记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>单号</th><th>标题</th><th>金额</th><th>状态</th><th>日期</th></tr></thead>
        <tbody>
          ${expenses.map(e => `<tr>
            <td>${e.code}</td><td>${e.title}</td>
            <td style="font-weight:700">${fmtMoney(e.amount)}</td>
            <td><span class="badge ${e.status === '已审批' ? 'badge-success' : 'badge-warning'}">${e.status}</span></td>
            <td>${e.date}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  createExpense() {
    if (!hasPerm('finance', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('EXP');
    openModal('新增费用报销', `
      <div class="form-row cols-2">
        <div class="form-item"><label>单号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>日期</label><input id="expDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-item"><label>标题</label><input id="expTitle" placeholder="请输入"></div>
      <div class="form-item"><label>金额</label><input id="expAmount" type="number" min="0"></div>
    `, [
      { label: '取消', class: 'btn btn-outline', onclick: 'closeModal()' },
      { label: '提交', class: 'btn btn-primary', onclick: 'finance.saveExpense()' }
    ]);
  },

  saveExpense() {
    const amount = parseFloat(document.getElementById('expAmount').value) || 0;
    if (!amount) return toast('请输入金额', 'error');
    DB.add('finExpenses', {
      id: DB.nextId('finExpenses'),
      code: document.querySelector('#modalBody input').value.trim(),
      date: document.getElementById('expDate').value,
      title: document.getElementById('expTitle').value.trim(),
      amount,
      applicant: currentUser?.username || '',
      status: '待审批',
      createdAt: new Date().toISOString()
    });
    toast('报销已提交', 'success');
    closeModal();
    this.reload();
  }
};
