// ===========================
// 客户管理
// ===========================

const customer = {
  keyword: '',
  typeFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索客户名称/联系人..." value="${this.keyword}"
              oninput="customer.keyword=this.value;customer.reload()">
          </div>
          <select class="filter-select" onchange="customer.typeFilter=this.value;customer.reload()">
            <option value="">所有类型</option>
            <option value="企业客户" ${this.typeFilter==='企业客户'?'selected':''}>企业客户</option>
            <option value="个人客户" ${this.typeFilter==='个人客户'?'selected':''}>个人客户</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="customer.exportData()">📥 导出</button>
          <button class="btn btn-outline" onclick="customer.importData()">📤 导入</button>
          <button class="btn btn-ghost" onclick="customer.downloadTemplate()">📝 模板</button>
          <button class="btn btn-primary" onclick="customer.openAdd()">+ 新增客户</button>
        </div>
      </div>
      <div id="customerContent">${this.renderList()}</div>
    </div>`;
  },

  renderList() {
    let list = DB.get('customers');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(kw) || c.contact.toLowerCase().includes(kw));
    }
    if (this.typeFilter) list = list.filter(c => c.type === this.typeFilter);
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">暂无客户</div></div>`;

    const outbounds = DB.get('outbounds');
    const avatarColors = ['#4f6ef7','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];
    return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>客户名称</th>
            <th>类型</th>
            <th>联系人</th>
            <th>联系电话</th>
            <th>邮箱</th>
            <th>状态</th>
            <th>订单/累计消费</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(c => {
            const orders = outbounds.filter(r => r.customerId === c.id);
            const totalAmt = orders.reduce((s,r) => s + r.total, 0);
            const color = avatarColors[c.id % avatarColors.length];
            return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;flex-shrink:0">
                    ${c.name.slice(0,1)}
                  </div>
                  <div style="font-weight:600;font-size:13px">${c.name}</div>
                </div>
              </td>
              <td><span style="font-size:12px;color:var(--text-muted)">${c.type}</span></td>
              <td>${c.contact}</td>
              <td>${c.phone}</td>
              <td style="font-size:12px;color:var(--text-muted)">${c.email || '-'}</td>
              <td><span class="badge ${c.status?'badge-success':'badge-default'}">${c.status?'正常':'暂停'}</span></td>
              <td>
                <div style="font-size:12px">
                  <span style="font-weight:600;color:var(--primary)">${orders.length}</span><span style="color:var(--text-muted)"> 单</span>
                  <span style="margin-left:6px;font-weight:600;color:var(--success)">${fmtMoney(totalAmt)}</span>
                </div>
              </td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-outline btn-sm" onclick="customer.openEdit(${c.id})">✏️</button>
                  <button class="btn btn-ghost btn-sm" onclick="customer.viewOrders(${c.id})">📋</button>
                  <button class="btn btn-ghost btn-sm" onclick="customer.viewContracts(${c.id})">📄</button>
                  <button class="btn btn-danger btn-sm" onclick="customer.del(${c.id})">🗑</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  reload() {
    const el = document.getElementById('customerContent');
    if (el) el.innerHTML = this.renderList();
  },

  openAdd() {
    if (!hasPerm('customer', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新增客户', `
      <div class="form-row cols-2">
        <div class="form-item" style="grid-column:span 2"><label>客户名称 *</label><input id="cName" placeholder="个人姓名或公司名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系人 *</label><input id="cContact" placeholder="主要联系人"></div>
        <div class="form-item"><label>联系电话 *</label><input id="cPhone" placeholder="手机/座机"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>电子邮箱</label><input id="cEmail" type="email" placeholder="email@example.com"></div>
        <div class="form-item"><label>客户类型</label>
          <select id="cType">
            <option value="企业客户">企业客户</option>
            <option value="个人客户">个人客户</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>详细地址</label><input id="cAddr" placeholder="省市区详细地址"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="customer.save()">保存</button>`
    );
  },

  save() {
    const name = document.getElementById('cName').value.trim();
    const contact = document.getElementById('cContact').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    if (!name || !contact || !phone) { toast('请填写必填信息', 'error'); return; }
    DB.add('customers', {
      name, contact, phone,
      email: document.getElementById('cEmail').value,
      type: document.getElementById('cType').value,
      address: document.getElementById('cAddr').value,
      status: 1
    });
    audit.log('customer', '新增', name, `类型: ${document.getElementById('cType').value}, 联系电话: ${phone}`);
    closeModal(); toast('客户添加成功！'); this.reload();
  },

  openEdit(id) {
    if (!hasPerm('customer', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c = DB.findById('customers', id);
    if (!c) return;
    openModal('编辑客户', `
      <div class="form-row cols-2">
        <div class="form-item" style="grid-column:span 2"><label>客户名称</label><input id="ceName" value="${c.name}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系人</label><input id="ceContact" value="${c.contact}"></div>
        <div class="form-item"><label>联系电话</label><input id="cePhone" value="${c.phone}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>电子邮箱</label><input id="ceEmail" value="${c.email||''}"></div>
        <div class="form-item"><label>客户类型</label>
          <select id="ceType">
            <option value="企业客户" ${c.type==='企业客户'?'selected':''}>企业客户</option>
            <option value="个人客户" ${c.type==='个人客户'?'selected':''}>个人客户</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>详细地址</label><input id="ceAddr" value="${c.address||''}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="customer.saveEdit(${id})">保存修改</button>`
    );
  },

  saveEdit(id) {
    const c = DB.findById('customers', id);
    const oldName = c ? c.name : '';
    const changes = [];
    if (document.getElementById('ceName').value !== c.name) changes.push('名称');
    if (document.getElementById('ceContact').value !== c.contact) changes.push('联系人');
    if (document.getElementById('cePhone').value !== c.phone) changes.push('电话');
    if (document.getElementById('ceType').value !== c.type) changes.push('类型');

    DB.update('customers', id, {
      name: document.getElementById('ceName').value,
      contact: document.getElementById('ceContact').value,
      phone: document.getElementById('cePhone').value,
      email: document.getElementById('ceEmail').value,
      type: document.getElementById('ceType').value,
      address: document.getElementById('ceAddr').value
    });
    audit.log('customer', '编辑', oldName, `修改: ${changes.join(', ') || '无变化'}`);
    closeModal(); toast('客户信息已更新！'); this.reload();
  },

  viewOrders(id) {
    const c = DB.findById('customers', id);
    const orders = DB.get('outbounds').filter(r => r.customerId === id).sort((a,b)=>b.date.localeCompare(a.date));
    const totalAmt = orders.reduce((s,r) => s + r.total, 0);
    openModal(`${c.name} - 出库记录`, `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:var(--primary-light);border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:var(--primary)">${orders.length}</div>
          <div style="font-size:12px;color:var(--text-muted)">历史订单</div>
        </div>
        <div style="background:rgba(16,185,129,0.1);border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--success)">${fmtMoney(totalAmt)}</div>
          <div style="font-size:12px;color:var(--text-muted)">累计金额</div>
        </div>
        <div style="background:rgba(245,158,11,0.1);border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:var(--warning)">${orders.length>0?fmtMoney(totalAmt/orders.length):'-'}</div>
          <div style="font-size:12px;color:var(--text-muted)">平均单价</div>
        </div>
      </div>
      <div class="table-wrap" style="max-height:300px;overflow-y:auto">
        <table>
          <thead><tr><th>单号</th><th>商品</th><th>数量</th><th>金额</th><th>日期</th></tr></thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">暂无记录</td></tr>' :
              orders.map(r => `
                <tr>
                  <td style="font-size:11px;color:var(--danger)">${r.code}</td>
                  <td>${r.goodsName}</td>
                  <td style="color:var(--danger)">-${r.qty}</td>
                  <td style="font-weight:600">${fmtMoney(r.total)}</td>
                  <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
                </tr>`).join('')}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`,
      true
    );
  },

  del(id) {
    if (!hasPerm('customer', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除',
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除该客户吗？</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="customer.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    const c = DB.findById('customers', id);
    DB.delete('customers', id);
    if (c) audit.log('customer', '删除', c.name, '客户已删除');
    closeModal();
    toast('客户已删除', 'warning');
    this.reload();
  },

  viewContracts(id) {
    const c = DB.findById('customers', id);
    if (!c) return;
    this.currentContractCustomerId = id;
    this.currentContractCustomerName = c.name;
    openModal(`${c.name} - 合同管理`, this.renderContractList(id), `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="customer.openAddContract()">➕ 添加合同</button>`, '90%');
  },

  renderContractList(customerId) {
    const contracts = (DB.get('customerContracts') || []).filter(c => c.customerId === customerId);
    const today = new Date();
    return `
      <div style="margin-bottom:16px;display:flex;align-items:center;gap:8px">
        <span style="font-size:13px;color:var(--text-muted)">共 ${contracts.length} 份合同</span>
      </div>
      ${contracts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <div class="empty-state-text">暂无合同</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:8px">点击右上角按钮上传合同文件</div>
        </div>
      ` : `
        <div class="table-wrap" style="max-height:400px;overflow-y:auto">
          <table>
            <thead><tr><th>合同名称</th><th>合同编号</th><th>金额</th><th>有效期</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              ${contracts.map(c => {
                const expired = c.endDate && new Date(c.endDate) < today;
                const warn = c.endDate && !expired && new Date(c.endDate) < new Date(today.getTime() + 30*86400000);
                const statusBadge = expired
                  ? '<span class="badge badge-danger">已过期</span>'
                  : warn ? '<span class="badge badge-warning">即将到期</span>'
                  : '<span class="badge badge-success">生效中</span>';
                const period = c.startDate || c.endDate ? (c.startDate || '-') + ' ~ ' + (c.endDate || '长期') : '长期';
                return `<tr>
                  <td style="font-weight:600">${c.name || '合同'}</td>
                  <td style="font-size:12px;color:var(--text-muted)">${c.contractNo || '-'}</td>
                  <td style="color:var(--success);font-weight:600">${c.amount ? fmtMoney(c.amount) : '-'}</td>
                  <td style="font-size:12px;color:var(--text-muted)">${period}</td>
                  <td>${statusBadge}</td>
                  <td>
                    ${c.fileData ? `<button class="btn btn-ghost btn-sm" onclick="customer.viewContract(${c.id})">👁</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="customer.editContract(${c.id})">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="customer.delContract(${c.id})">🗑</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  openAddContract() {
    if (!hasPerm('customer', 'create')) { toast('没有新建权限', 'error'); return; }
    const modalBody = document.getElementById('modalBody');
    openModal('添加合同', `
      <div class="form-row">
        <div class="form-item"><label>合同名称 *</label><input id="ccName" placeholder="如：年度采购合同"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合同编号</label><input id="ccNo" placeholder="如：CO-2026-001"></div>
        <div class="form-item"><label>合同金额(¥)</label><input id="ccAmount" type="number" step="0.01" min="0" placeholder="0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>开始日期</label><input id="ccStart" type="date"></div>
        <div class="form-item"><label>结束日期</label><input id="ccEnd" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="ccNote" placeholder="合同说明"></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>上传合同文件（PDF）</label>
          <div id="ccFileDrop" style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all 0.2s" onclick="document.getElementById('ccFileInput').click()" ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'" ondragleave="this.style.borderColor='var(--border)';this.style.background=''" ondrop="event.preventDefault();customer.handleContractFileDrop(event)">
            <div style="font-size:32px;margin-bottom:8px">📤</div>
            <div style="font-weight:600;color:var(--text)">拖拽文件到此处 或 点击上传</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">支持 PDF 文件（最大10MB）</div>
            <input type="file" id="ccFileInput" accept=".pdf" style="display:none" onchange="customer.handleContractFileSelect(this)">
          </div>
          <div id="ccFilePreview" style="margin-top:12px;display:none">
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:8px">
              <span style="font-size:24px">📄</span>
              <div style="flex:1">
                <div id="ccFileName" style="font-weight:500"></div>
                <div id="ccFileSize" style="font-size:12px;color:var(--text-muted)"></div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="customer.removeContractFile()">✕</button>
            </div>
          </div>
          <input type="hidden" id="ccFileData">
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="customer.viewContracts(${this.currentContractCustomerId})">返回</button><button class="btn btn-primary" onclick="customer.saveContract()">保存</button>`, '600px');
  },

  handleContractFileDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file) this.processContractFile(file);
  },

  handleContractFileSelect(input) {
    const file = input.files[0];
    if (file) this.processContractFile(file);
  },

  processContractFile(file) {
    if (file.size > 10 * 1024 * 1024) { toast('文件大小不能超过10MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('ccFileData').value = e.target.result;
      document.getElementById('ccFilePreview').style.display = 'block';
      document.getElementById('ccFileName').textContent = file.name;
      document.getElementById('ccFileSize').textContent = fmtFileSize(file.size);
    };
    reader.readAsDataURL(file);
  },

  removeContractFile() {
    document.getElementById('ccFilePreview').style.display = 'none';
    document.getElementById('ccFileData').value = '';
  },

  saveContract() {
    const name = document.getElementById('ccName').value.trim();
    if (!name) { toast('请输入合同名称', 'error'); return; }
    const fileInput = document.getElementById('ccFileInput');
    DB.add('customerContracts', {
      customerId: this.currentContractCustomerId,
      name,
      contractNo: document.getElementById('ccNo').value.trim(),
      amount: parseFloat(document.getElementById('ccAmount').value) || 0,
      startDate: document.getElementById('ccStart').value,
      endDate: document.getElementById('ccEnd').value,
      note: document.getElementById('ccNote').value.trim(),
      fileName: fileInput.files[0] ? fileInput.files[0].name : '',
      fileSize: fileInput.files[0] ? fileInput.files[0].size : 0,
      fileData: document.getElementById('ccFileData').value || '',
      createdAt: new Date().toISOString()
    });
    audit.log('customer', '添加合同', name, `客户: ${this.currentContractCustomerName}`);
    document.getElementById('modalBody').innerHTML = this.renderContractList(this.currentContractCustomerId);
    document.getElementById('modalTitle').textContent = `${this.currentContractCustomerName} - 合同管理`;
    toast('合同已添加');
  },

  viewContract(id) {
    const c = DB.findById('customerContracts', id);
    if (!c) return;
    if (c.fileData) {
      previewFile(c.fileData, c.fileName || c.name || '合同.pdf');
    } else {
      openModal('合同详情', `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">📄</div><div style="font-weight:600">${c.name}</div><div style="color:var(--text-muted);margin-top:8px">文件未上传</div></div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
    }
  },

  editContract(id) {
    if (!hasPerm('customer', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c = DB.findById('customerContracts', id);
    if (!c) return;
    openModal('编辑合同', `
      <div class="form-row">
        <div class="form-item"><label>合同名称</label><input id="cceName" value="${c.name || ''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合同编号</label><input id="cceNo" value="${c.contractNo || ''}"></div>
        <div class="form-item"><label>金额(¥)</label><input id="cceAmount" type="number" step="0.01" value="${c.amount || 0}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>开始日期</label><input id="cceStart" type="date" value="${c.startDate || ''}"></div>
        <div class="form-item"><label>结束日期</label><input id="cceEnd" type="date" value="${c.endDate || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="cceNote" value="${c.note || ''}"></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="customer.viewContracts(${this.currentContractCustomerId})">返回</button><button class="btn btn-primary" onclick="customer.saveEditContract(${id})">保存</button>`, '600px');
  },

  saveEditContract(id) {
    DB.update('customerContracts', id, {
      name: document.getElementById('cceName').value.trim(),
      contractNo: document.getElementById('cceNo').value.trim(),
      amount: parseFloat(document.getElementById('cceAmount').value) || 0,
      startDate: document.getElementById('cceStart').value,
      endDate: document.getElementById('cceEnd').value,
      note: document.getElementById('cceNote').value.trim()
    });
    closeModal();
    toast('合同已更新');
  },

  delContract(id) {
    if (!hasPerm('customer', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除', `<div style="text-align:center;padding:24px"><div style="font-size:48px;margin-bottom:16px">⚠️</div><div style="font-weight:600">确定删除此合同吗？</div></div>`, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="customer.confirmDelContract(${id})">删除</button>`);
  },

  confirmDelContract(id) {
    DB.delete('customerContracts', id);
    closeModal();
    toast('合同已删除', 'warning');
  },

  init() {},

  // 导出客户CSV
  exportData() {
    if (!hasPerm('customer', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('customers');
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const outbounds = DB.get('outbounds');
    const headers = ['客户名称', '类型', '联系人', '联系电话', '邮箱', '地址', '状态', '订单数', '累计消费'];
    const rows = list.map(c => {
      const orders = outbounds.filter(r => r.customerId === c.id);
      const totalAmt = orders.reduce((s,r) => s + r.total, 0);
      return [c.name, c.type, c.contact, c.phone, c.email || '', c.address || '', c.status ? '正常' : '暂停', orders.length, totalAmt.toFixed(2)];
    });
    exportTableToCSV(headers, rows, `客户列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条客户`, 'success');
  },

  // 下载导入模板
  downloadTemplate() {
    const headers = ['客户名称', '类型', '联系人', '联系电话', '邮箱', '地址'];
    const sample = ['XX科技有限公司', '企业客户', '李四', '13900139000', 'lisi@example.com', '上海市浦东新区'];
    downloadImportTemplate(headers, sample, '客户导入模板.csv');
  },

  // 导入客户
  importData() {
    if (!hasPerm('customer', 'import')) { toast('没有导入权限', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      const fieldMap = { '客户名称': 'name', '类型': 'type', '联系人': 'contact', '联系电话': 'phone', '邮箱': 'email', '地址': 'address', '状态': '_status' };
      openImportPreview(file, 'customers', fieldMap, ['name', 'contact', 'phone'], function(obj) {
        if (!obj.type) obj.type = '企业客户';
        if (obj._status === '暂停') obj.status = 0;
        else obj.status = 1;
        delete obj._status;
        DB.add('customers', obj);
      });
    };
    input.click();
  },
};
