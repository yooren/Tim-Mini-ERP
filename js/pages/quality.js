// ===========================
// 质量管理 QM
// ===========================

const quality = {
  page: 1,
  pageSize: 12,
  keyword: '',
  statusFilter: '',
  activeTab: 'iqc', // iqc | pqc | fqc | ncr | spc | cert

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 标签页 -->
      <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
        <button class="btn ${this.activeTab === 'iqc' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='iqc';quality.reload()">🔍 来料检验</button>
        <button class="btn ${this.activeTab === 'pqc' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='pqc';quality.reload()">⚙️ 过程检验</button>
        <button class="btn ${this.activeTab === 'fqc' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='fqc';quality.reload()">🏭 成品检验</button>
        <button class="btn ${this.activeTab === 'ncr' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='ncr';quality.reload()">⚠️ 不良管理</button>
        <button class="btn ${this.activeTab === 'spc' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='spc';quality.reload()">📊 SPC分析</button>
        <button class="btn ${this.activeTab === 'cert' ? 'btn-primary' : 'btn-ghost'}" onclick="quality.activeTab='cert';quality.reload()">📄 合格证</button>
      </div>
      <div id="qualityContent">${this.renderTab()}</div>
    </div>`;
  },

  renderTab() {
    if (this.activeTab === 'iqc') return this.renderIQC();
    if (this.activeTab === 'pqc') return this.renderPQC();
    if (this.activeTab === 'fqc') return this.renderFQC();
    if (this.activeTab === 'ncr') return this.renderNCR();
    if (this.activeTab === 'spc') return this.renderSPC();
    return this.renderCert();
  },

  reload() {
    const content = document.getElementById('qualityContent');
    if (content) content.innerHTML = this.renderTab();
  },

  // ========== 统计卡片 ==========
  getStats() {
    const iqc = DB.get('incomingInspections');
    const fqc = DB.get('finalInspections');
    const ncr = DB.get('qualityNCRs');
    return [
      { label: '待检来料', value: iqc.filter(r => r.status === '待检').length, color: 'orange' },
      { label: '待检成品', value: fqc.filter(r => r.status === '待检').length, color: 'blue' },
      { label: '未处理不良', value: ncr.filter(r => r.status === '待处理').length, color: 'red' },
      { label: '已发合格证', value: DB.get('qualityCertificates').length, color: 'green' }
    ];
  },

  // ========== 来料检验 IQC ==========
  renderIQC() {
    const stats = this.getStats();
    let list = DB.get('incomingInspections');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.supplierName || '').toLowerCase().includes(kw) ||
        (r.goodsName || '').toLowerCase().includes(kw) ||
        (r.batchNo || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

    return `
    <!-- 统计 -->
    <div class="stat-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
      ${stats.map(s => `
        <div class="stat-card ${s.color}">
          <div class="stat-icon ${s.color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索单号/供应商/商品/批次..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.page=1;quality.reload()">
        </div>
        <select class="filter-select" value="${this.statusFilter}"
          onchange="quality.statusFilter=this.value;quality.page=1;quality.reload()">
          <option value="">全部状态</option>
          <option value="待检" ${this.statusFilter==='待检'?'selected':''}>待检</option>
          <option value="合格" ${this.statusFilter==='合格'?'selected':''}>合格</option>
          <option value="不合格" ${this.statusFilter==='不合格'?'selected':''}>不合格</option>
          <option value="让步接收" ${this.statusFilter==='让步接收'?'selected':''}>让步接收</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="quality.openAddIQC()">+ 新建来料检验</button>
      </div>
    </div>

    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">暂无来料检验记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>检验单号</th><th>供应商</th><th>商品</th><th>批次号</th><th>送检量</th><th>合格/不合格</th><th>检验日期</th><th>检验员</th><th>结果</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const resultBadge = r.result === '合格' ? 'badge-success' : r.result === '不合格' ? 'badge-danger' : 'badge-warning';
            const statusBadge = r.status === '待检' ? 'badge-warning' : r.status === '合格' ? 'badge-success' : r.status === '不合格' ? 'badge-danger' : 'badge-default';
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td>${r.supplierName || '-'}</td>
              <td><strong>${r.goodsName || '-'}</strong></td>
              <td>${r.batchNo || '-'}</td>
              <td>${r.inspectQty}</td>
              <td><span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty || 0}</span></td>
              <td>${r.inspectDate || '-'}</td>
              <td>${r.inspector || '-'}</td>
              <td><span class="badge ${resultBadge}">${r.result || '待检'}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="quality.viewIQC(${r.id})">查看</button>
                  ${r.status === '待检' ? `<button class="btn btn-ghost btn-sm" onclick="quality.openEditIQC(${r.id})">检验</button>` : ''}
                  ${r.result === '不合格' ? `<button class="btn btn-ghost btn-sm" onclick="quality.createNCR('来料', ${r.id})">开NCR</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  openAddIQC() {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('IQC');
    const suppliers = DB.get('suppliers').filter(s => s.status === 1);
    const goods = DB.get('goods');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建来料检验单', `
      <div class="form-row cols-2">
        <div class="form-item"><label>检验单号</label><input id="iqcCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>供应商 *</label>
          <select id="iqcSupplier">
            <option value="">请选择供应商</option>
            ${suppliers.map(s => `<option value="${s.id}|${s.name}">${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>商品 *</label>
          <select id="iqcGoods">
            <option value="">请选择商品</option>
            ${goods.map(g => `<option value="${g.id}|${g.name}">${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>批次号</label><input id="iqcBatch" placeholder="如：LOT-2025-001"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>送检数量 *</label><input id="iqcQty" type="number" min="1" placeholder="送检数量"></div>
        <div class="form-item"><label>抽样数量</label><input id="iqcSample" type="number" min="0" value="10"></div>
        <div class="form-item"><label>检验日期</label><input id="iqcDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>检验员</label><input id="iqcInspector" value="${currentUser.username}"></div>
        <div class="form-item"><label>检验结果</label>
          <select id="iqcResult">
            <option value="待检">待检</option>
            <option value="合格">合格</option>
            <option value="不合格">不合格</option>
            <option value="让步接收">让步接收</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合格数量</label><input id="iqcQualified" type="number" min="0" placeholder="合格数量"></div>
        <div class="form-item"><label>不合格数量</label><input id="iqcUnqualified" type="number" min="0" value="0" placeholder="不合格数量"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="iqcNote" placeholder="检验说明、异常描述等"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveIQC()">保存</button>`
    );
  },

  saveIQC() {
    const supplierVal = document.getElementById('iqcSupplier').value;
    const goodsVal = document.getElementById('iqcGoods').value;
    const qty = +document.getElementById('iqcQty').value;

    if (!supplierVal || !goodsVal || !qty) {
      toast('请填写供应商、商品和送检数量', 'error');
      return;
    }

    const [supplierId, supplierName] = supplierVal.split('|');
    const [goodsId, goodsName] = goodsVal.split('|');
    const result = document.getElementById('iqcResult').value;
    const qualified = result === '不合格' ? 0 : (+document.getElementById('iqcQualified').value || qty);
    const unqualified = +document.getElementById('iqcUnqualified').value || 0;

    DB.add('incomingInspections', {
      code: document.getElementById('iqcCode').value,
      supplierId: +supplierId,
      supplierName,
      goodsId: +goodsId,
      goodsName,
      batchNo: document.getElementById('iqcBatch').value,
      inspectQty: qty,
      sampleQty: +document.getElementById('iqcSample').value || 0,
      qualifiedQty: qualified,
      unqualifiedQty: unqualified,
      result,
      status: result === '待检' ? '待检' : '已完成',
      inspectDate: document.getElementById('iqcDate').value,
      inspector: document.getElementById('iqcInspector').value,
      note: document.getElementById('iqcNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    // 如果合格，自动入库
    if (result === '合格') {
      const goods = DB.findById('goods', +goodsId);
      if (goods) {
        DB.update('goods', +goodsId, { stock: (goods.stock || 0) + qty });
        DB.add('inbounds', {
          inboundCode: DB.genCode('RK'),
          goodsId: +goodsId,
          goodsName,
          qty,
          unit: goods.unit || '件',
          price: goods.cost || 0,
          total: (goods.cost || 0) * qty,
          type: '采购入库',
          supplier: supplierName,
          status: '已完成',
          operator: currentUser.username,
          note: '来料检验合格入库',
          date: new Date().toISOString().slice(0, 10)
        });
      }
    }

    toast('来料检验已保存' + (result === '合格' ? '，已自动入库' : ''), 'success');
    closeModal();
    this.reload();
  },

  viewIQC(id) {
    const r = DB.findById('incomingInspections', id);
    if (!r) return;
    openModal('来料检验单 - ' + r.code, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">供应商</div>
          <div style="font-weight:600;margin-top:4px">${r.supplierName || '-'}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">商品</div>
          <div style="font-weight:600;margin-top:4px">${r.goodsName || '-'}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">批次号</div>
          <div style="font-weight:600;margin-top:4px">${r.batchNo || '-'}</div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">检验结果</div>
          <div style="font-weight:600;margin-top:4px"><span class="badge ${r.result==='合格'?'badge-success':r.result==='不合格'?'badge-danger':'badge-warning'}">${r.result}</span></div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">送检/合格/不合格</div>
          <div style="font-weight:600;margin-top:4px">${r.inspectQty} / <span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty||0}</span></div>
        </div>
        <div style="background:var(--bg);padding:12px;border-radius:8px">
          <div style="font-size:12px;color:var(--text-muted)">检验员 / 日期</div>
          <div style="font-weight:600;margin-top:4px">${r.inspector} / ${r.inspectDate || '-'}</div>
        </div>
      </div>
      ${r.note ? `<div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">备注</div><div style="margin-top:4px">${r.note}</div></div>` : ''}
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  openEditIQC(id) {
    if (!hasPerm('quality', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('incomingInspections', id);
    if (!r) return;
    this.editingIQCId = id;

    openModal('来料检验 - ' + r.code, `
      <div style="background:var(--primary-light);border-radius:8px;padding:12px;margin-bottom:16px">
        供应商：${r.supplierName} | 商品：${r.goodsName} | 批次：${r.batchNo} | 送检量：${r.inspectQty}
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>合格数量 *</label><input id="iqcEqty" type="number" min="0" value="${r.inspectQty}"></div>
        <div class="form-item"><label>不合格数量</label><input id="iqcUnqty" type="number" min="0" value="${r.unqualifiedQty || 0}"></div>
        <div class="form-item"><label>检验结果 *</label>
          <select id="iqcEResult">
            <option value="合格" ${r.result==='合格'?'selected':''}>合格</option>
            <option value="不合格" ${r.result==='不合格'?'selected':''}>不合格</option>
            <option value="让步接收" ${r.result==='让步接收'?'selected':''}>让步接收</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>检验员</label><input id="iqcEInspector" value="${r.inspector || currentUser.username}"></div>
        <div class="form-item"><label>检验日期</label><input id="iqcEDate" type="date" value="${r.inspectDate || new Date().toISOString().slice(0,10)}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="iqcENote" value="${r.note || ''}" placeholder="不合格原因说明"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveEditIQC()">提交检验结果</button>`
    );
  },

  saveEditIQC() {
    const r = DB.findById('incomingInspections', this.editingIQCId);
    if (!r) return;

    const result = document.getElementById('iqcEResult').value;
    const qualified = +document.getElementById('iqcEqty').value || 0;
    const unqualified = +document.getElementById('iqcUnqty').value || 0;

    DB.update('incomingInspections', this.editingIQCId, {
      qualifiedQty: qualified,
      unqualifiedQty: unqualified,
      result,
      status: '已完成',
      inspector: document.getElementById('iqcEInspector').value,
      inspectDate: document.getElementById('iqcEDate').value,
      note: document.getElementById('iqcENote').value
    });

    // 合格则入库
    if (result === '合格') {
      const goods = DB.findById('goods', r.goodsId);
      if (goods) {
        DB.update('goods', r.goodsId, { stock: (goods.stock || 0) + qualified });
        DB.add('inbounds', {
          inboundCode: DB.genCode('RK'),
          goodsId: r.goodsId,
          goodsName: r.goodsName,
          qty: qualified,
          unit: goods.unit || '件',
          price: goods.cost || 0,
          total: (goods.cost || 0) * qualified,
          type: '采购入库',
          supplier: r.supplierName,
          status: '已完成',
          operator: currentUser.username,
          note: '来料检验合格入库',
          date: new Date().toISOString().slice(0, 10)
        });
      }
    }

    toast('检验结果已保存' + (result === '合格' ? '，已自动入库' : ''), 'success');
    this.editingIQCId = null;
    closeModal();
    this.reload();
  },

  // ========== 过程检验 PQC ==========
  renderPQC() {
    let list = DB.get('processInspections');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.orderNo || '').toLowerCase().includes(kw) ||
        (r.goodsName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索工单/商品..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.page=1;quality.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="quality.openAddPQC()">+ 新建过程检验</button>
      </div>
    </div>

    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">⚙️</div><div class="empty-state-text">暂无过程检验记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>检验单号</th><th>关联工单</th><th>商品</th><th>工序</th><th>检验数量</th><th>合格/不合格</th><th>结果</th><th>检验日期</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const resultBadge = r.result === '合格' ? 'badge-success' : r.result === '不合格' ? 'badge-danger' : 'badge-warning';
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td>${r.orderNo || '-'}</td>
              <td><strong>${r.goodsName || '-'}</strong></td>
              <td>${r.processName || '-'}</td>
              <td>${r.inspectQty}</td>
              <td><span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty||0}</span></td>
              <td><span class="badge ${resultBadge}">${r.result}</span></td>
              <td>${r.inspectDate || '-'}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="quality.viewPQC(${r.id})">查看</button>
                  ${r.result === '不合格' ? `<button class="btn btn-ghost btn-sm" onclick="quality.createNCR('过程', ${r.id})">开NCR</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  openAddPQC() {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('PQC');
    const orders = DB.get('productionOrders').filter(o => o.status === '生产中');
    const processes = DB.get('processes');
    const goods = DB.get('goods');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建过程检验单', `
      <div class="form-row cols-2">
        <div class="form-item"><label>检验单号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>关联工单</label>
          <select id="pqcOrder" onchange="quality.onPQCOrderChange()">
            <option value="">请选择工单</option>
            ${orders.map(o => `<option value="${o.id}|${o.orderNo}|${o.bomName}">${o.orderNo} - ${o.bomName}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>商品</label>
          <select id="pqcGoods">
            <option value="">请选择商品</option>
            ${goods.map(g => `<option value="${g.id}|${g.name}">${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>工序</label>
          <select id="pqcProcess">
            <option value="">请选择工序</option>
            ${processes.map(p => `<option value="${p.id}|${p.name}">${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>检验数量 *</label><input id="pqcQty" type="number" min="1" placeholder="检验数量"></div>
        <div class="form-item"><label>合格数量</label><input id="pqcQualified" type="number" min="0" placeholder="合格数量"></div>
        <div class="form-item"><label>不合格数量</label><input id="pqcUnqualified" type="number" min="0" value="0"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>检验日期</label><input id="pqcDate" type="date" value="${today}"></div>
        <div class="form-item"><label>检验员</label><input id="pqcInspector" value="${currentUser.username}"></div>
        <div class="form-item"><label>检验结果</label>
          <select id="pqcResult">
            <option value="合格">合格</option>
            <option value="不合格">不合格</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="pqcNote" placeholder="检验说明"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.savePQC()">保存</button>`
    );
  },

  onPQCOrderChange() {
    const val = document.getElementById('pqcOrder').value;
    if (!val) return;
    const [orderId, orderNo, bomName] = val.split('|');
    // 自动填商品
    const goods = DB.get('goods');
    const matched = goods.find(g => g.name === bomName);
    if (matched) {
      document.getElementById('pqcGoods').value = matched.id + '|' + matched.name;
    }
  },

  savePQC() {
    const orderVal = document.getElementById('pqcOrder').value;
    const goodsVal = document.getElementById('pqcGoods').value;
    const processVal = document.getElementById('pqcProcess').value;
    const qty = +document.getElementById('pqcQty').value;

    if (!goodsVal || !qty) {
      toast('请填写商品和检验数量', 'error');
      return;
    }

    let orderNo = '', bomName = '';
    if (orderVal) {
      const parts = orderVal.split('|');
      orderNo = parts[1] || '';
      bomName = parts[2] || '';
    }

    const [goodsId, goodsName] = goodsVal.split('|');
    let processName = '';
    if (processVal) {
      processName = processVal.split('|')[1] || '';
    }

    DB.add('processInspections', {
      code: DB.genCode('PQC'),
      orderId: orderVal ? +orderVal.split('|')[0] : null,
      orderNo,
      goodsId: +goodsId,
      goodsName,
      processId: processVal ? +processVal.split('|')[0] : null,
      processName,
      inspectQty: qty,
      qualifiedQty: +document.getElementById('pqcQualified').value || qty,
      unqualifiedQty: +document.getElementById('pqcUnqualified').value || 0,
      result: document.getElementById('pqcResult').value,
      status: '已完成',
      inspectDate: document.getElementById('pqcDate').value,
      inspector: document.getElementById('pqcInspector').value,
      note: document.getElementById('pqcNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('过程检验已保存', 'success');
    closeModal();
    this.reload();
  },

  viewPQC(id) {
    const r = DB.findById('processInspections', id);
    if (!r) return;
    openModal('过程检验单 - ' + r.code, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">关联工单</div><div style="font-weight:600;margin-top:4px">${r.orderNo || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">商品</div><div style="font-weight:600;margin-top:4px">${r.goodsName || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">工序</div><div style="font-weight:600;margin-top:4px">${r.processName || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验结果</div><div style="font-weight:600;margin-top:4px"><span class="badge ${r.result==='合格'?'badge-success':'badge-danger'}">${r.result}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验数量</div><div style="font-weight:600;margin-top:4px">${r.inspectQty} / <span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty||0}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验员</div><div style="font-weight:600;margin-top:4px">${r.inspector} / ${r.inspectDate || '-'}</div></div>
      </div>
      ${r.note ? `<div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">备注</div><div style="margin-top:4px">${r.note}</div></div>` : ''}
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  // ========== 成品检验 FQC ==========
  renderFQC() {
    let list = DB.get('finalInspections');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.orderNo || '').toLowerCase().includes(kw) ||
        (r.goodsName || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索单号/工单/商品..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.page=1;quality.reload()">
        </div>
        <select class="filter-select" value="${this.statusFilter}"
          onchange="quality.statusFilter=this.value;quality.page=1;quality.reload()">
          <option value="">全部状态</option>
          <option value="待检" ${this.statusFilter==='待检'?'selected':''}>待检</option>
          <option value="合格" ${this.statusFilter==='合格'?'selected':''}>合格</option>
          <option value="不合格" ${this.statusFilter==='不合格'?'selected':''}>不合格</option>
        </select>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="quality.openAddFQC()">+ 新建成品检验</button>
      </div>
    </div>

    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">🏭</div><div class="empty-state-text">暂无成品检验记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>检验单号</th><th>关联工单</th><th>商品</th><th>检验数量</th><th>合格/不合格</th><th>合格证</th><th>检验日期</th><th>检验员</th><th>结果</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const resultBadge = r.result === '合格' ? 'badge-success' : r.result === '不合格' ? 'badge-danger' : 'badge-warning';
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td>${r.orderNo || '-'}</td>
              <td><strong>${r.goodsName || '-'}</strong></td>
              <td>${r.inspectQty}</td>
              <td><span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty||0}</span></td>
              <td>${r.certificate === '是' ? '<span class="badge badge-success">已出证</span>' : '<span class="badge badge-default">未出</span>'}</td>
              <td>${r.inspectDate || '-'}</td>
              <td>${r.inspector || '-'}</td>
              <td><span class="badge ${resultBadge}">${r.result}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="quality.viewFQC(${r.id})">查看</button>
                  ${r.result === '合格' && r.certificate !== '是' ? `<button class="btn btn-ghost btn-sm" onclick="quality.issueCertFromFQC(${r.id})">出合格证</button>` : ''}
                  ${r.result === '不合格' ? `<button class="btn btn-ghost btn-sm" onclick="quality.createNCR('成品', ${r.id})">开NCR</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  openAddFQC() {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('FQC');
    const orders = DB.get('productionOrders').filter(o => o.status === '已完成');
    const goods = DB.get('goods');
    const today = new Date().toISOString().slice(0, 10);

    openModal('新建成品检验单', `
      <div class="form-row cols-2">
        <div class="form-item"><label>检验单号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>关联工单</label>
          <select id="fqcOrder" onchange="quality.onFQCOrderChange()">
            <option value="">请选择工单</option>
            ${orders.map(o => `<option value="${o.id}|${o.orderNo}|${o.bomName}|${o.completedQty}">${o.orderNo} - ${o.bomName}（完成${o.completedQty}件）</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>商品 *</label>
          <select id="fqcGoods">
            <option value="">请选择商品</option>
            ${goods.map(g => `<option value="${g.id}|${g.name}">${g.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>检验数量 *</label><input id="fqcQty" type="number" min="1" placeholder="检验数量"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>合格数量</label><input id="fqcQualified" type="number" min="0" placeholder="合格数量"></div>
        <div class="form-item"><label>不合格数量</label><input id="fqcUnqualified" type="number" min="0" value="0"></div>
        <div class="form-item"><label>是否出具合格证</label>
          <select id="fqcCert">
            <option value="否">否</option>
            <option value="是">是</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>检验日期</label><input id="fqcDate" type="date" value="${today}"></div>
        <div class="form-item"><label>检验员</label><input id="fqcInspector" value="${currentUser.username}"></div>
        <div class="form-item"><label>检验结果</label>
          <select id="fqcResult">
            <option value="合格">合格</option>
            <option value="不合格">不合格</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="fqcNote" placeholder="检验说明"></input></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveFQC()">保存</button>`
    );
  },

  onFQCOrderChange() {
    const val = document.getElementById('fqcOrder').value;
    if (!val) return;
    const [orderId, orderNo, bomName, completedQty] = val.split('|');
    const goods = DB.get('goods');
    const matched = goods.find(g => g.name === bomName);
    if (matched) document.getElementById('fqcGoods').value = matched.id + '|' + matched.name;
    document.getElementById('fqcQty').value = completedQty || '';
    document.getElementById('fqcQualified').value = completedQty || '';
  },

  saveFQC() {
    const orderVal = document.getElementById('fqcOrder').value;
    const goodsVal = document.getElementById('fqcGoods').value;
    const qty = +document.getElementById('fqcQty').value;

    if (!goodsVal || !qty) {
      toast('请填写商品和检验数量', 'error');
      return;
    }

    let orderNo = '', orderId = null;
    if (orderVal) {
      const parts = orderVal.split('|');
      orderId = +parts[0];
      orderNo = parts[1] || '';
    }

    const [goodsId, goodsName] = goodsVal.split('|');
    const result = document.getElementById('fqcResult').value;
    const qualifiedQty = result === '不合格' ? 0 : (+document.getElementById('fqcQualified').value || qty);
    const unqualifiedQty = +document.getElementById('fqcUnqualified').value || 0;
    const issueCert = document.getElementById('fqcCert').value;

    const fqcId = DB.add('finalInspections', {
      code: DB.genCode('FQC'),
      orderId,
      orderNo,
      goodsId: +goodsId,
      goodsName,
      inspectQty: qty,
      qualifiedQty,
      unqualifiedQty,
      result,
      status: '已完成',
      certificate: issueCert,
      inspectDate: document.getElementById('fqcDate').value,
      inspector: document.getElementById('fqcInspector').value,
      note: document.getElementById('fqcNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    }).id;

    // 如果要出合格证
    if (result === '合格' && issueCert === '是') {
      this.autoIssueCert(goodsId, goodsName, qualifiedQty, fqcId);
    }

    toast('成品检验已保存' + (result === '合格' && issueCert === '是' ? '，已出具合格证' : ''), 'success');
    closeModal();
    this.reload();
  },

  viewFQC(id) {
    const r = DB.findById('finalInspections', id);
    if (!r) return;
    openModal('成品检验单 - ' + r.code, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">关联工单</div><div style="font-weight:600;margin-top:4px">${r.orderNo || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">商品</div><div style="font-weight:600;margin-top:4px">${r.goodsName || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验数量</div><div style="font-weight:600;margin-top:4px">${r.inspectQty} / <span style="color:var(--success)">${r.qualifiedQty}</span> / <span style="color:var(--danger)">${r.unqualifiedQty||0}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验结果</div><div style="font-weight:600;margin-top:4px"><span class="badge ${r.result==='合格'?'badge-success':'badge-danger'}">${r.result}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">合格证</div><div style="font-weight:600;margin-top:4px"><span class="badge ${r.certificate==='是'?'badge-success':'badge-default'}">${r.certificate}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">检验员</div><div style="font-weight:600;margin-top:4px">${r.inspector} / ${r.inspectDate || '-'}</div></div>
      </div>
      ${r.note ? `<div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">备注</div><div style="margin-top:4px">${r.note}</div></div>` : ''}
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  issueCertFromFQC(id) {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const r = DB.findById('finalInspections', id);
    if (!r) return;
    this.autoIssueCert(r.goodsId, r.goodsName, r.qualifiedQty, id);
    DB.update('finalInspections', id, { certificate: '是' });
    toast('合格证已出具', 'success');
    this.reload();
  },

  // ========== 不良管理 NCR ==========
  renderNCR() {
    let list = DB.get('qualityNCRs');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.goodsName || '').toLowerCase().includes(kw) ||
        (r.defectDesc || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索单号/商品/缺陷描述..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.page=1;quality.reload()">
        </div>
      </div>
    </div>

    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">暂无不良记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>NCR单号</th><th>类型</th><th>商品</th><th>批次</th><th>不良数量</th><th>缺陷描述</th><th>处理方式</th><th>处理结果</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const statusBadge = r.status === '待处理' ? 'badge-warning' : r.status === '处理中' ? 'badge-primary' : 'badge-success';
            const typeBadge = r.ncrType === '来料' ? 'badge-default' : r.ncrType === '过程' ? 'badge-primary' : 'badge-purple';
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td><span class="badge ${typeBadge}">${r.ncrType}</span></td>
              <td><strong>${r.goodsName || '-'}</strong></td>
              <td>${r.batchNo || '-'}</td>
              <td style="color:var(--danger);font-weight:600">${r.defectQty}</td>
              <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.defectDesc}">${r.defectDesc || '-'}</td>
              <td>${r.handleMethod || '-'}</td>
              <td>${r.handleResult || '-'}</td>
              <td><span class="badge ${statusBadge}">${r.status}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="quality.viewNCR(${r.id})">查看</button>
                  ${r.status !== '已处理' ? `<button class="btn btn-ghost btn-sm" onclick="quality.handleNCR(${r.id})">处理</button>` : ''}
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  createNCR(type, relatedId) {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('NCR');
    let goodsName = '', batchNo = '', defectQty = 0;
    if (type === '来料') {
      const r = DB.findById('incomingInspections', relatedId);
      if (r) { goodsName = r.goodsName; batchNo = r.batchNo; defectQty = r.unqualifiedQty || 0; }
    } else if (type === '过程') {
      const r = DB.findById('processInspections', relatedId);
      if (r) { goodsName = r.goodsName; defectQty = r.unqualifiedQty || 0; }
    } else {
      const r = DB.findById('finalInspections', relatedId);
      if (r) { goodsName = r.goodsName; defectQty = r.unqualifiedQty || 0; }
    }

    const today = new Date().toISOString().slice(0, 10);
    openModal('创建不良品报告 NCR', `
      <div class="form-row cols-2">
        <div class="form-item"><label>NCR单号</label><input value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>类型</label>
          <select id="ncrType">
            <option value="来料" ${type==='来料'?'selected':''}>来料</option>
            <option value="过程" ${type==='过程'?'selected':''}>过程</option>
            <option value="成品" ${type==='成品'?'selected':''}>成品</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>商品名称 *</label><input id="ncrGoods" value="${goodsName}" placeholder="商品名称"></div>
        <div class="form-item"><label>批次号</label><input id="ncrBatch" value="${batchNo}" placeholder="批次号"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>不良数量 *</label><input id="ncrQty" type="number" min="1" value="${defectQty || 1}"></div>
        <div class="form-item"><label>发现日期</label><input id="ncrDate" type="date" value="${today}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>缺陷描述 *</label><input id="ncrDesc" placeholder="请详细描述缺陷类型和现象"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveNCR()">创建NCR</button>`
    );
    this._ncrRelated = { type, relatedId };
  },

  saveNCR() {
    const desc = document.getElementById('ncrDesc').value.trim();
    const qty = +document.getElementById('ncrQty').value;
    if (!desc || !qty) { toast('请填写缺陷描述和不良数量', 'error'); return; }

    const data = {
      code: document.getElementById('ncrCode') ? document.getElementById('ncrCode').value : DB.genCode('NCR'),
      ncrType: document.getElementById('ncrType').value,
      relatedId: this._ncrRelated ? this._ncrRelated.relatedId : null,
      goodsName: document.getElementById('ncrGoods').value,
      batchNo: document.getElementById('ncrBatch').value,
      defectQty: qty,
      defectDesc: desc,
      handleMethod: '',
      handleResult: '',
      status: '待处理',
      inspector: currentUser.username,
      date: document.getElementById('ncrDate').value,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    DB.add('qualityNCRs', data);
    toast('NCR已创建', 'success');
    this._ncrRelated = null;
    closeModal();
    this.reload();
  },

  handleNCR(id) {
    if (!hasPerm('quality', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('qualityNCRs', id);
    if (!r) return;

    openModal('处理不良品 - ' + r.code, `
      <div style="background:var(--primary-light);border-radius:8px;padding:12px;margin-bottom:16px">
        商品：${r.goodsName} | 批次：${r.batchNo || '-'} | 不良数量：${r.defectQty}
      </div>
      <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-muted)">缺陷描述</div>
        <div style="margin-top:4px">${r.defectDesc}</div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>处理方式 *</label>
          <select id="ncrHandleMethod">
            <option value="">请选择</option>
            <option value="退回供应商">退回供应商</option>
            <option value="让步接收">让步接收</option>
            <option value="降级处理">降级处理</option>
            <option value="报废">报废</option>
            <option value="返工">返工</option>
          </select>
        </div>
        <div class="form-item"><label>处理结果</label><input id="ncrHandleResult" placeholder="实际处理结果"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveNCRHandle(${id})">确认处理</button>`
    );
  },

  saveNCRHandle(id) {
    const method = document.getElementById('ncrHandleMethod').value;
    if (!method) { toast('请选择处理方式', 'error'); return; }

    DB.update('qualityNCRs', id, {
      handleMethod: method,
      handleResult: document.getElementById('ncrHandleResult').value,
      status: '已处理'
    });

    toast('NCR处理完成', 'success');
    closeModal();
    this.reload();
  },

  viewNCR(id) {
    const r = DB.findById('qualityNCRs', id);
    if (!r) return;
    openModal('不良品报告 - ' + r.code, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">类型</div><div style="font-weight:600;margin-top:4px">${r.ncrType}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">状态</div><div style="font-weight:600;margin-top:4px"><span class="badge ${r.status==='已处理'?'badge-success':'badge-warning'}">${r.status}</span></div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">商品</div><div style="font-weight:600;margin-top:4px">${r.goodsName || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">批次</div><div style="font-weight:600;margin-top:4px">${r.batchNo || '-'}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">不良数量</div><div style="font-weight:600;margin-top:4px;color:var(--danger)">${r.defectQty}</div></div>
        <div style="background:var(--bg);padding:12px;border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">发现人/日期</div><div style="font-weight:600;margin-top:4px">${r.inspector} / ${r.date || '-'}</div></div>
      </div>
      <div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:12px"><div style="font-size:12px;color:var(--text-muted)">缺陷描述</div><div style="margin-top:4px">${r.defectDesc}</div></div>
      ${r.handleMethod ? `<div style="background:var(--bg);padding:12px;border-radius:8px;margin-bottom:12px"><div style="font-size:12px;color:var(--text-muted)">处理方式</div><div style="margin-top:4px">${r.handleMethod} ${r.handleResult ? '→ ' + r.handleResult : ''}</div></div>` : ''}
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  // ========== SPC分析 ==========
  renderSPC() {
    let list = DB.get('spcRecords');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.processName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.sampleTime || '').localeCompare(a.sampleTime || ''));

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索编码/工序..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="quality.openAddSPC()">+ 记录SPC数据</button>
      </div>
    </div>

    ${list.length > 0 ? this.renderSPCChart(list.slice(0, 30)) : ''}

    <div class="card" style="margin-top:16px">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">暂无SPC记录，请先录入数据</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>记录编号</th><th>工序</th><th>采样时间</th><th>X值</th><th>USL</th><th>UCL</th><th>LCL</th><th>LSL</th><th>判定</th><th>备注</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const isOC = r.result === '超出控制限';
            return `<tr style="${isOC ? 'background:#fff5f5' : ''}">
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td>${r.processName || '-'}</td>
              <td>${r.sampleTime ? r.sampleTime.slice(0, 16) : '-'}</td>
              <td><strong>${r.xValue}</strong></td>
              <td>${r.usl || '-'}</td>
              <td>${r.ucl || '-'}</td>
              <td>${r.lcl || '-'}</td>
              <td>${r.lsl || '-'}</td>
              <td><span class="badge ${isOC ? 'badge-danger' : 'badge-success'}">${r.result}</span></td>
              <td>${r.note || '-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  renderSPCChart(records) {
    if (!records.length) return '';
    const xs = records.map(r => r.xValue).reverse();
    const first = records[0];
    const ucl = first.ucl || (Math.max(...xs) + 3);
    const lcl = first.lcl || (Math.min(...xs) - 3);
    const cl = first.cl || ((ucl + lcl) / 2);
    const max = Math.max(...xs, ucl) + 1;
    const min = Math.min(...xs, lcl) - 1;
    const range = max - min || 1;

    const h = 180;
    const w = 600;
    const pts = xs.map((x, i) => {
      const px = 30 + (i / (xs.length - 1)) * (w - 60);
      const py = h - 20 - ((x - min) / range) * (h - 50);
      return `${px},${py}`;
    });

    const uclY = h - 20 - ((ucl - min) / range) * (h - 50);
    const lclY = h - 20 - ((lcl - min) / range) * (h - 50);
    const clY = h - 20 - ((cl - min) / range) * (h - 50);

    return `
    <div class="card">
      <div class="card-title" style="margin-bottom:12px">📈 SPC 控制图（近30条）</div>
      <div style="overflow-x:auto">
        <svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px">
          <!-- 网格 -->
          <line x1="30" y1="20" x2="30" y2="${h-20}" stroke="#eee" stroke-width="1"/>
          <line x1="30" y1="${h-20}" x2="${w-10}" y2="${h-20}" stroke="#eee" stroke-width="1"/>
          <!-- 控制限 -->
          <line x1="30" y1="${uclY}" x2="${w-10}" y2="${uclY}" stroke="var(--danger)" stroke-width="1" stroke-dasharray="4"/>
          <line x1="30" y1="${clY}" x2="${w-10}" y2="${clY}" stroke="var(--primary)" stroke-width="1" stroke-dasharray="4"/>
          <line x1="30" y1="${lclY}" x2="${w-10}" y2="${lclY}" stroke="var(--danger)" stroke-width="1" stroke-dasharray="4"/>
          <!-- 数据线 -->
          <polyline points="${pts.join(' ')}" fill="none" stroke="var(--primary)" stroke-width="2"/>
          <!-- 数据点 -->
          ${xs.map((x, i) => {
            const [px, py] = pts[i].split(',');
            const isOC = x > ucl || x < lcl;
            return `<circle cx="${px}" cy="${py}" r="4" fill="${isOC ? 'var(--danger)' : 'var(--primary)'}" stroke="white" stroke-width="1"/>`;
          }).join('')}
          <!-- 标签 -->
          <text x="${w-5}" y="${uclY-3}" text-anchor="end" font-size="10" fill="var(--danger)">UCL=${ucl}</text>
          <text x="${w-5}" y="${clY-3}" text-anchor="end" font-size="10" fill="var(--primary)">CL=${cl}</text>
          <text x="${w-5}" y="${lclY-3}" text-anchor="end" font-size="10" fill="var(--danger)">LCL=${lcl}</text>
        </svg>
      </div>
    </div>`;
  },

  openAddSPC() {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('SPC');
    const processes = DB.get('processes');
    const today = new Date().toISOString().slice(0, 16);

    openModal('记录SPC数据', `
      <div class="form-row cols-2">
        <div class="form-item"><label>记录编号</label><input id="spcCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>工序</label>
          <select id="spcProcess">
            <option value="">请选择工序</option>
            ${processes.map(p => `<option value="${p.name}|${p.stdTime || 50}">${p.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>采样时间</label><input id="spcTime" type="datetime-local" value="${today}"></div>
        <div class="form-item"><label>X值（测量值）*</label><input id="spcX" type="number" step="0.01" placeholder="如：50.5"></div>
      </div>
      <div class="form-row cols-4">
        <div class="form-item"><label>USL（上限）</label><input id="spcUSL" type="number" step="0.01" placeholder="规格上限"></div>
        <div class="form-item"><label>UCL（控制上界）</label><input id="spcUCL" type="number" step="0.01" placeholder="控制上限"></div>
        <div class="form-item"><label>LCL（控制下界）</label><input id="spcLCL" type="number" step="0.01" placeholder="控制下限"></div>
        <div class="form-item"><label>LSL（下限）</label><input id="spcLSL" type="number" step="0.01" placeholder="规格下限"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="spcNote" placeholder="采样说明"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveSPC()">保存</button>`
    );
  },

  saveSPC() {
    const processVal = document.getElementById('spcProcess').value;
    const x = +document.getElementById('spcX').value;
    const processes = DB.get('processes');

    if (!x) { toast('请填写测量值', 'error'); return; }

    const ucl = +document.getElementById('spcUCL').value || x + 3;
    const lcl = +document.getElementById('spcLCL').value || x - 3;
    const usl = +document.getElementById('spcUSL').value;
    const lsl = +document.getElementById('spcLSL').value;
    const cl = (ucl + lcl) / 2;
    const result = (ucl && x > ucl) || (lcl && x < lcl) ? '超出控制限' : '受控';

    DB.add('spcRecords', {
      code: document.getElementById('spcCode') ? document.getElementById('spcCode').value : DB.genCode('SPC'),
      processId: processVal ? processes.find(p => p.name === processVal.split('|')[0])?.id : null,
      processName: processVal ? processVal.split('|')[0] : '',
      sampleTime: document.getElementById('spcTime').value,
      xValue: x,
      ucl: ucl || null,
      lcl: lcl || null,
      cl: cl,
      usl: usl || null,
      lsl: lsl || null,
      result,
      note: document.getElementById('spcNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('SPC数据已保存' + (result === '超出控制限' ? ' ⚠️ 超出控制限，请关注！' : ''), result === '超出控制限' ? 'warning' : 'success');
    closeModal();
    this.reload();
  },

  // ========== 合格证 ==========
  renderCert() {
    let list = DB.get('qualityCertificates');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(kw) ||
        (r.certificateNo || '').toLowerCase().includes(kw) ||
        (r.goodsName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索证号/商品..." value="${this.keyword}"
            oninput="quality.keyword=this.value;quality.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="quality.openAddCert()">+ 新建合格证</button>
      </div>
    </div>

    <div class="card">
      ${!list.length ? `<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-text">暂无合格证记录</div></div>` : `
      <div class="table-wrap"><table>
        <thead><tr><th>合格证编号</th><th>批次号</th><th>商品</th><th>数量</th><th>检验日期</th><th>有效期至</th><th>发证人</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const isExpiring = r.validDate && new Date(r.validDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const isExpired = r.validDate && new Date(r.validDate) < new Date();
            return `<tr>
              <td><span style="color:var(--primary)">${r.certificateNo}</span></td>
              <td>${r.batchNo || '-'}</td>
              <td><strong>${r.goodsName || '-'}</strong></td>
              <td>${r.qty}</td>
              <td>${r.inspectionDate || '-'}</td>
              <td style="color:${isExpired ? 'var(--danger)' : isExpiring ? 'var(--warning)' : 'var(--text)'}">${r.validDate || '-'} ${isExpiring && !isExpired ? '⚠️' : isExpired ? '❌' : ''}</td>
              <td>${r.issuer}</td>
              <td><span class="badge ${isExpired ? 'badge-danger' : r.status === '有效' ? 'badge-success' : 'badge-default'}">${isExpired ? '已过期' : r.status}</span></td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="quality.viewCert(${r.id})">查看</button>
                  <button class="btn btn-ghost btn-sm" onclick="quality.printCert(${r.id})">打印</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`}
    </div>`;
  },

  openAddCert() {
    if (!hasPerm('quality', 'create')) { toast('没有新建权限', 'error'); return; }
    const certNo = DB.genCode('CERT');
    const goods = DB.get('goods');
    const today = new Date().toISOString().slice(0, 10);
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    openModal('新建合格证', `
      <div class="form-row cols-2">
        <div class="form-item"><label>合格证编号</label><input id="certNo" value="${certNo}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>商品 *</label>
          <select id="certGoods">
            <option value="">请选择商品</option>
            ${goods.map(g => `<option value="${g.id}|${g.name}">${g.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>批次号</label><input id="certBatch" placeholder="生产批次"></div>
        <div class="form-item"><label>数量 *</label><input id="certQty" type="number" min="1" placeholder="合格数量"></div>
        <div class="form-item"><label>有效期至</label><input id="certValid" type="date" value="${oneYearLater}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>检验日期</label><input id="certDate" type="date" value="${today}"></div>
        <div class="form-item"><label>发证人</label><input id="certIssuer" value="${currentUser.username}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="certNote" placeholder="备注信息"></div>
      </div>
    `,
    `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
     <button class="btn btn-primary" onclick="quality.saveCert()">生成合格证</button>`
    );
  },

  saveCert() {
    const goodsVal = document.getElementById('certGoods').value;
    const qty = +document.getElementById('certQty').value;
    if (!goodsVal || !qty) { toast('请选择商品并填写数量', 'error'); return; }

    const [goodsId, goodsName] = goodsVal.split('|');
    const validDate = document.getElementById('certValid').value;
    const validUntil = validDate ? new Date(validDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const isValid = validUntil > new Date();

    DB.add('qualityCertificates', {
      code: DB.genCode('CERT'),
      certificateNo: document.getElementById('certNo').value,
      relatedInspectionId: null,
      goodsId: +goodsId,
      goodsName,
      batchNo: document.getElementById('certBatch').value,
      qty,
      inspectionDate: document.getElementById('certDate').value,
      validDate,
      issuer: document.getElementById('certIssuer').value,
      status: isValid ? '有效' : '已过期',
      note: document.getElementById('certNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('合格证已生成', 'success');
    closeModal();
    this.reload();
  },

  autoIssueCert(goodsId, goodsName, qty, inspectionId) {
    const certNo = DB.genCode('CERT');
    const today = new Date().toISOString().slice(0, 10);
    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    DB.add('qualityCertificates', {
      code: DB.genCode('CERT'),
      certificateNo: certNo,
      relatedInspectionId: inspectionId,
      goodsId: +goodsId,
      goodsName,
      batchNo: '',
      qty,
      inspectionDate: today,
      validDate: oneYear,
      issuer: currentUser.username,
      status: '有效',
      note: '成品检验合格自动出具',
      createdAt: today
    });
  },

  viewCert(id) {
    const r = DB.findById('qualityCertificates', id);
    if (!r) return;
    openModal('合格证 - ' + r.certificateNo, this.renderCertPrint(r, true),
    `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
     <button class="btn btn-primary" onclick="quality.printCert(${id})">打印</button>`
    );
  },

  printCert(id) {
    const r = DB.findById('qualityCertificates', id);
    if (!r) return;
    const content = this.renderCertPrint(r);
    const win = window.open('', '_blank');
    if (!win) { toast('浏览器拦截了打印预览窗口，请允许该网站的弹窗后重试', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>合格证 - ${r.certificateNo}</title>
      <style>
        body{margin:0;padding:40px;font-family:SimSun,serif;font-size:14px;color:#000}
        .cert{border:2px solid #000;padding:30px;max-width:600px;margin:auto;background:#fff}
        .cert h1{text-align:center;font-size:24px;border-bottom:2px solid #000;padding-bottom:12px;margin:0 0 20px}
        .row{display:flex;border-bottom:1px solid #ddd;padding:8px 0}
        .label{width:120px;font-weight:bold;color:#555}
        .value{flex:1}
        .footer{margin-top:20px;text-align:center;font-size:12px;color:#888}
        @media print{body{padding:0}.cert{border:1px solid #000}}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  },

  renderCertPrint(r, preview) {
    return `
    <div ${preview ? 'style="font-size:13px"' : 'class="cert"'}>
      <div ${preview ? '' : ''} style="text-align:center;font-size:20px;font-weight:bold;margin-bottom:16px;border-bottom:2px solid #000;padding-bottom:10px">🏭 质 量 合 格 证 书</div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">证书编号</div>
        <div style="flex:1">${r.certificateNo}</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">产品名称</div>
        <div style="flex:1;font-weight:bold">${r.goodsName}</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">批次号</div>
        <div style="flex:1">${r.batchNo || '-'}</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">数量</div>
        <div style="flex:1">${r.qty} 件</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">检验日期</div>
        <div style="flex:1">${r.inspectionDate || '-'}</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">有效期至</div>
        <div style="flex:1">${r.validDate || '-'} ${r.status === '已过期' ? '<span style="color:red">(已过期)</span>' : ''}</div>
      </div>
      <div style="display:flex;border-bottom:1px solid #ddd;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">发证人</div>
        <div style="flex:1">${r.issuer}</div>
      </div>
      ${r.note ? `<div style="display:flex;padding:8px 0">
        <div style="width:120px;font-weight:bold;color:#555">备注</div>
        <div style="flex:1">${r.note}</div>
      </div>` : ''}
      <div style="margin-top:20px;text-align:right;font-size:12px;color:#888">
        本证书仅证明上述产品经检验符合质量标准要求。
      </div>
    </div>`;
  },

  init() {}
};
