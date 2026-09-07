// ===========================
// 车间管理 MES
// ===========================

const mes = {
  page: 1,
  pageSize: 12,
  keyword: '',
  activeTab: 'order', // order | process | report | equipment | tool

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <button class="btn ${this.activeTab === 'order' ? 'btn-primary' : 'btn-ghost'}" onclick="mes.activeTab='order';mes.reload()">📋 生产工单</button>
        <button class="btn ${this.activeTab === 'process' ? 'btn-primary' : 'btn-ghost'}" onclick="mes.activeTab='process';mes.reload()">🔧 工序管理</button>
        <button class="btn ${this.activeTab === 'report' ? 'btn-primary' : 'btn-ghost'}" onclick="mes.activeTab='report';mes.reload()">📝 报工记录</button>
        <button class="btn ${this.activeTab === 'equipment' ? 'btn-primary' : 'btn-ghost'}" onclick="mes.activeTab='equipment';mes.reload()">🏭 设备</button>
        <button class="btn ${this.activeTab === 'tool' ? 'btn-primary' : 'btn-ghost'}" onclick="mes.activeTab='tool';mes.reload()">🔩 工装模具</button>
      </div>
      <div id="mesContent">${this.renderTab()}</div>
    </div>`;
  },

  renderTab() {
    if (this.activeTab === 'order') return this.renderOrders();
    if (this.activeTab === 'process') return this.renderProcesses();
    if (this.activeTab === 'report') return this.renderReports();
    if (this.activeTab === 'equipment') return this.renderEquipment();
    return this.renderTools();
  },

  reload() {
    const content = document.getElementById('mesContent');
    if (content) content.innerHTML = this.renderTab();
  },

  // ========== 生产工单 ==========
  renderOrders() {
    let list = DB.get('productionOrders').filter(o => o.status === '生产中' || o.status === '已完成');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.orderNo || '').toLowerCase().includes(kw) || 
        (r.bomName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.orderNo || '').localeCompare(a.orderNo || ''));

    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无进行中的工单</div></div>`;

    return `
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>工单号</th><th>产品</th><th>计划/完成</th><th>车间</th><th>工序进度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const processes = DB.get('orderProcesses').filter(p => p.orderId === r.id);
            const completedProc = processes.filter(p => p.status === '已完成').length;
            const progress = processes.length > 0 ? Math.round(completedProc / processes.length * 100) : 0;
            const badge = r.status === '已完成' ? 'badge-success' : 'badge-primary';
            return `<tr>
              <td><span style="color:var(--primary)">${r.orderNo}</span></td>
              <td><strong>${r.bomName}</strong></td>
              <td>${r.qty} / ${r.completedQty || 0}</td>
              <td>${r.workshop || '-'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:80px;height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
                    <div style="width:${progress}%;height:100%;background:var(--primary)"></div>
                  </div>
                  <span style="font-size:11px">${completedProc}/${processes.length}工序</span>
                </div>
              </td>
              <td><span class="badge ${badge}">${r.status}</span></td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="mes.viewOrderProcess(${r.id})">查看工序</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  viewOrderProcess(orderId) {
    const order = DB.findById('productionOrders', orderId);
    if (!order) return;

    let processes = DB.get('orderProcesses').filter(p => p.orderId === orderId);
    if (!processes.length) {
      // 自动创建工序
      const allProcesses = DB.get('processes');
      processes = allProcesses.map((p, idx) => {
        const id = DB.nextId('orderProcesses');
        const op = {
          id, orderId, orderNo: order.orderNo,
          processId: p.id, processName: p.name,
          sequence: idx + 1,
          planQty: order.qty, completedQty: 0,
          status: '待生产',
          startTime: null, endTime: null,
          operator: '',
          createdAt: new Date().toISOString().slice(0, 10)
        };
        DB.add('orderProcesses', op);
        return op;
      });
    }

    openModal('工单工序 - ' + order.orderNo, `
      <div style="margin-bottom:16px">
        <div style="font-size:13px">产品：<strong>${order.bomName}</strong> | 数量：${order.qty} | 车间：${order.workshop}</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>序号</th><th>工序</th><th>计划数</th><th>完成数</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${processes.map(p => {
            const statusBadge = p.status === '已完成' ? 'badge-success' : p.status === '生产中' ? 'badge-primary' : 'badge-warning';
            return `<tr>
              <td>${p.sequence}</td>
              <td><strong>${p.processName}</strong></td>
              <td>${p.planQty}</td>
              <td>${p.completedQty}</td>
              <td><span class="badge ${statusBadge}">${p.status}</span></td>
              <td>
                ${p.status !== '已完成' ? `<button class="btn btn-primary btn-sm" onclick="mes.reportWork(${p.id})">报工</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  reportWork(orderProcessId) {
    if (!hasPerm('mes', 'create')) { toast('没有新建权限', 'error'); return; }
    const op = DB.findById('orderProcesses', orderProcessId);
    if (!op) return;
    const today = new Date().toISOString().slice(0, 10);

    openModal('工序报工 - ' + op.processName, `
      <div style="background:var(--primary-light);border-radius:8px;padding:12px;margin-bottom:16px">
        工单：${op.orderNo} | 工序：${op.processName} | 待完成：${op.planQty - op.completedQty}
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合格数量 *</label><input id="rwQualified" type="number" min="0" value="${op.planQty - op.completedQty}"></div>
        <div class="form-item"><label>不良数量</label><input id="rwScrap" type="number" min="0" value="0"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>报工时间</label><input id="rwTime" type="datetime-local" value="${today}T${new Date().toTimeString().slice(0,5)}"></div>
        <div class="form-item"><label>操作员</label><input id="rwOperator" value="${currentUser.username}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="rwNote" placeholder="报工说明"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="mes.saveReport(${orderProcessId})">提交报工</button>`
    );
  },

  saveReport(orderProcessId) {
    const op = DB.findById('orderProcesses', orderProcessId);
    if (!op) return;

    const qualified = +document.getElementById('rwQualified').value || 0;
    const scrap = +document.getElementById('rwScrap').value || 0;
    const reportQty = qualified + scrap;
    const newCompleted = Math.min(op.planQty, op.completedQty + qualified);

    // 更新工序
    DB.update('orderProcesses', orderProcessId, {
      completedQty: newCompleted,
      status: newCompleted >= op.planQty ? '已完成' : '生产中',
      endTime: newCompleted >= op.planQty ? document.getElementById('rwTime').value : null
    });

    // 添加报工记录
    DB.add('workReports', {
      orderId: op.orderId, orderNo: op.orderNo,
      processId: op.processId, processName: op.processName,
      reportQty: reportQty, qualifiedQty: qualified, scrapQty: scrap,
      reportTime: document.getElementById('rwTime').value,
      operator: document.getElementById('rwOperator').value,
      status: '已审核',
      note: document.getElementById('rwNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    // 更新工单完成数：取"最后一道工序"的完成数，代表已走完全部工序的成品数量，
    // 不能把各工序的 completedQty 直接相加（同一件产品会依次经过多道工序，相加会重复计数）
    const order = DB.findById('productionOrders', op.orderId);
    if (order) {
      const orderProcesses = DB.get('orderProcesses').filter(p => p.orderId === op.orderId);
      const maxSeq = Math.max(...orderProcesses.map(p => p.sequence || 0));
      const finalStage = orderProcesses.find(p => (p.sequence || 0) === maxSeq);
      DB.update('productionOrders', op.orderId, { completedQty: finalStage ? finalStage.completedQty : 0 });
    }

    toast('报工成功', 'success');
    closeModal();
    this.reload();
  },

  // ========== 工序管理 ==========
  renderProcesses() {
    let list = DB.get('processes');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.processNo || '').toLowerCase().includes(kw)
      );
    }

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索工序..." value="${this.keyword}"
            oninput="mes.keyword=this.value;mes.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="mes.openAddProcess()">+ 新建工序</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>工序编码</th><th>工序名称</th><th>顺序</th><th>工作中心</th><th>标准工时</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => `<tr>
            <td><span style="color:var(--primary)">${r.processNo}</span></td>
            <td><strong>${r.name}</strong></td>
            <td>${r.sequence}</td>
            <td>${r.workCenter || '-'}</td>
            <td>${r.stdTime} ${r.unit}</td>
            <td><span class="badge ${r.status === 1 ? 'badge-success' : 'badge-default'}">${r.status === 1 ? '启用' : '禁用'}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="mes.editProcess(${r.id})">编辑</button>
                <button class="btn btn-ghost btn-sm" onclick="mes.toggleProcess(${r.id})">${r.status === 1 ? '禁用' : '启用'}</button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  openAddProcess() {
    if (!hasPerm('mes', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('PRC');
    openModal('新建工序', `
      <div class="form-row cols-2">
        <div class="form-item"><label>工序编码</label><input id="procCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>工序名称 *</label><input id="procName" placeholder="如：组装"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>顺序</label><input id="procSeq" type="number" value="1"></div>
        <div class="form-item"><label>标准工时</label><input id="procStdTime" type="number" value="30"></div>
        <div class="form-item"><label>单位</label><input id="procUnit" value="分钟/件"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>车间</label><input id="procWorkshop" placeholder="如：组装车间A"></div>
        <div class="form-item"><label>工作中心</label><input id="procWorkCenter" placeholder="如：组装线1"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="mes.saveProcess()">保存</button>`
    );
  },

  saveProcess() {
    const name = document.getElementById('procName').value.trim();
    if (!name) { toast('请输入工序名称', 'error'); return; }

    DB.add('processes', {
      processNo: document.getElementById('procCode').value,
      name, sequence: +document.getElementById('procSeq').value || 1,
      workshop: document.getElementById('procWorkshop').value,
      workCenter: document.getElementById('procWorkCenter').value,
      stdTime: +document.getElementById('procStdTime').value || 30,
      unit: document.getElementById('procUnit').value,
      status: 1,
      createdAt: new Date().toISOString().slice(0, 10)
    });
    toast('工序已创建', 'success');
    closeModal();
    this.reload();
  },

  editProcess(id) {
    if (!hasPerm('mes', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('processes', id);
    if (!r) return;
    this.editingId = id;
    openModal('编辑工序', `
      <div class="form-row cols-2">
        <div class="form-item"><label>工序编码</label><input value="${r.processNo}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>工序名称 *</label><input id="procEditName" value="${r.name}"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>顺序</label><input id="procEditSeq" type="number" value="${r.sequence}"></div>
        <div class="form-item"><label>标准工时</label><input id="procEditStdTime" type="number" value="${r.stdTime}"></div>
        <div class="form-item"><label>单位</label><input id="procEditUnit" value="${r.unit}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>车间</label><input id="procEditWorkshop" value="${r.workshop || ''}"></div>
        <div class="form-item"><label>工作中心</label><input id="procEditWorkCenter" value="${r.workCenter || ''}"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="mes.saveEditProcess()">保存</button>`
    );
  },

  saveEditProcess() {
    const name = document.getElementById('procEditName').value.trim();
    if (!name) { toast('请输入工序名称', 'error'); return; }
    DB.update('processes', this.editingId, {
      name, sequence: +document.getElementById('procEditSeq').value || 1,
      stdTime: +document.getElementById('procEditStdTime').value || 30,
      unit: document.getElementById('procEditUnit').value,
      workshop: document.getElementById('procEditWorkshop').value,
      workCenter: document.getElementById('procEditWorkCenter').value
    });
    toast('工序已更新', 'success');
    this.editingId = null;
    closeModal();
    this.reload();
  },

  toggleProcess(id) {
    if (!hasPerm('mes', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('processes', id);
    if (!r) return;
    DB.update('processes', id, { status: r.status === 1 ? 0 : 1 });
    this.reload();
  },

  // ========== 报工记录 ==========
  renderReports() {
    let list = DB.get('workReports');
    list = list.sort((a, b) => (b.reportTime || '').localeCompare(a.reportTime || ''));

    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无报工记录</div></div>`;

    return `
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>工单号</th><th>工序</th><th>合格数量</th><th>不良数量</th><th>报工时间</th><th>操作员</th><th>状态</th></tr></thead>
        <tbody>
          ${list.map(r => `<tr>
            <td><span style="color:var(--primary)">${r.orderNo}</span></td>
            <td><strong>${r.processName}</strong></td>
            <td style="color:var(--success)">${r.qualifiedQty}</td>
            <td style="color:${r.scrapQty > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${r.scrapQty || 0}</td>
            <td>${r.reportTime ? r.reportTime.slice(0, 16) : '-'}</td>
            <td>${r.operator}</td>
            <td><span class="badge ${r.status === '已审核' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  // ========== 设备 ==========
  renderEquipment() {
    let list = DB.get('equipment');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.code || '').toLowerCase().includes(kw)
      );
    }

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索设备..." value="${this.keyword}"
            oninput="mes.keyword=this.value;mes.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="mes.openAddEquipment()">+ 添加设备</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>设备编码</th><th>设备名称</th><th>型号</th><th>位置</th><th>状态</th><th>下次保养</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const statusMap = { '运行中': 'badge-success', '维护中': 'badge-warning', '故障': 'badge-danger', '停用': 'badge-default' };
            const isUrgent = r.nextMaintenance && new Date(r.nextMaintenance) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td><strong>${r.name}</strong></td>
              <td>${r.model || '-'}</td>
              <td>${r.location || '-'}</td>
              <td><span class="badge ${statusMap[r.status] || 'badge-default'}">${r.status}</span></td>
              <td style="color:${isUrgent ? 'var(--danger)' : 'var(--text-muted)'}">${r.nextMaintenance || '-'} ${isUrgent ? '⚠️' : ''}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="mes.toggleEquipment(${r.id})">${r.status === '运行中' ? '停用' : '启用'}</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  openAddEquipment() {
    if (!hasPerm('mes', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('EQ');
    openModal('添加设备', `
      <div class="form-row cols-2">
        <div class="form-item"><label>设备编码</label><input id="eqCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>设备名称 *</label><input id="eqName" placeholder="设备名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>型号</label><input id="eqModel" placeholder="设备型号"></div>
        <div class="form-item"><label>厂商</label><input id="eqManufacturer" placeholder="生产厂家"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>购置日期</label><input id="eqPurchaseDate" type="date"></div>
        <div class="form-item"><label>保养周期(天)</label><input id="eqMaintenanceCycle" type="number" value="90"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>车间/位置</label><input id="eqLocation" placeholder="设备位置"></div>
        <div class="form-item"><label>状态</label>
          <select id="eqStatus">
            <option value="运行中">运行中</option>
            <option value="维护中">维护中</option>
            <option value="停用">停用</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="mes.saveEquipment()">保存</button>`
    );
  },

  saveEquipment() {
    const name = document.getElementById('eqName').value.trim();
    if (!name) { toast('请输入设备名称', 'error'); return; }

    const cycle = +document.getElementById('eqMaintenanceCycle').value || 90;
    const purchaseDate = document.getElementById('eqPurchaseDate').value;
    const nextMaintenance = purchaseDate ? new Date(new Date(purchaseDate).getTime() + cycle * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';

    DB.add('equipment', {
      code: document.getElementById('eqCode').value,
      name, model: document.getElementById('eqModel').value,
      manufacturer: document.getElementById('eqManufacturer').value,
      purchaseDate, nextMaintenance,
      maintenanceCycle: cycle,
      location: document.getElementById('eqLocation').value,
      status: document.getElementById('eqStatus').value,
      operator: '',
      createdAt: new Date().toISOString().slice(0, 10)
    });
    toast('设备已添加', 'success');
    closeModal();
    this.reload();
  },

  toggleEquipment(id) {
    if (!hasPerm('mes', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const r = DB.findById('equipment', id);
    if (!r) return;
    DB.update('equipment', id, { status: r.status === '运行中' ? '停用' : '运行中' });
    this.reload();
  },

  // ========== 工装模具 ==========
  renderTools() {
    let list = DB.get('tools');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.name || '').toLowerCase().includes(kw) || 
        (r.code || '').toLowerCase().includes(kw)
      );
    }

    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap">
          <span>🔍</span>
          <input type="text" placeholder="搜索..." value="${this.keyword}"
            oninput="mes.keyword=this.value;mes.reload()">
        </div>
      </div>
      <div class="action-bar-right">
        <button class="btn btn-primary" onclick="mes.openAddTool()">+ 添加模具</button>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap"><table>
        <thead><tr><th>编码</th><th>名称</th><th>类别</th><th>位置</th><th>已用次数</th><th>寿命</th><th>下次点检</th><th>状态</th></tr></thead>
        <tbody>
          ${list.map(r => {
            const usageRate = r.life ? Math.round((r.usedCount || 0) / r.life * 100) : 0;
            const isWarning = usageRate >= 80;
            return `<tr>
              <td><span style="color:var(--primary)">${r.code}</span></td>
              <td><strong>${r.name}</strong></td>
              <td>${r.category || '-'}</td>
              <td>${r.location || '-'}</td>
              <td>${r.usedCount || 0}</td>
              <td>${r.life || '-'}</td>
              <td style="color:${isWarning ? 'var(--danger)' : 'var(--text-muted)'}">${r.nextCheck || '-'}</td>
              <td><span class="badge ${r.status === '在用' ? 'badge-success' : 'badge-warning'}">${r.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  },

  openAddTool() {
    if (!hasPerm('mes', 'create')) { toast('没有新建权限', 'error'); return; }
    const code = DB.genCode('TL');
    openModal('添加模具', `
      <div class="form-row cols-2">
        <div class="form-item"><label>模具编码</label><input id="toolCode" value="${code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>名称 *</label><input id="toolName" placeholder="模具名称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>类别</label>
          <select id="toolCategory">
            <option value="装配治具">装配治具</option>
            <option value="检测治具">检测治具</option>
            <option value="成型模具">成型模具</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-item"><label>放置位置</label><input id="toolLocation" placeholder="存放位置"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>设计寿命(次)</label><input id="toolLife" type="number" value="10000"></div>
        <div class="form-item"><label>已用次数</label><input id="toolUsedCount" type="number" value="0"></div>
        <div class="form-item"><label>下次点检</label><input id="toolNextCheck" type="date"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="mes.saveTool()">保存</button>`
    );
  },

  saveTool() {
    const name = document.getElementById('toolName').value.trim();
    if (!name) { toast('请输入名称', 'error'); return; }

    DB.add('tools', {
      code: document.getElementById('toolCode').value,
      name,
      category: document.getElementById('toolCategory').value,
      location: document.getElementById('toolLocation').value,
      life: +document.getElementById('toolLife').value || 10000,
      usedCount: +document.getElementById('toolUsedCount').value || 0,
      nextCheck: document.getElementById('toolNextCheck').value,
      status: '在用',
      createdAt: new Date().toISOString().slice(0, 10)
    });
    toast('模具已添加', 'success');
    closeModal();
    this.reload();
  },

  init() {}
};
