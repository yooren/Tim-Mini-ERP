// ===========================
// 销售KPI管理模块
// 销售目标设定 | 业绩统计 | KPI考核
// ===========================

const salesKpi = {
  page: 1,
  pageSize: 10,
  keyword: '',
  currentMonth: new Date().toISOString().slice(0, 7),
  activeTab: 'target', // target | stats

  init() {
    document.getElementById('breadcrumb').textContent = '销售管理 / KPI考核';
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索销售人员..." value="${this.keyword}"
              oninput="salesKpi.keyword=this.value;salesKpi.page=1;salesKpi.reload()">
          </div>
          <input type="month" class="filter-select" value="${this.currentMonth}"
            onchange="salesKpi.currentMonth=this.value;salesKpi.page=1;salesKpi.reload()">
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="salesKpi.exportData()">📥 导出报表</button>
          <button class="btn btn-primary" onclick="salesKpi.openAddKpi()">🎯 设定月度目标</button>
        </div>
      </div>
      
      <!-- 子标签 -->
      <div style="margin-bottom:20px">
        <div class="tab-bar" style="display:inline-flex;background:var(--bg);padding:4px;border-radius:10px">
          <button class="tab-btn ${this.activeTab === 'target' ? 'active' : ''}" onclick="salesKpi.switchTab('target')" style="border-radius:8px">
            📊 KPI目标
          </button>
          <button class="tab-btn ${this.activeTab === 'stats' ? 'active' : ''}" onclick="salesKpi.switchTab('stats')" style="border-radius:8px">
            📈 业绩统计
          </button>
        </div>
      </div>
      
      <div id="salesKpiContent">${this.renderContent()}</div>
    </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.reload();
  },

  reload() {
    document.getElementById('pageContainer').innerHTML = this.render();
  },

  renderContent() {
    return this.activeTab === 'target' ? this.renderTargets() : this.renderStats();
  },

  // ===========================
  // 1. KPI目标管理
  // ===========================
  renderTargets() {
    const month = this.currentMonth;
    const kpis = DB.get('salesKpis') || [];
    const employees = DB.get('employees') || [];
    
    // 当月KPI
    const monthKpis = kpis.filter(k => k.period === month);
    const salesmen = this.getSalesmen();
    
    // 构建KPI卡片
    const kpiCards = salesmen.map(s => {
      const kpi = monthKpis.find(k => k.salesmanId === s.id);
      const stats = this.getSalesmanStats(s.id, month);
      
      if (this.keyword && !s.name.toLowerCase().includes(this.keyword.toLowerCase())) return null;
      
      return {
        salesman: s,
        kpi: kpi,
        stats: stats
      };
    }).filter(Boolean);

    const total = kpiCards.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = kpiCards.slice(start, start + this.pageSize);

    if (!pageData.length) {
      return `
        <div class="card" style="padding:60px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">🎯</div>
          <div style="color:var(--text-muted)">暂无销售人员数据，请先在员工档案中标记"是否为销售"</div>
        </div>`;
    }

    return `
      <div class="card" style="padding:20px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="margin:0">📊 ${month} 月度KPI目标</h3>
          <div style="font-size:13px;color:var(--text-muted)">
            共 ${salesmen.length} 名销售人员 | ${monthKpis.length} 人已设定目标
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
          ${pageData.map(item => this.renderKpiCard(item)).join('')}
        </div>
        
        ${renderPagination(total, this.page, this.pageSize, 'salesKpi.goPage')}
      </div>`;
  },

  renderKpiCard(item) {
    const { salesman, kpi, stats } = item;
    const hasKpi = kpi && kpi.targetAmount > 0;
    
    // 计算完成率
    const amountRate = hasKpi && kpi.targetAmount > 0 ? Math.min(100, Math.round(stats.amount / kpi.targetAmount * 100)) : 0;
    const ordersRate = hasKpi && kpi.targetOrders > 0 ? Math.min(100, Math.round(stats.orders / kpi.targetOrders * 100)) : 0;
    
    // 状态判断
    const statusColor = amountRate >= 100 ? '#10b981' : amountRate >= 70 ? '#3b82f6' : amountRate >= 40 ? '#f59e0b' : '#ef4444';
    const statusText = amountRate >= 100 ? '超额完成' : amountRate >= 70 ? '进展良好' : amountRate >= 40 ? '继续努力' : '严重滞后';

    return `
      <div style="background:white;border-radius:12px;padding:20px;border:1px solid var(--border)">
        <!-- 头部 -->
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px">
              ${salesman.name.slice(0, 1)}
            </div>
            <div>
              <div style="font-weight:600;font-size:15px">${salesman.name}</div>
              <div style="font-size:12px;color:var(--text-muted)">${salesman.departmentName || '未分配'} · ${salesman.position || '销售'}</div>
            </div>
          </div>
          <span style="background:${statusColor}20;color:${statusColor};padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500">
            ${statusText}
          </span>
        </div>
        
        <!-- 进度概览 -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--primary)">${fmtMoney(stats.amount)}</div>
            <div style="font-size:11px;color:var(--text-muted)">实际业绩</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:20px;font-weight:700;color:var(--text)">${fmtMoney(hasKpi ? kpi.targetAmount : 0)}</div>
            <div style="font-size:11px;color:var(--text-muted)">目标金额</div>
          </div>
        </div>
        
        <!-- 销售进度条 -->
        <div style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span style="color:var(--text-muted)">销售额完成率</span>
            <span style="font-weight:600;color:${statusColor}">${amountRate}%</span>
          </div>
          <div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden">
            <div style="width:${amountRate}%;height:100%;background:${statusColor};border-radius:4px;transition:width 0.3s"></div>
          </div>
        </div>
        
        <!-- 详情数据 -->
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);padding-top:12px;border-top:1px solid var(--border)">
          <span>订单数: ${stats.orders} / ${hasKpi ? kpi.targetOrders : 0}</span>
          <span>客户数: ${stats.customers}</span>
          <span>商品数: ${stats.items}</span>
        </div>
        
        <!-- 操作按钮 -->
        <div style="display:flex;gap:8px;margin-top:16px">
          ${hasKpi 
            ? `<button class="btn btn-outline btn-sm" onclick="salesKpi.editKpi(${kpi.id})" style="flex:1">✏️ 编辑目标</button>
               <button class="btn btn-ghost btn-sm" onclick="salesKpi.viewDetail(${salesman.id})">📋 明细</button>`
            : `<button class="btn btn-primary btn-sm" onclick="salesKpi.openAddKpi(${salesman.id})" style="flex:1">🎯 设定目标</button>`
          }
        </div>
      </div>`;
  },

  // ===========================
  // 2. 业绩统计
  // ===========================
  renderStats() {
    const month = this.currentMonth;
    const outbounds = DB.get('outbounds') || [];
    const salesmen = this.getSalesmen();
    
    // 按销售人员汇总
    const statsMap = {};
    salesmen.forEach(s => {
      statsMap[s.id] = {
        salesmanId: s.id,
        salesmanName: s.name,
        departmentName: s.departmentName,
        position: s.position,
        amount: 0,
        orders: 0,
        customers: new Set(),
        items: new Set()
      };
    });
    
    // 统计当月已审核的销售出库
    outbounds.filter(o => 
      o.status === '已审核' && 
      o.type === '销售出库' &&
      (o.date || '').startsWith(month) &&
      o.salesmanId
    ).forEach(o => {
      if (statsMap[o.salesmanId]) {
        statsMap[o.salesmanId].amount += o.total || 0;
        statsMap[o.salesmanId].orders++;
        if (o.customerId) statsMap[o.salesmanId].customers.add(o.customerId);
        if (o.goodsId) statsMap[o.salesmanId].items.add(o.goodsId);
      }
    });
    
    const statsList = Object.values(statsMap)
      .map(s => ({
        ...s,
        customers: s.customers.size,
        items: s.items.size
      }))
      .filter(s => s.orders > 0 || !this.keyword || s.salesmanName.includes(this.keyword))
      .sort((a, b) => b.amount - a.amount);
    
    const total = statsList.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = statsList.slice(start, start + this.pageSize);
    
    // 计算总计
    const totalAmount = statsList.reduce((s, x) => s + x.amount, 0);
    const totalOrders = statsList.reduce((s, x) => s + x.orders, 0);
    
    if (!pageData.length) {
      return `
        <div class="card" style="padding:60px;text-align:center">
          <div style="font-size:48px;margin-bottom:16px">📊</div>
          <div style="color:var(--text-muted)">暂无销售业绩数据</div>
        </div>`;
    }
    
    return `
      <!-- 汇总卡片 -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
        <div class="card" style="padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--primary)">${fmtMoney(totalAmount)}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">本月总业绩</div>
        </div>
        <div class="card" style="padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--secondary)">${totalOrders}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">成交订单</div>
        </div>
        <div class="card" style="padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--success)">${statsList.length}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">活跃销售</div>
        </div>
        <div class="card" style="padding:20px;text-align:center">
          <div style="font-size:28px;font-weight:700;color:var(--warning)">${totalOrders > 0 ? Math.round(totalAmount / totalOrders) : 0}</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:4px">平均单价</div>
        </div>
      </div>
      
      <!-- 业绩排行 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px">🏆 销售业绩排行</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:60px">排名</th>
                <th>销售人员</th>
                <th>部门/岗位</th>
                <th>销售额</th>
                <th>订单数</th>
                <th>客户数</th>
                <th>平均单价</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.map((s, i) => `
                <tr>
                  <td><span class="rank-mini ${i < 3 ? 'top-' + (i + 1) : ''}">${start + i + 1}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:11px">${s.salesmanName.slice(0,1)}</div>
                      <span style="font-weight:500">${s.salesmanName}</span>
                    </div>
                  </td>
                  <td style="color:var(--text-muted)">${s.departmentName || '-'} / ${s.position || '-'}</td>
                  <td style="font-weight:700;color:var(--primary)">${fmtMoney(s.amount)}</td>
                  <td>${s.orders}</td>
                  <td>${s.customers}</td>
                  <td>${s.orders > 0 ? Math.round(s.amount / s.orders) : 0}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:60px;height:6px;background:#e5e7eb;border-radius:3px">
                        <div style="width:${totalAmount > 0 ? Math.round(s.amount / totalAmount * 100) : 0}%;height:100%;background:var(--primary);border-radius:3px"></div>
                      </div>
                      <span style="font-size:12px">${totalAmount > 0 ? Math.round(s.amount / totalAmount * 100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${renderPagination(total, this.page, this.pageSize, 'salesKpi.goPage')}
      </div>`;
  },

  goPage(p) {
    this.page = p;
    this.reload();
  },

  // 获取销售员统计数据
  getSalesmanStats(salesmanId, month) {
    const outbounds = DB.get('outbounds') || [];
    const stats = { amount: 0, orders: 0, customers: new Set(), items: new Set() };
    
    outbounds.filter(o => 
      o.status === '已审核' && 
      o.type === '销售出库' &&
      (o.date || '').startsWith(month) &&
      o.salesmanId === salesmanId
    ).forEach(o => {
      stats.amount += o.total || 0;
      stats.orders++;
      if (o.customerId) stats.customers.add(o.customerId);
      if (o.goodsId) stats.items.add(o.goodsId);
    });
    
    return {
      amount: stats.amount,
      orders: stats.orders,
      customers: stats.customers.size,
      items: stats.items.size
    };
  },

  // 获取销售人员列表（兼容旧数据：isSalesman未设置时显示所有在职员工）
  getSalesmen() {
    const employees = DB.get('employees') || [];
    // 筛选：在职且（标记为销售 或 未标记任何属性（兼容旧数据））
    return employees.filter(e => e.status === 1 && (e.isSalesman === true || e.isSalesman === undefined));
  },

  // 打开设定KPI弹窗
  openAddKpi(salesmanId) {
    if (salesmanId && !hasPerm('salesKpi', 'create')) { toast('没有新建权限', 'error'); return; }
    const salesmen = this.getSalesmen();
    const month = this.currentMonth;
    
    // 如果已存在当月KPI，加载数据
    const existingKpi = salesmanId 
      ? (DB.get('salesKpis') || []).find(k => k.period === month && k.salesmanId === salesmanId)
      : null;
    
    openModal(existingKpi ? '编辑月度KPI' : '设定月度KPI目标', `
      <div style="background:var(--bg);border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-size:13px;color:var(--text-muted)">考核周期</div>
        <div style="font-size:18px;font-weight:600;color:var(--primary)">${month}</div>
      </div>
      
      <div class="form-row">
        <div class="form-item">
          <label>销售人员 *</label>
          <select id="kpiSalesman" ${existingKpi ? 'disabled' : ''} style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:${existingKpi ? 'var(--bg)' : 'white'}">
            ${!existingKpi ? `<option value="">-- 请选择 --</option>` : ''}
            ${salesmen.map(e => {
              const isExisting = (DB.get('salesKpis') || []).some(k => k.period === month && k.salesmanId === e.id);
              if (!existingKpi && isExisting) return ''; // 隐藏已设定的
              return `<option value="${e.id}" ${existingKpi && existingKpi.salesmanId === e.id ? 'selected' : ''}>
                ${e.name} - ${e.departmentName || '未分配'}
              </option>`;
            }).join('')}
          </select>
          ${existingKpi ? '<input type="hidden" id="kpiSalesman" value="' + existingKpi.salesmanId + '">' : ''}
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="form-item">
          <label>💰 目标销售额 (¥)</label>
          <input id="kpiTargetAmount" type="number" min="0" step="100" value="${existingKpi ? existingKpi.targetAmount : ''}" placeholder="月度销售目标金额">
        </div>
        <div class="form-item">
          <label>📋 目标订单数</label>
          <input id="kpiTargetOrders" type="number" min="0" value="${existingKpi ? existingKpi.targetOrders : ''}" placeholder="月度订单目标数量">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-item">
          <label>📝 备注说明</label>
          <textarea id="kpiNote" rows="2" placeholder="考核说明、激励政策等">${existingKpi ? existingKpi.note || '' : ''}</textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="salesKpi.saveKpi(${existingKpi ? existingKpi.id : 'null'})">
        ${existingKpi ? '保存修改' : '确认设定'}
      </button>
    `);
  },

  editKpi(kpiId) {
    if (!hasPerm('salesKpi', 'edit')) { toast('没有编辑权限', 'error'); return; }
    this.openAddKpi(null);
    // 延迟填充数据
    setTimeout(() => {
      const kpi = DB.findById('salesKpis', kpiId);
      if (kpi) {
        document.getElementById('kpiSalesman').value = kpi.salesmanId;
        document.getElementById('kpiTargetAmount').value = kpi.targetAmount;
        document.getElementById('kpiTargetOrders').value = kpi.targetOrders;
        document.getElementById('kpiNote').value = kpi.note || '';
      }
    }, 100);
  },

  saveKpi(existingId) {
    const salesmanId = parseInt(document.getElementById('kpiSalesman').value);
    if (!salesmanId) { toast('请选择销售人员', 'error'); return; }
    
    const targetAmount = parseFloat(document.getElementById('kpiTargetAmount').value) || 0;
    const targetOrders = parseInt(document.getElementById('kpiTargetOrders').value) || 0;
    const note = document.getElementById('kpiNote').value.trim();
    const month = this.currentMonth;
    
    const salesman = DB.findById('employees', salesmanId);
    
    if (existingId) {
      // 更新
      DB.update('salesKpis', existingId, {
        targetAmount, targetOrders, note
      });
      toast('KPI目标已更新', 'success');
    } else {
      // 新增
      DB.add('salesKpis', {
        period: month,
        salesmanId,
        salesmanName: salesman?.name || '未知',
        departmentId: salesman?.departmentId || null,
        departmentName: salesman?.departmentName || '',
        targetAmount,
        targetOrders,
        note,
        createdAt: new Date().toISOString()
      });
      toast('KPI目标已设定', 'success');
    }
    
    closeModal();
    this.reload();
  },

  viewDetail(salesmanId) {
    const month = this.currentMonth;
    const salesman = DB.findById('employees', salesmanId);
    const outbounds = DB.get('outbounds') || [];
    const kpi = (DB.get('salesKpis') || []).find(k => k.period === month && k.salesmanId === salesmanId);
    
    // 当月销售明细
    const detailList = outbounds.filter(o => 
      o.status === '已审核' && 
      o.type === '销售出库' &&
      (o.date || '').startsWith(month) &&
      o.salesmanId === salesmanId
    ).sort((a, b) => b.date.localeCompare(a.date));
    
    openModal(`${salesman?.name || '未知'} - 销售明细`, `
      <div style="margin-bottom:20px">
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:var(--primary)">${fmtMoney(detailList.reduce((s, o) => s + (o.total || 0), 0))}</div>
            <div style="font-size:11px;color:var(--text-muted)">销售额</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:18px;font-weight:700">${detailList.length}</div>
            <div style="font-size:11px;color:var(--text-muted)">订单数</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:var(--success)">${kpi ? kpi.targetAmount : 0}</div>
            <div style="font-size:11px;color:var(--text-muted)">目标</div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:${detailList.reduce((s, o) => s + (o.total || 0), 0) >= (kpi?.targetAmount || 0) ? 'var(--success)' : 'var(--danger)'}">
              ${kpi?.targetAmount > 0 ? Math.round(detailList.reduce((s, o) => s + (o.total || 0), 0) / kpi.targetAmount * 100) : 0}%
            </div>
            <div style="font-size:11px;color:var(--text-muted)">完成率</div>
          </div>
        </div>
      </div>
      
      <div class="table-wrap" style="max-height:400px;overflow-y:auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>单号</th>
              <th>日期</th>
              <th>商品</th>
              <th>客户</th>
              <th>数量</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            ${detailList.length === 0 
              ? `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">暂无销售记录</td></tr>`
              : detailList.map(o => `
                <tr>
                  <td><span style="font-size:12px;color:var(--danger);font-family:monospace">${o.code}</span></td>
                  <td style="font-size:12px">${o.date}</td>
                  <td>${o.goodsName}</td>
                  <td>${o.customerName || '-'}</td>
                  <td>${o.qty}</td>
                  <td style="font-weight:600;color:var(--primary)">${fmtMoney(o.total)}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  exportData() {
    if (!hasPerm('salesKpi', 'export')) { toast('没有导出权限', 'error'); return; }
    const month = this.currentMonth;
    const kpis = DB.get('salesKpis') || [];
    const outbounds = DB.get('outbounds') || [];
    const employees = DB.get('employees') || [];
    const salesmen = employees.filter(e => e.status === 1 && e.isSalesman);
    
    let csv = '\uFEFF销售人员,部门,目标销售额,目标订单数,实际销售额,实际订单数,完成率\n';
    
    salesmen.forEach(s => {
      const kpi = kpis.find(k => k.period === month && k.salesmanId === s.id);
      const stats = this.getSalesmanStats(s.id, month);
      const rate = kpi?.targetAmount > 0 ? Math.round(stats.amount / kpi.targetAmount * 100) : 0;
      
      csv += `${s.name},${s.departmentName || ''},${kpi?.targetAmount || 0},${kpi?.targetOrders || 0},${stats.amount},${stats.orders},${rate}%\n`;
    });
    
    downloadCSV(csv, `销售KPI_${month}.csv`);
    toast('KPI报表已导出', 'success');
  }
};

// 辅助函数
function fmtMoney(amount) {
  if (!amount && amount !== 0) return '-';
  return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
