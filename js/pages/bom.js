// ===========================
// BOM物料清单管理
// ===========================

const bom = {
  page: 1,
  pageSize: 10,
  keyword: '',
  statusFilter: '',
  activeTab: 'list', // list | formula | substitute | ecn

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 标签页 -->
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn ${this.activeTab === 'list' ? 'btn-primary' : 'btn-ghost'}" onclick="bom.activeTab='list';bom.reload()">📋 物料清单</button>
        <button class="btn ${this.activeTab === 'formula' ? 'btn-primary' : 'btn-ghost'}" onclick="bom.activeTab='formula';bom.reload()">🧪 配方管理</button>
        <button class="btn ${this.activeTab === 'substitute' ? 'btn-primary' : 'btn-ghost'}" onclick="bom.activeTab='substitute';bom.reload()">🔄 替代料</button>
        <button class="btn ${this.activeTab === 'ecn' ? 'btn-primary' : 'btn-ghost'}" onclick="bom.activeTab='ecn';bom.reload()">📝 工程变更</button>
      </div>
      <div id="bomContent">${this.activeTab === 'list' ? this.renderList() : this.activeTab === 'formula' ? this.renderFormula() : this.activeTab === 'substitute' ? this.renderSubstitute() : this.renderECN()}</div>
    </div>`;
  },

  reload() {
    const content = document.getElementById('bomContent');
    if (content) content.innerHTML = this.activeTab === 'list' ? this.renderList() : this.activeTab === 'formula' ? this.renderFormula() : this.activeTab === 'substitute' ? this.renderSubstitute() : this.renderECN();
  },

  // ========== 物料清单 ==========
  renderList() {
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索BOM编码/名称..." value="${this.keyword}"
            oninput="bom.keyword=this.value;bom.page=1;bom.reload()">
        </div>
        <select class="filter-select" value="${this.statusFilter}"
          onchange="bom.statusFilter=this.value;bom.page=1;bom.reload()">
          <option value="">全部状态</option>
          <option value="启用" ${this.statusFilter==='启用'?'selected':''}>启用</option>
          <option value="禁用" ${this.statusFilter==='禁用'?'selected':''}>禁用</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="bom.openAddBOM()">+ 新建BOM</button>
      </div>
    </div>
    <div class="card" id="bomListCard">${this.renderBOMTable()}</div>`;
  },

  renderBOMTable() {
    let list = DB.get('boms');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.bomCode || '').toLowerCase().includes(kw) || 
        (r.name || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无BOM数据</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>BOM编码</th><th>BOM名称</th><th>版本</th><th>产品</th><th>物料数</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = r.status === '启用' ? 'badge-success' : 'badge-default';
          const itemCount = r.items ? r.items.length : 0;
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.bomCode}</span></td>
            <td><strong>${r.name}</strong></td>
            <td><span class="badge badge-default">${r.version || 'V1.0'}</span></td>
            <td>${r.goodsName || '-'}</td>
            <td><span class="badge badge-info">${itemCount}项</span></td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="bom.viewBOM(${r.id})">👁 查看</button>
                <button class="btn btn-ghost btn-sm" onclick="bom.copyBOM(${r.id})">📋 复制</button>
                <button class="btn btn-ghost btn-sm" onclick="bom.toggleStatus(${r.id})">${r.status === '启用' ? '⏸' : '▶'}</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'bom.goPage')}`;
  },

  goPage(p) { this.page = p; this.reload(); },

  openAddBOM() {
    if (!hasPerm('bom', 'create')) { toast('没有新建权限', 'error'); return; }
    const goods = DB.get('goods').filter(g => g.status === 1);
    const code = DB.genCode('BOM');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建BOM', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>BOM编码：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>BOM名称 *</label><input id="bomName" placeholder="如：iPhone套装"></div>
        <div class="form-item"><label>版本</label><input id="bomVersion" value="V1.0"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>产品分类</label>
          <select id="bomCategory">
            <option value="成品">成品</option>
            <option value="半成品">半成品</option>
            <option value="组件">组件</option>
          </select>
        </div>
        <div class="form-item"><label>关联产品 *</label>
          <select id="bomGoods">
            <option value="">-- 请选择 --</option>
            ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-top:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong style="font-size:13px">物料明细</strong>
          <button class="btn btn-outline btn-sm" onclick="bom.addBOMItem()">+ 添加物料</button>
        </div>
        <div id="bomItemsContainer">
          <div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px">点击上方按钮添加物料</div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="bom.saveBOM('${code}')">保存BOM</button>`
    );
    this.bomItems = [];
  },

  addBOMItem() {
    const goods = DB.get('goods').filter(g => g.status === 1);
    const container = document.getElementById('bomItemsContainer');
    if (!container) return;

    const idx = this.bomItems ? this.bomItems.length : 0;
    if (!this.bomItems) this.bomItems = [];

    const itemHtml = `
      <div class="bom-item-row" id="bomItem_${idx}" style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 40px;gap:8px;padding:8px;background:var(--bg);border-radius:6px;margin-bottom:8px;align-items:center">
        <select id="biGoods_${idx}" onchange="bom.onItemGoodsChange(${idx})">
          <option value="">-- 选择物料 --</option>
          ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name}</option>`).join('')}
        </select>
        <input type="number" id="biQty_${idx}" placeholder="数量" min="0.01" step="0.01" value="1">
        <input type="text" id="biUnit_${idx}" placeholder="单位" value="个">
        <input type="number" id="biScrap_${idx}" placeholder="损耗%" min="0" max="100" value="0">
        <button class="btn btn-danger btn-sm" onclick="bom.removeBOMItem(${idx})" style="padding:4px 8px">×</button>
      </div>`;

    if (container.querySelector('.bom-item-row')) {
      container.insertAdjacentHTML('beforeend', itemHtml);
    } else {
      container.innerHTML = itemHtml;
    }
    this.bomItems.push({});
  },

  onItemGoodsChange(idx) {
    const gid = +document.getElementById('biGoods_' + idx).value;
    if (!gid) return;
    const g = DB.findById('goods', gid);
    if (g) {
      document.getElementById('biUnit_' + idx).value = g.unit || '个';
    }
  },

  removeBOMItem(idx) {
    const row = document.getElementById('bomItem_' + idx);
    if (row) row.remove();
    if (this.bomItems) this.bomItems[idx] = null;
  },

  saveBOM(code) {
    const name = document.getElementById('bomName').value.trim();
    const goodsId = +document.getElementById('bomGoods').value;
    if (!name) { toast('请输入BOM名称', 'error'); return; }
    if (!goodsId) { toast('请选择关联产品', 'error'); return; }

    const goods = DB.findById('goods', goodsId);
    const items = [];
    document.querySelectorAll('.bom-item-row').forEach(row => {
      const id = row.id.replace('bomItem_', '');
      const gid = +document.getElementById('biGoods_' + id).value;
      if (!gid) return;
      const g = DB.findById('goods', gid);
      items.push({
        materialId: gid,
        materialName: g?.name || '',
        qty: +document.getElementById('biQty_' + id).value || 1,
        unit: document.getElementById('biUnit_' + id).value,
        scrapRate: (+document.getElementById('biScrap_' + id).value || 0) / 100
      });
    });

    if (items.length === 0) { toast('请至少添加一个物料', 'error'); return; }

    DB.add('boms', {
      bomCode: code,
      name: name,
      version: document.getElementById('bomVersion').value || 'V1.0',
      category: document.getElementById('bomCategory').value,
      goodsId: goodsId,
      goodsName: goods?.name || '',
      items: items,
      status: '启用',
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('BOM已创建', 'success');
    audit.log('bom', '新建BOM', code, name);
    closeModal();
    this.reload();
  },

  viewBOM(id) {
    const r = DB.findById('boms', id);
    if (!r) return;

    const itemsHtml = r.items && r.items.length > 0 ? r.items.map(item => `
      <tr>
        <td>${item.materialName}</td>
        <td>${item.qty} ${item.unit}</td>
        <td>${(item.scrapRate * 100).toFixed(0)}%</td>
        <td>${(item.qty * (1 + item.scrapRate)).toFixed(2)}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">无物料数据</td></tr>';

    openModal('BOM详情 - ' + r.name, `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">BOM编码</div>
          <div style="font-weight:600;color:var(--primary)">${r.bomCode}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">版本</div>
          <div style="font-weight:500">${r.version || 'V1.0'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">产品</div>
          <div style="font-weight:500">${r.goodsName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">状态</div>
          <div><span class="badge ${r.status === '启用' ? 'badge-success' : 'badge-default'}">${r.status}</span></div>
        </div>
      </div>
      <div class="card-title">物料明细</div>
      <div class="table-wrap"><table>
        <thead><tr><th>物料名称</th><th>数量</th><th>损耗率</th><th>实际用量</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  copyBOM(id) {
    if (!hasPerm('bom', 'create')) { toast('没有新建权限', 'error'); return; }
    const r = DB.findById('boms', id);
    if (!r) return;
    const code = DB.genCode('BOM');
    DB.add('boms', {
      ...r,
      id: undefined,
      bomCode: code,
      name: r.name + '(副本)',
      version: 'V1.0',
      status: '禁用',
      createdAt: new Date().toISOString().slice(0, 10)
    });
    toast('BOM已复制', 'success');
    this.reload();
  },

  toggleStatus(id) {
    if (!hasPerm('bom', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('boms', id);
    if (!r) return;
    DB.update('boms', id, { status: r.status === '启用' ? '禁用' : '启用' });
    toast('状态已更新', 'success');
    this.reload();
  },

  // ========== 配方管理 ==========
  renderFormula() {
    const boms = DB.get('boms').filter(b => b.status === '启用');
    if (!boms.length) return `<div class="empty-state"><div class="empty-state-icon">🧪</div><div class="empty-state-text">暂无启用的配方(BOM)</div></div>`;

    return `
    <div class="card">
      <div class="card-title">配方列表</div>
      <div class="table-wrap"><table>
        <thead><tr><th>配方编码</th><th>配方名称</th><th>产品</th><th>版本</th><th>物料项</th><th>操作</th></tr></thead>
        <tbody>
          ${boms.map(r => `<tr>
            <td><span style="color:var(--primary)">${r.bomCode}</span></td>
            <td><strong>${r.name}</strong></td>
            <td>${r.goodsName || '-'}</td>
            <td>${r.version || 'V1.0'}</td>
            <td>${r.items ? r.items.length : 0}项</td>
            <td><button class="btn btn-ghost btn-sm" onclick="bom.viewBOM(${r.id})">详情</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  // ========== 替代料 ==========
  renderSubstitute() {
    let list = DB.get('bomSubstitutes');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.originalName || '').toLowerCase().includes(kw) || 
        (r.substituteName || '').toLowerCase().includes(kw)
      );
    }

    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">🔄</div><div class="empty-state-text">暂无替代料数据</div></div>`;

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索原物料/替代料..." value="${this.keyword}"
            oninput="bom.keyword=this.value;bom.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="bom.openAddSubstitute()">+ 添加替代料</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>BOM</th><th>原物料</th><th>替代物料</th><th>替换比例</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const bom = DB.findById('boms', r.bomId);
            return `<tr>
              <td>${bom?.name || '-'}</td>
              <td><strong>${r.originalName}</strong></td>
              <td style="color:var(--primary)">${r.substituteName}</td>
              <td>1:${r.ratio || 1}</td>
              <td>P${r.priority || 1}</td>
              <td><span class="badge ${r.status === 1 ? 'badge-success' : 'badge-default'}">${r.status === 1 ? '启用' : '禁用'}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="bom.toggleSubstitute(${r.id})">${r.status === 1 ? '⏸' : '▶'}</button>
                  <button class="btn btn-danger btn-sm" onclick="bom.delSubstitute(${r.id})">🗑</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  openAddSubstitute() {
    if (!hasPerm('bom', 'create')) { toast('没有新建权限', 'error'); return; }
    const boms = DB.get('boms').filter(b => b.status === '启用');
    const goods = DB.get('goods').filter(g => g.status === 1);

    openModal('添加替代料', `
      <div class="form-row cols-2">
        <div class="form-item"><label>BOM *</label>
          <select id="subBom">
            <option value="">-- 请选择 --</option>
            ${boms.map(b=>`<option value="${b.id}">${b.name} (${b.bomCode})</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>优先级</label>
          <select id="subPriority">
            <option value="1">P1 首选</option>
            <option value="2">P2 次选</option>
            <option value="3">P3 备选</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>原物料 *</label>
          <select id="subOriginal">
            <option value="">-- 请选择 --</option>
            ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>替代物料 *</label>
          <select id="subSubstitute">
            <option value="">-- 请选择 --</option>
            ${goods.map(g=>`<option value="${g.id}">${g.code} - ${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>替换比例</label>
          <input id="subRatio" type="number" step="0.1" value="1" placeholder="1:1">
        </div>
        <div class="form-item"><label>状态</label>
          <select id="subStatus">
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="bom.saveSubstitute()">保存</button>`
    );
  },

  saveSubstitute() {
    const bomId = +document.getElementById('subBom').value;
    const originalId = +document.getElementById('subOriginal').value;
    const substituteId = +document.getElementById('subSubstitute').value;
    if (!bomId || !originalId || !substituteId) { toast('请填写必填项', 'error'); return; }

    const bom = DB.findById('boms', bomId);
    const original = DB.findById('goods', originalId);
    const substitute = DB.findById('goods', substituteId);

    DB.add('bomSubstitutes', {
      bomId, bomName: bom?.name || '',
      originalId, originalName: original?.name || '',
      substituteId, substituteName: substitute?.name || '',
      ratio: +document.getElementById('subRatio').value || 1,
      priority: +document.getElementById('subPriority').value || 1,
      status: +document.getElementById('subStatus').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('替代料已添加', 'success');
    closeModal();
    this.reload();
  },

  toggleSubstitute(id) {
    if (!hasPerm('bom', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('bomSubstitutes', id);
    if (!r) return;
    DB.update('bomSubstitutes', id, { status: r.status === 1 ? 0 : 1 });
    this.reload();
  },

  delSubstitute(id) {
    if (!hasPerm('bom', 'delete')) { toast('没有删除权限', 'error'); return; }
    DB.delete('bomSubstitutes', id);
    toast('已删除', 'success');
    this.reload();
  },

  // ========== 工程变更ECN ==========
  renderECN() {
    let list = DB.get('ecns');

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索变更单号..." value="${this.keyword}"
            oninput="bom.keyword=this.value;bom.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="bom.openAddECN()">+ 新建ECN</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>ECN单号</th><th>BOM</th><th>版本变更</th><th>变更类型</th><th>变更原因</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.length ? list.map(r => `<tr>
            <td><span style="color:var(--primary)">${r.ecnNo}</span></td>
            <td><strong>${r.bomName}</strong></td>
            <td>${r.version} → ${r.newVersion}</td>
            <td><span class="badge badge-default">${r.changeType}</span></td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis">${r.changeReason || '-'}</td>
            <td><span class="badge ${r.status === '已审核' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="bom.viewECN(${r.id})">详情</button>
                ${r.status === '待审核' ? `<button class="btn btn-primary btn-sm" onclick="bom.approveECN(${r.id})">审核</button>` : ''}
              </div>
            </td>
          </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted)">暂无工程变更单</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  },

  openAddECN() {
    if (!hasPerm('bom', 'create')) { toast('没有新建权限', 'error'); return; }
    const boms = DB.get('boms').filter(b => b.status === '启用');
    const code = DB.genCode('ECN');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建工程变更单', `
      <div style="background:var(--danger);color:white;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        ⚠️ 工程变更将影响生产计划，请谨慎操作
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>ECN单号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>BOM *</label>
          <select id="ecnBom" onchange="bom.onECNBomChange()">
            <option value="">-- 请选择 --</option>
            ${boms.map(b=>`<option value="${b.id}">${b.name} (${b.version})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>当前版本</label><input id="ecnVersion" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>新版本 *</label><input id="ecnNewVersion" placeholder="如：V2.0"></div>
        <div class="form-item"><label>变更类型</label>
          <select id="ecnChangeType">
            <option value="物料替换">物料替换</option>
            <option value="用量调整">用量调整</option>
            <option value="新增物料">新增物料</option>
            <option value="删除物料">删除物料</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>变更原因 *</label><input id="ecnReason" placeholder="变更原因"></div>
        <div class="form-item"><label>生效日期</label><input id="ecnEffectiveDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>变更内容 *</label><textarea id="ecnContent" rows="3" placeholder="详细描述变更内容"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="bom.saveECN('${code}')">提交</button>`
    );
  },

  onECNBomChange() {
    const bomId = +document.getElementById('ecnBom').value;
    if (!bomId) return;
    const b = DB.findById('boms', bomId);
    if (b) {
      document.getElementById('ecnVersion').value = b.version || 'V1.0';
    }
  },

  saveECN(code) {
    const bomId = +document.getElementById('ecnBom').value;
    if (!bomId) { toast('请选择BOM', 'error'); return; }
    const reason = document.getElementById('ecnReason').value.trim();
    const content = document.getElementById('ecnContent').value.trim();
    if (!reason || !content) { toast('请填写变更原因和内容', 'error'); return; }

    const b = DB.findById('boms', bomId);

    DB.add('ecns', {
      ecnNo: code,
      bomId, bomName: b?.name || '',
      version: document.getElementById('ecnVersion').value,
      newVersion: document.getElementById('ecnNewVersion').value,
      changeType: document.getElementById('ecnChangeType').value,
      changeReason: reason,
      changeContent: content,
      effectiveDate: document.getElementById('ecnEffectiveDate').value,
      status: '待审核',
      applicant: currentUser.username,
      reviewer: '',
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('ECN已提交，等待审核', 'success');
    closeModal();
    this.reload();
  },

  viewECN(id) {
    const r = DB.findById('ecns', id);
    if (!r) return;

    openModal('ECN详情 - ' + r.ecnNo, `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">ECN单号</div>
          <div style="font-weight:600;color:var(--primary)">${r.ecnNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">BOM</div>
          <div style="font-weight:500">${r.bomName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">状态</div>
          <div><span class="badge ${r.status === '已审核' ? 'badge-success' : 'badge-warning'}">${r.status}</span></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">版本变更</div>
          <div style="font-weight:600">${r.version} → ${r.newVersion}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">变更类型</div>
          <div><span class="badge badge-default">${r.changeType}</span></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">申请人</div>
          <div>${r.applicant}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted)">生效日期</div>
          <div>${r.effectiveDate || '-'}</div>
        </div>
      </div>
      <div style="margin-top:12px;background:var(--bg);border-radius:8px;padding:12px">
        <div style="font-size:11px;color:var(--text-muted)">变更原因</div>
        <div>${r.changeReason}</div>
      </div>
      <div style="margin-top:12px;background:var(--bg);border-radius:8px;padding:12px">
        <div style="font-size:11px;color:var(--text-muted)">变更内容</div>
        <div>${r.changeContent}</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${r.status === '待审核' ? `<button class="btn btn-primary" onclick="closeModal();bom.approveECN(${id})">审核通过</button>` : ''}`
    );
  },

  approveECN(id) {
    if (!hasPerm('bom', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('ecns', id);
    if (!r) return;

    DB.update('ecns', id, { status: '已审核', reviewer: currentUser.username });
    DB.update('boms', r.bomId, { version: r.newVersion });
    toast('ECN已审核，BOM版本已更新', 'success');
    this.reload();
  },

  init() {}
};
