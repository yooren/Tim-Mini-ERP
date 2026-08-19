// ===========================
// 仓库管理模块
// ===========================

const warehouse = {
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
            <input type="text" placeholder="搜索仓库名称/编码..." value="${this.keyword}"
              oninput="warehouse.keyword=this.value;warehouse.page=1;warehouse.reload()">
          </div>
          <select class="filter-select" onchange="warehouse.statusFilter=this.value;warehouse.page=1;warehouse.reload()">
            <option value="">全部状态</option>
            <option value="1" ${this.statusFilter==='1'?'selected':''}>启用</option>
            <option value="0" ${this.statusFilter==='0'?'selected':''}>停用</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="warehouse.exportData()">📥 导出</button>
          <button class="btn btn-primary" onclick="warehouse.openAdd()">+ 新建仓库</button>
        </div>
      </div>
      <div class="card" id="warehouseCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('warehouses');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => (r.name||'').toLowerCase().includes(kw) || (r.code||'').toLowerCase().includes(kw));
    }
    if (this.statusFilter !== '') list = list.filter(r => r.status === +this.statusFilter);
    list = list.sort((a, b) => a.id - b.id);

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const paged = list.slice(start, start + this.pageSize);

    // 统计
    const allWarehouses = DB.get('warehouses');
    const activeCount = allWarehouses.filter(w => w.status === 1).length;
    const totalStock = DB.get('goods').reduce((s, g) => s + g.stock, 0);

    if (!total) return '<div class="empty-state"><div class="empty-state-icon">🏭</div><div class="empty-state-text">暂无仓库信息</div><button class="btn btn-primary" onclick="warehouse.openAdd()">创建第一个仓库</button></div>';

    return `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div class="stat-card" style="border-left:3px solid var(--primary);flex:1">
        <div style="font-size:11px;color:var(--text-muted)">仓库总数</div>
        <div style="font-size:24px;font-weight:700;color:var(--primary)">${allWarehouses.length}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #10b981;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">启用仓库</div>
        <div style="font-size:24px;font-weight:700;color:#10b981">${activeCount}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #f59e0b;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">总库存量</div>
        <div style="font-size:24px;font-weight:700;color:#f59e0b">${totalStock}</div>
      </div>
      <div class="stat-card" style="border-left:3px solid #8b5cf6;flex:1">
        <div style="font-size:11px;color:var(--text-muted)">商品种类</div>
        <div style="font-size:24px;font-weight:700;color:#8b5cf6">${DB.get('goods').filter(g=>g.status===1).length}</div>
      </div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr>
        <th>仓库编号</th><th>仓库名称</th><th>仓库代码</th><th>地址</th>
        <th>负责人</th><th>库存分布</th><th>状态</th><th>创建时间</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${paged.map(r => {
          const stockInfo = this.getWarehouseStock(r.id);
          return `
          <tr>
            <td style="font-family:monospace;color:var(--text-muted)">${r.id}</td>
            <td><span style="font-weight:600;color:var(--text)">${r.name}</span></td>
            <td><span style="font-family:monospace;color:var(--primary);background:rgba(79,110,247,0.08);padding:2px 8px;border-radius:4px;font-size:12px">${r.code}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${r.address || '-'}</td>
            <td style="font-size:12px">${r.manager || '-'}</td>
            <td>
              <div style="font-size:12px">
                <span style="color:var(--primary);font-weight:600">${stockInfo.skuCount}</span> 种商品 /
                <span style="color:#f59e0b;font-weight:600">${stockInfo.totalQty}</span> 件
              </div>
            </td>
            <td>${r.status === 1 ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-default">停用</span>'}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.createdAt || '-'}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="warehouse.viewDetail(${r.id})">详情</button>
                <button class="btn btn-outline btn-sm" onclick="warehouse.openEdit(${r.id})">编辑</button>
                <button class="btn btn-danger btn-sm" onclick="warehouse.delete(${r.id})">删除</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'warehouse.goPage')}`;
  },

  // 获取仓库库存统计
  getWarehouseStock(warehouseId) {
    const goods = DB.get('goods');
    let skuCount = 0;
    let totalQty = 0;
    goods.forEach(g => {
      const ws = g.warehouseStock || {};
      if (ws[warehouseId]) {
        skuCount++;
        totalQty += ws[warehouseId];
      }
    });
    return { skuCount, totalQty };
  },

  reload() {
    const card = document.getElementById('warehouseCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { warehouse.page = p; warehouse.reload(); },

  // 新建仓库
  openAdd() {
    if (!hasPerm('warehouse', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新建仓库', `
      <div class="form-row cols-2">
        <div class="form-item"><label>仓库名称 *</label><input id="whName" placeholder="如: 主仓库、华东仓"></div>
        <div class="form-item"><label>仓库代码 *</label><input id="whCode" placeholder="如: WH001"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>仓库地址</label><input id="whAddress" placeholder="仓库详细地址"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>负责人</label><input id="whManager" placeholder="仓库负责人姓名"></div>
        <div class="form-item"><label>联系电话</label><input id="whPhone" placeholder="仓库联系电话"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><textarea id="whNote" rows="2" placeholder="仓库说明（可选）"></textarea></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="warehouse.save()">创建仓库</button>
    `);
  },

  save() {
    const name = document.getElementById('whName').value.trim();
    const code = document.getElementById('whCode').value.trim();
    if (!name) { toast('请输入仓库名称', 'error'); return; }
    if (!code) { toast('请输入仓库代码', 'error'); return; }

    // 检查代码唯一性
    const existing = DB.get('warehouses');
    if (existing.find(w => w.code === code)) { toast('仓库代码已存在', 'error'); return; }

    DB.add('warehouses', {
      name,
      code,
      address: document.getElementById('whAddress').value.trim(),
      manager: document.getElementById('whManager').value.trim(),
      phone: document.getElementById('whPhone').value.trim(),
      note: document.getElementById('whNote').value.trim(),
      status: 1
    });

    audit.log('warehouse', '新建仓库', name, `代码: ${code}`);
    closeModal();
    toast('仓库创建成功！', 'success');
    this.reload();
  },

  // 编辑仓库
  openEdit(id) {
    if (!hasPerm('warehouse', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const w = DB.findById('warehouses', id);
    if (!w) return;

    openModal('编辑仓库', `
      <div class="form-row cols-2">
        <div class="form-item"><label>仓库名称 *</label><input id="ewhName" value="${w.name}"></div>
        <div class="form-item"><label>仓库代码</label><input id="ewhCode" value="${w.code}" readonly style="background:var(--bg)"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>仓库地址</label><input id="ewhAddress" value="${w.address||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>负责人</label><input id="ewhManager" value="${w.manager||''}"></div>
        <div class="form-item"><label>联系电话</label><input id="ewhPhone" value="${w.phone||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>状态</label>
          <select id="ewhStatus">
            <option value="1" ${w.status===1?'selected':''}>启用</option>
            <option value="0" ${w.status===0?'selected':''}>停用</option>
          </select>
        </div>
        <div class="form-item"><label>备注</label><input id="ewhNote" value="${w.note||''}"></div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="warehouse.saveEdit(${id})">保存</button>
    `);
  },

  saveEdit(id) {
    const name = document.getElementById('ewhName').value.trim();
    if (!name) { toast('请输入仓库名称', 'error'); return; }

    DB.update('warehouses', id, {
      name,
      address: document.getElementById('ewhAddress').value.trim(),
      manager: document.getElementById('ewhManager').value.trim(),
      phone: document.getElementById('ewhPhone').value.trim(),
      status: +document.getElementById('ewhStatus').value,
      note: document.getElementById('ewhNote').value.trim()
    });

    audit.log('warehouse', '编辑仓库', name, `ID: ${id}`);
    closeModal();
    toast('仓库信息已更新', 'success');
    this.reload();
  },

  // 查看详情（含库存分布）
  viewDetail(id) {
    const w = DB.findById('warehouses', id);
    if (!w) return;
    const stockInfo = this.getWarehouseStock(id);
    const stockDetail = this.getWarehouseStockDetail(id);

    openModal(`仓库详情 - ${w.name}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div><div style="font-size:11px;color:var(--text-muted)">仓库编号</div><div style="font-weight:600">${w.id}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">仓库代码</div><div style="font-family:monospace;color:var(--primary);font-weight:600">${w.code}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">地址</div><div>${w.address||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">负责人</div><div>${w.manager||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">联系电话</div><div>${w.phone||'-'}</div></div>
        <div><div style="font-size:11px;color:var(--text-muted)">状态</div><div>${w.status===1?'<span class="badge badge-success">启用</span>':'<span class="badge badge-default">停用</span>'}</div></div>
      </div>
      <div style="background:var(--bg);border-radius:10px;padding:16px;margin-bottom:16px">
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">📦 库存统计</div>
        <div style="display:flex;gap:20px">
          <div><span style="font-size:24px;font-weight:700;color:var(--primary)">${stockInfo.skuCount}</span><span style="font-size:12px;color:var(--text-muted);margin-left:4px">种商品</span></div>
          <div><span style="font-size:24px;font-weight:700;color:#f59e0b">${stockInfo.totalQty}</span><span style="font-size:12px;color:var(--text-muted);margin-left:4px">件库存</span></div>
        </div>
      </div>
      ${stockDetail.length ? `
        <div style="font-size:14px;font-weight:600;margin-bottom:12px">📋 库存明细</div>
        <div style="max-height:300px;overflow-y:auto">
          <table style="width:100%;font-size:12px">
            <thead><tr style="background:var(--bg)"><th style="padding:8px;text-align:left">商品编码</th><th style="padding:8px;text-align:left">商品名称</th><th style="padding:8px;text-align:right">库存数量</th></tr></thead>
            <tbody>
              ${stockDetail.map(s => `<tr style="border-bottom:1px solid var(--border)"><td style="padding:8px;font-family:monospace">${s.code}</td><td style="padding:8px">${s.name}</td><td style="padding:8px;text-align:right;font-weight:600;color:var(--primary)">${s.qty}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div style="text-align:center;padding:20px;color:var(--text-muted)">暂无库存</div>'}
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">关闭</button>
    `);
  },

  // 获取仓库库存明细
  getWarehouseStockDetail(warehouseId) {
    const goods = DB.get('goods');
    const result = [];
    goods.forEach(g => {
      const ws = g.warehouseStock || {};
      if (ws[warehouseId] && ws[warehouseId] > 0) {
        result.push({ code: g.code, name: g.name, qty: ws[warehouseId] });
      }
    });
    return result.sort((a, b) => b.qty - a.qty);
  },

  // 删除仓库
  delete(id) {
    if (!hasPerm('warehouse', 'delete')) { toast('没有删除权限', 'error'); return; }
    const w = DB.findById('warehouses', id);
    if (!w) return;

    // 检查是否有库存
    const stockInfo = this.getWarehouseStock(id);
    if (stockInfo.totalQty > 0) {
      toast('该仓库还有库存，无法删除！请先转移库存。', 'error');
      return;
    }

    // 检查是否有调拨记录
    const transfers = DB.get('transfers');
    const hasTransfers = transfers.some(t => t.fromWarehouseId === id || t.toWarehouseId === id);
    if (hasTransfers) {
      toast('该仓库有调拨记录，无法删除！', 'error');
      return;
    }

    openModal('确认删除', `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:12px">⚠️</div>
        <div style="font-size:15px;font-weight:600">确定删除仓库「${w.name}」？</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:6px">此操作不可恢复</div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-danger" onclick="warehouse.confirmDelete(${id})">确认删除</button>
    `);
  },

  confirmDelete(id) {
    DB.delete('warehouses', id);
    audit.log('warehouse', '删除仓库', `ID: ${id}`, '');
    closeModal();
    toast('仓库已删除', 'warning');
    this.reload();
  },

  // 导出
  exportData() {
    if (!hasPerm('warehouse', 'export')) { toast('没有导出权限', 'error'); return; }
    let list = DB.get('warehouses');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => (r.name||'').toLowerCase().includes(kw) || (r.code||'').toLowerCase().includes(kw));
    }
    if (this.statusFilter !== '') list = list.filter(r => r.status === +this.statusFilter);

    const headers = ['仓库ID', '仓库名称', '仓库代码', '地址', '负责人', '联系电话', '状态', '备注', '创建时间'];
    const rows = list.map(r => [r.id, r.name, r.code, r.address||'', r.manager||'', r.phone||'', r.status===1?'启用':'停用', r.note||'', r.createdAt||'']);
    exportTableToCSV(headers, rows, `仓库列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast('仓库数据已导出', 'success');
  },

  init() {}
};
