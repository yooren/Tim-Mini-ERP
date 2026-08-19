// ===========================
// 供应商管理 - 含档案/资质/价格管理
// ===========================

// 辅助函数：格式化文件大小
function fmtFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 辅助函数：下载base64文件
function downloadBase64File(base64, filename) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  link.click();
}

// 辅助函数：预览文件（图片/PDF）
function previewFile(base64, filename) {
  const isImage = filename.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
  if (isImage) {
    openModal('文件预览', `<div style="text-align:center"><img src="${base64}" style="max-width:100%;max-height:70vh;border-radius:8px"></div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="downloadBase64File('${base64}', '${filename}')">下载</button>`);
  } else {
    openModal('文件预览', `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">📄</div><div style="font-weight:600">${filename}</div><div style="color:var(--text-muted);margin-top:8px">点击下方按钮下载查看</div></div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="downloadBase64File('${base64}', '${filename}')">下载文件</button>`);
  }
}

const supplier = {
  keyword: '',
  activeSubTab: 'info', // info | qualifications | prices | contracts
  currentSupplierId: null,

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索供应商名称/联系人..." value="${this.keyword}"
              oninput="supplier.keyword=this.value;supplier.reload()">
          </div>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-outline" onclick="supplier.exportData()">📥 导出</button>
          <button class="btn btn-outline" onclick="supplier.importData()">📤 导入</button>
          <button class="btn btn-ghost" onclick="supplier.downloadTemplate()">📝 模板</button>
          <button class="btn btn-primary" onclick="supplier.openAdd()">+ 新增供应商</button>
        </div>
      </div>
      <div id="supplierContent">${this.renderList()}</div>
    </div>`;
  },

  renderList() {
    let list = DB.get('suppliers');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(kw) || s.contact.toLowerCase().includes(kw));
    }
    if (!list.length) return `<div class="empty-state"><div class="empty-state-icon">🏢</div><div class="empty-state-text">暂无供应商</div></div>`;

    return `<div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>供应商名称</th>
            <th>联系人</th>
            <th>联系电话</th>
            <th>供应类目</th>
            <th>状态</th>
            <th>评分</th>
            <th>资质/价格/合同</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(s => {
            const cats = s.categories ? s.categories.split(',') : [];
            const catTags = cats.map(c => `<span style="display:inline-block;padding:2px 8px;background:var(--primary-light);color:var(--primary);border-radius:12px;font-size:11px;margin-right:4px">${c}</span>`).join('');
            const qualCount = (DB.get('supplierQualifications') || []).filter(q => q.supplierId === s.id).length;
            const priceCount = (DB.get('supplierPrices') || []).filter(p => p.supplierId === s.id).length;
            const contractCount = (DB.get('supplierContracts') || []).filter(c => c.supplierId === s.id).length;
            return `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px;flex-shrink:0">
                    ${s.name.slice(0,1)}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:13px">${s.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${s.email || '-'}</div>
                  </div>
                </div>
              </td>
              <td>${s.contact}</td>
              <td>${s.phone}</td>
              <td>${catTags || '<span style="color:var(--text-muted)">-</span>'}</td>
              <td><span class="badge ${s.status?'badge-success':'badge-default'}">${s.status?'合作中':'已停用'}</span></td>
              <td>${this.renderStars(s.rating || 0)}</td>
              <td style="font-size:12px;color:var(--text-muted)">📋${qualCount} 💰${priceCount} 📄${contractCount}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-outline btn-sm" onclick="supplier.openEdit(${s.id})">✏️</button>
                  <button class="btn btn-primary btn-sm" onclick="supplier.openProfile(${s.id})">📂</button>
                  <button class="btn ${s.status?'btn-ghost':'btn-success'} btn-sm" onclick="supplier.toggleStatus(${s.id},${s.status})">${s.status?'⏸':'▶'}</button>
                  <button class="btn btn-danger btn-sm" onclick="supplier.del(${s.id})">🗑</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  reload() {
    const el = document.getElementById('supplierContent');
    if (el) el.innerHTML = this.renderList();
  },

  // ===========================
  // 供应商档案详情
  // ===========================
  openProfile(id) {
    const s = DB.findById('suppliers', id);
    if (!s) return;
    this.currentSupplierId = id;
    this.activeSubTab = 'info';
    
    openModal(`供应商档案 - ${s.name}`, `
      <div style="display:flex;border-bottom:1px solid var(--border);margin:-16px -16px 16px -16px;padding:0 16px">
        <button class="sub-tab-btn ${this.activeSubTab === 'info' ? 'active' : ''}" onclick="supplier.switchSubTab('info')" style="border:none;background:none;padding:12px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid ${this.activeSubTab === 'info' ? 'var(--primary)' : 'transparent'};color:${this.activeSubTab === 'info' ? 'var(--primary)' : 'var(--text-muted)'};font-weight:600">📋 基本信息</button>
        <button class="sub-tab-btn ${this.activeSubTab === 'qualifications' ? 'active' : ''}" onclick="supplier.switchSubTab('qualifications')" style="border:none;background:none;padding:12px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid ${this.activeSubTab === 'qualifications' ? 'var(--primary)' : 'transparent'};color:${this.activeSubTab === 'qualifications' ? 'var(--primary)' : 'var(--text-muted)'};font-weight:600">📜 资质文件</button>
        <button class="sub-tab-btn ${this.activeSubTab === 'prices' ? 'active' : ''}" onclick="supplier.switchSubTab('prices')" style="border:none;background:none;padding:12px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid ${this.activeSubTab === 'prices' ? 'var(--primary)' : 'transparent'};color:${this.activeSubTab === 'prices' ? 'var(--primary)' : 'var(--text-muted)'};font-weight:600">💵 供应价格</button>
        <button class="sub-tab-btn ${this.activeSubTab === 'contracts' ? 'active' : ''}" onclick="supplier.switchSubTab('contracts')" style="border:none;background:none;padding:12px 16px;font-size:14px;cursor:pointer;border-bottom:2px solid ${this.activeSubTab === 'contracts' ? 'var(--primary)' : 'transparent'};color:${this.activeSubTab === 'contracts' ? 'var(--primary)' : 'var(--text-muted)'};font-weight:600">📄 合同管理</button>
      </div>
      <div id="supplierProfileContent">${this.renderProfileContent()}</div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="supplier.openEditProfile(${id})">编辑档案</button>`, '90%');
  },

  switchSubTab(tab) {
    this.activeSubTab = tab;
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('supplierProfileContent').innerHTML = this.renderProfileContent();
  },

  renderProfileContent() {
    if (!this.currentSupplierId) return '';
    const s = DB.findById('suppliers', this.currentSupplierId);
    if (!s) return '';

    switch (this.activeSubTab) {
      case 'info':
        return this.renderBasicInfo(s);
      case 'qualifications':
        return this.renderQualifications();
      case 'prices':
        return this.renderPrices();
      case 'contracts':
        return this.renderContracts();
      default:
        return '';
    }
  },

  renderBasicInfo(s) {
    const cats = s.categories ? s.categories.split(',') : [];
    const catTags = cats.map(c => `<span class="badge badge-primary">${c}</span>`).join(' ');
    
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div style="padding:16px;background:var(--bg);border-radius:12px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">供应商名称</div>
          <div style="font-weight:600;font-size:16px">${s.name}</div>
        </div>
        <div style="padding:16px;background:var(--bg);border-radius:12px">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">状态</div>
          <div><span class="badge ${s.status ? 'badge-success' : 'badge-default'}">${s.status ? '合作中' : '已停用'}</span></div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">联系人</div>
          <div style="font-weight:500">${s.contact}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">联系电话</div>
          <div style="font-weight:500">${s.phone}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">电子邮箱</div>
          <div>${s.email || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">主营分类</div>
          <div>${catTags || '-'}</div>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">详细地址</div>
          <div>${s.address || '-'}</div>
        </div>
        
        <div style="grid-column:1/-1;border-top:1px solid var(--border);padding-top:16px;margin-top:8px">
          <div style="font-size:14px;font-weight:600;margin-bottom:16px;color:var(--text)">💼 扩展信息</div>
        </div>
        
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">统一社会信用代码</div>
          <div>${s.businessLicense || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">开户银行</div>
          <div>${s.bankName || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">银行账号</div>
          <div>${s.bankAccount || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">纳税人识别号</div>
          <div>${s.taxId || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">合作开始日期</div>
          <div>${s.cooperateDate || '-'}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">供应商评分</div>
          <div style="display:flex;align-items:center;gap:8px">
            ${this.renderStars(s.rating || 0)}
            <span style="color:var(--text-muted);font-size:13px">${s.rating || 0}分</span>
          </div>
        </div>
        <div style="grid-column:1/-1">
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">备注</div>
          <div style="padding:12px;background:var(--bg);border-radius:8px">${s.note || '无备注'}</div>
        </div>
      </div>
    `;
  },

  renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars += '<span style="color:#f59e0b">★</span>';
      } else {
        stars += '<span style="color:#e5e7eb">☆</span>';
      }
    }
    return stars;
  },

  // ===========================
  // 资质文件管理
  // ===========================
  renderQualifications() {
    const quals = DB.get('supplierQualifications') || [];
    const supplierQuals = quals.filter(q => q.supplierId === this.currentSupplierId);
    const typeColors = {
      '营业执照': '#3b82f6',
      '税务登记证': '#10b981',
      '资质证书': '#8b5cf6',
      '安全生产证': '#f59e0b',
      '环保证': '#06b6d4',
      '合同': '#6366f1',
      '其他': '#64748b'
    };

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-muted)">共 ${supplierQuals.length} 个资质文件</div>
          <button class="btn btn-primary" onclick="supplier.openAddQualification()">➕ 添加资质</button>
        </div>
        
        ${supplierQuals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📜</div>
            <div class="empty-state-text">暂无资质文件</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">点击上方按钮上传资质文件</div>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
            ${supplierQuals.map(q => `
              <div style="padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border)">
                <div style="display:flex;align-items:flex-start;gap:12px">
                  <div style="width:48px;height:48px;border-radius:8px;background:${typeColors[q.type] || '#64748b'};display:flex;align-items:center;justify-content:center;color:white;font-size:20px">
                    ${q.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '🖼' : '📄'}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px">${q.name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${typeColors[q.type] ? '' : ''}<span style="display:inline-block;padding:2px 8px;background:${typeColors[q.type] || '#64748b'}20;color:${typeColors[q.type] || '#64748b'};border-radius:12px;font-size:11px">${q.type}</span></div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${fmtFileSize(q.fileSize)} · ${q.expiryDate ? '有效期至 ' + q.expiryDate : '长期有效'}</div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                  <button class="btn btn-outline btn-sm" style="flex:1" onclick="supplier.viewQualification(${q.id})">👁 查看</button>
                  <button class="btn btn-ghost btn-sm" onclick="supplier.editQualification(${q.id})">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="supplier.delQualification(${q.id})">🗑</button>
                </div>
                ${q.expiryDate && new Date(q.expiryDate) < new Date() ? '<div style="margin-top:8px;padding:6px 10px;background:#fef2f2;color:#ef4444;border-radius:6px;font-size:12px;font-weight:500">⚠️ 已过期</div>' : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  openAddQualification() {
    if (!hasPerm('supplier', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('添加资质文件', `
      <div class="form-row">
        <div class="form-item"><label>资质名称 *</label><input id="qName" placeholder="如：营业执照（三证合一）"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>资质类型 *</label>
          <select id="qType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="营业执照">营业执照</option>
            <option value="税务登记证">税务登记证</option>
            <option value="资质证书">资质证书</option>
            <option value="安全生产证">安全生产证</option>
            <option value="环保证">环保证</option>
            <option value="合同">合同</option>
            <option value="其他">其他</option>
          </select>
        </div>
        <div class="form-item">
          <label>有效期至</label>
          <input id="qExpiry" type="date">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="qNote" placeholder="如：证号：91110000XXXXXXXX"></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>上传文件 *</label>
          <div id="qFileDrop" style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all 0.2s" onclick="document.getElementById('qFileInput').click()" ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'" ondragleave="this.style.borderColor='var(--border)';this.style.background=''" ondrop="event.preventDefault();supplier.handleFileDrop(event,'q')">
            <div style="font-size:32px;margin-bottom:8px">📤</div>
            <div style="font-weight:600;color:var(--text)">拖拽文件到此处 或 点击上传</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">支持 JPG/PNG/PDF 文件</div>
            <input type="file" id="qFileInput" accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf" style="display:none" onchange="supplier.handleFileSelect(this,'q')">
          </div>
          <div id="qFilePreview" style="margin-top:12px;display:none">
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:8px">
              <span id="qFileIcon" style="font-size:24px">📄</span>
              <div style="flex:1">
                <div id="qFileName" style="font-weight:500"></div>
                <div id="qFileSize" style="font-size:12px;color:var(--text-muted)"></div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="supplier.removeFile('q')">✕</button>
            </div>
          </div>
          <input type="hidden" id="qFileData">
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveQualification()">保存</button>`, '600px');
  },

  handleFileDrop(e, prefix) {
    const file = e.dataTransfer.files[0];
    if (file) this.processFile(file, prefix);
  },

  handleFileSelect(input, prefix) {
    const file = input.files[0];
    if (file) this.processFile(file, prefix);
  },

  processFile(file, prefix) {
    if (file.size > 10 * 1024 * 1024) {
      toast('文件大小不能超过10MB', 'error');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById(prefix + 'FileData').value = e.target.result;
      document.getElementById(prefix + 'FilePreview').style.display = 'block';
      document.getElementById(prefix + 'FileName').textContent = file.name;
      document.getElementById(prefix + 'FileSize').textContent = fmtFileSize(file.size);
      document.getElementById(prefix + 'FileIcon').textContent = file.type.startsWith('image/') ? '🖼' : '📄';
    };
    reader.readAsDataURL(file);
  },

  removeFile(prefix) {
    document.getElementById(prefix + 'FilePreview').style.display = 'none';
    document.getElementById(prefix + 'FileData').value = '';
  },

  saveQualification() {
    const name = document.getElementById('qName').value.trim();
    const fileData = document.getElementById('qFileData').value;
    
    if (!name) {
      toast('请输入资质名称', 'error');
      return;
    }
    
    const fileInput = document.getElementById('qFileInput');
    const file = fileInput.files[0];
    
    // 如果有文件，先转换
    if (file && !fileData) {
      toast('文件正在处理中，请稍候', 'warning');
      return;
    }
    
    const qData = {
      supplierId: this.currentSupplierId,
      name,
      type: document.getElementById('qType').value,
      expiryDate: document.getElementById('qExpiry').value,
      note: document.getElementById('qNote').value.trim(),
      fileName: file ? file.name : '',
      fileSize: file ? file.size : 0,
      fileData: fileData || '',
      createdAt: new Date().toISOString()
    };
    
    DB.add('supplierQualifications', qData);
    audit.log('supplier', '上传资质', name, `供应商ID: ${this.currentSupplierId}`);
    closeModal();
    toast('资质文件已添加');
    document.getElementById('supplierProfileContent').innerHTML = this.renderQualifications();
  },

  viewQualification(id) {
    const q = DB.findById('supplierQualifications', id);
    if (!q) return;
    
    if (q.fileData) {
      previewFile(q.fileData, q.fileName || q.name);
    } else {
      openModal('资质详情', `
        <div style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:16px">📄</div>
          <div style="font-weight:600;font-size:16px">${q.name}</div>
          <div style="color:var(--text-muted);margin-top:8px">${q.type}</div>
          ${q.note ? `<div style="margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;text-align:left">备注：${q.note}</div>` : ''}
          <div style="margin-top:16px;font-size:13px;color:var(--text-muted)">文件未上传，仅保存了元数据</div>
        </div>
      `, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
    }
  },

  editQualification(id) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const q = DB.findById('supplierQualifications', id);
    if (!q) return;

    openModal('编辑资质', `
      <div class="form-row">
        <div class="form-item"><label>资质名称</label><input id="qeName" value="${q.name || ''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>类型</label>
          <select id="qeType" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="营业执照" ${q.type === '营业执照' ? 'selected' : ''}>营业执照</option>
            <option value="税务登记证" ${q.type === '税务登记证' ? 'selected' : ''}>税务登记证</option>
            <option value="资质证书" ${q.type === '资质证书' ? 'selected' : ''}>资质证书</option>
            <option value="安全生产证" ${q.type === '安全生产证' ? 'selected' : ''}>安全生产证</option>
            <option value="环保证" ${q.type === '环保证' ? 'selected' : ''}>环保证</option>
            <option value="合同" ${q.type === '合同' ? 'selected' : ''}>合同</option>
            <option value="其他" ${q.type === '其他' ? 'selected' : ''}>其他</option>
          </select>
        </div>
        <div class="form-item">
          <label>有效期至</label>
          <input id="qeExpiry" type="date" value="${q.expiryDate || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="qeNote" value="${q.note || ''}"></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveEditQualification(${id})">保存</button>`);
  },

  saveEditQualification(id) {
    DB.update('supplierQualifications', id, {
      name: document.getElementById('qeName').value.trim(),
      type: document.getElementById('qeType').value,
      expiryDate: document.getElementById('qeExpiry').value,
      note: document.getElementById('qeNote').value.trim()
    });
    closeModal();
    toast('资质已更新');
    document.getElementById('supplierProfileContent').innerHTML = this.renderQualifications();
  },

  delQualification(id) {
    if (!hasPerm('supplier', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除', `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <div style="font-weight:600">确定删除此资质文件吗？</div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="supplier.confirmDelQualification(${id})">删除</button>`);
  },

  confirmDelQualification(id) {
    DB.delete('supplierQualifications', id);
    closeModal();
    toast('资质已删除', 'warning');
    document.getElementById('supplierProfileContent').innerHTML = this.renderQualifications();
  },

  // ===========================
  // 供应价格管理
  // ===========================
  renderPrices() {
    const prices = DB.get('supplierPrices') || [];
    const supplierPrices = prices.filter(p => p.supplierId === this.currentSupplierId);
    const products = DB.get('products') || [];
    
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-muted)">共 ${supplierPrices.length} 条价格记录</div>
          <button class="btn btn-primary" onclick="supplier.openAddPrice()">➕ 添加价格</button>
        </div>
        
        ${supplierPrices.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">💵</div>
            <div class="empty-state-text">暂无供应价格</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">点击上方按钮添加商品供应价格</div>
          </div>
        ` : `
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>商品名称</th>
                  <th>规格型号</th>
                  <th>单位</th>
                  <th>供应价</th>
                  <th>最低价</th>
                  <th>市场价参考</th>
                  <th>报价日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                ${supplierPrices.map(p => {
                  const product = products.find(pro => pro.id === p.productId);
                  const isLow = p.price <= (p.minPrice || 0) * 1.1;
                  return `
                    <tr>
                      <td><span style="font-weight:600">${product ? product.name : '未知商品'}</span></td>
                      <td style="color:var(--text-muted)">${p.spec || '-'}</td>
                      <td>${p.unit || '-'}</td>
                      <td style="color:var(--success);font-weight:700">${fmtMoney(p.price)}</td>
                      <td style="color:var(--text-muted)">${p.minPrice ? fmtMoney(p.minPrice) : '-'}</td>
                      <td style="color:var(--text-muted)">${p.marketPrice ? fmtMoney(p.marketPrice) : '-'}</td>
                      <td>${p.priceDate || '-'}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="supplier.editPrice(${p.id})">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="supplier.delPrice(${p.id})">🗑</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  openAddPrice() {
    if (!hasPerm('supplier', 'create')) { toast('没有新建权限', 'error'); return; }
    const products = DB.get('products') || [];
    const categories = DB.get('categories') || [];
    
    openModal('添加供应价格', `
      <div class="form-row">
        <div class="form-item">
          <label>选择商品 *</label>
          <select id="pProduct" style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:8px;background:var(--bg)">
            <option value="">请选择商品</option>
            ${products.filter(p => p.status !== 0).map(p => `<option value="${p.id}" data-name="${p.name}" data-unit="${p.unit || '件'}" data-cat="${p.categoryName || ''}">${p.name} (${p.categoryName || '未分类'})</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>规格型号</label>
          <input id="pSpec" placeholder="如：100g/袋">
        </div>
        <div class="form-item">
          <label>单位</label>
          <input id="pUnit" placeholder="如：箱、件、个">
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item">
          <label>供应价 *</label>
          <input id="pPrice" type="number" step="0.01" min="0" placeholder="0.00">
        </div>
        <div class="form-item">
          <label>最低价</label>
          <input id="pMinPrice" type="number" step="0.01" min="0" placeholder="议价底线">
        </div>
        <div class="form-item">
          <label>市场参考价</label>
          <input id="pMarketPrice" type="number" step="0.01" min="0" placeholder="市场均价">
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item">
          <label>报价日期</label>
          <input id="pPriceDate" type="date" value="${new Date().toISOString().slice(0,10)}">
        </div>
        <div class="form-item">
          <label>备注</label>
          <input id="pNote" placeholder="如：含税/不含税">
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.savePrice()">保存</button>`);
  },

  savePrice() {
    const productId = parseInt(document.getElementById('pProduct').value);
    const price = parseFloat(document.getElementById('pPrice').value);
    
    if (!productId || !price) {
      toast('请选择商品并填写供应价', 'error');
      return;
    }
    
    const productOpt = document.getElementById('pProduct').options[document.getElementById('pProduct').selectedIndex];
    
    const priceData = {
      supplierId: this.currentSupplierId,
      productId,
      productName: productOpt.dataset.name,
      categoryName: productOpt.dataset.cat,
      spec: document.getElementById('pSpec').value.trim(),
      unit: document.getElementById('pUnit').value.trim() || productOpt.dataset.unit,
      price,
      minPrice: parseFloat(document.getElementById('pMinPrice').value) || 0,
      marketPrice: parseFloat(document.getElementById('pMarketPrice').value) || 0,
      priceDate: document.getElementById('pPriceDate').value,
      note: document.getElementById('pNote').value.trim(),
      createdAt: new Date().toISOString()
    };
    
    DB.add('supplierPrices', priceData);
    audit.log('supplier', '添加价格', productOpt.dataset.name, `供应价: ${fmtMoney(price)}`);
    closeModal();
    toast('供应价格已添加');
    document.getElementById('supplierProfileContent').innerHTML = this.renderPrices();
  },

  editPrice(id) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const p = DB.findById('supplierPrices', id);
    if (!p) return;

    openModal('编辑价格', `
      <div class="form-row">
        <div class="form-item"><label>商品</label><div style="padding:10px;background:var(--bg);border-radius:8px;font-weight:500">${p.productName}</div></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>规格</label><input id="peSpec" value="${p.spec || ''}"></div>
        <div class="form-item"><label>单位</label><input id="peUnit" value="${p.unit || ''}"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>供应价</label><input id="pePrice" type="number" step="0.01" value="${p.price || 0}"></div>
        <div class="form-item"><label>最低价</label><input id="peMinPrice" type="number" step="0.01" value="${p.minPrice || 0}"></div>
        <div class="form-item"><label>市场价</label><input id="peMarketPrice" type="number" step="0.01" value="${p.marketPrice || 0}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>报价日期</label><input id="pePriceDate" type="date" value="${p.priceDate || ''}"></div>
        <div class="form-item"><label>备注</label><input id="peNote" value="${p.note || ''}"></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveEditPrice(${id})">保存</button>`);
  },

  saveEditPrice(id) {
    DB.update('supplierPrices', id, {
      spec: document.getElementById('peSpec').value.trim(),
      unit: document.getElementById('peUnit').value.trim(),
      price: parseFloat(document.getElementById('pePrice').value) || 0,
      minPrice: parseFloat(document.getElementById('peMinPrice').value) || 0,
      marketPrice: parseFloat(document.getElementById('peMarketPrice').value) || 0,
      priceDate: document.getElementById('pePriceDate').value,
      note: document.getElementById('peNote').value.trim()
    });
    closeModal();
    toast('价格已更新');
    document.getElementById('supplierProfileContent').innerHTML = this.renderPrices();
  },

  delPrice(id) {
    if (!hasPerm('supplier', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除', `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <div style="font-weight:600">确定删除此价格记录吗？</div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="supplier.confirmDelPrice(${id})">删除</button>`);
  },

  confirmDelPrice(id) {
    DB.delete('supplierPrices', id);
    closeModal();
    toast('价格已删除', 'warning');
    document.getElementById('supplierProfileContent').innerHTML = this.renderPrices();
  },

  // ===========================
  // 合同管理
  // ===========================
  renderContracts() {
    const contracts = DB.get('supplierContracts') || [];
    const supplierContracts = contracts.filter(c => c.supplierId === this.currentSupplierId);
    const today = new Date();

    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-muted)">共 ${supplierContracts.length} 份合同</div>
          <button class="btn btn-primary" onclick="supplier.openAddContract()">➕ 添加合同</button>
        </div>

        ${supplierContracts.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <div class="empty-state-text">暂无合同</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">点击上方按钮上传采购合同</div>
          </div>
        ` : `
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">
            ${supplierContracts.map(c => {
              const expired = c.endDate && new Date(c.endDate) < today;
              const warn = c.endDate && new Date(c.endDate) < new Date(today.getTime() + 30*86400000);
              return `
              <div style="padding:16px;background:var(--bg);border-radius:12px;border:1px solid var(--border)">
                <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
                  <div style="width:48px;height:48px;border-radius:8px;background:${expired?'#ef4444':'#6366f1'};display:flex;align-items:center;justify-content:center;color:white;font-size:20px;flex-shrink:0">📄</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:14px;margin-bottom:4px">${c.name || '采购合同'}</div>
                    <div style="font-size:12px;color:var(--text-muted)">合同编号: ${c.contractNo || '-'}</div>
                    <div style="font-size:12px;color:var(--text-muted)">金额: <span style="color:var(--success);font-weight:600">${c.amount ? fmtMoney(c.amount) : '-'}</span></div>
                  </div>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">
                  ${c.startDate ? '📅 ' + c.startDate : ''}${c.endDate ? ' ~ ' + c.endDate : ''}
                </div>
                ${c.endDate ? (expired
                  ? '<div style="padding:6px 10px;background:#fef2f2;color:#ef4444;border-radius:6px;font-size:12px;font-weight:500">⚠️ 已过期</div>'
                  : warn ? '<div style="padding:6px 10px;background:#fffbeb;color:#d97706;border-radius:6px;font-size:12px;font-weight:500">⚠️ 30天内到期</div>'
                  : '') : ''}
                <div style="display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
                  ${c.fileData ? `<button class="btn btn-outline btn-sm" style="flex:1" onclick="supplier.viewContract(${c.id})">👁 查看合同</button>` : ''}
                  <button class="btn btn-ghost btn-sm" onclick="supplier.editContract(${c.id})">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="supplier.delContract(${c.id})">🗑</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  openAddContract() {
    if (!hasPerm('supplier', 'create')) { toast('没有新建权限', 'error'); return; }
    openModal('添加合同', `
      <div class="form-row">
        <div class="form-item"><label>合同名称 *</label><input id="ctName" placeholder="如：年度采购框架合同"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合同编号</label><input id="ctNo" placeholder="如：CT-2026-001"></div>
        <div class="form-item"><label>合同金额(¥)</label><input id="ctAmount" type="number" step="0.01" min="0" placeholder="0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合同开始日期</label><input id="ctStart" type="date"></div>
        <div class="form-item"><label>合同结束日期</label><input id="ctEnd" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="ctNote" placeholder="合同说明或备注"></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>上传合同文件（PDF）</label>
          <div id="ctFileDrop" style="border:2px dashed var(--border);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:all 0.2s" onclick="document.getElementById('ctFileInput').click()" ondragover="event.preventDefault();this.style.borderColor='var(--primary)';this.style.background='var(--primary-light)'" ondragleave="this.style.borderColor='var(--border)';this.style.background=''" ondrop="event.preventDefault();supplier.handleFileDrop(event,'ct')">
            <div style="font-size:32px;margin-bottom:8px">📤</div>
            <div style="font-weight:600;color:var(--text)">拖拽文件到此处 或 点击上传</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px">支持 PDF 文件（最大10MB）</div>
            <input type="file" id="ctFileInput" accept=".pdf" style="display:none" onchange="supplier.handleFileSelect(this,'ct')">
          </div>
          <div id="ctFilePreview" style="margin-top:12px;display:none">
            <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg);border-radius:8px">
              <span id="ctFileIcon" style="font-size:24px">📄</span>
              <div style="flex:1">
                <div id="ctFileName" style="font-weight:500"></div>
                <div id="ctFileSize" style="font-size:12px;color:var(--text-muted)"></div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="supplier.removeFile('ct')">✕</button>
            </div>
          </div>
          <input type="hidden" id="ctFileData">
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveContract()">保存</button>`, '600px');
  },

  viewContract(id) {
    const c = DB.findById('supplierContracts', id);
    if (!c) return;
    if (c.fileData) {
      previewFile(c.fileData, c.fileName || c.name || '合同.pdf');
    } else {
      openModal('合同详情', `<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">📄</div><div style="font-weight:600">${c.name}</div><div style="color:var(--text-muted);margin-top:8px">文件未上传</div></div>`, `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`);
    }
  },

  editContract(id) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const c = DB.findById('supplierContracts', id);
    if (!c) return;
    openModal('编辑合同', `
      <div class="form-row">
        <div class="form-item"><label>合同名称</label><input id="cteName" value="${c.name || ''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>合同编号</label><input id="cteNo" value="${c.contractNo || ''}"></div>
        <div class="form-item"><label>合同金额(¥)</label><input id="cteAmount" type="number" step="0.01" value="${c.amount || 0}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>开始日期</label><input id="cteStart" type="date" value="${c.startDate || ''}"></div>
        <div class="form-item"><label>结束日期</label><input id="cteEnd" type="date" value="${c.endDate || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="cteNote" value="${c.note || ''}"></div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveEditContract(${id})">保存</button>`, '600px');
  },

  saveContract() {
    const name = document.getElementById('ctName').value.trim();
    if (!name) { toast('请输入合同名称', 'error'); return; }
    const ctData = {
      supplierId: this.currentSupplierId,
      name,
      contractNo: document.getElementById('ctNo').value.trim(),
      amount: parseFloat(document.getElementById('ctAmount').value) || 0,
      startDate: document.getElementById('ctStart').value,
      endDate: document.getElementById('ctEnd').value,
      note: document.getElementById('ctNote').value.trim(),
      fileName: document.getElementById('ctFileInput').files[0] ? document.getElementById('ctFileInput').files[0].name : '',
      fileSize: document.getElementById('ctFileInput').files[0] ? document.getElementById('ctFileInput').files[0].size : 0,
      fileData: document.getElementById('ctFileData').value || '',
      createdAt: new Date().toISOString()
    };
    DB.add('supplierContracts', ctData);
    audit.log('supplier', '添加合同', name, `供应商ID: ${this.currentSupplierId}`);
    closeModal();
    toast('合同已添加');
    document.getElementById('supplierProfileContent').innerHTML = this.renderContracts();
  },

  saveEditContract(id) {
    DB.update('supplierContracts', id, {
      name: document.getElementById('cteName').value.trim(),
      contractNo: document.getElementById('cteNo').value.trim(),
      amount: parseFloat(document.getElementById('cteAmount').value) || 0,
      startDate: document.getElementById('cteStart').value,
      endDate: document.getElementById('cteEnd').value,
      note: document.getElementById('cteNote').value.trim()
    });
    closeModal();
    toast('合同已更新');
    document.getElementById('supplierProfileContent').innerHTML = this.renderContracts();
  },

  delContract(id) {
    if (!hasPerm('supplier', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除', `
      <div style="text-align:center;padding:24px">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <div style="font-weight:600">确定删除此合同吗？</div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-danger" onclick="supplier.confirmDelContract(${id})">删除</button>`);
  },

  confirmDelContract(id) {
    DB.delete('supplierContracts', id);
    closeModal();
    toast('合同已删除', 'warning');
    document.getElementById('supplierProfileContent').innerHTML = this.renderContracts();
  },

  // ===========================
  // 编辑供应商档案（扩展信息）
  // ===========================
  openEditProfile(id) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const s = DB.findById('suppliers', id);
    if (!s) return;

    openModal('编辑供应商档案', `
      <div style="max-height:60vh;overflow-y:auto;padding-right:8px">
        <div style="font-size:14px;font-weight:600;margin-bottom:16px;color:var(--primary)">基本信息</div>
        <div class="form-row">
          <div class="form-item"><label>供应商名称 *</label><input id="sfName" value="${s.name}"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-item"><label>联系人</label><input id="sfContact" value="${s.contact || ''}"></div>
          <div class="form-item"><label>联系电话</label><input id="sfPhone" value="${s.phone || ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-item"><label>邮箱</label><input id="sfEmail" type="email" value="${s.email || ''}"></div>
          <div class="form-item"><label>合作开始日期</label><input id="sfCooperateDate" type="date" value="${s.cooperateDate || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-item"><label>详细地址</label><input id="sfAddress" value="${s.address || ''}"></div>
        </div>
        
        <div style="font-size:14px;font-weight:600;margin:20px 0 16px;color:var(--primary)">💼 资质信息</div>
        <div class="form-row cols-2">
          <div class="form-item"><label>统一社会信用代码</label><input id="sfLicense" value="${s.businessLicense || ''}"></div>
          <div class="form-item"><label>纳税人识别号</label><input id="sfTaxId" value="${s.taxId || ''}"></div>
        </div>
        <div class="form-row cols-2">
          <div class="form-item"><label>开户银行</label><input id="sfBankName" value="${s.bankName || ''}"></div>
          <div class="form-item"><label>银行账号</label><input id="sfBankAccount" value="${s.bankAccount || ''}"></div>
        </div>
        
        <div style="font-size:14px;font-weight:600;margin:20px 0 16px;color:var(--primary)">⭐ 评分</div>
        <div class="form-row">
          <div class="form-item">
            <label>供应商评分</label>
            <div style="display:flex;gap:8px">
              ${[1,2,3,4,5].map(i => `<button type="button" onclick="supplier.setRating(${i})" style="border:none;background:none;font-size:24px;cursor:pointer;color:${i <= (s.rating || 0) ? '#f59e0b' : '#e5e7eb'}" id="ratingStar${i}">★</button>`).join('')}
              <input type="hidden" id="sfRating" value="${s.rating || 0}">
            </div>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-item"><label>备注</label><textarea id="sfNote" rows="3">${s.note || ''}</textarea></div>
        </div>
      </div>
    `, `<button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="supplier.saveProfile(${id})">保存</button>`, '600px');
  },

  setRating(rating) {
    document.getElementById('sfRating').value = rating;
    for (let i = 1; i <= 5; i++) {
      const star = document.getElementById('ratingStar' + i);
      star.style.color = i <= rating ? '#f59e0b' : '#e5e7eb';
    }
  },

  saveProfile(id) {
    const name = document.getElementById('sfName').value.trim();
    if (!name) {
      toast('请输入供应商名称', 'error');
      return;
    }
    
    const categories = this.getSelectedCats('sCats');
    
    DB.update('suppliers', id, {
      name,
      contact: document.getElementById('sfContact').value.trim(),
      phone: document.getElementById('sfPhone').value.trim(),
      email: document.getElementById('sfEmail').value.trim(),
      address: document.getElementById('sfAddress').value.trim(),
      cooperateDate: document.getElementById('sfCooperateDate').value,
      businessLicense: document.getElementById('sfLicense').value.trim(),
      taxId: document.getElementById('sfTaxId').value.trim(),
      bankName: document.getElementById('sfBankName').value.trim(),
      bankAccount: document.getElementById('sfBankAccount').value.trim(),
      rating: parseInt(document.getElementById('sfRating').value) || 0,
      note: document.getElementById('sfNote').value.trim()
    });
    
    audit.log('supplier', '编辑档案', name, '更新供应商档案信息');
    closeModal();
    toast('档案已更新');
    this.reload();
  },

  // ===========================
  // 原有的增删改方法
  // ===========================
  openAdd() {
    if (!hasPerm('supplier', 'create')) { toast('没有新建权限', 'error'); return; }
    const cats = DB.get('categories') || [];
    const catsHtml = cats.map(c => `
      <label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg);border-radius:6px;cursor:pointer;font-size:13px;transition:all 0.2s">
        <input type="checkbox" value="${c.name}" onchange="supplier.updateCatsDisplay('sCats')"> ${c.icon || ''} ${c.name}
      </label>`).join('');
    openModal('新增供应商', `
      <div class="form-row">
        <div class="form-item" style="grid-column:span 2"><label>供应商名称 *</label><input id="sName" placeholder="请输入供应商全称"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系人 *</label><input id="sContact" placeholder="主要联系人姓名"></div>
        <div class="form-item"><label>联系电话 *</label><input id="sPhone" placeholder="手机/座机号码"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>电子邮箱</label><input id="sEmail" type="email" placeholder="email@example.com"></div>
        <div class="form-item"><label>合作开始日期</label><input id="sCooperateDate" type="date"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>详细地址</label><input id="sAddr" placeholder="省市区详细地址"></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>供应类目（可多选）</label>
          <div id="sCatsContainer" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            ${catsHtml}
          </div>
          <div id="sCatsSelected" style="font-size:12px;color:var(--text-muted);margin-top:6px">请选择分类（可多选）</div>
        </div>
      </div>`, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="supplier.save()">保存</button>`
    );
  },

  save() {
    const name = document.getElementById('sName').value.trim();
    const contact = document.getElementById('sContact').value.trim();
    const phone = document.getElementById('sPhone').value.trim();
    if (!name || !contact || !phone) { toast('请填写必填信息', 'error'); return; }
    
    const categories = this.getSelectedCats('sCats');
    
    DB.add('suppliers', {
      name, contact, phone,
      email: document.getElementById('sEmail').value,
      address: document.getElementById('sAddr').value,
      cooperateDate: document.getElementById('sCooperateDate').value,
      categories: categories,
      status: 1,
      rating: 0
    });
    
    audit.log('supplier', '新增', name, `联系方式: ${phone}, 类目: ${categories || '无'}`);
    closeModal(); toast('供应商添加成功！'); this.reload();
  },

  openEdit(id) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const s = DB.findById('suppliers', id);
    if (!s) return;
    const cats = DB.get('categories') || [];
    const selectedCats = s.categories ? s.categories.split(',') : [];
    const catsHtml = cats.map(c => {
      const checked = selectedCats.includes(c.name) ? 'checked' : '';
      return `<label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:${checked ? 'var(--primary-light)' : 'var(--bg)'};border-radius:6px;cursor:pointer;font-size:13px;transition:all 0.2s;color:${checked ? 'var(--primary)' : 'inherit'}">
        <input type="checkbox" value="${c.name}" ${checked} onchange="supplier.updateCatsDisplay('seCats')"> ${c.icon || ''} ${c.name}
      </label>`;
    }).join('');
    
    openModal('编辑供应商', `
      <div class="form-row">
        <div class="form-item" style="grid-column:span 2"><label>供应商名称</label><input id="seName" value="${s.name}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>联系人</label><input id="seContact" value="${s.contact}"></div>
        <div class="form-item"><label>联系电话</label><input id="sePhone" value="${s.phone}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>电子邮箱</label><input id="seEmail" value="${s.email||''}"></div>
        <div class="form-item"><label>详细地址</label><input id="seAddr" value="${s.address||''}"></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>供应类目（可多选）</label>
          <div id="seCatsContainer" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
            ${catsHtml}
          </div>
          <div id="seCatsSelected" style="font-size:12px;color:var(--text-muted);margin-top:6px">${selectedCats.length > 0 ? '已选: ' + selectedCats.join(', ') : '请选择分类（可多选）'}</div>
        </div>
      </div>`, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="supplier.saveEdit(${id})">保存修改</button>`
    );
  },

  saveEdit(id) {
    const s = DB.findById('suppliers', id);
    if (!s) return;
    
    const categories = this.getSelectedCats('seCats');
    
    DB.update('suppliers', id, {
      name: document.getElementById('seName').value,
      contact: document.getElementById('seContact').value,
      phone: document.getElementById('sePhone').value,
      email: document.getElementById('seEmail').value,
      address: document.getElementById('seAddr').value,
      categories: categories
    });
    
    audit.log('supplier', '编辑', s.name, `供应商信息已更新, 类目: ${categories || '无'}`);
    closeModal(); toast('供应商信息已更新！'); this.reload();
  },

  toggleStatus(id, status) {
    if (!hasPerm('supplier', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const s = DB.findById('suppliers', id);
    if (!s) return;
    const newStatus = status ? 0 : 1;
    DB.update('suppliers', id, { status: newStatus });
    audit.log('supplier', newStatus ? '启用' : '停用', s.name, `状态改为${newStatus ? '合作中' : '已停用'}`);
    toast(newStatus ? '供应商已启用' : '供应商已停用', newStatus ? 'success' : 'warning');
    this.reload();
  },

  del(id) {
    if (!hasPerm('supplier', 'delete')) { toast('没有删除权限', 'error'); return; }
    const s = DB.findById('suppliers', id);
    if (!s) return;

    openModal('确认删除', `
      <div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除供应商「${s.name}」吗？</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销</div>
      </div>`, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="supplier.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    const s = DB.findById('suppliers', id);
    // 同时删除关联的资质、价格和合同记录
    const quals = DB.get('supplierQualifications') || [];
    quals.filter(q => q.supplierId === id).forEach(q => DB.delete('supplierQualifications', q.id));
    const prices = DB.get('supplierPrices') || [];
    prices.filter(p => p.supplierId === id).forEach(p => DB.delete('supplierPrices', p.id));
    const contracts = DB.get('supplierContracts') || [];
    contracts.filter(c => c.supplierId === id).forEach(c => DB.delete('supplierContracts', c.id));
    
    DB.delete('suppliers', id);
    if (s) audit.log('supplier', '删除', s.name, '供应商已删除（含资质和价格）');
    closeModal();
    toast('供应商已删除', 'warning');
    this.reload();
  },

  updateCatsDisplay(prefix) {
    const container = document.getElementById(prefix + 'Container');
    const selectedDisplay = document.getElementById(prefix + 'Selected');
    if (!container || !selectedDisplay) return;
    
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    const names = checked.map(cb => cb.value);
    selectedDisplay.textContent = names.length > 0 ? `已选: ${names.join(', ')}` : '请选择分类（可多选）';
    
    container.querySelectorAll('label').forEach(label => {
      const cb = label.querySelector('input[type="checkbox"]');
      if (cb.checked) {
        label.style.background = 'var(--primary-light)';
        label.style.color = 'var(--primary)';
      } else {
        label.style.background = 'var(--bg)';
        label.style.color = 'inherit';
      }
    });
  },

  getSelectedCats(prefix) {
    const container = document.getElementById(prefix + 'Container');
    if (!container) return '';
    const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked'));
    return checked.map(cb => cb.value).join(',');
  },

  init() {},

  // 导出供应商CSV
  exportData() {
    if (!hasPerm('supplier', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('suppliers');
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const headers = ['供应商名称', '联系人', '联系电话', '邮箱', '地址', '供应类目', '状态', '评分', '合作日期', '信用代码', '纳税人识别号', '开户银行', '银行账号', '备注'];
    const rows = list.map(s => [s.name, s.contact, s.phone, s.email || '', s.address || '', s.categories || '', s.status ? '合作中' : '已停用', s.rating || 0, s.cooperateDate || '', s.businessLicense || '', s.taxId || '', s.bankName || '', s.bankAccount || '', s.note || '']);
    exportTableToCSV(headers, rows, `供应商列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条供应商`, 'success');
  },

  // 下载导入模板
  downloadTemplate() {
    const headers = ['供应商名称', '联系人', '联系电话', '邮箱', '地址', '供应类目', '合作日期', '信用代码', '备注'];
    const sample = ['XX有限公司', '张三', '13800138000', 'test@example.com', '北京市朝阳区', '电子产品,办公用品', '2025-01-01', '91110000XXXXXXXX', '长期合作供应商'];
    downloadImportTemplate(headers, sample, '供应商导入模板.csv');
  },

  // 导入供应商
  importData() {
    if (!hasPerm('supplier', 'import')) { toast('没有导入权限', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      const fieldMap = { '供应商名称': 'name', '联系人': 'contact', '联系电话': 'phone', '邮箱': 'email', '地址': 'address', '供应类目': 'categories', '状态': '_status', '评分': 'rating', '合作日期': 'cooperateDate', '信用代码': 'businessLicense', '纳税人识别号': 'taxId', '开户银行': 'bankName', '银行账号': 'bankAccount', '备注': 'note' };
      openImportPreview(file, 'suppliers', fieldMap, ['name', 'contact', 'phone'], function(obj) {
        if (obj._status === '已停用') obj.status = 0;
        else obj.status = 1;
        delete obj._status;
        if (obj.rating) obj.rating = parseInt(obj.rating) || 0;
        DB.add('suppliers', obj);
      });
    };
    input.click();
  },
};
