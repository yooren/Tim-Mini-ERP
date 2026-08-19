// ===========================
// 承运商管理
// ===========================

const carrier = {
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
            <input type="text" placeholder="搜索承运商名称..." value="${this.keyword}"
              oninput="carrier.keyword=this.value;carrier.page=1;carrier.reload()">
          </div>
          <select class="filter-select" value="${this.statusFilter}"
            onchange="carrier.statusFilter=this.value;carrier.page=1;carrier.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="1" ${this.statusFilter==='1'?'selected':''}>启用</option>
            <option value="0" ${this.statusFilter==='0'?'selected':''}>禁用</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="carrier.exportData()">📥 导出</button>
          <button class="btn btn-primary" onclick="carrier.openAdd()">+ 新增承运商</button>
        </div>
      </div>
      <div class="card" id="carrierCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('carriers');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.contact || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => String(r.status) === this.statusFilter);
    list = list.sort((a, b) => b.status - a.status);

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">🚚</div><div class="empty-state-text">暂无承运商数据</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>承运商</th><th>联系人</th><th>联系电话</th><th>承运类型</th><th>评分</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = r.status === 1 ? 'badge-success' : 'badge-default';
          const stars = '★'.repeat(r.rating || 5) + '☆'.repeat(5 - (r.rating || 5));
          return `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.contact || '-'}</td>
            <td><a href="tel:${r.phone}" style="color:var(--primary)">${r.phone || '-'}</a></td>
            <td><span class="badge badge-default">${r.vehicleTypes || '-'}</span></td>
            <td><span style="color:#f59e0b">${stars}</span></td>
            <td><span class="badge ${badge}">${r.status === 1 ? '启用' : '禁用'}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="carrier.edit(${r.id})">✏️ 编辑</button>
                <button class="btn btn-ghost btn-sm" onclick="carrier.toggleStatus(${r.id})">${r.status === 1 ? '⏸ 禁用' : '▶ 启用'}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'carrier.goPage')}`;
  },

  reload() {
    const card = document.getElementById('carrierCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    if (!hasPerm('carrier', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新增承运商', `
      <div class="form-row cols-2">
        <div class="form-item"><label>承运商名称 *</label><input id="cName" placeholder="如：顺丰速运"></div>
        <div class="form-item"><label>联系人</label><input id="cContact" placeholder="负责人姓名"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系电话</label><input id="cPhone" placeholder="客服热线"></div>
        <div class="form-item"><label>承运类型</label>
          <select id="cVehicleTypes">
            <option value="快递">快递</option>
            <option value="陆运">陆运</option>
            <option value="空运">空运</option>
            <option value="快递,陆运">快递+陆运</option>
            <option value="陆运,零担">陆运+零担</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>地址</label><input id="cAddress" placeholder="公司地址"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>评分</label>
          <select id="cRating">
            <option value="5">★★★★★ 5星</option>
            <option value="4">★★★★☆ 4星</option>
            <option value="3">★★★☆☆ 3星</option>
            <option value="2">★★☆☆☆ 2星</option>
            <option value="1">★☆☆☆☆ 1星</option>
          </select>
        </div>
        <div class="form-item"><label>状态</label>
          <select id="cStatus">
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="carrier.save()">保存</button>`
    );
  },

  save() {
    const name = document.getElementById('cName').value.trim();
    if (!name) { toast('请输入承运商名称', 'error'); return; }

    DB.add('carriers', {
      name: name,
      contact: document.getElementById('cContact').value,
      phone: document.getElementById('cPhone').value,
      vehicleTypes: document.getElementById('cVehicleTypes').value,
      address: document.getElementById('cAddress').value,
      rating: +document.getElementById('cRating').value,
      status: +document.getElementById('cStatus').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('承运商已添加', 'success');
    closeModal();
    this.reload();
  },

  edit(id) {
    if (!hasPerm('carrier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('carriers', id);
    if (!r) return;
    this.editingId = id;

    openModal('编辑承运商', `
      <div class="form-row cols-2">
        <div class="form-item"><label>承运商名称 *</label><input id="cEditName" value="${r.name}"></div>
        <div class="form-item"><label>联系人</label><input id="cEditContact" value="${r.contact || ''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系电话</label><input id="cEditPhone" value="${r.phone || ''}"></div>
        <div class="form-item"><label>承运类型</label>
          <select id="cEditVehicleTypes">
            <option value="快递" ${r.vehicleTypes === '快递' ? 'selected' : ''}>快递</option>
            <option value="陆运" ${r.vehicleTypes === '陆运' ? 'selected' : ''}>陆运</option>
            <option value="空运" ${r.vehicleTypes === '空运' ? 'selected' : ''}>空运</option>
            <option value="快递,陆运" ${r.vehicleTypes === '快递,陆运' ? 'selected' : ''}>快递+陆运</option>
            <option value="陆运,零担" ${r.vehicleTypes === '陆运,零担' ? 'selected' : ''}>陆运+零担</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>地址</label><input id="cEditAddress" value="${r.address || ''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>评分</label>
          <select id="cEditRating">
            <option value="5" ${r.rating === 5 ? 'selected' : ''}>★★★★★ 5星</option>
            <option value="4" ${r.rating === 4 ? 'selected' : ''}>★★★★☆ 4星</option>
            <option value="3" ${r.rating === 3 ? 'selected' : ''}>★★★☆☆ 3星</option>
            <option value="2" ${r.rating === 2 ? 'selected' : ''}>★★☆☆☆ 2星</option>
            <option value="1" ${r.rating === 1 ? 'selected' : ''}>★☆☆☆☆ 1星</option>
          </select>
        </div>
        <div class="form-item"><label>状态</label>
          <select id="cEditStatus">
            <option value="1" ${r.status === 1 ? 'selected' : ''}>启用</option>
            <option value="0" ${r.status === 0 ? 'selected' : ''}>禁用</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="carrier.saveEdit()">保存</button>`
    );
  },

  saveEdit() {
    const name = document.getElementById('cEditName').value.trim();
    if (!name) { toast('请输入承运商名称', 'error'); return; }

    DB.update('carriers', this.editingId, {
      name: name,
      contact: document.getElementById('cEditContact').value,
      phone: document.getElementById('cEditPhone').value,
      vehicleTypes: document.getElementById('cEditVehicleTypes').value,
      address: document.getElementById('cEditAddress').value,
      rating: +document.getElementById('cEditRating').value,
      status: +document.getElementById('cEditStatus').value
    });

    toast('承运商已更新', 'success');
    this.editingId = null;
    closeModal();
    this.reload();
  },

  toggleStatus(id) {
    if (!hasPerm('carrier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('carriers', id);
    if (!r) return;
    const newStatus = r.status === 1 ? 0 : 1;
    DB.update('carriers', id, { status: newStatus });
    toast('状态已更新', 'success');
    this.reload();
  },

  // 导出承运商CSV
  exportData() {
    if (!hasPerm('carrier', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('carriers');
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const headers = ['承运商名称', '联系人', '联系电话', '车辆类型', '地址', '状态'];
    const rows = list.map(c => [c.name, c.contact||'', c.phone||'', c.vehicleTypes||'', c.address||'', c.status?'启用':'停用']);
    exportTableToCSV(headers, rows, `承运商列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条承运商`, 'success');
  }
};
