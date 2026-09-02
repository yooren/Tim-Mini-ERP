// ===========================
// 出库管理
// ===========================

const outbound = {
  page: 1, pageSize: 12, keyword: '', dateFilter: '', statusFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索单号/商品名/客户..." value="${this.keyword}"
              oninput="outbound.keyword=this.value;outbound.page=1;outbound.reload()">
          </div>
          <input type="month" class="filter-select" value="${this.dateFilter}"
            onchange="outbound.dateFilter=this.value;outbound.page=1;outbound.reload()">
          <select class="filter-select" onchange="outbound.statusFilter=this.value;outbound.page=1;outbound.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="待审核" ${this.statusFilter==='待审核'?'selected':''}>待审核</option>
            <option value="已审核" ${this.statusFilter==='已审核'?'selected':''}>已审核</option>
            <option value="已驳回" ${this.statusFilter==='已驳回'?'selected':''}>已驳回</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="outbound.exportData()">📥 导出</button>
          <button class="btn btn-outline" onclick="outbound.openReturn()">↩️ 退货出库</button>
          <button class="btn btn-danger" onclick="outbound.openAdd()">+ 新建出库单</button>
        </div>
      </div>
      <div class="card" id="outboundCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('outbounds');
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => r.code.toLowerCase().includes(kw) || r.goodsName.toLowerCase().includes(kw) || r.customerName.toLowerCase().includes(kw)); }
    if (this.dateFilter) list = list.filter(r => r.date.startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => (r.status || '已完成') === this.statusFilter);
    list = list.sort((a, b) => b.date.localeCompare(a.date));
    const total = list.length, start = (this.page - 1) * this.pageSize, pageData = list.slice(start, start + this.pageSize);
    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📤</div><div class="empty-state-text">暂无出库记录</div></div>`;
    const stBadge = s => s === '待审核' ? 'badge-warning' : s === '已驳回' ? 'badge-danger' : 'badge-success';
    return `
    <div class="table-wrap"><table>
      <thead><tr><th>出库单号</th><th>类型</th><th>商品名称</th><th>商品编码</th><th>出库数量</th><th>单价</th><th>出库金额</th><th>客户</th><th>销售人员</th><th>出库日期</th><th>操作员</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${pageData.map(r => {
    const st = r.status || '已完成';
    const typeTag = r.type === '退货出库'
      ? '<span class="badge badge-default" style="background:rgba(251,146,60,0.12);color:#ea580c">退货出库</span>'
      : r.type === '员工领取'
      ? '<span class="badge badge-default" style="background:rgba(16,185,129,0.12);color:#059669">员工领取</span>'
      : r.type === '部门领取'
      ? '<span class="badge badge-default" style="background:rgba(245,158,11,0.12);color:#d97706">部门领取</span>'
      : r.type === '设备出库'
      ? '<span class="badge badge-default" style="background:rgba(139,92,246,0.12);color:#7c3aed">🖥 设备出库</span>'
      : '<span class="badge badge-default" style="background:rgba(59,130,246,0.12);color:#2563eb">销售出库</span>';
    const equipSerials = r.equipSerial ? r.equipSerial.split(',').map(s => s.trim()).filter(Boolean) : [];
    const equipBadge = equipSerials.length > 0 
      ? `<div style="margin-top:4px">${equipSerials.map(s => `<code style="display:inline-block;font-size:10px;background:rgba(139,92,246,0.08);padding:1px 4px;border-radius:3px;margin:1px">${s}</code>`).join('')}</div>` 
      : '';
    return `<tr>
          <td><span style="color:var(--danger);font-size:12px;font-family:monospace">${r.code}</span></td>
          <td>${typeTag}</td>
          <td style="font-weight:600">${r.goodsName}${equipBadge}</td>
          <td><span style="font-size:12px;color:var(--text-muted)">${r.goodsCode}</span></td>
          <td><span style="font-weight:700;color:var(--danger)">-${r.qty}</span></td>
          <td>${fmtMoney(r.price)}</td>
          <td style="font-weight:600;color:var(--primary)">${fmtMoney(r.total)}</td>
          <td>${r.customerName}</td>
          <td>${r.salesmanName ? `<span style="color:var(--secondary);font-weight:500">${r.salesmanName}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
          <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
          <td><span style="font-size:12px">${r.operator}</span></td>
          <td><span class="badge ${stBadge(st)}">${st}</span></td>
          <td><div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm" onclick="outbound.view(${r.id})">👁 查看</button>
            <button class="btn btn-ghost btn-sm" onclick="outbound.edit(${r.id})">✏️ 编辑</button>
            ${st === '待审核' && currentUser.role === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="outbound.approve(${r.id})">✅ 审核</button>` : ''}
            ${st === '已审核' ? `<button class="btn btn-outline btn-sm" onclick="PrintManager.printSalesOrder(${r.id})">📄 销售单</button><button class="btn btn-outline btn-sm" onclick="outbound.printOrder(${r.id})">🖨 打印</button>` : ''}
            <button class="btn btn-danger btn-sm" onclick="outbound.del(${r.id})">🗑 删除</button>
          </div></td></tr>`;
      }).join('')}</tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'outbound.goPage')}`;
  },

  reload() { const c = document.getElementById('outboundCard'); if (c) c.innerHTML = this.renderTable(); },
  goPage(p) { outbound.page = p; outbound.reload(); },
  init() {},

  // 扫码枪选择商品（添加到第一个空行或新增行）
  scanGoods() {
    const btn = document.getElementById('obScanBtn');
    if (BarcodeScanner.isActive()) {
      BarcodeScanner.deactivate();
      if (btn) btn.classList.remove('active');
      return;
    }
    BarcodeScanner.activate((code, match) => {
      BarcodeScanner.deactivate();
      if (btn) btn.classList.remove('active');
      if (match) {
        // 找到第一个未选择商品的行，或新增一行
        let targetRowId = null;
        const selects = document.querySelectorAll('.ob-goods-select');
        for (const sel of selects) {
          if (!sel.value) { targetRowId = sel.dataset.row; break; }
        }
        if (targetRowId === null) {
          this.addGoodsRow();
          targetRowId = String(this._goodsRowCount);
        }
        // 设置商品选择
        const select = document.querySelector(`.ob-goods-select[data-row="${targetRowId}"]`);
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
    if (!hasPerm('outbound', 'create')) { toast('没有新建权限', 'error'); return; }
    const goodsList = DB.get('goods').filter(g => g.status === 1 && g.stock > 0);
    const customers = DB.get('customers');
    const departments = DB.get('departments').filter(d => d.status === 1);
    // 读取销售部在职员工（departmentName 含"销售"），employees 无数据时从 hrFiles 补充
    const empList = DB.get('employees') || [];
    let salesmen = empList.filter(e => e.status === 1 && (e.departmentName || '').includes('销售'));
    if (!salesmen.length) {
      const hrFileList = DB.get('hrFiles') || [];
      salesmen = hrFileList.filter(f => f.status === 1 && (f.departmentName || '').includes('销售'))
        .map(f => ({ id: f.id, name: f.name, position: f.position || '', departmentName: f.departmentName || '' }));
    }
    const today = new Date().toISOString().slice(0,10);
    const code = DB.genCode('OUT');
    const defaultCode = code;
    const defaultDate = today;
    const defaultCustomerOptions = `<option value="">请选择客户</option>${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}`;
    const defaultDeptOptions = `<option value="">选择部门</option>${departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}`;
    const defaultSalesmanOptions = `<option value="">-- 请选择销售人员 --</option>${salesmen.map(e=>`<option value="${e.id}">${e.name} ${e.position ? '(' + e.position + ')' : ''} - ${e.departmentName || '未分配'}</option>`).join('')}`;
    
    openModal('新建出库单', `
      <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>出库单号：</strong><span style="color:var(--danger);font-family:monospace">${code}</span>
        <span style="float:right;font-size:12px;color:var(--text-muted)">支持一次添加多台商品</span>
      </div>
      
      <!-- 基本信息行 -->
      <div class="form-row cols-3" style="margin-bottom:16px">
        <div class="form-item">
          <label>领取人 <span id="obRecipientLabel" style="font-size:11px;color:var(--text-muted)"></span></label>
          <div id="obCustomerSelect">
            <select id="obCustomer">${defaultCustomerOptions}</select>
          </div>
        </div>
        <div class="form-item">
          <label>👤 销售人员</label>
          <select id="obSalesman">${defaultSalesmanOptions}</select>
        </div>
        <div class="form-item">
          <label>🏭 出库仓库 *</label>
          <select id="obWarehouse">
            <option value="">-- 请选择仓库 --</option>
            ${DB.get('warehouses').filter(w=>w.status===1).map(w=>`<option value="${w.id}" data-name="${w.name}">${w.name} (${w.code})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2" style="margin-bottom:16px">
        <div class="form-item"><label>订单编号</label><input id="obOrderNo" placeholder="可选，关联外部订单号"></div>
        <div class="form-item"><label>出库日期</label><input id="obDate" type="date" value="${defaultDate}"></div>
      </div>
      
      <!-- 商品明细表格 -->
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <label style="font-weight:600;font-size:14px">📦 商品明细 <span style="font-weight:normal;font-size:12px;color:var(--text-muted)">（点击选择商品 / 支持扫码）</span></label>
          <div style="display:flex;gap:6px">
            <button class="scan-btn" id="obScanBtn" onclick="outbound.scanGoods()">📷 扫码</button>
            <button class="btn btn-outline btn-sm" onclick="outbound.addGoodsRow()">+ 添加商品</button>
          </div>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <table style="width:100%;border-collapse:collapse;font-size:13px" id="obGoodsTable">
            <thead style="background:var(--bg)">
              <tr>
                <th style="padding:10px 8px;text-align:left;width:40px">#</th>
                <th style="padding:10px 8px;text-align:left;min-width:200px">商品</th>
                <th style="padding:10px 8px;text-align:center;width:90px">可用库存</th>
                <th style="padding:10px 8px;text-align:center;width:100px">数量</th>
                <th style="padding:10px 8px;text-align:right;width:110px">单价</th>
                <th style="padding:10px 8px;text-align:right;width:120px">金额</th>
                <th style="padding:10px 8px;text-align:center;width:50px">操作</th>
              </tr>
            </thead>
            <tbody id="obGoodsTableBody">
              <tr id="obGoodsRow0" class="ob-goods-row">
                <td style="padding:8px;text-align:center;color:var(--text-muted)">1</td>
                <td style="padding:6px 4px">
                  <select class="ob-goods-select" data-row="0" onchange="outbound.onGoodsRowChange(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px">
                    <option value="">-- 选择商品 --</option>
                    ${goodsList.map(g=>`<option value="${g.id}" data-stock="${g.stock}" data-price="${g.price}" data-name="${g.name}" data-code="${g.code}" data-unit="${g.unit || ''}">${g.code} - ${g.name} (${g.stock}${g.unit})</option>`).join('')}
                  </select>
                  <!-- 设备编号多选区域 -->
                  <div id="obEquipArea0" style="display:none;margin-top:6px;background:#faf7ff;border:1px solid #7c3aed;border-radius:6px;padding:8px">
                    <div style="font-size:11px;color:#7c3aed;margin-bottom:6px;font-weight:500">🖥 选择设备编号（可多选）</div>
                    <div id="obEquipList0" style="display:flex;flex-wrap:wrap;gap:6px"></div>
                    <div style="font-size:11px;color:#7c3aed;margin-top:6px;padding-top:6px;border-top:1px dashed #d8b4fe">已选: <span id="obEquipCount0">0</span> 台</div>
                  </div>
                </td>
                <td style="padding:6px 4px;text-align:center"><span class="ob-stock" data-row="0" style="color:var(--primary);font-weight:600">-</span></td>
                <td style="padding:6px 4px"><input type="number" class="ob-qty" data-row="0" min="1" value="1" oninput="outbound.calcRowTotal(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:center"></td>
                <td style="padding:6px 4px"><input type="number" class="ob-price" data-row="0" min="0" step="0.01" value="0" oninput="outbound.calcRowTotal(0)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:right"></td>
                <td style="padding:6px 4px;text-align:right"><span class="ob-total" data-row="0" style="color:var(--primary);font-weight:600">¥0.00</span></td>
                <td style="padding:6px 4px;text-align:center">
                  <button class="btn btn-ghost btn-sm" onclick="outbound.removeGoodsRow(0)" style="opacity:0.4" disabled>×</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="display:flex;justify-content:flex-end;align-items:center;margin-top:8px;padding:8px 12px;background:rgba(239,68,68,0.06);border-radius:6px">
          <span style="font-size:13px;color:var(--text-muted)">合计：</span>
          <span id="obGrandTotal" style="font-size:18px;font-weight:700;color:var(--danger);margin-left:8px">¥0.00</span>
          <span id="obTotalQty" style="font-size:13px;color:var(--text-muted);margin-left:8px">(0 件)</span>
        </div>
      </div>
      
      <div class="form-item"><label>备注</label><input id="obNote" placeholder="出库原因/订单号等"></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="outbound.save('${defaultCode}')">提交出库单</button>`
    );
  },

  // 商品行计数器
  _goodsRowCount: 1,

  // 添加商品行
  addGoodsRow() {
    const goodsList = DB.get('goods').filter(g => g.status === 1 && g.stock > 0);
    const tbody = document.getElementById('obGoodsTableBody');
    const rowId = ++outbound._goodsRowCount;
    const rowCount = tbody.children.length + 1;
    
    const tr = document.createElement('tr');
    tr.id = `obGoodsRow${rowId}`;
    tr.className = 'ob-goods-row';
    tr.innerHTML = `
      <td style="padding:8px;text-align:center;color:var(--text-muted)">${rowCount}</td>
      <td style="padding:6px 4px">
        <select class="ob-goods-select" data-row="${rowId}" onchange="outbound.onGoodsRowChange(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px">
          <option value="">-- 选择商品 --</option>
          ${goodsList.map(g=>`<option value="${g.id}" data-stock="${g.stock}" data-price="${g.price}" data-name="${g.name}" data-code="${g.code}" data-unit="${g.unit || ''}">${g.code} - ${g.name} (${g.stock}${g.unit})</option>`).join('')}
        </select>
        <!-- 设备编号多选区域 -->
        <div id="obEquipArea${rowId}" style="display:none;margin-top:6px;background:#faf7ff;border:1px solid #7c3aed;border-radius:6px;padding:8px">
          <div style="font-size:11px;color:#7c3aed;margin-bottom:6px;font-weight:500">🖥 选择设备编号（可多选）</div>
          <div id="obEquipList${rowId}" style="display:flex;flex-wrap:wrap;gap:6px"></div>
          <div style="font-size:11px;color:#7c3aed;margin-top:6px;padding-top:6px;border-top:1px dashed #d8b4fe">已选: <span id="obEquipCount${rowId}">0</span> 台</div>
        </div>
      </td>
      <td style="padding:6px 4px;text-align:center"><span class="ob-stock" data-row="${rowId}" style="color:var(--primary);font-weight:600">-</span></td>
      <td style="padding:6px 4px"><input type="number" class="ob-qty" data-row="${rowId}" min="1" value="1" oninput="outbound.calcRowTotal(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:center"></td>
      <td style="padding:6px 4px"><input type="number" class="ob-price" data-row="${rowId}" min="0" step="0.01" value="0" oninput="outbound.calcRowTotal(${rowId})" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;text-align:right"></td>
      <td style="padding:6px 4px;text-align:right"><span class="ob-total" data-row="${rowId}" style="color:var(--primary);font-weight:600">¥0.00</span></td>
      <td style="padding:6px 4px;text-align:center">
        <button class="btn btn-ghost btn-sm" onclick="outbound.removeGoodsRow(${rowId})" style="color:var(--danger)">×</button>
      </td>
    `;
    tbody.appendChild(tr);
  },

  // 移除商品行
  removeGoodsRow(rowId) {
    const rows = document.querySelectorAll('.ob-goods-row');
    if (rows.length <= 1) {
      toast('至少需要保留一行商品', 'warning');
      return;
    }
    const row = document.getElementById(`obGoodsRow${rowId}`);
    if (row) {
      row.remove();
      // 重新编号
      document.querySelectorAll('.ob-goods-row').forEach((r, i) => {
        r.querySelector('td').textContent = i + 1;
      });
      outbound.calcGrandTotal();
    }
  },

  // 商品行变更
  onGoodsRowChange(rowId) {
    const select = document.querySelector(`.ob-goods-select[data-row="${rowId}"]`);
    if (!select) return;
    
    const option = select.options[select.selectedIndex];
    const stockSpan = document.querySelector(`.ob-stock[data-row="${rowId}"]`);
    const priceInput = document.querySelector(`.ob-price[data-row="${rowId}"]`);
    const qtyInput = document.querySelector(`.ob-qty[data-row="${rowId}"]`);
    const equipArea = document.getElementById(`obEquipArea${rowId}`);
    
    if (option.value) {
      const stock = option.dataset.stock;
      const price = option.dataset.price;
      stockSpan.textContent = stock;
      priceInput.value = price;
      qtyInput.max = stock;
      
      const gid = parseInt(option.value);
      const g = DB.findById('goods', gid);
      
      if (g) {
        const cats = DB.get('categories');
        const cat = cats.find(c => c.id == g.category);
        const isOfficeSupply = cat && cat.name.includes('办公用品');
        const isEquipment = cat && cat.name.includes('设备');
        
        // 检查是否有设备编号入库
        const hasEquipInbound = (DB.get('inbounds') || []).some(inb => 
          parseInt(inb.goodsId) === gid && inb.status === '已审核' && inb.equipSerials && inb.equipSerials.some(s => s && s.trim())
        );
        const hasEquipRegistry = localStorage.getItem('equipmentRegistry') && 
          (DB.get('equipmentRegistry') || []).some(e => parseInt(e.goodsId) === gid && e.status === 'available');
        const showEquipSelect = isEquipment || hasEquipInbound || hasEquipRegistry;
        
        if (isOfficeSupply) {
          document.getElementById('obRecipientLabel').textContent = '(部门/员工)';
          outbound.showDeptEmpSelect();
          document.getElementById('obSalesman').closest('.form-item').style.display = 'none';
        } else {
          document.getElementById('obRecipientLabel').textContent = '';
          outbound.showCustomerSelect();
          document.getElementById('obSalesman').closest('.form-item').style.display = 'flex';
        }
        
        // 设备类商品显示设备编号多选
        if (showEquipSelect) {
          outbound.loadEquipSerialsForRow(rowId, gid);
          if (equipArea) equipArea.style.display = 'block';
        } else {
          if (equipArea) equipArea.style.display = 'none';
        }
      }
    } else {
      stockSpan.textContent = '-';
      priceInput.value = '0';
      if (equipArea) equipArea.style.display = 'none';
    }
    
    outbound.calcRowTotal(rowId);
  },

  // 为行加载设备编号（checkbox卡片形式）
  loadEquipSerialsForRow(rowId, goodsId) {
    const equipArea = document.getElementById(`obEquipArea${rowId}`);
    if (!equipArea) return;
    
    const equipList = document.getElementById(`obEquipList${rowId}`);
    if (!equipList) return;
    
    const equipSerials = [];
    
    // 优先从设备注册表读取
    if (localStorage.getItem('equipmentRegistry')) {
      const registry = DB.get('equipmentRegistry') || [];
      const available = registry.filter(e => parseInt(e.goodsId) === parseInt(goodsId) && e.status === 'available');
      available.forEach(e => {
        equipSerials.push({ serial: e.serial, source: 'registry', date: e.inboundDate });
      });
    }
    
    // 从已审核入库单读取
    const inbounds = DB.get('inbounds') || [];
    inbounds.forEach(inb => {
      if (parseInt(inb.goodsId) === parseInt(goodsId) && inb.status === '已审核' && inb.equipSerials) {
        inb.equipSerials.forEach(serial => {
          if (serial && serial.trim() && !equipSerials.find(e => e.serial === serial.trim())) {
            // 检查是否已出库（支持逗号分隔的多个序列号）
            const outbounds = DB.get('outbounds') || [];
            const alreadyOut = outbounds.some(o => {
              if (o.status !== '已审核' || !o.equipSerial) return false;
              const outSerials = o.equipSerial.split(',').map(s => s.trim());
              return outSerials.includes(serial.trim());
            });
            if (!alreadyOut) {
              equipSerials.push({ serial: serial.trim(), source: 'inbound', date: inb.date });
            }
          }
        });
      }
    });
    
    if (equipSerials.length === 0) {
      equipList.innerHTML = '<span style="font-size:12px;color:#999">暂无可用设备</span>';
    } else {
      equipList.innerHTML = equipSerials.map(e => `
        <label style="cursor:pointer">
          <input type="checkbox" value="${e.serial}" onchange="outbound.onEquipSerialChange(${rowId})" 
                 style="width:14px;height:14px;accent-color:#7c3aed;cursor:pointer">
          <span style="font-size:12px;background:#fff;border:1px solid #d8b4fe;border-radius:4px;padding:4px 8px;display:inline-block">${e.serial}</span>
        </label>
      `).join('');
    }
  },

  // 设备编号多选变更（checkbox形式）
  onEquipSerialChange(rowId) {
    const equipList = document.getElementById(`obEquipList${rowId}`);
    const countSpan = document.getElementById(`obEquipCount${rowId}`);
    if (!equipList) return;
    
    const checkboxes = equipList.querySelectorAll('input[type="checkbox"]');
    const selected = Array.from(checkboxes).filter(cb => cb.checked).length;
    if (countSpan) countSpan.textContent = selected;
    
    const qtyInput = document.querySelector(`.ob-qty[data-row="${rowId}"]`);
    if (qtyInput && selected > 0) {
      qtyInput.value = selected;
      qtyInput.readOnly = true;
      qtyInput.style.background = '#f0f2f8';
    } else if (qtyInput) {
      qtyInput.readOnly = false;
      qtyInput.style.background = '';
    }
    outbound.calcRowTotal(rowId);
  },

  // 计算单行金额
  calcRowTotal(rowId) {
    const qtyInput = document.querySelector(`.ob-qty[data-row="${rowId}"]`);
    const priceInput = document.querySelector(`.ob-price[data-row="${rowId}"]`);
    const totalSpan = document.querySelector(`.ob-total[data-row="${rowId}"]`);
    const select = document.querySelector(`.ob-goods-select[data-row="${rowId}"]`);
    
    if (!qtyInput || !priceInput || !totalSpan) return;
    
    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const total = qty * price;
    totalSpan.textContent = '¥' + total.toFixed(2);
    
    // 检查库存
    const stockWarn = qtyInput.parentElement.querySelector('.ob-stock-warn');
    if (select && select.value) {
      const option = select.options[select.selectedIndex];
      const maxStock = parseInt(option.dataset.stock) || 0;
      if (qty > maxStock) {
        if (!stockWarn) {
          const warn = document.createElement('div');
          warn.className = 'ob-stock-warn';
          warn.style.cssText = 'font-size:11px;color:var(--danger);margin-top:4px';
          warn.textContent = '⚠️ 超出库存';
          qtyInput.parentElement.appendChild(warn);
        }
      } else if (stockWarn) {
        stockWarn.remove();
      }
    }
    
    outbound.calcGrandTotal();
  },

  // 计算合计金额
  calcGrandTotal() {
    let grandTotal = 0;
    let totalQty = 0;
    document.querySelectorAll('.ob-total').forEach(el => {
      const val = parseFloat(el.textContent.replace('¥', '')) || 0;
      grandTotal += val;
    });
    document.querySelectorAll('.ob-qty').forEach(el => {
      totalQty += parseFloat(el.value) || 0;
    });
    document.getElementById('obGrandTotal').textContent = '¥' + grandTotal.toFixed(2);
    document.getElementById('obTotalQty').textContent = `(${totalQty} 件)`;
  },

  // 显示客户选择
  showCustomerSelect() {
    const customers = DB.get('customers');
    document.getElementById('obCustomerSelect').innerHTML = `
      <select id="obCustomer">
        <option value="">请选择客户</option>
        ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
      </select>`;
  },

  // 显示部门/员工选择
  showDeptEmpSelect() {
    const departments = DB.get('departments').filter(d => d.status === 1);
    document.getElementById('obCustomerSelect').innerHTML = `
      <div style="display:flex;gap:8px">
        <select id="obDept" onchange="outbound.onDeptChange()" style="flex:1">
          <option value="">选择部门</option>
          ${departments.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}
        </select>
        <select id="obEmployee" style="flex:1">
          <option value="">选择员工</option>
        </select>
      </div>`;
  },

  // 部门变更时更新员工列表
  onDeptChange() {
    const deptId = +document.getElementById('obDept').value;
    const empSelect = document.getElementById('obEmployee');
    if (!deptId) {
      empSelect.innerHTML = '<option value="">选择员工</option>';
      return;
    }
    const employees = DB.get('employees').filter(e => e.departmentId === deptId && e.status === 1);
    empSelect.innerHTML = '<option value="">选择员工</option>' + 
      employees.map(e=>`<option value="${e.id}">${e.name} ${e.position ? '(' + e.position + ')' : ''}</option>`).join('');
  },

  save(code) {
    // 收集所有商品行
    const rows = document.querySelectorAll('.ob-goods-row');
    const items = [];
    
    for (const row of rows) {
      const rowId = row.id.replace('obGoodsRow', '');
      const select = document.querySelector(`.ob-goods-select[data-row="${rowId}"]`);
      const qtyInput = document.querySelector(`.ob-qty[data-row="${rowId}"]`);
      const priceInput = document.querySelector(`.ob-price[data-row="${rowId}"]`);
      const equipList = document.getElementById(`obEquipList${rowId}`);
      
      if (!select || !select.value) continue;
      
      const gid = parseInt(select.value);
      const option = select.options[select.selectedIndex];
      const qty = parseFloat(qtyInput.value) || 0;
      const price = parseFloat(priceInput.value) || 0;
      
      // 获取选中的设备编号（从checkbox）
      let equipSerials = [];
      if (equipList) {
        equipSerials = Array.from(equipList.querySelectorAll('input[type="checkbox"]:checked'))
          .map(cb => cb.value)
          .filter(v => v && v.trim());
      }
      
      if (qty <= 0) {
        toast(`商品 "${option.dataset.name}" 数量必须大于0`, 'error');
        return;
      }
      
      const g = DB.findById('goods', gid);
      if (!g) continue;
      
      if (qty > g.stock) {
        toast(`商品 "${g.name}" 库存不足！当前库存 ${g.stock}`, 'error');
        return;
      }
      
      // 如果有设备编号，数量必须等于设备数量
      if (equipSerials.length > 0 && qty !== equipSerials.length) {
        toast(`商品 "${g.name}" 选择了 ${equipSerials.length} 台设备，数量已自动调整为 ${equipSerials.length}`, 'info');
      }
      
      items.push({
        rowId, gid, g, qty: equipSerials.length > 0 ? equipSerials.length : qty, price, total: (equipSerials.length > 0 ? equipSerials.length : qty) * price,
        goodsName: g.name, goodsCode: g.code,
        equipSerials: equipSerials
      });
    }
    
    if (items.length === 0) {
      toast('请至少添加一个商品', 'error');
      return;
    }
    
    // 获取仓库信息
    const whSel = document.getElementById('obWarehouse');
    const warehouseId = whSel ? +whSel.value : 0;
    if (!warehouseId) { toast('请选择出库仓库', 'error'); return; }
    const warehouseName = whSel.options[whSel.selectedIndex].dataset.name;
    
    // 校验每个商品的仓库库存是否充足。同一单据里同一商品可能被添加为多行，
    // 需要按商品累加所需数量后再比较，避免每行各自校验通过、合计却超出实际库存
    const neededByGoods = {};
    for (const item of items) {
      neededByGoods[item.gid] = (neededByGoods[item.gid] || 0) + item.qty;
    }
    for (const gid of Object.keys(neededByGoods)) {
      const item = items.find(i => i.gid == gid);
      const ws = item.g.warehouseStock || {};
      const whQty = ws[warehouseId] || 0;
      const needed = neededByGoods[gid];
      if (needed > whQty) {
        toast(`商品 "${item.g.name}" 在${warehouseName}的库存不足！仓库库存 ${whQty}，需要 ${needed}`, 'error');
        return;
      }
    }
    
    // 检查是否为办公用品（是否选择了部门/员工）
    const deptSelect = document.getElementById('obDept');
    const empSelect = document.getElementById('obEmployee');
    let customerId = null, customerName = '散客', recipientType = 'customer', employeeId = null, departmentId = null;
    
    if (deptSelect && empSelect) {
      // 部门/员工选择模式
      const empId = +empSelect.value;
      const deptId = +deptSelect.value;
      if (empId) {
        const emp = DB.findById('employees', empId);
        const dept = DB.findById('departments', deptId);
        if (emp) {
          employeeId = empId;
          departmentId = deptId;
          recipientType = 'employee';
          customerName = `${dept ? dept.name + '-' : ''}${emp.name}`;
        }
      } else if (deptId) {
        departmentId = deptId;
        recipientType = 'department';
        const dept = DB.findById('departments', deptId);
        customerName = dept ? dept.name : '未知部门';
      } else {
        const cid = +document.getElementById('obCustomer').value;
        const customer = cid ? DB.findById('customers', cid) : null;
        customerId = cid || null;
        customerName = customer ? customer.name : '散客';
      }
    } else {
      // 客户选择模式
      const cid = +document.getElementById('obCustomer').value;
      const customer = cid ? DB.findById('customers', cid) : null;
      customerId = cid || null;
      customerName = customer ? customer.name : '散客';
    }
    
    // 获取销售人员信息
    let salesmanId = null, salesmanName = null;
    const salesmanEl = document.getElementById('obSalesman');
    if (salesmanEl && salesmanEl.value) {
      salesmanId = parseInt(salesmanEl.value);
      const emp = DB.findById('employees', salesmanId);
      if (emp) salesmanName = emp.name;
    }
    const orderNo = document.getElementById('obOrderNo')?.value || '';
    const outboundDate = document.getElementById('obDate').value;
    const note = document.getElementById('obNote').value || '';
    
    // 创建出库单
    let created = 0;
    
    items.forEach((item, itemIdx) => {
      const cats = DB.get('categories');
      const cat = cats.find(c => c.id == item.g.category);
      const isEquipment = cat && cat.name.includes('设备');
      
      const itemCode = itemIdx === 0 ? code : DB.genCode('OB');
      let outboundType = '销售出库';
      if (item.equipSerials.length > 0) {
        outboundType = '设备出库';
      } else if (recipientType === 'employee') {
        outboundType = '员工领取';
      } else if (recipientType === 'department') {
        outboundType = '部门领取';
      } else if (isEquipment) {
        outboundType = '设备出库';
      }
      
      // 设备编号：多个用逗号分隔
      const equipSerialStr = item.equipSerials.join(', ');
      
      DB.add('outbounds', {
        code: itemCode, type: outboundType,
        goodsId: item.gid, goodsName: item.goodsName, goodsCode: item.goodsCode,
        qty: item.equipSerials.length > 0 ? item.equipSerials.length : item.qty, 
        price: item.price, 
        total: item.equipSerials.length > 0 ? item.equipSerials.length * item.price : item.total,
        customerId, customerName, employeeId, departmentId,
        salesmanId, salesmanName, orderNo,
        equipSerial: equipSerialStr,  // 多个设备编号逗号分隔
        equipLinked: false,
        date: outboundDate,
        note: note,
        status: '待审核', operator: currentUser.username,
        warehouseId,
        warehouseName,
        createdAt: new Date().toISOString()
      });
      
      // 如果是员工领取，自动创建领取记录
      if (recipientType === 'employee' && employeeId) {
        const claimCode = DB.genCode('CLM');
        DB.add('claimRecords', {
          code: claimCode,
          outboundCode: itemCode,
          employeeId: employeeId,
          employeeName: DB.findById('employees', employeeId)?.name || '未知',
          departmentId: departmentId,
          departmentName: DB.findById('departments', departmentId)?.name || '未知',
          goodsId: item.gid,
          goodsName: item.goodsName,
          goodsCode: item.goodsCode,
          qty: item.equipSerials.length > 0 ? item.equipSerials.length : item.qty,
          price: item.price,
          total: item.equipSerials.length > 0 ? item.equipSerials.length * item.price : item.total,
          claimDate: outboundDate,
          operator: currentUser.username,
          note: note
        });
      }
      
      const equipInfo = item.equipSerials.length > 0 ? ` [${item.equipSerials.length}台: ${equipSerialStr}]` : '';
      audit.log('outbound', '新建出库单', item.goodsName + equipInfo, `单号: ${itemCode}, 数量: ${item.equipSerials.length > 0 ? item.equipSerials.length : item.qty}, 领取人: ${customerName}`);
      created++;
    });
    
    closeModal();
    const totalAmount = items.reduce((sum, i) => sum + (i.equipSerials.length > 0 ? i.equipSerials.length * i.price : i.total), 0);
    toast(`出库单已提交，等待审核！合计: ${fmtMoney(totalAmount)}`, 'success');
    
    this.reload();
    updateWarningBadge();
  },

  // 退货出库
  openReturn() {
    if (!hasPerm('outbound', 'create')) { toast('没有新建权限', 'error'); return; }
    const goodsList = DB.get('goods').filter(g => g.status === 1 && g.stock > 0);
    const suppliers = DB.get('suppliers');
    const today = new Date().toISOString().slice(0,10);
    const code = DB.genCode('RTO');
    openModal('退货出库', `
      <div style="background:rgba(251,146,60,0.1);border:1px solid rgba(251,146,60,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>退货出库单号：</strong><span style="color:#ea580c;font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>选择商品 *</label>
          <select id="rtoGoods" onchange="outbound.onReturnGoodsChange()">
            <option value="">-- 请选择商品 --</option>
            ${goodsList.map(g=>`<option value="${g.id}">${g.code} - ${g.name} (可用:${g.stock}${g.unit})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>退回供应商</label>
          <select id="rtoSupplier">
            <option value="">请选择供应商</option>
            ${suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="rtoGoodsInfo" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;display:none">
        <span>当前库存: <strong id="rtoCurrentStock" style="color:var(--primary)">0</strong></span>
        &nbsp;|&nbsp; <span>成本价: <strong id="rtoCostPrice">-</strong></span>
        &nbsp;|&nbsp; <span>默认供应商: <span id="rtoDefSupplier">-</span></span>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>退货数量 *</label>
          <input id="rtoQty" type="number" min="1" value="1" oninput="outbound.calcReturnTotal()">
          <div id="rtoStockWarn" style="font-size:11px;color:var(--danger);margin-top:4px;display:none">⚠️ 超出可用库存！</div>
        </div>
        <div class="form-item"><label>退货单价(¥)</label><input id="rtoPrice" type="number" min="0" step="0.01" value="0" oninput="outbound.calcReturnTotal()"></div>
        <div class="form-item"><label>退货金额</label><input id="rtoTotal" readonly style="background:#f0f2f8;color:var(--primary);font-weight:600" value="¥0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>退货日期</label><input id="rtoDate" type="date" value="${today}"></div>
        <div class="form-item"><label>退货原因 *</label>
          <select id="rtoReason">
            <option value="">请选择原因</option>
            <option value="质量问题">质量问题</option>
            <option value="滞销退回">滞销退回</option>
            <option value="采购错误">采购错误</option>
            <option value="其他原因">其他原因</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="rtoNote" placeholder="退货详细说明"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="outbound.saveReturn('${code}')">提交退货出库</button>`
    );
  },

  onReturnGoodsChange() {
    const gid = +document.getElementById('rtoGoods').value;
    if (!gid) { document.getElementById('rtoGoodsInfo').style.display = 'none'; return; }
    const g = DB.findById('goods', gid); if (!g) return;
    document.getElementById('rtoCurrentStock').textContent = g.stock + ' ' + g.unit;
    document.getElementById('rtoCostPrice').textContent = fmtMoney(g.cost);
    document.getElementById('rtoPrice').value = g.cost;
    if (g.supplierId) {
      document.getElementById('rtoSupplier').value = g.supplierId;
      const sup = DB.findById('suppliers', g.supplierId);
      document.getElementById('rtoDefSupplier').textContent = sup ? sup.name : '-';
    } else {
      document.getElementById('rtoDefSupplier').textContent = '无';
    }
    document.getElementById('rtoGoodsInfo').style.display = 'block';
    this.calcReturnTotal();
  },

  calcReturnTotal() {
    const qty = +document.getElementById('rtoQty').value || 0, price = +document.getElementById('rtoPrice').value || 0;
    document.getElementById('rtoTotal').value = fmtMoney(qty * price);
    const gid = +document.getElementById('rtoGoods').value;
    if (gid) { const g = DB.findById('goods', gid), w = document.getElementById('rtoStockWarn'); if (g && qty > g.stock) w.style.display = 'block'; else w.style.display = 'none'; }
  },

  saveReturn(code) {
    const gid = +document.getElementById('rtoGoods').value;
    if (!gid) { toast('请选择商品', 'error'); return; }
    const qty = +document.getElementById('rtoQty').value;
    if (qty <= 0) { toast('退货数量必须大于0', 'error'); return; }
    const g = DB.findById('goods', gid);
    if (qty > g.stock) { toast(`库存不足！当前库存 ${g.stock} ${g.unit}`, 'error'); return; }
    const reason = document.getElementById('rtoReason').value;
    if (!reason) { toast('请选择退货原因', 'error'); return; }
    const sid = +document.getElementById('rtoSupplier').value;
    const supplier = sid ? DB.findById('suppliers', sid) : null;
    const price = +document.getElementById('rtoPrice').value;
    DB.add('outbounds', {
      code, type: '退货出库', goodsId: gid, goodsName: g.name, goodsCode: g.code, qty, price, total: qty * price,
      customerId: sid || null, customerName: supplier ? supplier.name : '无',
      operator: currentUser.username, note: `退货原因: ${reason}` + (document.getElementById('rtoNote').value ? ' | ' + document.getElementById('rtoNote').value : ''),
      returnReason: reason,
      status: '待审核', date: document.getElementById('rtoDate').value
    });
    audit.log('outbound', '退货出库', g.name, `单号: ${code}, 数量: -${qty}${g.unit}, 原因: ${reason}, 退回: ${supplier ? supplier.name : '无'}, 状态: 待审核`);
    closeModal();
    toast(`退货出库单已提交，等待审核！${g.name} -${qty}${g.unit}`, 'success');
    this.reload();
    updateWarningBadge();
  },

  // 编辑出库单
  edit(id) {
    if (!hasPerm('outbound', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('outbounds', id);
    if (!r) return;
    this.editingId = id;
    openModal('编辑出库单', `
      <div class="form-group">
        <label>商品</label>
        <select id="editOutboundGoods" class="form-control">
          ${DB.get('goods').map(g => `<option value="${g.id}" ${g.id === r.goodsId ? 'selected' : ''}>${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>出库数量</label>
        <input type="number" id="editOutboundQty" class="form-control" value="${r.qty}" min="1">
      </div>
      <div class="form-group">
        <label>出库类型</label>
        <select id="editOutboundType" class="form-control">
          <option value="销售出库" ${r.type === '销售出库' ? 'selected' : ''}>销售出库</option>
          <option value="设备出库" ${r.type === '设备出库' ? 'selected' : ''}>🖥 设备出库</option>
          <option value="退货出库" ${r.type === '退货出库' ? 'selected' : ''}>退货出库</option>
          <option value="调拨出库" ${r.type === '调拨出库' ? 'selected' : ''}>调拨出库</option>
          <option value="其他出库" ${r.type === '其他出库' ? 'selected' : ''}>其他出库</option>
        </select>
        ${r.equipSerial ? `<div style="margin-top:8px"><label>设备序列号</label><input id="editEquipSerial" class="form-control" value="${r.equipSerial}" placeholder="设备序列号"></div>` : ''}
      </div>
      <div class="form-group">
        <label>客户</label>
        <select id="editOutboundCustomer" class="form-control">
          ${DB.get('customers').map(c => `<option value="${c.id}" ${c.id === r.customerId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="editOutboundNote" class="form-control" rows="2">${r.note || ''}</textarea>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="outbound.saveEdit()">保存修改</button>`
    );
  },

  saveEdit() {
    const goodsId = +$('#editOutboundGoods').value;
    const qty = +$('#editOutboundQty').value;
    const type = $('#editOutboundType').value;
    const customerId = +$('#editOutboundCustomer').value;
    const note = $('#editOutboundNote').value.trim();
    if (!qty || qty <= 0) return toast('请输入有效数量', 'error');
    const goods = DB.findById('goods', goodsId);
    const customer = DB.findById('customers', customerId);
    const r = DB.findById('outbounds', this.editingId);
    if (!r) return;

    // 已审核单据的原数量已从库存扣减：先按旧数量/旧商品回补，再按新数量/新商品重新扣减，
    // 否则总库存与仓库分布会与单据显示的数量脱节
    if (r.status === '已审核') {
      const oldGoods = DB.findById('goods', r.goodsId);
      if (oldGoods) {
        const revert = { stock: (oldGoods.stock || 0) + r.qty };
        if (r.warehouseId) {
          const ws = oldGoods.warehouseStock || {};
          ws[r.warehouseId] = (ws[r.warehouseId] || 0) + r.qty;
          revert.warehouseStock = ws;
        }
        DB.update('goods', r.goodsId, revert);
      }
      const newGoods = DB.findById('goods', goodsId); // 若与旧商品相同，此时已是回补后的最新值
      if (newGoods) {
        const apply = { stock: Math.max(0, (newGoods.stock || 0) - qty) };
        if (r.warehouseId) {
          const ws = newGoods.warehouseStock || {};
          ws[r.warehouseId] = Math.max(0, (ws[r.warehouseId] || 0) - qty);
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
    r.customerId = customerId;
    r.customerName = customer.name;
    r.note = note;
    // 保存设备序列号
    const editEquipSerial = document.getElementById('editEquipSerial');
    if (editEquipSerial) {
      r.equipSerial = editEquipSerial.value.trim();
    }
    DB.update('outbounds', r.id, r);
    audit.log('outbound', '编辑出库单', goods.name, `单号: ${r.code}, 数量: -${qty}, 操作人: ${currentUser.username}`);
    closeModal();
    toast('出库单已更新', 'success');
    this.editingId = null;
    this.reload();
  },

  // 删除出库单
  del(id) {
    if (!hasPerm('outbound', 'delete')) { toast('没有删除权限', 'error'); return; }
    const r = DB.findById('outbounds', id);
    if (!r) return;
    openModal('删除确认', `
      <div style="text-align:center;padding:16px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">🗑</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认删除此出库单？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: <strong>${r.code}</strong> | 商品: ${r.goodsName} | 数量: -${r.qty}</div>
        <div style="font-size:12px;color:var(--danger);margin-top:12px">⚠️ 删除后不可恢复</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="outbound.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    const r = DB.findById('outbounds', id);
    if (!r) return;
    // 如果单据已审核，删除时需要恢复库存（含分仓库存，避免仓库维度与总库存脱节）
    if (r.status === '已审核') {
      const goods = DB.findById('goods', r.goodsId);
      if (goods) {
        const revert = { stock: (goods.stock || 0) + r.qty };
        if (r.warehouseId) {
          const ws = goods.warehouseStock || {};
          ws[r.warehouseId] = (ws[r.warehouseId] || 0) + r.qty;
          revert.warehouseStock = ws;
        }
        DB.update('goods', goods.id, revert);
        updateWarningBadge();
      }
    }
    DB.delete('outbounds', id);
    audit.log('outbound', '删除出库单', r.goodsName, `单号: ${r.code}, 数量: +${r.qty}, 操作人: ${currentUser.username}`);
    closeModal();
    toast('出库单已删除，库存已同步更新', 'success');
    this.reload();
  },

  // 审核
  approve(id) {
    if (!hasPerm('outbound', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('outbounds', id); if (!r) return;
    openModal('审核出库单', `
      <div style="text-align:center;padding:16px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">📋</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px">确认审核通过？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: <strong>${r.code}</strong> | 商品: ${r.goodsName} | 数量: -${r.qty}</div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>审核备注（可选）</label><input id="approveNoteOut" placeholder="审核意见"></div>`,
      `<button class="btn btn-danger" onclick="outbound.reject(${id})">❌ 驳回</button>
       <button class="btn btn-primary" onclick="outbound.confirmApprove(${id})">✅ 审核通过</button>`
    );
  },

  confirmApprove(id) {
    const r = DB.findById('outbounds', id); if (!r) return;
    const note = document.getElementById('approveNoteOut')?.value || '';
    const g = DB.findById('goods', r.goodsId);
    // 检查库存是否足够：优先校验出库单所在仓库的分仓库存，
    // 避免"总库存充足但该仓库实际缺货"仍被放行、审核后扣减分仓库存被强制clamp到0的问题
    if (g) {
      if (r.warehouseId) {
        const warehouseStock = (g.warehouseStock && g.warehouseStock[r.warehouseId]) || 0;
        if (r.qty > warehouseStock) {
          toast(`「${r.warehouseName || '该仓库'}」库存不足！当前 ${warehouseStock}，需要 ${r.qty}`, 'error');
          return;
        }
      } else if (r.qty > g.stock) {
        toast(`库存不足！当前库存 ${g.stock}，需要 ${r.qty}`, 'error');
        return;
      }
    }

    // 设备出库审核时，自动创建售后工单并更新设备状态
    let ticketCodes = [];
    if (r.type === '设备出库' && r.equipSerial) {
      // 解析多个设备编号（逗号分隔）
      const serials = r.equipSerial.split(',').map(s => s.trim()).filter(Boolean);
      
      serials.forEach(serial => {
        const ticketCode = DB.genCode('WXO');
        ticketCodes.push(ticketCode);
        
        // 获取设备注册信息
        let equipInfo = null;
        if (localStorage.getItem('equipmentRegistry')) {
          const registry = DB.get('equipmentRegistry') || [];
          equipInfo = registry.find(e => e.serial === serial);
        }
        const ticketData = {
          code: ticketCode,
          equipmentCode: serial,
          equipmentName: r.goodsName,
          equipmentModel: equipInfo ? (equipInfo.goodsCode || '') : '',
          customerId: r.customerId,
          customerName: r.customerName,
          customerContact: '',
          customerPhone: '',
          salesmanId: r.salesmanId,
          salesmanName: r.salesmanName,
          orderNo: r.orderNo || '',
          status: '待派工',
          priority: '一般',
          problem: '设备出库安装',
          faultDesc: '',
          handlerId: null,
          handlerName: '',
          scheduledDate: '',
          completedDate: '',
          parts: [],
          labor: 0,
          totalCost: 0,
          outboundCode: r.code,
          inboundCode: equipInfo ? equipInfo.inboundCode : '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        DB.add('serviceTickets', ticketData);
        
        // 更新设备注册表状态为已使用
        if (localStorage.getItem('equipmentRegistry')) {
          const registry = DB.get('equipmentRegistry') || [];
          const idx = registry.findIndex(e => e.serial === serial);
          if (idx !== -1) {
            registry[idx].status = 'used';
            registry[idx].usedOutboundCode = r.code;
            registry[idx].usedDate = new Date().toISOString();
            localStorage.setItem('equipmentRegistry', JSON.stringify(registry));
          }
        }
        audit.log('outbound', '设备出库工单同步', serial, `工单号: ${ticketCode} 已自动创建`);
      });
      
      // 更新出库单：关联所有工单
      DB.update('outbounds', id, { equipLinked: true, ticketCode: ticketCodes.join(', ') });
    }
    
    DB.update('outbounds', id, { status: '已审核', reviewedBy: currentUser.username, reviewedAt: new Date().toISOString().slice(0,16), reviewNote: note });
    // 审核通过后扣减库存
    if (g) {
      const updateData = { stock: Math.max(0, g.stock - r.qty) };
      // 扣减仓库库存
      if (r.warehouseId) {
        const ws = g.warehouseStock || {};
        ws[r.warehouseId] = Math.max(0, (ws[r.warehouseId] || 0) - r.qty);
        updateData.warehouseStock = ws;
      }
      DB.update('goods', r.goodsId, updateData);
      updateWarningBadge();
    }
    // 如果是员工领取，更新领取记录状态
    if (r.employeeId) {
      const claims = DB.get('claimRecords').filter(c => c.outboundCode === r.code);
      claims.forEach(c => DB.update('claimRecords', c.id, { status: '已审核' }));
    }
    audit.log('outbound', '审核通过', r.goodsName, `单号: ${r.code}, 数量: -${r.qty}, 审核人: ${currentUser.username}`);
    const equipMsg = ticketCodes.length > 0 ? ` | ${ticketCodes.length}个设备已同步工单: ${ticketCodes.join(', ')}` : '';
    closeModal(); toast(`审核通过！${r.goodsName} -${r.qty}${equipMsg}`, 'success'); this.reload();
  },

  reject(id) {
    const r = DB.findById('outbounds', id); if (!r) return;
    openModal('驳回出库单', `
      <div style="text-align:center;padding:12px 0">
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认驳回此出库单？</div>
        <div style="font-size:13px;color:var(--text-muted)">单号: ${r.code} | 商品: ${r.goodsName}</div>
      </div>
      <div class="form-item" style="margin-top:8px"><label>驳回原因 *</label><input id="rejectNoteOut" placeholder="请填写驳回原因"></div>`,
      `<button class="btn btn-ghost" onclick="outbound.approve(${id})">返回</button>
       <button class="btn btn-danger" onclick="outbound.confirmReject(${id})">确认驳回</button>`
    );
  },

  confirmReject(id) {
    const r = DB.findById('outbounds', id); if (!r) return;
    const note = document.getElementById('rejectNoteOut')?.value || '';
    if (!note) { toast('请填写驳回原因', 'error'); return; }
    DB.update('outbounds', id, { status: '已驳回', reviewedBy: currentUser.username, reviewedAt: new Date().toISOString().slice(0,16), reviewNote: note });
    audit.log('outbound', '驳回', r.goodsName, `单号: ${r.code}, 驳回原因: ${note}`);
    closeModal(); toast('出库单已驳回', 'warning'); this.reload();
  },

  // 打印出库单
  printOrder(id) {
    const r = DB.findById('outbounds', id); if (!r) return;
    const isReturn = r.type === '退货出库';
    const w = window.open('', '_blank', 'width=800,height=600');
    w.document.write(`<html><head><meta charset="UTF-8"><title>出库单 - ${r.code}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:"Microsoft YaHei","SimHei",sans-serif;padding:40px;color:#333;font-size:14px}
      .ph{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:20px}
      .pt{font-size:22px;font-weight:700}.ps{font-size:12px;color:#666;margin-top:4px}
      .pm{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;font-size:13px}.pm .l{color:#666}
      table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{border:1px solid #ccc;padding:10px 12px;text-align:left;font-size:13px}th{background:#f5f5f5;font-weight:600}.n{text-align:right;font-family:Consolas,monospace}
      .total{text-align:right;font-size:15px;font-weight:700;margin-bottom:20px;padding:10px 0;border-top:1px solid #ccc}
      .pf{display:flex;justify-content:space-between;margin-top:40px;font-size:13px;color:#666}.pf div{text-align:center;min-width:150px}.pf .sl{border-bottom:1px solid #ccc;margin-top:40px;width:120px;display:inline-block}
      @media print{body{padding:20px}}
    </style></head><body>
      <div class="ph"><div><div class="pt">${isReturn ? '退 货 出 库 单' : '出 库 单'}</div><div class="ps">综合业务管理系统 ERP ${(localStorage.getItem('wms_sysVersion') || 'v3.0').replace(/^v/, '')}</div></div>
        <div style="text-align:right;font-size:13px"><div>单号: <strong>${r.code}</strong></div><div>日期: ${r.date}</div><div>类型: ${isReturn ? '退货出库' : '销售出库'}</div><div>状态: ${r.status||'已完成'}</div></div></div>
      <div class="pm">
        <div><span class="l">${isReturn ? '退回供应商：' : '客户：'}</span>${r.customerName}</div><div><span class="l">操作员：</span>${r.operator}</div>
        <div><span class="l">商品名称：</span>${r.goodsName}</div><div><span class="l">商品编码：</span>${r.goodsCode}</div>
        ${r.equipSerial ? `<div><span class="l">设备序列号：</span><strong style="color:#7c3aed">${r.equipSerial}</strong></div>` : ''}
        ${isReturn && r.returnReason ? `<div><span class="l">退货原因：</span>${r.returnReason}</div>` : ''}
        ${!isReturn && r.salesmanName ? `<div><span class="l">销售人员：</span>${r.salesmanName}</div>` : ''}
        ${!isReturn && r.orderNo ? `<div><span class="l">订单编号：</span>${r.orderNo}</div>` : ''}</div>
      <table><thead><tr><th style="width:50px">序号</th><th>项目</th><th class="n">数量</th><th class="n">单价</th><th class="n">金额</th></tr></thead>
        <tbody><tr><td>1</td><td>${r.goodsName}</td><td class="n">${r.qty}</td><td class="n">${fmtMoney(r.price)}</td><td class="n">${fmtMoney(r.total)}</td></tr></tbody></table>
      <div class="total">合计金额: ${fmtMoney(r.total)}</div>
      ${r.note?`<div style="margin-bottom:20px;font-size:13px"><span style="color:#666">备注：</span>${r.note}</div>`:''}
      ${r.reviewNote?`<div style="margin-bottom:20px;font-size:13px"><span style="color:#666">审核意见：</span>${r.reviewNote}</div>`:''}
      <div class="pf"><div>制单人<br><span class="sl"></span></div><div>审核人<br><span class="sl"></span></div><div>领货人<br><span class="sl"></span></div><div>日期<br><span class="sl"></span></div></div>
    </body></html>`);
    w.document.close(); w.onload = () => w.print();
  },

  view(id) {
    const r = DB.findById('outbounds', id); if (!r) return;
    const st = r.status || '已完成';
    const badge = st === '待审核' ? 'badge-warning' : st === '已驳回' ? 'badge-danger' : 'badge-success';
    const isReturn = r.type === '退货出库';
    
    // 构建详情字段
    const fields = [
      ['出库单号', `<code style="color:var(--danger)">${r.code}</code>`],
      ['单据类型', isReturn 
        ? '<span class="badge" style="background:rgba(251,146,60,0.12);color:#ea580c">退货出库</span>'
        : r.type === '设备出库'
        ? '<span class="badge" style="background:rgba(139,92,246,0.12);color:#7c3aed">🖥 设备出库</span>'
        : '<span class="badge" style="background:rgba(59,130,246,0.12);color:#2563eb">销售出库</span>'],
      ['出库日期', r.date],
      ['商品名称', r.goodsName],
      ['商品编码', r.goodsCode],
      ['出库数量', `<span style="color:var(--danger);font-weight:700;font-size:16px">-${r.qty}</span>`],
      ['出库单价', fmtMoney(r.price)],
      ['出库金额', `<span style="color:var(--primary);font-weight:700">${fmtMoney(r.total)}</span>`]
    ];
    
    // 根据类型添加不同字段
    if (isReturn) {
      fields.push(['退回供应商', r.customerName || '-']);
      fields.push(['退货原因', r.returnReason || '-']);
    } else {
      fields.push(['客户', r.customerName || '-']);
      // 销售人员
      if (r.salesmanName) {
        fields.push(['销售人员', `<span style="color:var(--secondary);font-weight:600">👤 ${r.salesmanName}</span>`]);
      }
      if (r.orderNo) {
        fields.push(['订单编号', `<code style="font-size:12px">${r.orderNo}</code>`]);
      }
    }
    
    // 设备出库信息
    if (r.type === '设备出库' && r.equipSerial) {
      const serials = r.equipSerial.split(',').map(s => s.trim()).filter(Boolean);
      const serialDisplay = serials.map(s => `<code style="background:rgba(139,92,246,0.08);padding:4px 8px;border-radius:4px;color:#7c3aed;margin:2px;display:inline-block">${s}</code>`).join(' ');
      fields.push(['设备序列号', serials.length > 1 ? `<div style="display:flex;flex-wrap:wrap">${serialDisplay}</div>` : serialDisplay]);
      fields.push(['工单同步', r.equipLinked ? `<span class="badge badge-success">已关联 ${serials.length} 个工单</span>` : '<span class="badge badge-default" style="background:#f0f0f0;color:#999">待同步</span>']);
    }
    
    fields.push(['操作员', r.operator]);
    fields.push(['状态', `<span class="badge ${badge}">${st}</span>`]);
    fields.push(['备注', r.note || '-']);
    
    openModal('出库单详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${fields.map(([k,v])=>`<div style="background:var(--bg);border-radius:8px;padding:12px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${k}</div><div style="font-size:14px;font-weight:500">${v}</div></div>`).join('')}
        ${r.reviewedBy?`<div style="background:var(--bg);border-radius:8px;padding:12px;grid-column:1/-1"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">审核信息</div><div style="font-size:13px">审核人: ${r.reviewedBy} | 时间: ${r.reviewedAt||'-'}</div>${r.reviewNote?`<div style="font-size:13px;margin-top:4px;color:var(--text-muted)">审核意见: ${r.reviewNote}</div>`:''}</div>`:''}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${st==='已审核'?`<button class="btn btn-outline" onclick="PrintManager.printSalesOrder(${id})">📄 销售单</button><button class="btn btn-primary" onclick="outbound.printOrder(${id})">🖨 打印</button>`:''}
       ${st==='待审核'&&currentUser.role==='admin'?`<button class="btn btn-primary" onclick="closeModal();outbound.approve(${id})">✅ 审核</button>`:''}`
    );
  },

  // 导出出库单CSV
  exportData() {
    if (!hasPerm('outbound', 'export')) { toast('没有导出权限', 'error'); return; }
    let list = DB.get('outbounds');
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => r.code.toLowerCase().includes(kw) || r.goodsName.toLowerCase().includes(kw) || r.customerName.toLowerCase().includes(kw)); }
    if (this.dateFilter) list = list.filter(r => r.date.startsWith(this.dateFilter));
    if (this.statusFilter) list = list.filter(r => (r.status || '已完成') === this.statusFilter);
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const headers = ['出库单号', '类型', '商品名称', '商品编码', '出库数量', '单价', '出库金额', '客户', '销售人员', '出库日期', '操作员', '状态', '备注'];
    const rows = list.map(r => [r.code, r.type || '销售出库', r.goodsName, r.goodsCode, r.qty, r.price, r.total, r.customerName || '', r.salesmanName || '', r.date, r.operator || '', r.status || '已完成', r.note || '']);
    exportTableToCSV(headers, rows, `出库单列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条出库单`, 'success');
  }
};