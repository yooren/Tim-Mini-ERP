// ===========================
// 生产计划管理 (MPS/MRP)
// ===========================

const productionPlan = {
  page: 1,
  pageSize: 12,
  keyword: '',
  statusFilter: '',
  activeTab: 'mps', // mps | mrp | crp

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 统计卡片 -->
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
        ${this.getStats().map(s => `
          <div class="stat-card ${s.color}">
            <div class="stat-icon ${s.color}">${s.icon}</div>
            <div class="stat-info">
              <div class="stat-label">${s.label}</div>
              <div class="stat-value">${s.value}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- 标签页 -->
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn ${this.activeTab === 'mps' ? 'btn-primary' : 'btn-ghost'}" onclick="productionPlan.activeTab='mps';productionPlan.reload()">📅 主生产计划</button>
        <button class="btn ${this.activeTab === 'mrp' ? 'btn-primary' : 'btn-ghost'}" onclick="productionPlan.activeTab='mrp';productionPlan.reload()">🧮 物料需求</button>
        <button class="btn ${this.activeTab === 'crp' ? 'btn-primary' : 'btn-ghost'}" onclick="productionPlan.activeTab='crp';productionPlan.reload()">⚡ 产能计划</button>
      </div>
      <div id="planContent">${this.renderTab()}</div>
    </div>`;
  },

  getStats() {
    const orders = DB.get('productionOrders');
    return [
      { label: '待排产', value: orders.filter(o => o.status === '待排产').length, color: 'orange', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
      { label: '生产中', value: orders.filter(o => o.status === '生产中').length, color: 'blue', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
      { label: '已完成', value: orders.filter(o => o.status === '已完成').length, color: 'green', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
      { label: '本月产量', value: orders.filter(o => o.status === '已完成').reduce((s, o) => s + (o.completedQty || 0), 0) + '件', color: 'purple', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' }
    ];
  },

  renderTab() {
    if (this.activeTab === 'mps') return this.renderMPS();
    if (this.activeTab === 'mrp') return this.renderMRP();
    return this.renderCRP();
  },

  reload() {
    const content = document.getElementById('planContent');
    if (content) content.innerHTML = this.renderTab();
  },

  // ========== 主生产计划 MPS ==========
  renderMPS() {
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索工单号/产品..." value="${this.keyword}"
            oninput="productionPlan.keyword=this.value;productionPlan.page=1;productionPlan.reload()">
        </div>
        <select class="filter-select" value="${this.statusFilter}"
          onchange="productionPlan.statusFilter=this.value;productionPlan.page=1;productionPlan.reload()">
          <option value="">全部状态</option>
          <option value="待排产" ${this.statusFilter==='待排产'?'selected':''}>待排产</option>
          <option value="已排产" ${this.statusFilter==='已排产'?'selected':''}>已排产</option>
          <option value="生产中" ${this.statusFilter==='生产中'?'selected':''}>生产中</option>
          <option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-outline" onclick="productionPlan.autoPlan()">🤖 自动排产</button>
        <button class="btn btn-primary" onclick="productionPlan.openAddOrder()">+ 新建工单</button>
      </div>
    </div>
    <div class="card" id="mpsCard">${this.renderOrderTable()}</div>`;
  },

  renderOrderTable() {
    let list = DB.get('productionOrders');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.orderNo || '').toLowerCase().includes(kw) || 
        (r.bomName || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.plannedStart || '').localeCompare(a.plannedStart || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无生产工单</div></div>`;

    const statusMap = {
      '待排产': 'badge-warning',
      '已排产': 'badge-info',
      '生产中': 'badge-primary',
      '已完成': 'badge-success'
    };

    const priorityMap = {
      '高': 'var(--danger)',
      '中': 'var(--warning)',
      '低': 'var(--text-muted)'
    };

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>工单号</th><th>BOM/产品</th><th>计划数量</th><th>完成数量</th><th>进度</th>
        <th>计划周期</th><th>优先级</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = statusMap[r.status] || 'badge-default';
          const progress = r.qty > 0 ? Math.round((r.completedQty || 0) / r.qty * 100) : 0;
          const priorityColor = priorityMap[r.priority] || 'var(--text-muted)';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.orderNo}</span></td>
            <td><strong>${r.bomName}</strong></td>
            <td>${r.qty}</td>
            <td><span style="color:var(--success)">${r.completedQty || 0}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:60px;height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
                  <div style="width:${progress}%;height:100%;background:var(--primary);border-radius:3px"></div>
                </div>
                <span style="font-size:11px;color:var(--text-muted)">${progress}%</span>
              </div>
            </td>
            <td style="font-size:12px;color:var(--text-muted)">${r.plannedStart || '-'} ~ ${r.plannedEnd || '-'}</td>
            <td><span style="color:${priorityColor};font-weight:600">${r.priority || '中'}</span></td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="productionPlan.viewOrder(${r.id})">详情</button>
                <button class="btn btn-outline btn-sm" onclick="PrintManager.printProductionOrder(${r.id})">🖨 打印</button>
                ${r.status === '待排产' ? `<button class="btn btn-primary btn-sm" onclick="productionPlan.startOrder(${r.id})">▶ 开始</button>` : ''}
                ${r.status === '生产中' ? `<button class="btn btn-outline btn-sm" onclick="productionPlan.completeOrder(${r.id})">✓ 完成</button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'productionPlan.goPage')}`;
  },

  goPage(p) { this.page = p; this.reload(); },

  openAddOrder() {
    if (!hasPerm('productionPlan', 'create')) { toast('没有新建权限', 'error'); return; }
    const boms = DB.get('boms').filter(b => b.status === '启用');
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const code = DB.genCode('MO');

    openModal('新建生产工单', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>工单号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>BOM/配方 *</label>
          <select id="poBom" onchange="productionPlan.onBomChange()">
            <option value="">-- 请选择 --</option>
            ${boms.map(b=>`<option value="${b.id}">${b.name} (${b.bomCode})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>计划数量 *</label><input id="poQty" type="number" min="1" value="100"></div>
      </div>
      <div id="poBomInfo" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;display:none">
        <strong>物料需求预览：</strong>
        <div id="poBomItems" style="margin-top:8px"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>优先级</label>
          <select id="poPriority">
            <option value="高">高</option>
            <option value="中" selected>中</option>
            <option value="低">低</option>
          </select>
        </div>
        <div class="form-item"><label>生产车间</label>
          <select id="poWorkshop">
            <option value="组装车间A">组装车间A</option>
            <option value="组装车间B">组装车间B</option>
            <option value="测试车间">测试车间</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>计划开始日期</label><input id="poStart" type="date" value="${today}"></div>
        <div class="form-item"><label>计划结束日期</label><input id="poEnd" type="date" value="${nextWeek}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="productionPlan.saveOrder('${code}')">创建工单</button>`
    );
  },

  onBomChange() {
    const bomId = +document.getElementById('poBom').value;
    if (!bomId) { document.getElementById('poBomInfo').style.display = 'none'; return; }
    const b = DB.findById('boms', bomId);
    if (!b || !b.items) { document.getElementById('poBomInfo').style.display = 'none'; return; }

    const qty = +document.getElementById('poQty').value || 100;
    const itemsHtml = b.items.map(item => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
        <span>${item.materialName}</span>
        <span>需要 ${(item.qty * qty).toFixed(2)} ${item.unit}</span>
      </div>
    `).join('');

    document.getElementById('poBomItems').innerHTML = itemsHtml;
    document.getElementById('poBomInfo').style.display = 'block';
  },

  saveOrder(code) {
    const bomId = +document.getElementById('poBom').value;
    const qty = +document.getElementById('poQty').value;
    if (!bomId) { toast('请选择BOM', 'error'); return; }
    if (qty <= 0) { toast('请输入有效数量', 'error'); return; }

    const bom = DB.findById('boms', bomId);

    DB.add('productionOrders', {
      orderNo: code,
      bomId, bomName: bom?.name || '',
      qty, completedQty: 0,
      status: '待排产',
      priority: document.getElementById('poPriority').value,
      plannedStart: document.getElementById('poStart').value,
      plannedEnd: document.getElementById('poEnd').value,
      actualStart: null,
      actualEnd: null,
      workshop: document.getElementById('poWorkshop').value,
      operator: currentUser.username,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('生产工单已创建', 'success');
    audit.log('productionPlan', '新建工单', code, bom?.name + ' x' + qty);
    closeModal();
    this.reload();
  },

  viewOrder(id) {
    const r = DB.findById('productionOrders', id);
    if (!r) return;

    const bom = DB.findById('boms', r.bomId);
    const progress = r.qty > 0 ? Math.round((r.completedQty || 0) / r.qty * 100) : 0;

    openModal('工单详情 - ' + r.orderNo, `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">工单号</div>
          <div style="font-weight:600;color:var(--primary)">${r.orderNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">BOM</div>
          <div style="font-weight:500">${r.bomName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">状态</div>
          <div><span class="badge ${r.status === '已完成' ? 'badge-success' : 'badge-primary'}">${r.status}</span></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">计划数量</div>
          <div style="font-weight:600">${r.qty}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">完成数量</div>
          <div style="font-weight:600;color:var(--success)">${r.completedQty || 0}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">优先级</div>
          <div style="font-weight:600">${r.priority}</div>
        </div>
      </div>
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px">
          <span>完成进度</span><span>${progress}%</span>
        </div>
        <div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden">
          <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--primary),var(--success));border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">计划周期</div>
          <div>${r.plannedStart || '-'} 至 ${r.plannedEnd || '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">实际周期</div>
          <div>${r.actualStart || '-'} 至 ${r.actualEnd || '-'}</div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-outline" onclick="PrintManager.printProductionOrder(${id})">🖨 打印</button>
       ${r.status === '待排产' ? `<button class="btn btn-primary" onclick="closeModal();productionPlan.startOrder(${id})">▶ 开始生产</button>` : ''}`
    );
  },

  startOrder(id) {
    if (!hasPerm('productionPlan', 'edit')) { toast('没有编辑权限', 'error'); return; }
    DB.update('productionOrders', id, {
      status: '生产中', 
      actualStart: new Date().toISOString().slice(0, 10) 
    });
    toast('工单已开始生产', 'success');
    this.reload();
  },

  completeOrder(id) {
    if (!hasPerm('productionPlan', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('productionOrders', id);
    if (!r) return;
    DB.update('productionOrders', id, { 
      status: '已完成', 
      completedQty: r.qty,
      actualEnd: new Date().toISOString().slice(0, 10)
    });
    toast('工单已完成', 'success');
    this.reload();
  },

  autoPlan() {
    toast('智能排产功能开发中', 'info');
  },

  // ========== 物料需求 MRP ==========
  renderMRP() {
    return `
    <div class="card">
      <div class="card-title">物料需求计算</div>
      <div class="form-row cols-3" style="margin-bottom:16px">
        <div class="form-item"><label>选择BOM</label>
          <select id="mrpBom">
            <option value="">-- 请选择 --</option>
            ${DB.get('boms').filter(b => b.status === '启用').map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>计划产量</label><input id="mrpQty" type="number" min="1" value="100" placeholder=""></div>
        <div class="form-item"><label>&nbsp;</label>
          <button class="btn btn-primary" onclick="productionPlan.calcMRP()">计算需求</button>
        </div>
      </div>
      <div id="mrpResult">
        <div style="text-align:center;padding:40px;color:var(--text-muted)">请选择BOM并输入计划产量，系统将自动计算物料需求</div>
      </div>
    </div>`;
  },

  calcMRP() {
    const bomId = +document.getElementById('mrpBom').value;
    const qty = +document.getElementById('mrpQty').value;
    if (!bomId) { toast('请选择BOM', 'error'); return; }

    const bom = DB.findById('boms', bomId);
    if (!bom || !bom.items) return;

    const resultHtml = `
      <div class="table-wrap"><table>
        <thead><tr><th>物料编码</th><th>物料名称</th><th>单位用量</th><th>损耗率</th><th>总需求</th><th>当前库存</th><th>欠料数量</th></tr></thead>
        <tbody>
          ${bom.items.map(item => {
            const goods = DB.findById('goods', item.materialId);
            const totalNeed = item.qty * qty * (1 + item.scrapRate);
            const stock = goods?.stock || 0;
            const shortage = Math.max(0, totalNeed - stock);
            return `<tr>
              <td>${goods?.code || '-'}</td>
              <td><strong>${item.materialName}</strong></td>
              <td>${item.qty}</td>
              <td>${(item.scrapRate * 100).toFixed(0)}%</td>
              <td>${totalNeed.toFixed(2)}</td>
              <td>${stock}</td>
              <td style="color:${shortage > 0 ? 'var(--danger)' : 'var(--success)'}">${shortage > 0 ? shortage.toFixed(2) : '充足'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;

    document.getElementById('mrpResult').innerHTML = resultHtml;
  },

  // ========== 产能计划 CRP ==========
  renderCRP() {
    return `
    <div class="card">
      <div class="card-title">产能分析</div>
      <div class="table-wrap"><table>
        <thead><tr><th>工序</th><th>标准工时</th><th>工作中心</th><th>当前负荷</th><th>可用产能</th><th>状态</th></tr></thead>
        <tbody>
          ${DB.get('processes').map(p => {
            const orders = DB.get('productionOrders').filter(o => o.status === '生产中' || o.status === '已排产');
            const load = orders.length * (p.stdTime || 30);
            return `<tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.stdTime} ${p.unit}</td>
              <td>${p.workCenter || '-'}</td>
              <td>${load} 分钟</td>
              <td>480 分钟/天</td>
              <td><span class="badge ${load > 480 ? 'badge-danger' : 'badge-success'}">${load > 480 ? '超负荷' : '正常'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  init() {}
};
