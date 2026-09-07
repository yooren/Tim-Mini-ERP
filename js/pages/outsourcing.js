// ===========================
// 委外加工管理
// ===========================

const outsourcing = {
  page: 1,
  pageSize: 12,
  keyword: '',
  statusFilter: '',
  activeTab: 'order', // order | material

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn ${this.activeTab === 'order' ? 'btn-primary' : 'btn-ghost'}" onclick="outsourcing.activeTab='order';outsourcing.reload()">📋 委外单</button>
        <button class="btn ${this.activeTab === 'material' ? 'btn-primary' : 'btn-ghost'}" onclick="outsourcing.activeTab='material';outsourcing.reload()">📦 发料记录</button>
      </div>
      <div id="osContent">${this.renderTab()}</div>
    </div>`;
  },

  renderTab() {
    if (this.activeTab === 'order') return this.renderOrders();
    return this.renderMaterials();
  },

  reload() {
    const content = document.getElementById('osContent');
    if (content) content.innerHTML = this.renderTab();
  },

  renderOrders() {
    let list = DB.get('outsourcingOrders');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.orderNo || '').toLowerCase().includes(kw) || 
        (r.supplierName || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">🌐</div><div class="empty-state-text">暂无委外单</div></div>`;

    const statusMap = {
      '待发料': 'badge-warning',
      '进行中': 'badge-primary',
      '已完成': 'badge-success',
      '已结算': 'badge-info'
    };

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索单号/供应商..." value="${this.keyword}"
            oninput="outsourcing.keyword=this.value;outsourcing.page=1;outsourcing.reload()">
        </div>
        <select class="filter-select" value="${this.statusFilter}"
          onchange="outsourcing.statusFilter=this.value;outsourcing.page=1;outsourcing.reload()">
          <option value="">全部状态</option>
          <option value="待发料" ${this.statusFilter==='待发料'?'selected':''}>待发料</option>
          <option value="进行中" ${this.statusFilter==='进行中'?'selected':''}>进行中</option>
          <option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option>
          <option value="已结算" ${this.statusFilter==='已结算'?'selected':''}>已结算</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="outsourcing.openAddOrder()">+ 新建委外单</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>委外单号</th><th>供应商</th><th>工序名称</th><th>数量</th><th>金额</th><th>计划交期</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${pageData.map(r => {
            const badge = statusMap[r.status] || 'badge-default';
            return `<tr>
              <td><span style="color:var(--primary)">${r.orderNo}</span></td>
              <td><strong>${r.supplierName}</strong></td>
              <td>${r.processName || '-'}</td>
              <td>${r.qty} ${r.unitQty ? r.unitQty : ''}</td>
              <td><span style="color:var(--success)">${fmtMoney(r.totalAmount)}</span></td>
              <td style="font-size:12px;color:var(--text-muted)">${r.planReceiveDate || '-'}</td>
              <td><span class="badge ${badge}">${r.status}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="outsourcing.viewOrder(${r.id})">详情</button>
                  <button class="btn btn-outline btn-sm" onclick="PrintManager.printOutsourcing(${r.id})">🖨 打印</button>
                  ${r.status === '待发料' ? `<button class="btn btn-primary btn-sm" onclick="outsourcing.sendMaterial(${r.id})">发料</button>` : ''}
                  ${r.status === '进行中' ? `<button class="btn btn-outline btn-sm" onclick="outsourcing.receive(${r.id})">收货</button>` : ''}
                  ${r.status === '已完成' ? `<button class="btn btn-outline btn-sm" onclick="outsourcing.settle(${r.id})">结算</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>
    ${renderPagination(total, this.page, this.pageSize, 'outsourcing.goPage')}`;
  },

  goPage(p) { this.page = p; this.reload(); },

  openAddOrder() {
    if (!hasPerm('outsourcing', 'create')) { toast('没有新建权限', 'error'); return; }
    const suppliers = DB.get('suppliers').filter(s => s.status === 1);
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const code = DB.genCode('OS');

    openModal('新建委外单', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>委外单号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>供应商 *</label>
          <select id="osSupplier">
            <option value="">-- 请选择 --</option>
            ${suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>工序名称 *</label><input id="osProcessName" placeholder="如：SMT贴片"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>数量</label><input id="osQty" type="number" min="1" value="1000"></div>
        <div class="form-item"><label>单位</label><input id="osUnitQty" placeholder="如：件、个"></div>
        <div class="form-item"><label>单价(¥)</label><input id="osUnitPrice" type="number" step="0.01" value="2.5"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>计划发料日期</label><input id="osPlanSendDate" type="date" value="${today}"></div>
        <div class="form-item"><label>计划收货日期</label><input id="osPlanReceiveDate" type="date" value="${nextWeek}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="osNote" placeholder="委外说明"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="outsourcing.saveOrder('${code}')">创建</button>`
    );
  },

  saveOrder(code) {
    const supplierId = +document.getElementById('osSupplier').value;
    const processName = document.getElementById('osProcessName').value.trim();
    const qty = +document.getElementById('osQty').value;
    if (!supplierId) { toast('请选择供应商', 'error'); return; }
    if (!processName) { toast('请输入工序名称', 'error'); return; }

    const supplier = DB.findById('suppliers', supplierId);
    const unitPrice = +document.getElementById('osUnitPrice').value || 0;

    DB.add('outsourcingOrders', {
      orderNo: code,
      supplierId, supplierName: supplier?.name || '',
      processName,
      qty,
      unitQty: document.getElementById('osUnitQty').value,
      unitPrice,
      totalAmount: qty * unitPrice,
      status: '待发料',
      planSendDate: document.getElementById('osPlanSendDate').value,
      actualSendDate: null,
      planReceiveDate: document.getElementById('osPlanReceiveDate').value,
      actualReceiveDate: null,
      operator: currentUser.username,
      note: document.getElementById('osNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('委外单已创建', 'success');
    closeModal();
    this.reload();
  },

  viewOrder(id) {
    const r = DB.findById('outsourcingOrders', id);
    if (!r) return;

    const materials = DB.get('outsourcingMaterials').filter(m => m.orderId === id);
    const statusMap = { '待发料': 'badge-warning', '进行中': 'badge-primary', '已完成': 'badge-success', '已结算': 'badge-info' };
    const badge = statusMap[r.status] || 'badge-default';

    openModal('委外单详情 - ' + r.orderNo, `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">单号</div>
          <div style="font-weight:600;color:var(--primary)">${r.orderNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">供应商</div>
          <div style="font-weight:500">${r.supplierName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">状态</div>
          <div><span class="badge ${badge}">${r.status}</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">工序</div>
          <div>${r.processName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">数量</div>
          <div>${r.qty} ${r.unitQty || ''}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">单价</div>
          <div>${fmtMoney(r.unitPrice)}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">总金额</div>
          <div style="font-weight:600;color:var(--success)">${fmtMoney(r.totalAmount)}</div>
        </div>
      </div>
      ${materials.length > 0 ? `
        <div class="card-title">发料记录</div>
        <div class="table-wrap"><table>
          <thead><tr><th>物料</th><th>数量</th><th>发料日期</th><th>状态</th></tr></thead>
          <tbody>
            ${materials.map(m => `<tr>
              <td>${m.goodsName}</td>
              <td>${m.qty} ${m.unit}</td>
              <td>${m.sendDate || '-'}</td>
              <td><span class="badge ${m.status === '已发料' ? 'badge-success' : 'badge-warning'}">${m.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      ` : ''}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-outline" onclick="PrintManager.printOutsourcing(${id})">🖨 打印</button>
       ${r.status === '待发料' ? `<button class="btn btn-primary" onclick="closeModal();outsourcing.sendMaterial(${id})">发料</button>` : ''}
       ${r.status === '进行中' ? `<button class="btn btn-outline" onclick="closeModal();outsourcing.receive(${id})">确认收货</button>` : ''}`
    );
  },

  sendMaterial(orderId) {
    if (!hasPerm('outsourcing', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const order = DB.findById('outsourcingOrders', orderId);
    if (!order) return;

    const goods = DB.get('goods').filter(g => g.status === 1);
    const today = new Date().toISOString().slice(0, 10);

    openModal('委外发料 - ' + order.orderNo, `
      <div style="background:var(--primary-light);border-radius:8px;padding:12px;margin-bottom:16px">
        委外工序：${order.processName} | 数量：${order.qty} ${order.unitQty || ''}
      </div>
      <div class="form-item"><label>选择发料物料 *</label>
        <select id="osMatGoods" onchange="outsourcing.onMatGoodsChange()">
          <option value="">-- 请选择物料 --</option>
          ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name} (库存:${g.stock})</option>`).join('')}
        </select>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>发料数量</label><input id="osMatQty" type="number" min="1" value="1"></div>
        <div class="form-item"><label>单位</label><input id="osMatUnit" placeholder="单位"></div>
        <div class="form-item"><label>发料日期</label><input id="osMatDate" type="date" value="${today}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="outsourcing.confirmSendMaterial(${orderId})">确认发料</button>`
    );
  },

  onMatGoodsChange() {
    const gid = +document.getElementById('osMatGoods').value;
    if (!gid) return;
    const g = DB.findById('goods', gid);
    if (g) {
      document.getElementById('osMatUnit').value = g.unit || '个';
    }
  },

  confirmSendMaterial(orderId) {
    const gid = +document.getElementById('osMatGoods').value;
    const qty = +document.getElementById('osMatQty').value;
    if (!gid || qty <= 0) { toast('请填写发料信息', 'error'); return; }

    const g = DB.findById('goods', gid);
    const order = DB.findById('outsourcingOrders', orderId);

    // 扣减库存：库存不足时中止发料，不能一边提示成功一边不实际扣减库存
    if (!g || g.stock < qty) { toast('库存不足，无法发料', 'error'); return; }
    DB.update('goods', gid, { stock: g.stock - qty });

    // 添加发料记录
    DB.add('outsourcingMaterials', {
      orderId, orderNo: order?.orderNo || '',
      goodsId: gid, goodsName: g?.name || '',
      qty, unit: document.getElementById('osMatUnit').value,
      price: g?.cost || 0, total: qty * (g?.cost || 0),
      sendDate: document.getElementById('osMatDate').value,
      status: '已发料',
      operator: currentUser.username,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    // 更新委外单状态
    DB.update('outsourcingOrders', orderId, { 
      status: '进行中',
      actualSendDate: document.getElementById('osMatDate').value 
    });

    toast('发料成功', 'success');
    closeModal();
    this.reload();
  },

  receive(orderId) {
    if (!hasPerm('outsourcing', 'approve')) { toast('没有审核权限', 'error'); return; }
    const today = new Date().toISOString().slice(0, 10);
    openModal('确认收货', `
      <div style="text-align:center;padding:20px">
        <div style="font-size:14px;margin-bottom:16px">确认委外加工已完成？</div>
        <div class="form-item"><label>实际收货日期</label>
          <input id="osReceiveDate" type="date" value="${today}">
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="outsourcing.confirmReceive(${orderId})">确认收货</button>`
    );
  },

  confirmReceive(orderId) {
    DB.update('outsourcingOrders', orderId, {
      status: '已完成',
      actualReceiveDate: document.getElementById('osReceiveDate').value
    });
    toast('已确认收货', 'success');
    closeModal();
    this.reload();
  },

  settle(orderId) {
    if (!hasPerm('outsourcing', 'approve')) { toast('没有审核权限', 'error'); return; }
    const order = DB.findById('outsourcingOrders', orderId);
    if (!order) return;

    openModal('结算', `
      <div style="text-align:center;padding:20px">
        <div style="font-size:16px;font-weight:600;margin-bottom:8px">结算金额</div>
        <div style="font-size:32px;font-weight:800;color:var(--success)">${fmtMoney(order.totalAmount)}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:8px">委外单：${order.orderNo}</div>
      </div>
      <div class="form-item"><label>结算备注</label>
        <input id="osSettleNote" placeholder="结算说明">
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="outsourcing.confirmSettle(${orderId})">确认结算</button>`
    );
  },

  confirmSettle(orderId) {
    DB.update('outsourcingOrders', orderId, { status: '已结算' });
    toast('结算完成', 'success');
    closeModal();
    this.reload();
  },

  renderMaterials() {
    let list = DB.get('outsourcingMaterials');
    list = list.sort((a, b) => (b.sendDate || '').localeCompare(a.sendDate || ''));

    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无发料记录</div></div>`;

    return `
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>委外单号</th><th>物料</th><th>数量</th><th>金额</th><th>发料日期</th><th>状态</th></tr></thead>
        <tbody>
          ${list.map(r => `<tr>
            <td><span style="color:var(--primary)">${r.orderNo}</span></td>
            <td><strong>${r.goodsName}</strong></td>
            <td>${r.qty} ${r.unit}</td>
            <td>${fmtMoney(r.total)}</td>
            <td>${r.sendDate || '-'}</td>
            <td><span class="badge ${r.status === '已发料' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  init() {}
};
