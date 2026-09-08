// ===========================
// 客户关系管理 (CRM)
// ===========================

const crm = {
  activeTab: 'client',
  page: 1, pageSize: 10,
  keyword: '', levelFilter: '', stageFilter: '', typeFilter: '', statusFilter: '',

  init() {
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },
  render() {
    document.getElementById('breadcrumb').textContent = '客户关系管理';
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="tab-bar" style="margin-bottom:20px;flex-wrap:wrap;gap:4px">
        <button class="tab-btn ${this.activeTab === 'client' ? 'active' : ''}" onclick="crm.switchTab('client')">👤 客户档案</button>
        <button class="tab-btn ${this.activeTab === 'lead' ? 'active' : ''}" onclick="crm.switchTab('lead')">🎯 线索管理</button>
        <button class="tab-btn ${this.activeTab === 'opportunity' ? 'active' : ''}" onclick="crm.switchTab('opportunity')">💼 商机管理</button>
        <button class="tab-btn ${this.activeTab === 'followup' ? 'active' : ''}" onclick="crm.switchTab('followup')">📞 跟进记录</button>
        <button class="tab-btn ${this.activeTab === 'quote' ? 'active' : ''}" onclick="crm.switchTab('quote')">📄 报价管理</button>
        <button class="tab-btn ${this.activeTab === 'contract' ? 'active' : ''}" onclick="crm.switchTab('contract')">📝 合同管理</button>
        <button class="tab-btn ${this.activeTab === 'service' ? 'active' : ''}" onclick="crm.switchTab('service')">🔧 售后工单</button>
        <button class="tab-btn ${this.activeTab === 'campaign' ? 'active' : ''}" onclick="crm.switchTab('campaign')">📢 营销活动</button>
        <button class="tab-btn ${this.activeTab === 'member' ? 'active' : ''}" onclick="crm.switchTab('member')">⭐ 会员管理</button>
        <button class="tab-btn ${this.activeTab === 'analytics' ? 'active' : ''}" onclick="crm.switchTab('analytics')">📊 客户分析</button>
      </div>
      <div id="crmContent">${this.renderContent()}</div>
    </div>`;
  },

  switchTab(tab) { this.activeTab = tab; this.page = 1; this.keyword = ''; this.reload(); },

  renderContent() {
    switch(this.activeTab) {
      case 'client': return this.renderClientList();
      case 'lead': return this.renderLeadList();
      case 'opportunity': return this.renderOpportunityList();
      case 'followup': return this.renderFollowupList();
      case 'quote': return this.renderQuoteList();
      case 'contract': return this.renderContractList();
      case 'service': return this.renderServiceList();
      case 'campaign': return this.renderCampaignList();
      case 'member': return this.renderMemberList();
      case 'analytics': return this.renderAnalytics();
    }
    return '';
  },

  reload() { const el = document.getElementById('crmContent'); if (el) el.innerHTML = this.renderContent(); },
  goPage(page) { this.page = page; this.reload(); },

  // 工具方法
  getLevelColor(level) { const c={'A级':'#ef4444','B级':'#f97316','C级':'#22c55e'}; return c[level]||'#94a3b8'; },
  getStageColor(stage) { const c={'初步接触':'#94a3b8','需求确认':'#3b82f6','方案制定':'#eab308','商务谈判':'#f97316','合同签订':'#22c55e'}; return c[stage]||'#94a3b8'; },
  getStageProb(stage) { const p={'初步接触':10,'需求确认':30,'方案制定':50,'商务谈判':70,'合同签订':90}; return p[stage]||0; },
  getBadge(status, type) {
    const b={'client':{'正常':'badge-success','流失':'badge-danger','冻结':'badge-warning'},'lead':{'新建':'badge-default','跟进中':'badge-primary','已转化':'badge-success','已流失':'badge-danger'},'opportunity':{'进行中':'badge-primary','赢单':'badge-success','输单':'badge-danger'},'quote':{'草稿':'badge-default','已发送':'badge-primary','已确认':'badge-success','已失效':'badge-danger','已成交':'badge-warning'},'contract':{'草稿':'badge-default','执行中':'badge-primary','已完成':'badge-success','已终止':'badge-danger'},'service':{'待派单':'badge-warning','待处理':'badge-warning','处理中':'badge-primary','已完成':'badge-success','已关闭':'badge-default'},'campaign':{'策划中':'badge-default','进行中':'badge-primary','已结束':'badge-success','已归档':'badge-warning'},'member':{'正常':'badge-success','冻结':'badge-warning','注销':'badge-danger'}};
    return `<span class="badge ${(b[type]||{})[status]||'badge-default'}">${status}</span>`;
  },

  // ==================== 1. 客户档案 ====================
  renderClientList() {
    const clients = DB.get('crmClients');
    const now = new Date();
    const aCount=clients.filter(c=>c.level==='A级'&&c.status==='正常').length;
    const bCount=clients.filter(c=>c.level==='B级'&&c.status==='正常').length;
    const cCount=clients.filter(c=>c.level==='C级'&&c.status==='正常').length;
    const thisMonth=clients.filter(c=>c.createdAt&&new Date(c.createdAt).getFullYear()===now.getFullYear()&&new Date(c.createdAt).getMonth()===now.getMonth()).length;

    let list=clients;
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(c=>(c.name&&c.name.toLowerCase().includes(kw))||(c.code&&c.code.toLowerCase().includes(kw)));}
    if(this.levelFilter)list=list.filter(c=>c.level===this.levelFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px">
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)">⭐</div><div class="stat-content"><div class="stat-value">${aCount}</div><div class="stat-label">A级客户</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f97316,#ea580c)">⭐</div><div class="stat-content"><div class="stat-value">${bCount}</div><div class="stat-label">B级客户</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a)">⭐</div><div class="stat-content"><div class="stat-value">${cCount}</div><div class="stat-label">C级客户</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#3b82f6,#2563eb)">📈</div><div class="stat-content"><div class="stat-value">${thisMonth}</div><div class="stat-label">本月新增</div></div></div>
    </div>
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索客户..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.levelFilter=this.value;crm.page=1;crm.reload()"><option value="">全部等级</option><option value="A级" ${this.levelFilter==='A级'?'selected':''}>A级</option><option value="B级" ${this.levelFilter==='B级'?'selected':''}>B级</option><option value="C级" ${this.levelFilter==='C级'?'selected':''}>C级</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-outline" onclick="crm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="crm.openAddClient()">+ 新增客户</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>名称</th><th>类型</th><th>联系人</th><th>电话</th><th>行业</th><th>等级</th><th>经理</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(c=>`<tr><td><span style="font-weight:600">${c.code}</span></td><td>${c.name}</td><td>${c.type||'-'}</td><td>${c.contact||'-'}</td><td>${c.phone||'-'}</td><td>${c.industry||'-'}</td><td><span style="color:${this.getLevelColor(c.level)};font-weight:600">${c.level||'-'}</span></td><td>${c.owner||'-'}</td><td>${this.getBadge(c.status,'client')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewClientDetail(${c.id})">详情</button><button class="btn btn-outline btn-sm" onclick="crm.openEditClient(${c.id})">编辑</button><button class="btn btn-outline btn-sm" onclick="crm.changeClientLevel(${c.id})">评级</button>${c.status==='正常'?`<button class="btn btn-ghost btn-sm" onclick="crm.lostClient(${c.id})">流失</button>`:''}<button class="btn btn-danger btn-sm" onclick="crm.delClient(${c.id})">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">👤</div><div class="empty-state-text">暂无客户</div></div>`:''}`;
  },

  openAddClient() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新增客户',`<div class="form-row cols-2"><div class="form-item"><label>客户名称 *</label><input id="cName" placeholder="请输入"></div><div class="form-item"><label>客户类型</label><select id="cType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="企业客户">企业客户</option><option value="个人客户">个人客户</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>联系人</label><input id="cContact" placeholder="联系人"></div><div class="form-item"><label>电话</label><input id="cPhone" placeholder="电话"></div></div><div class="form-row cols-2"><div class="form-item"><label>邮箱</label><input id="cEmail" type="email" placeholder="邮箱"></div><div class="form-item"><label>行业</label><input id="cIndustry" placeholder="行业"></div></div><div class="form-row cols-2"><div class="form-item"><label>等级</label><select id="cLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="A级">A级</option><option value="B级" selected>B级</option><option value="C级">C级</option></select></div><div class="form-item"><label>来源</label><input id="cSource" placeholder="来源渠道"></div></div><div class="form-row cols-2"><div class="form-item"><label>经理</label><input id="cOwner" value="${currentUser.username}" placeholder="客户经理"></div><div class="form-item"><label>地址</label><input id="cAddress" placeholder="地址"></div></div><div class="form-row"><div class="form-item"><label>备注</label><textarea id="cNote" rows="2" placeholder="备注"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveClient()">保存</button>`);
  },

  saveClient() {
    const name=document.getElementById('cName').value.trim();
    if(!name){toast('请输入客户名称','error');return;}
    const code = DB.genCode('KH');
    DB.add('crmClients',{code,name,type:document.getElementById('cType').value,contact:document.getElementById('cContact').value.trim(),phone:document.getElementById('cPhone').value.trim(),email:document.getElementById('cEmail').value.trim(),industry:document.getElementById('cIndustry').value.trim(),level:document.getElementById('cLevel').value,source:document.getElementById('cSource').value.trim(),owner:document.getElementById('cOwner').value.trim(),address:document.getElementById('cAddress').value.trim(),note:document.getElementById('cNote').value.trim(),status:'正常',totalOrders:0,totalAmount:0,createdAt:new Date().toISOString()});
    audit.log('CRM','新增客户',code,`客户名称: ${name}`);
    closeModal();toast('客户添加成功！');this.reload();
  },

  openEditClient(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c=DB.findById('crmClients',id);if(!c)return;
    openModal('编辑客户',`<div class="form-row cols-2"><div class="form-item"><label>名称</label><input id="ceName" value="${c.name}"></div><div class="form-item"><label>类型</label><select id="ceType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="企业客户" ${c.type==='企业客户'?'selected':''}>企业客户</option><option value="个人客户" ${c.type==='个人客户'?'selected':''}>个人客户</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>联系人</label><input id="ceContact" value="${c.contact||''}"></div><div class="form-item"><label>电话</label><input id="cePhone" value="${c.phone||''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>邮箱</label><input id="ceEmail" value="${c.email||''}"></div><div class="form-item"><label>行业</label><input id="ceIndustry" value="${c.industry||''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>等级</label><select id="ceLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="A级" ${c.level==='A级'?'selected':''}>A级</option><option value="B级" ${c.level==='B级'?'selected':''}>B级</option><option value="C级" ${c.level==='C级'?'selected':''}>C级</option></select></div><div class="form-item"><label>来源</label><input id="ceSource" value="${c.source||''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>经理</label><input id="ceOwner" value="${c.owner||''}"></div><div class="form-item"><label>地址</label><input id="ceAddress" value="${c.address||''}"></div></div><div class="form-row"><div class="form-item"><label>备注</label><textarea id="ceNote" rows="2">${c.note||''}</textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveEditClient(${id})">保存</button>`);
  },

  saveEditClient(id) {
    DB.update('crmClients',id,{name:document.getElementById('ceName').value.trim(),type:document.getElementById('ceType').value,contact:document.getElementById('ceContact').value.trim(),phone:document.getElementById('cePhone').value.trim(),email:document.getElementById('ceEmail').value.trim(),industry:document.getElementById('ceIndustry').value.trim(),level:document.getElementById('ceLevel').value,source:document.getElementById('ceSource').value.trim(),owner:document.getElementById('ceOwner').value.trim(),address:document.getElementById('ceAddress').value.trim(),note:document.getElementById('ceNote').value.trim()});
    closeModal();toast('客户信息已更新！');this.reload();
  },

  viewClientDetail(id) {
    const c=DB.findById('crmClients',id);if(!c)return;
    const followups=DB.get('crmFollowUps').filter(f=>f.relatedType==='客户'&&f.relatedId===id);
    const quotes=DB.get('crmQuotes').filter(q=>q.customerId===id);
    const contracts=DB.get('crmContracts').filter(ct=>ct.customerId===id);
    openModal('客户详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${c.code}</div></div><div><label style="font-weight:600">名称</label><div>${c.name}</div></div><div><label style="font-weight:600">类型</label><div>${c.type||'-'}</div></div><div><label style="font-weight:600">等级</label><div style="color:${this.getLevelColor(c.level)};font-weight:600">${c.level||'-'}</div></div><div><label style="font-weight:600">联系人</label><div>${c.contact||'-'}</div></div><div><label style="font-weight:600">电话</label><div>${c.phone||'-'}</div></div><div><label style="font-weight:600">邮箱</label><div>${c.email||'-'}</div></div><div><label style="font-weight:600">行业</label><div>${c.industry||'-'}</div></div><div><label style="font-weight:600">来源</label><div>${c.source||'-'}</div></div><div><label style="font-weight:600">经理</label><div>${c.owner||'-'}</div></div></div><div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)"><label style="font-weight:600;display:block;margin-bottom:12px">📊 关联汇总</label><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px"><div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--primary)">${quotes.length}</div><div style="font-size:12px;color:var(--text-muted)">报价数</div></div><div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--success)">${contracts.length}</div><div style="font-size:12px;color:var(--text-muted)">合同数</div></div><div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--warning)">¥${(c.totalAmount||0).toLocaleString()}</div><div style="font-size:12px;color:var(--text-muted)">累计销售</div></div><div style="background:var(--bg);padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:var(--info)">${followups.length}</div><div style="font-size:12px;color:var(--text-muted)">跟进数</div></div></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="closeModal();crm.openAddFollowup('客户',${id},'${c.name}')">+ 添加跟进</button>`);
  },

  changeClientLevel(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c=DB.findById('crmClients',id);if(!c)return;
    openModal('调整评级',`<div style="text-align:center;padding:20px"><div style="margin-bottom:16px">当前：<span style="color:${this.getLevelColor(c.level)};font-weight:600">${c.level}</span></div><div class="form-item"><label>新等级</label><select id="newLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="A级" ${c.level==='A级'?'selected':''}>A级</option><option value="B级" ${c.level==='B级'?'selected':''}>B级</option><option value="C级" ${c.level==='C级'?'selected':''}>C级</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveClientLevel(${id})">确认</button>`);
  },

  saveClientLevel(id) {
    DB.update('crmClients',id,{level:document.getElementById('newLevel').value});
    closeModal();toast('评级已调整！');this.reload();
  },

  lostClient(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c=DB.findById('crmClients',id);if(!c)return;
    openModal('流失登记',`<div style="padding:16px"><div style="margin-bottom:16px">确定将「${c.name}」标记为流失？</div><div class="form-item"><label>原因</label><select id="lostReason" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="主动终止">主动终止</option><option value="竞争对手">竞争对手</option><option value="服务不满">服务不满</option><option value="长期无往来">长期无往来</option><option value="其他">其他</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="crm.confirmLostClient(${id})">确认</button>`);
  },

  confirmLostClient(id) {
    DB.update('crmClients',id,{status:'流失',lostReason:document.getElementById('lostReason').value,lostAt:new Date().toISOString()});
    closeModal();toast('已标记为流失','warning');this.reload();
  },

  delClient(id) {
    if (!hasPerm('crm', 'delete')) { toast('没有删除权限', 'error'); return; }
    const c=DB.findById('crmClients',id);if(!c)return;
    openModal('确认删除',`<div style="text-align:center;padding:24px"><div>确定删除「${c.name}」？</div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="DB.delete('crmClients',${id});closeModal();toast('已删除','warning');crm.reload()">确认</button>`);
  },

  // ==================== 2. 线索管理 ====================
  renderLeadList() {
    const leads=DB.get('crmLeads');
    let list=leads;
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(l=>(l.name&&l.name.toLowerCase().includes(kw))||(l.phone&&l.phone.toLowerCase().includes(kw)));}
    if(this.statusFilter)list=list.filter(l=>l.status===this.statusFilter);

    const funnel={'新建':list.filter(l=>l.status==='新建').length,'跟进中':list.filter(l=>l.status==='跟进中').length,'已转化':list.filter(l=>l.status==='已转化').length};
    const max=Math.max(...Object.values(funnel),1);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="font-weight:600;margin-bottom:12px">🎯 线索漏斗</div>
      <div style="display:flex;gap:8px;align-items:flex-end;height:50px">
        ${['新建','跟进中','已转化'].map(s=>{const w=(funnel[s]/max*100)||5;const cl={'新建':'#94a3b8','跟进中':'#3b82f6','已转化':'#22c55e'};return `<div style="flex:1;text-align:center"><div style="height:${w}px;background:${cl[s]};border-radius:4px 4px 0 0;min-height:6px"></div><div style="font-size:11px;margin-top:4px">${s}</div><div style="font-weight:600">${funnel[s]}</div></div>`;}).join('')}
      </div>
    </div>
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索线索..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.statusFilter=this.value;crm.page=1;crm.reload()"><option value="">全部</option><option value="新建" ${this.statusFilter==='新建'?'selected':''}>新建</option><option value="跟进中" ${this.statusFilter==='跟进中'?'selected':''}>跟进中</option><option value="已转化" ${this.statusFilter==='已转化'?'selected':''}>已转化</option><option value="已流失" ${this.statusFilter==='已流失'?'selected':''}>已流失</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-outline" onclick="crm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="crm.openAddLead()">+ 新建线索</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>姓名</th><th>电话</th><th>公司</th><th>职位</th><th>来源</th><th>意向度</th><th>负责人</th><th>跟进</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(l=>`<tr><td><span style="font-weight:600">${l.code}</span></td><td>${l.name}</td><td>${l.phone||'-'}</td><td>${l.company||'-'}</td><td>${l.position||'-'}</td><td>${l.source||'-'}</td><td>${l.level||'-'}</td><td>${l.owner||'-'}</td><td>${l.followCount||0}</td><td>${this.getBadge(l.status,'lead')}</td><td>${l.status!=='已转化'?`<button class="btn btn-outline btn-sm" onclick="crm.convertLead(${l.id})">转化</button>`:''}${l.status!=='已流失'?`<button class="btn btn-outline btn-sm" onclick="crm.lostLead(${l.id})">流失</button>`:''}<button class="btn btn-outline btn-sm" onclick="crm.openEditLead(${l.id})">编辑</button><button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmLeads',${l.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">暂无线索</div></div>`:''}`;
  },

  openAddLead() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('新建线索',`<div class="form-row cols-2"><div class="form-item"><label>姓名 *</label><input id="lName" placeholder="姓名"></div><div class="form-item"><label>性别</label><select id="lGender" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="男">男</option><option value="女">女</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>电话</label><input id="lPhone" placeholder="电话"></div><div class="form-item"><label>公司</label><input id="lCompany" placeholder="公司"></div></div><div class="form-row cols-2"><div class="form-item"><label>职位</label><input id="lPosition" placeholder="职位"></div><div class="form-item"><label>来源</label><select id="lSource" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="线上推广">线上推广</option><option value="展会">展会</option><option value="转介绍">转介绍</option><option value="陌拜">陌拜</option><option value="其他">其他</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>意向产品</label><input id="lInterest" placeholder="意向产品"></div><div class="form-item"><label>意向度</label><select id="lLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="高">高</option><option value="中">中</option><option value="低">低</option></select></div></div><div class="form-row"><div class="form-item"><label>分配销售</label><input id="lOwner" value="${currentUser.username}" placeholder="负责销售"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveLead()">保存</button>`);
  },

  saveLead() {
    const name=document.getElementById('lName').value.trim();
    if(!name){toast('请输入姓名','error');return;}
    DB.add('crmLeads',{code:DB.genCode('XS'),name,gender:document.getElementById('lGender').value,phone:document.getElementById('lPhone').value.trim(),company:document.getElementById('lCompany').value.trim(),position:document.getElementById('lPosition').value.trim(),source:document.getElementById('lSource').value,interestProduct:document.getElementById('lInterest').value.trim(),level:document.getElementById('lLevel').value,owner:document.getElementById('lOwner').value.trim(),followCount:0,status:'新建',createdAt:new Date().toISOString()});
    closeModal();toast('线索创建成功！');this.reload();
  },

  openEditLead(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const l=DB.findById('crmLeads',id);if(!l)return;
    openModal('编辑线索',`<div class="form-row cols-2"><div class="form-item"><label>姓名</label><input id="leName" value="${l.name}"></div><div class="form-item"><label>性别</label><select id="leGender" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="男" ${l.gender==='男'?'selected':''}>男</option><option value="女" ${l.gender==='女'?'selected':''}>女</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>电话</label><input id="lePhone" value="${l.phone||''}"></div><div class="form-item"><label>公司</label><input id="leCompany" value="${l.company||''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>职位</label><input id="lePosition" value="${l.position||''}"></div><div class="form-item"><label>意向度</label><select id="leLevel" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="高" ${l.level==='高'?'selected':''}>高</option><option value="中" ${l.level==='中'?'selected':''}>中</option><option value="低" ${l.level==='低'?'selected':''}>低</option></select></div></div><div class="form-row"><div class="form-item"><label>负责人</label><input id="leOwner" value="${l.owner||''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="DB.update('crmLeads',${id},{name:document.getElementById('leName').value.trim(),gender:document.getElementById('leGender').value,phone:document.getElementById('lePhone').value.trim(),company:document.getElementById('leCompany').value.trim(),position:document.getElementById('lePosition').value.trim(),level:document.getElementById('leLevel').value,owner:document.getElementById('leOwner').value.trim()});closeModal();toast('已更新！');crm.reload()">保存</button>`);
  },

  convertLead(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const l=DB.findById('crmLeads',id);if(!l)return;
    openModal('转化商机',`<div style="padding:16px"><div style="margin-bottom:16px">将「${l.name}」转化为商机</div><div class="form-item"><label>商机名称 *</label><input id="opName" value="${l.company||l.name}-商机"></div><div class="form-item"><label>预计金额</label><input id="opAmount" type="number" placeholder="金额"></div><div class="form-item"><label>预计成交日</label><input id="opDate" type="date"></div><div class="form-item"><label>负责人</label><input id="opOwner" value="${l.owner||currentUser.username}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveConvertLead(${id})">确认</button>`);
  },

  saveConvertLead(id) {
    const l=DB.findById('crmLeads',id);if(!l)return;
    const name=document.getElementById('opName').value.trim();
    if(!name){toast('请输入商机名称','error');return;}
    const opCode=DB.genCode('SJ');
    DB.add('crmOpportunities',{code:opCode,name,owner:document.getElementById('opOwner').value.trim(),stage:'初步接触',probability:10,amount:parseFloat(document.getElementById('opAmount').value)||0,expectedDate:document.getElementById('opDate').value,status:'进行中',createdAt:new Date().toISOString()});
    DB.update('crmLeads',id,{status:'已转化',convertedTo:opCode,convertedAt:new Date().toISOString()});
    audit.log('CRM','线索转化',l.code,`商机:${opCode}`);
    closeModal();toast('已转化为商机！');this.reload();
  },

  lostLead(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const l=DB.findById('crmLeads',id);if(!l)return;
    openModal('流失登记',`<div style="padding:16px"><div style="margin-bottom:16px">确定「${l.name}」流失？</div><div class="form-item"><label>原因</label><select id="llReason" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="无法联系">无法联系</option><option value="需求取消">需求取消</option><option value="选择竞争对手">选择竞争对手</option><option value="其他">其他</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="DB.update('crmLeads',${id},{status:'已流失',lostReason:document.getElementById('llReason').value,lostAt:new Date().toISOString()});closeModal();toast('已标记流失','warning');crm.reload()">确认</button>`);
  },

  // ==================== 3. 商机管理 ====================
  renderOpportunityList() {
    const ops=DB.get('crmOpportunities');
    let list=ops;
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(o=>(o.name&&o.name.toLowerCase().includes(kw))||(o.code&&o.code.toLowerCase().includes(kw)));}
    if(this.stageFilter)list=list.filter(o=>o.stage===this.stageFilter);

    const activeCount=list.filter(o=>o.status==='进行中').length;
    const totalAmount=list.filter(o=>o.status==='进行中').reduce((s,o)=>s+(o.amount||0),0);
    const now=new Date();
    const thisMonthWins=list.filter(o=>o.status==='赢单'&&o.winDate&&new Date(o.winDate).getMonth()===now.getMonth());
    const winAmount=thisMonthWins.reduce((s,o)=>s+(o.amount||0),0);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#3b82f6,#2563eb)">💼</div><div class="stat-content"><div class="stat-value">${activeCount}</div><div class="stat-label">进行中</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706)">💰</div><div class="stat-content"><div class="stat-value">¥${totalAmount.toLocaleString()}</div><div class="stat-label">预计金额</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a)">🏆</div><div class="stat-content"><div class="stat-value">${thisMonthWins.length}</div><div class="stat-label">本月赢单</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed)">📈</div><div class="stat-content"><div class="stat-value">¥${winAmount.toLocaleString()}</div><div class="stat-label">赢单金额</div></div></div>
    </div>
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索商机..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.stageFilter=this.value;crm.page=1;crm.reload()"><option value="">全部阶段</option><option value="初步接触" ${this.stageFilter==='初步接触'?'selected':''}>初步接触</option><option value="需求确认" ${this.stageFilter==='需求确认'?'selected':''}>需求确认</option><option value="方案制定" ${this.stageFilter==='方案制定'?'selected':''}>方案制定</option><option value="商务谈判" ${this.stageFilter==='商务谈判'?'selected':''}>商务谈判</option><option value="合同签订" ${this.stageFilter==='合同签订'?'selected':''}>合同签订</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-outline" onclick="crm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="crm.openAddOpportunity()">+ 新建商机</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>名称</th><th>客户</th><th>阶段</th><th>金额</th><th>概率</th><th>负责人</th><th>预计日</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(o=>`<tr><td><span style="font-weight:600">${o.code}</span></td><td>${o.name}</td><td>${o.customerName||'-'}</td><td><span style="padding:2px 8px;background:${this.getStageColor(o.stage)}22;color:${this.getStageColor(o.stage)};border-radius:4px;font-weight:600;font-size:12px">${o.stage}</span></td><td>¥${(o.amount||0).toLocaleString()}</td><td><span style="color:${o.probability>=70?'#22c55e':o.probability>=40?'#f59e0b':'#ef4444'};font-weight:600">${o.probability}%</span></td><td>${o.owner||'-'}</td><td>${o.expectedDate||'-'}</td><td>${this.getBadge(o.status,'opportunity')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.advanceStage(${o.id})">推进</button>${o.status==='进行中'?`<button class="btn btn-success btn-sm" onclick="crm.winOpportunity(${o.id})">赢单</button><button class="btn btn-danger btn-sm" onclick="crm.loseOpportunity(${o.id})">输单</button>`:''}<button class="btn btn-outline btn-sm" onclick="crm.openEditOpportunity(${o.id})">编辑</button><button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmOpportunities',${o.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">💼</div><div class="empty-state-text">暂无商机</div></div>`:''}`;
  },

  openAddOpportunity() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    const clients=DB.get('crmClients').filter(c=>c.status==='正常');
    openModal('新建商机',`<div class="form-row cols-2"><div class="form-item"><label>名称 *</label><input id="opName" placeholder="商机名称"></div><div class="form-item"><label>客户</label><select id="opCustomer" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">选择客户</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>负责人</label><input id="opOwner" value="${currentUser.username}"></div><div class="form-item"><label>阶段</label><select id="opStage" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)" onchange="document.getElementById('opProb').value=crm.getStageProb(this.value)"><option value="初步接触">初步接触</option><option value="需求确认">需求确认</option><option value="方案制定">方案制定</option><option value="商务谈判">商务谈判</option><option value="合同签订">合同签订</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>概率</label><input id="opProb" type="number" value="10"></div><div class="form-item"><label>金额</label><input id="opAmount" type="number" placeholder="金额"></div></div><div class="form-row cols-2"><div class="form-item"><label>预计日</label><input id="opDate" type="date"></div><div class="form-item"><label>竞争对手</label><input id="opCompetitor" placeholder="竞争对手"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveOpportunity()">保存</button>`);
  },

  saveOpportunity() {
    const name=document.getElementById('opName').value.trim();
    if(!name){toast('请输入名称','error');return;}
    const cid=parseInt(document.getElementById('opCustomer').value)||null;
    const customer=cid?DB.findById('crmClients',cid):null;
    DB.add('crmOpportunities',{code:DB.genCode('SJ'),name,customerId:cid,customerName:customer?.name||'',owner:document.getElementById('opOwner').value.trim(),stage:document.getElementById('opStage').value,probability:parseInt(document.getElementById('opProb').value)||10,amount:parseFloat(document.getElementById('opAmount').value)||0,expectedDate:document.getElementById('opDate').value,competitor:document.getElementById('opCompetitor').value.trim(),status:'进行中',createdAt:new Date().toISOString()});
    closeModal();toast('商机创建成功！');this.reload();
  },

  openEditOpportunity(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const o=DB.findById('crmOpportunities',id);if(!o)return;
    const clients=DB.get('crmClients').filter(c=>c.status==='正常');
    openModal('编辑商机',`<div class="form-row cols-2"><div class="form-item"><label>名称</label><input id="opeName" value="${o.name}"></div><div class="form-item"><label>客户</label><select id="opeCustomer" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">选择客户</option>${clients.map(c=>`<option value="${c.id}" ${o.customerId===c.id?'selected':''}>${c.name}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>负责人</label><input id="opeOwner" value="${o.owner||''}"></div><div class="form-item"><label>阶段</label><select id="opeStage" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="初步接触" ${o.stage==='初步接触'?'selected':''}>初步接触</option><option value="需求确认" ${o.stage==='需求确认'?'selected':''}>需求确认</option><option value="方案制定" ${o.stage==='方案制定'?'selected':''}>方案制定</option><option value="商务谈判" ${o.stage==='商务谈判'?'selected':''}>商务谈判</option><option value="合同签订" ${o.stage==='合同签订'?'selected':''}>合同签订</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>概率</label><input id="opeProb" type="number" value="${o.probability||10}"></div><div class="form-item"><label>金额</label><input id="opeAmount" type="number" value="${o.amount||0}"></div></div><div class="form-row cols-2"><div class="form-item"><label>预计日</label><input id="opeDate" type="date" value="${o.expectedDate||''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveEditOpportunity(${id})">保存</button>`);
  },

  saveEditOpportunity(id) {
    const cid=parseInt(document.getElementById('opeCustomer').value)||null;
    const customer=cid?DB.findById('crmClients',cid):null;
    DB.update('crmOpportunities',id,{name:document.getElementById('opeName').value.trim(),customerId:cid,customerName:customer?.name||'',owner:document.getElementById('opeOwner').value.trim(),stage:document.getElementById('opeStage').value,probability:parseInt(document.getElementById('opeProb').value)||10,amount:parseFloat(document.getElementById('opeAmount').value)||0,expectedDate:document.getElementById('opeDate').value});
    closeModal();toast('已更新！');this.reload();
  },

  advanceStage(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const o=DB.findById('crmOpportunities',id);if(!o)return;
    const stages=['初步接触','需求确认','方案制定','商务谈判','合同签订'];
    const idx=stages.indexOf(o.stage);
    if(idx<stages.length-1){const next=stages[idx+1];DB.update('crmOpportunities',id,{stage:next,probability:this.getStageProb(next)});toast(`已推进至「${next}」`);this.reload();}else{toast('已是最后阶段','warning');}
  },

  winOpportunity(id) {
    if (!hasPerm('crm', 'approve')) { toast('没有审核权限', 'error'); return; }
    const o=DB.findById('crmOpportunities',id);if(!o)return;
    DB.update('crmOpportunities',id,{status:'赢单',winDate:new Date().toISOString()});
    audit.log('CRM','商机赢单',o.code,`金额:¥${o.amount}`);
    toast('恭喜赢单！','success');this.reload();
  },

  loseOpportunity(id) {
    if (!hasPerm('crm', 'approve')) { toast('没有审核权限', 'error'); return; }
    const o=DB.findById('crmOpportunities',id);if(!o)return;
    openModal('输单登记',`<div style="padding:16px"><div style="margin-bottom:16px">确定「${o.name}」输单？</div><div class="form-item"><label>原因</label><select id="lossReason" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="价格因素">价格因素</option><option value="需求不符">需求不符</option><option value="竞争力不足">竞争力不足</option><option value="决策延迟">决策延迟</option><option value="其他">其他</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="DB.update('crmOpportunities',${id},{status:'输单',lossReason:document.getElementById('lossReason').value,lossDate:new Date().toISOString()});closeModal();toast('已标记输单','warning');crm.reload()">确认</button>`);
  },

  // ==================== 4. 跟进记录 ====================
  renderFollowupList() {
    let list=DB.get('crmFollowUps');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(f=>(f.content&&f.content.toLowerCase().includes(kw))||(f.relatedName&&f.relatedName.toLowerCase().includes(kw)));}
    if(this.typeFilter)list=list.filter(f=>f.relatedType===this.typeFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索跟进..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.typeFilter=this.value;crm.page=1;crm.reload()"><option value="">全部类型</option><option value="线索" ${this.typeFilter==='线索'?'selected':''}>线索</option><option value="商机" ${this.typeFilter==='商机'?'selected':''}>商机</option><option value="客户" ${this.typeFilter==='客户'?'selected':''}>客户</option><option value="合同" ${this.typeFilter==='合同'?'selected':''}>合同</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-primary" onclick="crm.openAddFollowup()">+ 新增跟进</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>类型</th><th>对象</th><th>方式</th><th>时间</th><th>跟进人</th><th>下次</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(f=>`<tr><td><span style="font-weight:600">${f.code}</span></td><td>${f.relatedType}</td><td>${f.relatedName||'-'}</td><td>${f.method||'-'}</td><td>${fmtDate(f.followTime)}</td><td>${f.follower}</td><td>${f.nextFollowTime?fmtDate(f.nextFollowTime):'-'}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewFollowupDetail(${f.id})">详情</button><button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmFollowUps',${f.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">📞</div><div class="empty-state-text">暂无跟进记录</div></div>`:''}`;
  },

  openAddFollowup(relatedType,relatedId,relatedName) {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    const types=[{v:'线索',l:DB.get('crmLeads').filter(l=>l.status!=='已流失')},{v:'商机',l:DB.get('crmOpportunities').filter(o=>o.status==='进行中')},{v:'客户',l:DB.get('crmClients').filter(c=>c.status==='正常')},{v:'合同',l:DB.get('crmContracts').filter(ct=>ct.status==='执行中')}];
    const selType=relatedType||'客户';
    openModal('新增跟进',`<div class="form-row cols-2"><div class="form-item"><label>类型</label><select id="fType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)" onchange="crm.changeFollowupType()">${types.map(t=>`<option value="${t.v}" ${t.v===selType?'selected':''}>${t.v}</option>`).join('')}</select></div><div class="form-item"><label>对象</label><select id="fRelated" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">${(types.find(t=>t.v===selType)||types[0]).l.map(item=>`<option value="${item.id}" ${item.id===relatedId?'selected':''}>${item.name||item.code}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>方式</label><select id="fMethod" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="电话">电话</option><option value="拜访">拜访</option><option value="邮件">邮件</option><option value="微信">微信</option><option value="其他">其他</option></select></div><div class="form-item"><label>时间</label><input id="fTime" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"></div></div><div class="form-row"><div class="form-item"><label>内容 *</label><textarea id="fContent" rows="3" placeholder="跟进内容..."></textarea></div></div><div class="form-row cols-2"><div class="form-item"><label>下次时间</label><input id="fNextTime" type="datetime-local"></div><div class="form-item"><label>下次目的</label><input id="fNextPurpose" placeholder="目的"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveFollowup()">保存</button>`);
  },

  changeFollowupType() {
    const type=document.getElementById('fType').value;
    const lists={'线索':DB.get('crmLeads').filter(l=>l.status!=='已流失'),'商机':DB.get('crmOpportunities').filter(o=>o.status==='进行中'),'客户':DB.get('crmClients').filter(c=>c.status==='正常'),'合同':DB.get('crmContracts').filter(ct=>ct.status==='执行中')};
    const list=lists[type]||[];
    document.getElementById('fRelated').innerHTML=list.map(item=>`<option value="${item.id}">${item.name||item.code}</option>`).join('');
  },

  saveFollowup() {
    const content=document.getElementById('fContent').value.trim();
    if(!content){toast('请输入内容','error');return;}
    const type=document.getElementById('fType').value;
    const relatedId=parseInt(document.getElementById('fRelated').value);
    const lists={'线索':DB.get('crmLeads'),'商机':DB.get('crmOpportunities'),'客户':DB.get('crmClients'),'合同':DB.get('crmContracts')};
    const related=lists[type]?.find(item=>item.id===relatedId);
    DB.add('crmFollowUps',{code:DB.genCode('GJ'),relatedType:type,relatedId,relatedName:related?.name||'',method:document.getElementById('fMethod').value,followTime:document.getElementById('fTime').value,follower:currentUser.username,content,nextFollowTime:document.getElementById('fNextTime').value,nextPurpose:document.getElementById('fNextPurpose').value.trim(),createdAt:new Date().toISOString()});
    if(type==='线索'&&related){DB.update('crmLeads',relatedId,{lastFollowTime:new Date().toISOString(),followCount:(related.followCount||0)+1});}
    else if(type==='商机'&&related){DB.update('crmOpportunities',relatedId,{lastFollowTime:new Date().toISOString()});}
    else if(type==='客户'&&related){DB.update('crmClients',relatedId,{lastFollowTime:new Date().toISOString()});}
    closeModal();toast('跟进已保存！');this.reload();
  },

  viewFollowupDetail(id) {
    const f=DB.findById('crmFollowUps',id);if(!f)return;
    openModal('跟进详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${f.code}</div></div><div><label style="font-weight:600">类型</label><div>${f.relatedType}</div></div><div><label style="font-weight:600">对象</label><div>${f.relatedName||'-'}</div></div><div><label style="font-weight:600">方式</label><div>${f.method||'-'}</div></div><div><label style="font-weight:600">时间</label><div>${fmtDate(f.followTime)}</div></div><div><label style="font-weight:600">跟进人</label><div>${f.follower}</div></div><div><label style="font-weight:600">下次</label><div>${f.nextFollowTime?fmtDate(f.nextFollowTime):'-'}</div></div></div><div style="padding:0 16px"><label style="font-weight:600">内容</label><div style="margin-top:8px;padding:12px;background:var(--bg);border-radius:8px">${f.content}</div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  // ==================== 5. 报价管理 ====================
  renderQuoteList() {
    let list=DB.get('crmQuotes');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(q=>(q.code&&q.code.toLowerCase().includes(kw))||(q.customerName&&q.customerName.toLowerCase().includes(kw)));}
    if(this.statusFilter)list=list.filter(q=>q.status===this.statusFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索报价..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.statusFilter=this.value;crm.page=1;crm.reload()"><option value="">全部状态</option><option value="草稿" ${this.statusFilter==='草稿'?'selected':''}>草稿</option><option value="已发送" ${this.statusFilter==='已发送'?'selected':''}>已发送</option><option value="已确认" ${this.statusFilter==='已确认'?'selected':''}>已确认</option><option value="已失效" ${this.statusFilter==='已失效'?'selected':''}>已失效</option><option value="已成交" ${this.statusFilter==='已成交'?'selected':''}>已成交</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-primary" onclick="crm.openAddQuote()">+ 创建报价</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>客户</th><th>金额</th><th>折后金额</th><th>有效期</th><th>报价人</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(q=>`<tr><td><span style="font-weight:600">${q.code}</span></td><td>${q.customerName||'-'}</td><td>¥${(q.amount||0).toLocaleString()}</td><td style="color:var(--primary);font-weight:600">¥${(q.finalAmount||0).toLocaleString()}</td><td>${q.validUntil||'-'}</td><td>${q.creator||'-'}</td><td>${this.getBadge(q.status,'quote')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewQuoteDetail(${q.id})">详情</button>${q.status==='草稿'?`<button class="btn btn-primary btn-sm" onclick="if(!hasPerm('crm','edit')){toast('没有编辑权限','error');}else{DB.update('crmQuotes',${q.id},{status:'已发送',sentAt:new Date().toISOString()});toast('已发送');crm.reload();}">发送</button>`:''}${q.status==='已确认'?`<button class="btn btn-success btn-sm" onclick="crm.convertToContract(${q.id})">转合同</button>`:''}<button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmQuotes',${q.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-text">暂无报价</div></div>`:''}`;
  },

  openAddQuote() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    const clients=DB.get('crmClients').filter(c=>c.status==='正常');
    const goods=DB.get('goods').filter(g=>g.status===1);
    openModal('创建报价',`<div class="form-row cols-2"><div class="form-item"><label>客户 *</label><select id="qCustomer" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">选择客户</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div><div class="form-item"><label>有效期</label><input id="qValid" type="date"></div></div><div style="margin:16px 0"><label style="font-weight:600;display:block;margin-bottom:8px">📦 产品</label><div id="quoteProducts"><div class="quote-product-row form-row cols-5" style="margin-bottom:8px"><div class="form-item"><select class="qGoods" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg)" onchange="const opt=this.options[this.selectedIndex];this.closest('.quote-product-row').querySelector('.qPrice').value=opt.dataset.price||0;crm.calcQuoteTotal()"><option value="">选择</option>${goods.map(g=>`<option value="${g.id}" data-price="${g.price||0}">${g.name}</option>`).join('')}</select></div><div class="form-item"><input type="number" class="qQty" value="1" min="1" onchange="crm.calcQuoteTotal()"></div><div class="form-item"><input type="number" class="qPrice" step="0.01" placeholder="单价"></div><div class="form-item"><input type="number" class="qDiscount" value="100" min="0" max="100" onchange="crm.calcQuoteTotal()"></div><div class="form-item"><input type="text" class="qSubtotal" readonly style="background:var(--bg)"></div></div></div><button class="btn btn-ghost btn-sm" onclick="crm.addQuoteProduct()">+ 添加</button></div><div class="form-row cols-3"><div class="form-item"><label>金额</label><input id="qAmount" type="number" readonly style="background:var(--bg)"></div><div class="form-item"><label>折扣%</label><input id="qDiscount" type="number" value="100" min="0" max="100" onchange="crm.calcQuoteTotal()"></div><div class="form-item"><label>折后</label><input id="qFinal" type="number" readonly style="background:var(--bg)"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveQuote()">保存</button>`);
  },

  addQuoteProduct() {
    const goods=DB.get('goods').filter(g=>g.status===1);
    document.getElementById('quoteProducts').insertAdjacentHTML('beforeend',`<div class="quote-product-row form-row cols-5" style="margin-bottom:8px"><div class="form-item"><select class="qGoods" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;background:var(--bg)" onchange="const opt=this.options[this.selectedIndex];this.closest('.quote-product-row').querySelector('.qPrice').value=opt.dataset.price||0;crm.calcQuoteTotal()"><option value="">选择</option>${goods.map(g=>`<option value="${g.id}" data-price="${g.price||0}">${g.name}</option>`).join('')}</select></div><div class="form-item"><input type="number" class="qQty" value="1" min="1" onchange="crm.calcQuoteTotal()"></div><div class="form-item"><input type="number" class="qPrice" step="0.01" placeholder="单价"></div><div class="form-item"><input type="number" class="qDiscount" value="100" min="0" max="100" onchange="crm.calcQuoteTotal()"></div><div class="form-item"><input type="text" class="qSubtotal" readonly style="background:var(--bg)"><button class="btn btn-danger btn-sm" onclick="this.closest('.quote-product-row').remove();crm.calcQuoteTotal()" style="margin-left:4px">×</button></div></div>`);
  },

  calcQuoteTotal() {
    let total=0;
    document.querySelectorAll('.quote-product-row').forEach(row=>{const qty=parseFloat(row.querySelector('.qQty').value)||0,price=parseFloat(row.querySelector('.qPrice').value)||0,discount=parseFloat(row.querySelector('.qDiscount').value)||100,subtotal=qty*price*discount/100;row.querySelector('.qSubtotal').value=subtotal.toFixed(2);total+=subtotal;});
    const disc=parseFloat(document.getElementById('qDiscount').value)||100;
    document.getElementById('qAmount').value=total.toFixed(2);
    document.getElementById('qFinal').value=(total*disc/100).toFixed(2);
  },

  saveQuote() {
    const customerId=parseInt(document.getElementById('qCustomer').value);
    if(!customerId){toast('请选择客户','error');return;}
    const customer=DB.findById('crmClients',customerId);
    const products=[];
    document.querySelectorAll('.quote-product-row').forEach(row=>{const goodsId=parseInt(row.querySelector('.qGoods').value);if(goodsId){const g=DB.findById('goods',goodsId);products.push({goodsId,goodsName:g?.name||'',qty:parseFloat(row.querySelector('.qQty').value)||1,price:parseFloat(row.querySelector('.qPrice').value)||0,discount:parseFloat(row.querySelector('.qDiscount').value)||100,subtotal:parseFloat(row.querySelector('.qSubtotal').value)||0});}});
    DB.add('crmQuotes',{code:DB.genCode('BJ'),customerId,customerName:customer?.name||'',products,amount:parseFloat(document.getElementById('qAmount').value)||0,discount:parseFloat(document.getElementById('qDiscount').value)||100,finalAmount:parseFloat(document.getElementById('qFinal').value)||0,validUntil:document.getElementById('qValid').value,creator:currentUser.username,status:'草稿',createdAt:new Date().toISOString()});
    closeModal();toast('报价创建成功！');this.reload();
  },

  viewQuoteDetail(id) {
    const q=DB.findById('crmQuotes',id);if(!q)return;
    openModal('报价详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${q.code}</div></div><div><label style="font-weight:600">客户</label><div>${q.customerName||'-'}</div></div><div><label style="font-weight:600">金额</label><div>¥${(q.amount||0).toLocaleString()}</div></div><div><label style="font-weight:600">折扣</label><div>${q.discount}%</div></div><div><label style="font-weight:600">折后</label><div style="color:var(--primary);font-weight:600">¥${(q.finalAmount||0).toLocaleString()}</div></div><div><label style="font-weight:600">有效期</label><div>${q.validUntil||'-'}</div></div><div><label style="font-weight:600">报价人</label><div>${q.creator||'-'}</div></div><div><label style="font-weight:600">状态</label><div>${this.getBadge(q.status,'quote')}</div></div></div>${q.products?.length?`<div style="padding:0 16px"><label style="font-weight:600">产品明细</label><table class="data-table" style="margin-top:8px"><thead><tr><th>商品</th><th>数量</th><th>单价</th><th>折扣</th><th>小计</th></tr></thead><tbody>${q.products.map(p=>`<tr><td>${p.goodsName}</td><td>${p.qty}</td><td>¥${p.price}</td><td>${p.discount}%</td><td>¥${p.subtotal}</td></tr>`).join('')}</tbody></table></div>`:''}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  convertToContract(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const q=DB.findById('crmQuotes',id);if(!q)return;
    openModal('转为合同',`<div style="padding:16px"><div class="form-item"><label>名称 *</label><input id="ctName" value="${q.customerName}-合同"></div><div class="form-item"><label>金额</label><input id="ctAmount" value="${q.finalAmount}" type="number"></div><div class="form-item"><label>签订日</label><input id="ctSign" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="form-item"><label>生效日</label><input id="ctStart" type="date"></div><div class="form-item"><label>到期日</label><input id="ctEnd" type="date"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveConvertContract(${id})">确认</button>`);
  },

  saveConvertContract(quoteId) {
    const q=DB.findById('crmQuotes',quoteId);
    const name=document.getElementById('ctName').value.trim();
    if(!name){toast('请输入名称','error');return;}
    DB.add('crmContracts',{code:DB.genCode('HT'),name,customerId:q.customerId,customerName:q.customerName,amount:parseFloat(document.getElementById('ctAmount').value)||0,signDate:document.getElementById('ctSign').value,startDate:document.getElementById('ctStart').value,endDate:document.getElementById('ctEnd').value,years:1,owner:currentUser.username,performanceStatus:'正常',status:'执行中',createdAt:new Date().toISOString()});
    DB.update('crmQuotes',quoteId,{status:'已成交'});
    closeModal();toast('已转为合同！');this.reload();
  },

  // ==================== 6. 合同管理 ====================
  renderContractList() {
    let list=DB.get('crmContracts');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(c=>(c.code&&c.code.toLowerCase().includes(kw))||(c.name&&c.name.toLowerCase().includes(kw)));}
    if(this.statusFilter)list=list.filter(c=>c.status===this.statusFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索合同..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.statusFilter=this.value;crm.page=1;crm.reload()"><option value="">全部状态</option><option value="草稿" ${this.statusFilter==='草稿'?'selected':''}>草稿</option><option value="执行中" ${this.statusFilter==='执行中'?'selected':''}>执行中</option><option value="已完成" ${this.statusFilter==='已完成'?'selected':''}>已完成</option><option value="已终止" ${this.statusFilter==='已终止'?'selected':''}>已终止</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-outline" onclick="crm.exportCurrentTab()">📥 导出</button><button class="btn btn-primary" onclick="crm.openAddContract()">+ 新建合同</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>名称</th><th>客户</th><th>金额</th><th>签订日</th><th>到期日</th><th>履约</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(c=>{let perf='badge-success';if(c.endDate){const days=Math.ceil((new Date(c.endDate)-new Date())/(1000*60*60*24));if(days<0){perf='badge-danger';}else if(days<=30){perf='badge-warning';}}return`<tr><td><span style="font-weight:600">${c.code}</span></td><td>${c.name}</td><td>${c.customerName||'-'}</td><td>¥${(c.amount||0).toLocaleString()}</td><td>${c.signDate||'-'}</td><td>${c.endDate||'-'}</td><td><span class="badge ${perf}">${c.performanceStatus||'正常'}</span></td><td>${this.getBadge(c.status,'contract')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewContractDetail(${c.id})">详情</button><button class="btn btn-outline btn-sm" onclick="crm.openEditContract(${c.id})">编辑</button>${c.status==='执行中'?`<button class="btn btn-ghost btn-sm" onclick="crm.terminateContract(${c.id})">终止</button>`:''}<button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmContracts',${c.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`;}).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">暂无合同</div></div>`:''}`;
  },

  openAddContract() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    const clients=DB.get('crmClients').filter(c=>c.status==='正常');
    openModal('新建合同',`<div class="form-row cols-2"><div class="form-item"><label>名称 *</label><input id="ctName" placeholder="合同名称"></div><div class="form-item"><label>客户</label><select id="ctCustomer" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">选择客户</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>金额</label><input id="ctAmount" type="number" placeholder="金额"></div><div class="form-item"><label>负责人</label><input id="ctOwner" value="${currentUser.username}"></div></div><div class="form-row cols-3"><div class="form-item"><label>签订日</label><input id="ctSign" type="date"></div><div class="form-item"><label>生效日</label><input id="ctStart" type="date"></div><div class="form-item"><label>到期日</label><input id="ctEnd" type="date"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveContract()">保存</button>`);
  },

  saveContract() {
    const name=document.getElementById('ctName').value.trim();
    if(!name){toast('请输入名称','error');return;}
    const cid=parseInt(document.getElementById('ctCustomer').value);
    const customer=DB.findById('crmClients',cid);
    DB.add('crmContracts',{code:DB.genCode('HT'),name,customerId:cid,customerName:customer?.name||'',amount:parseFloat(document.getElementById('ctAmount').value)||0,signDate:document.getElementById('ctSign').value,startDate:document.getElementById('ctStart').value,endDate:document.getElementById('ctEnd').value,years:1,owner:document.getElementById('ctOwner').value.trim(),performanceStatus:'正常',status:'执行中',createdAt:new Date().toISOString()});
    closeModal();toast('合同创建成功！');this.reload();
  },

  openEditContract(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c=DB.findById('crmContracts',id);if(!c)return;
    openModal('编辑合同',`<div class="form-row cols-2"><div class="form-item"><label>名称</label><input id="cteName" value="${c.name}"></div><div class="form-item"><label>负责人</label><input id="cteOwner" value="${c.owner||''}"></div></div><div class="form-row cols-2"><div class="form-item"><label>金额</label><input id="cteAmount" type="number" value="${c.amount||0}"></div><div class="form-item"><label>履约</label><select id="ctePerf" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="正常" ${c.performanceStatus==='正常'?'selected':''}>正常</option><option value="预警" ${c.performanceStatus==='预警'?'selected':''}>预警</option><option value="已到期" ${c.performanceStatus==='已到期'?'selected':''}>已到期</option><option value="违约" ${c.performanceStatus==='违约'?'selected':''}>违约</option></select></div></div><div class="form-row cols-3"><div class="form-item"><label>签订日</label><input id="cteSign" type="date" value="${c.signDate||''}"></div><div class="form-item"><label>生效日</label><input id="cteStart" type="date" value="${c.startDate||''}"></div><div class="form-item"><label>到期日</label><input id="cteEnd" type="date" value="${c.endDate||''}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="DB.update('crmContracts',${id},{name:document.getElementById('cteName').value.trim(),amount:parseFloat(document.getElementById('cteAmount').value)||0,signDate:document.getElementById('cteSign').value,startDate:document.getElementById('cteStart').value,endDate:document.getElementById('cteEnd').value,owner:document.getElementById('cteOwner').value.trim(),performanceStatus:document.getElementById('ctePerf').value});closeModal();toast('已更新！');crm.reload()">保存</button>`);
  },

  viewContractDetail(id) {
    const c=DB.findById('crmContracts',id);if(!c)return;
    openModal('合同详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${c.code}</div></div><div><label style="font-weight:600">名称</label><div>${c.name}</div></div><div><label style="font-weight:600">客户</label><div>${c.customerName||'-'}</div></div><div><label style="font-weight:600">金额</label><div style="color:var(--primary);font-weight:600">¥${(c.amount||0).toLocaleString()}</div></div><div><label style="font-weight:600">签订日</label><div>${c.signDate||'-'}</div></div><div><label style="font-weight:600">到期日</label><div>${c.endDate||'-'}</div></div><div><label style="font-weight:600">负责人</label><div>${c.owner||'-'}</div></div><div><label style="font-weight:600">状态</label><div>${this.getBadge(c.status,'contract')}</div></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  terminateContract(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c=DB.findById('crmContracts',id);if(!c)return;
    openModal('终止合同',`<div style="padding:16px"><div style="margin-bottom:16px">确定终止「${c.name}」？</div><div class="form-item"><label>原因</label><select id="termReason" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="协商终止">协商终止</option><option value="一方违约">一方违约</option><option value="到期">到期</option><option value="其他">其他</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="DB.update('crmContracts',${id},{status:'已终止',terminatedReason:document.getElementById('termReason').value});closeModal();toast('已终止','warning');crm.reload()">确认</button>`);
  },

  // ==================== 7. 售后工单 ====================
  renderServiceList() {
    let list=DB.get('crmServiceTickets');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(s=>(s.code&&s.code.toLowerCase().includes(kw))||(s.customerName&&s.customerName.toLowerCase().includes(kw)));}
    if(this.typeFilter)list=list.filter(s=>s.type===this.typeFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索工单..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.typeFilter=this.value;crm.page=1;crm.reload()"><option value="">全部类型</option><option value="安装" ${this.typeFilter==='安装'?'selected':''}>安装</option><option value="维修" ${this.typeFilter==='维修'?'selected':''}>维修</option><option value="投诉" ${this.typeFilter==='投诉'?'selected':''}>投诉</option><option value="咨询" ${this.typeFilter==='咨询'?'selected':''}>咨询</option><option value="退换货" ${this.typeFilter==='退换货'?'selected':''}>退换货</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-primary" onclick="crm.openAddService()">+ 新建工单</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>类型</th><th>客户</th><th>联系人</th><th>电话</th><th>派单人</th><th>处理人</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(s=>`<tr><td><span style="font-weight:600">${s.code}</span></td><td>${s.type}</td><td>${s.customerName||'-'}</td><td>${s.contact||'-'}</td><td>${s.phone||'-'}</td><td>${s.dispatcher||'-'}</td><td>${s.handler||'-'}</td><td>${this.getBadge(s.status,'service')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewServiceDetail(${s.id})">详情</button>${s.status==='待派单'?`<button class="btn btn-primary btn-sm" onclick="crm.dispatchService(${s.id})">派单</button>`:''}${s.status==='待处理'||s.status==='处理中'?`<button class="btn btn-success btn-sm" onclick="crm.handleService(${s.id})">处理</button>`:''}${s.status==='已完成'&&!s.satisfaction?`<button class="btn btn-primary btn-sm" onclick="crm.rateService(${s.id})">评价</button>`:''}<button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmServiceTickets',${s.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-text">暂无工单</div></div>`:''}`;
  },

  openAddService() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    const clients=DB.get('crmClients').filter(c=>c.status==='正常');
    openModal('新建工单',`<div class="form-row cols-2"><div class="form-item"><label>类型</label><select id="svType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="安装">安装</option><option value="维修">维修</option><option value="投诉">投诉</option><option value="咨询">咨询</option><option value="退换货">退换货</option></select></div><div class="form-item"><label>客户</label><select id="svCustomer" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="">选择客户</option>${clients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div></div><div class="form-row cols-2"><div class="form-item"><label>联系人</label><input id="svContact" placeholder="联系人"></div><div class="form-item"><label>电话</label><input id="svPhone" placeholder="电话"></div></div><div class="form-row"><div class="form-item"><label>问题 *</label><textarea id="svProblem" rows="3" placeholder="问题描述..."></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveService()">保存</button>`);
  },

  saveService() {
    const problem=document.getElementById('svProblem').value.trim();
    if(!problem){toast('请输入问题','error');return;}
    const cid=parseInt(document.getElementById('svCustomer').value);
    const customer=DB.findById('crmClients',cid);
    DB.add('crmServiceTickets',{code:DB.genCode('GD'),type:document.getElementById('svType').value,customerId:cid,customerName:customer?.name||'',contact:document.getElementById('svContact').value.trim(),phone:document.getElementById('svPhone').value.trim(),problem,dispatcher:currentUser.username,dispatchTime:new Date().toISOString(),handler:'',handleTime:'',result:'',satisfaction:'',status:'待派单',createdAt:new Date().toISOString()});
    closeModal();toast('工单创建成功！');this.reload();
  },

  dispatchService(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    openModal('工单派单',`<div style="padding:16px"><div class="form-item"><label>处理人</label><input id="svHandler" placeholder="处理人员"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="const h=document.getElementById('svHandler').value.trim();if(!h){toast('请输入处理人','error');return;}DB.update('crmServiceTickets',${id},{handler:h,status:'待处理'});closeModal();toast('已派发！');crm.reload()">确认</button>`);
  },

  handleService(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const s=DB.findById('crmServiceTickets',id);if(!s)return;
    openModal('处理工单',`<div style="padding:16px"><div style="margin-bottom:12px;padding:12px;background:#fef3c7;border-radius:8px"><strong>问题：</strong>${s.problem}</div><div class="form-item"><label>处理结果 *</label><textarea id="svResult" rows="3" placeholder="处理结果..."></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-success" onclick="const r=document.getElementById('svResult').value.trim();if(!r){toast('请输入结果','error');return;}DB.update('crmServiceTickets',${id},{result:r,handleTime:new Date().toISOString(),status:'已完成'});closeModal();toast('处理完成！');crm.reload()">完工</button>`);
  },

  rateService(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    openModal('满意度评价',`<div style="padding:16px;text-align:center"><div style="margin-bottom:20px">请评价</div><div style="display:flex;gap:12px;justify-content:center">${['非常满意','满意','一般','不满意'].map((opt,i)=>`<button class="btn ${i===0?'btn-primary':'btn-outline'}" onclick="this.parentElement.querySelectorAll('.btn').forEach(b=>b.className='btn btn-outline');this.className='btn btn-primary';document.getElementById('svRating').value='${opt}'" style="padding:12px 16px">${opt}</button>`).join('')}</div><input type="hidden" id="svRating" value="非常满意"></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="DB.update('crmServiceTickets',${id},{satisfaction:document.getElementById('svRating').value,status:'已关闭'});closeModal();toast('感谢评价！');crm.reload()">提交</button>`);
  },

  viewServiceDetail(id) {
    const s=DB.findById('crmServiceTickets',id);if(!s)return;
    openModal('工单详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${s.code}</div></div><div><label style="font-weight:600">类型</label><div>${s.type}</div></div><div><label style="font-weight:600">客户</label><div>${s.customerName||'-'}</div></div><div><label style="font-weight:600">联系人</label><div>${s.contact||'-'}</div></div><div><label style="font-weight:600">电话</label><div>${s.phone||'-'}</div></div><div><label style="font-weight:600">派单人</label><div>${s.dispatcher||'-'}</div></div><div><label style="font-weight:600">处理人</label><div>${s.handler||'-'}</div></div><div><label style="font-weight:600">状态</label><div>${this.getBadge(s.status,'service')}</div></div></div><div style="padding:0 16px"><label style="font-weight:600">问题</label><div style="margin-top:8px;padding:12px;background:var(--bg);border-radius:8px">${s.problem}</div></div>${s.result?`<div style="padding:0 16px"><label style="font-weight:600">结果</label><div style="margin-top:8px;padding:12px;background:#dcfce7;border-radius:8px">${s.result}</div></div>`:''}${s.satisfaction?`<div style="padding:0 16px"><label style="font-weight:600">满意度</label><div style="margin-top:8px;color:var(--success);font-weight:600">${s.satisfaction}</div></div>`:''}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  // ==================== 8. 营销活动 ====================
  renderCampaignList() {
    let list=DB.get('crmCampaigns');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(c=>(c.name&&c.name.toLowerCase().includes(kw))||(c.code&&c.code.toLowerCase().includes(kw)));}

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索活动..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
      </div>
      <div class="action-bar-right"><button class="btn btn-primary" onclick="crm.openAddCampaign()">+ 创建活动</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>名称</th><th>类型</th><th>开始</th><th>结束</th><th>预算</th><th>实际</th><th>ROI</th><th>负责人</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(c=>`<tr><td><span style="font-weight:600">${c.code}</span></td><td>${c.name}</td><td>${c.type}</td><td>${c.startDate||'-'}</td><td>${c.endDate||'-'}</td><td>¥${(c.budget||0).toLocaleString()}</td><td>¥${(c.actualCost||0).toLocaleString()}</td><td><span style="color:${(c.roi||0)>=0?'#22c55e':'#ef4444'};font-weight:600">${(c.roi||0).toFixed(1)}%</span></td><td>${c.owner||'-'}</td><td>${this.getBadge(c.status,'campaign')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.viewCampaignDetail(${c.id})">详情</button>${c.status==='策划中'||c.status==='进行中'?`<button class="btn btn-success btn-sm" onclick="crm.endCampaign(${c.id})">结束</button>`:''}<button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmCampaigns',${c.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">📢</div><div class="empty-state-text">暂无活动</div></div>`:''}`;
  },

  openAddCampaign() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('创建活动',`<div class="form-row cols-2"><div class="form-item"><label>名称 *</label><input id="cpName" placeholder="活动名称"></div><div class="form-item"><label>类型</label><select id="cpType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="促销活动">促销活动</option><option value="展会活动">展会活动</option><option value="客户沙龙">客户沙龙</option><option value="线上推广">线上推广</option><option value="节日活动">节日活动</option><option value="其他">其他</option></select></div></div><div class="form-row cols-3"><div class="form-item"><label>开始</label><input id="cpStart" type="date"></div><div class="form-item"><label>结束</label><input id="cpEnd" type="date"></div><div class="form-item"><label>预算</label><input id="cpBudget" type="number" placeholder="预算"></div></div><div class="form-row cols-2"><div class="form-item"><label>覆盖人数</label><input id="cpCover" type="number" placeholder="人数"></div><div class="form-item"><label>负责人</label><input id="cpOwner" value="${currentUser.username}"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveCampaign()">保存</button>`);
  },

  saveCampaign() {
    const name=document.getElementById('cpName').value.trim();
    if(!name){toast('请输入名称','error');return;}
    DB.add('crmCampaigns',{code:DB.genCode('HD'),name,type:document.getElementById('cpType').value,startDate:document.getElementById('cpStart').value,endDate:document.getElementById('cpEnd').value,budget:parseFloat(document.getElementById('cpBudget').value)||0,actualCost:0,coverCount:parseInt(document.getElementById('cpCover').value)||0,convertCount:0,roi:0,owner:document.getElementById('cpOwner').value.trim(),status:'策划中',createdAt:new Date().toISOString()});
    closeModal();toast('活动创建成功！');this.reload();
  },

  viewCampaignDetail(id) {
    const c=DB.findById('crmCampaigns',id);if(!c)return;
    openModal('活动详情',`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px"><div><label style="font-weight:600">编号</label><div>${c.code}</div></div><div><label style="font-weight:600">名称</label><div>${c.name}</div></div><div><label style="font-weight:600">类型</label><div>${c.type}</div></div><div><label style="font-weight:600">负责人</label><div>${c.owner||'-'}</div></div><div><label style="font-weight:600">开始</label><div>${c.startDate||'-'}</div></div><div><label style="font-weight:600">结束</label><div>${c.endDate||'-'}</div></div><div><label style="font-weight:600">预算</label><div>¥${(c.budget||0).toLocaleString()}</div></div><div><label style="font-weight:600">实际花费</label><div style="color:var(--warning)">¥${(c.actualCost||0).toLocaleString()}</div></div><div><label style="font-weight:600">覆盖人数</label><div>${c.coverCount||0}</div></div><div><label style="font-weight:600">转化人数</label><div style="color:var(--success)">${c.convertCount||0}</div></div><div><label style="font-weight:600">ROI</label><div style="color:${(c.roi||0)>=0?'#22c55e':'#ef4444'};font-weight:600">${(c.roi||0).toFixed(1)}%</div></div><div><label style="font-weight:600">状态</label><div>${this.getBadge(c.status,'campaign')}</div></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
  },

  endCampaign(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    openModal('结束活动',`<div style="padding:16px"><div class="form-item"><label>实际花费</label><input id="cpActualCost" type="number" placeholder="花费"></div><div class="form-item"><label>转化人数</label><input id="cpConvert" type="number" placeholder="人数"></div><div class="form-item"><label>转化收入</label><input id="cpRevenue" type="number" placeholder="收入"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-success" onclick="const ac=parseFloat(document.getElementById('cpActualCost').value)||0,cc=parseInt(document.getElementById('cpConvert').value)||0,rev=parseFloat(document.getElementById('cpRevenue').value)||0,roi=ac>0?((rev-ac)/ac*100):0;DB.update('crmCampaigns',${id},{actualCost:ac,convertCount:cc,roi,status:'已结束'});closeModal();toast('活动已结束！');crm.reload()">确认</button>`);
  },

  // ==================== 9. 会员管理 ====================
  renderMemberList() {
    let list=DB.get('crmMembers');
    if(this.keyword){const kw=this.keyword.toLowerCase();list=list.filter(m=>(m.name&&m.name.toLowerCase().includes(kw))||(m.phone&&m.phone.toLowerCase().includes(kw))||(m.code&&m.code.toLowerCase().includes(kw)));}
    if(this.levelFilter)list=list.filter(m=>m.level===this.levelFilter);

    const total=list.length,start=(this.page-1)*this.pageSize,paged=list.slice(start,start+this.pageSize);
    const levelColors={'普通会员':'#94a3b8','银卡':'#c0c0c0','金卡':'#ffd700','钻石':'#b9f2ff'};
    return `
    <div class="action-bar">
      <div class="action-bar-left">
        <div class="search-input-wrap"><span>🔍</span><input type="text" placeholder="搜索会员..." value="${this.keyword}" oninput="crm.keyword=this.value;crm.page=1;crm.reload()"></div>
        <select class="filter-select" onchange="crm.levelFilter=this.value;crm.page=1;crm.reload()"><option value="">全部等级</option><option value="普通会员" ${this.levelFilter==='普通会员'?'selected':''}>普通会员</option><option value="银卡" ${this.levelFilter==='银卡'?'selected':''}>银卡</option><option value="金卡" ${this.levelFilter==='金卡'?'selected':''}>金卡</option><option value="钻石" ${this.levelFilter==='钻石'?'selected':''}>钻石</option></select>
      </div>
      <div class="action-bar-right"><button class="btn btn-primary" onclick="crm.openAddMember()">+ 注册会员</button></div>
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>编号</th><th>姓名</th><th>性别</th><th>电话</th><th>等级</th><th>积分</th><th>累计消费</th><th>注册日</th><th>状态</th><th>操作</th></tr></thead><tbody>
      ${paged.length?paged.map(m=>`<tr><td><span style="font-weight:600">${m.code}</span></td><td>${m.name}</td><td>${m.gender||'-'}</td><td>${m.phone||'-'}</td><td><span style="color:${levelColors[m.level]||'#94a3b8'};font-weight:600">${m.level}</span></td><td><span style="color:var(--primary)">${m.points||0}</span></td><td>¥${(m.consumeTotal||0).toLocaleString()}</td><td>${m.registerDate||'-'}</td><td>${this.getBadge(m.status,'member')}</td><td><button class="btn btn-outline btn-sm" onclick="crm.openEditMember(${m.id})">编辑</button><button class="btn btn-outline btn-sm" onclick="crm.adjustPoints(${m.id})">积分</button><button class="btn btn-outline btn-sm" onclick="crm.changeMemberLevel(${m.id})">升级</button>${m.status==='正常'?`<button class="btn btn-ghost btn-sm" onclick="crm.logoutMember(${m.id})">注销</button>`:''}<button class="btn btn-danger btn-sm" onclick="if(!hasPerm('crm','delete')){toast('没有删除权限','error');}else{DB.delete('crmMembers',${m.id});toast('已删除','warning');crm.reload();}">删除</button></td></tr>`).join(''):''}
    </tbody></table></div>
    ${paged.length?renderPagination(total,this.page,this.pageSize,'crm.goPage'):''}
    ${!paged.length?`<div class="empty-state"><div class="empty-state-icon">⭐</div><div class="empty-state-text">暂无会员</div></div>`:''}`;
  },

  openAddMember() {
    if (!hasPerm('crm', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('注册会员',`<div class="form-row cols-2"><div class="form-item"><label>姓名 *</label><input id="mName" placeholder="姓名"></div><div class="form-item"><label>性别</label><select id="mGender" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="男">男</option><option value="女">女</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>电话</label><input id="mPhone" placeholder="电话"></div><div class="form-item"><label>生日</label><input id="mBirthday" type="date"></div></div><div class="form-row"><div class="form-item"><label>备注</label><textarea id="mNote" rows="2" placeholder="备注"></textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveMember()">注册</button>`);
  },

  saveMember() {
    const name=document.getElementById('mName').value.trim();
    if(!name){toast('请输入姓名','error');return;}
    DB.add('crmMembers',{code:DB.genCode('HY'),name,gender:document.getElementById('mGender').value,phone:document.getElementById('mPhone').value.trim(),level:'普通会员',points:0,consumeTotal:0,registerDate:new Date().toISOString().slice(0,10),birthday:document.getElementById('mBirthday').value,note:document.getElementById('mNote').value.trim(),status:'正常',createdAt:new Date().toISOString()});
    closeModal();toast('注册成功！');this.reload();
  },

  openEditMember(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const m=DB.findById('crmMembers',id);if(!m)return;
    openModal('编辑会员',`<div class="form-row cols-2"><div class="form-item"><label>姓名</label><input id="meName" value="${m.name}"></div><div class="form-item"><label>性别</label><select id="meGender" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="男" ${m.gender==='男'?'selected':''}>男</option><option value="女" ${m.gender==='女'?'selected':''}>女</option></select></div></div><div class="form-row cols-2"><div class="form-item"><label>电话</label><input id="mePhone" value="${m.phone||''}"></div><div class="form-item"><label>生日</label><input id="meBirthday" type="date" value="${m.birthday||''}"></div></div><div class="form-row"><div class="form-item"><label>备注</label><textarea id="meNote" rows="2">${m.note||''}</textarea></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="DB.update('crmMembers',${id},{name:document.getElementById('meName').value.trim(),gender:document.getElementById('meGender').value,phone:document.getElementById('mePhone').value.trim(),birthday:document.getElementById('meBirthday').value,note:document.getElementById('meNote').value.trim()});closeModal();toast('已更新！');crm.reload()">保存</button>`);
  },

  adjustPoints(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const m=DB.findById('crmMembers',id);if(!m)return;
    openModal('积分调整',`<div style="padding:16px"><div style="margin-bottom:16px">当前积分：<strong style="color:var(--primary)">${m.points||0}</strong></div><div class="form-item"><label>调整类型</label><select id="ptType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="earn">增加积分</option><option value="redeem">扣除积分</option><option value="adjust">综合调整</option></select></div><div class="form-item"><label>积分数量</label><input id="ptAmount" type="number" placeholder="数量"></div><div class="form-item"><label>原因</label><input id="ptNote" placeholder="调整原因"></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="crm.saveAdjustPoints(${id})">确认</button>`);
  },

  saveAdjustPoints(id) {
    const m=DB.findById('crmMembers',id);
    const type=document.getElementById('ptType').value;
    const amount=parseInt(document.getElementById('ptAmount').value)||0;
    const before=m.points||0;
    let after=before;
    if(type==='earn')after=before+amount;
    else if(type==='redeem')after=Math.max(0,before-amount);
    else after=amount;
    DB.add('crmPointRecords',{memberId:id,memberName:m.name,type,points:amount,beforePoints:before,afterPoints:after,source:'manual',operator:currentUser.username,note:document.getElementById('ptNote').value.trim(),createdAt:new Date().toISOString()});
    DB.update('crmMembers',id,{points:after});
    closeModal();toast('积分已调整！');this.reload();
  },

  changeMemberLevel(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const m=DB.findById('crmMembers',id);if(!m)return;
    openModal('等级调整',`<div style="padding:16px"><div style="margin-bottom:16px">当前：<strong>${m.level}</strong> (累计消费 ¥${(m.consumeTotal||0).toLocaleString()})</div><div class="form-item"><label>新等级</label><select id="mlNew" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)"><option value="普通会员">普通会员</option><option value="银卡">银卡</option><option value="金卡">金卡</option><option value="钻石">钻石</option></select></div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="DB.update('crmMembers',${id},{level:document.getElementById('mlNew').value});closeModal();toast('等级已调整！');crm.reload()">确认</button>`);
  },

  logoutMember(id) {
    if (!hasPerm('crm', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const m=DB.findById('crmMembers',id);if(!m)return;
    openModal('注销会员',`<div style="padding:16px"><div>确定注销会员「${m.name}」？</div></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="DB.update('crmMembers',${id},{status:'注销'});closeModal();toast('已注销','warning');crm.reload()">确认</button>`);
  },

  // ==================== 10. 客户分析 ====================
  renderAnalytics() {
    const clients=DB.get('crmClients');
    const opportunities=DB.get('crmOpportunities');
    const contracts=DB.get('crmContracts');
    const members=DB.get('crmMembers');
    const leads=DB.get('crmLeads');

    const totalClients=clients.length;
    const aClients=clients.filter(c=>c.level==='A级').length;
    const now=new Date();
    const thisMonth=clients.filter(c=>c.createdAt&&new Date(c.createdAt).getMonth()===now.getMonth()&&new Date(c.createdAt).getFullYear()===now.getFullYear()).length;
    const lostMonth=clients.filter(c=>c.status==='流失'&&c.lostAt&&new Date(c.lostAt).getMonth()===now.getMonth()&&new Date(c.lostAt).getFullYear()===now.getFullYear()).length;
    const wonOpps=opportunities.filter(o=>o.status==='赢单');
    const thisMonthWon=wonOpps.filter(o=>o.winDate&&new Date(o.winDate).getMonth()===now.getMonth()&&new Date(o.winDate).getFullYear()===now.getFullYear());
    const monthAmount=thisMonthWon.reduce((s,o)=>s+(o.amount||0),0);

    // 行业分布
    const industryStats={};
    clients.forEach(c=>{if(c.industry){industryStats[c.industry]=(industryStats[c.industry]||0)+1;}});
    const industryData=Object.entries(industryStats).sort((a,b)=>b[1]-a[1]).slice(0,6);
    const maxIndustry=industryData[0]?industryData[0][1]:1;

    // 销售漏斗
    const funnelLeads=leads.length;
    const funnelOpps=opportunities.filter(o=>o.status==='进行中').length;
    const funnelQuotes=DB.get('crmQuotes').length;
    const funnelContracts=contracts.filter(c=>c.status==='执行中').length;
    const funnelWon=wonOpps.length;
    const maxFunnel=Math.max(funnelLeads,funnelOpps,funnelQuotes,funnelContracts,funnelWon,1);

    // 来源分布
    const sourceStats={};
    clients.forEach(c=>{if(c.source){sourceStats[c.source]=(sourceStats[c.source]||0)+1;}});
    const sourceData=Object.entries(sourceStats).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const maxSource=sourceData[0]?sourceData[0][1]:1;

    // TOP客户
    const topClients=[...clients].sort((a,b)=>(b.totalAmount||0)-(a.totalAmount||0)).slice(0,5);
    const maxTop=topClients[0]?(topClients[0].totalAmount||0):1;

    return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#3b82f6,#2563eb)">👥</div><div class="stat-content"><div class="stat-value">${totalClients}</div><div class="stat-label">客户总数</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#ef4444,#dc2626)">⭐</div><div class="stat-content"><div class="stat-value">${aClients}</div><div class="stat-label">A级客户</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#22c55e,#16a34a)">📈</div><div class="stat-content"><div class="stat-value">${thisMonth}</div><div class="stat-label">本月新增</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#f97316,#ea580c)">📉</div><div class="stat-content"><div class="stat-value">${lostMonth}</div><div class="stat-label">本月流失</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed)">🏆</div><div class="stat-content"><div class="stat-value">${wonOpps.length}</div><div class="stat-label">成交客户</div></div></div>
      <div class="stat-card"><div class="stat-icon" style="background:linear-gradient(135deg,#06b6d4,#0891b2)">💰</div><div class="stat-content"><div class="stat-value">¥${monthAmount.toLocaleString()}</div><div class="stat-label">本月成交额</div></div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- 行业分布 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">🏭 客户行业分布</h3>
        ${industryData.length?industryData.map(([ind,count])=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>${ind}</span><span style="color:var(--primary);font-weight:600">${count}</span></div><div style="height:8px;background:var(--bg);border-radius:4px"><div style="height:100%;width:${count/maxIndustry*100}%;background:linear-gradient(90deg,var(--primary),var(--secondary));border-radius:4px"></div></div></div>`).join(''):'<div style="color:var(--text-muted);text-align:center;padding:20px">暂无数据</div>'}
      </div>

      <!-- 销售漏斗 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">�漏斗 销售漏斗</h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[{'l':'线索',v:funnelLeads,c:'#94a3b8'},{'l':'商机',v:funnelOpps,c:'#3b82f6'},{'l':'报价',v:funnelQuotes,c:'#f59e0b'},{'l':'合同',v:funnelContracts,c:'#f97316'},{'l':'成交',v:funnelWon,c:'#22c55e'}].map(f=>`<div style="display:flex;align-items:center;gap:12px"><div style="width:50px;font-size:12px">${f.l}</div><div style="flex:1;height:24px;background:var(--bg);border-radius:4px;position:relative"><div style="position:absolute;left:0;top:0;height:100%;width:${f.v/maxFunnel*100}%;background:${f.c};border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px"><span style="color:white;font-weight:600;font-size:12px">${f.v}</span></div></div></div>`).join('')}
        </div>
      </div>

      <!-- 来源分布 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">📊 客户来源分析</h3>
        ${sourceData.length?sourceData.map(([src,count])=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>${src}</span><span style="color:var(--primary);font-weight:600">${count}</span></div><div style="height:8px;background:var(--bg);border-radius:4px"><div style="height:100%;width:${count/maxSource*100}%;background:linear-gradient(90deg,#10b981,#059669);border-radius:4px"></div></div></div>`).join(''):'<div style="color:var(--text-muted);text-align:center;padding:20px">暂无数据</div>'}
      </div>

      <!-- TOP客户 -->
      <div class="card" style="padding:20px">
        <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">🏆 TOP客户排行</h3>
        ${topClients.length?topClients.map((c,i)=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>${i+1}. ${c.name}</span><span style="color:var(--primary);font-weight:600">¥${(c.totalAmount||0).toLocaleString()}</span></div><div style="height:8px;background:var(--bg);border-radius:4px"><div style="height:100%;width:${(c.totalAmount||0)/maxTop*100}%;background:linear-gradient(90deg,#8b5cf6,#7c3aed);border-radius:4px"></div></div></div>`).join(''):'<div style="color:var(--text-muted);text-align:center;padding:20px">暂无数据</div>'}
      </div>
    </div>

    <!-- 会员等级分布 -->
    <div class="card" style="padding:20px;margin-top:20px">
      <h3 style="margin:0 0 16px;font-size:15px;font-weight:600">⭐ 会员等级分布</h3>
      <div style="display:flex;gap:20px">
        ${['普通会员','银卡','金卡','钻石'].map(lv=>{const cnt=members.filter(m=>m.level===lv).length;const cl={'普通会员':'#94a3b8','银卡':'#c0c0c0','金卡':'#ffd700','钻石':'#b9f2ff'};return`<div style="flex:1;text-align:center;padding:20px;background:var(--bg);border-radius:12px"><div style="font-size:28px;margin-bottom:8px;color:${cl[lv]}">${['👤','🥈','🥇','💎'][{'普通会员':0,'银卡':1,'金卡':2,'钻石':3}[lv]]}</div><div style="font-size:24px;font-weight:700;color:${cl[lv]}">${cnt}</div><div style="font-size:12px;color:var(--text-muted)">${lv}</div></div>`;}).join('')}
      </div>
    </div>`;
  },

  // 导出当前标签页数据
  exportCurrentTab() {
    if (!hasPerm('crm', 'export')) { toast('没有导出权限', 'error'); return; }
    const tab = this.activeTab;
    let headers, rows, filename;
    switch(tab) {
      case 'client': {
        const list = DB.get('crmClients');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '名称', '类型', '联系人', '电话', '邮箱', '行业', '等级', '来源', '经理', '地址', '状态'];
        rows = list.map(c => [c.code, c.name, c.type||'', c.contact||'', c.phone||'', c.email||'', c.industry||'', c.level||'', c.source||'', c.owner||'', c.address||'', c.status||'']);
        filename = 'CRM客户列表';
        break;
      }
      case 'lead': {
        const list = DB.get('crmLeads');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '姓名', '电话', '公司', '职位', '来源', '意向度', '负责人', '状态'];
        rows = list.map(l => [l.code, l.name, l.phone, l.company||'', l.position||'', l.source||'', l.level||'', l.owner||'', l.status||'']);
        filename = 'CRM线索列表';
        break;
      }
      case 'opportunity': {
        const list = DB.get('crmOpportunities');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '商机名称', '客户', '阶段', '金额', '成功率', '负责人', '状态'];
        rows = list.map(o => [o.code, o.name, o.customerName||'', o.stage||'', o.amount||0, o.probability||'', o.owner||'', o.status||'']);
        filename = 'CRM商机列表';
        break;
      }
      case 'contract': {
        const list = DB.get('crmContracts');
        if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
        headers = ['编号', '合同名称', '客户', '金额', '开始日期', '结束日期', '状态'];
        rows = list.map(c => [c.code, c.name, c.customerName||'', c.amount||0, c.startDate||'', c.endDate||'', c.status||'']);
        filename = 'CRM合同列表';
        break;
      }
      default:
        toast('当前标签页不支持导出', 'warning'); return;
    }
    exportTableToCSV(headers, rows, `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${rows.length} 条数据`, 'success');
  }
};
