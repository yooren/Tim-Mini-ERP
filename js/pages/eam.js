// ===========================
// 售后管理 (After-Sales Service)
// ===========================

// 日期时间格式化辅助函数
function fmtDateTime(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const eam = {
  activeTab: 'ticket', // ticket | equipment | parts
  page: 1, pageSize: 12, keyword: '', statusFilter: '', priorityFilter: '',

  init() {
    this.ensureData();
    // 首次渲染完整页面
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },

  ensureData() {
    if (!localStorage.getItem('serviceTickets')) localStorage.setItem('serviceTickets', '[]');
    if (!localStorage.getItem('afterSalesEquipment')) localStorage.setItem('afterSalesEquipment', '[]');
    if (!localStorage.getItem('afterSalesParts')) localStorage.setItem('afterSalesParts', '[]');
  },

  render() {
    document.getElementById('breadcrumb').textContent = '售后管理';
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn ${this.activeTab === 'ticket' ? 'btn-primary' : 'btn-ghost'}" onclick="eam.activeTab='ticket';eam.page=1;eam.reload()">📋 售后工单</button>
        <button class="btn ${this.activeTab === 'equipment' ? 'btn-primary' : 'btn-ghost'}" onclick="eam.activeTab='equipment';eam.page=1;eam.reload()">🖥 设备档案</button>
        <button class="btn ${this.activeTab === 'parts' ? 'btn-primary' : 'btn-ghost'}" onclick="eam.activeTab='parts';eam.page=1;eam.reload()">🔩 配件管理</button>
      </div>
      <div id="eamContent">${this.renderTab()}</div>
    </div>`;
  },

  renderTab() {
    switch(this.activeTab) {
      case 'ticket': return this.renderTicket();
      case 'equipment': return this.renderEquipment();
      case 'parts': return this.renderParts();
      default: return '';
    }
  },

  reload() {
    const c = document.getElementById('eamContent');
    if (c) c.innerHTML = this.renderTab();
  },

  goPage(tab, p) {
    if (tab) this.activeTab = tab;
    this.page = p;
    this.reload();
  },

  // ===========================
  // 售后工单
  // ===========================
  renderTicket() {
    let list = DB.get('serviceTickets') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => (r.code||'').toLowerCase().includes(kw) || (r.equipmentCode||'').toLowerCase().includes(kw) || (r.customerName||'').toLowerCase().includes(kw) || (r.problem||'').toLowerCase().includes(kw)); }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    if (this.priorityFilter) list = list.filter(r => r.priority === this.priorityFilter);
    list = list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const stats = this.getTicketStats(list);
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    return `
    <div style="margin-bottom:16px">
      <div class="action-bar" style="margin-bottom:16px">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索工单号/设备编码/客户/问题..." value="${this.keyword}"
              oninput="eam.keyword=this.value;eam.page=1;eam.reload()">
          </div>
          <select class="filter-select" onchange="eam.statusFilter=this.value;eam.page=1;eam.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="待派工" ${this.statusFilter==='待派工'?'selected':''}>待派工</option>
            <option value="处理中" ${this.statusFilter==='处理中'?'selected':''}>处理中</option>
            <option value="待配件" ${this.statusFilter==='待配件'?'selected':''}>待配件</option>
            <option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option>
            <option value="已关闭" ${this.statusFilter==='已关闭'?'selected':''}>已关闭</option>
          </select>
          <select class="filter-select" onchange="eam.priorityFilter=this.value;eam.page=1;eam.reload()">
            <option value="" ${!this.priorityFilter?'selected':''}>全部优先级</option>
            <option value="紧急" ${this.priorityFilter==='紧急'?'selected':''}>紧急</option>
            <option value="一般" ${this.priorityFilter==='一般'?'selected':''}>一般</option>
            <option value="低" ${this.priorityFilter==='低'?'selected':''}>低</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="eam.exportCurrentTab()">📥 导出</button>
          <button class="btn btn-primary" onclick="eam.openAddTicket()">+ 新建工单</button>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
        <div class="stat-card" style="border-left:3px solid #f59e0b">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">待处理</div>
          <div style="font-size:28px;font-weight:700;color:#f59e0b">${stats.pending}</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #3b82f6">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">处理中</div>
          <div style="font-size:28px;font-weight:700;color:#3b82f6">${stats.processing}</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #8b5cf6">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">待配件</div>
          <div style="font-size:28px;font-weight:700;color:#8b5cf6">${stats.waitParts}</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #10b981">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">已完成</div>
          <div style="font-size:28px;font-weight:700;color:#10b981">${stats.completed}</div>
        </div>
        <div class="stat-card" style="border-left:3px solid #ef4444">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">紧急工单</div>
          <div style="font-size:28px;font-weight:700;color:#ef4444">${stats.urgent}</div>
        </div>
      </div>
    </div>

    <div class="card">${this.renderTicketTable(pageData)}${renderPagination(total, this.page, this.pageSize, 'eam.goPage')}</div>`;
  },

  getTicketStats(list) {
    return {
      pending: list.filter(r => r.status === '待派工').length,
      processing: list.filter(r => r.status === '处理中').length,
      waitParts: list.filter(r => r.status === '待配件').length,
      completed: list.filter(r => r.status === '已完成').length,
      urgent: list.filter(r => r.priority === '紧急' && !['已完成','已关闭'].includes(r.status)).length
    };
  },

  renderTicketTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无售后工单</div></div>`;
    const statusColor = { '待派工': '#f59e0b', '处理中': '#3b82f6', '待配件': '#8b5cf6', '已完成': '#10b981', '已关闭': '#6b7280' };
    const priorityColor = { '紧急': '#ef4444', '一般': '#f59e0b', '低': '#6b7280' };
    return `<div class="table-wrap"><table>
      <thead><tr><th>工单编号</th><th>设备编码</th><th>设备名称</th><th>点位</th><th>客户</th><th>问题描述</th><th>处理人</th><th>优先级</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead>
      <tbody>${list.map(r => {
        const partsTag = (r.parts && r.parts.length) ? `<span style="color:#8b5cf6;font-size:11px">📦${r.parts.length}件</span>` : '';
        return `<tr>
          <td><span style="color:var(--danger);font-size:12px;font-family:monospace">${r.code}</span></td>
          <td><code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px">${r.equipmentCode || '-'}</code></td>
          <td style="font-weight:500;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.equipmentName || '-'}</td>
          <td style="font-size:12px;color:var(--text-muted)">${r.location || '-'}</td>
          <td style="font-size:12px">${r.customerName || '-'}</td>
          <td style="font-size:12px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.problem||''}">${r.problem || '-'}</td>
          <td style="font-size:12px">${r.handlerName || '<span style="color:var(--text-muted)">-</span>'}</td>
          <td><span class="badge" style="background:${priorityColor[r.priority]}20;color:${priorityColor[r.priority]}">${r.priority || '一般'}</span></td>
          <td><span class="badge" style="background:${statusColor[r.status]}20;color:${statusColor[r.status]}">${r.status}</span> ${partsTag}</td>
          <td style="font-size:11px;color:var(--text-muted)">${fmtDateTime(r.createdAt)}</td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="btn btn-ghost btn-sm" onclick="eam.viewTicket(${r.id})">👁 查看</button>
              <button class="btn btn-outline btn-sm" onclick="PrintManager.printServiceTicket(${r.id})">🖨 打印</button>
              ${r.status === '待派工' ? `<button class="btn btn-primary btn-sm" onclick="eam.dispatchTicket(${r.id})">📋 派工</button>` : ''}
              ${r.status === '处理中' ? `<button class="btn btn-outline btn-sm" onclick="eam.addPartsTicket(${r.id})">📦 配件</button>` : ''}
              ${r.status === '处理中' || r.status === '待配件' ? `<button class="btn btn-primary btn-sm" onclick="eam.completeTicket(${r.id})">✅ 完成</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="eam.delTicket(${r.id})">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  openAddTicket() {
    if (!hasPerm('eam', 'create')) { toast('没有新建权限', 'error'); return; }
    const outbounds = DB.get('outbounds') || [];
    const customers = DB.get('customers') || [];
    const employees = DB.get('employees') || [];
    // 已出库的设备类商品（从已审核的出库单中提取设备类商品）
    const goodsList = DB.get('goods') || [];
    const cats = DB.get('categories') || [];
    const equipmentCatIds = new Set(cats.filter(c => (c.name||'').includes('设备')).map(c => c.id));
    const shippedEquipGoods = goodsList.filter(g => equipmentCatIds.has(g.category) && g.stock >= 0); // 设备类商品均可选
    const departments = DB.get('departments') || [];
    // 售后部门员工
    const afterSaleEmps = employees.filter(e => e.status === 1 && ((e.departmentName||'').includes('售后') || (e.departmentName||'').includes('服务') || (e.departmentName||'').includes('维修')));
    const suppliers = DB.get('suppliers') || [];
    const code = 'SR' + new Date().getFullYear() + String(DB.nextId('serviceTickets')).padStart(4, '0');
    const today = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);

    // 获取已出库的设备序列号（从出库单和设备注册表）
    const shippedEquipSerials = this.getShippedEquipSerials();

    openModal('新建售后工单', `
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>工单编号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item" style="flex:1.5">
          <label>设备序列号 *</label>
          <div id="tEquipList" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:#f8f7ff;border:1px solid #a78bfa;border-radius:8px;min-height:80px">
            ${shippedEquipSerials.length === 0 ? '<span style="font-size:12px;color:#999">暂无可用设备</span>' : shippedEquipSerials.map(e => `
              <label style="cursor:pointer">
                <input type="checkbox" value="${e.serial}" data-goods="${e.goodsName}" data-customer="${e.customerName || ''}" data-customerid="${e.customerId || ''}" onchange="eam.onEquipSerialCheck(this)" style="width:14px;height:14px;accent-color:#7c3aed">
                <span style="font-size:12px;background:#fff;border:1px solid #c4b5fd;border-radius:4px;padding:4px 8px;display:inline-block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${e.serial} | ${e.goodsName} | ${e.outboundDate} | ${e.customerName || '无客户'}">${e.serial}</span>
              </label>
            `).join('')}
          </div>
          <div style="font-size:11px;color:#7c3aed;margin-top:6px;padding-top:6px;border-top:1px dashed #d8b4fe">已选: <span id="tEquipCount">0</span> 台</div>
        </div>
        <div class="form-item">
          <label>客户</label>
          <select id="tCustomer">
            <option value="">-- 选择客户 --</option>
            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>设备名称</label>
          <input id="tEquipName" placeholder="根据序列号自动填充" readonly style="background:#f0f2f8">
        </div>
        <div class="form-item">
          <label>点位 / 位置</label>
          <input id="tLocation" placeholder="如: 1号车间/A区收银台">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>问题描述 *</label>
          <textarea id="tProblem" rows="3" placeholder="请详细描述设备故障或服务需求..."></textarea>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item">
          <label>优先级</label>
          <select id="tPriority">
            <option value="一般" selected>一般</option>
            <option value="紧急">紧急</option>
            <option value="低">低</option>
          </select>
        </div>
        <div class="form-item">
          <label>派工人</label>
          <select id="tDispatcher">
            <option value="">-- 选择 --</option>
            ${afterSaleEmps.map(e => `<option value="${e.id}">${e.name} ${e.departmentName ? '('+e.departmentName+')' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>派工日期</label>
          <input id="tDispatchDate" type="date" value="${today}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>处理人 (可选)</label>
          <select id="tHandler">
            <option value="">-- 待指定 --</option>
            ${afterSaleEmps.map(e => `<option value="${e.id}">${e.name} ${e.departmentName ? '('+e.departmentName+')' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>预计完成日期</label>
          <input id="tEstDate" type="date" value="${tomorrow}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>需要供应商配件</label>
          <select id="tSupplier">
            <option value="">-- 不需要 --</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>配件需求说明</label>
          <input id="tPartsNeed" placeholder="如: 电源板、传感器">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>备注</label>
          <input id="tNote" placeholder="补充信息">
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveTicket()">创建工单</button>`
    );
  },

  onGoodsSelect(select) {
    const opt = select.options[select.selectedIndex];
    document.getElementById('tEquipCode').value = opt.dataset.code || '';
    document.getElementById('tEquipName').value = opt.dataset.name || '';
    const info = document.getElementById('tGoodsInfo');
    if (info) {
      if (opt.value) {
        const goods = DB.findById('goods', +opt.value);
        info.innerHTML = goods ? `📦 当前库存: ${goods.stock} ${goods.unit || ''} | 销售价: ¥${goods.price || 0}` : '';
      } else {
        info.innerHTML = '';
      }
    }
  },

  // 获取已出库的设备序列号列表（支持逗号分隔的多个序列号）
  getShippedEquipSerials() {
    const results = [];
    const outbounds = DB.get('outbounds') || [];
    // 从已审核的设备出库单中获取
    outbounds.forEach(o => {
      if (o.status === '已审核' && o.equipSerial && o.equipSerial.trim()) {
        // 拆分逗号分隔的多个序列号
        const serials = o.equipSerial.split(',').map(s => s.trim()).filter(Boolean);
        serials.forEach(serial => {
          if (!results.find(r => r.serial === serial)) {
            results.push({
              serial: serial,
              goodsId: o.goodsId,
              goodsName: o.goodsName || '',
              customerId: o.customerId,
              customerName: o.customerName || '',
              outboundDate: o.date || '',
              outboundCode: o.code || ''
            });
          }
        });
      }
    });
    // 也从设备注册表中获取已出库的
    if (localStorage.getItem('equipmentRegistry')) {
      const registry = DB.get('equipmentRegistry') || [];
      registry.forEach(e => {
        if (e.status === 'used' && e.serial && e.serial.trim()) {
          if (!results.find(r => r.serial === e.serial)) {
            results.push({
              serial: e.serial,
              goodsId: e.goodsId,
              goodsName: e.goodsName || '',
              customerId: null,
              customerName: e.customerName || '',
              outboundDate: e.usedDate ? e.usedDate.slice(0, 10) : '',
              outboundCode: e.usedOutboundCode || ''
            });
          }
        }
      });
    }
    return results;
  },

  // 设备序列号checkbox选择变更
  onEquipSerialCheck(cb) {
    const equipList = document.getElementById('tEquipList');
    const selected = Array.from(equipList.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value).filter(Boolean);
    document.getElementById('tEquipCount').textContent = selected.length;
    // 填充设备名称
    if (selected.length > 0) {
      const firstCb = Array.from(equipList.querySelectorAll('input[type="checkbox"]:checked'))[0];
      document.getElementById('tEquipName').value = firstCb ? firstCb.dataset.goods : '';
      // 如果只有一个选中，自动填充客户
      if (selected.length === 1 && firstCb && firstCb.dataset.customerid) {
        document.getElementById('tCustomer').value = firstCb.dataset.customerid;
      }
    } else {
      document.getElementById('tEquipName').value = '';
    }
  },

  saveTicket() {
    // 获取选中的设备序列号（从checkbox）
    const equipList = document.getElementById('tEquipList');
    const selectedSerials = equipList ? Array.from(equipList.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value).filter(Boolean) : [];
    if (selectedSerials.length === 0) { toast('请选择设备序列号', 'error'); return; }
    
    const problem = document.getElementById('tProblem').value.trim();
    if (!problem) { toast('请填写问题描述', 'error'); return; }

    const customerId = +document.getElementById('tCustomer').value || null;
    const customer = customerId ? DB.findById('customers', customerId) : null;
    const supplierId = +document.getElementById('tSupplier').value || null;
    const handlerId = +document.getElementById('tHandler').value || null;
    const handler = handlerId ? DB.findById('employees', handlerId) : null;
    const partsNeed = document.getElementById('tPartsNeed').value.trim();
    const partsNeedArr = partsNeed ? partsNeed.split(/[,，]/).map(p => p.trim()).filter(Boolean).map(n => ({ name: n, qty: 1, received: false })) : [];
    
    const equipSerials = this.getShippedEquipSerials();

    // 为每个选中的设备序列号创建工单
    selectedSerials.forEach((serial, idx) => {
      const equip = equipSerials.find(e => e.serial === serial) || {};
      const code = 'SR' + new Date().getFullYear() + String(DB.nextId('serviceTickets') + idx).padStart(4, '0');
      DB.add('serviceTickets', {
        code,
        goodsId: equip.goodsId || null,
        equipmentCode: serial,
        equipmentName: equip.goodsName || '',
        location: document.getElementById('tLocation').value.trim(),
        customerId: equip.customerId || customerId,
        customerName: equip.customerName || (customer ? customer.name : ''),
        problem, priority: document.getElementById('tPriority').value,
        dispatcher: document.getElementById('tDispatcher').value,
        dispatchDate: document.getElementById('tDispatchDate').value,
        handlerId, handlerName: handler ? handler.name : '',
        estimatedDate: document.getElementById('tEstDate').value,
        supplierId, supplierName: supplierId ? (DB.findById('suppliers', supplierId)?.name || '') : '',
        parts: partsNeedArr,
        note: document.getElementById('tNote').value.trim(),
        status: handlerId ? '处理中' : '待派工',
        createdAt: new Date().toISOString()
      });
      audit.log('售后管理', '新建工单', code, `设备: ${serial}`);
    });

    closeModal();
    toast(`工单已创建 ${selectedSerials.length} 个`);
    this.reload();
  },

  viewTicket(id) {
    const t = DB.findById('serviceTickets', id);
    if (!t) return;
    const partsHtml = t.parts && t.parts.length
      ? t.parts.map(p => `<span style="display:inline-block;background:${p.received?'#10b98120':'#f59e0b20'};color:${p.received?'#10b981':'#f59e0b'};padding:2px 8px;border-radius:20px;font-size:12px;margin:2px">${p.name} ×${p.qty} ${p.received?'✓':'⏳'}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:12px">无配件需求</span>';
    const fields = [
      ['工单编号', `<code style="background:var(--bg);padding:2px 8px;border-radius:4px">${t.code}</code>`],
      ['设备编码', t.equipmentCode || '-'],
      ['设备名称', t.equipmentName || '-'],
      ['点位', t.location || '-'],
      ['客户', t.customerName || '-'],
      ['优先级', `<span style="color:${t.priority==='紧急'?'#ef4444':t.priority==='低'?'#6b7280':'#f59e0b'};font-weight:600">${t.priority||'一般'}</span>`],
      ['处理人', t.handlerName || '<span style="color:var(--text-muted)">待指定</span>'],
      ['预计完成', t.estimatedDate || '-'],
      ['供应商', t.supplierName || '-'],
      ['配件需求', partsHtml],
      ['问题描述', `<div style="background:var(--bg);padding:10px;border-radius:8px;line-height:1.6;max-height:120px;overflow-y:auto">${t.problem}</div>`],
      ['派工人', t.dispatcher || '-'],
      ['派工日期', t.dispatchDate || '-'],
      ['状态', `<span style="font-weight:600">${t.status}</span>`],
      ['创建时间', fmtDateTime(t.createdAt)],
      ['备注', t.note || '-']
    ];
    openModal(`工单详情 - ${t.code}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:70vh;overflow-y:auto;padding-right:4px">
        ${fields.map(([k,v]) => `<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${k}</div><div style="font-size:13px;word-break:break-all">${v}</div></div>`).join('')}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${t.status !== '已关闭' && t.status !== '已完成' ? `<button class="btn btn-outline" onclick="closeModal();eam.editTicket(${id})">✏️ 编辑</button>` : ''}`
    );
  },

  dispatchTicket(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const t = DB.findById('serviceTickets', id);
    if (!t) return;
    const employees = DB.get('employees') || [];
    const afterSaleEmps = employees.filter(e => e.status === 1);
    openModal('派工', `
      <div style="margin-bottom:16px;color:var(--text-muted);font-size:13px">正在为工单 <strong>${t.code}</strong> 分配处理人</div>
      <div class="form-row">
        <div class="form-item">
          <label>处理人 *</label>
          <select id="dispHandler">
            <option value="">-- 请选择处理人 --</option>
            ${afterSaleEmps.map(e => `<option value="${e.id}">${e.name} ${e.departmentName?'('+e.departmentName+')':''} ${e.position?'-'+e.position:''}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>预计完成日期</label>
          <input id="dispEstDate" type="date" value="${t.estimatedDate || new Date(Date.now() + 86400000*3).toISOString().slice(0,10)}">
        </div>
        <div class="form-item">
          <label>派工日期</label>
          <input id="dispDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveDispatch(${id})">确认派工</button>`
    );
  },

  saveDispatch(id) {
    const handlerId = +document.getElementById('dispHandler').value;
    if (!handlerId) { toast('请选择处理人', 'error'); return; }
    const handler = DB.findById('employees', handlerId);
    DB.update('serviceTickets', id, {
      handlerId,
      handlerName: handler ? handler.name : '',
      estimatedDate: document.getElementById('dispEstDate').value,
      dispatchDate: document.getElementById('dispDate').value,
      status: '处理中'
    });
    closeModal();
    toast('已派工，工单状态更新为处理中');
    audit.log('售后管理', '派工', DB.findById('serviceTickets', id)?.code || id, `处理人: ${handler?.name}`);
    this.reload();
  },

  addPartsTicket(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const t = DB.findById('serviceTickets', id);
    if (!t) return;
    const partsStr = (t.parts || []).map(p => p.name).join(',');
    openModal('配件需求', `
      <div style="margin-bottom:16px">为工单 <strong>${t.code}</strong> 添加配件</div>
      <div class="form-row">
        <div class="form-item">
          <label>配件名称 (多个用逗号分隔)</label>
          <input id="addPartsInput" value="${partsStr}" placeholder="如: 电源板, 传感器, 电机">
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">配件到货后可在设备档案中标记</div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-outline" onclick="eam.savePartsNeed(${id})">更新配件</button>`
    );
  },

  savePartsNeed(id) {
    const input = document.getElementById('addPartsInput').value.trim();
    const parts = input ? input.split(/[,，]/).map(p => p.trim()).filter(Boolean).map(n => {
      const t = DB.findById('serviceTickets', id);
      const existing = (t.parts || []).find(e => e.name === n);
      return { name: n, qty: existing ? existing.qty : 1, received: existing ? existing.received : false };
    }) : [];
    DB.update('serviceTickets', id, { parts, status: parts.length > 0 ? '待配件' : '处理中' });
    closeModal();
    toast('配件需求已更新');
    this.reload();
  },

  completeTicket(id) {
    if (!hasPerm('eam', 'approve')) { toast('没有审核权限', 'error'); return; }
    const t = DB.findById('serviceTickets', id);
    if (!t) return;
    openModal('完工确认', `
      <div style="margin-bottom:16px">确认工单 <strong>${t.code}</strong> 已完成维修/服务？</div>
      <div class="form-row">
        <div class="form-item">
          <label>完成说明</label>
          <textarea id="completeNote" rows="3" placeholder="填写处理结果和完成情况..."></textarea>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveComplete(${id})">确认完成</button>`
    );
  },

  saveComplete(id) {
    DB.update('serviceTickets', id, {
      status: '已完成',
      completeNote: document.getElementById('completeNote').value.trim(),
      completeTime: new Date().toISOString()
    });
    closeModal();
    toast('工单已完成');
    audit.log('售后管理', '完工', DB.findById('serviceTickets', id)?.code || id, '工单已完成');
    this.reload();
  },

  editTicket(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const t = DB.findById('serviceTickets', id);
    if (!t) return;
    const employees = DB.get('employees') || [];
    const afterSaleEmps = employees.filter(e => e.status === 1);
    const customers = DB.get('customers') || [];
    const suppliers = DB.get('suppliers') || [];
    const partsStr = (t.parts || []).map(p => p.name).join(',');

    openModal('编辑工单', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>设备编码</label>
          <input id="teCode" value="${t.equipmentCode||''}" placeholder="设备序列号">
        </div>
        <div class="form-item">
          <label>设备名称</label>
          <input id="teName" value="${t.equipmentName||''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>点位</label>
          <input id="teLocation" value="${t.location||''}">
        </div>
        <div class="form-item">
          <label>客户</label>
          <select id="teCustomer">
            <option value="">-- 不指定 --</option>
            ${customers.map(c => `<option value="${c.id}" ${c.id===t.customerId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>问题描述</label>
          <textarea id="teProblem" rows="2">${t.problem||''}</textarea>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item">
          <label>优先级</label>
          <select id="tePriority">
            <option value="紧急" ${t.priority==='紧急'?'selected':''}>紧急</option>
            <option value="一般" ${t.priority==='一般'||!t.priority?'selected':''}>一般</option>
            <option value="低" ${t.priority==='低'?'selected':''}>低</option>
          </select>
        </div>
        <div class="form-item">
          <label>处理人</label>
          <select id="teHandler">
            <option value="">-- 待指定 --</option>
            ${afterSaleEmps.map(e => `<option value="${e.id}" ${e.id===t.handlerId?'selected':''}>${e.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>预计完成</label>
          <input id="teEstDate" type="date" value="${t.estimatedDate||''}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>供应商</label>
          <select id="teSupplier">
            <option value="">-- 不需要 --</option>
            ${suppliers.map(s => `<option value="${s.id}" ${s.id===t.supplierId?'selected':''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>配件需求</label>
          <input id="teParts" value="${partsStr}" placeholder="多个用逗号分隔">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>状态</label>
          <select id="teStatus">
            <option value="待派工" ${t.status==='待派工'?'selected':''}>待派工</option>
            <option value="处理中" ${t.status==='处理中'?'selected':''}>处理中</option>
            <option value="待配件" ${t.status==='待配件'?'selected':''}>待配件</option>
            <option value="已完成" ${t.status==='已完成'?'selected':''}>已完成</option>
            <option value="已关闭" ${t.status==='已关闭'?'selected':''}>已关闭</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveEditTicket(${id})">保存</button>`
    );
  },

  saveEditTicket(id) {
    const handlerId = +document.getElementById('teHandler').value || null;
    const handler = handlerId ? DB.findById('employees', handlerId) : null;
    const customerId = +document.getElementById('teCustomer').value || null;
    const customer = customerId ? DB.findById('customers', customerId) : null;
    const supplierId = +document.getElementById('teSupplier').value || null;
    const partsStr = document.getElementById('teParts').value.trim();
    const parts = partsStr ? partsStr.split(/[,，]/).map(p => p.trim()).filter(Boolean).map(n => {
      const t = DB.findById('serviceTickets', id);
      const existing = (t.parts || []).find(e => e.name === n);
      return { name: n, qty: 1, received: existing ? existing.received : false };
    }) : [];

    DB.update('serviceTickets', id, {
      equipmentCode: document.getElementById('teCode').value.trim(),
      equipmentName: document.getElementById('teName').value.trim(),
      location: document.getElementById('teLocation').value.trim(),
      customerId, customerName: customer ? customer.name : '',
      problem: document.getElementById('teProblem').value.trim(),
      priority: document.getElementById('tePriority').value,
      handlerId, handlerName: handler ? handler.name : '',
      estimatedDate: document.getElementById('teEstDate').value,
      supplierId, supplierName: supplierId ? (DB.findById('suppliers', supplierId)?.name || '') : '',
      parts,
      status: document.getElementById('teStatus').value
    });
    closeModal();
    toast('工单已更新');
    this.reload();
  },

  delTicket(id) {
    if (!hasPerm('eam', 'delete')) { toast('没有删除权限', 'error'); return; }
    if (!confirm('确认删除此工单？')) return;
    DB.delete('serviceTickets', id);
    toast('工单已删除', 'warning');
    this.reload();
  },

  // ===========================
  // 设备档案
  // ===========================
  renderEquipment() {
    let list = DB.get('afterSalesEquipment') || [];
    // 自动从已审核的出库单中提取设备类商品构建档案（未在档案中的自动注册）
    const outbounds = DB.get('outbounds') || [];
    const goods = DB.get('goods') || [];
    const cats = DB.get('categories') || [];
    const equipmentCatIds = new Set(cats.filter(c => (c.name||'').includes('设备')).map(c => c.id));
    const equipOuts = outbounds.filter(o => o.status === '已审核' && o.goodsId && equipmentCatIds.has(goods.find(g => g.id === o.goodsId)?.category));
    const existIds = new Set(list.map(e => e.goodsId));
    equipOuts.forEach(o => {
      if (!existIds.has(o.goodsId)) {
        const g = goods.find(x => x.id === o.goodsId);
        if (g) {
          const eq = {
            id: DB.nextId('afterSalesEquipment'),
            goodsId: g.id,
            equipmentCode: g.code,
            equipmentName: g.name,
            customerId: o.customerId || null,
            customerName: o.customerName || '',
            shippedDate: o.date,
            location: o.note || '',
            warrantyMonths: 12,
            warrantyEnd: new Date(new Date(o.date).getTime() + 365*86400000).toISOString().slice(0,10),
            status: '在保',
            serviceCount: 0,
            createdAt: new Date().toISOString()
          };
          DB.add('afterSalesEquipment', eq);
          list.push(eq);
        }
      }
    });

    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => (r.equipmentCode||'').toLowerCase().includes(kw) || (r.equipmentName||'').toLowerCase().includes(kw) || (r.customerName||'').toLowerCase().includes(kw)); }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    return `
    <div class="action-bar" style="margin-bottom:16px">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索设备编码/名称/客户..." value="${this.keyword}"
            oninput="eam.keyword=this.value;eam.page=1;eam.reload()">
        </div>
        <select class="filter-select" onchange="eam.statusFilter=this.value;eam.page=1;eam.reload()">
          <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
          <option value="在保" ${this.statusFilter==='在保'?'selected':''}>在保</option>
          <option value="过保" ${this.statusFilter==='过保'?'selected':''}>过保</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-outline" onclick="eam.exportCurrentTab()">📥 导出</button>
        <button class="btn btn-ghost" onclick="eam.openAddEquipment()">+ 手动建档</button>
      </div>
    </div>
    <div class="card">${this.renderEquipmentTable(pageData)}${renderPagination(total, this.page, this.pageSize, 'eam.goPage')}</div>`;
  },

  renderEquipmentTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">🖥</div><div class="empty-state-text">暂无设备档案</div></div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>设备编码</th><th>设备名称</th><th>客户</th><th>出库日期</th><th>点位</th><th>保修到期</th><th>状态</th><th>服务次数</th><th>操作</th></tr></thead>
      <tbody>${list.map(r => {
        const now = new Date();
        const warrantyEnd = r.warrantyEnd ? new Date(r.warrantyEnd) : null;
        const isWarranty = warrantyEnd && warrantyEnd > now;
        const warnDays = warrantyEnd ? Math.ceil((warrantyEnd - now) / 86400000) : 0;
        const warrantyTag = !warrantyEnd ? '' : warnDays < 0 ? '<span class="badge badge-danger">已过保</span>' : warnDays <= 30 ? `<span class="badge badge-warning">${warnDays}天后到期</span>` : '<span class="badge badge-success">在保</span>';
        return `<tr>
          <td><code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px">${r.equipmentCode||'-'}</code></td>
          <td style="font-weight:500">${r.equipmentName||'-'}</td>
          <td style="font-size:12px">${r.customerName||'-'}</td>
          <td style="font-size:12px;color:var(--text-muted)">${r.shippedDate||'-'}</td>
          <td style="font-size:12px">${r.location||'-'}</td>
          <td><div style="font-size:12px">${r.warrantyEnd||'-'}</div>${warrantyTag}</td>
          <td><span class="badge ${isWarranty?'badge-success':'badge-default'}" style="${!isWarranty?'background:#f1f5f9;color:#64748b':''}">${isWarranty?'在保':'过保'}</span></td>
          <td><span class="badge badge-default">${r.serviceCount||0}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="eam.viewEquipment(${r.id})">👁 查看</button>
              <button class="btn btn-outline btn-sm" onclick="eam.editEquipment(${r.id})">✏️ 编辑</button>
              <button class="btn btn-primary btn-sm" onclick="eam.openTicketFromEquipment(${r.id})">📋 建工单</button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  openAddEquipment() {
    if (!hasPerm('eam', 'create')) { toast('没有新建权限', 'error'); return; }
    const goods = DB.get('goods') || [];
    const cats = DB.get('categories') || [];
    const equipmentCatIds = new Set(cats.filter(c => (c.name||'').includes('设备')).map(c => c.id));
    const equipGoods = goods.filter(g => equipmentCatIds.has(g.category));
    const customers = DB.get('customers') || [];

    openModal('手动添加设备档案', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>设备编码 *</label>
          <input id="eqCode" placeholder="设备序列号/出厂编号">
        </div>
        <div class="form-item">
          <label>设备名称 *</label>
          <input id="eqName" placeholder="设备名称">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>客户</label>
          <select id="eqCustomer">
            <option value="">-- 不指定 --</option>
            ${customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>出库日期</label>
          <input id="eqShippedDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>安装点位</label>
          <input id="eqLocation" placeholder="如: 1号车间/A区">
        </div>
        <div class="form-item">
          <label>保修期(月)</label>
          <input id="eqWarranty" type="number" value="12" min="0">
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveEquipment()">保存档案</button>`
    );
  },

  saveEquipment() {
    const code = document.getElementById('eqCode').value.trim();
    const name = document.getElementById('eqName').value.trim();
    if (!code || !name) { toast('请填写设备编码和名称', 'error'); return; }
    const customerId = +document.getElementById('eqCustomer').value || null;
    const customer = customerId ? DB.findById('customers', customerId) : null;
    const months = +document.getElementById('eqWarranty').value || 12;
    const shippedDate = document.getElementById('eqShippedDate').value;
    const warrantyEnd = shippedDate ? new Date(new Date(shippedDate).getTime() + months * 30 * 86400000).toISOString().slice(0,10) : '';
    DB.add('afterSalesEquipment', {
      goodsId: null,
      equipmentCode: code,
      equipmentName: name,
      customerId, customerName: customer ? customer.name : '',
      shippedDate, location: document.getElementById('eqLocation').value.trim(),
      warrantyMonths: months, warrantyEnd, status: '在保', serviceCount: 0,
      createdAt: new Date().toISOString()
    });
    closeModal();
    toast('设备档案已添加');
    this.reload();
  },

  viewEquipment(id) {
    const eq = DB.findById('afterSalesEquipment', id);
    if (!eq) return;
    const now = new Date();
    const warrantyEnd = eq.warrantyEnd ? new Date(eq.warrantyEnd) : null;
    const isWarranty = warrantyEnd && warrantyEnd > now;
    const relatedTickets = (DB.get('serviceTickets') || []).filter(t => t.equipmentCode === eq.equipmentCode);
    openModal('设备档案详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:70vh;overflow-y:auto">
        <div><div style="font-size:11px;color:var(--text-muted)">设备编码</div><div style="font-size:13px;font-weight:600"><code>${eq.equipmentCode||'-'}</code></div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">设备名称</div><div style="font-size:13px;font-weight:600">${eq.equipmentName||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">客户</div><div style="font-size:13px">${eq.customerName||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">安装点位</div><div style="font-size:13px">${eq.location||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">出库日期</div><div style="font-size:13px">${eq.shippedDate||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">保修期</div><div style="font-size:13px">${eq.warrantyMonths||12}个月</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">保修到期</div><div style="font-size:13px;color:${isWarranty?'#10b981':'#ef4444'};font-weight:600">${eq.warrantyEnd||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">保修状态</div><div style="font-size:13px"><span class="badge ${isWarranty?'badge-success':'badge-danger'}" style="${!isWarranty?'background:#fef2f2;color:#ef4444':''}">${isWarranty?'在保':'过保'}</span></div></div>
        <div style="grid-column:1/-1"><div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">关联售后工单 (${relatedTickets.length}条)</div>
          ${relatedTickets.length ? relatedTickets.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg);border-radius:6px;margin-bottom:6px">
            <div><span style="font-size:12px;font-family:monospace;color:var(--danger)">${t.code}</span> <span style="font-size:12px;color:var(--text-muted)">${fmtDateTime(t.createdAt)}</span></div>
            <span class="badge" style="background:${t.status==='已完成'?'#10b98120':'#f59e0b20'};color:${t.status==='已完成'?'#10b981':'#f59e0b'}">${t.status}</span>
          </div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">暂无关联工单</div>'}
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-primary btn-sm" onclick="closeModal();eam.openTicketFromEquipment(${id})">📋 新建工单</button>`
    );
  },

  editEquipment(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const eq = DB.findById('afterSalesEquipment', id);
    if (!eq) return;
    const customers = DB.get('customers') || [];
    openModal('编辑设备档案', `
      <div class="form-row cols-2">
        <div class="form-item"><label>设备编码</label><input id="eeeCode" value="${eq.equipmentCode||''}"></div>
        <div class="form-item"><label>设备名称</label><input id="eeeName" value="${eq.equipmentName||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>客户</label>
          <select id="eeeCustomer">
            <option value="">-- 不指定 --</option>
            ${customers.map(c => `<option value="${c.id}" ${c.id===eq.customerId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>点位</label><input id="eeeLocation" value="${eq.location||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>保修期(月)</label><input id="eeeWarranty" type="number" value="${eq.warrantyMonths||12}"></div>
        <div class="form-item"><label>保修到期</label><input id="eeeWarrantyEnd" type="date" value="${eq.warrantyEnd||''}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveEditEquipment(${id})">保存</button>`
    );
  },

  saveEditEquipment(id) {
    const customerId = +document.getElementById('eeeCustomer').value || null;
    const customer = customerId ? DB.findById('customers', customerId) : null;
    const warrantyEnd = document.getElementById('eeeWarrantyEnd').value;
    const now = new Date();
    const status = warrantyEnd && new Date(warrantyEnd) > now ? '在保' : '过保';
    DB.update('afterSalesEquipment', id, {
      equipmentCode: document.getElementById('eeeCode').value.trim(),
      equipmentName: document.getElementById('eeeName').value.trim(),
      customerId, customerName: customer ? customer.name : '',
      location: document.getElementById('eeeLocation').value.trim(),
      warrantyMonths: +document.getElementById('eeeWarranty').value,
      warrantyEnd, status
    });
    closeModal();
    toast('档案已更新');
    this.reload();
  },

  openTicketFromEquipment(id) {
    if (!hasPerm('eam', 'create')) { toast('没有新建权限', 'error'); return; }
    const eq = DB.findById('afterSalesEquipment', id);
    if (!eq) return;
    // 自动填写设备信息后打开新建工单
    const outbounds = DB.get('outbounds') || [];
    const customers = DB.get('customers') || [];
    const employees = DB.get('employees') || [];
    const afterSaleEmps = employees.filter(e => e.status === 1);
    const suppliers = DB.get('suppliers') || [];
    const code = 'SR' + new Date().getFullYear() + String(DB.nextId('serviceTickets')).padStart(4, '0');
    const today = new Date().toISOString().slice(0,10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0,10);

    openModal('新建售后工单', `
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>工单编号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
        <span style="margin-left:12px;background:#3b82f620;color:#3b82f6;padding:2px 8px;border-radius:4px;font-size:12px">📋 来源：设备档案</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>设备编码</label><input id="tEquipCode" value="${eq.equipmentCode||''}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>设备名称</label><input id="tEquipName" value="${eq.equipmentName||''}" readonly style="background:#f0f2f8"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>客户</label>
          <select id="tCustomer">
            <option value="">-- 不指定 --</option>
            ${customers.map(c => `<option value="${c.id}" ${c.id===eq.customerId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>点位</label><input id="tLocation" value="${eq.location||''}" placeholder="安装位置"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>问题描述 *</label><textarea id="tProblem" rows="3" placeholder="请详细描述设备故障或服务需求..."></textarea></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>优先级</label><select id="tPriority"><option value="一般" selected>一般</option><option value="紧急">紧急</option><option value="低">低</option></select></div>
        <div class="form-item"><label>处理人</label><select id="tHandler"><option value="">-- 待指定 --</option>${afterSaleEmps.map(e => `<option value="${e.id}">${e.name}</option>`).join('')}</select></div>
        <div class="form-item"><label>预计完成</label><input id="tEstDate" type="date" value="${tomorrow}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>供应商</label><select id="tSupplier"><option value="">-- 不需要 --</option>${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div class="form-item"><label>配件需求</label><input id="tPartsNeed" placeholder="如: 电源板、传感器"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveTicket()">创建工单</button>`
    );
  },

  // ===========================
  // 配件管理
  // ===========================
  renderParts() {
    let list = DB.get('afterSalesParts') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => (r.code||'').toLowerCase().includes(kw) || (r.name||'').toLowerCase().includes(kw)); }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.stock || 0) - (a.stock || 0));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const lowStockCount = list.filter(r => (r.stock || 0) <= (r.minStock || 0)).length;

    return `
    <div class="action-bar" style="margin-bottom:16px">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索配件编码/名称..." value="${this.keyword}"
            oninput="eam.keyword=this.value;eam.page=1;eam.reload()">
        </div>
        <select class="filter-select" onchange="eam.statusFilter=this.value;eam.page=1;eam.reload()">
          <option value="" ${!this.statusFilter?'selected':''}>全部</option>
          <option value="正常" ${this.statusFilter==='正常'?'selected':''}>正常</option>
          <option value="库存不足" ${this.statusFilter==='库存不足'?'selected':''}>库存不足</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-outline" onclick="eam.exportCurrentTab()">📥 导出</button>
        <button class="btn btn-ghost" onclick="eam.openAddPart()">+ 添加配件</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
      <div class="stat-card" style="border-left:3px solid #3b82f6">
        <div style="font-size:11px;color:var(--text-muted)">配件种类</div>
        <div style="font-size:28px;font-weight:700;color:#3b82f6">${total}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #10b981">
        <div style="font-size:11px;color:var(--text-muted)">总库存量</div>
        <div style="font-size:28px;font-weight:700;color:#10b981">${list.reduce((s,r) => s+(r.stock||0), 0)}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #ef4444">
        <div style="font-size:11px;color:var(--text-muted)">库存不足</div>
        <div style="font-size:28px;font-weight:700;color:#ef4444">${lowStockCount}</div>
      </div>
    </div>
    <div class="card">${this.renderPartsTable(pageData)}${renderPagination(total, this.page, this.pageSize, 'eam.goPage')}</div>`;
  },

  renderPartsTable(list) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">🔩</div><div class="empty-state-text">暂无配件记录</div></div>`;
    return `<div class="table-wrap"><table>
      <thead><tr><th>配件编码</th><th>配件名称</th><th>规格</th><th>单位</th><th>当前库存</th><th>最低库存</th><th>供应商</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${list.map(r => {
        const isLow = (r.stock || 0) <= (r.minStock || 0);
        return `<tr>
          <td><code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:12px">${r.code||'-'}</code></td>
          <td style="font-weight:500">${r.name||'-'}</td>
          <td style="font-size:12px;color:var(--text-muted)">${r.spec||'-'}</td>
          <td style="font-size:12px">${r.unit||'个'}</td>
          <td><span style="font-weight:700;color:${isLow?'#ef4444':'#10b981'}">${r.stock||0}</span></td>
          <td style="font-size:12px;color:var(--text-muted)">${r.minStock||0}</td>
          <td style="font-size:12px">${r.supplierName||'-'}</td>
          <td><span class="badge ${isLow?'badge-danger':'badge-success'}" style="${isLow?'':'background:#10b98120;color:#10b981'}">${isLow?'库存不足':'正常'}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost btn-sm" onclick="eam.adjustPartStock(${r.id})">📦 调整</button>
              <button class="btn btn-outline btn-sm" onclick="eam.editPart(${r.id})">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="eam.delPart(${r.id})">🗑</button>
            </div>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  },

  openAddPart() {
    if (!hasPerm('eam', 'create')) { toast('没有新建权限', 'error'); return; }
    const suppliers = DB.get('suppliers') || [];
    const code = 'SP' + String(DB.nextId('afterSalesParts')).padStart(4, '0');
    openModal('添加配件', `
      <div class="form-row cols-2">
        <div class="form-item"><label>配件编码</label><input id="pCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>配件名称 *</label><input id="pName" placeholder="配件名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>规格</label><input id="pSpec" placeholder="型号/规格"></div>
        <div class="form-item"><label>单位</label><input id="pUnit" value="个" placeholder="个/件/套"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>当前库存</label><input id="pStock" type="number" min="0" value="0"></div>
        <div class="form-item"><label>最低库存(预警)</label><input id="pMin" type="number" min="0" value="2"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>供应商</label><select id="pSupplier"><option value="">-- 不指定 --</option>${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.savePart()">保存</button>`
    );
  },

  savePart() {
    const name = document.getElementById('pName').value.trim();
    if (!name) { toast('请输入配件名称', 'error'); return; }
    const supplierId = +document.getElementById('pSupplier').value || null;
    DB.add('afterSalesParts', {
      code: document.getElementById('pCode').value.trim(),
      name, spec: document.getElementById('pSpec').value.trim(),
      unit: document.getElementById('pUnit').value || '个',
      stock: +document.getElementById('pStock').value,
      minStock: +document.getElementById('pMin').value,
      supplierId, supplierName: supplierId ? (DB.findById('suppliers', supplierId)?.name || '') : '',
      createdAt: new Date().toISOString()
    });
    closeModal();
    toast('配件已添加');
    this.reload();
  },

  adjustPartStock(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const p = DB.findById('afterSalesParts', id);
    if (!p) return;
    openModal('调整库存', `
      <div style="margin-bottom:12px">配件: <strong>${p.name}</strong> (当前库存: <span style="color:var(--primary);font-weight:700">${p.stock||0}</span> ${p.unit||'个'})</div>
      <div class="form-row">
        <div class="form-item"><label>调整方式</label>
          <select id="adjType" onchange="document.getElementById('adjQty').disabled=this.value==='set'">
            <option value="add">增加库存</option>
            <option value="sub">减少库存</option>
            <option value="set">设为库存</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>数量</label><input id="adjQty" type="number" min="1" value="1"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>原因</label><input id="adjReason" placeholder="如: 采购入库/损坏报废"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveAdjustStock(${id})">确认调整</button>`
    );
  },

  saveAdjustStock(id) {
    const p = DB.findById('afterSalesParts', id);
    if (!p) return;
    const type = document.getElementById('adjType').value;
    const qty = +document.getElementById('adjQty').value || 0;
    let newStock = p.stock || 0;
    if (type === 'add') newStock += qty;
    else if (type === 'sub') newStock = Math.max(0, newStock - qty);
    else newStock = qty;
    DB.update('afterSalesParts', id, { stock: newStock });
    closeModal();
    toast(`库存已调整为 ${newStock} ${p.unit||'个'}`);
    this.reload();
  },

  editPart(id) {
    if (!hasPerm('eam', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const p = DB.findById('afterSalesParts', id);
    if (!p) return;
    const suppliers = DB.get('suppliers') || [];
    openModal('编辑配件', `
      <div class="form-row cols-2">
        <div class="form-item"><label>配件编码</label><input id="peCode" value="${p.code||''}"></div>
        <div class="form-item"><label>配件名称</label><input id="peName" value="${p.name||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>规格</label><input id="peSpec" value="${p.spec||''}"></div>
        <div class="form-item"><label>单位</label><input id="peUnit" value="${p.unit||'个'}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>当前库存</label><input id="peStock" type="number" value="${p.stock||0}"></div>
        <div class="form-item"><label>最低库存</label><input id="peMin" type="number" value="${p.minStock||0}"></div>
      </div>
      <div class="form-row"><div class="form-item"><label>供应商</label><select id="peSupplier"><option value="">-- 不指定 --</option>${suppliers.map(s => `<option value="${s.id}" ${s.id===p.supplierId?'selected':''}>${s.name}</option>`).join('')}</select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="eam.saveEditPart(${id})">保存</button>`
    );
  },

  saveEditPart(id) {
    const supplierId = +document.getElementById('peSupplier').value || null;
    DB.update('afterSalesParts', id, {
      code: document.getElementById('peCode').value.trim(),
      name: document.getElementById('peName').value.trim(),
      spec: document.getElementById('peSpec').value.trim(),
      unit: document.getElementById('peUnit').value || '个',
      stock: +document.getElementById('peStock').value,
      minStock: +document.getElementById('peMin').value,
      supplierId, supplierName: supplierId ? (DB.findById('suppliers', supplierId)?.name || '') : ''
    });
    closeModal();
    toast('配件已更新');
    this.reload();
  },

  delPart(id) {
    if (!hasPerm('eam', 'delete')) { toast('没有删除权限', 'error'); return; }
    if (!confirm('确认删除此配件？')) return;
    DB.delete('afterSalesParts', id);
    toast('配件已删除', 'warning');
    this.reload();
  },

  // 导出当前标签页数据
  exportCurrentTab() {
    if (!hasPerm('eam', 'export')) { toast('没有导出权限', 'error'); return; }
    const tab = this.activeTab;
    let headers, rows, filename;
    switch(tab) {
      case 'ticket': {
        const list = DB.get('serviceTickets');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['工单号', '设备编码', '设备名称', '客户', '故障描述', '优先级', '状态', '创建日期'];
        rows = list.map(t => [t.code||'', t.equipmentCode||'', t.equipmentName||'', t.customerName||'', t.faultDesc||'', t.priority||'', t.status||'', t.createdAt||'']);
        filename = '售后工单列表';
        break;
      }
      case 'equipment': {
        const list = DB.get('equipmentRegistry');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['设备编码', '设备名称', '客户', '出库日期', '点位', '保修到期', '状态'];
        rows = list.map(e => [e.equipmentCode||'', e.equipmentName||'', e.customerName||'', e.outboundDate||'', e.location||'', e.warrantyEnd||'', e.status||'']);
        filename = '设备档案列表';
        break;
      }
      case 'parts': {
        const list = DB.get('afterSalesParts');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['配件编码', '配件名称', '规格', '单位', '库存', '单价', '状态'];
        rows = list.map(p => [p.code||'', p.name||'', p.spec||'', p.unit||'', p.stock||0, p.price||0, p.status||'']);
        filename = '配件列表';
        break;
      }
      default:
        toast('当前标签页不支持导出', 'warning'); return;
    }
    exportTableToCSV(headers, rows, `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${rows.length} 条数据`, 'success');
  }
};
