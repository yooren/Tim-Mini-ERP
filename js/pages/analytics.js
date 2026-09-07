// ===========================
// 智能仓储分析中心
// 销售分析 | 业绩考核 | 信用管控
// ===========================

const analytics = {
  activeTab: 'sales', // sales | performance | credit
  currentMonth: new Date().toISOString().slice(0, 7),
  
  init() {
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },
  render() { this.updateBreadcrumb(); return this.getLayout(); },
  reload() { document.getElementById('pageContainer').innerHTML = this.getLayout(); },
  
  updateBreadcrumb() {
    const titles = { sales: '销售分析', performance: '业绩考核', credit: '信用管控' };
    document.getElementById('breadcrumb').textContent = `数据分析中心 / ${titles[this.activeTab]}`;
  },
  
  getLayout() {
    return `
    <div class="analytics-page" style="animation:fadeIn 0.5s ease">
      <!-- 顶部标签切换 -->
      <div class="analytics-header">
        <div class="analytics-tabs">
          <button class="analytics-tab ${this.activeTab === 'sales' ? 'active' : ''}" onclick="analytics.switchTab('sales')">
            <span class="tab-icon">📊</span>
            <span class="tab-label">销售分析</span>
          </button>
          <button class="analytics-tab ${this.activeTab === 'performance' ? 'active' : ''}" onclick="analytics.switchTab('performance')">
            <span class="tab-icon">🎯</span>
            <span class="tab-label">业绩考核</span>
          </button>
          <button class="analytics-tab ${this.activeTab === 'credit' ? 'active' : ''}" onclick="analytics.switchTab('credit')">
            <span class="tab-icon">🛡️</span>
            <span class="tab-label">信用管控</span>
          </button>
        </div>
        <div class="analytics-filter">
          <input type="month" class="filter-input" value="${this.currentMonth}" onchange="analytics.currentMonth=this.value;analytics.reload()">
        </div>
      </div>
      
      <!-- 内容区 -->
      <div id="analyticsContent">${this.renderContent()}</div>
    </div>`;
  },
  
  switchTab(tab) {
    this.activeTab = tab;
    this.reload();
  },
  
  renderContent() {
    switch (this.activeTab) {
      case 'sales': return this.renderSales();
      case 'performance': return this.renderPerformance();
      case 'credit': return this.renderCredit();
      default: return '';
    }
  },
  
  // ===========================
  // 1. 销售分析
  // ===========================
  renderSales() {
    const month = this.currentMonth;
    const outbounds = DB.get('outbounds') || [];
    const customers = DB.get('customers') || [];
    const goods = DB.get('goods') || [];
    
    // 本月销售数据（只统计销售出库和设备出库）
    const monthOut = outbounds.filter(o => (o.status === '已审核' || o.status === '已完成') && (!o.type || ['销售出库','设备出库'].includes(o.type)) && (o.date || '').startsWith(month));
    const totalRevenue = monthOut.reduce((s, o) => s + (o.total || 0), 0);
    const totalOrders = monthOut.length;
    const totalQuantity = monthOut.reduce((s, o) => s + (o.qty || 0), 0);
    
    // 客户销售排行
    const customerSales = {};
    monthOut.forEach(o => {
      const cid = o.customerId || o.customerName;
      if (!customerSales[cid]) {
        customerSales[cid] = { name: o.customerName, amount: 0, orders: 0, quantity: 0 };
      }
      customerSales[cid].amount += o.total || 0;
      customerSales[cid].orders++;
      customerSales[cid].quantity += o.qty || 0;
    });
    const topCustomers = Object.values(customerSales).sort((a, b) => b.amount - a.amount).slice(0, 10);
    
    // 商品销售排行（按goodsName汇总）
    const productSales = {};
    monthOut.forEach(o => {
      const pid = o.goodsId || o.goodsName;
      if (!productSales[pid]) {
        productSales[pid] = { name: o.goodsName, amount: 0, quantity: 0 };
      }
      productSales[pid].amount += o.total || 0;
      productSales[pid].quantity += o.qty || 0;
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.amount - a.amount).slice(0, 10);
    
    // 销售趋势（近6个月）
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const [y, m] = month.split('-').map(Number);
      let targetMonth = m - i;
      let targetYear = y;
      if (targetMonth <= 0) { targetMonth += 12; targetYear--; }
      const tm = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const tmData = outbounds.filter(o => (o.status === '已审核' || o.status === '已完成') && (!o.type || ['销售出库','设备出库'].includes(o.type)) && (o.date || '').startsWith(tm));
      trendData.push({
        month: tm,
        amount: tmData.reduce((s, o) => s + (o.total || 0), 0),
        orders: tmData.length
      });
    }
    const maxAmount = Math.max(...trendData.map(t => t.amount), 1);
    
    // 销售类型分布（所有出库类型）
    const typeStats = {};
    outbounds.filter(o => (o.status === '已审核' || o.status === '已完成') && (o.date || '').startsWith(month)).forEach(o => {
      const type = o.type || '销售出库';
      if (!typeStats[type]) typeStats[type] = { amount: 0, count: 0 };
      typeStats[type].amount += o.total || 0;
      typeStats[type].count++;
    });
    
    return `
      <!-- 核心指标卡片 -->
      <div class="analytics-kpi-row">
        <div class="analytics-kpi-card primary">
          <div class="kpi-icon">💰</div>
          <div class="kpi-content">
            <div class="kpi-value">${fmtMoney(totalRevenue)}</div>
            <div class="kpi-label">本月销售收入</div>
          </div>
          <div class="kpi-trend up">↑ ${totalOrders} 笔订单</div>
        </div>
        <div class="analytics-kpi-card success">
          <div class="kpi-icon">📦</div>
          <div class="kpi-content">
            <div class="kpi-value">${totalQuantity}</div>
            <div class="kpi-label">本月销售数量</div>
          </div>
        </div>
        <div class="analytics-kpi-card warning">
          <div class="kpi-icon">👥</div>
          <div class="kpi-content">
            <div class="kpi-value">${Object.keys(customerSales).length}</div>
            <div class="kpi-label">成交客户数</div>
          </div>
        </div>
        <div class="analytics-kpi-card info">
          <div class="kpi-icon">🛒</div>
          <div class="kpi-content">
            <div class="kpi-value">${totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0}</div>
            <div class="kpi-label">客单价(元)</div>
          </div>
        </div>
      </div>
      
      <!-- 图表区域 -->
      <div class="analytics-grid-2">
        <!-- 销售趋势 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>📈 销售趋势（近6个月）</h3>
            <div class="card-actions">
              <button class="btn btn-ghost btn-sm" onclick="analytics.exportSalesTrend()">📥 导出</button>
            </div>
          </div>
          <div class="chart-container">
            <div class="bar-chart">
              ${trendData.map(t => `
                <div class="bar-item">
                  <div class="bar-wrapper">
                    <div class="bar" style="height:${(t.amount / maxAmount * 100).toFixed(1)}%">
                      <span class="bar-value">${fmtMoney(t.amount)}</span>
                    </div>
                  </div>
                  <div class="bar-label">${t.month.slice(5)}月</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <!-- 销售构成 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>🥧 销售类型分布</h3>
          </div>
          <div class="pie-container">
            <div class="pie-chart" style="--p1:${totalRevenue > 0 ? Math.round((typeStats['销售出库']?.amount || 0) / totalRevenue * 100) : 0}%;--p2:${totalRevenue > 0 ? Math.round((typeStats['员工领取']?.amount || 0) / totalRevenue * 100) : 0}%;--p3:${totalRevenue > 0 ? Math.round((typeStats['部门领取']?.amount || 0) / totalRevenue * 100) : 0}%">
              <div class="pie-inner">
                <div class="pie-center-text">
                  <div class="pie-total">${fmtMoney(totalRevenue)}</div>
                  <div class="pie-subtext">总销售额</div>
                </div>
              </div>
            </div>
            <div class="pie-legend">
              <div class="legend-item"><span class="legend-dot" style="background:#6366f1"></span>销售出库 ${typeStats['销售出库']?.count || 0}笔</div>
              <div class="legend-item"><span class="legend-dot" style="background:#10b981"></span>员工领取 ${typeStats['员工领取']?.count || 0}笔</div>
              <div class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span>部门领取 ${typeStats['部门领取']?.count || 0}笔</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 排行榜 -->
      <div class="analytics-grid-2">
        <!-- 客户销售排行 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>🏆 客户销售排行 TOP10</h3>
          </div>
          <div class="rank-list">
            ${topCustomers.length === 0 ? '<div class="empty-hint">暂无销售数据</div>' : topCustomers.map((c, i) => `
              <div class="rank-item">
                <div class="rank-badge ${i < 3 ? 'top-' + (i + 1) : ''}">${i + 1}</div>
                <div class="rank-info">
                  <div class="rank-name">${c.name}</div>
                  <div class="rank-meta">${c.orders} 笔订单 · ${c.quantity} 件</div>
                </div>
                <div class="rank-value">${fmtMoney(c.amount)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <!-- 商品销售排行 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>🔥 商品销售排行 TOP10</h3>
          </div>
          <div class="rank-list">
            ${topProducts.length === 0 ? '<div class="empty-hint">暂无销售数据</div>' : topProducts.map((p, i) => `
              <div class="rank-item">
                <div class="rank-badge ${i < 3 ? 'top-' + (i + 1) : ''}">${i + 1}</div>
                <div class="rank-info">
                  <div class="rank-name">${p.name}</div>
                  <div class="rank-meta">${p.quantity} 件</div>
                </div>
                <div class="rank-value">${fmtMoney(p.amount)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },
  
  exportSalesTrend() {
    if (!hasPerm('analytics', 'export')) { toast('没有导出权限', 'error'); return; }
    const outbounds = DB.get('outbounds') || [];
    let csv = '\uFEFF月份,销售笔数,销售收入\n';
    for (let i = 5; i >= 0; i--) {
      const [y, m] = this.currentMonth.split('-').map(Number);
      let tm = m - i, ty = y;
      if (tm <= 0) { tm += 12; ty--; }
      const monthStr = `${ty}-${String(tm).padStart(2, '0')}`;
      const data = outbounds.filter(o => (o.status === '已审核' || o.status === '已完成') && (o.date || '').startsWith(monthStr));
      csv += `${monthStr},${data.length},${data.reduce((s, o) => s + (o.total || 0), 0)}\n`;
    }
    downloadCSV(csv, `销售趋势_${this.currentMonth}.csv`);
    toast('趋势数据已导出', 'success');
  },
  
  // ===========================
  // 2. 业绩考核
  // ===========================
  renderPerformance() {
    const assessments = DB.get('assessments') || [];
    const employees = DB.get('employees') || [];
    const month = this.currentMonth;
    
    // 绩效统计
    const totalAssessments = assessments.length;
    const completedAssessments = assessments.filter(a => a.status === '已完成').length;
    const avgScore = assessments.filter(a => a.finalScore).reduce((s, a) => s + a.finalScore, 0) / (assessments.filter(a => a.finalScore).length || 1);
    
    // 等级分布
    const gradeDist = { A: 0, B: 0, C: 0, D: 0 };
    assessments.filter(a => a.grade).forEach(a => { if (gradeDist[a.grade] !== undefined) gradeDist[a.grade]++; });
    
    // 部门绩效
    const deptPerf = {};
    assessments.filter(a => a.finalScore).forEach(a => {
      const dept = a.departmentName || '未分配';
      if (!deptPerf[dept]) { deptPerf[dept] = { total: 0, count: 0, scores: [] }; }
      deptPerf[dept].total += a.finalScore;
      deptPerf[dept].count++;
      deptPerf[dept].scores.push(a.finalScore);
    });
    const topDepts = Object.entries(deptPerf)
      .map(([name, d]) => ({ name, avg: d.total / d.count, count: d.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    
    // 员工绩效排行
    const topEmployees = assessments
      .filter(a => a.finalScore && a.status === '已完成')
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
      .slice(0, 10);
    
    return `
      <!-- 核心指标 -->
      <div class="analytics-kpi-row">
        <div class="analytics-kpi-card primary">
          <div class="kpi-icon">📋</div>
          <div class="kpi-content">
            <div class="kpi-value">${totalAssessments}</div>
            <div class="kpi-label">考核总数</div>
          </div>
        </div>
        <div class="analytics-kpi-card success">
          <div class="kpi-icon">✅</div>
          <div class="kpi-content">
            <div class="kpi-value">${completedAssessments}</div>
            <div class="kpi-label">已完成</div>
          </div>
        </div>
        <div class="analytics-kpi-card warning">
          <div class="kpi-icon">⭐</div>
          <div class="kpi-content">
            <div class="kpi-value">${avgScore.toFixed(1)}</div>
            <div class="kpi-label">平均得分</div>
          </div>
        </div>
        <div class="analytics-kpi-card info">
          <div class="kpi-icon">🎯</div>
          <div class="kpi-content">
            <div class="kpi-value">${completedAssessments > 0 ? Math.round(completedAssessments / totalAssessments * 100) : 0}%</div>
            <div class="kpi-label">完成率</div>
          </div>
        </div>
      </div>
      
      <!-- 图表区域 -->
      <div class="analytics-grid-2">
        <!-- 等级分布 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>📊 绩效等级分布</h3>
          </div>
          <div class="grade-dist">
            ${['A', 'B', 'C', 'D'].map(g => {
              const colors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
              const labels = { A: '优秀(≥90)', B: '良好(≥75)', C: '合格(≥60)', D: '待改进(<60)' };
              const pct = totalAssessments > 0 ? Math.round(gradeDist[g] / totalAssessments * 100) : 0;
              return `
                <div class="grade-item">
                  <div class="grade-badge" style="background:${colors[g]}">${g}</div>
                  <div class="grade-info">
                    <div class="grade-label">${labels[g]}</div>
                    <div class="grade-bar-wrap">
                      <div class="grade-bar" style="width:${pct}%;background:${colors[g]}"></div>
                    </div>
                  </div>
                  <div class="grade-count">${gradeDist[g]}人</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
        
        <!-- 部门绩效排行 -->
        <div class="analytics-card">
          <div class="card-header">
            <h3>🏢 部门绩效排行</h3>
          </div>
          <div class="rank-list">
            ${topDepts.length === 0 ? '<div class="empty-hint">暂无考核数据</div>' : topDepts.map((d, i) => `
              <div class="rank-item">
                <div class="rank-badge ${i < 3 ? 'top-' + (i + 1) : ''}">${i + 1}</div>
                <div class="rank-info">
                  <div class="rank-name">${d.name}</div>
                  <div class="rank-meta">${d.count} 人参与考核</div>
                </div>
                <div class="rank-value" style="color:${d.avg >= 90 ? '#10b981' : d.avg >= 75 ? '#3b82f6' : '#f59e0b'}">${d.avg.toFixed(1)}分</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- 员工绩效排行 -->
      <div class="analytics-card">
        <div class="card-header">
          <h3>👑 员工绩效排行 TOP10</h3>
          <div class="card-actions">
            <button class="btn btn-primary btn-sm" onclick="analytics.openNewAssessment()">🎯 新增考核</button>
            <button class="btn btn-ghost btn-sm" onclick="analytics.exportPerformance()">📥 导出</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>员工姓名</th>
                <th>部门</th>
                <th>考核周期</th>
                <th>考核类型</th>
                <th>综合得分</th>
                <th>等级</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${topEmployees.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px">暂无考核数据</td></tr>` : topEmployees.map((a, i) => {
                const gradeColors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
                return `
                  <tr>
                    <td><span class="rank-mini ${i < 3 ? 'top-' + (i + 1) : ''}">${i + 1}</span></td>
                    <td><span style="font-weight:600">${a.name}</span></td>
                    <td>${a.departmentName || '-'}</td>
                    <td>${a.period}</td>
                    <td><span class="badge">${a.type}</span></td>
                    <td><span style="font-weight:700;color:var(--primary)">${a.finalScore}</span></td>
                    <td><span style="font-weight:700;color:${gradeColors[a.grade]};font-size:16px">${a.grade}</span></td>
                    <td><span class="badge badge-success">${a.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  
  openNewAssessment() {
    if (!hasPerm('analytics', 'create')) { toast('没有新建权限', 'error'); return; }
    // 读取销售人员（isSalesman=true 或 departmentName 含"销售"）
    const empList = DB.get('employees') || [];
    let salesmen = empList.filter(e => e.status === 1 && (e.isSalesman || (e.departmentName || '').includes('销售')));
    if (!salesmen.length) {
      const hrFileList = DB.get('hrFiles') || [];
      salesmen = hrFileList.filter(f => f.status === 1 && (f.isSalesman || (f.departmentName || '').includes('销售')))
        .map(f => ({ id: f.id, name: f.name, position: f.position || '', departmentName: f.departmentName || '' }));
    }
    openModal('发起绩效考核', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>被考核人（销售人员）*</label>
          <select id="perfEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">-- 请选择 --</option>
            ${salesmen.map(e => `<option value="${e.id}" data-name="${e.name}" data-dept="${e.departmentId}" data-deptname="${e.departmentName || ''}">${e.name} ${e.position ? '(' + e.position + ')' : ''} - ${e.departmentName || '未分配'}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>考核周期</label>
          <input id="perfPeriod" type="month" value="${this.currentMonth}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>考核类型</label>
          <select id="perfType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="KPI">KPI</option>
            <option value="OKR">OKR</option>
            <option value="360度">360度评估</option>
          </select>
        </div>
        <div class="form-item">
          <label>考核分数</label>
          <input id="perfScore" type="number" min="0" max="100" placeholder="0-100">
        </div>
      </div>
      <div class="form-row cols-2" style="background:rgba(99,102,241,0.06);border-radius:8px;padding:10px;margin-bottom:12px">
        <div class="form-item">
          <label>📊 KPI目标销售额（元）</label>
          <input id="perfTargetAmount" type="number" min="0" step="100" placeholder="如: 50000">
        </div>
        <div class="form-item">
          <label>📋 KPI目标订单数</label>
          <input id="perfTargetOrders" type="number" min="0" placeholder="如: 20">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>考核说明</label><textarea id="perfNote" rows="3" placeholder="考核内容说明"></textarea></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="analytics.saveAssessment()">提交</button>
    `);
  },
  
  saveAssessment() {
    const empId = parseInt(document.getElementById('perfEmp').value);
    if (!empId) { toast('请选择销售人员', 'error'); return; }
    const opt = document.getElementById('perfEmp').options[document.getElementById('perfEmp').selectedIndex];
    const score = parseFloat(document.getElementById('perfScore').value) || 0;
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
    const targetAmount = parseFloat(document.getElementById('perfTargetAmount')?.value) || 0;
    const targetOrders = parseInt(document.getElementById('perfTargetOrders')?.value) || 0;
    
    DB.add('assessments', {
      code: DB.genCode('ASM'),
      period: document.getElementById('perfPeriod').value,
      employeeId: empId,
      name: opt.dataset.name,
      departmentId: parseInt(opt.dataset.dept) || null,
      departmentName: opt.dataset.deptname,
      type: document.getElementById('perfType').value,
      targetAmount,
      targetOrders,
      selfScore: score,
      selfContent: document.getElementById('perfNote').value,
      managerScore: score,
      managerContent: document.getElementById('perfNote').value,
      finalScore: score,
      grade,
      status: '已完成',
      createdAt: new Date().toISOString()
    });
    
    closeModal();
    toast('考核已添加');
    this.reload();
  },
  
  exportPerformance() {
    if (!hasPerm('analytics', 'export')) { toast('没有导出权限', 'error'); return; }
    const assessments = DB.get('assessments') || [];
    let csv = '\uFEFF考核编号,周期,员工,部门,类型,自评,上级评分,综合得分,等级,状态\n';
    assessments.forEach(a => {
      csv += `${a.code},${a.period},${a.name},${a.departmentName || ''},${a.type},${a.selfScore || ''},${a.managerScore || ''},${a.finalScore || ''},${a.grade || ''},${a.status}\n`;
    });
    downloadCSV(csv, `绩效考核_${this.currentMonth}.csv`);
    toast('考核数据已导出', 'success');
  },
  
  // ===========================
  // 3. 信用管控
  // ===========================
  renderCredit() {
    const customers = DB.get('customers') || [];
    const suppliers = DB.get('suppliers') || [];
    const orders = DB.get('outbounds') || [];
    const month = this.currentMonth;
    
    // 客户信用统计
    let overdueCustomers = 0;
    let lowCreditCustomers = 0;
    const customerCredits = customers.map(c => {
      const cOrders = orders.filter(o => o.customerId === c.id && (o.status === '已审核' || o.status === '已完成'));
      const totalAmount = cOrders.reduce((s, o) => s + (o.total || 0), 0);
      const orderCount = cOrders.length;
      // 计算信用评分（基于欠款、逾期次数等）
      const overdueDays = c.overdueDays || 0;
      const creditScore = Math.max(0, Math.min(100, 100 - overdueDays * 2 - (c.overdueCount || 0) * 5));
      const creditLevel = creditScore >= 80 ? 'A' : creditScore >= 60 ? 'B' : creditScore >= 40 ? 'C' : 'D';
      
      if (overdueDays > 30) overdueCustomers++;
      if (creditScore < 60) lowCreditCustomers++;
      
      return { ...c, creditScore, creditLevel, totalAmount, orderCount };
    });
    
    // 供应商信用统计
    const supplierCredits = suppliers.filter(s => s.status === 1).map(s => {
      const ratings = [5, 4, 3, 2, 1];
      const score = s.rating || 3;
      const level = score >= 4.5 ? 'A' : score >= 3.5 ? 'B' : score >= 2.5 ? 'C' : 'D';
      return { ...s, score, level };
    });
    
    // 信用预警
    const creditWarnings = [
      ...customerCredits.filter(c => c.creditScore < 60).map(c => ({ type: '客户', name: c.name, level: 'warning', reason: `信用评分${c.creditScore}分` })),
      ...customerCredits.filter(c => (c.overdueDays || 0) > 30).map(c => ({ type: '客户', name: c.name, level: 'danger', reason: `逾期${c.overdueDays}天` })),
      ...supplierCredits.filter(s => s.level === 'D').map(s => ({ type: '供应商', name: s.name, level: 'warning', reason: `评分${s.score}分` }))
    ];
    
    return `
      <!-- 核心指标 -->
      <div class="analytics-kpi-row">
        <div class="analytics-kpi-card primary">
          <div class="kpi-icon">👥</div>
          <div class="kpi-content">
            <div class="kpi-value">${customers.length}</div>
            <div class="kpi-label">客户总数</div>
          </div>
        </div>
        <div class="analytics-kpi-card danger">
          <div class="kpi-icon">⚠️</div>
          <div class="kpi-content">
            <div class="kpi-value">${overdueCustomers}</div>
            <div class="kpi-label">逾期客户</div>
          </div>
        </div>
        <div class="analytics-kpi-card warning">
          <div class="kpi-icon">🛡️</div>
          <div class="kpi-content">
            <div class="kpi-value">${lowCreditCustomers}</div>
            <div class="kpi-label">低信用客户</div>
          </div>
        </div>
        <div class="analytics-kpi-card success">
          <div class="kpi-icon">✅</div>
          <div class="kpi-content">
            <div class="kpi-value">${customerCredits.filter(c => c.creditLevel === 'A').length}</div>
            <div class="kpi-label">优质客户(A级)</div>
          </div>
        </div>
      </div>
      
      <!-- 预警区域 -->
      ${creditWarnings.length > 0 ? `
        <div class="credit-alert-panel">
          <div class="alert-header">
            <span class="alert-icon">🚨</span>
            <span class="alert-title">信用预警 (${creditWarnings.length})</span>
          </div>
          <div class="alert-list">
            ${creditWarnings.map(w => `
              <div class="alert-item ${w.level}">
                <div class="alert-type">${w.type}</div>
                <div class="alert-name">${w.name}</div>
                <div class="alert-reason">${w.reason}</div>
                <button class="btn btn-outline btn-sm" onclick="analytics.handleCreditAlert('${w.type}', ${w.name})">处理</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- 客户信用管理 -->
      <div class="analytics-card">
        <div class="card-header">
          <h3>👥 客户信用评级</h3>
          <div class="card-actions">
            <button class="btn btn-primary btn-sm" onclick="analytics.openAddCustomer()">➕ 添加客户</button>
            <button class="btn btn-ghost btn-sm" onclick="analytics.exportCredit()">📥 导出</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>客户名称</th>
                <th>联系人</th>
                <th>联系电话</th>
                <th>累计交易</th>
                <th>交易次数</th>
                <th>信用评分</th>
                <th>信用等级</th>
                <th>逾期天数</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${customerCredits.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无客户数据</td></tr>` : customerCredits.map(c => {
                const levelColors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
                return `
                  <tr class="${(c.overdueDays || 0) > 30 ? 'row-danger' : c.creditScore < 60 ? 'row-warning' : ''}">
                    <td><span style="font-weight:600">${c.name}</span></td>
                    <td>${c.contact || '-'}</td>
                    <td>${c.phone || '-'}</td>
                    <td style="font-weight:600;color:var(--primary)">${fmtMoney(c.total)}</td>
                    <td>${c.orderCount} 笔</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div class="credit-bar" style="width:60px;height:6px;background:#e5e7eb;border-radius:3px">
                          <div style="width:${c.creditScore}%;height:100%;background:${levelColors[c.creditLevel]};border-radius:3px"></div>
                        </div>
                        <span style="font-weight:600">${c.creditScore}</span>
                      </div>
                    </td>
                    <td><span class="grade-tag" style="background:${levelColors[c.creditLevel]};color:white">${c.creditLevel}</span></td>
                    <td style="color:${(c.overdueDays || 0) > 30 ? '#ef4444' : 'inherit'}">${c.overdueDays || 0} 天</td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="analytics.editCustomerCredit(${c.id})">调整</button>
                      <button class="btn btn-outline btn-sm" onclick="analytics.viewCustomerHistory(${c.id})">明细</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- 供应商信用 -->
      <div class="analytics-card">
        <div class="card-header">
          <h3>🏢 供应商信用评级</h3>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>供应商</th>
                <th>联系人</th>
                <th>联系电话</th>
                <th>主营分类</th>
                <th>合作评分</th>
                <th>信用等级</th>
                <th>合作状态</th>
              </tr>
            </thead>
            <tbody>
              ${supplierCredits.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">暂无供应商数据</td></tr>` : supplierCredits.map(s => {
                const levelColors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };
                return `
                  <tr>
                    <td><span style="font-weight:600">${s.name}</span></td>
                    <td>${s.contact || '-'}</td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.categories || '-'}</td>
                    <td>
                      <div style="display:flex;gap:2px">
                        ${[1,2,3,4,5].map(i => `<span style="color:${i <= s.score ? '#f59e0b' : '#e5e7eb'}">★</span>`).join('')}
                        <span style="margin-left:4px;color:var(--text-muted)">${s.score}</span>
                      </div>
                    </td>
                    <td><span class="grade-tag" style="background:${levelColors[s.level]};color:white">${s.level}</span></td>
                    <td><span class="badge ${s.status ? 'badge-success' : 'badge-default'}">${s.status ? '合作中' : '已停用'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  
  editCustomerCredit(id) {
    if (!hasPerm('analytics', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c = DB.findById('customers', id);
    if (!c) return;
    
    openModal('调整客户信用', `
      <div style="padding:8px 0">
        <div style="font-weight:600;margin-bottom:16px">${c.name}</div>
        <div class="form-row cols-2">
          <div class="form-item">
            <label>逾期天数</label>
            <input id="ccOverdueDays" type="number" min="0" value="${c.overdueDays || 0}">
          </div>
          <div class="form-item">
            <label>逾期次数</label>
            <input id="ccOverdueCount" type="number" min="0" value="${c.overdueCount || 0}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-item">
            <label>信用备注</label>
            <textarea id="ccNote" rows="2" placeholder="记录信用调整原因">${c.creditNote || ''}</textarea>
          </div>
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="analytics.saveCustomerCredit(${id})">保存</button>
    `);
  },
  
  saveCustomerCredit(id) {
    DB.update('customers', id, {
      overdueDays: parseInt(document.getElementById('ccOverdueDays').value) || 0,
      overdueCount: parseInt(document.getElementById('ccOverdueCount').value) || 0,
      creditNote: document.getElementById('ccNote').value.trim()
    });
    closeModal();
    toast('信用信息已更新');
    this.reload();
  },
  
  viewCustomerHistory(id) {
    const c = DB.findById('customers', id);
    if (!c) return;
    
    const orders = DB.get('outbounds')?.filter(o => o.customerId === id && (o.status === '已审核' || o.status === '已完成')) || [];
    
    openModal(`交易明细 - ${c.name}`, `
      <div style="max-height:60vh;overflow-y:auto">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
          <div class="stat-mini">
            <div class="stat-mini-label">累计交易</div>
            <div class="stat-mini-value">${fmtMoney(orders.reduce((s, o) => s + (o.total || 0), 0))}</div>
          </div>
          <div class="stat-mini">
            <div class="stat-mini-label">订单数量</div>
            <div class="stat-mini-value">${orders.length} 笔</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>订单号</th><th>日期</th><th>金额</th><th>类型</th><th>状态</th></tr></thead>
            <tbody>
              ${orders.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">暂无交易记录</td></tr>` : orders.map(o => `
                <tr>
                  <td><span style="font-family:monospace">${o.code}</span></td>
                  <td>${o.date}</td>
                  <td style="font-weight:600">${fmtMoney(o.total || 0)}</td>
                  <td>${o.type || '销售出库'}</td>
                  <td><span class="badge badge-success">${o.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },
  
  openAddCustomer() {
    if (!hasPerm('analytics', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('添加客户', `
      <div class="form-row">
        <div class="form-item"><label>客户名称 *</label><input id="custName" placeholder="公司/个人名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系人</label><input id="custContact" placeholder="联系人"></div>
        <div class="form-item"><label>电话</label><input id="custPhone" placeholder="联系电话"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>地址</label><input id="custAddress" placeholder="地址"></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="analytics.saveCustomer()">保存</button>
    `);
  },
  
  saveCustomer() {
    const name = document.getElementById('custName').value.trim();
    if (!name) { toast('请输入客户名称', 'error'); return; }
    
    DB.add('customers', {
      name, contact: document.getElementById('custContact').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      address: document.getElementById('custAddress').value.trim(),
      status: 1, creditScore: 100, overdueDays: 0, overdueCount: 0,
      createdAt: new Date().toISOString()
    });
    
    closeModal();
    toast('客户已添加');
    this.reload();
  },
  
  handleCreditAlert(type, name) {
    toast(`${type} "${name}" 预警已处理`, 'success');
  },
  
  exportCredit() {
    if (!hasPerm('analytics', 'export')) { toast('没有导出权限', 'error'); return; }
    const customers = DB.get('customers') || [];
    let csv = '\uFEFF客户名称,联系人,电话,累计交易,交易次数,信用评分,信用等级,逾期天数\n';
    customers.forEach(c => {
      const orders = DB.get('outbounds')?.filter(o => o.customerId === c.id && (o.status === '已审核' || o.status === '已完成')) || [];
      const totalAmount = orders.reduce((s, o) => s + (o.total || 0), 0);
      const score = Math.max(0, Math.min(100, 100 - (c.overdueDays || 0) * 2 - (c.overdueCount || 0) * 5));
      const level = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
      csv += `${c.name},${c.contact || ''},${c.phone || ''},${totalAmount},${orders.length},${score},${level},${c.overdueDays || 0}\n`;
    });
    downloadCSV(csv, `客户信用_${this.currentMonth}.csv`);
    toast('信用数据已导出', 'success');
  }
};

// 辅助函数
function fmtMoney(amount) {
  if (!amount && amount !== 0) return '-';
  return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
