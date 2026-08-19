// ===========================
// 仓库调拨管理
// ===========================

const transfer = {
  page: 1,
  pageSize: 12,
  keyword: '',
  dateFilter: '',
  statusFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索调拨单号/商品名..." value="${this.keyword}"
              oninput="transfer.keyword=this.value;transfer.page=1;transfer.reload()">
          </div>
          <input type="month" class="filter-select" value="${this.dateFilter}"
            onchange="transfer.dateFilter=this.value;transfer.page=1;transfer.reload()">
          <select class="filter-select" onchange="transfer.statusFilter=this.value;transfer.page=1;transfer.reload()">
            <option value="">全部状态</option>
            <option value="待调拨" ${this.statusFilter==='待调拨'?'selected':''}>待调拨</option>
            <option value="调拨中" ${this.statusFilter==='调拨中'?'selected':''}>调拨中</option>
            <option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option>
            <option value="已取消" ${this.statusFilter==='已取消'?'selected':''}>已取消</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="transfer.exportData()">📥 导出</button>
          <button class="btn btn-primary" onclick="transfer.openAdd()">+ 新建调拨单</button>
        </div>
      </div>
      <div class="card" id="transferCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('transfers');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => (r.code||'').toLowerCase().includes(kw) || (r.goodsName||'').toLowerCase().includes(kw) || (r.fromWarehouse||'').toLowerCase().includes(kw) || (r.toWarehouse||'').toLowerCase().includes(kw));
    }
    if (this.dateFilter) list = list.filter(r => (r.date||'').startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.date||'').localeCompare(a.date||''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const paged = list.slice(start, start + this.pageSize);
    const statusColors = { '待调拨': 'badge-warning', '调拨中': 'badge-info', '已完成': 'badge-success', '已取消': 'badge-default' };

    if (!total) return '<div class="empty-state"><div class="empty-state-icon">🔄</div><div class="empty-state-text">暂无调拨记录</div><button class="btn btn-primary" onclick="transfer.openAdd()">创建第一张调拨单</button></div>';

    return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div class="stat-card" style="border-left:3px solid #f59e0b;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">待调拨</div>
        <div style="font-size:24px;font-weight:700;color:#f59e0b">${list.filter(r=>r.status==='待调拨').length}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #3b82f6;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">调拨中</div>
        <div style="font-size:24px;font-weight:700;color:#3b82f6">${list.filter(r=>r.status==='调拨中').length}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #10b981;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">已完成</div>
        <div style="font-size:24px;font-weight:700;color:#10b981">${list.filter(r=>r.status==='已完成').length}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #8b5cf6;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">总调拨量</div>
        <div style="font-size:24px;font-weight:700;color:#8b5cf6">${list.reduce((s,r)=>s+(r.qty||0),0)}</div>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>调拨单号</th><th>调拨日期</th><th>商品名称</th><th>数量</th>
        <th>调出仓库</th><th>调入仓库</th><th>金额</th><th>状态</th><th>操作员</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${paged.map(r => `
          <tr>
            <td><span style="color:var(--primary);font-family:monospace;font-weight:600">${r.code}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
            <td>${r.goodsName}</td>
            <td style="font-weight:600;color:var(--danger)">${r.qty}</td>
            <td><span style="background:rgba(239,68,68,0.08);color:#dc2626;padding:2px 8px;border-radius:4px;font-size:12px">${r.fromWarehouse}</span></td>
            <td><span style="background:rgba(16,185,129,0.08);color:#059669;padding:2px 8px;border-radius:4px;font-size:12px">${r.toWarehouse}</span></td>
            <td style="font-weight:600">${fmtMoney(r.amount||0)}</td>
            <td><span class="badge ${statusColors[r.status]||'badge-default'}">${r.status}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${r.operator||'-'}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="transfer.viewDetail(${r.id})">详情</button>
                <button class="btn btn-outline btn-sm" onclick="PrintManager.printTransfer(${r.id})">🖨</button>
                ${r.status==='待调拨'?`<button class="btn btn-primary btn-sm" onclick="transfer.startTransfer(${r.id})">执行</button>`:''}
                ${r.status==='调拨中'?`<button class="btn btn-success btn-sm" onclick="transfer.completeTransfer(${r.id})">完成</button>`:''}
                ${r.status!=='已完成'&&r.status!=='已取消'?`<button class="btn btn-danger btn-sm" onclick="transfer.cancelTransfer(${r.id})">取消</button>`:''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
    <div class="pagination">
      <span style="color:var(--text-muted);font-size:13px">共 ${total} 条记录</span>
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="transfer.page=1;transfer.reload()" ${this.page===1?'disabled':''}>首页</button>
        <button class="btn btn-ghost btn-sm" onclick="transfer.page--;transfer.reload()" ${this.page===1?'disabled':''}>上一页</button>
        <span style="padding:4px 12px;font-size:13px;color:var(--text-muted)">${this.page} / ${Math.ceil(total/this.pageSize)||1}</span>
        <button class="btn btn-ghost btn-sm" onclick="transfer.page++;transfer.reload()" ${this.page>=Math.ceil(total/this.pageSize)?'disabled':''}>下一页</button>
        <button class="btn btn-ghost btn-sm" onclick="transfer.page=${Math.ceil(total/this.pageSize)||1};transfer.reload()" ${this.page>=Math.ceil(total/this.pageSize)?'disabled':''}>末页</button>
      </div>
    </div>`;
  },

  reload() {
    document.getElementById('transferCard').innerHTML = this.renderTable();
  },

  openAdd() {
    if (!hasPerm('transfer', 'create')) { toast('没有新建权限', 'error'); return; }
    const goods = DB.get('goods').filter(g => g.status === 1);
    const warehouses = DB.get('warehouses') || [{ id: 1, name: '主仓库' }, { id: 2, name: '分仓库A' }, { id: 3, name: '分仓库B' }];
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建调拨单', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>调拨日期 *</label>
          <input id="trDate" type="date" value="${today}">
        </div>
        <div class="form-item">
          <label>调拨类型</label>
          <select id="trType">
            <option value="库存调拨">库存调拨</option>
            <option value="紧急调拨">紧急调拨</option>
            <option value="退货调拨">退货调拨</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>调出仓库 *</label>
          <select id="trFrom">
            <option value="">-- 请选择调出仓库 --</option>
            ${warehouses.map(w => `<option value="${w.id}" data-name="${w.name}">${w.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>调入仓库 *</label>
          <select id="trTo">
            <option value="">-- 请选择调入仓库 --</option>
            ${warehouses.map(w => `<option value="${w.id}" data-name="${w.name}">${w.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>商品 *</label>
          <select id="trGoods" onchange="transfer.onGoodsChange()">
            <option value="">-- 请选择商品 --</option>
            ${goods.map(g => `<option value="${g.id}" data-code="${g.code}" data-name="${g.name}" data-price="${g.cost||0}">${g.code} - ${g.name} (库存:${g.stock})</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>调拨数量 *</label>
          <input id="trQty" type="number" min="1" value="1" oninput="transfer.calcAmount()">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>单价</label>
          <input id="trPrice" type="number" min="0" step="0.01" value="0" oninput="transfer.calcAmount()">
        </div>
        <div class="form-item">
          <label>调拨金额</label>
          <input id="trAmount" type="text" readonly style="background:var(--bg);font-weight:600;color:var(--primary)">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>调拨原因</label>
          <textarea id="trReason" rows="2" placeholder="请输入调拨原因（可选）"></textarea>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>备注</label>
          <textarea id="trNote" rows="2" placeholder="备注信息（可选）"></textarea>
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="transfer.saveTransfer()">创建调拨单</button>
    `);
  },

  onGoodsChange() {
    const sel = document.getElementById('trGoods');
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.price) {
      document.getElementById('trPrice').value = opt.dataset.price;
      this.calcAmount();
    }
  },

  calcAmount() {
    const qty = parseFloat(document.getElementById('trQty').value) || 0;
    const price = parseFloat(document.getElementById('trPrice').value) || 0;
    document.getElementById('trAmount').value = fmtMoney(qty * price);
  },

  saveTransfer() {
    const date = document.getElementById('trDate').value;
    const type = document.getElementById('trType').value;
    const fromSel = document.getElementById('trFrom');
    const toSel = document.getElementById('trTo');
    const goodsSel = document.getElementById('trGoods');
    const qty = parseInt(document.getElementById('trQty').value);
    const price = parseFloat(document.getElementById('trPrice').value);
    const reason = document.getElementById('trReason').value.trim();
    const note = document.getElementById('trNote').value.trim();

    if (!date) { toast('请选择调拨日期', 'error'); return; }
    if (!fromSel.value) { toast('请选择调出仓库', 'error'); return; }
    if (!toSel.value) { toast('请选择调入仓库', 'error'); return; }
    if (fromSel.value === toSel.value) { toast('调出和调入仓库不能相同', 'error'); return; }
    if (!goodsSel.value) { toast('请选择商品', 'error'); return; }
    if (!qty || qty <= 0) { toast('数量必须大于0', 'error'); return; }

    const goodsOpt = goodsSel.options[goodsSel.selectedIndex];
    const fromOpt = fromSel.options[fromSel.selectedIndex];
    const toOpt = toSel.options[toSel.selectedIndex];
    const goods = DB.findById('goods', parseInt(goodsSel.value));

    const fromWarehouseId = parseInt(fromSel.value);
    const availableStock = (goods && goods.warehouseStock && goods.warehouseStock[fromWarehouseId]) || 0;
    if (availableStock < qty) {
      toast(`调出仓库「${fromOpt.dataset.name}」库存不足（当前 ${availableStock}，需调拨 ${qty}）`, 'error');
      return;
    }

    const code = 'TR' + new Date().getFullYear() + String(new Date().getMonth()+1).padStart(2,'0') + String(new Date().getDate()).padStart(2,'0') + String(DB.get('transfers').length + 1).padStart(4, '0');

    DB.add('transfers', {
      code,
      date,
      type,
      goodsId: parseInt(goodsSel.value),
      goodsName: goods ? goods.name : goodsOpt.dataset.name,
      goodsCode: goods ? goods.code : goodsOpt.dataset.code,
      qty,
      price,
      amount: qty * price,
      fromWarehouse: fromOpt.dataset.name,
      fromWarehouseId: parseInt(fromSel.value),
      toWarehouse: toOpt.dataset.name,
      toWarehouseId: parseInt(toSel.value),
      reason,
      note,
      status: '待调拨',
      operator: currentUser.name,
      createdAt: new Date().toISOString()
    });

    audit.log('transfer', '新建调拨单', code, `商品: ${goodsOpt.dataset.name}, 数量: ${qty}`);
    closeModal();
    toast('调拨单创建成功！', 'success');
    this.reload();
  },

  viewDetail(id) {
    const r = DB.findById('transfers', id);
    if (!r) return;
    const statusColors = { '待调拨': '#f59e0b', '调拨中': '#3b82f6', '已完成': '#10b981', '已取消': '#94a3b8' };

    const fields = [
      ['调拨单号', r.code],
      ['调拨日期', r.date],
      ['调拨类型', r.type],
      ['商品名称', r.goodsName],
      ['商品编码', r.goodsCode],
      ['调拨数量', `<span style="color:var(--danger);font-weight:700;font-size:16px">${r.qty}</span>`],
      ['单价', fmtMoney(r.price)],
      ['调拨金额', `<span style="color:var(--primary);font-weight:700">${fmtMoney(r.amount||0)}</span>`],
      ['调出仓库', `<span style="background:rgba(239,68,68,0.08);color:#dc2626;padding:2px 8px;border-radius:4px">${r.fromWarehouse}</span>`],
      ['调入仓库', `<span style="background:rgba(16,185,129,0.08);color:#059669;padding:2px 8px;border-radius:4px">${r.toWarehouse}</span>`],
      ['操作员', r.operator],
      ['状态', `<span style="color:${statusColors[r.status]||'#94a3b8'};font-weight:600">${r.status}</span>`],
      ['调拨原因', r.reason || '-'],
      ['备注', r.note || '-'],
      ['创建时间', r.createdAt ? r.createdAt.slice(0,16).replace('T',' ') : '-']
    ];

    openModal('调拨单详情 - ' + r.code, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-height:70vh;overflow-y:auto;padding-right:4px">
        ${fields.map(([k,v]) => `<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">${k}</div><div style="font-size:13px;word-break:break-all">${v}</div></div>`).join('')}
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">关闭</button>
      <button class="btn btn-outline" onclick="PrintManager.printTransfer(${id})">🖨 打印</button>
      ${r.status==='待调拨'?`<button class="btn btn-primary" onclick="closeModal();transfer.startTransfer(${id})">执行调拨</button>`:''}
      ${r.status==='调拨中'?`<button class="btn btn-success" onclick="closeModal();transfer.completeTransfer(${id})">确认完成</button>`:''}
    `);
  },

  startTransfer(id) {
    if (!hasPerm('transfer', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('transfers', id);
    if (!r || r.status !== '待调拨') return;
    DB.update('transfers', id, { status: '调拨中', startTime: new Date().toISOString() });
    audit.log('transfer', '开始调拨', r.code, `商品: ${r.goodsName}`);
    toast('调拨已开始执行', 'success');
    this.reload();
  },

  completeTransfer(id) {
    if (!hasPerm('transfer', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('transfers', id);
    if (!r || r.status !== '调拨中') return;

    const goods = DB.findById('goods', r.goodsId);
    if (goods) {
      // 更新仓库库存：调出仓库减少，调入仓库增加
      const ws = goods.warehouseStock || {};
      const available = (r.fromWarehouseId && ws[r.fromWarehouseId]) || 0;
      if (available < r.qty) {
        toast(`调出仓库「${r.fromWarehouse}」当前库存不足（现存 ${available}，需调拨 ${r.qty}），无法完成调拨`, 'error');
        return;
      }
      // 调出仓库扣减
      if (r.fromWarehouseId) {
        ws[r.fromWarehouseId] = available - r.qty;
      }
      // 调入仓库增加
      if (r.toWarehouseId) {
        ws[r.toWarehouseId] = (ws[r.toWarehouseId] || 0) + r.qty;
      }
      DB.update('goods', r.goodsId, { warehouseStock: ws });
    }

    DB.update('transfers', id, { status: '已完成', completeTime: new Date().toISOString() });
    audit.log('transfer', '完成调拨', r.code, `商品: ${r.goodsName}, 数量: ${r.qty}, ${r.fromWarehouse}→${r.toWarehouse}`);
    toast('调拨已完成！库存已更新', 'success');
    this.reload();
  },

  cancelTransfer(id) {
    if (!hasPerm('transfer', 'edit')) { toast('没有编辑权限', 'error'); return; }
    openModal('确认取消', `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <div style="font-size:15px;font-weight:600">确定取消此调拨单？</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:6px">取消后不可恢复</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">返回</button>
      <button class="btn btn-danger" onclick="transfer.confirmCancel(${id})">确认取消</button>
    `);
  },

  confirmCancel(id) {
    DB.update('transfers', id, { status: '已取消', cancelTime: new Date().toISOString() });
    const r = DB.findById('transfers', id);
    if (r) audit.log('transfer', '取消调拨', r.code, '');
    closeModal();
    toast('调拨单已取消', 'warning');
    this.reload();
  },

  exportData() {
    if (!hasPerm('transfer', 'export')) { toast('没有导出权限', 'error'); return; }
    let list = DB.get('transfers');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => (r.code||'').toLowerCase().includes(kw) || (r.goodsName||'').toLowerCase().includes(kw));
    }
    if (this.dateFilter) list = list.filter(r => (r.date||'').startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);

    const headers = ['调拨单号', '日期', '类型', '商品名称', '商品编码', '数量', '单价', '金额', '调出仓库', '调入仓库', '原因', '备注', '状态', '操作员'];
    const rows = list.map(r => [r.code, r.date, r.type, r.goodsName, r.goodsCode, r.qty, r.price, r.amount, r.fromWarehouse, r.toWarehouse, r.reason||'', r.note||'', r.status, r.operator]);
    exportTableToCSV(headers, rows, `仓库调拨列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast('调拨数据已导出', 'success');
  },

  init() {}
};
