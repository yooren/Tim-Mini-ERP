// ===========================
// 运输计划管理
// ===========================

const transportPlan = {
  page: 1,
  pageSize: 12,
  keyword: '',
  statusFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索计划号/客户..." value="${this.keyword}"
              oninput="transportPlan.keyword=this.value;transportPlan.page=1;transportPlan.reload()">
          </div>
          <select class="filter-select" value="${this.statusFilter}"
            onchange="transportPlan.statusFilter=this.value;transportPlan.page=1;transportPlan.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="待发货" ${this.statusFilter==='待发货'?'selected':''}>待发货</option>
            <option value="已发货" ${this.statusFilter==='已发货'?'selected':''}>已发货</option>
            <option value="配送中" ${this.statusFilter==='配送中'?'selected':''}>配送中</option>
            <option value="已签收" ${this.statusFilter==='已签收'?'selected':''}>已签收</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-primary" onclick="transportPlan.openAdd()">+ 新建运输计划</button>
        </div>
      </div>
      <div class="card" id="planCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('transportPlans');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.planNo || '').toLowerCase().includes(kw) || 
        (r.customerName || '').toLowerCase().includes(kw) ||
        (r.carrierName || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.shipDate || '').localeCompare(a.shipDate || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">🚛</div><div class="empty-state-text">暂无运输计划</div></div>`;

    const statusMap = {
      '待发货': 'badge-warning',
      '已发货': 'badge-info',
      '配送中': 'badge-primary',
      '已签收': 'badge-success'
    };

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>计划号</th><th>关联订单</th><th>客户</th><th>承运商</th><th>总重量</th><th>运费</th>
        <th>发货日期</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = statusMap[r.status] || 'badge-default';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.planNo}</span></td>
            <td><span style="font-size:12px;color:var(--text-muted)">${r.orderNo || r.outboundCode || '-'}</span></td>
            <td><strong>${r.customerName || '-'}</strong></td>
            <td>${r.carrierName || '-'}</td>
            <td>${r.totalWeight ? r.totalWeight + 'kg' : '-'}</td>
            <td><span style="font-weight:600;color:var(--success)">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${r.shipDate || '-'}</td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="transportPlan.view(${r.id})">👁 查看</button>
                <button class="btn btn-outline btn-sm" onclick="PrintManager.printTransportPlan(${r.id})">🖨 打印</button>
                ${r.status === '待发货' ? `<button class="btn btn-primary btn-sm" onclick="transportPlan.ship(${r.id})">📦 发货</button>` : ''}
                ${r.status === '已发货' || r.status === '配送中' ? `<button class="btn btn-outline btn-sm" onclick="transportPlan.updateProgress(${r.id})">🔄 更新</button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'transportPlan.goPage')}`;
  },

  reload() {
    const card = document.getElementById('planCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    if (!hasPerm('transportPlan', 'create')) { toast('没有新建权限', 'error'); return; }
    const carriers = DB.get('carriers').filter(c => c.status === 1);
    const customers = DB.get('customers').filter(c => c.status === 1);
    // 获取已审核的出库单（用于关联）
    const approvedOutbounds = DB.get('outbounds').filter(o => o.status === '已完成' || o.status === '已审核');
    const today = new Date().toISOString().slice(0, 10);
    const code = DB.genCode('TP');

    openModal('新建运输计划', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>计划号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>承运商 *</label>
          <select id="tpCarrier">
            <option value="">-- 请选择 --</option>
            ${carriers.map(c=>`<option value="${c.id}">${c.name} (${c.vehicleTypes})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>客户 *</label>
          <select id="tpCustomer" onchange="transportPlan.onCustomerChange()">
            <option value="">-- 请选择 --</option>
            ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>收货地址</label><input id="tpAddress" placeholder="详细收货地址"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>关联出库单 *</label>
          <select id="tpOutbound" onchange="transportPlan.onOutboundChange()">
            <option value="">-- 请选择出库单 --</option>
            ${approvedOutbounds.map(o=>`<option value="${o.id}" data-customer="${o.customerName}" data-order="${o.orderNo || o.code}" data-goods="${o.goodsName}" data-qty="${o.qty}">${o.code} - ${o.customerName} - ${o.goodsName}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="outboundInfo" class="form-row" style="display:none">
        <div class="form-item"><label>关联订单号</label>
          <input id="tpOrderNo" readonly placeholder="自动读取出库单对应的订单号" style="background:var(--bg);cursor:default">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>总重量(kg)</label><input id="tpWeight" type="number" step="0.1" placeholder="预估总重量"></div>
        <div class="form-item"><label>运费(¥)</label><input id="tpFreightFee" type="number" step="0.01" placeholder="预估运费"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>发货日期</label><input id="tpShipDate" type="date" value="${today}"></div>
        <div class="form-item"><label>预计到达</label><input id="tpEstimatedArrival" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="tpNote" placeholder="备注信息"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="transportPlan.save('${code}')">创建计划</button>`
    );
  },

  onOutboundChange() {
    const select = document.getElementById('tpOutbound');
    const infoDiv = document.getElementById('outboundInfo');
    const orderNoInput = document.getElementById('tpOrderNo');
    const addressInput = document.getElementById('tpAddress');
    
    if (!select.value) {
      infoDiv.style.display = 'none';
      return;
    }
    
    const option = select.options[select.selectedIndex];
    const orderNo = option.dataset.order;
    const customerName = option.dataset.customer;
    
    // 显示关联订单号
    infoDiv.style.display = 'block';
    orderNoInput.value = orderNo || '（无订单号）';
    
    // 如果客户地址为空，自动填充
    if (!addressInput.value) {
      const customers = DB.get('customers');
      const customer = customers.find(c => c.name === customerName);
      if (customer && customer.address) {
        addressInput.value = customer.address;
      }
    }
  },

  onCustomerChange() {
    const cid = +document.getElementById('tpCustomer').value;
    if (!cid) return;
    const customer = DB.findById('customers', cid);
    if (customer) {
      document.getElementById('tpAddress').value = customer.address || '';
    }
  },

  save(code) {
    const carrierId = +document.getElementById('tpCarrier').value;
    const customerId = +document.getElementById('tpCustomer').value;
    const outboundId = +document.getElementById('tpOutbound').value;
    if (!carrierId) { toast('请选择承运商', 'error'); return; }
    if (!customerId) { toast('请选择客户', 'error'); return; }
    if (!outboundId) { toast('请选择关联出库单', 'error'); return; }

    const carrier = DB.findById('carriers', carrierId);
    const customer = DB.findById('customers', customerId);
    const outbound = DB.findById('outbounds', outboundId);

    DB.add('transportPlans', {
      planNo: code,
      carrierId: carrierId,
      carrierName: carrier?.name || '',
      outboundId: outboundId,
      outboundCode: outbound?.code || '',
      orderNo: document.getElementById('tpOrderNo').value || outbound?.orderNo || '',
      customerId: customerId,
      customerName: customer?.name || '',
      deliveryAddress: document.getElementById('tpAddress').value,
      goodsList: outbound ? [{goodsId: outbound.goodsId, goodsName: outbound.goodsName, qty: outbound.qty}] : [],
      totalWeight: +document.getElementById('tpWeight').value || 0,
      freightFee: +document.getElementById('tpFreightFee').value || 0,
      status: '待发货',
      shipDate: document.getElementById('tpShipDate').value,
      estimatedArrival: document.getElementById('tpEstimatedArrival').value,
      actualArrival: null,
      operator: currentUser.username,
      note: document.getElementById('tpNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('运输计划已创建', 'success');
    audit.log('transportPlan', '新建运输计划', code, '承运商: ' + carrier?.name + ', 客户: ' + customer?.name + ', 出库单: ' + outbound?.code);
    closeModal();
    this.reload();
  },

  view(id) {
    const r = DB.findById('transportPlans', id);
    if (!r) return;
    const statusMap = {
      '待发货': 'badge-warning',
      '已发货': 'badge-info',
      '配送中': 'badge-primary',
      '已签收': 'badge-success'
    };
    const badge = statusMap[r.status] || 'badge-default';

    openModal('运输计划详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">计划号</div>
          <div style="font-size:14px;font-weight:600;color:var(--primary)">${r.planNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">状态</div>
          <div><span class="badge ${badge}">${r.status}</span></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">承运商</div>
          <div style="font-size:14px;font-weight:500">${r.carrierName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">客户</div>
          <div style="font-size:14px;font-weight:500">${r.customerName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px;grid-column:1/-1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">收货地址</div>
          <div style="font-size:14px;font-weight:500">${r.deliveryAddress || '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">关联出库单</div>
          <div style="font-size:14px;font-weight:500">${r.outboundCode || '-'}</div>
        </div>
        ${r.orderNo ? `<div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">订单号</div>
          <div style="font-size:14px;font-weight:500;color:var(--primary)">${r.orderNo}</div>
        </div>` : ''}
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">总重量</div>
          <div style="font-size:14px;font-weight:600">${r.totalWeight ? r.totalWeight + ' kg' : '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">运费</div>
          <div style="font-size:14px;font-weight:700;color:var(--success)">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">发货日期</div>
          <div style="font-size:14px;font-weight:500">${r.shipDate || '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">预计到达</div>
          <div style="font-size:14px;font-weight:500">${r.estimatedArrival || '-'}</div>
        </div>
        ${r.actualArrival ? `<div style="background:var(--bg);border-radius:8px;padding:12px;grid-column:1/-1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">实际到达</div>
          <div style="font-size:14px;font-weight:600;color:var(--success)">${r.actualArrival}</div>
        </div>` : ''}
      </div>
      ${r.note ? `<div style="margin-top:12px;background:var(--bg);border-radius:8px;padding:12px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">备注</div>
        <div style="font-size:13px">${r.note}</div>
      </div>` : ''}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-outline" onclick="PrintManager.printTransportPlan(${id})">🖨 打印</button>
       ${r.status === '待发货' ? `<button class="btn btn-primary" onclick="closeModal();transportPlan.ship(${id})">📦 确认发货</button>` : ''}
       ${r.status !== '已签收' ? `<button class="btn btn-outline" onclick="closeModal();transportPlan.updateProgress(${id})">🔄 更新状态</button>` : ''}`
    );
  },

  ship(id) {
    if (!hasPerm('transportPlan', 'edit')) { toast('没有编辑权限', 'error'); return; }
    DB.update('transportPlans', id, { status: '已发货' });
    toast('已确认发货', 'success');
    this.reload();
  },

  updateProgress(id) {
    if (!hasPerm('transportPlan', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('transportPlans', id);
    if (!r) return;

    openModal('更新配送状态', `
      <div class="form-item"><label>当前状态</label>
        <select id="tpUpdateStatus">
          <option value="已发货" ${r.status === '已发货' ? 'selected' : ''}>已发货</option>
          <option value="配送中" ${r.status === '配送中' ? 'selected' : ''}>配送中</option>
          <option value="已签收" ${r.status === '已签收' ? 'selected' : ''}>已签收</option>
        </select>
      </div>
      <div class="form-item"><label>实际到达日期</label>
        <input id="tpActualArrival" type="date" value="${r.actualArrival || ''}">
      </div>
      <div class="form-item"><label>备注</label>
        <input id="tpUpdateNote" placeholder="更新备注">
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="transportPlan.confirmUpdate(${id})">确认更新</button>`
    );
  },

  confirmUpdate(id) {
    const status = document.getElementById('tpUpdateStatus').value;
    const actualArrival = document.getElementById('tpActualArrival').value;
    
    DB.update('transportPlans', id, { 
      status: status,
      actualArrival: actualArrival || null
    });
    toast('状态已更新', 'success');
    closeModal();
    this.reload();
  }
};
