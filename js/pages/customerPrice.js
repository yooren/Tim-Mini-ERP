// ===========================
// 客户价格管理
// ===========================

const customerPrice = {
  page: 1,
  pageSize: 15,
  keyword: '',
  customerFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索客户/商品..." value="${this.keyword}"
              oninput="customerPrice.keyword=this.value;customerPrice.page=1;customerPrice.reload()">
          </div>
          <select class="filter-select" value="${this.customerFilter}"
            onchange="customerPrice.customerFilter=this.value;customerPrice.page=1;customerPrice.reload()">
            <option value="">全部客户</option>
            ${DB.get('customers').filter(c => c.status === 1).map(c => 
              `<option value="${c.id}" ${this.customerFilter == c.id ? 'selected' : ''}>${c.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-primary" onclick="customerPrice.openAdd()">+ 设置客户价格</button>
        </div>
      </div>
      <div class="card" id="priceCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('customerPrices');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.customerName || '').toLowerCase().includes(kw) || 
        (r.goodsName || '').toLowerCase().includes(kw)
      );
    }
    if (this.customerFilter) list = list.filter(r => r.customerId == this.customerFilter);
    list = list.sort((a, b) => a.customerName.localeCompare(b.customerName));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">暂无客户价格数据</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>客户</th><th>商品</th><th>标准价</th><th>客户价</th><th>折扣率</th>
        <th>生效日期</th><th>失效日期</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const goods = DB.findById('goods', r.goodsId);
          const standardPrice = goods?.price || 0;
          const badge = r.status === 1 ? 'badge-success' : 'badge-default';
          const discountColor = r.discount >= 10 ? 'var(--success)' : r.discount >= 5 ? 'var(--warning)' : 'var(--danger)';
          const isExpired = r.expiryDate && new Date(r.expiryDate) < new Date();
          
          return `<tr>
            <td><strong>${r.customerName}</strong></td>
            <td>${r.goodsName}</td>
            <td style="color:var(--text-muted)">${fmtMoney(standardPrice)}</td>
            <td><span style="font-weight:700;color:var(--success)">${fmtMoney(r.price)}</span></td>
            <td><span style="font-weight:600;color:${discountColor}">${r.discount.toFixed(1)}%</span></td>
            <td style="font-size:12px;color:var(--text-muted)">${r.effectiveDate || '-'}</td>
            <td style="font-size:12px;color:${isExpired ? 'var(--danger)' : 'var(--text-muted)'}">${r.expiryDate || '长期'}</td>
            <td><span class="badge ${badge}">${r.status === 1 ? '启用' : '禁用'}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="customerPrice.edit(${r.id})">✏️ 编辑</button>
                <button class="btn btn-ghost btn-sm" onclick="customerPrice.toggleStatus(${r.id})">${r.status === 1 ? '⏸ 禁用' : '▶ 启用'}</button>
                <button class="btn btn-danger btn-sm" onclick="customerPrice.del(${r.id})">🗑</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'customerPrice.goPage')}`;
  },

  reload() {
    const card = document.getElementById('priceCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    if (!hasPerm('customerPrice', 'create')) { toast('没有新建权限', 'error'); return; }
    const customers = DB.get('customers').filter(c => c.status === 1);
    const goods = DB.get('goods').filter(g => g.status === 1);
    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    openModal('设置客户价格', `
      <div class="form-row cols-2">
        <div class="form-item"><label>客户 *</label>
          <select id="cpCustomer" onchange="customerPrice.onCustomerChange()">
            <option value="">-- 请选择客户 --</option>
            ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>商品 *</label>
          <select id="cpGoods" onchange="customerPrice.onGoodsChange()">
            <option value="">-- 请选择商品 --</option>
            ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="cpGoodsInfo" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;display:none">
        标准售价: <strong id="cpStandardPrice">-</strong> | 成本价: <span id="cpCostPrice">-</span>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>客户价格(¥) *</label><input id="cpPrice" type="number" step="0.01" value="0" oninput="customerPrice.calcDiscount()"></div>
        <div class="form-item"><label>折扣率(%)</label><input id="cpDiscount" type="number" step="0.1" value="100" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>单位</label><input id="cpUnit" placeholder="如：台、箱、个" value="台"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>生效日期</label><input id="cpEffectiveDate" type="date" value="${today}"></div>
        <div class="form-item"><label>失效日期</label><input id="cpExpiryDate" type="date" value="${nextYear}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="cpNote" placeholder="价格说明"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="customerPrice.save()">保存</button>`
    );
  },

  onCustomerChange() {
    const cid = +document.getElementById('cpCustomer').value;
    if (!cid) return;
  },

  onGoodsChange() {
    const gid = +document.getElementById('cpGoods').value;
    if (!gid) { document.getElementById('cpGoodsInfo').style.display = 'none'; return; }
    const g = DB.findById('goods', gid);
    if (!g) return;
    document.getElementById('cpStandardPrice').textContent = fmtMoney(g.price);
    document.getElementById('cpCostPrice').textContent = fmtMoney(g.cost);
    document.getElementById('cpPrice').value = g.price;
    document.getElementById('cpUnit').value = g.unit;
    document.getElementById('cpGoodsInfo').style.display = 'block';
    this.calcDiscount();
  },

  calcDiscount() {
    const gid = +document.getElementById('cpGoods').value;
    if (!gid) return;
    const g = DB.findById('goods', gid);
    if (!g) return;
    const price = +document.getElementById('cpPrice').value || 0;
    const discount = g.price > 0 ? (price / g.price * 100) : 100;
    document.getElementById('cpDiscount').value = discount.toFixed(1);
  },

  save() {
    const cid = +document.getElementById('cpCustomer').value;
    const gid = +document.getElementById('cpGoods').value;
    if (!cid) { toast('请选择客户', 'error'); return; }
    if (!gid) { toast('请选择商品', 'error'); return; }
    const price = +document.getElementById('cpPrice').value;
    if (price <= 0) { toast('请输入有效价格', 'error'); return; }

    const customer = DB.findById('customers', cid);
    const goods = DB.findById('goods', gid);
    const discount = goods.price > 0 ? (price / goods.price * 100) : 100;

    const existing = DB.get('customerPrices').find(p => p.customerId === cid && p.goodsId === gid && p.status === 1);
    if (existing) {
      toast('该客户已有此商品价格，请编辑修改', 'warning');
      return;
    }

    DB.add('customerPrices', {
      customerId: cid,
      customerName: customer?.name || '',
      goodsId: gid,
      goodsName: goods?.name || '',
      price: price,
      discount: discount,
      unit: document.getElementById('cpUnit').value,
      effectiveDate: document.getElementById('cpEffectiveDate').value,
      expiryDate: document.getElementById('cpExpiryDate').value,
      status: 1,
      note: document.getElementById('cpNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('客户价格已设置', 'success');
    audit.log('customerPrice', '设置客户价格', customer?.name + ' - ' + goods?.name, '价格: ' + fmtMoney(price) + ', 折扣: ' + discount.toFixed(1) + '%');
    closeModal();
    this.reload();
  },

  edit(id) {
    if (!hasPerm('customerPrice', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('customerPrices', id);
    if (!r) return;
    this.editingId = id;
    const customers = DB.get('customers').filter(c => c.status === 1);
    const goods = DB.get('goods').filter(g => g.status === 1);

    openModal('编辑客户价格', `
      <div class="form-row cols-2">
        <div class="form-item"><label>客户</label>
          <select id="cpEditCustomer" disabled style="background:#f0f2f8">
            ${customers.map(c=>`<option value="${c.id}" ${c.id === r.customerId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>商品</label>
          <select id="cpEditGoods" disabled style="background:#f0f2f8">
            ${goods.map(g=>`<option value="${g.id}" ${g.id === r.goodsId ? 'selected' : ''}>${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="cpEditGoodsInfo" style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
        标准售价: <strong id="cpEditStandardPrice">${fmtMoney(DB.findById('goods', r.goodsId)?.price || 0)}</strong>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>客户价格(¥)</label><input id="cpEditPrice" type="number" step="0.01" value="${r.price}" oninput="customerPrice.calcEditDiscount()"></div>
        <div class="form-item"><label>折扣率(%)</label><input id="cpEditDiscount" type="number" step="0.1" value="${r.discount}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>单位</label><input id="cpEditUnit" value="${r.unit}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>生效日期</label><input id="cpEditEffectiveDate" type="date" value="${r.effectiveDate}"></div>
        <div class="form-item"><label>失效日期</label><input id="cpEditExpiryDate" type="date" value="${r.expiryDate}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="customerPrice.saveEdit()">保存</button>`
    );
  },

  calcEditDiscount() {
    const gid = +document.getElementById('cpEditGoods').value;
    const g = DB.findById('goods', gid);
    if (!g) return;
    const price = +document.getElementById('cpEditPrice').value || 0;
    const discount = g.price > 0 ? (price / g.price * 100) : 100;
    document.getElementById('cpEditDiscount').value = discount.toFixed(1);
  },

  saveEdit() {
    const price = +document.getElementById('cpEditPrice').value;
    if (price <= 0) { toast('请输入有效价格', 'error'); return; }

    const r = DB.findById('customerPrices', this.editingId);
    if (!r) return;
    const g = DB.findById('goods', r.goodsId);
    const discount = g.price > 0 ? (price / g.price * 100) : 100;

    DB.update('customerPrices', this.editingId, {
      price: price,
      discount: discount,
      unit: document.getElementById('cpEditUnit').value,
      effectiveDate: document.getElementById('cpEditEffectiveDate').value,
      expiryDate: document.getElementById('cpEditExpiryDate').value
    });

    toast('价格已更新', 'success');
    this.editingId = null;
    closeModal();
    this.reload();
  },

  toggleStatus(id) {
    if (!hasPerm('customerPrice', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('customerPrices', id);
    if (!r) return;
    const newStatus = r.status === 1 ? 0 : 1;
    DB.update('customerPrices', id, { status: newStatus });
    toast('价格已' + (newStatus === 1 ? '启用' : '禁用'), 'success');
    this.reload();
  },

  del(id) {
    if (!hasPerm('customerPrice', 'delete')) { toast('没有删除权限', 'error'); return; }
    const r = DB.findById('customerPrices', id);
    if (!r) return;
    openModal('删除确认', `
      <div style="text-align:center;padding:16px 0">
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认删除此客户价格？</div>
        <div style="font-size:13px;color:var(--text-muted)">${r.customerName} - ${r.goodsName}</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="customerPrice.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    DB.delete('customerPrices', id);
    toast('已删除', 'success');
    closeModal();
    this.reload();
  }
};
