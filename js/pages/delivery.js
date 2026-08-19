// ===========================
// 配送管理
// ===========================

const delivery = {
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
            <input type="text" placeholder="搜索配送单/客户..." value="${this.keyword}"
              oninput="delivery.keyword=this.value;delivery.page=1;delivery.reload()">
          </div>
          <select class="filter-select" value="${this.statusFilter}"
            onchange="delivery.statusFilter=this.value;delivery.page=1;delivery.reload()">
            <option value="">全部状态</option>
            <option value="待配送" ${this.statusFilter==='待配送'?'selected':''}>待配送</option>
            <option value="配送中" ${this.statusFilter==='配送中'?'selected':''}>配送中</option>
            <option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option>
            <option value="异常" ${this.statusFilter==='异常'?'selected':''}>异常</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="delivery.exportAll()">📥 导出</button>
          <button class="btn btn-primary" onclick="delivery.openAdd()">+ 新建配送单</button>
        </div>
      </div>
      <div class="card" id="deliveryCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('transportPlans');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.planNo || '').toLowerCase().includes(kw) || 
        (r.customerName || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) {
      list = list.filter(r => {
        if (this.statusFilter === '已完成') return r.status === '已签收';
        if (this.statusFilter === '待配送') return r.status === '待发货';
        if (this.statusFilter === '配送中') return r.status === '已发货' || r.status === '配送中';
        return r.status === this.statusFilter;
      });
    }
    list = list.sort((a, b) => (b.shipDate || '').localeCompare(a.shipDate || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-text">暂无配送数据</div></div>`;

    const statusMap = {
      '待发货': 'badge-warning',
      '已发货': 'badge-info',
      '配送中': 'badge-primary',
      '已签收': 'badge-success'
    };

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>配送单号</th><th>承运商</th><th>客户</th><th>地址</th><th>发货日期</th><th>运费</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = statusMap[r.status] || 'badge-default';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.planNo}</span></td>
            <td>${r.carrierName || '-'}</td>
            <td><strong>${r.customerName || '-'}</strong></td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.deliveryAddress || '-'}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.shipDate || '-'}</td>
            <td><span style="font-weight:600;color:var(--success)">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</span></td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="delivery.viewDetail(${r.id})">详情</button>
                <button class="btn btn-outline btn-sm" onclick="PrintManager.printDelivery(${r.id})">🖨 打印</button>
                ${r.status === '已签收' ? `<button class="btn btn-outline btn-sm" onclick="delivery.export(${r.id})">导出</button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'delivery.goPage')}`;
  },

  reload() {
    const card = document.getElementById('deliveryCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    toast('请通过【运输计划】模块创建配送单', 'info');
  },

  viewDetail(id) {
    const r = DB.findById('transportPlans', id);
    if (!r) return;

    openModal('配送详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">配送单号</div>
          <div style="font-weight:600;color:var(--primary)">${r.planNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">承运商</div>
          <div style="font-weight:500">${r.carrierName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">客户</div>
          <div style="font-weight:500">${r.customerName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">运费</div>
          <div style="font-weight:600;color:var(--success)">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</div>
        </div>
        <div style="grid-column:1/-1;background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">收货地址</div>
          <div style="font-weight:500">${r.deliveryAddress || '-'}</div>
        </div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
           <button class="btn btn-outline" onclick="PrintManager.printDelivery(${id})">🖨 打印</button>`
    );
  },

  export(id) {
    if (!hasPerm('delivery', 'export')) { toast('没有导出权限', 'error'); return; }
    const r = DB.findById('transportPlans', id);
    if (!r) return;

    let csv = '\uFEFF配送单号,承运商,客户,收货地址,发货日期,预计到达,实际到达,运费,状态\n';
    csv += `${r.planNo},${r.carrierName || ''},${r.customerName || ''},${r.deliveryAddress || ''},${r.shipDate || ''},${r.estimatedArrival || ''},${r.actualArrival || ''},${r.freightFee || 0},${r.status}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `配送单_${r.planNo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('配送单已导出', 'success');
  },

  // 导出全部配送单
  exportAll() {
    if (!hasPerm('delivery', 'export')) { toast('没有导出权限', 'error'); return; }
    let list = DB.get('transportPlans');
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => (r.planNo||'').toLowerCase().includes(kw) || (r.customerName||'').toLowerCase().includes(kw)); }
    if (this.statusFilter) { list = list.filter(r => { if (this.statusFilter==='已完成') return r.status==='已签收'; if (this.statusFilter==='待配送') return r.status==='待发货'; if (this.statusFilter==='配送中') return r.status==='已发货'||r.status==='配送中'; return r.status===this.statusFilter; }); }
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const headers = ['配送单号', '承运商', '客户', '地址', '发货日期', '预计到达', '实际到达', '运费', '状态'];
    const rows = list.map(r => [r.planNo, r.carrierName||'', r.customerName||'', r.deliveryAddress||'', r.shipDate||'', r.estimatedArrival||'', r.actualArrival||'', r.freightFee||0, r.status||'']);
    exportTableToCSV(headers, rows, `配送单列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条配送单`, 'success');
  }
};
