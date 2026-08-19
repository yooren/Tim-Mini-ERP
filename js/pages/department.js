// ===========================
// 部门管理
// ===========================

const department = {
  keyword: '',
  activeTab: 'department', // department | employee | record | stats
  selectedDept: null,

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索..." value="${this.keyword}"
              oninput="department.keyword=this.value;department.reload()">
          </div>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="department.exportCurrentTab()">📥 导出</button>
          <button class="btn btn-primary" onclick="department.openAddDept()">+ 新增部门</button>
          <button class="btn btn-outline" onclick="department.openAddEmployee()">+ 新增员工</button>
        </div>
      </div>
      
      <!-- Tab切换 -->
      <div class="tab-bar" style="margin-bottom:20px">
        <button class="tab-btn ${this.activeTab === 'department' ? 'active' : ''}" onclick="department.switchTab('department')">
          🏢 部门管理
        </button>
        <button class="tab-btn ${this.activeTab === 'employee' ? 'active' : ''}" onclick="department.switchTab('employee')">
          👥 员工管理
        </button>
        <button class="tab-btn ${this.activeTab === 'record' ? 'active' : ''}" onclick="department.switchTab('record')">
          📋 领取记录
        </button>
        <button class="tab-btn ${this.activeTab === 'stats' ? 'active' : ''}" onclick="department.switchTab('stats')">
          📊 领取统计
        </button>
      </div>
      
      <div id="deptContent">${this.renderContent()}</div>
    </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.reload();
  },

  renderContent() {
    switch(this.activeTab) {
      case 'department': return this.renderDeptList();
      case 'employee': return this.renderEmployeeList();
      case 'record': return this.renderRecordList();
      case 'stats': return this.renderStats();
      default: return '';
    }
  },

  // ===== 部门列表 =====
  renderDeptList() {
    let list = DB.get('departments');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(kw) || (d.desc && d.desc.toLowerCase().includes(kw)));
    }
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-text">暂无部门</div></div>`;

    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">
      ${list.map(d => {
        const employees = DB.get('employees').filter(e => e.departmentId === d.id);
        const activeCount = employees.filter(e => e.status === 1).length;
        return `
        <div class="card" style="padding:20px;cursor:pointer;border:2px solid ${d.status?'transparent':'#e5e7eb'}" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='${d.status?'transparent':'#e5e7eb'}'">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px">
                ${d.name.slice(0,1)}
              </div>
              <div>
                <div style="font-weight:700;font-size:14px">${d.name}</div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px">👥 ${activeCount}/${employees.length} 人</div>
              </div>
            </div>
            <span class="badge ${d.status?'badge-success':'badge-default'}">${d.status?'正常':'已停用'}</span>
          </div>
          <div style="font-size:13px;color:var(--text-muted);display:flex;flex-direction:column;gap:6px">
            ${d.manager ? `<div style="display:flex;gap:8px"><span>👤</span><span>负责人: ${d.manager}</span></div>` : ''}
            ${d.phone ? `<div style="display:flex;gap:8px"><span>📞</span><span>${d.phone}</span></div>` : ''}
            ${d.desc ? `<div style="display:flex;gap:8px"><span>📝</span><span style="flex:1">${d.desc}</span></div>` : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="department.openEditDept(${d.id})">✏️ 编辑</button>
            <button class="btn btn-outline btn-sm" style="flex:1" onclick="department.viewDeptEmployees(${d.id})">👥 员工</button>
            <button class="btn ${d.status?'btn-ghost':'btn-success'} btn-sm" onclick="department.toggleDeptStatus(${d.id},${d.status})">
              ${d.status?'⏸ 停用':'▶ 启用'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="department.delDept(${d.id})">🗑</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  },

  // ===== 员工列表 =====
  renderEmployeeList() {
    let list = DB.get('employees');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(kw) || (e.position && e.position.toLowerCase().includes(kw)));
    }
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">暂无员工</div></div>`;

    const depts = DB.get('departments');
    return `<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>所属部门</th>
            <th>职位</th>
            <th>联系电话</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(e => {
            const dept = depts.find(d => d.id === e.departmentId);
            return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:13px">
                    ${e.name.slice(0,1)}
                  </div>
                  <span style="font-weight:600">${e.name}</span>
                </div>
              </td>
              <td>${dept ? dept.name : '<span style="color:var(--text-muted)">未分配</span>'}</td>
              <td>${e.position || '-'}</td>
              <td>${e.phone || '-'}</td>
              <td><span class="badge ${e.status?'badge-success':'badge-default'}">${e.status?'在职':'离职'}</span></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="department.openEditEmployee(${e.id})">编辑</button>
                <button class="btn btn-primary btn-sm" onclick="department.openClaimRecord(${e.id})">领取</button>
                <button class="btn ${e.status?'btn-ghost':'btn-success'} btn-sm" onclick="department.toggleEmpStatus(${e.id},${e.status})">${e.status?'停用':'启用'}</button>
                <button class="btn btn-danger btn-sm" onclick="department.delEmployee(${e.id})">删除</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  // ===== 领取记录 =====
  renderRecordList() {
    let list = DB.get('claimRecords');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.employeeName && r.employeeName.toLowerCase().includes(kw)) ||
        (r.departmentName && r.departmentName.toLowerCase().includes(kw)) ||
        (r.goodsName && r.goodsName.toLowerCase().includes(kw))
      );
    }
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无领取记录</div></div>`;

    return `<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>领取日期</th>
            <th>员工姓名</th>
            <th>所属部门</th>
            <th>商品名称</th>
            <th>数量</th>
            <th>备注</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(r => `
            <tr>
              <td>${fmtDate(r.date)}</td>
              <td>${r.employeeName}</td>
              <td>${r.departmentName || '-'}</td>
              <td>${r.goodsName}</td>
              <td><span style="color:var(--primary);font-weight:600">${r.qty}</span> ${r.unit || ''}</td>
              <td>${r.note || '-'}</td>
              <td>
                <button class="btn btn-danger btn-sm" onclick="department.delRecord(${r.id})">删除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  },

  // ===== 领取统计 =====
  renderStats() {
    const employees = DB.get('employees');
    const records = DB.get('claimRecords');
    const departments = DB.get('departments');
    const goods = DB.get('goods');

    // 按员工统计
    const empStats = employees.filter(e => e.status === 1).map(e => {
      const empRecords = records.filter(r => r.employeeId === e.id);
      const totalQty = empRecords.reduce((s, r) => s + r.qty, 0);
      const totalAmount = empRecords.reduce((s, r) => s + (r.qty * (r.price || 0)), 0);
      const dept = departments.find(d => d.id === e.departmentId);
      return { ...e, deptName: dept ? dept.name : '未分配', recordCount: empRecords.length, totalQty, totalAmount };
    }).sort((a, b) => b.totalQty - a.totalQty);

    // 按部门统计
    const deptStats = departments.filter(d => d.status === 1).map(d => {
      const deptEmps = employees.filter(e => e.departmentId === d.id && e.status === 1);
      const deptRecords = records.filter(r => r.departmentId === d.id);
      const totalQty = deptRecords.reduce((s, r) => s + r.qty, 0);
      return { ...d, empCount: deptEmps.length, recordCount: deptRecords.length, totalQty };
    }).sort((a, b) => b.totalQty - a.totalQty);

    // 商品领取排行
    const goodsStats = {};
    records.forEach(r => {
      if (!goodsStats[r.goodsId]) {
        goodsStats[r.goodsId] = { goodsId: r.goodsId, goodsName: r.goodsName, totalQty: 0, claimCount: 0 };
      }
      goodsStats[r.goodsId].totalQty += r.qty;
      goodsStats[r.goodsId].claimCount++;
    });
    const goodsRanking = Object.values(goodsStats).sort((a, b) => b.totalQty - a.totalQty);

    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">👥</div>
        <div class="stat-content">
          <div class="stat-value">${employees.filter(e => e.status === 1).length}</div>
          <div class="stat-label">在职员工</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#10b981,#059669)">📋</div>
        <div class="stat-content">
          <div class="stat-value">${records.length}</div>
          <div class="stat-label">领取记录</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)">📦</div>
        <div class="stat-content">
          <div class="stat-value">${records.reduce((s, r) => s + r.qty, 0)}</div>
          <div class="stat-label">领取总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:linear-gradient(135deg,#ec4899,#db2777)">🏢</div>
        <div class="stat-content">
          <div class="stat-value">${departments.filter(d => d.status === 1).length}</div>
          <div class="stat-label">部门数量</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- 员工领取排行 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:16px;font-weight:600">🏆 员工领取排行</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>排名</th><th>员工</th><th>部门</th><th>次数</th><th>总数</th></tr>
            </thead>
            <tbody>
              ${empStats.slice(0, 10).map((e, i) => `
                <tr>
                  <td>${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</td>
                  <td style="font-weight:600">${e.name}</td>
                  <td style="font-size:12px;color:var(--text-muted)">${e.deptName}</td>
                  <td>${e.recordCount}</td>
                  <td style="color:var(--primary);font-weight:600">${e.totalQty}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 部门领取统计 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:16px;font-weight:600">🏢 部门领取统计</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>部门</th><th>员工</th><th>记录</th><th>总数</th></tr>
            </thead>
            <tbody>
              ${deptStats.map(d => `
                <tr>
                  <td style="font-weight:600">${d.name}</td>
                  <td>${d.empCount}人</td>
                  <td>${d.recordCount}</td>
                  <td style="color:var(--primary);font-weight:600">${d.totalQty}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 商品领取排行 -->
    <div class="card" style="padding:20px;margin-top:20px">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:600">📦 商品领取排行</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        ${goodsRanking.slice(0, 20).map((g, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--bg);border-radius:8px;min-width:200px">
            <span style="font-size:20px">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span>
            <div>
              <div style="font-weight:600;font-size:13px">${g.goodsName}</div>
              <div style="font-size:12px;color:var(--text-muted)">领取 ${g.claimCount} 次 · 共 ${g.totalQty} 件</div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  },

  reload() {
    const el = document.getElementById('deptContent');
    if (el) el.innerHTML = this.renderContent();
  },

  // ===== 部门操作 =====
  openAddDept() {
    if (!hasPerm('department', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新增部门', `
      <div class="form-row">
        <div class="form-item"><label>部门名称 *</label><input id="dName" placeholder="请输入部门名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>负责人</label><input id="dManager" placeholder="部门负责人姓名"></div>
        <div class="form-item"><label>联系电话</label><input id="dPhone" placeholder="部门电话"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>部门描述</label><textarea id="dDesc" rows="3" placeholder="部门职能简介"></textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="department.saveDept()">保存</button>`
    );
  },

  saveDept() {
    const name = document.getElementById('dName').value.trim();
    if (!name) { toast('请输入部门名称', 'error'); return; }
    
    DB.add('departments', {
      name,
      manager: document.getElementById('dManager').value.trim(),
      phone: document.getElementById('dPhone').value.trim(),
      desc: document.getElementById('dDesc').value.trim(),
      status: 1
    });
    
    closeModal();
    toast('部门添加成功！');
    this.reload();
  },

  openEditDept(id) {
    if (!hasPerm('department', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const d = DB.findById('departments', id);
    if (!d) return;

    openModal('编辑部门', `
      <div class="form-row">
        <div class="form-item"><label>部门名称</label><input id="deName" value="${d.name}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>负责人</label><input id="deManager" value="${d.manager || ''}"></div>
        <div class="form-item"><label>联系电话</label><input id="dePhone" value="${d.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>部门描述</label><textarea id="deDesc" rows="3">${d.desc || ''}</textarea></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="department.saveEditDept(${id})">保存修改</button>`
    );
  },

  saveEditDept(id) {
    DB.update('departments', id, {
      name: document.getElementById('deName').value.trim(),
      manager: document.getElementById('deManager').value.trim(),
      phone: document.getElementById('dePhone').value.trim(),
      desc: document.getElementById('deDesc').value.trim()
    });
    closeModal();
    toast('部门信息已更新！');
    this.reload();
  },

  toggleDeptStatus(id, status) {
    if (!hasPerm('department', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const d = DB.findById('departments', id);
    if (!d) return;
    const newStatus = status ? 0 : 1;
    DB.update('departments', id, { status: newStatus });
    toast(newStatus ? '部门已停用' : '部门已启用', newStatus ? 'warning' : 'success');
    this.reload();
  },

  delDept(id) {
    if (!hasPerm('department', 'delete')) { toast('没有删除权限', 'error'); return; }
    const d = DB.findById('departments', id);
    if (!d) return;
    const emps = DB.get('employees').filter(e => e.departmentId === id);
    
    openModal('确认删除',
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除部门「${d.name}」吗？</div>
        ${emps.length > 0 ? `<div style="font-size:13px;color:#ef4444;margin-top:8px;">注意：该部门下有 ${emps.length} 名员工</div>` : ''}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="department.confirmDelDept(${id})">确认删除</button>`
    );
  },

  confirmDelDept(id) {
    // 同时删除部门下的员工
    const emps = DB.get('employees').filter(e => e.departmentId === id);
    emps.forEach(e => DB.delete('employees', e.id));
    DB.delete('departments', id);
    closeModal();
    toast('部门已删除', 'warning');
    this.reload();
  },

  viewDeptEmployees(deptId) {
    this.selectedDept = deptId;
    this.switchTab('employee');
    setTimeout(() => {
      const input = document.getElementById('deptEmpSearch');
      if (input) {
        input.value = String(deptId);
        this.filterByDept(deptId);
      }
    }, 100);
  },

  filterByDept(deptId) {
    if (deptId) {
      const list = DB.get('employees').filter(e => e.departmentId === parseInt(deptId));
      const el = document.getElementById('deptContent');
      if (el) {
        const depts = DB.get('departments');
        const dept = depts.find(d => d.id === parseInt(deptId));
        el.innerHTML = `
          <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span style="font-weight:600;color:var(--primary)">🏢 ${dept ? dept.name : '部门'}</span>
            <span style="color:var(--text-muted)">共 ${list.length} 名员工</span>
            <button class="btn btn-ghost btn-sm" onclick="department.reload()">显示全部</button>
          </div>
          ${this.renderEmployeeTable(list, depts)}`;
      }
    }
  },

  renderEmployeeTable(list, depts) {
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">该部门暂无员工</div></div>`;
    return `<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr><th>姓名</th><th>职位</th><th>联系电话</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          ${list.map(e => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:13px">
                    ${e.name.slice(0,1)}
                  </div>
                  <span style="font-weight:600">${e.name}</span>
                </div>
              </td>
              <td>${e.position || '-'}</td>
              <td>${e.phone || '-'}</td>
              <td><span class="badge ${e.status?'badge-success':'badge-default'}">${e.status?'在职':'离职'}</span></td>
              <td>
                <button class="btn btn-outline btn-sm" onclick="department.openEditEmployee(${e.id})">编辑</button>
                <button class="btn btn-primary btn-sm" onclick="department.openClaimRecord(${e.id})">领取</button>
                <button class="btn btn-danger btn-sm" onclick="department.delEmployee(${e.id})">删除</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  },

  // ===== 员工操作 =====
  openAddEmployee() {
    if (!hasPerm('department', 'create')) { toast('没有新建权限', 'error'); return; }
    const depts = DB.get('departments').filter(d => d.status === 1);
    openModal('新增员工', `
      <div class="form-row cols-2">
        <div class="form-item"><label>姓名 *</label><input id="eName" placeholder="员工姓名"></div>
        <div class="form-item">
          <label>所属部门 *</label>
          <select id="eDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择部门</option>
            ${depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>职位</label><input id="ePosition" placeholder="如：经理、专员"></div>
        <div class="form-item"><label>联系电话</label><input id="ePhone" placeholder="手机号码"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>邮箱</label><input id="eEmail" type="email" placeholder="email@example.com"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="department.saveEmployee()">保存</button>`
    );
  },

  saveEmployee() {
    const name = document.getElementById('eName').value.trim();
    const departmentId = parseInt(document.getElementById('eDept').value);
    if (!name) { toast('请输入员工姓名', 'error'); return; }
    if (!departmentId) { toast('请选择所属部门', 'error'); return; }
    
    const dept = DB.findById('departments', departmentId);
    DB.add('employees', {
      name,
      departmentId,
      departmentName: dept ? dept.name : '',
      position: document.getElementById('ePosition').value.trim(),
      phone: document.getElementById('ePhone').value.trim(),
      email: document.getElementById('eEmail').value.trim(),
      status: 1
    });
    
    closeModal();
    toast('员工添加成功！');
    this.reload();
  },

  openEditEmployee(id) {
    if (!hasPerm('department', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const e = DB.findById('employees', id);
    if (!e) return;
    const depts = DB.get('departments').filter(d => d.status === 1);

    openModal('编辑员工', `
      <div class="form-row cols-2">
        <div class="form-item"><label>姓名</label><input id="eeName" value="${e.name}"></div>
        <div class="form-item">
          <label>所属部门</label>
          <select id="eeDept" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择部门</option>
            ${depts.map(d => `<option value="${d.id}" ${d.id === e.departmentId ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>职位</label><input id="eePosition" value="${e.position || ''}"></div>
        <div class="form-item"><label>联系电话</label><input id="eePhone" value="${e.phone || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>邮箱</label><input id="eeEmail" type="email" value="${e.email || ''}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="department.saveEditEmployee(${id})">保存修改</button>`
    );
  },

  saveEditEmployee(id) {
    const departmentId = parseInt(document.getElementById('eeDept').value);
    const dept = DB.findById('departments', departmentId);
    DB.update('employees', id, {
      name: document.getElementById('eeName').value.trim(),
      departmentId,
      departmentName: dept ? dept.name : '',
      position: document.getElementById('eePosition').value.trim(),
      phone: document.getElementById('eePhone').value.trim(),
      email: document.getElementById('eeEmail').value.trim()
    });
    closeModal();
    toast('员工信息已更新！');
    this.reload();
  },

  toggleEmpStatus(id, status) {
    if (!hasPerm('department', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const newStatus = status ? 0 : 1;
    DB.update('employees', id, { status: newStatus });
    toast(newStatus ? '员工已停用' : '员工已启用', newStatus ? 'warning' : 'success');
    this.reload();
  },

  delEmployee(id) {
    if (!hasPerm('department', 'delete')) { toast('没有删除权限', 'error'); return; }
    const e = DB.findById('employees', id);
    if (!e) return;

    openModal('确认删除',
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除员工「${e.name}」吗？</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="department.confirmDelEmployee(${id})">确认删除</button>`
    );
  },

  confirmDelEmployee(id) {
    DB.delete('employees', id);
    closeModal();
    toast('员工已删除', 'warning');
    this.reload();
  },

  // ===== 领取记录操作 =====
  openClaimRecord(employeeId) {
    if (!hasPerm('department', 'create')) { toast('没有新建权限', 'error'); return; }
    const employees = DB.get('employees').filter(e => e.status === 1);
    const goods = DB.get('goods').filter(g => g.status === 1);
    const selectedEmp = employeeId ? employees.find(e => e.id === employeeId) : null;
    
    openModal('办公用品领取', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>领取员工 *</label>
          <select id="crEmp" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择员工</option>
            ${employees.map(e => `<option value="${e.id}" ${selectedEmp && e.id === selectedEmp.id ? 'selected' : ''}>${e.name} - ${e.departmentName || '未分配'}</option>`).join('')}
          </select>
        </div>
        <div class="form-item">
          <label>领取商品 *</label>
          <select id="crGoods" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)" onchange="department.onGoodsSelect()">
            <option value="">请选择商品</option>
            ${goods.map(g => `<option value="${g.id}" data-price="${g.price}" data-unit="${g.unit}">${g.name} (库存: ${g.stock})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>领取数量 *</label>
          <input id="crQty" type="number" min="1" value="1" placeholder="请输入数量">
        </div>
        <div class="form-item">
          <label>单价</label>
          <input id="crPrice" type="number" step="0.01" placeholder="自动获取" readonly style="background:var(--bg)">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="crNote" placeholder="领取用途说明"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="department.saveClaimRecord()">确认领取</button>`
    );
  },

  onGoodsSelect() {
    const sel = document.getElementById('crGoods');
    const option = sel.options[sel.selectedIndex];
    if (option && option.value) {
      document.getElementById('crPrice').value = option.dataset.price || 0;
    }
  },

  saveClaimRecord() {
    const employeeId = parseInt(document.getElementById('crEmp').value);
    const goodsId = parseInt(document.getElementById('crGoods').value);
    const qty = parseInt(document.getElementById('crQty').value);
    
    if (!employeeId) { toast('请选择领取员工', 'error'); return; }
    if (!goodsId) { toast('请选择领取商品', 'error'); return; }
    if (!qty || qty < 1) { toast('请输入正确的领取数量', 'error'); return; }
    
    const employee = DB.findById('employees', employeeId);
    const goods = DB.findById('goods', goodsId);
    const price = parseFloat(document.getElementById('crPrice').value) || goods.price;
    
    // 检查库存
    if (goods.stock < qty) {
      toast(`库存不足！当前库存: ${goods.stock}`, 'error');
      return;
    }
    
    // 记录领取
    DB.add('claimRecords', {
      employeeId,
      employeeName: employee.name,
      departmentId: employee.departmentId,
      departmentName: employee.departmentName,
      goodsId,
      goodsName: goods.name,
      unit: goods.unit,
      qty,
      price,
      total: qty * price,
      note: document.getElementById('crNote').value.trim(),
      date: new Date().toISOString().slice(0, 10)
    });
    
    // 扣减库存
    DB.update('goods', goodsId, { stock: goods.stock - qty });
    
    closeModal();
    toast('领取成功！');
    updateWarningBadge();
    this.reload();
  },

  delRecord(id) {
    if (!hasPerm('department', 'delete')) { toast('没有删除权限', 'error'); return; }
    const r = DB.findById('claimRecords', id);
    if (!r) return;
    
    // 恢复库存
    const goods = DB.findById('goods', r.goodsId);
    if (goods) {
      DB.update('goods', r.goodsId, { stock: goods.stock + r.qty });
    }
    
    DB.delete('claimRecords', id);
    toast('记录已删除', 'warning');
    this.reload();
  },

  init() {},

  // 导出当前标签页数据
  exportCurrentTab() {
    if (!hasPerm('department', 'export')) { toast('没有导出权限', 'error'); return; }
    const tab = this.activeTab;
    if (tab === 'department' || tab === 'stats') {
      const list = DB.get('departments');
      if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
      const headers = ['部门名称', '负责人', '联系电话', '备注', '状态'];
      const rows = list.map(d => [d.name, d.manager||'', d.phone||'', d.desc||'', d.status?'启用':'停用']);
      exportTableToCSV(headers, rows, `部门列表_${new Date().toISOString().slice(0,10)}.csv`);
      toast(`已导出 ${list.length} 个部门`, 'success');
    } else if (tab === 'employee') {
      const list = DB.get('employees');
      if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
      const depts = DB.get('departments');
      const deptMap = {}; depts.forEach(d => { deptMap[d.id] = d.name; });
      const headers = ['姓名', '部门', '岗位', '电话', '邮箱', '入职日期', '状态'];
      const rows = list.map(e => [e.name, deptMap[e.departmentId]||e.departmentName||'', e.position||'', e.phone||'', e.email||'', e.entryDate||'', e.status===1?'在职':'离职']);
      exportTableToCSV(headers, rows, `员工列表_${new Date().toISOString().slice(0,10)}.csv`);
      toast(`已导出 ${list.length} 名员工`, 'success');
    } else {
      toast('当前标签页不支持导出', 'warning');
    }
  }
};
