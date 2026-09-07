// ===========================
// 人力资源管理 (HRM)
// ===========================

const hrm = {
  activeTab: 'org',
  page: 1,
  pageSize: 15,
  keyword: '',
  currentMonth: new Date().toISOString().slice(0, 7),
  selectedDept: null,

  init() {
    document.getElementById('breadcrumb').textContent = '人力资源管理';
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="tab-bar" style="margin-bottom:20px;overflow-x:auto;white-space:nowrap">
        <button class="tab-btn ${this.activeTab === 'org' ? 'active' : ''}" onclick="hrm.switchTab('org')">🏢 组织架构</button>
        <button class="tab-btn ${this.activeTab === 'files' ? 'active' : ''}" onclick="hrm.switchTab('files')">📁 员工档案</button>
        <button class="tab-btn ${this.activeTab === 'attendance' ? 'active' : ''}" onclick="hrm.switchTab('attendance')">📅 考勤管理</button>
        <button class="tab-btn ${this.activeTab === 'scheduling' ? 'active' : ''}" onclick="hrm.switchTab('scheduling')">📆 排班管理</button>
        <button class="tab-btn ${this.activeTab === 'overtime' ? 'active' : ''}" onclick="hrm.switchTab('overtime')">⏰ 加班</button>
        <button class="tab-btn ${this.activeTab === 'leave' ? 'active' : ''}" onclick="hrm.switchTab('leave')">🏖 假期</button>
        <button class="tab-btn ${this.activeTab === 'salary' ? 'active' : ''}" onclick="hrm.switchTab('salary')">💰 薪资</button>
        <button class="tab-btn ${this.activeTab === 'recruitment' ? 'active' : ''}" onclick="hrm.switchTab('recruitment')">📢 招聘</button>
        <button class="tab-btn ${this.activeTab === 'assessment' ? 'active' : ''}" onclick="hrm.switchTab('assessment')">🎯 考核</button>
        <button class="tab-btn ${this.activeTab === 'cost' ? 'active' : ''}" onclick="hrm.switchTab('cost')">📊 成本</button>
      </div>
      <div id="hrmContent">${this.renderContent()}</div>
    </div>`;
  },

  switchTab(tab) { this.activeTab = tab; this.page = 1; this.keyword = ''; this.reload(); },
  
  renderContent() {
    switch(this.activeTab) {
      case 'org': return this.renderOrg();
      case 'files': return this.renderFiles();
      case 'attendance': return this.renderAttendance();
      case 'scheduling': return this.renderScheduling();
      case 'overtime': return this.renderOvertime();
      case 'leave': return this.renderLeave();
      case 'salary': return this.renderSalary();
      case 'recruitment': return this.renderRecruitment();
      case 'assessment': return this.renderAssessment();
      case 'cost': return this.renderCost();
      default: return '';
    }
  },

  reload() {
    const el = document.getElementById('hrmContent');
    if (el) el.innerHTML = this.renderContent();
  },

  goPage(tab, p) { if (tab) this.activeTab = tab; this.page = p; this.reload(); },

  // ===========================
  // 1. 组织架构
  // ===========================
  renderOrg() {
    const depts = DB.get('departments').filter(d => d.status === 1);
    const positions = DB.get('positions') || [];
    const employees = DB.get('employees');
    const orgTree = depts.map(d => ({
      ...d,
      positions: positions.filter(p => p.departmentId === d.id),
      employees: employees.filter(e => e.departmentId === d.id && e.status === 1)
    }));

    return `
    <div style="display:grid;grid-template-columns:380px 1fr;gap:20px">
      <div class="card" style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h3 style="margin:0;font-size:15px">🏢 组织架构</h3>
          <button class="btn btn-primary btn-sm" onclick="hrm.openAddDept()">+ 部门</button>
        </div>
        <div style="max-height:calc(100vh - 320px);overflow-y:auto">
          ${depts.length === 0 ? '<div class="empty-state"><div class="empty-state-text">暂无部门</div></div>' : orgTree.map(d => `
          <div class="org-dept-item ${this.selectedDept === d.id ? 'active' : ''}" onclick="hrm.selectDept(${d.id})" style="padding:12px;margin-bottom:8px;background:var(--bg);border-radius:8px;cursor:pointer;border:2px solid ${this.selectedDept === d.id ? 'var(--primary)' : 'transparent'}">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">${d.name.slice(0,1)}</div>
                <div><div style="font-weight:600;font-size:14px">${d.name}</div><div style="font-size:12px;color:var(--text-muted)">👥 ${d.employees.length}人 · ${d.positions.length}岗位</div></div>
              </div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();hrm.openAddPosition(${d.id})" title="新增岗位">➕</button>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();hrm.openEditDept(${d.id})" title="编辑">✏️</button>
              </div>
            </div>
            ${d.positions.length > 0 ? `<div style="margin-top:10px;padding-left:46px">${d.positions.map(p => `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:white;border-radius:6px;margin-bottom:4px;font-size:12px"><div><span style="font-weight:500">${p.name}</span><span style="color:var(--text-muted);margin-left:8px">定编${p.headcount}人</span></div><div style="display:flex;gap:4px"><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();hrm.openEditPosition(${p.id})">✏️</button><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();hrm.delPosition(${p.id})">🗑</button></div></div>`).join('')}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>
      <div class="card" style="padding:20px">${this.selectedDept ? this.renderDeptDetail(this.selectedDept) : '<div class="empty-state"><div class="empty-state-icon">👈</div><div class="empty-state-text">请选择左侧部门查看详情</div></div>'}</div>
    </div>`;
  },

  selectDept(id) { this.selectedDept = id; this.reload(); },

  renderDeptDetail(deptId) {
    const dept = DB.findById('departments', deptId);
    if (!dept) return '';
    const employees = DB.get('employees').filter(e => e.departmentId === deptId && e.status === 1);
    const positions = DB.get('positions').filter(p => p.departmentId === deptId);

    return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:24px">
        <div>
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700">${dept.name}</h2>
          <div style="display:flex;gap:12px;font-size:13px;color:var(--text-muted)">
            ${dept.manager ? `<span>👤 负责人: ${dept.manager}</span>` : ''}
            ${dept.phone ? `<span>📞 ${dept.phone}</span>` : ''}
            <span>👥 ${employees.length}人在职</span>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" onclick="hrm.openEditDept(${dept.id})">✏️ 编辑</button>
          <button class="btn btn-primary" onclick="hrm.openAddPosition(${dept.id})">➕ 岗位</button>
        </div>
      </div>
      ${dept.desc ? `<div style="padding:12px;background:var(--bg);border-radius:8px;margin-bottom:20px;font-size:13px;color:var(--text-secondary)">📝 ${dept.desc}</div>` : ''}
      <div style="margin-bottom:24px">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">💼 岗位设置 (${positions.length})</h3>
        ${positions.length === 0 ? '<div style="color:var(--text-muted);font-size:13px">暂无岗位</div>' : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">${positions.map(p => `<div style="padding:12px;background:var(--bg);border-radius:8px"><div style="font-weight:600;font-size:13px">${p.name}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">定编 ${p.headcount}人 · 薪资 ${p.salaryRange || '面议'}</div></div>`).join('')}</div>`}
      </div>
      <div>
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">👥 部门人员 (${employees.length})</h3>
        ${employees.length === 0 ? '<div style="color:var(--text-muted);font-size:13px">暂无在职员工</div>' : `<div class="table-wrap"><table class="data-table"><thead><tr><th>姓名</th><th>岗位</th><th>电话</th><th>入职</th><th>操作</th></tr></thead><tbody>${employees.map(e => `<tr><td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:11px">${e.name.slice(0,1)}</div><span style="font-weight:500">${e.name}</span></div></td><td>${e.position || '-'}</td><td>${e.phone || '-'}</td><td>${e.entryDate || '-'}</td><td><button class="btn btn-outline btn-sm" onclick="hrm.viewEmployeeFile(${e.id})">档案</button></td></tr>`).join('')}</tbody></table></div>`}
      </div>
    </div>`;
  },

  openAddDept() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新增部门', `
      <div class="form-row"><div class="form-item"><label>部门名称 *</label><input id="dName" placeholder="请输入部门名称"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>负责人</label><input id="dManager" placeholder="部门负责人"></div><div class="form-item"><label>联系电话</label><input id="dPhone" placeholder="部门电话"></div></div>
      <div class="form-row"><div class="form-item"><label>部门职能</label><textarea id="dDesc" rows="3" placeholder="部门职责描述"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveDept()">保存</button>`
    );
  },

  saveDept() {
    const name = document.getElementById('dName').value.trim();
    if (!name) { toast('请输入部门名称', 'error'); return; }
    DB.add('departments', { name, manager: document.getElementById('dManager').value.trim(), phone: document.getElementById('dPhone').value.trim(), desc: document.getElementById('dDesc').value.trim(), status: 1, createdAt: new Date().toISOString() });
    closeModal(); toast('部门添加成功'); audit.log('HRM-组织架构', '新增', '', `新增部门: ${name}`); this.reload();
  },

  openEditDept(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const d = DB.findById('departments', id);
    if (!d) return;
    openModal('编辑部门', `
      <div class="form-row"><div class="form-item"><label>部门名称 *</label><input id="deName" value="${d.name}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>负责人</label><input id="deManager" value="${d.manager || ''}"></div><div class="form-item"><label>联系电话</label><input id="dePhone" value="${d.phone || ''}"></div></div>
      <div class="form-row"><div class="form-item"><label>部门职能</label><textarea id="deDesc" rows="3">${d.desc || ''}</textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditDept(${id})">保存</button>`
    );
  },

  saveEditDept(id) {
    DB.update('departments', id, { name: document.getElementById('deName').value.trim(), manager: document.getElementById('deManager').value.trim(), phone: document.getElementById('dePhone').value.trim(), desc: document.getElementById('deDesc').value.trim() });
    closeModal(); toast('部门信息已更新'); this.reload();
  },

  openAddPosition(deptId) {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const dept = DB.findById('departments', deptId);
    openModal('新增岗位', `
      <div class="form-row"><div class="form-item"><label>岗位名称 *</label><input id="pName" placeholder="如：销售经理"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>所属部门</label><select id="pDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${DB.get('departments').filter(d => d.status === 1).map(d => `<option value="${d.id}" ${d.id === deptId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div><div class="form-item"><label>岗位级别</label><select id="pLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="1">高层管理</option><option value="2">中层管理</option><option value="3">基层管理</option><option value="4" selected>普通员工</option></select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>定编人数</label><input id="pHeadcount" type="number" min="1" value="1"></div><div class="form-item"><label>薪资范围</label><input id="pSalaryRange" placeholder="如: 5000-8000"></div></div>
      <div class="form-row"><div class="form-item"><label>岗位职责</label><textarea id="pDesc" rows="3"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.savePosition()">保存</button>`
    );
  },

  savePosition() {
    const name = document.getElementById('pName').value.trim();
    const deptId = parseInt(document.getElementById('pDept').value);
    if (!name) { toast('请输入岗位名称', 'error'); return; }
    const dept = DB.findById('departments', deptId);
    DB.add('positions', { name, departmentId: deptId, departmentName: dept ? dept.name : '', level: parseInt(document.getElementById('pLevel').value), headcount: parseInt(document.getElementById('pHeadcount').value) || 1, salaryRange: document.getElementById('pSalaryRange').value.trim(), desc: document.getElementById('pDesc').value.trim(), status: 1, createdAt: new Date().toISOString() });
    closeModal(); toast('岗位添加成功'); this.reload();
  },

  openEditPosition(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const p = DB.findById('positions', id);
    if (!p) return;
    openModal('编辑岗位', `
      <div class="form-row"><div class="form-item"><label>岗位名称 *</label><input id="peName" value="${p.name}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>所属部门</label><select id="peDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${DB.get('departments').filter(d => d.status === 1).map(d => `<option value="${d.id}" ${d.id === p.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div><div class="form-item"><label>定编人数</label><input id="peHeadcount" type="number" min="1" value="${p.headcount}"></div></div>
      <div class="form-row"><div class="form-item"><label>薪资范围</label><input id="peSalaryRange" value="${p.salaryRange || ''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditPosition(${id})">保存</button>`
    );
  },

  saveEditPosition(id) {
    const deptId = parseInt(document.getElementById('peDept').value);
    const dept = DB.findById('departments', deptId);
    DB.update('positions', id, { name: document.getElementById('peName').value.trim(), departmentId: deptId, departmentName: dept ? dept.name : '', headcount: parseInt(document.getElementById('peHeadcount').value) || 1, salaryRange: document.getElementById('peSalaryRange').value.trim() });
    closeModal(); toast('岗位信息已更新'); this.reload();
  },

  delPosition(id) {
    if (!hasPerm('hrm', 'delete')) { toast('没有删除权限', 'error'); return; }
    const p = DB.findById('positions', id);
    if (!p) return;
    openModal('确认删除', `<div style="text-align:center;padding:20px">确定要删除岗位「${p.name}」吗？</div>`, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="hrm.confirmDelPosition(${id})">删除</button>`);
  },

  confirmDelPosition(id) { DB.delete('positions', id); closeModal(); toast('岗位已删除', 'warning'); this.reload(); },

  // ===========================
  // 2. 员工档案
  // ===========================
  renderFiles() {
    let list = DB.get('hrFiles') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(f => (f.name || '').toLowerCase().includes(kw) || (f.empNo || '').toLowerCase().includes(kw) || (f.departmentName || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    return `
    <div>
      <div class="action-bar">
        <div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索工号/姓名..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div>
        <div class="action-bar-right"><button class="btn btn-outline" onclick="hrm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="hrm.openAddFile()">➕ 新增档案</button></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>岗位</th><th>入职日期</th><th>合同类型</th><th>合同到期</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              ${pageData.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无档案</td></tr>` : pageData.map(f => `
              <tr>
                <td><span style="font-family:monospace;color:var(--primary)">${f.empNo || '-'}</span></td>
                <td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:11px">${(f.name || 'N').slice(0,1)}</div><span style="font-weight:500">${f.name || '-'}</span></div></td>
                <td>${f.departmentName || '-'}</td>
                <td>${f.position || '-'}</td>
                <td>${f.entryDate || '-'}</td>
                <td>${f.contractType || '-'}</td>
                <td><span style="color:${f.contractExpiry && f.contractExpiry < new Date().toISOString().slice(0,10) ? 'var(--danger)' : 'inherit'}">${f.contractExpiry || '-'}</span></td>
                <td><span class="badge ${f.status === 1 ? 'badge-success' : 'badge-default'}">${f.status === 1 ? '在职' : '离职'}</span></td>
                <td><button class="btn btn-outline btn-sm" onclick="hrm.viewFileDetail(${f.id})">详情</button><button class="btn btn-ghost btn-sm" onclick="hrm.openEditFile(${f.id})">编辑</button>${f.status === 1 ? `<button class="btn btn-warning btn-sm" onclick="hrm.openResignation(${f.id})">离职</button>` : ''}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "files")')}
      </div>
    </div>`;
  },

  openAddFile() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const depts = DB.get('departments').filter(d => d.status === 1);
    openModal('新增员工档案', `
      <div class="form-row cols-2"><div class="form-item"><label>姓名 *</label><input id="fName" placeholder="员工姓名"></div><div class="form-item"><label>所属部门 *</label><select id="fDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">请选择</option>${depts.map(d => `<option value="${d.id}" data-name="${d.name}">${d.name}</option>`).join('')}</select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>岗位</label><input id="fPosition" placeholder="职位"></div><div class="form-item"><label>入职日期</label><input id="fEntryDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>合同类型</label>
          <select id="fContractType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="劳动合同">劳动合同</option><option value="劳务合同">劳务合同</option><option value="实习协议">实习协议</option>
          </select>
        </div>
        <div class="form-item">
          <label>合同到期</label>
          <input id="fContractExpiry" type="date">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>学历</label>
          <select id="fEducation" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择</option><option value="博士">博士</option><option value="硕士">硕士</option><option value="本科">本科</option><option value="大专">大专</option><option value="高中">高中</option>
          </select>
        </div>
        <div class="form-item">
          <label>婚姻状况</label>
          <select id="fMarital" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择</option><option value="未婚">未婚</option><option value="已婚">已婚</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2"><div class="form-item"><label>联系电话</label><input id="fPhone" placeholder="手机"></div><div class="form-item"><label>电子邮箱</label><input id="fEmail" type="email" placeholder="email"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>紧急联系人</label><input id="fEmergencyContact" placeholder="紧急联系人"></div><div class="form-item"><label>紧急联系电话</label><input id="fEmergencyPhone" placeholder="紧急电话"></div></div>
      <div class="form-row">
        <div class="form-item">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="fIsSalesman" style="width:18px;height:18px;accent-color:var(--primary)">
            <span style="font-weight:500">👤 是否为销售人员</span>
            <span style="font-size:12px;color:var(--text-muted)">（勾选后可在销售KPI中关联）</span>
          </label>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveFile()">保存</button>`
    );
  },

  saveFile() {
    const name = document.getElementById('fName').value.trim();
    const deptId = parseInt(document.getElementById('fDept').value);
    if (!name) { toast('请输入员工姓名', 'error'); return; }
    if (!deptId) { toast('请选择所属部门', 'error'); return; }
    const deptOpt = document.getElementById('fDept').options[document.getElementById('fDept').selectedIndex];
    const isSalesman = document.getElementById('fIsSalesman').checked;
    const empNo = DB.genCode('EMP');
    const fileData = { empNo, employeeId: null, name, departmentId: deptId, departmentName: deptOpt.dataset.name || '', position: document.getElementById('fPosition').value.trim(), entryDate: document.getElementById('fEntryDate').value, regularDate: '', contractType: document.getElementById('fContractType').value, contractNo: '', contractExpiry: document.getElementById('fContractExpiry').value, education: document.getElementById('fEducation').value, birthday: '', idCard: '', marital: document.getElementById('fMarital').value, phone: document.getElementById('fPhone').value.trim(), email: document.getElementById('fEmail').value.trim(), emergencyContact: document.getElementById('fEmergencyContact').value.trim(), emergencyPhone: document.getElementById('fEmergencyPhone').value.trim(), bankName: '', bankAccount: '', photo: '', isSalesman, status: 1, createdAt: new Date().toISOString() };
    DB.add('hrFiles', fileData);
    DB.add('employees', { name, departmentId: deptId, departmentName: fileData.departmentName, position: fileData.position, phone: fileData.phone, email: fileData.email, entryDate: fileData.entryDate, isSalesman, status: 1 });
    closeModal(); toast('员工档案添加成功'); audit.log('HRM-员工档案', '新增', empNo, `新增员工档案: ${name}`); this.reload();
  },

  viewFileDetail(id) {
    const f = DB.findById('hrFiles', id);
    if (!f) return;
    openModal(`员工档案 - ${f.name}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div><h4 style="margin:0 0 12px;font-size:13px;color:var(--text-muted)">基本信息</h4><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">工号</span><span>${f.empNo || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">姓名</span><span style="font-weight:600">${f.name || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">部门</span><span>${f.departmentName || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">岗位</span><span>${f.position || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">学历</span><span>${f.education || '-'}</span></div></div></div>
        <div><h4 style="margin:0 0 12px;font-size:13px;color:var(--text-muted)">工作信息</h4><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">入职日期</span><span>${f.entryDate || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">合同类型</span><span>${f.contractType || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">合同到期</span><span>${f.contractExpiry || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">状态</span><span class="badge ${f.status === 1 ? 'badge-success' : 'badge-default'}">${f.status === 1 ? '在职' : '离职'}</span></div></div></div>
        <div><h4 style="margin:0 0 12px;font-size:13px;color:var(--text-muted)">联系方式</h4><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">手机</span><span>${f.phone || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">邮箱</span><span>${f.email || '-'}</span></div></div></div>
        <div><h4 style="margin:0 0 12px;font-size:13px;color:var(--text-muted)">紧急联系</h4><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">联系人</span><span>${f.emergencyContact || '-'}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">电话</span><span>${f.emergencyPhone || '-'}</span></div></div></div>
        ${f.status === 0 ? `<div style="grid-column:1/-1;padding:12px;background:rgba(239,68,68,0.08);border-radius:8px"><h4 style="margin:0 0 8px;font-size:13px;color:var(--danger)">离职信息</h4><div style="display:flex;gap:24px;font-size:13px"><span>离职日期: ${f.resignationDate || '-'}</span><span>原因: ${f.resignationReason || '-'}</span></div></div>` : ''}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="hrm.openEditFile(${id})">编辑</button>`
    );
  },

  openEditFile(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const f = DB.findById('hrFiles', id);
    if (!f) return;
    const depts = DB.get('departments').filter(d => d.status === 1);
    closeModal();
    openModal('编辑员工档案', `
      <div class="form-row cols-2"><div class="form-item"><label>姓名 *</label><input id="feName" value="${f.name || ''}"></div><div class="form-item"><label>所属部门</label><select id="feDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${depts.map(d => `<option value="${d.id}" ${d.id === f.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>岗位</label><input id="fePosition" value="${f.position || ''}"></div><div class="form-item"><label>入职日期</label><input id="feEntryDate" type="date" value="${f.entryDate || ''}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>合同类型</label><select id="feContractType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="劳动合同" ${f.contractType === '劳动合同' ? 'selected' : ''}>劳动合同</option><option value="劳务合同" ${f.contractType === '劳务合同' ? 'selected' : ''}>劳务合同</option><option value="实习协议" ${f.contractType === '实习协议' ? 'selected' : ''}>实习协议</option></select></div><div class="form-item"><label>合同到期</label><input id="feContractExpiry" type="date" value="${f.contractExpiry || ''}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>联系电话</label><input id="fePhone" value="${f.phone || ''}"></div><div class="form-item"><label>邮箱</label><input id="feEmail" type="email" value="${f.email || ''}"></div></div>
      <div class="form-row">
        <div class="form-item">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="feIsSalesman" style="width:18px;height:18px;accent-color:var(--primary)" ${f.isSalesman ? 'checked' : ''}>
            <span style="font-weight:500">👤 是否为销售人员</span>
            <span style="font-size:12px;color:var(--text-muted)">（勾选后可在销售KPI中关联）</span>
          </label>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditFile(${id})">保存</button>`
    );
  },

  saveEditFile(id) {
    const deptId = parseInt(document.getElementById('feDept').value);
    const deptOpt = document.getElementById('feDept').options[document.getElementById('feDept').selectedIndex];
    const isSalesman = document.getElementById('feIsSalesman').checked;
    DB.update('hrFiles', id, { name: document.getElementById('feName').value.trim(), departmentId: deptId, departmentName: deptOpt.dataset.name || '', position: document.getElementById('fePosition').value.trim(), entryDate: document.getElementById('feEntryDate').value, contractType: document.getElementById('feContractType').value, contractExpiry: document.getElementById('feContractExpiry').value, phone: document.getElementById('fePhone').value.trim(), email: document.getElementById('feEmail').value.trim(), isSalesman });
    // 同步更新employees表
    const emp = DB.get('employees')?.find(e => e.name === document.getElementById('feName').value.trim() && e.departmentId === deptId);
    if (emp) {
      DB.update('employees', emp.id, { name: document.getElementById('feName').value.trim(), departmentId: deptId, departmentName: deptOpt.dataset.name || '', position: document.getElementById('fePosition').value.trim(), phone: document.getElementById('fePhone').value.trim(), email: document.getElementById('feEmail').value.trim(), isSalesman });
    }
    closeModal(); toast('档案已更新'); this.reload();
  },

  openResignation(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const f = DB.findById('hrFiles', id);
    if (!f) return;
    openModal('办理离职', `<p style="margin:0 0 16px">确认员工 <strong>${f.name}</strong> 办理离职？</p><div class="form-row"><div class="form-item"><label>离职日期</label><input id="rDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div><div class="form-row"><div class="form-item"><label>离职原因</label><select id="rReason" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="个人原因">个人原因</option><option value="家庭原因">家庭原因</option><option value="发展需要">发展需要</option><option value="合同到期">合同到期</option><option value="裁员">裁员</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="hrm.confirmResignation(${id})">确认离职</button>`
    );
  },

  confirmResignation(id) {
    const f = DB.findById('hrFiles', id);
    if (!f) return;
    DB.update('hrFiles', id, { status: 0, resignationDate: document.getElementById('rDate').value, resignationReason: document.getElementById('rReason').value });
    closeModal(); toast('已办理离职'); audit.log('HRM-员工档案', '离职', f.empNo || id, `员工 ${f.name} 离职`); this.reload();
  },

  viewEmployeeFile(empId) {
    const emp = DB.findById('employees', empId);
    if (!emp) return;
    let f = DB.get('hrFiles')?.find(h => h.employeeId === empId);
    if (!f) { f = { empNo: DB.genCode('EMP'), employeeId: empId, name: emp.name, departmentId: emp.departmentId, departmentName: emp.departmentName || '', position: emp.position || '', phone: emp.phone || '', email: emp.email || '', status: emp.status, entryDate: emp.entryDate || '', createdAt: new Date().toISOString() }; DB.add('hrFiles', f); }
    this.switchTab('files');
    setTimeout(() => this.viewFileDetail(f.id), 100);
  },

  // ===========================
  // 3. 考勤管理
  // ===========================
  renderAttendance() {
    const month = this.currentMonth || new Date().toISOString().slice(0, 7);
    let list = DB.get('attendances')?.filter(a => (a.date || '').startsWith(month)) || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(a => (a.name || '').toLowerCase().includes(kw) || (a.empNo || '').toLowerCase().includes(kw)); }
    const totalDays = 30;
    const normalCount = list.filter(a => a.status === '正常').length;
    const lateCount = list.filter(a => a.status === '迟到').length;
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const statusClass = { '正常': 'badge-success', '迟到': 'badge-danger', '早退': 'badge-warning', '缺勤': 'badge-default', '出差': 'badge-info', '请假': 'badge-primary' };

    return `
    <div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">应出勤</div><div style="font-size:24px;font-weight:700;color:var(--primary)">${totalDays}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">实际出勤</div><div style="font-size:24px;font-weight:700;color:var(--success)">${normalCount}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">迟到</div><div style="font-size:24px;font-weight:700;color:var(--danger)">${lateCount}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">缺勤</div><div style="font-size:24px;font-weight:700;color:var(--text-muted)">${list.filter(a => a.status === '缺勤').length}</div></div>
      </div>
      <div class="action-bar">
        <div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div><input type="month" class="filter-select" value="${month}" onchange="hrm.currentMonth=this.value;hrm.page=1;hrm.reload()"></div>
        <div class="action-bar-right"><button class="btn btn-primary" onclick="hrm.openAddAttendance()">➕ 补录</button><button class="btn btn-outline" onclick="hrm.exportAttendance()">📥 导出</button></div>
      </div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>工号</th><th>姓名</th><th>部门</th><th>日期</th><th>上班</th><th>下班</th><th>时长</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无考勤</td></tr>` : pageData.map(a => `<tr><td><span style="font-family:monospace">${a.empNo || '-'}</span></td><td><span style="font-weight:500">${a.name || '-'}</span></td><td>${a.departmentName || '-'}</td><td>${a.date || '-'}</td><td>${a.inTime || '-'}</td><td>${a.outTime || '-'}</td><td>${a.workHours ? a.workHours + 'h' : '-'}</td><td><span class="badge ${statusClass[a.status] || ''}">${a.status || '-'}</span></td><td><button class="btn btn-ghost btn-sm" onclick="hrm.openEditAttendance(${a.id})">编辑</button><button class="btn btn-danger btn-sm" onclick="hrm.delAttendance(${a.id})">删除</button></td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "attendance")')}
      </div>
    </div>`;
  },

  openAddAttendance() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    openModal('补录考勤', `
      <div class="form-row cols-2"><div class="form-item"><label>员工 *</label><select id="aEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">请选择</option>${employees.map(e => `<option value="${e.id}" data-name="${e.name}" data-dept="${e.departmentId}" data-deptname="${e.departmentName || ''}" data-empno="${e.empNo || DB.genCode('EMP')}">${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}</select></div><div class="form-item"><label>日期 *</label><input id="aDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>上班</label><input id="aInTime" type="time" value="09:00"></div><div class="form-item"><label>下班</label><input id="aOutTime" type="time" value="18:00"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>时长(h)</label><input id="aHours" type="number" step="0.5" min="0" value="8"></div><div class="form-item"><label>状态</label><select id="aStatus" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="正常">正常</option><option value="迟到">迟到</option><option value="早退">早退</option><option value="缺勤">缺勤</option><option value="出差">出差</option><option value="请假">请假</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveAttendance()">保存</button>`
    );
  },

  saveAttendance() {
    const empId = parseInt(document.getElementById('aEmp').value);
    const date = document.getElementById('aDate').value;
    if (!empId) { toast('请选择员工', 'error'); return; }
    const opt = document.getElementById('aEmp').options[document.getElementById('aEmp').selectedIndex];
    DB.add('attendances', { employeeId: empId, empNo: opt.dataset.empno, name: opt.dataset.name, departmentId: parseInt(opt.dataset.dept), departmentName: opt.dataset.deptname, date, inTime: document.getElementById('aInTime').value, outTime: document.getElementById('aOutTime').value, workHours: parseFloat(document.getElementById('aHours').value) || 8, status: document.getElementById('aStatus').value, note: '', createdAt: new Date().toISOString() });
    closeModal(); toast('考勤已添加'); this.reload();
  },

  openEditAttendance(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const a = DB.findById('attendances', id);
    if (!a) return;
    openModal('编辑考勤', `<div class="form-row cols-2"><div class="form-item"><label>员工</label><input value="${a.name}" readonly style="background:var(--bg)"></div><div class="form-item"><label>日期</label><input id="aeDate" type="date" value="${a.date || ''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>上班</label><input id="aeInTime" type="time" value="${a.inTime || ''}"></div><div class="form-item"><label>下班</label><input id="aeOutTime" type="time" value="${a.outTime || ''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>时长</label><input id="aeHours" type="number" step="0.5" value="${a.workHours || 8}"></div><div class="form-item"><label>状态</label><select id="aeStatus" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="正常" ${a.status === '正常' ? 'selected' : ''}>正常</option><option value="迟到" ${a.status === '迟到' ? 'selected' : ''}>迟到</option><option value="早退" ${a.status === '早退' ? 'selected' : ''}>早退</option><option value="缺勤" ${a.status === '缺勤' ? 'selected' : ''}>缺勤</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditAttendance(${id})">保存</button>`
    );
  },

  saveEditAttendance(id) {
    DB.update('attendances', id, { date: document.getElementById('aeDate').value, inTime: document.getElementById('aeInTime').value, outTime: document.getElementById('aeOutTime').value, workHours: parseFloat(document.getElementById('aeHours').value) || 8, status: document.getElementById('aeStatus').value });
    closeModal(); toast('考勤已更新'); this.reload();
  },

  delAttendance(id) {
    if (!hasPerm('hrm', 'delete')) { toast('没有删除权限', 'error'); return; }
    DB.delete('attendances', id); toast('考勤已删除', 'warning'); this.reload();
  },

  exportAttendance() {
    if (!hasPerm('hrm', 'export')) { toast('没有导出权限', 'error'); return; }
    const month = this.currentMonth || new Date().toISOString().slice(0, 7);
    const list = DB.get('attendances')?.filter(a => (a.date || '').startsWith(month)) || [];
    let csv = '\uFEFF工号,姓名,部门,日期,上班,下班,时长,状态\n';
    list.forEach(a => { csv += `${a.empNo || ''},${a.name || ''},${a.departmentName || ''},${a.date || ''},${a.inTime || ''},${a.outTime || ''},${a.workHours || ''},${a.status || ''}\n`; });
    downloadCSV(csv, `考勤_${month}.csv`);
    toast('考勤已导出', 'success');
  },

  // ===========================
  // 4. 排班管理
  // ===========================
  renderScheduling() {
    let list = DB.get('schedulings') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(s => (s.code || '').toLowerCase().includes(kw) || (s.shiftName || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const shiftTypes = { '白班': '#10b981', '夜班': '#6366f1', '早班': '#f59e0b', '中班': '#8b5cf6', '休息': '#94a3b8' };

    return `
    <div>
      <div class="action-bar">
        <div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div>
        <div class="action-bar-right"><button class="btn btn-outline" onclick="hrm.exportCurrentTab()">📥 导出</button><button class="btn btn-ghost" onclick="hrm.copyLastMonthSchedule()">📋 复制上月</button><button class="btn btn-primary" onclick="hrm.openAddSchedule()">➕ 创建</button></div>
      </div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>月份</th><th>班次</th><th>类型</th><th>时间</th><th>适用</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px">暂无排班</td></tr>` : pageData.map(s => `<tr><td><span style="font-family:monospace;color:var(--primary)">${s.code}</span></td><td>${s.yearMonth}</td><td><span style="font-weight:600">${s.shiftName}</span></td><td><span class="badge" style="background:${shiftTypes[s.shiftType] || '#64748b'};color:white">${s.shiftType}</span></td><td>${s.startTime} - ${s.endTime}</td><td style="font-size:12px">${s.departments || '-'}</td><td><span class="badge ${s.status === 1 ? 'badge-success' : 'badge-default'}">${s.status === 1 ? '启用' : '停用'}</span></td><td><button class="btn btn-ghost btn-sm" onclick="hrm.openEditSchedule(${s.id})">编辑</button><button class="btn btn-danger btn-sm" onclick="hrm.delSchedule(${s.id})">删除</button></td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "scheduling")')}
      </div>
    </div>`;
  },

  openAddSchedule() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const depts = DB.get('departments').filter(d => d.status === 1);
    openModal('创建排班', `
      <div class="form-row cols-2"><div class="form-item"><label>编号</label><input id="sCode" value="${DB.genCode('SCH')}" readonly style="background:var(--bg)"></div><div class="form-item"><label>月份 *</label><input id="sMonth" type="month" value="${this.currentMonth}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>班次名称 *</label><input id="sName" placeholder="如：早班A组"></div><div class="form-item"><label>班次类型</label><select id="sType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="白班">白班</option><option value="夜班">夜班</option><option value="早班">早班</option><option value="中班">中班</option><option value="休息">休息</option></select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>开始时间</label><input id="sStart" type="time" value="09:00"></div><div class="form-item"><label>结束时间</label><input id="sEnd" type="time" value="18:00"></div></div>
      <div class="form-row"><div class="form-item"><label>适用范围</label><select id="sDepts" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="全部">全部部门</option>${depts.map(d => `<option value="${d.name}">${d.name}</option>`).join('')}</select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveSchedule()">保存</button>`
    );
  },

  saveSchedule() {
    const month = document.getElementById('sMonth').value;
    const name = document.getElementById('sName').value.trim();
    if (!month) { toast('请选择月份', 'error'); return; }
    if (!name) { toast('请输入班次名称', 'error'); return; }
    DB.add('schedulings', { code: document.getElementById('sCode').value, yearMonth: month, shiftName: name, shiftType: document.getElementById('sType').value, startTime: document.getElementById('sStart').value, endTime: document.getElementById('sEnd').value, departments: document.getElementById('sDepts').value, status: 1, createdAt: new Date().toISOString() });
    closeModal(); toast('排班已创建'); this.reload();
  },

  openEditSchedule(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const s = DB.findById('schedulings', id);
    if (!s) return;
    openModal('编辑排班', `<div class="form-row cols-2"><div class="form-item"><label>班次名称</label><input id="seName" value="${s.shiftName || ''}"></div><div class="form-item"><label>类型</label><select id="seType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="白班" ${s.shiftType === '白班' ? 'selected' : ''}>白班</option><option value="夜班" ${s.shiftType === '夜班' ? 'selected' : ''}>夜班</option><option value="早班" ${s.shiftType === '早班' ? 'selected' : ''}>早班</option><option value="中班" ${s.shiftType === '中班' ? 'selected' : ''}>中班</option><option value="休息" ${s.shiftType === '休息' ? 'selected' : ''}>休息</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>开始</label><input id="seStart" type="time" value="${s.startTime || ''}"></div><div class="form-item"><label>结束</label><input id="seEnd" type="time" value="${s.endTime || ''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditSchedule(${id})">保存</button>`
    );
  },

  saveEditSchedule(id) {
    DB.update('schedulings', id, { shiftName: document.getElementById('seName').value.trim(), shiftType: document.getElementById('seType').value, startTime: document.getElementById('seStart').value, endTime: document.getElementById('seEnd').value });
    closeModal(); toast('排班已更新'); this.reload();
  },

  delSchedule(id) {
    if (!hasPerm('hrm', 'delete')) { toast('没有删除权限', 'error'); return; }
    DB.delete('schedulings', id); toast('排班已删除', 'warning'); this.reload();
  },

  copyLastMonthSchedule() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastSchedules = DB.get('schedulings')?.filter(s => s.yearMonth === lastMonth) || [];
    if (lastSchedules.length === 0) { toast('上月无排班', 'warning'); return; }
    const [y, m] = lastMonth.split('-');
    const newMonth = m === '12' ? `${parseInt(y) + 1}-01` : `${y}-${String(parseInt(m) + 1).padStart(2, '0')}`;
    lastSchedules.forEach(s => { DB.add('schedulings', { ...s, id: undefined, code: DB.genCode('SCH'), yearMonth: newMonth, status: 1, createdAt: new Date().toISOString() }); });
    toast(`已复制 ${lastSchedules.length} 条排班`); this.reload();
  },

  // ===========================
  // 5. 加班管理
  // ===========================
  renderOvertime() {
    let list = DB.get('overtimes') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(o => (o.code || '').toLowerCase().includes(kw) || (o.name || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const typeColors = { '工作日加班': '#f59e0b', '周末加班': '#8b5cf6', '节假日加班': '#ef4444' };
    const statusColors = { '待审批': 'badge-warning', '已批准': 'badge-success', '已拒绝': 'badge-danger' };

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div><div class="action-bar-right"><button class="btn btn-outline" onclick="hrm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="hrm.openAddOvertime()">➕ 申请</button></div></div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>申请人</th><th>部门</th><th>日期</th><th>时间</th><th>时长</th><th>类型</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无加班</td></tr>` : pageData.map(o => `<tr><td><span style="font-family:monospace">${o.code}</span></td><td><span style="font-weight:500">${o.name}</span></td><td>${o.departmentName || '-'}</td><td>${o.date}</td><td>${o.startTime} - ${o.endTime}</td><td><span style="color:var(--warning)">${o.hours}h</span></td><td><span class="badge" style="background:${typeColors[o.type] || '#64748b'};color:white">${o.type}</span></td><td><span class="badge ${statusColors[o.status] || ''}">${o.status}</span></td><td>${o.status === '待审批' ? `<button class="btn btn-primary btn-sm" onclick="hrm.approveOvertime(${o.id})">审批</button>` : ''}<button class="btn btn-ghost btn-sm" onclick="hrm.viewOvertimeDetail(${o.id})">详情</button></td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "overtime")')}
      </div>
    </div>`;
  },

  openAddOvertime() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    openModal('申请加班', `
      <div class="form-row cols-2"><div class="form-item"><label>申请人 *</label><select id="oEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${employees.map(e => `<option value="${e.id}" data-name="${e.name}" data-dept="${e.departmentId}" data-deptname="${e.departmentName || ''}">${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}</select></div><div class="form-item"><label>日期 *</label><input id="oDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>开始时间</label><input id="oStart" type="time" value="18:00"></div><div class="form-item"><label>结束时间</label><input id="oEnd" type="time" value="21:00"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>时长(h)</label><input id="oHours" type="number" step="0.5" min="0.5" value="3"></div><div class="form-item"><label>类型</label><select id="oType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="工作日加班">工作日加班</option><option value="周末加班">周末加班</option><option value="节假日加班">节假日加班</option></select></div></div>
      <div class="form-row"><div class="form-item"><label>原因</label><textarea id="oReason" rows="3" placeholder="加班原因"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveOvertime()">提交</button>`
    );
  },

  saveOvertime() {
    const empId = parseInt(document.getElementById('oEmp').value);
    if (!empId) { toast('请选择申请人', 'error'); return; }
    const opt = document.getElementById('oEmp').options[document.getElementById('oEmp').selectedIndex];
    DB.add('overtimes', { code: DB.genCode('OT'), employeeId: empId, empNo: '', name: opt.dataset.name, departmentId: parseInt(opt.dataset.dept), departmentName: opt.dataset.deptname, date: document.getElementById('oDate').value, startTime: document.getElementById('oStart').value, endTime: document.getElementById('oEnd').value, hours: parseFloat(document.getElementById('oHours').value) || 0, type: document.getElementById('oType').value, reason: document.getElementById('oReason').value.trim(), status: '待审批', approver: '', approvalTime: '', approvalNote: '', createdAt: new Date().toISOString() });
    closeModal(); toast('加班申请已提交'); this.reload();
  },

  approveOvertime(id) {
    if (!hasPerm('hrm', 'approve')) { toast('没有审核权限', 'error'); return; }
    const o = DB.findById('overtimes', id);
    if (!o) return;
    openModal('审批加班', `<div style="padding:8px 0"><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">申请人</span><span>${o.name}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">加班日期</span><span>${o.date}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">加班时长</span><span>${o.hours}h</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">原因</span><span>${o.reason || '-'}</span></div></div><div style="margin-top:16px"><label style="display:block;margin-bottom:8px">审批意见</label><textarea id="oaNote" rows="3"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">待定</button><button class="btn btn-danger" onclick="hrm.rejectOvertime(${id})">拒绝</button><button class="btn btn-success" onclick="hrm.confirmApproveOvertime(${id})">批准</button>`
    );
  },

  confirmApproveOvertime(id) { DB.update('overtimes', id, { status: '已批准', approver: currentUser?.username || '系统', approvalTime: new Date().toISOString().slice(0, 16), approvalNote: document.getElementById('oaNote')?.value || '' }); closeModal(); toast('加班已批准'); this.reload(); },
  rejectOvertime(id) { DB.update('overtimes', id, { status: '已拒绝', approver: currentUser?.username || '系统', approvalTime: new Date().toISOString().slice(0, 16) }); closeModal(); toast('加班已拒绝', 'warning'); this.reload(); },
  viewOvertimeDetail(id) { const o = DB.findById('overtimes', id); if (!o) return; openModal('加班详情', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><span style="color:var(--text-muted)">申请人</span><div style="font-weight:600">${o.name}</div></div><div><span style="color:var(--text-muted)">部门</span><div>${o.departmentName || '-'}</div></div><div><span style="color:var(--text-muted)">日期</span><div>${o.date}</div></div><div><span style="color:var(--text-muted)">时长</span><div style="color:var(--warning)">${o.hours}h</div></div><div><span style="color:var(--text-muted)">类型</span><div>${o.type}</div></div><div><span style="color:var(--text-muted)">状态</span><div><span class="badge ${o.status === '已批准' ? 'badge-success' : o.status === '已拒绝' ? 'badge-danger' : 'badge-warning'}">${o.status}</span></div></div><div style="grid-column:1/-1"><span style="color:var(--text-muted)">原因</span><div>${o.reason || '-'}</div></div>${o.approvalNote ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">审批意见</span><div>${o.approvalNote}</div></div>` : ''}</div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`); },

  // ===========================
  // 6. 假期管理
  // ===========================
  renderLeave() {
    let list = DB.get('leaveRequests') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(l => (l.code || '').toLowerCase().includes(kw) || (l.name || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const typeColors = { '年假': '#10b981', '病假': '#ef4444', '事假': '#f59e0b', '婚假': '#ec4899', '产假': '#8b5cf6', '丧假': '#64748b' };
    const statusColors = { '待审批': 'badge-warning', '已批准': 'badge-success', '已拒绝': 'badge-danger', '已销假': 'badge-info' };

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div><div class="action-bar-right"><button class="btn btn-outline" onclick="hrm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="hrm.openAddLeave()">➕ 申请</button></div></div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>申请人</th><th>部门</th><th>类型</th><th>开始</th><th>结束</th><th>天数</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无假期</td></tr>` : pageData.map(l => `<tr><td><span style="font-family:monospace">${l.code}</span></td><td><span style="font-weight:500">${l.name}</span></td><td>${l.departmentName || '-'}</td><td><span class="badge" style="background:${typeColors[l.type] || '#64748b'};color:white">${l.type}</span></td><td>${l.startDate}</td><td>${l.endDate}</td><td><span style="color:var(--primary)">${l.days}</span>天</td><td><span class="badge ${statusColors[l.status] || ''}">${l.status}</span></td><td>${l.status === '待审批' ? `<button class="btn btn-primary btn-sm" onclick="hrm.approveLeave(${l.id})">审批</button>` : ''}${l.status === '已批准' ? `<button class="btn btn-info btn-sm" onclick="hrm.cancelLeave(${l.id})">销假</button>` : ''}<button class="btn btn-ghost btn-sm" onclick="hrm.viewLeaveDetail(${l.id})">详情</button></td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "leave")')}
      </div>
    </div>`;
  },

  openAddLeave() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    openModal('申请假期', `
      <div class="form-row cols-2"><div class="form-item"><label>申请人 *</label><select id="lvEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${employees.map(e => `<option value="${e.id}" data-name="${e.name}" data-dept="${e.departmentId}" data-deptname="${e.departmentName || ''}">${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}</select></div><div class="form-item"><label>类型</label><select id="lvType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="年假">年假</option><option value="病假">病假</option><option value="事假">事假</option><option value="婚假">婚假</option><option value="产假">产假</option><option value="丧假">丧假</option></select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>开始日期</label><input id="lvStart" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="form-item"><label>结束日期</label><input id="lvEnd" type="date" value="${new Date().toISOString().slice(0,10)}"></div></div>
      <div class="form-row"><div class="form-item"><label>天数</label><input id="lvDays" type="number" min="0.5" step="0.5" value="1"></div></div>
      <div class="form-row"><div class="form-item"><label>原因</label><textarea id="lvReason" rows="3" placeholder="请假原因"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveLeave()">提交</button>`
    );
  },

  saveLeave() {
    const empId = parseInt(document.getElementById('lvEmp').value);
    if (!empId) { toast('请选择申请人', 'error'); return; }
    const opt = document.getElementById('lvEmp').options[document.getElementById('lvEmp').selectedIndex];
    DB.add('leaveRequests', { code: DB.genCode('LV'), employeeId: empId, empNo: '', name: opt.dataset.name, departmentId: parseInt(opt.dataset.dept), departmentName: opt.dataset.deptname, type: document.getElementById('lvType').value, startDate: document.getElementById('lvStart').value, endDate: document.getElementById('lvEnd').value, days: parseFloat(document.getElementById('lvDays').value) || 1, reason: document.getElementById('lvReason').value.trim(), status: '待审批', approver: '', approvalNote: '', createdAt: new Date().toISOString() });
    closeModal(); toast('假期申请已提交'); this.reload();
  },

  approveLeave(id) {
    if (!hasPerm('hrm', 'approve')) { toast('没有审核权限', 'error'); return; }
    const l = DB.findById('leaveRequests', id);
    if (!l) return;
    openModal('审批假期', `<div style="padding:8px 0"><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">申请人</span><span>${l.name}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">类型</span><span>${l.type}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">天数</span><span>${l.days}天</span></div></div><div style="margin-top:16px"><textarea id="lvaNote" rows="3" placeholder="审批意见"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">待定</button><button class="btn btn-danger" onclick="hrm.rejectLeave(${id})">拒绝</button><button class="btn btn-success" onclick="hrm.confirmApproveLeave(${id})">批准</button>`
    );
  },

  confirmApproveLeave(id) { DB.update('leaveRequests', id, { status: '已批准', approver: currentUser?.username || '系统', approvalNote: document.getElementById('lvaNote')?.value || '' }); closeModal(); toast('假期已批准'); this.reload(); },
  rejectLeave(id) { DB.update('leaveRequests', id, { status: '已拒绝', approver: currentUser?.username || '系统' }); closeModal(); toast('假期已拒绝', 'warning'); this.reload(); },
  cancelLeave(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    DB.update('leaveRequests', id, { status: '已销假' }); toast('已销假'); this.reload();
  },
  viewLeaveDetail(id) { const l = DB.findById('leaveRequests', id); if (!l) return; openModal('假期详情', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><span style="color:var(--text-muted)">申请人</span><div style="font-weight:600">${l.name}</div></div><div><span style="color:var(--text-muted)">部门</span><div>${l.departmentName || '-'}</div></div><div><span style="color:var(--text-muted)">类型</span><div>${l.type}</div></div><div><span style="color:var(--text-muted)">天数</span><div>${l.days}天</div></div><div><span style="color:var(--text-muted)">开始</span><div>${l.startDate}</div></div><div><span style="color:var(--text-muted)">结束</span><div>${l.endDate}</div></div><div style="grid-column:1/-1"><span style="color:var(--text-muted)">原因</span><div>${l.reason || '-'}</div></div></div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`); },

  // ===========================
  // 7. 薪资管理
  // ===========================
  renderSalary() {
    let list = DB.get('salaries') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(s => (s.code || '').toLowerCase().includes(kw) || (s.name || '').toLowerCase().includes(kw) || (s.yearMonth || '').includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const statusColors = { '待发放': 'badge-warning', '已发放': 'badge-success', '作废': 'badge-default' };

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索薪资..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div><div class="action-bar-right"><button class="btn btn-primary" onclick="hrm.openGenerateSalary()">📊 生成薪资</button><button class="btn btn-outline" onclick="hrm.exportSalary()">📥 导出</button></div></div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>月份</th><th>姓名</th><th>部门</th><th>应发</th><th>扣款</th><th>实发</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px">暂无薪资</td></tr>` : pageData.map(s => `<tr><td><span style="font-family:monospace">${s.code}</span></td><td>${s.yearMonth}</td><td><span style="font-weight:500">${s.name}</span></td><td>${s.departmentName || '-'}</td><td style="color:var(--success)">${fmtMoney(s.grossSalary || 0)}</td><td style="color:var(--danger)">-${fmtMoney((s.socialSecurity || 0) + (s.housingFund || 0) + (s.incomeTax || 0))}</td><td style="font-weight:700;color:var(--primary)">${fmtMoney(s.netSalary || 0)}</td><td><span class="badge ${statusColors[s.status] || ''}">${s.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="hrm.viewSalaryDetail(${s.id})">明细</button>${s.status === '待发放' ? `<button class="btn btn-success btn-sm" onclick="hrm.confirmPaySalary(${s.id})">发放</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "salary")')}
      </div>
    </div>`;
  },

  openGenerateSalary() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    openModal('生成薪资', `
      <div class="form-row"><div class="form-item"><label>薪资月份 *</label><input id="sgMonth" type="month" value="${this.currentMonth}"></div></div>
      <div class="form-row"><div class="form-item"><label>选择员工</label><select id="sgEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="all">全员 (${employees.length}人)</option>${employees.map(e => `<option value="${e.id}">${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}</select></div></div>
      <div style="margin-top:12px;padding:12px;background:var(--bg);border-radius:8px;font-size:13px"><div style="margin-bottom:8px;font-weight:600">💡 说明</div><div>• 应发 = 基本+岗位+绩效+加班+补贴</div><div>• 实发 = 应发 - 社保 - 公积金 - 个税</div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.doGenerateSalary()">生成</button>`
    );
  },

  doGenerateSalary() {
    const month = document.getElementById('sgMonth').value;
    const empId = document.getElementById('sgEmp').value;
    if (!month) { toast('请选择月份', 'error'); return; }
    const employees = empId === 'all' ? DB.get('employees').filter(e => e.status === 1) : [DB.findById('employees', parseInt(empId))].filter(Boolean);
    if (employees.length === 0) { toast('未找到员工', 'error'); return; }
    let count = 0;
    employees.forEach(e => {
      const existing = DB.get('salaries')?.find(s => s.employeeId === e.id && s.yearMonth === month);
      if (existing) return;
      const baseSalary = 5000, positionSalary = 1000, performanceSalary = Math.round(Math.random() * 2000), overtimePay = 0, allowance = 500;
      const grossSalary = baseSalary + positionSalary + performanceSalary + overtimePay + allowance;
      const socialSecurity = Math.round(baseSalary * 0.08 * 100) / 100;
      const housingFund = Math.round(baseSalary * 0.12 * 100) / 100;
      const taxableIncome = grossSalary - socialSecurity - housingFund - 5000;
      let incomeTax = 0;
      if (taxableIncome > 0) { if (taxableIncome <= 3000) incomeTax = taxableIncome * 0.03; else if (taxableIncome <= 12000) incomeTax = taxableIncome * 0.10 - 210; else if (taxableIncome <= 25000) incomeTax = taxableIncome * 0.20 - 1410; else if (taxableIncome <= 35000) incomeTax = taxableIncome * 0.25 - 2660; else if (taxableIncome <= 55000) incomeTax = taxableIncome * 0.30 - 4410; else incomeTax = taxableIncome * 0.35 - 7160; }
      incomeTax = Math.round(incomeTax * 100) / 100;
      const netSalary = Math.round((grossSalary - socialSecurity - housingFund - incomeTax) * 100) / 100;
      DB.add('salaries', { code: DB.genCode('SAL'), yearMonth: month, employeeId: e.id, empNo: e.empNo || '', name: e.name, departmentId: e.departmentId, departmentName: e.departmentName || '', position: e.position || '', baseSalary, positionSalary, performanceSalary, overtimePay, allowance, grossSalary, socialSecurity, housingFund, incomeTax, netSalary, payDate: '', status: '待发放', createdAt: new Date().toISOString() });
      count++;
    });
    closeModal(); toast(`已生成 ${count} 条薪资`); this.reload();
  },

  viewSalaryDetail(id) {
    const s = DB.findById('salaries', id);
    if (!s) return;
    openModal(`薪资明细 - ${s.name} (${s.yearMonth})`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="padding:12px;background:rgba(16,185,129,0.08);border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">应发工资</div><div style="font-size:20px;font-weight:700;color:var(--success)">${fmtMoney(s.grossSalary || 0)}</div></div>
        <div style="padding:12px;background:rgba(59,130,246,0.08);border-radius:8px"><div style="font-size:12px;color:var(--text-muted)">实发工资</div><div style="font-size:20px;font-weight:700;color:var(--primary)">${fmtMoney(s.netSalary || 0)}</div></div>
        <div><span style="color:var(--text-muted)">基本工资</span><div>${fmtMoney(s.baseSalary || 0)}</div></div><div><span style="color:var(--text-muted)">岗位工资</span><div>${fmtMoney(s.positionSalary || 0)}</div></div>
        <div><span style="color:var(--text-muted)">绩效工资</span><div>${fmtMoney(s.performanceSalary || 0)}</div></div><div><span style="color:var(--text-muted)">加班费</span><div>${fmtMoney(s.overtimePay || 0)}</div></div>
        <div><span style="color:var(--text-muted)">补贴</span><div>${fmtMoney(s.allowance || 0)}</div></div><div><span style="color:var(--text-muted)">状态</span><div><span class="badge ${s.status === '已发放' ? 'badge-success' : 'badge-warning'}">${s.status}</span></div></div>
        <div><span style="color:var(--text-muted)">社保扣款</span><div style="color:var(--danger)">-${fmtMoney(s.socialSecurity || 0)}</div></div><div><span style="color:var(--text-muted)">公积金</span><div style="color:var(--danger)">-${fmtMoney(s.housingFund || 0)}</div></div>
        <div><span style="color:var(--text-muted)">个税</span><div style="color:var(--danger)">-${fmtMoney(s.incomeTax || 0)}</div></div><div><span style="color:var(--text-muted)">发薪日期</span><div>${s.payDate || '-'}</div></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  confirmPaySalary(id) {
    if (!hasPerm('hrm', 'approve')) { toast('没有审核权限', 'error'); return; }
    openModal('确认发放', `<div style="text-align:center;padding:20px"><p>确认发放此笔薪资吗？</p></div>`, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-success" onclick="hrm.doPaySalary(${id})">确认</button>`);
  },

  doPaySalary(id) {
    DB.update('salaries', id, { status: '已发放', payDate: new Date().toISOString().slice(0, 10) });
    closeModal(); toast('薪资已发放'); this.reload();
  },

  exportSalary() {
    if (!hasPerm('hrm', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('salaries') || [];
    let csv = '\uFEFF编号,月份,姓名,部门,岗位,基本工资,岗位工资,绩效,加班,补贴,应发,社保,公积金,个税,实发,状态\n';
    list.forEach(s => { csv += `${s.code},${s.yearMonth},${s.name},${s.departmentName || ''},${s.position || ''},${s.baseSalary || 0},${s.positionSalary || 0},${s.performanceSalary || 0},${s.overtimePay || 0},${s.allowance || 0},${s.grossSalary || 0},${s.socialSecurity || 0},${s.housingFund || 0},${s.incomeTax || 0},${s.netSalary || 0},${s.status}\n`; });
    downloadCSV(csv, `薪资_${this.currentMonth}.csv`);
    toast('薪资已导出', 'success');
  },

  // ===========================
  // 8. 招聘管理
  // ===========================
  renderRecruitment() {
    let list = DB.get('recruitments') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(r => (r.code || '').toLowerCase().includes(kw) || (r.position || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const statusColors = { '招聘中': 'badge-success', '已暂停': 'badge-warning', '已结束': 'badge-default', '已取消': 'badge-danger' };
    const urgencyColors = { '高': '#ef4444', '中': '#f59e0b', '低': '#10b981' };

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索职位..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div><div class="action-bar-right"><button class="btn btn-outline" onclick="hrm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="hrm.openAddRecruitment()">📢 发布</button></div></div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>职位</th><th>部门</th><th>人数</th><th>类型</th><th>紧急</th><th>薪资</th><th>截止</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:40px">暂无招聘</td></tr>` : pageData.map(r => `<tr><td><span style="font-family:monospace">${r.code}</span></td><td><span style="font-weight:600">${r.position}</span></td><td>${r.departmentName || '-'}</td><td>${r.recruited || 0}/${r.headcount}</td><td>${r.type || '社招'}</td><td><span style="color:${urgencyColors[r.urgency] || '#64748b'};font-weight:600">${r.urgency || '-'}</span></td><td style="font-size:12px">${r.salaryRange || '-'}</td><td>${r.deadline || '-'}</td><td><span class="badge ${statusColors[r.status] || ''}">${r.status}</span></td><td><button class="btn btn-outline btn-sm" onclick="hrm.viewCandidates(${r.id})">候选人</button>${r.status === '招聘中' ? `<button class="btn btn-ghost btn-sm" onclick="hrm.pauseRecruitment(${r.id})">暂停</button>` : ''}${r.status === '已暂停' ? `<button class="btn btn-success btn-sm" onclick="hrm.resumeRecruitment(${r.id})">恢复</button>` : ''}<button class="btn btn-ghost btn-sm" onclick="hrm.openEditRecruitment(${r.id})">编辑</button></td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "recruitment")')}
      </div>
    </div>`;
  },

  openAddRecruitment() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const depts = DB.get('departments').filter(d => d.status === 1);
    openModal('发布职位', `
      <div class="form-row cols-2"><div class="form-item"><label>职位名称 *</label><input id="rPos" placeholder="如：销售经理"></div><div class="form-item"><label>部门</label><select id="rDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">请选择</option>${depts.map(d => `<option value="${d.id}" data-name="${d.name}">${d.name}</option>`).join('')}</select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>人数</label><input id="rCount" type="number" min="1" value="1"></div><div class="form-item"><label>类型</label><select id="rType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="社招">社会招聘</option><option value="校招">校园招聘</option><option value="实习">实习生</option></select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>紧急度</label><select id="rUrgency" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="中">普通</option><option value="高">紧急</option><option value="低">不急</option></select></div><div class="form-item"><label>薪资范围</label><input id="rSalary" placeholder="如: 8000-12000"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>发布日期</label><input id="rPubDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="form-item"><label>截止日期</label><input id="rDeadline" type="date"></div></div>
      <div class="form-row"><div class="form-item"><label>要求</label><textarea id="rReq" rows="3" placeholder="任职要求"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveRecruitment()">发布</button>`
    );
  },

  saveRecruitment() {
    const position = document.getElementById('rPos').value.trim();
    if (!position) { toast('请输入职位名称', 'error'); return; }
    const deptId = parseInt(document.getElementById('rDept').value);
    const deptOpt = document.getElementById('rDept').options[document.getElementById('rDept').selectedIndex];
    DB.add('recruitments', { code: DB.genCode('REC'), position, departmentId: deptId, departmentName: deptOpt.dataset.name || '', headcount: parseInt(document.getElementById('rCount').value) || 1, recruited: 0, type: document.getElementById('rType').value, urgency: document.getElementById('rUrgency').value, salaryRange: document.getElementById('rSalary').value.trim(), publishDate: document.getElementById('rPubDate').value, deadline: document.getElementById('rDeadline').value, requirements: document.getElementById('rReq').value.trim(), status: '招聘中', createdAt: new Date().toISOString() });
    closeModal(); toast('职位已发布'); this.reload();
  },

  openEditRecruitment(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('recruitments', id);
    if (!r) return;
    const depts = DB.get('departments').filter(d => d.status === 1);
    openModal('编辑职位', `<div class="form-row cols-2"><div class="form-item"><label>职位</label><input id="rePos" value="${r.position || ''}"></div><div class="form-item"><label>部门</label><select id="reDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${depts.map(d => `<option value="${d.id}" data-name="${d.name}" ${d.id === r.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>招聘人数</label><input id="reCount" type="number" value="${r.headcount || 1}"></div><div class="form-item"><label>已招聘</label><input id="reRecruited" type="number" value="${r.recruited || 0}"></div></div><div class="form-row cols-2"><div class="form-item"><label>紧急度</label><select id="reUrgency" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="中" ${r.urgency === '中' ? 'selected' : ''}>普通</option><option value="高" ${r.urgency === '高' ? 'selected' : ''}>紧急</option><option value="低" ${r.urgency === '低' ? 'selected' : ''}>不急</option></select></div><div class="form-item"><label>薪资</label><input id="reSalary" value="${r.salaryRange || ''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveEditRecruitment(${id})">保存</button>`
    );
  },

  saveEditRecruitment(id) {
    const deptId = parseInt(document.getElementById('reDept').value);
    const deptOpt = document.getElementById('reDept').options[document.getElementById('reDept').selectedIndex];
    DB.update('recruitments', id, { position: document.getElementById('rePos').value.trim(), departmentId: deptId, departmentName: deptOpt.dataset.name || '', headcount: parseInt(document.getElementById('reCount').value) || 1, recruited: parseInt(document.getElementById('reRecruited').value) || 0, urgency: document.getElementById('reUrgency').value, salaryRange: document.getElementById('reSalary').value.trim() });
    closeModal(); toast('职位已更新'); this.reload();
  },

  pauseRecruitment(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    DB.update('recruitments', id, { status: '已暂停' }); toast('已暂停'); this.reload();
  },
  resumeRecruitment(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    DB.update('recruitments', id, { status: '招聘中' }); toast('已恢复'); this.reload();
  },

  viewCandidates(recruitmentId) {
    const r = DB.findById('recruitments', recruitmentId);
    if (!r) return;
    const candidates = DB.get('candidates')?.filter(c => c.recruitmentId === recruitmentId) || [];
    const statusColors = { '待筛选': 'badge-warning', '面试中': 'badge-info', '录用': 'badge-success', '淘汰': 'badge-default' };
    openModal(`候选人 - ${r.position}`, `
      <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center"><div><span style="font-weight:600">${r.position}</span><span style="margin-left:8px;font-size:13px;color:var(--text-muted)">${r.departmentName || ''}</span></div><button class="btn btn-primary btn-sm" onclick="hrm.openAddCandidate(${recruitmentId})">➕ 添加</button></div>
      ${candidates.length === 0 ? '<div style="text-align:center;padding:40px;color:var(--text-muted)">暂无候选人</div>' : `<div class="table-wrap"><table class="data-table"><thead><tr><th>姓名</th><th>联系方式</th><th>学历</th><th>经验</th><th>来源</th><th>状态</th><th>操作</th></tr></thead><tbody>${candidates.map(c => `<tr><td><span style="font-weight:500">${c.name}</span></td><td style="font-size:12px">${c.phone || '-'}<br>${c.email || '-'}</td><td>${c.education || '-'}</td><td>${c.experience || '-'}</td><td>${c.source || '-'}</td><td><span class="badge ${statusColors[c.status] || ''}">${c.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="hrm.updateCandidateStatus(${c.id})">状态</button><button class="btn btn-danger btn-sm" onclick="hrm.delCandidate(${c.id})">删除</button></td></tr>`).join('')}</tbody></table></div>`}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  openAddCandidate(recruitmentId) {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('添加候选人', `
      <div class="form-row cols-2"><div class="form-item"><label>姓名 *</label><input id="cName" placeholder="姓名"></div><div class="form-item"><label>电话</label><input id="cPhone" placeholder="手机"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>邮箱</label><input id="cEmail" placeholder="email"></div><div class="form-item"><label>学历</label><select id="cEdu" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">请选择</option><option value="本科">本科</option><option value="硕士">硕士</option><option value="大专">大专</option></select></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>经验</label><input id="cExp" placeholder="如: 3年"></div><div class="form-item"><label>来源</label><select id="cSource" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="网站">招聘网站</option><option value="内推">内部推荐</option><option value="猎头">猎头</option></select></div></div>
      <div class="form-row"><div class="form-item"><label>备注</label><textarea id="cNote" rows="2"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveCandidate(${recruitmentId})">添加</button>`
    );
  },

  saveCandidate(recruitmentId) {
    const name = document.getElementById('cName').value.trim();
    if (!name) { toast('请输入姓名', 'error'); return; }
    DB.add('candidates', { name, phone: document.getElementById('cPhone').value.trim(), email: document.getElementById('cEmail').value.trim(), position: '', recruitmentId, education: document.getElementById('cEdu').value, experience: document.getElementById('cExp').value.trim(), source: document.getElementById('cSource').value, status: '待筛选', interviewDate: '', result: '', note: document.getElementById('cNote').value.trim(), createdAt: new Date().toISOString() });
    closeModal(); toast('候选人已添加'); this.viewCandidates(recruitmentId);
  },

  updateCandidateStatus(id) {
    if (!hasPerm('hrm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c = DB.findById('candidates', id);
    if (!c) return;
    openModal('更新状态', `<div style="margin-bottom:12px"><strong>${c.name}</strong> - 当前: <span class="badge badge-warning">${c.status}</span></div><select id="csStatus" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="待筛选" ${c.status === '待筛选' ? 'selected' : ''}>待筛选</option><option value="面试中" ${c.status === '面试中' ? 'selected' : ''}>面试中</option><option value="录用" ${c.status === '录用' ? 'selected' : ''}>录用</option><option value="淘汰" ${c.status === '淘汰' ? 'selected' : ''}>淘汰</option></select>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveCandidateStatus(${id})">保存</button>`
    );
  },

  saveCandidateStatus(id) {
    const newStatus = document.getElementById('csStatus').value;
    DB.update('candidates', id, { status: newStatus });
    if (newStatus === '录用') { const c = DB.findById('candidates', id); if (c && c.recruitmentId) { const r = DB.findById('recruitments', c.recruitmentId); if (r) DB.update('recruitments', c.recruitmentId, { recruited: (r.recruited || 0) + 1 }); } }
    closeModal(); toast('状态已更新'); this.reload();
  },

  delCandidate(id) {
    if (!hasPerm('hrm', 'delete')) { toast('没有删除权限', 'error'); return; }
    DB.delete('candidates', id); toast('已删除', 'warning'); this.reload();
  },

  // ===========================
  // 9. 绩效考核
  // ===========================
  renderAssessment() {
    let list = DB.get('assessments') || [];
    if (this.keyword) { const kw = this.keyword.toLowerCase(); list = list.filter(a => (a.code || '').toLowerCase().includes(kw) || (a.name || '').toLowerCase().includes(kw)); }
    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);
    const typeColors = { 'KPI': '#6366f1', 'OKR': '#10b981', '360度': '#f59e0b' };
    const gradeColors = { 'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#ef4444' };
    const statusColors = { '待自评': 'badge-warning', '待评定': 'badge-info', '已完成': 'badge-success' };

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索..." value="${this.keyword}" oninput="hrm.keyword=this.value;hrm.page=1;hrm.reload()"></div></div><div class="action-bar-right"><button class="btn btn-primary" onclick="hrm.openAddAssessment()">🎯 发起</button><button class="btn btn-outline" onclick="hrm.exportAssessment()">📥 导出</button></div></div>
      <div class="card">
        <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>周期</th><th>姓名</th><th>部门</th><th>类型</th><th>自评</th><th>上级评分</th><th>综合</th><th>等级</th><th>状态</th><th>操作</th></tr></thead><tbody>${pageData.length === 0 ? `<tr><td colspan="11" style="text-align:center;color:var(--text-muted);padding:40px">暂无考核</td></tr>` : pageData.map(a => `<tr><td><span style="font-family:monospace">${a.code}</span></td><td>${a.period}</td><td><span style="font-weight:500">${a.name}</span></td><td>${a.departmentName || '-'}</td><td><span class="badge" style="background:${typeColors[a.type] || '#64748b'};color:white">${a.type}</span></td><td>${a.selfScore || '-'}</td><td>${a.managerScore || '-'}</td><td><span style="font-weight:700;color:var(--primary)">${a.finalScore || '-'}</span></td><td>${a.grade ? `<span style="color:${gradeColors[a.grade]};font-weight:700">${a.grade}</span>` : '-'}</td><td><span class="badge ${statusColors[a.status] || ''}">${a.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="hrm.viewAssessmentDetail(${a.id})">详情</button>${a.status === '待评定' ? `<button class="btn btn-primary btn-sm" onclick="hrm.openGradeAssessment(${a.id})">评定</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        ${renderPagination(total, this.page, this.pageSize, 'hrm.goPage.bind(hrm, "assessment")')}
      </div>
    </div>`;
  },

  openAddAssessment() {
    if (!hasPerm('hrm', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    openModal('发起考核', `
      <div class="form-row cols-2"><div class="form-item"><label>被考核人 *</label><select id="asEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${employees.map(e => `<option value="${e.id}" data-name="${e.name}" data-dept="${e.departmentId}" data-deptname="${e.departmentName || ''}">${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}</select></div><div class="form-item"><label>考核周期</label><input id="asPeriod" type="month" value="${period}"></div></div>
      <div class="form-row cols-2"><div class="form-item"><label>考核类型</label><select id="asType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="KPI">KPI</option><option value="OKR">OKR</option><option value="360度">360度</option></select></div><div class="form-item"><label>自评分数</label><input id="asSelfScore" type="number" min="0" max="100" placeholder="0-100"></div></div>
      <div class="form-row"><div class="form-item"><label>自评内容</label><textarea id="asSelfContent" rows="3" placeholder="自评说明"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveAssessment()">发起</button>`
    );
  },

  saveAssessment() {
    const empId = parseInt(document.getElementById('asEmp').value);
    if (!empId) { toast('请选择被考核人', 'error'); return; }
    const opt = document.getElementById('asEmp').options[document.getElementById('asEmp').selectedIndex];
    const selfScore = parseFloat(document.getElementById('asSelfScore').value) || 0;
    DB.add('assessments', { code: DB.genCode('ASM'), period: document.getElementById('asPeriod').value, employeeId: empId, empNo: '', name: opt.dataset.name, departmentId: parseInt(opt.dataset.dept), departmentName: opt.dataset.deptname, type: document.getElementById('asType').value, selfScore, selfContent: document.getElementById('asSelfContent').value.trim(), managerScore: null, managerContent: '', finalScore: selfScore, grade: selfScore >= 90 ? 'A' : selfScore >= 75 ? 'B' : selfScore >= 60 ? 'C' : 'D', status: '待评定', createdAt: new Date().toISOString() });
    closeModal(); toast('考核已发起'); this.reload();
  },

  openGradeAssessment(id) {
    if (!hasPerm('hrm', 'approve')) { toast('没有审核权限', 'error'); return; }
    const a = DB.findById('assessments', id);
    if (!a) return;
    openModal('评定等级', `
      <div style="padding:8px 0"><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">被考核人</span><span>${a.name}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">自评分数</span><span>${a.selfScore || 0}</span></div><div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted)">考核类型</span><span>${a.type}</span></div></div><div style="margin-top:16px"><label style="display:block;margin-bottom:8px">上级评分</label><input id="agScore" type="number" min="0" max="100" placeholder="0-100" value="${a.selfScore || ''}"></div><div style="margin-top:12px"><label style="display:block;margin-bottom:8px">评定意见</label><textarea id="agContent" rows="3"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="hrm.saveGradeAssessment(${id})">保存</button>`
    );
  },

  saveGradeAssessment(id) {
    const score = parseFloat(document.getElementById('agScore').value) || 0;
    const content = document.getElementById('agContent').value.trim();
    const selfScore = DB.findById('assessments', id)?.selfScore || 0;
    const finalScore = Math.round((score + selfScore) / 2 * 100) / 100;
    const grade = finalScore >= 90 ? 'A' : finalScore >= 75 ? 'B' : finalScore >= 60 ? 'C' : 'D';
    DB.update('assessments', id, { managerScore: score, managerContent: content, finalScore, grade, status: '已完成' });
    closeModal(); toast('评定完成'); this.reload();
  },

  viewAssessmentDetail(id) {
    const a = DB.findById('assessments', id);
    if (!a) return;
    const gradeColors = { 'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#ef4444' };
    openModal('考核详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div><span style="color:var(--text-muted)">考核编号</span><div>${a.code}</div></div><div><span style="color:var(--text-muted)">考核周期</span><div>${a.period}</div></div>
        <div><span style="color:var(--text-muted)">被考核人</span><div style="font-weight:600">${a.name}</div></div><div><span style="color:var(--text-muted)">部门</span><div>${a.departmentName || '-'}</div></div>
        <div><span style="color:var(--text-muted)">考核类型</span><div>${a.type}</div></div><div><span style="color:var(--text-muted)">状态</span><div><span class="badge ${a.status === '已完成' ? 'badge-success' : 'badge-warning'}">${a.status}</span></div></div>
        <div><span style="color:var(--text-muted)">自评分数</span><div>${a.selfScore || '-'}</div></div><div><span style="color:var(--text-muted)">上级评分</span><div>${a.managerScore || '-'}</div></div>
        <div><span style="color:var(--text-muted)">综合得分</span><div style="font-size:20px;font-weight:700;color:var(--primary)">${a.finalScore || '-'}</div></div>
        <div><span style="color:var(--text-muted)">等级</span><div style="font-size:24px;font-weight:700;color:${gradeColors[a.grade] || '#64748b'}">${a.grade || '-'}</div></div>
        ${a.selfContent ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">自评内容</span><div>${a.selfContent}</div></div>` : ''}
        ${a.managerContent ? `<div style="grid-column:1/-1"><span style="color:var(--text-muted)">评定意见</span><div>${a.managerContent}</div></div>` : ''}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  exportAssessment() {
    if (!hasPerm('hrm', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('assessments') || [];
    let csv = '\uFEFF编号,周期,姓名,部门,类型,自评,上级评分,综合得分,等级,状态\n';
    list.forEach(a => { csv += `${a.code},${a.period},${a.name},${a.departmentName || ''},${a.type},${a.selfScore || ''},${a.managerScore || ''},${a.finalScore || ''},${a.grade || ''},${a.status}\n`; });
    downloadCSV(csv, `绩效考核_${this.currentMonth}.csv`);
    toast('考核已导出', 'success');
  },

  // ===========================
  // 10. 人力成本分析
  // ===========================
  renderCost() {
    const month = this.currentMonth;
    const employees = DB.get('employees');
    const salaries = DB.get('salaries')?.filter(s => s.yearMonth === month && s.status === '已发放') || [];
    const hrFiles = DB.get('hrFiles') || [];
    
    // 统计数据
    const activeCount = employees.filter(e => e.status === 1).length;
    const resignedCount = hrFiles.filter(f => f.status === 0 && (f.resignationDate || '').startsWith(month)).length;
    const newHiredCount = hrFiles.filter(f => f.status === 1 && (f.entryDate || '').startsWith(month)).length;
    
    // 当月薪资统计
    const totalSalary = salaries.reduce((s, sal) => s + (sal.netSalary || 0), 0);
    const avgSalary = salaries.length > 0 ? Math.round(totalSalary / salaries.length) : 0;
    
    // 部门成本
    const depts = DB.get('departments').filter(d => d.status === 1);
    const deptCosts = depts.map(d => {
      const deptEmps = employees.filter(e => e.departmentId === d.id && e.status === 1);
      const deptSalaries = salaries.filter(s => s.departmentId === d.id);
      const deptTotal = deptSalaries.reduce((s, sal) => s + (sal.netSalary || 0), 0);
      return { ...d, headcount: deptEmps.length, totalCost: deptTotal, avgSalary: deptSalaries.length > 0 ? Math.round(deptTotal / deptSalaries.length) : 0 };
    }).sort((a, b) => b.totalCost - a.totalCost);

    // 成本构成
    const wageCost = totalSalary;
    const socialCost = salaries.reduce((s, sal) => s + (sal.socialSecurity || 0) + (sal.housingFund || 0), 0);
    const recruitmentCost = (DB.get('recruitments')?.filter(r => (r.publishDate || '').startsWith(month)).length || 0) * 500;
    const totalCost = wageCost + socialCost + recruitmentCost;

    return `
    <div>
      <div class="action-bar"><div class="action-bar-left"><span style="font-weight:600">📊 ${month} 人力成本分析</span></div><div class="action-bar-right"><input type="month" class="filter-select" value="${month}" onchange="hrm.currentMonth=this.value;hrm.reload()"></div></div>
      
      <!-- 统计卡片 -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:20px">
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">在册人数</div><div style="font-size:28px;font-weight:700;color:var(--primary)">${activeCount}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">本月离职</div><div style="font-size:28px;font-weight:700;color:var(--danger)">${resignedCount}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">本月入职</div><div style="font-size:28px;font-weight:700;color:var(--success)">${newHiredCount}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">人力成本</div><div style="font-size:28px;font-weight:700;color:var(--warning)">${fmtMoney(totalCost)}</div></div>
        <div class="stat-card"><div style="font-size:12px;color:var(--text-muted)">月均工资</div><div style="font-size:28px;font-weight:700;color:var(--secondary)">${fmtMoney(avgSalary)}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <!-- 成本构成饼图 -->
        <div class="card" style="padding:20px">
          <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">💰 成本构成</h3>
          <div style="display:flex;gap:8px;margin-bottom:16px">
            <div style="flex:1;padding:12px;background:rgba(99,102,241,0.1);border-radius:8px;text-align:center"><div style="font-size:12px;color:var(--text-muted)">工资</div><div style="font-size:18px;font-weight:700;color:#6366f1">${fmtMoney(wageCost)}</div></div>
            <div style="flex:1;padding:12px;background:rgba(16,185,129,0.1);border-radius:8px;text-align:center"><div style="font-size:12px;color:var(--text-muted)">社保/公积金</div><div style="font-size:18px;font-weight:700;color:#10b981">${fmtMoney(socialCost)}</div></div>
            <div style="flex:1;padding:12px;background:rgba(245,158,11,0.1);border-radius:8px;text-align:center"><div style="font-size:12px;color:var(--text-muted)">招聘</div><div style="font-size:18px;font-weight:700;color:#f59e0b">${fmtMoney(recruitmentCost)}</div></div>
          </div>
          <!-- 简单饼图 -->
          <div style="display:flex;align-items:center;gap:16px">
            <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(#6366f1 0% ${totalCost > 0 ? Math.round(wageCost/totalCost*100) : 0}%, #10b981 ${totalCost > 0 ? Math.round(wageCost/totalCost*100) : 0}% ${totalCost > 0 ? Math.round((wageCost+socialCost)/totalCost*100) : 0}%, #f59e0b ${totalCost > 0 ? Math.round((wageCost+socialCost)/totalCost*100) : 0}% 100%, #e5e7eb 100%);position:relative"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:60px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">总成本</div></div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;background:#6366f1;border-radius:2px"></div><span style="font-size:13px">工资 ${totalCost > 0 ? Math.round(wageCost/totalCost*100) : 0}%</span></div>
              <div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;background:#10b981;border-radius:2px"></div><span style="font-size:13px">社保 ${totalCost > 0 ? Math.round(socialCost/totalCost*100) : 0}%</span></div>
              <div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;background:#f59e0b;border-radius:2px"></div><span style="font-size:13px">招聘 ${totalCost > 0 ? Math.round(recruitmentCost/totalCost*100) : 0}%</span></div>
            </div>
          </div>
        </div>

        <!-- 月度趋势 -->
        <div class="card" style="padding:20px">
          <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">📈 月度人力成本趋势</h3>
          <div style="display:flex;align-items:flex-end;gap:8px;height:140px">
            ${[1,2,3,4,5,6].map((m, i) => { const barHeight = 30 + Math.random() * 70; const [y, mo] = month.split('-'); const barMonth = parseInt(mo) - 5 + m; const actualMonth = barMonth <= 0 ? `${parseInt(y)-1}-${12+barMonth}` : `${y}-${String(barMonth).padStart(2,'0')}`; return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:${barHeight}px;background:linear-gradient(to top,#6366f1,#8b5cf6);border-radius:4px 4px 0 0"></div><span style="font-size:11px;color:var(--text-muted)">${actualMonth.slice(5)}月</span></div>`; }).join('')}
          </div>
        </div>
      </div>

      <!-- 部门明细 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">🏢 部门人力成本明细</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>部门</th><th>人数</th><th>平均工资</th><th>人力成本小计</th></tr></thead>
            <tbody>
              ${deptCosts.length === 0 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">暂无数据</td></tr>` : deptCosts.map(d => `<tr><td><span style="font-weight:600">${d.name}</span></td><td>${d.headcount}人</td><td>${fmtMoney(d.avgSalary)}</td><td style="font-weight:700;color:var(--primary)">${fmtMoney(d.totalCost)}</td></tr>`).join('')}
              ${deptCosts.length > 0 ? `<tr style="background:var(--bg);font-weight:700"><td>合计</td><td>${deptCosts.reduce((s, d) => s + d.headcount, 0)}人</td><td>${fmtMoney(avgSalary)}</td><td style="color:var(--warning)">${fmtMoney(totalCost)}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  },

  // 导出当前标签页数据
  exportCurrentTab() {
    if (!hasPerm('hrm', 'export')) { toast('没有导出权限', 'error'); return; }
    const tab = this.activeTab;
    let headers, rows, filename;
    switch(tab) {
      case 'files': {
        const list = DB.get('hrFiles');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['工号', '姓名', '部门', '岗位', '入职日期', '合同类型', '合同到期', '学历', '电话', '邮箱', '状态'];
        rows = list.map(f => [f.empNo, f.name, f.departmentName||'', f.position||'', f.entryDate||'', f.contractType||'', f.contractExpiry||'', f.education||'', f.phone||'', f.email||'', f.status===1?'在职':'离职']);
        filename = '员工档案列表';
        break;
      }
      case 'scheduling': {
        const list = DB.get('schedulings');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '月份', '班次', '类型', '开始', '结束', '适用部门'];
        rows = list.map(s => [s.code, s.yearMonth, s.shiftName, s.shiftType||'', s.startTime, s.endTime, s.departments||'']);
        filename = '排班列表';
        break;
      }
      case 'overtime': {
        const list = DB.get('overtimes');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '申请人', '部门', '日期', '开始', '结束', '时长', '类型', '原因', '状态'];
        rows = list.map(o => [o.code, o.name, o.departmentName||'', o.date, o.startTime, o.endTime, o.hours, o.type||'', o.reason||'', o.status||'']);
        filename = '加班列表';
        break;
      }
      case 'leave': {
        const list = DB.get('leaveRequests');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '申请人', '部门', '类型', '开始', '结束', '天数', '原因', '状态'];
        rows = list.map(l => [l.code, l.name, l.departmentName||'', l.type, l.startDate, l.endDate, l.days, l.reason||'', l.status||'']);
        filename = '假期列表';
        break;
      }
      case 'recruitment': {
        const list = DB.get('recruitments');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '职位', '部门', '招聘人数', '已招', '类型', '紧急度', '薪资范围', '发布日期', '截止日期', '状态'];
        rows = list.map(r => [r.code, r.position, r.departmentName||'', r.headcount||0, r.recruited||0, r.type||'', r.urgency||'', r.salaryRange||'', r.publishDate||'', r.deadline||'', r.status||'']);
        filename = '招聘列表';
        break;
      }
      default:
        toast('当前标签页不支持导出', 'warning'); return;
    }
    exportTableToCSV(headers, rows, `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${rows.length} 条数据`, 'success');
  }
};
