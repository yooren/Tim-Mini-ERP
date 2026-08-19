// ===========================
// 运费管理
// ===========================

const freight = {
  page: 1,
  pageSize: 12,
  keyword: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索模板名称..." value="${this.keyword}"
              oninput="freight.keyword=this.value;freight.page=1;freight.reload()">
          </div>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-primary" onclick="freight.openAdd()">+ 新建运费模板</button>
        </div>
      </div>
      <div class="card" id="freightCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('freightTemplates');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.carrierName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => b.status - a.status);

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无运费模板</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>模板名称</th><th>承运商</th><th>首重费用</th><th>续重费用</th><th>包邮门槛</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = r.status === 1 ? 'badge-success' : 'badge-default';
          return `<tr>
            <td><strong>${r.name}</strong></td>
            <td>${r.carrierName || '-'}</td>
            <td>${r.firstWeight}kg内 ${fmtMoney(r.firstFee)}</td>
            <td>每${r.continueWeight}kg +${fmtMoney(r.continueFee)}</td>
            <td>满${fmtMoney(r.freeThreshold)}包邮</td>
            <td><span class="badge ${badge}">${r.status === 1 ? '启用' : '禁用'}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="freight.edit(${r.id})">✏️ 编辑</button>
                <button class="btn btn-ghost btn-sm" onclick="freight.calcFreight(${r.id})">🧮 计算运费</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'freight.goPage')}`;
  },

  reload() {
    const card = document.getElementById('freightCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    if (!hasPerm('freight', 'create')) { toast('没有新建权限', 'error'); return; }
    const carriers = DB.get('carriers').filter(c => c.status === 1);

    openModal('新建运费模板', `
      <div class="form-row cols-2">
        <div class="form-item"><label>模板名称 *</label><input id="ftName" placeholder="如：标准快递"></div>
        <div class="form-item"><label>承运商 *</label>
          <select id="ftCarrier">
            <option value="">-- 请选择 --</option>
            ${carriers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-4">
        <div class="form-item"><label>首重(kg)</label><input id="ftFirstWeight" type="number" step="0.1" value="1"></div>
        <div class="form-item"><label>首重费用(¥)</label><input id="ftFirstFee" type="number" step="0.01" value="12"></div>
        <div class="form-item"><label>续重(kg)</label><input id="ftContinueWeight" type="number" step="0.1" value="1"></div>
        <div class="form-item"><label>续重费用(¥)</label><input id="ftContinueFee" type="number" step="0.01" value="5"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>包邮门槛(¥)</label><input id="ftFreeThreshold" type="number" step="0.01" value="99" placeholder="订单满此金额包邮"></div>
        <div class="form-item"><label>状态</label>
          <select id="ftStatus">
            <option value="1">启用</option>
            <option value="0">禁用</option>
          </select>
        </div>
      </div>
      <div style="background:var(--primary-light);border-radius:8px;padding:12px;margin-top:8px;font-size:13px">
        <strong>计费说明：</strong>首重费用 + (总重量 - 首重) / 续重 × 续重费用<br>
        <span style="color:var(--text-muted)">示例：5kg货物，首重1kg内12元，续重1kg加5元 → 运费 = 12 + (5-1)/1×5 = 32元</span>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="freight.save()">保存</button>`
    );
  },

  save() {
    const name = document.getElementById('ftName').value.trim();
    const carrierId = +document.getElementById('ftCarrier').value;
    if (!name) { toast('请输入模板名称', 'error'); return; }
    if (!carrierId) { toast('请选择承运商', 'error'); return; }

    const carrier = DB.findById('carriers', carrierId);

    DB.add('freightTemplates', {
      name: name,
      carrierId: carrierId,
      carrierName: carrier?.name || '',
      firstWeight: +document.getElementById('ftFirstWeight').value || 1,
      firstFee: +document.getElementById('ftFirstFee').value || 0,
      continueWeight: +document.getElementById('ftContinueWeight').value || 1,
      continueFee: +document.getElementById('ftContinueFee').value || 0,
      freeThreshold: +document.getElementById('ftFreeThreshold').value || 0,
      status: +document.getElementById('ftStatus').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    toast('运费模板已创建', 'success');
    closeModal();
    this.reload();
  },

  edit(id) {
    if (!hasPerm('freight', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('freightTemplates', id);
    if (!r) return;
    this.editingId = id;
    const carriers = DB.get('carriers').filter(c => c.status === 1);

    openModal('编辑运费模板', `
      <div class="form-row cols-2">
        <div class="form-item"><label>模板名称 *</label><input id="ftEditName" value="${r.name}"></div>
        <div class="form-item"><label>承运商</label>
          <select id="ftEditCarrier">
            ${carriers.map(c=>`<option value="${c.id}" ${c.id === r.carrierId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-4">
        <div class="form-item"><label>首重(kg)</label><input id="ftEditFirstWeight" type="number" step="0.1" value="${r.firstWeight}"></div>
        <div class="form-item"><label>首重费用(¥)</label><input id="ftEditFirstFee" type="number" step="0.01" value="${r.firstFee}"></div>
        <div class="form-item"><label>续重(kg)</label><input id="ftEditContinueWeight" type="number" step="0.1" value="${r.continueWeight}"></div>
        <div class="form-item"><label>续重费用(¥)</label><input id="ftEditContinueFee" type="number" step="0.01" value="${r.continueFee}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>包邮门槛(¥)</label><input id="ftEditFreeThreshold" type="number" step="0.01" value="${r.freeThreshold}"></div>
        <div class="form-item"><label>状态</label>
          <select id="ftEditStatus">
            <option value="1" ${r.status === 1 ? 'selected' : ''}>启用</option>
            <option value="0" ${r.status === 0 ? 'selected' : ''}>禁用</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="freight.saveEdit()">保存</button>`
    );
  },

  saveEdit() {
    const name = document.getElementById('ftEditName').value.trim();
    if (!name) { toast('请输入模板名称', 'error'); return; }

    const carrierId = +document.getElementById('ftEditCarrier').value;
    const carrier = DB.findById('carriers', carrierId);

    DB.update('freightTemplates', this.editingId, {
      name: name,
      carrierId: carrierId,
      carrierName: carrier?.name || '',
      firstWeight: +document.getElementById('ftEditFirstWeight').value || 1,
      firstFee: +document.getElementById('ftEditFirstFee').value || 0,
      continueWeight: +document.getElementById('ftEditContinueWeight').value || 1,
      continueFee: +document.getElementById('ftEditContinueFee').value || 0,
      freeThreshold: +document.getElementById('ftEditFreeThreshold').value || 0,
      status: +document.getElementById('ftEditStatus').value
    });

    toast('运费模板已更新', 'success');
    this.editingId = null;
    closeModal();
    this.reload();
  },

  calcFreight(id) {
    const r = DB.findById('freightTemplates', id);
    if (!r) return;

    openModal('运费计算器 - ' + r.name, `
      <div class="form-item"><label>输入重量(kg)</label>
        <input id="calcWeight" type="number" step="0.1" value="1" placeholder="请输入重量">
      </div>
      <div class="form-item"><label>订单金额(¥)</label>
        <input id="calcOrderAmount" type="number" step="0.01" value="0" placeholder="用于判断是否包邮">
      </div>
      <div style="margin-top:16px">
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">运费</div>
          <div style="font-size:28px;font-weight:800;color:var(--primary)" id="calcResult">¥0.00</div>
        </div>
        <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">
          <strong>计费规则：</strong><br>
          首重${r.firstWeight}kg内：${fmtMoney(r.firstFee)}<br>
          续重：每${r.continueWeight}kg +${fmtMoney(r.continueFee)}<br>
          包邮门槛：订单满${fmtMoney(r.freeThreshold)}
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-primary" onclick="freight.doCalc(${id})">计算</button>`
    );
  },

  doCalc(id) {
    const r = DB.findById('freightTemplates', id);
    if (!r) return;

    const weight = +document.getElementById('calcWeight').value || 0;
    const orderAmount = +document.getElementById('calcOrderAmount').value || 0;

    if (weight <= 0) { toast('请输入有效重量', 'error'); return; }

    // 判断是否包邮
    if (orderAmount >= r.freeThreshold) {
      document.getElementById('calcResult').textContent = '¥0.00 (包邮)';
      document.getElementById('calcResult').style.color = 'var(--success)';
    } else {
      let freightFee = r.firstFee;
      if (weight > r.firstWeight) {
        freightFee += Math.ceil((weight - r.firstWeight) / r.continueWeight) * r.continueFee;
      }
      document.getElementById('calcResult').textContent = fmtMoney(freightFee);
      document.getElementById('calcResult').style.color = 'var(--primary)';
    }
  }
};
