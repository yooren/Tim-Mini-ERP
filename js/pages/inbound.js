// ===========================
// 入库管理
// ===========================

const inbound = {
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
            <input type="text" placeholder="搜索单号/商品名..." value="${this.keyword}"
              oninput="inbound.keyword=this.value;inbound.page=1;inbound.reload()">
          </div>
          <input type="month" class="filter-select" value="${this.dateFilter}"
            onchange="inbound.dateFilter=this.value;inbound.page=1;inbound.reload()">
          <select class="filter-select" value="${this.statusFilter}"
            onchange="inbound.statusFilter=this.value;inbound.page=1;inbound.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="待审核" ${this.statusFilter==='待审核'?'selected':''}>待审核</option>
            <option value="已审核" ${this.statusFilter==='已审核'?'selected':''}>已审核</option>
            <option value="已驳回" ${this.statusFilter==='已驳回'?'selected':''}>已驳回</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="inbound.exportData()">📥 导出</button>
          <button class="btn btn-outline" onclick="inbound.openReturn()">↩️ 退货入库</button>
          <button class="btn btn-primary" onclick="inbound.openAdd()">+ 新建入库单</button>
        </div>
      </div>
      <div class="card" id="inboundCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('inbounds');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => r.code.toLowerCase().includes(kw) || r.goodsName.toLowerCase().includes(kw) || r.supplierName.toLowerCase().includes(kw));
    }
    if (this.dateFilter) list = list.filter(r => r.date.startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => (r.status || '已完成') === this.statusFilter);
    list = list.sort((a, b) => b.date.localeCompare(a.date));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📥</div><div class="empty-state-text">暂无入库记录</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>入库单号</th><th>类型</th><th>商品名称</th><th>商品编码</th>
        <th>入库数量</th><th>设备编号</th><th>单价</th><th>入库金额</th>
        <th>供应商</th><th>入库日期</th><th>操作员</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const st = r.status || '已完成';
          const badge = st === '待审核' ? 'badge-warning' : st === '已驳回' ? 'badge-danger' : 'badge-success';
          const typeTag = r.type === '退货入库'
            ? '<span class="badge badge-default" style="background:rgba(251,146,60,0.12);color:#ea580c">退货入库</span>'
            : '<span class="badge badge-default" style="background:rgba(16,185,129,0.12);color:#059669">采购入库</span>';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.code}</span></td>
            <td>${typeTag}</td>
            <td style="font-weight:600">${r.goodsName}</td>
            <td><span style="font-size:12px;color:var(--text-muted)">${r.goodsCode}</span></td>
            <td><span style="font-weight:700;color:var(--success)">+${r.qty}</span></td>
            <td>${r.equipSerials && r.equipSerials.length > 0 ? `<span style="font-size:12px;color:var(--warning)">📋 ${r.equipSerials.filter(Boolean).length}/${r.qty}</span>` : '<span style="font-size:12px;color:var(--text-muted)">-</span>'}</td>
            <td>${fmtMoney(r.price)}</td>
            <td style="font-weight:600">${fmtMoney(r.total)}</td>
            <td>${r.type === '退货入库' ? (r.customerName || '-') : (r.supplierName || '-')}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
            <td><span style="font-size:12px">${r.operator}</span></td>
            <td><span class="badge ${badge}">${st}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="inbound.view(${r.id})">👁 查看</button>
                <button class="btn btn-ghost btn-sm" onclick="inbound.edit(${r.id})">✏️ 编辑</button>
                ${st === '待审核' && currentUser.role === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="inbound.approve(${r.id})">✅ 审核</button>` : ''}
                ${st === '已审核' ? `<button class="btn btn-outline btn-sm" onclick="inbound.printOrder(${r.id})">🖨 打印</button>${r.type==='退货入库'?`<button class="btn btn-outline btn-sm" onclick="PrintManager.printSalesOrder(${r.id},'inbound')">📄 退单</button>`:''}` : ''}
                <button class="btn btn-danger btn-sm" onclick="inbound.del(${r.id})">🗑 删除</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'inbound.goPage')}`;
  },

  reload() {
    const card = document.getElementById('inboundCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { inbound.page = p; inbound.reload(); },
  init() {},

  // 扫码枪选择商品：自动填入第一个还没选商品的行，都填满了就新增一行
  scanGoods() {
    const btn = document.getElementById('ibScanBtn');
    if (BarcodeScanner.isActive()) {
      BarcodeScanner.deactivate();
      if (btn) btn.classList.remove('active');
      return;
    }
    BarcodeScanner.activate((code, match) => {
      BarcodeScanner.deactivate();
      if (btn) btn.classList.remove('active');
      if (match) {
        let targetRowId = null;
        const selects = document.querySelectorAll('.ib-goods-select');
        for (const sel of selects) {
          if (!sel.value) { targetRowId = sel.dataset.row; break; }
        }
        if (targetRowId === null) {
          this.addGoodsRow();
          targetRowId = String(this._goodsRowCount);
        }
        const select = document.querySelector(`.ib-goods-select[data-row="${targetRowId}"]`);
        if (select) {
          select.value = match.id;
          this.onGoodsRowChange(parseInt(targetRowId));
          toast(`扫码添加: ${match.name}`, 'success');
        }
      } else {
        toast(`未找到条码 ${code} 对应的商品`, 'error');
      }
    });
    if (btn) btn.classList.add('active');
    toast('扫码就绪，请扫描商品条码...');
  },

  openAdd() {
    if (!hasPerm('inbound', 'create')) { toast('没有新建权限', 'error'); return; }
    const goodsList = DB.get('goods').filter(g => g.status === 1);
    const categories = DB.get('categories') || [];
    const suppliers = DB.get('suppliers');
    const warehouses = DB.get('warehouses').filter(w => w.status === 1);
    const today = new Date().toISOString().slice(0,10);
    const code = DB.genCode('IN');
    this._goodsRowCount = 0;

    const goodsOptionsHtml = (g) => `<option value="${g.id}" data-cost="${g.cost}" data-name="${g.name}" data-code="${g.code}" data-unit="${g.unit||''}" data-stock="${g.stock}" data-cat="${categories.find(c=>c.id===g.category)?.name||''}">${g.code} - ${g.name} (库存:${g.stock}${g.unit})</option>`;

    openModal('新建入库单', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>入库单号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
        <span style="float:right;font-size:12px;color:var(--text-muted)">支持一次入库多个商品</span>
      </div>
      <div class="form-row cols-3" style="margin-bottom:16px">
        <div class="form-item"><label>入库仓库 *</label>
          <select id="ibWarehouse">
            <option value="">-- 请选择仓库 --</option>
            ${warehouses.map(w => `<option value="${w.id}" data-name="${w.name}">${w.name} (${w.code})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>供应商</label>
          <select id="ibSupplier">
            <option value="">请选择</option>
            ${suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>入库日期</label><input id="ibDate" type="date" value="${today}"></div>
      </div>

      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-weight:600;font-size:14px">📦 商品明细 <span style="font-weight:normal;font-size:12px;color:var(--text-muted)">（点击选择商品 / 支持扫码）</span></label>
          <div style="display:flex;gap:6px">
            <button type="button" class="scan-btn" id="ibScanBtn" onclick="inbound.scanGoods()">📷 扫码</button>
            <button class="btn btn-outline btn-sm" onclick="inbound.addGoodsRow()">+ 添加商品</button>
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:13px" id="ibGoodsTable">
            <thead style="background:var(--bg)">
              <tr>
                <th style="padding:10px 8px;text-align:left;width:40px">#</th>
                <th style="padding:10px 8px;text-align:left;min-width:200px">商品</th>
                <th style="padding:10px 8px;text-align:center;width:90px">当前库存</th>
                <th style="padding:10px 8px;text-align:center;width:100px">数量</th>
                <th style="padding:10px 8px;text-align:right;width:110px">单价</th>
                <th style="padding:10px 8px;text-align:right;width:120px">金额</th>
                <th style="padding:10px 8px;text-align:center;width:50px">操作</th>
              </tr>
            </thead>
            <tbody id="ibGoodsTableBody">
              <tr id="ibGoodsRow0" class="ib-goods-row">
                <td style="padding:8px;text-align:center;color:var(--text-muted)">1</td>
                <td style="padding:6px 4px">
                  <select class="ib-goods-select" data-row="0" onchange="inbound.onGoodsRowChange(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px">
                    <option value="">-- 选择商品 --</option>
                    ${goodsList.map(goodsOptionsHtml).join('')}
                  </select>
                  <div id="ibEquipArea0" style="display:none;margin-top:6px;background:#fff8f0;border:1px solid var(--warning);border-radius:6px;padding:8px">
                    <div style="font-size:11px;color:var(--warning);margin-bottom:6px;font-weight:500">📋 设备编号（每台一个，可先留空后续补录）</div>
                    <div id="ibEquipSerials0" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px"></div>
                  </div>
                </td>
                <td style="padding:6px 4px;text-align:center"><span class="ib-stock" data-row="0" style="color:var(--text-muted)">-</span></td>
                <td style="padding:6px 4px"><input type="number" class="ib-qty" data-row="0" min="1" value="1" oninput="inbound.onQtyRowChange(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:center"></td>
                <td style="padding:6px 4px"><input type="number" class="ib-price" data-row="0" min="0" step="0.01" value="0" oninput="inbound.calcRowTotal(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:right"></td>
                <td style="padding:6px 4px;text-align:right"><span class="ib-total" data-row="0" style="color:var(--primary);font-weight:600">¥0.00</span></td>
                <td style="padding:6px 4px;text-align:center">
                  <button class="btn btn-ghost btn-sm" onclick="inbound.removeGoodsRow(0)" style="opacity:0.4" disabled>×</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:flex-end;align-items:center;margin-top:8px;padding:8px 12px;background:var(--primary-light);border-radius:6px">
          <span style="font-size:13px;color:var(--text-muted)">合计：</span>
          <span id="ibGrandTotal" style="font-size:18px;font-weight:700;color:var(--primary);margin-left:8px">¥0.00</span>
          <span id="ibTotalQty" style="font-size:13px;color:var(--text-muted);margin-left:8px">(0 件)</span>
        </div>
      </div>

      <div class="form-item"><label>备注</label><input id="ibNote" placeholder="入库原因/采购单号等"></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="inbound.save('${code}')">提交入库单</button>`
    );
  },

  // 商品行计数器
  _goodsRowCount: 0,

  // 添加商品行
  addGoodsRow() {
    const goodsList = DB.get('goods').filter(g => g.status === 1);
    const categories = DB.get('categories') || [];
    const tbody = document.getElementById('ibGoodsTableBody');
    const rowId = ++inbound._goodsRowCount;
    const rowCount = tbody.children.length + 1;

    const tr = document.createElement('tr');
    tr.id = `ibGoodsRow${rowId}`;
    tr.className = 'ib-goods-row';
    tr.innerHTML = `
      <td style="padding:8px;text-align:center;color:var(--text-muted)">${rowCount}</td>
      <td style="padding:6px 4px">
        <select class="ib-goods-select" data-row="${rowId}" onchange="inbound.onGoodsRowChange(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px">
          <option value="">-- 选择商品 --</option>
          ${goodsList.map(g=>`<option value="${g.id}" data-cost="${g.cost}" data-name="${g.name}" data-code="${g.code}" data-unit="${g.unit||''}" data-stock="${g.stock}" data-cat="${categories.find(c=>c.id===g.category)?.name||''}">${g.code} - ${g.name} (库存:${g.stock}${g.unit})</option>`).join('')}
        </select>
        <div id="ibEquipArea${rowId}" style="display:none;margin-top:6px;background:#fff8f0;border:1px solid var(--warning);border-radius:6px;padding:8px">
          <div style="font-size:11px;color:var(--warning);margin-bottom:6px;font-weight:500">📋 设备编号（每台一个，可先留空后续补录）</div>
          <div id="ibEquipSerials${rowId}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px"></div>
        </div>
      </td>
      <td style="padding:6px 4px;text-align:center"><span class="ib-stock" data-row="${rowId}" style="color:var(--text-muted)">-</span></td>
      <td style="padding:6px 4px"><input type="number" class="ib-qty" data-row="${rowId}" min="1" value="1" oninput="inbound.onQtyRowChange(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:center"></td>
      <td style="padding:6px 4px"><input type="number" class="ib-price" data-row="${rowId}" min="0" step="0.01" value="0" oninput="inbound.calcRowTotal(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:right"></td>
      <td style="padding:6px 4px;text-align:right"><span class="ib-total" data-row="${rowId}" style="color:var(--primary);font-weight:600">¥0.00</span></td>
      <td style="padding:6px 4px;text-align:center">
        <button class="btn btn-ghost btn-sm" onclick="inbound.removeGoodsRow(${rowId})" style="color:var(--danger)">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  },

  // 移除商品行
  removeGoodsRow(rowId) {
    const rows = document.querySelectorAll('.ib-goods-row');
    if (rows.length <= 1) {
      toast('至少需要保留一行商品', 'warning');
      return;
    }
    const row = document.getElementById(`ibGoodsRow${rowId}`);
    if (row) {
      row.remove();
      document.querySelectorAll('.ib-goods-row').forEach((r, i) => {
        r.querySelector('td').textContent = i + 1;
      });
      inbound.calcGrandTotal();
    }
  },

  // 商品行变更：带出成本价/库存，供应商未选时自动带出该商品的默认供应商，设备类商品展开编号录入区
  onGoodsRowChange(rowId) {
    const select = document.querySelector(`.ib-goods-select[data-row="${rowId}"]`);
    if (!select) return;
    const option = select.options[select.selectedIndex];
    const stockSpan = document.querySelector(`.ib-stock[data-row="${rowId}"]`);
    const priceInput = document.querySelector(`.ib-price[data-row="${rowId}"]`);
    const equipArea = document.getElementById(`ibEquipArea${rowId}`);

    if (option.value) {
      stockSpan.textContent = option.dataset.stock;
      priceInput.value = option.dataset.cost;

      const gid = parseInt(option.value);
      const g = DB.findById('goods', gid);
      const supplierSel = document.getElementById('ibSupplier');
      if (g && g.supplierId && supplierSel && !supplierSel.value) {
        supplierSel.value = g.supplierId;
      }

      const isEquipment = (option.dataset.cat || '').includes('设备');
      if (isEquipment && equipArea) {
        equipArea.style.display = 'block';
        inbound.renderEquipInputs(rowId);
      } else if (equipArea) {
        equipArea.style.display = 'none';
      }
    } else {
      stockSpan.textContent = '-';
      priceInput.value = '0';
      if (equipArea) equipArea.style.display = 'none';
    }
    inbound.calcRowTotal(rowId);
  },

  // 数量变化：重算金额，设备类商品同步重新生成对应数量的编号输入框
  onQtyRowChange(rowId) {
    inbound.calcRowTotal(rowId);
    const equipArea = document.getElementById(`ibEquipArea${rowId}`);
    if (equipArea && equipArea.style.display !== 'none') {
      inbound.renderEquipInputs(rowId);
    }
  },

  renderEquipInputs(rowId) {
    const qty = +document.querySelector(`.ib-qty[data-row="${rowId}"]`)?.value || 0;
    const container = document.getElementById(`ibEquipSerials${rowId}`);
    if (!container) return;
    let html = '';
    for (let i = 1; i <= qty; i++) {
      html += `<input type="text" id="ibEquip${rowId}_${i}" placeholder="设备${i}编号（选填）" style="padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">`;
    }
    container.innerHTML = html;
  },

  // 计算单行金额
  calcRowTotal(rowId) {
    const qtyInput = document.querySelector(`.ib-qty[data-row="${rowId}"]`);
    const priceInput = document.querySelector(`.ib-price[data-row="${rowId}"]`);
    const totalSpan = document.querySelector(`.ib-total[data-row="${rowId}"]`);
    if (!qtyInput || !priceInput || !totalSpan) return;
    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    totalSpan.textContent = '¥' + (qty * price).toFixed(2);
    inbound.calcGrandTotal();
  },

  // 计算合计金额
  calcGrandTotal() {
    let grandTotal = 0, totalQty = 0;
    document.querySelectorAll('.ib-total').forEach(el => {
      grandTotal += parseFloat(el.textContent.replace('¥', '')) || 0;
    });
    document.querySelectorAll('.ib-qty').forEach(el => {
      totalQty += parseFloat(el.value) || 0;
    });
    document.getElementById('ibGrandTotal').textContent = '¥' + grandTotal.toFixed(2);
    document.getElementById('ibTotalQty').textContent = `(${totalQty} 件)`;
  },

  save(code) {
    // 收集所有商品行；一次提交按行拆分成多张入库单（各自独立审核/追溯），
    // 第一行沿用弹窗里展示的单号，其余行各自生成新单号
    const rows = document.querySelectorAll('.ib-goods-row');
    const items = [];

    for (const row of rows) {
      const rowId = row.id.replace('ibGoodsRow', '');
      const select = document.querySelector(`.ib-goods-select[data-row="${rowId}"]`);
      const qtyInput = document.querySelector(`.ib-qty[data-row="${rowId}"]`);
      const priceInput = document.querySelector(`.ib-price[data-row="${rowId}"]`);
      const equipContainer = document.getElementById(`ibEquipSerials${rowId}`);

      if (!select || !select.value) continue;

      const gid = parseInt(select.value);
      const qty = parseFloat(qtyInput.value) || 0;
      const price = parseFloat(priceInput.value) || 0;

      if (qty <= 0) {
        toast(`商品 "${select.options[select.selectedIndex].dataset.name}" 数量必须大于0`, 'error');
        return;
      }

      const g = DB.findById('goods', gid);
      if (!g) continue;

      let equipSerials = [];
      if (equipContainer) {
        equipSerials = Array.from(equipContainer.querySelectorAll('input[type="text"]')).map(inp => inp.value.trim());
      }

      items.push({ gid, g, qty, price, total: qty * price, equipSerials: equipSerials.length ? equipSerials : null });
    }

    if (items.length === 0) {
      toast('请至少添加一个商品', 'error');
      return;
    }

    const whSel = document.getElementById('ibWarehouse');
    const warehouseId = +whSel.value;
    if (!warehouseId) { toast('请选择入库仓库', 'error'); return; }
    const warehouseName = whSel.options[whSel.selectedIndex].dataset.name;

    const sid = +document.getElementById('ibSupplier').value;
    const supplier = sid ? DB.findById('suppliers', sid) : null;
    const date = document.getElementById('ibDate').value;
    const note = document.getElementById('ibNote').value;

    items.forEach((item, idx) => {
      const itemCode = idx === 0 ? code : DB.genCode('IN');
      DB.add('inbounds', {
        code: itemCode,
        goodsId: item.gid,
        goodsName: item.g.name,
        goodsCode: item.g.code,
        qty: item.qty,
        price: item.price,
        total: item.total,
        supplierId: sid || null,
        supplierName: supplier ? supplier.name : '无',
        operator: currentUser.username,
        note,
        status: '待审核',
        date,
        equipSerials: item.equipSerials,
        warehouseId,
        warehouseName
      });
      audit.log('inbound', '新建入库单', item.g.name, `单号: ${itemCode}, 数量: +${item.qty}${item.g.unit}, 仓库: ${warehouseName}, 金额: ${fmtMoney(item.total)}, 状态: 待审核`);
    });

    closeModal();
    const totalAmount = items.reduce((s, i) => s + i.total, 0);
    toast(`入库单已提交，等待审核！共 ${items.length} 个商品，合计: ${fmtMoney(totalAmount)}`, 'success');
    this.reload();
    updateWarningBadge();
  },

  // 编辑入库单
  edit(id) {
    if (!hasPerm('inbound', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('inbounds', id);
    if (!r) return;
    this.editingId = id;
    openModal('编辑入库单', `
      <div class="form-group">
        <label>商品</label>
        <select id="editInboundGoods" class="form-control">
          ${DB.get('goods').map(g => `<option value="${g.id}" ${g.id === r.goodsId ? 'selected' : ''}>${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>入库数量</label>
        <input type="number" id="editInboundQty" class="form-control" value="${r.qty}" min="1">
      </div>
      <div class="form-group">
        <label>入库类型</label>
        <select id="editInboundType" class="form-control">
          <option value="采购入库" ${r.type === '采购入库' ? 'selected' : ''}>采购入库</option>
          <option value="退货入库" ${r.type === '退货入库' ? 'selected' : ''}>退货入库</option>
          <option value="调拨入库" ${r.type === '调拨入库' ? 'selected' : ''}>调拨入库</option>
          <option value="其他入库" ${r.type === '其他入库' ? 'selected' : ''}>其他入库</option>
        </select>
      </div>
      <div class="form-group">
        <label>供应商</label>
        <select id="editInboundSupplier" class="form-control">
          ${DB.get('suppliers').map(s => `<option value="${s.id}" ${s.id === r.supplierId ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="editInboundNote" class="form-control" rows="2">${r.note || ''}</textarea>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="inbound.saveEdit()">保存修改</button>`
    );
  },

  saveEdit() {
    const goodsId = +$('#editInboundGoods').value;
    const qty = +$('#editInboundQty').value;
    const type = $('#editInboundType').value;
    const supplierId = +$('#editInboundSupplier').value;
    const note = $('#editInboundNote').value.trim();
    if (!qty || qty <= 0) return toast('请输入有效数量', 'error');
    const goods = DB.findById('goods', goodsId);
    const supplier = DB.findById('suppliers', supplierId);
    const r = DB.findById('inbounds', this.editingId);
    if (!r) return;

    // 已审核单据的原数量已计入库存：先按旧数量/旧商品回滚，再按新数量/新商品重新计入，
    // 否则总库存与仓库分布会与单据显示的数量脱节
    if (r.status === '已审核') {
      const oldGoods = DB.findById('goods', r.goodsId);
      if (oldGoods) {
        const revert = { stock: Math.max(0, (oldGoods.stock || 0) - r.qty) };
        if (r.warehouseId) {
          const ws = oldGoods.warehouseStock || {};
          ws[r.warehouseId] = Math.max(0, (ws[r.warehouseId] || 0) - r.qty);
          revert.warehouseStock = ws;
        }
        DB.update('goods', r.goodsId, revert);
      }
      const newGoods = DB.findById('goods', goodsId); // 若与旧商品相同，此时已是回滚后的最新值
      if (newGoods) {
        const apply = { stock: (newGoods.stock || 0) + qty };
        if (r.warehouseId) {
          const ws = newGoods.warehouseStock || {};
          ws[r.warehouseId] = (ws[r.warehouseId] || 0) + qty;
          apply.warehouseStock = ws;
        }
        DB.update('goods', goodsId, apply);
      }
      updateWarningBadge();
    }

    r.goodsId = goodsId;
    r.goodsName = goods.name;
    r.goodsCode = goods.code;
    r.qty = qty;
    r.total = qty * (r.price || 0);
    r.type = type;
    r.supplierId = supplierId;
    r.supplierName = supplier.name;
    r.note = note;
    DB.update('inbounds', r.id, r);
    audit.log('inbound', '编辑入库单', goods.name, `单号: ${r.code}, 数量: +${qty}, 操作人: ${currentUser.username}`);
    closeModal();
    toast('入库单已更新', 'success');
    this.editingId = null;
    this.reload();
  },

  // 删除入库单
  del(id) {
    if (!hasPerm('inbound', 'delete')) { toast('没有删除权限', 'error'); return; }
    const r = DB.findById('inbounds', id);
    if (!r) return;
    openModal('删除确认', `
      <div style="text-align:center;padding:16px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">🗑</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认删除此入库单？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: <strong>${r.code}</strong> | 商品: ${r.goodsName} | 数量: +${r.qty}</div>
        <div style="font-size:12px;color:var(--danger);margin-top:12px">⚠️ 删除后不可恢复</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="inbound.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    // 如果单据已审核，删除时需要扣减库存（含分仓库存，避免仓库维度与总库存脱节）
    if (r.status === '已审核') {
      const goods = DB.findById('goods', r.goodsId);
      if (goods) {
        const revert = { stock: Math.max(0, (goods.stock || 0) - r.qty) };
        if (r.warehouseId) {
          const ws = goods.warehouseStock || {};
          ws[r.warehouseId] = Math.max(0, (ws[r.warehouseId] || 0) - r.qty);
          revert.warehouseStock = ws;
        }
        DB.update('goods', goods.id, revert);
        updateWarningBadge();
      }
    }
    DB.delete('inbounds', id);
    audit.log('inbound', '删除入库单', r.goodsName, `单号: ${r.code}, 数量: -${r.qty}, 操作人: ${currentUser.username}`);
    closeModal();
    toast('入库单已删除，库存已同步更新', 'success');
    this.reload();
  },

  // 审核通过
  approve(id) {
    if (!hasPerm('inbound', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('inbounds', id);
    if (!r) return;
    openModal('审核入库单', `
      <div style="text-align:center;padding:16px 0">
        <div style="width:64px;height:64px;background:rgba(79,110,247,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">📋</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确认审核通过？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: <strong>${r.code}</strong> | 商品: ${r.goodsName} | 数量: +${r.qty}</div>
      </div>
      <div class="form-item" style="margin-top:8px">
        <label>审核备注（可选）</label>
        <input id="approveNoteIn" placeholder="审核意见">
      </div>`,
      `<button class="btn btn-danger" onclick="inbound.reject(${id})">❌ 驳回</button>
       <button class="btn btn-primary" onclick="inbound.confirmApprove(${id})">✅ 审核通过</button>`
    );
  },

  confirmApprove(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    const note = document.getElementById('approveNoteIn')?.value || '';
    const g = DB.findById('goods', r.goodsId);

    // 更新状态为已审核
    DB.update('inbounds', id, { status: '已审核', reviewedBy: currentUser.username, reviewedAt: new Date().toISOString().slice(0,16), reviewNote: note });

    // 审核通过后更新库存（仅在首次审核时）
    if (g) {
      const updateData = { stock: g.stock + r.qty };
      // 更新仓库库存
      if (r.warehouseId) {
        const ws = g.warehouseStock || {};
        ws[r.warehouseId] = (ws[r.warehouseId] || 0) + r.qty;
        updateData.warehouseStock = ws;
      }
      DB.update('goods', r.goodsId, updateData);
      updateWarningBadge();
    }

    // 设备入库：注册设备编号到设备台账（入库单有设备编号就注册，不检查分类）
    let equipRegistered = 0;
    if (r.equipSerials && r.equipSerials.length > 0) {
      if (!localStorage.getItem('equipmentRegistry')) localStorage.setItem('equipmentRegistry', '[]');
      const registry = DB.get('equipmentRegistry') || [];
      r.equipSerials.forEach(serial => {
        if (serial && serial.trim()) {
          // 检查是否已存在
          if (!registry.find(e => e.serial === serial.trim())) {
            registry.push({
              id: DB.nextId('equipmentRegistry'),
              serial: serial.trim(),
              goodsId: parseInt(r.goodsId),
              goodsName: r.goodsName,
              goodsCode: r.goodsCode,
              inboundCode: r.code,
              inboundDate: r.date,
              supplierId: r.supplierId,
              supplierName: r.supplierName || '',
              status: 'available', // available:可用, used:已出库
              usedOutboundCode: null,
              usedDate: null,
              createdAt: new Date().toISOString()
            });
            equipRegistered++;
          }
        }
      });
      localStorage.setItem('equipmentRegistry', JSON.stringify(registry));
    }

    audit.log('inbound', '审核通过', r.goodsName, `单号: ${r.code}, 数量: +${r.qty}, 审核人: ${currentUser.username}`);
    closeModal();
    const equipMsg = equipRegistered > 0 ? ` | 已注册 ${equipRegistered} 台设备` : '';
    toast(`审核通过！${r.goodsName} +${r.qty}${equipMsg}`, 'success');
    this.reload();
  },

  // 驳回
  reject(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    openModal('驳回入库单', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认驳回此入库单？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: ${r.code} | 商品: ${r.goodsName}</div>
      </div>
      <div class="form-item" style="margin-top:8px">
        <label>驳回原因 *</label>
        <input id="rejectNoteIn" placeholder="请填写驳回原因">
      </div>`,
      `<button class="btn btn-ghost" onclick="inbound.approve(${id})">返回</button>
       <button class="btn btn-danger" onclick="inbound.confirmReject(${id})">确认驳回</button>`
    );
  },

  confirmReject(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    const note = document.getElementById('rejectNoteIn')?.value || '';
    if (!note) { toast('请填写驳回原因', 'error'); return; }

    DB.update('inbounds', id, { status: '已驳回', reviewedBy: currentUser.username, reviewedAt: new Date().toISOString().slice(0,16), reviewNote: note });

    audit.log('inbound', '驳回', r.goodsName, `单号: ${r.code}, 驳回原因: ${note}`);
    closeModal();
    toast('入库单已驳回', 'warning');
    this.reload();
  },

  // 退货入库
  openReturn() {
    if (!hasPerm('inbound', 'create')) { toast('没有新建权限', 'error'); return; }
    const goodsList = DB.get('goods').filter(g => g.status === 1);
    const customers = DB.get('customers');
    const today = new Date().toISOString().slice(0,10);
    const code = DB.genCode('IN-R');

    openModal('退货入库', `
      <div style="background:rgba(251,146,60,0.08);border:1px solid rgba(251,146,60,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>退货入库单号：</strong><span style="color:#ea580c;font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>选择商品 *</label>
          <select id="ibReturnGoods" onchange="inbound.onReturnGoodsChange()">
            <option value="">-- 请选择商品 --</option>
            ${goodsList.map(g=>`<option value="${g.id}">${g.code} - ${g.name} (库存:${g.stock}${g.unit})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>退货客户 *</label>
          <select id="ibReturnCustomer">
            <option value="">请选择</option>
            ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="ibReturnGoodsInfo" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;display:none">
        当前库存: <strong id="ibReturnCurrentStock">0</strong> | 成本价: <span id="ibReturnCostPrice">-</span>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>退货数量 *</label><input id="ibReturnQty" type="number" min="1" value="1" oninput="inbound.calcReturnTotal()"></div>
        <div class="form-item"><label>退货单价(¥)</label><input id="ibReturnPrice" type="number" min="0" step="0.01" value="0" oninput="inbound.calcReturnTotal()"></div>
        <div class="form-item"><label>退货金额</label><input id="ibReturnTotal" readonly style="background:#f0f2f8;color:var(--success);font-weight:600" value="¥0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>退货日期</label><input id="ibReturnDate" type="date" value="${today}"></div>
        <div class="form-item"><label>退货原因</label>
          <select id="ibReturnReason">
            <option value="质量问题">质量问题</option>
            <option value="错发/漏发">错发/漏发</option>
            <option value="客户取消订单">客户取消订单</option>
            <option value="商品破损">商品破损</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="ibReturnNote" placeholder="补充说明..."></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" style="background:#ea580c;border-color:#ea580c" onclick="inbound.saveReturn('${code}')">提交退货入库单</button>`
    );
  },

  onReturnGoodsChange() {
    const gid = +document.getElementById('ibReturnGoods').value;
    if (!gid) { document.getElementById('ibReturnGoodsInfo').style.display = 'none'; return; }
    const g = DB.findById('goods', gid);
    if (!g) return;
    document.getElementById('ibReturnCurrentStock').textContent = g.stock + ' ' + g.unit;
    document.getElementById('ibReturnCostPrice').textContent = fmtMoney(g.cost);
    document.getElementById('ibReturnPrice').value = g.cost;
    document.getElementById('ibReturnGoodsInfo').style.display = 'block';
    this.calcReturnTotal();
  },

  calcReturnTotal() {
    const qty = +document.getElementById('ibReturnQty').value || 0;
    const price = +document.getElementById('ibReturnPrice').value || 0;
    document.getElementById('ibReturnTotal').value = fmtMoney(qty * price);
  },

  saveReturn(code) {
    const gid = +document.getElementById('ibReturnGoods').value;
    if (!gid) { toast('请选择商品', 'error'); return; }
    const cid = +document.getElementById('ibReturnCustomer').value;
    if (!cid) { toast('请选择退货客户', 'error'); return; }
    const qty = +document.getElementById('ibReturnQty').value;
    if (qty <= 0) { toast('退货数量必须大于0', 'error'); return; }

    const g = DB.findById('goods', gid);
    const customer = DB.findById('customers', cid);
    const price = +document.getElementById('ibReturnPrice').value;
    const reason = document.getElementById('ibReturnReason').value;

    // 新建退货入库单
    DB.add('inbounds', {
      code,
      type: '退货入库',
      goodsId: gid,
      goodsName: g.name,
      goodsCode: g.code,
      qty,
      price,
      total: qty * price,
      customerId: cid,
      customerName: customer ? customer.name : '未知',
      returnReason: reason,
      operator: currentUser.username,
      note: document.getElementById('ibReturnNote').value,
      status: '待审核',
      date: document.getElementById('ibReturnDate').value
    });

    audit.log('inbound', '新建退货入库单', g.name, `单号: ${code}, 客户: ${customer.name}, 数量: +${qty}${g.unit}, 原因: ${reason}, 状态: 待审核`);
    closeModal();
    toast(`退货入库单已提交，等待审核！${g.name} +${qty}${g.unit}`, 'success');
    this.reload();
    updateWarningBadge();
  },

  // 打印入库单
  printOrder(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;

    const printHtml = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>入库单 - ${r.code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Microsoft YaHei", "SimHei", sans-serif; padding: 40px; color: #333; font-size: 14px; }
        .print-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
        .print-title { font-size: 22px; font-weight: 700; }
        .print-sub { font-size: 12px; color: #666; margin-top: 4px; }
        .print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 13px; }
        .print-meta .label { color: #666; }
        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .print-table th, .print-table td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; font-size: 13px; }
        .print-table th { background: #f5f5f5; font-weight: 600; }
        .print-table .num { text-align: right; font-family: "Consolas", monospace; }
        .print-total { text-align: right; font-size: 15px; font-weight: 700; margin-bottom: 20px; padding: 10px 0; border-top: 1px solid #ccc; }
        .print-footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; color: #666; }
        .print-footer div { text-align: center; min-width: 150px; }
        .print-footer .sign-line { border-bottom: 1px solid #ccc; margin-top: 40px; width: 120px; display: inline-block; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="print-header">
        <div>
          <div class="print-title">${r.type === '退货入库' ? '退 货 入 库 单' : '入 库 单'}</div>
          <div class="print-sub">智能业务管理系统 ERP ${(localStorage.getItem('wms_sysVersion') || 'v2.2').replace(/^v/, '')}</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>日期: ${r.date}</div>
          <div>类型: ${r.type === '退货入库' ? '退货入库' : '采购入库'}</div>
          <div>状态: ${r.status || '已完成'}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">${r.type === '退货入库' ? '退货客户：' : '供应商：'}</span>${r.type === '退货入库' ? (r.customerName || '-') : (r.supplierName || '-')}</div>
        <div><span class="label">操作员：</span>${r.operator}</div>
        <div><span class="label">商品名称：</span>${r.goodsName}</div>
        <div><span class="label">商品编码：</span>${r.goodsCode}</div>
        ${r.type === '退货入库' && r.returnReason ? `<div><span class="label">退货原因：</span>${r.returnReason}</div>` : ''}
      </div>
      <table class="print-table">
        <thead>
          <tr><th style="width:50px">序号</th><th>项目</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>${r.goodsName}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.price)}</td><td class="num">${fmtMoney(r.total)}</td></tr>
        </tbody>
      </table>
      <div class="print-total">合计金额: ${fmtMoney(r.total)}</div>
      ${r.note ? `<div style="margin-bottom:20px;font-size:13px"><span style="color:#666">备注：</span>${r.note}</div>` : ''}
      ${r.reviewNote ? `<div style="margin-bottom:20px;font-size:13px"><span style="color:#666">审核意见：</span>${r.reviewNote}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>审核人<br><span class="sign-line"></span></div>
        <div>收货人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(printHtml);
    win.document.close();
    win.onload = () => { win.print(); };
  },

  view(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    const st = r.status || '已完成';
    const badge = st === '待审核' ? 'badge-warning' : st === '已驳回' ? 'badge-danger' : 'badge-success';
    const isReturn = r.type === '退货入库';
    
    // 构建详情字段
    const fields = [
      ['入库单号', `<code style="color:var(--primary)">${r.code}</code>`],
      ['单据类型', isReturn
        ? '<span class="badge" style="background:rgba(251,146,60,0.12);color:#ea580c">退货入库</span>'
        : '<span class="badge" style="background:rgba(16,185,129,0.12);color:#059669">采购入库</span>'],
      ['入库日期', r.date],
      ['商品名称', r.goodsName],
      ['商品编码', r.goodsCode],
      ['入库数量', `<span style="color:var(--success);font-weight:700;font-size:16px">+${r.qty}</span>`],
      ['入库单价', fmtMoney(r.price)],
      ['入库金额', `<span style="color:var(--primary);font-weight:700">${fmtMoney(r.total)}</span>`],
      ...(r.equipSerials && r.equipSerials.length > 0 ? [['设备编号', `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${r.equipSerials.map((s,i)=>`<span style="display:inline-block;padding:2px 8px;background:${s?'var(--primary-light)':'rgba(245,158,11,0.12)'};color:${s?'var(--primary)':'#d97706'};border-radius:4px;font-size:12px">${s||'设备'+(i+1)+'(待补)'}</span>`).join('')}</div>`]] : [])
    ];
    
    // 根据类型添加不同字段
    if (isReturn) {
      fields.push(['退货客户', r.customerName || '-']);
      fields.push(['退货原因', r.returnReason || '-']);
    } else {
      fields.push(['供应商', r.supplierName || '-']);
    }
    
    fields.push(['操作员', r.operator]);
    fields.push(['状态', `<span class="badge ${badge}">${st}</span>`]);
    fields.push(['备注', r.note || '-']);
    
    openModal('入库单详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${fields.map(([k,v]) => `
          <div style="background:var(--bg);border-radius:8px;padding:12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${k}</div>
            <div style="font-size:14px;font-weight:500">${v}</div>
          </div>`).join('')}
        ${r.reviewedBy ? `
        <div style="background:var(--bg);border-radius:8px;padding:12px;grid-column:1/-1">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">审核信息</div>
          <div style="font-size:13px">审核人: ${r.reviewedBy} | 时间: ${r.reviewedAt || '-'}</div>
          ${r.reviewNote ? `<div style="font-size:13px;margin-top:4px;color:var(--text-muted)">审核意见: ${r.reviewNote}</div>` : ''}
        </div>` : ''}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${st === '已审核' ? `<button class="btn btn-primary" onclick="inbound.printOrder(${id})">🖨 打印</button>` : ''}
       ${st === '待审核' && currentUser.role === 'admin' ? `<button class="btn btn-primary" onclick="closeModal();inbound.approve(${id})">✅ 审核</button>` : ''}`
    );
  },

  // 导出入库单CSV
  exportData() {
    if (!hasPerm('inbound', 'export')) { toast('没有导出权限', 'error'); return; }
    let list = DB.get('inbounds');
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => r.code.toLowerCase().includes(kw) || r.goodsName.toLowerCase().includes(kw)); }
    if (this.dateFilter) list = list.filter(r => r.date.startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => (r.status || '已完成') === this.statusFilter);
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const headers = ['入库单号', '类型', '商品名称', '商品编码', '入库数量', '单价', '入库金额', '供应商', '入库日期', '操作员', '状态', '备注'];
    const rows = list.map(r => [r.code, r.type || '采购入库', r.goodsName, r.goodsCode, r.qty, r.price, r.total, r.type === '退货入库' ? (r.customerName || '') : (r.supplierName || ''), r.date, r.operator || '', r.status || '已完成', r.note || '']);
    exportTableToCSV(headers, rows, `入库单列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条入库单`, 'success');
  }
};