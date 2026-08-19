// ===========================
// 商品管理
// ===========================

const goods = {
  page: 1,
  pageSize: 10,
  keyword: '',
  catFilter: '',
  statusFilter: '',

  render() {
    const cats = DB.get('categories');
    return `
    <div class="goods-page" style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" id="goodsSearchInput" placeholder="搜索商品名称/编码/位置/规格/条码..." value="${this.keyword}"
              oninput="goods.keyword=this.value;goods.page=1;goods.reload()">
          </div>
          <select class="filter-select" onchange="goods.catFilter=this.value;goods.page=1;goods.reload()">
            <option value="">所有分类</option>
            ${cats.map(c => `<option value="${c.id}" ${this.catFilter==c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
          <select class="filter-select" onchange="goods.statusFilter=this.value;goods.page=1;goods.reload()">
            <option value="">所有状态</option>
            <option value="1" ${this.statusFilter=='1'?'selected':''}>正常</option>
            <option value="0" ${this.statusFilter=='0'?'selected':''}>下架</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-ghost" onclick="goods.openCategories()">🏷️ 分类管理</button>
          <button class="btn btn-outline" id="goodsScanSearchBtn" onclick="goods.scanSearch()" title="点击后扫描条码快速查找商品">📷 扫码查找</button>
          <button class="btn btn-outline" onclick="goods.exportData()">📥 导出</button>
          <button class="btn btn-outline" onclick="goods.importData()">📤 导入</button>
          <button class="btn btn-ghost" onclick="goods.downloadTemplate()">📝 模板</button>
          <button class="btn btn-primary" onclick="goods.openAdd()">+ 新增商品</button>
        </div>
      </div>

      <div class="card" id="goodsTableCard">
        ${this.renderTable()}
      </div>
    </div>`;
  },

  renderTable() {
    const allGoods = DB.get('goods');
    const cats = DB.get('categories');
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });

    let list = allGoods;
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(g => g.name.toLowerCase().includes(kw) || g.code.toLowerCase().includes(kw) || (g.location||'').toLowerCase().includes(kw) || (g.spec||'').toLowerCase().includes(kw) || (g.barcode||'').toLowerCase().includes(kw));
    }
    if (this.catFilter) list = list.filter(g => g.category == this.catFilter);
    if (this.statusFilter !== '') list = list.filter(g => g.status == this.statusFilter);

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无商品</div><div class="empty-state-desc">点击右上角"新增商品"添加第一个商品</div></div>`;

    return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th style="width:60px">图片</th>
            <th>编码</th>
            <th>商品名称</th>
            <th>规格</th>
            <th>条码</th>
            <th>效期/批次</th>
            <th>分类</th>
            <th>单位</th>
            <th>成本价</th>
            <th>销售价</th>
            <th>当前库存</th>
            <th>预警状态</th>
            <th>存放位置</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${pageData.map(g => {
            const cat = catMap[g.category];
            let stockBadge = '';
            if (g.stock === 0) stockBadge = '<span class="badge badge-danger">断货</span>';
            else if (g.stock <= g.minStock) stockBadge = '<span class="badge badge-warning">不足</span>';
            else stockBadge = '<span class="badge badge-success">正常</span>';
            
            // 效期状态判断
            let expiryBadge = '';
            if (g.expiry) {
              const today = new Date();
              const expiryDate = new Date(g.expiry);
              const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
              if (diffDays < 0) expiryBadge = '<span class="badge badge-danger" title="已过期">已过期</span>';
              else if (diffDays <= 30) expiryBadge = `<span class="badge badge-warning" title="剩${diffDays}天">剩${diffDays}天</span>`;
              else expiryBadge = '<span class="badge badge-success" title="正常">正常</span>';
            }
            
            const imgThumb = g.image
              ? `<div class="goods-thumb-wrap" onmouseenter="goods.showImgPreview(event,'${g.image.replace(/'/g,"\\'")}','${g.name.replace(/'/g,"\\'")}','${fmtMoney(g.price)}')" onmouseleave="goods.hideImgPreview()">
                   <img class="goods-thumb" src="${g.image}" alt="${g.name}" onerror="this.parentElement.innerHTML=goods.thumbPlaceholder()">
                 </div>`
              : `<div class="goods-thumb-wrap goods-thumb-empty" onclick="goods.openEdit(${g.id})" title="点击上传图片">
                   ${goods.thumbPlaceholder()}
                 </div>`;
            return `
            <tr>
              <td>${imgThumb}</td>
              <td><span style="font-family:monospace;font-size:12px;color:var(--primary)">${g.code}</span></td>
              <td>
                <div style="font-weight:600">${g.name}</div>
                ${g.desc ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${g.desc.slice(0,30)}</div>` : ''}
              </td>
              <td><span style="font-size:12px;color:var(--text-muted)">${g.spec || '-'}</span></td>
              <td><span style="font-size:12px;font-family:monospace;color:var(--text-muted)">${g.barcode || '-'}</span></td>
              <td>
                <div style="font-size:11px">
                  ${g.expiry ? `<div>${g.expiry} ${expiryBadge}</div>` : '-'}
                  ${g.batch ? `<div style="color:var(--text-muted);margin-top:2px">批次:${g.batch}</div>` : ''}
                </div>
              </td>
              <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
              <td>${g.unit}</td>
              <td>${fmtMoney(g.cost)}</td>
              <td style="color:var(--success);font-weight:600">${fmtMoney(g.price)}</td>
              <td>
                <span style="font-weight:700;font-size:15px;color:${g.stock===0?'var(--danger)':g.stock<=g.minStock?'var(--warning)':'var(--text)'}">${g.stock}</span>
                <span style="font-size:11px;color:var(--text-muted)"> ${g.unit}</span>
              </td>
              <td>${stockBadge}</td>
              <td><span style="font-size:12px;background:var(--bg);padding:2px 8px;border-radius:4px">${g.location || '-'}</span></td>
              <td>${g.status === 1 ? '<span class="badge badge-success">正常</span>' : '<span class="badge badge-default">下架</span>'}</td>
              <td>
                <div style="display:flex;gap:4px">
                  <button class="btn btn-ghost btn-sm" onclick="goods.openView(${g.id})" title="查看">👁</button>
                  <button class="btn btn-outline btn-sm" onclick="goods.openEdit(${g.id})" title="编辑">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="goods.del(${g.id})" title="删除">🗑</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${renderPagination(total, this.page, this.pageSize, 'goods.goPage')}`;
  },

  reload() {
    const card = document.getElementById('goodsTableCard');
    if (card) card.innerHTML = this.renderTable();
  },

  search(kw) { this.keyword = kw; this.page = 1; this.reload(); },

  goPage(p) {
    const allGoods = DB.get('goods');
    const total = Math.ceil(allGoods.length / goods.pageSize);
    if (p < 1 || p > total) return;
    goods.page = p;
    goods.reload();
  },

  init() {},

  // 缩略图占位
  thumbPlaceholder() {
    return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>`;
  },

  // 显示图片预览浮层
  showImgPreview(e, imgUrl, name, price) {
    const el = document.getElementById('goodsImgPreview');
    const img = document.getElementById('goodsImgPreviewImg');
    const info = document.getElementById('goodsImgPreviewInfo');
    if (!el) return;
    img.src = imgUrl;
    info.innerHTML = `<span class="preview-name">${name}</span><span class="preview-price">${price}</span>`;
    el.classList.add('active');
    goods._movePreview(e);
  },

  // 隐藏图片预览浮层
  hideImgPreview() {
    const el = document.getElementById('goodsImgPreview');
    if (el) el.classList.remove('active');
  },

  // 随鼠标移动预览框位置（在 mousemove 时更新）
  _movePreview(e) {
    const el = document.getElementById('goodsImgPreview');
    if (!el || !el.classList.contains('active')) return;
    const W = window.innerWidth, H = window.innerHeight;
    const pw = 240, ph = 280;
    let x = e.clientX + 16, y = e.clientY + 16;
    if (x + pw > W - 16) x = e.clientX - pw - 16;
    if (y + ph > H - 16) y = e.clientY - ph - 16;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  },

  openAdd() {
    if (!hasPerm('goods', 'create')) { toast('没有新建权限', 'error'); return; }
    const cats = DB.get('categories');
    const suppliers = DB.get('suppliers');
    const nextId = DB.nextId('goods');
    const defaultCode = 'G' + String(nextId).padStart(4, '0');
    openModal('新增商品', `
      <div class="form-row cols-2">
        <div class="form-item">
          <label>商品编码</label>
          <input id="gCode" value="${defaultCode}" placeholder="设备类请手动输入编码">
          <div id="gCodeTip" style="font-size:11px;color:var(--text-muted);margin-top:2px">自动生成，可直接使用</div>
        </div>
        <div class="form-item"><label>商品名称 *</label><input id="gName" placeholder="请输入商品名称"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>商品分类 *</label>
          <select id="gCat" onchange="goods.onCatChange(this)">${cats.map(c=>`<option value="${c.id}" data-name="${c.name}">${c.icon} ${c.name}</option>`).join('')}</select>
        </div>
        <div class="form-item">
          <label>计量单位</label>
          <div style="display:flex;gap:6px">
            <select id="gUnit" style="flex:1">
              <option value="">-- 请选择 --</option>
              ${(DB.get('units')||[]).filter(u=>u.status===1).map(u=>`<option value="${u.name}">${u.name}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-ghost" style="padding:0 10px;font-size:12px" onclick="goods.openAddUnit('gUnit')" title="新增单位">+</button>
          </div>
        </div>
        <div class="form-item">
          <label>存放位置</label>
          <div style="display:flex;gap:6px">
            <select id="gLoc" style="flex:1">
              <option value="">-- 请选择 --</option>
              ${(DB.get('locations')||[]).filter(l=>l.status===1).map(l=>`<option value="${l.code}">${l.code}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-ghost" style="padding:0 10px;font-size:12px" onclick="goods.openAddLocation('gLoc')" title="新增库位">+</button>
          </div>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>成本价(¥)</label><input id="gCost" type="number" min="0" step="0.01" value="0"></div>
        <div class="form-item"><label>销售价(¥)</label><input id="gPrice" type="number" min="0" step="0.01" value="0"></div>
        <div class="form-item"><label>初始库存</label><input id="gStock" type="number" min="0" value="0"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>最低库存(预警)</label><input id="gMin" type="number" min="0" value="10"></div>
        <div class="form-item"><label>最大库存</label><input id="gMax" type="number" min="0" value="1000"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>规格</label><input id="gSpec" placeholder="如: 256GB/白色"></div>
        <div class="form-item">
          <label>条码 <span style="font-size:11px;color:var(--text-muted)">支持扫码枪</span></label>
          <div style="display:flex;gap:6px">
            <input id="gBarcode" placeholder="商品条形码" style="flex:1">
            <button type="button" class="scan-btn" id="gScanBtn" onclick="goods.toggleScan('add')">📷 扫码</button>
          </div>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>保质期</label><input id="gExpiry" type="date" placeholder="有效截止日期"></div>
        <div class="form-item"><label>批次号</label><input id="gBatch" placeholder="如: 20250110-001"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>默认供应商</label>
          <select id="gSupplier"><option value="">请选择</option>${suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
        </div>
        <div class="form-item"><label>状态</label>
          <select id="gStatus"><option value="1">正常</option><option value="0">下架</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>商品描述</label><textarea id="gDesc" rows="2" placeholder="商品详细描述（可选）"></textarea></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>商品图片</label>
          <div class="img-upload-area" id="gImgArea" onclick="document.getElementById('gImgFile').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="goods.handleImgDrop(event,'gImgPreview','gImgUrl')">
            <input type="file" id="gImgFile" accept="image/*" style="display:none" onchange="goods.handleImgFile(this,'gImgPreview','gImgUrl')">
            <div id="gImgPreview" class="img-upload-preview">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style="font-size:13px;color:var(--text-muted);margin-top:6px">点击或拖拽上传图片</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">支持 JPG / PNG / WebP</div>
            </div>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;color:var(--text-muted)">或输入图片链接：</span>
            <input id="gImgUrl" placeholder="https://..." style="flex:1;font-size:12px" oninput="goods.previewImgUrl('gImgUrl','gImgPreview')">
          </div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="goods.save()">保存商品</button>`
    );
  },

  // 切换商品分类时，设备类改为手动输入编码
  onCatChange(select) {
    const selectedOpt = select.options[select.selectedIndex];
    const catName = selectedOpt.dataset.name || '';
    const codeInput = document.getElementById('gCode');
    const tip = document.getElementById('gCodeTip');
    if (catName.includes('设备')) {
      codeInput.value = '';
      codeInput.placeholder = '请手动输入设备编码';
      codeInput.readOnly = false;
      codeInput.style.background = 'white';
      if (tip) tip.innerHTML = '<span style="color:var(--warning)">⚠️ 设备类需手动输入编码</span>';
    } else {
      // 恢复自动编码
      const nextId = DB.nextId('goods');
      const autoCode = 'G' + String(nextId).padStart(4, '0');
      codeInput.value = autoCode;
      codeInput.placeholder = '';
      codeInput.readOnly = true;
      codeInput.style.background = '#f0f2f8';
      if (tip) tip.innerHTML = '自动生成，可直接使用';
    }
  },

  save() {
    const name = document.getElementById('gName').value.trim();
    if (!name) { toast('请输入商品名称', 'error'); return; }
    const cats = DB.get('categories');
    const catId = +document.getElementById('gCat').value;
    const cat = cats.find(c => c.id === catId);
    const isEquipment = cat && cat.name.includes('设备');
    let code = document.getElementById('gCode').value.trim();
    if (isEquipment) {
      if (!code) { toast('设备类商品必须输入商品编码', 'error'); return; }
    } else {
      if (!code) { const nextId = DB.nextId('goods'); code = 'G' + String(nextId).padStart(4, '0'); }
    }
    const imgUrl = document.getElementById('gImgUrl') ? document.getElementById('gImgUrl').value.trim() : '';
    // 优先使用 base64（本地上传），否则用 URL
    const imgInput = document.getElementById('gImgFile');
    let finalImg = imgUrl;
    if (imgInput && imgInput._base64) finalImg = imgInput._base64;
    DB.add('goods', {
      code,
      name,
      category: +document.getElementById('gCat').value,
      unit: document.getElementById('gUnit').value || '个',
      location: document.getElementById('gLoc').value,
      cost: +document.getElementById('gCost').value,
      price: +document.getElementById('gPrice').value,
      stock: +document.getElementById('gStock').value,
      minStock: +document.getElementById('gMin').value,
      maxStock: +document.getElementById('gMax').value,
      spec: document.getElementById('gSpec').value.trim(),
      barcode: document.getElementById('gBarcode').value.trim(),
      expiry: document.getElementById('gExpiry').value,
      batch: document.getElementById('gBatch').value.trim(),
      supplierId: +document.getElementById('gSupplier').value || null,
      status: +document.getElementById('gStatus').value,
      desc: document.getElementById('gDesc').value,
      image: finalImg
    });
    audit.log('goods', '新增', name, `编码: ${code}, 初始库存: ${document.getElementById('gStock').value}`);
    closeModal();
    toast('商品添加成功！');
    this.reload();
    updateWarningBadge();
  },

  openEdit(id) {
    if (!hasPerm('goods', 'edit')) { toast('没有编辑权限', 'error'); return; }
    const g = DB.findById('goods', id);
    if (!g) return;
    const cats = DB.get('categories');
    const suppliers = DB.get('suppliers');
    openModal('编辑商品', `
      <div class="form-row cols-2">
        <div class="form-item"><label>商品编码</label><input value="${g.code}" readonly style="background:#f0f2f8"></div>
        <div class="form-item"><label>商品名称 *</label><input id="geName" value="${g.name}"></div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>商品分类</label>
          <select id="geCat">${cats.map(c=>`<option value="${c.id}" ${c.id===g.category?'selected':''}>${c.icon} ${c.name}</option>`).join('')}</select>
        </div>
        <div class="form-item">
          <label>计量单位</label>
          <div style="display:flex;gap:6px">
            <select id="geUnit" style="flex:1">
              <option value="">-- 请选择 --</option>
              ${(DB.get('units')||[]).filter(u=>u.status===1).map(u=>`<option value="${u.name}" ${u.name===g.unit?'selected':''}>${u.name}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-ghost" style="padding:0 10px;font-size:12px" onclick="goods.openAddUnit('geUnit')" title="新增单位">+</button>
          </div>
        </div>
        <div class="form-item">
          <label>存放位置</label>
          <div style="display:flex;gap:6px">
            <select id="geLoc" style="flex:1">
              <option value="">-- 请选择 --</option>
              ${(DB.get('locations')||[]).filter(l=>l.status===1).map(l=>`<option value="${l.code}" ${l.code===g.location?'selected':''}>${l.code}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-ghost" style="padding:0 10px;font-size:12px" onclick="goods.openAddLocation('geLoc')" title="新增库位">+</button>
          </div>
        </div>
      </div>
      <div class="form-row cols-3">
        <div class="form-item"><label>成本价(¥)</label><input id="geCost" type="number" value="${g.cost}"></div>
        <div class="form-item"><label>销售价(¥)</label><input id="gePrice" type="number" value="${g.price}"></div>
        <div class="form-item"><label>当前库存</label><input value="${g.stock}" readonly style="background:#f0f2f8;color:var(--primary);font-weight:600"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>最低库存</label><input id="geMin" type="number" value="${g.minStock}"></div>
        <div class="form-item"><label>最大库存</label><input id="geMax" type="number" value="${g.maxStock}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>规格</label><input id="geSpec" value="${g.spec||''}"></div>
        <div class="form-item">
          <label>条码 <span style="font-size:11px;color:var(--text-muted)">支持扫码枪</span></label>
          <div style="display:flex;gap:6px">
            <input id="geBarcode" value="${g.barcode||''}" style="flex:1">
            <button type="button" class="scan-btn" id="geScanBtn" onclick="goods.toggleScan('edit')">📷 扫码</button>
          </div>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>保质期</label><input id="geExpiry" type="date" value="${g.expiry||''}"></div>
        <div class="form-item"><label>批次号</label><input id="geBatch" value="${g.batch||''}"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>默认供应商</label>
          <select id="geSupplier"><option value="">请选择</option>${suppliers.map(s=>`<option value="${s.id}" ${s.id===g.supplierId?'selected':''}>${s.name}</option>`).join('')}</select>
        </div>
        <div class="form-item"><label>状态</label>
          <select id="geStatus"><option value="1" ${g.status===1?'selected':''}>正常</option><option value="0" ${g.status===0?'selected':''}>下架</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>商品描述</label><textarea id="geDesc" rows="2">${g.desc||''}</textarea></div>
      </div>
      <div class="form-row">
        <div class="form-item">
          <label>商品图片</label>
          <div class="img-upload-area" id="geImgArea" onclick="document.getElementById('geImgFile').click()" ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="goods.handleImgDrop(event,'geImgPreview','geImgUrl')">
            <input type="file" id="geImgFile" accept="image/*" style="display:none" onchange="goods.handleImgFile(this,'geImgPreview','geImgUrl')">
            <div id="geImgPreview" class="img-upload-preview">
              ${g.image ? `<img src="${g.image}" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:contain" onerror="this.remove()">
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击替换图片</div>` :
              `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style="font-size:13px;color:var(--text-muted);margin-top:6px">点击或拖拽上传图片</div>`}
            </div>
          </div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;color:var(--text-muted)">或输入图片链接：</span>
            <input id="geImgUrl" placeholder="https://..." value="${g.image||''}" style="flex:1;font-size:12px" oninput="goods.previewImgUrl('geImgUrl','geImgPreview')">
          </div>
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="goods.saveEdit(${id})">保存修改</button>`
    );
  },

  saveEdit(id) {
    const name = document.getElementById('geName').value.trim();
    if (!name) { toast('请输入商品名称', 'error'); return; }
    const imgUrlInput = document.getElementById('geImgUrl');
    const imgFileInput = document.getElementById('geImgFile');
    let finalImg = imgUrlInput ? imgUrlInput.value.trim() : '';
    if (imgFileInput && imgFileInput._base64) finalImg = imgFileInput._base64;
    DB.update('goods', id, {
      name,
      category: +document.getElementById('geCat').value,
      unit: document.getElementById('geUnit').value,
      location: document.getElementById('geLoc').value,
      cost: +document.getElementById('geCost').value,
      price: +document.getElementById('gePrice').value,
      minStock: +document.getElementById('geMin').value,
      maxStock: +document.getElementById('geMax').value,
      spec: document.getElementById('geSpec').value.trim(),
      barcode: document.getElementById('geBarcode').value.trim(),
      expiry: document.getElementById('geExpiry').value,
      batch: document.getElementById('geBatch').value.trim(),
      supplierId: +document.getElementById('geSupplier').value || null,
      status: +document.getElementById('geStatus').value,
      desc: document.getElementById('geDesc').value,
      image: finalImg
    });
    audit.log('goods', '编辑', name, `编码: ${DB.findById('goods', id).code}`);
    closeModal();
    toast('商品信息已更新！');
    this.reload();
    updateWarningBadge();
  },

  openView(id) {
    const g = DB.findById('goods', id);
    if (!g) return;
    const cats = DB.get('categories');
    const cat = cats.find(c => c.id === g.category);
    const inHistory = DB.get('inbounds').filter(r => r.goodsId === id).slice(-5).reverse();
    const outHistory = DB.get('outbounds').filter(r => r.goodsId === id).slice(-5).reverse();
    openModal('商品详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          ${g.image ? `<div style="background:var(--bg);border-radius:12px;padding:16px;text-align:center;margin-bottom:14px;border:1px solid var(--border)">
            <img src="${g.image}" alt="${g.name}" style="max-width:100%;max-height:160px;object-fit:contain;border-radius:8px" onerror="this.parentElement.style.display='none'">
          </div>` : ''}
          <div style="font-size:20px;font-weight:700;margin-bottom:8px">${g.name}</div>
          <div style="color:var(--text-muted);font-size:13px;margin-bottom:12px">${g.desc || '暂无描述'}</div>
          <table style="width:100%;font-size:13px">
            ${[
              ['编码', `<code style="background:var(--bg);padding:2px 8px;border-radius:4px">${g.code}</code>`],
              ['分类', cat ? `${cat.icon} ${cat.name}` : '-'],
              ['规格', g.spec || '-'],
              ['条码', g.barcode ? `<code style="background:var(--bg);padding:2px 8px;border-radius:4px;font-size:12px">${g.barcode}</code>` : '-'],
              ['保质期', g.expiry || '-'],
              ['批次号', g.batch ? `<code style="background:var(--bg);padding:2px 8px;border-radius:4px;font-size:12px">${g.batch}</code>` : '-'],
              ['单位', g.unit],
              ['存放位置', g.location || '-'],
              ['创建时间', g.createdAt]
            ].map(([k,v]) => `<tr><td style="color:var(--text-muted);padding:6px 0;width:80px">${k}</td><td style="padding:6px 0;font-weight:500">${v}</td></tr>`).join('')}
          </table>
        </div>
        <div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div style="background:var(--primary-light);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:var(--primary)">${g.stock}</div>
              <div style="font-size:12px;color:var(--text-muted)">当前库存(${g.unit})</div>
            </div>
            <div style="background:rgba(16,185,129,0.1);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:18px;font-weight:700;color:var(--success)">${fmtMoney(g.price)}</div>
              <div style="font-size:12px;color:var(--text-muted)">销售价</div>
            </div>
            <div style="background:rgba(245,158,11,0.1);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:18px;font-weight:700;color:var(--warning)">${fmtMoney(g.cost)}</div>
              <div style="font-size:12px;color:var(--text-muted)">成本价</div>
            </div>
            <div style="background:rgba(59,130,246,0.1);border-radius:10px;padding:14px;text-align:center">
              <div style="font-size:18px;font-weight:700;color:var(--info)">${fmtMoney(g.stock * g.cost)}</div>
              <div style="font-size:12px;color:var(--text-muted)">库存价值</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted)">
            预警范围: ${g.minStock} ~ ${g.maxStock} ${g.unit}
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--success)">📥 最近入库</div>
          ${inHistory.length ? inHistory.map(r => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
              <span style="color:var(--text-muted)">${r.date}</span>
              <span style="font-weight:600;color:var(--success)">+${r.qty} ${g.unit}</span>
            </div>`).join('') : '<div style="color:var(--text-muted);font-size:12px">暂无记录</div>'}
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--danger)">📤 最近出库</div>
          ${outHistory.length ? outHistory.map(r => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
              <span style="color:var(--text-muted)">${r.date}</span>
              <span style="font-weight:600;color:var(--danger)">-${r.qty} ${g.unit}</span>
            </div>`).join('') : '<div style="color:var(--text-muted);font-size:12px">暂无记录</div>'}
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-primary" onclick="closeModal();goods.openEdit(${id})">编辑商品</button>`,
      true
    );
  },

  del(id) {
    if (!hasPerm('goods', 'delete')) { toast('没有删除权限', 'error'); return; }
    // 先检查是否有关联的入库/出库记录
    const inbounds = DB.get('inbounds').filter(r => r.goodsId === id);
    const outbounds = DB.get('outbounds').filter(r => r.goodsId === id);
    const totalRelated = inbounds.length + outbounds.length;
    
    openModal('确认删除', 
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除该商品吗？</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销${totalRelated > 0 ? `，同时将删除 ${totalRelated} 条关联的出入库记录` : ''}</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="goods.confirmDel(${id}, ${inbounds.length}, ${outbounds.length})">确认删除</button>`
    );
  },

  confirmDel(id, inboundCount, outboundCount) {
    const g = DB.findById('goods', id);
    // 清理关联记录
    if (inboundCount > 0) {
      const allInbounds = DB.get('inbounds').filter(r => r.goodsId !== id);
      DB.set('inbounds', allInbounds);
    }
    if (outboundCount > 0) {
      const allOutbounds = DB.get('outbounds').filter(r => r.goodsId !== id);
      DB.set('outbounds', allOutbounds);
    }
    
    // 删除商品
    DB.delete('goods', id);
    if (g) audit.log('goods', '删除', g.name, `编码: ${g.code}, 关联删除入库${inboundCount}条/出库${outboundCount}条`);
    closeModal();
    toast('商品已删除', 'warning');
    this.reload();
  },

  openCategories() {
    const cats = DB.get('categories');
    const goods = DB.get('goods');
    openModal('分类管理', `
      <div style="margin-bottom:16px">
        <div class="form-row cols-3">
          <div class="form-item"><label>分类图标</label><input id="catIcon" placeholder="如: 📦" value="📦" style="font-size:20px"></div>
          <div class="form-item" style="grid-column:span 2"><label>分类名称</label><input id="catName" placeholder="请输入分类名称"></div>
        </div>
        <button class="btn btn-primary" onclick="goods.addCategory()">添加分类</button>
      </div>
      <div class="divider"></div>
      <div id="catList">
        ${cats.map(c => {
          const count = goods.filter(g => g.category === c.id).length;
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--bg);border-radius:8px;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:20px">${c.icon}</span>
              <div>
                <div style="font-weight:600;font-size:13px">${c.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${count} 种商品</div>
              </div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="goods.delCategory(${c.id})" ${count>0?'disabled title="有商品无法删除"':''}>删除</button>
          </div>`;
        }).join('')}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>`
    );
  },

  addCategory() {
    if (!hasPerm('goods', 'create')) { toast('没有新建权限', 'error'); return; }
    const icon = document.getElementById('catIcon').value.trim() || '📦';
    const name = document.getElementById('catName').value.trim();
    if (!name) { toast('请输入分类名称', 'error'); return; }
    DB.add('categories', { name, icon, count: 0 });
    audit.log('goods', '新增分类', name, `${icon} ${name}`);
    toast('分类添加成功！');
    closeModal();
    this.openCategories();
  },

  delCategory(id) {
    if (!hasPerm('goods', 'delete')) { toast('没有删除权限', 'error'); return; }
    const cat = DB.findById('categories', id);
    DB.delete('categories', id);
    if (cat) audit.log('goods', '删除分类', cat.name, `${cat.icon} ${cat.name}`);
    toast('分类已删除', 'warning');
    closeModal();
    this.openCategories();
    this.reload();
  },

  // 打开新增计量单位弹窗
  openAddUnit(selectId) {
    openModal('新增计量单位', `
      <div style="padding:12px 0">
        <div class="form-item" style="margin-bottom:16px">
          <label>单位名称 *</label>
          <input id="newUnitName" placeholder="如: 卷/包/桶/支">
        </div>
        <div class="form-item" style="margin-bottom:16px">
          <label>说明</label>
          <input id="newUnitDesc" placeholder="如: 缠绕膜/包装袋">
        </div>
      </div>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="goods.addUnit('${selectId}')">确认添加</button>
    `);
  },

  // 添加计量单位
  addUnit(selectId) {
    if (!hasPerm('goods', 'create')) { toast('没有新建权限', 'error'); return; }
    const name = document.getElementById('newUnitName').value.trim();
    const desc = document.getElementById('newUnitDesc').value.trim();
    if (!name) { toast('请输入单位名称', 'error'); return; }
    
    // 检查是否已存在
    const units = DB.get('units') || [];
    if (units.some(u => u.name === name)) {
      toast('该单位已存在', 'error'); return;
    }
    
    const id = units.length > 0 ? Math.max(...units.map(u => u.id)) + 1 : 1;
    DB.add('units', { id, name, desc, status: 1 });
    audit.log('goods', '新增计量单位', name, desc || '无说明');
    closeModal();
    toast('计量单位添加成功！');
    
    // 刷新下拉框
    this.refreshUnitSelect(selectId);
  },

  // 刷新计量单位下拉框
  refreshUnitSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const units = DB.get('units') || [];
    select.innerHTML = '<option value="">-- 请选择 --</option>' +
      units.filter(u => u.status === 1).map(u => `<option value="${u.name}">${u.name}</option>`).join('');
  },

  // 打开新增库位弹窗
  openAddLocation(selectId) {
    openModal('新增库位', `
      <div style="padding:12px 0">
        <div class="form-row cols-2" style="margin-bottom:16px">
          <div class="form-item">
            <label>库区 *</label>
            <select id="newLocZone">
              <option value="A区">A区</option>
              <option value="B区">B区</option>
              <option value="C区">C区</option>
              <option value="D区">D区</option>
              <option value="E区">E区</option>
              <option value="F区">F区</option>
              <option value="G区">G区</option>
              <option value="H区">H区</option>
            </select>
          </div>
          <div class="form-item">
            <label>类型</label>
            <select id="newLocType">
              <option value="货架">货架</option>
              <option value="地面">地面</option>
              <option value="堆叠区">堆叠区</option>
              <option value="阁楼">阁楼</option>
              <option value="冷冻区">冷冻区</option>
            </select>
          </div>
        </div>
        <div class="form-row cols-2" style="margin-bottom:16px">
          <div class="form-item">
            <label>排号 *</label>
            <input id="newLocRow" type="number" min="1" value="1" placeholder="1">
          </div>
          <div class="form-item">
            <label>列号 *</label>
            <input id="newLocCol" type="number" min="1" value="1" placeholder="1">
          </div>
        </div>
        <div style="padding:10px;background:var(--bg);border-radius:8px;font-size:13px">
          <div style="color:var(--text-muted)">库位编码预览：</div>
          <div id="locPreview" style="font-size:18px;font-weight:700;color:var(--primary);margin-top:4px">A-01-01</div>
        </div>
      </div>
      <script>
        function updateLocPreview() {
          const zone = document.getElementById('newLocZone').value.replace('区','');
          const row = String(document.getElementById('newLocRow').value || '1').padStart(2,'0');
          const col = String(document.getElementById('newLocCol').value || '1').padStart(2,'0');
          document.getElementById('locPreview').textContent = zone + '-' + row + '-' + col;
        }
        document.getElementById('newLocZone').addEventListener('change', updateLocPreview);
        document.getElementById('newLocRow').addEventListener('input', updateLocPreview);
        document.getElementById('newLocCol').addEventListener('input', updateLocPreview);
      </script>
    `, `
      <button class="btn btn-ghost" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="goods.addLocation('${selectId}')">确认添加</button>
    `);
  },

  // 添加库位
  addLocation(selectId) {
    if (!hasPerm('goods', 'create')) { toast('没有新建权限', 'error'); return; }
    const zone = document.getElementById('newLocZone').value;
    const type = document.getElementById('newLocType').value;
    const row = parseInt(document.getElementById('newLocRow').value) || 1;
    const col = parseInt(document.getElementById('newLocCol').value) || 1;
    const code = zone.replace('区','') + '-' + String(row).padStart(2,'0') + '-' + String(col).padStart(2,'0');

    // 检查是否已存在
    const locations = DB.get('locations') || [];
    if (locations.some(l => l.code === code)) {
      toast('该库位已存在', 'error'); return;
    }

    const id = locations.length > 0 ? Math.max(...locations.map(l => l.id)) + 1 : 1;
    DB.add('locations', { id, code, zone, row, col, type, status: 1 });
    audit.log('goods', '新增库位', code, `${zone} ${type}`);
    closeModal();
    toast('库位添加成功！');

    // 刷新下拉框
    this.refreshLocationSelect(selectId);
  },

  // 刷新库位下拉框
  refreshLocationSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const locations = DB.get('locations') || [];
    select.innerHTML = '<option value="">-- 请选择 --</option>' +
      locations.filter(l => l.status === 1).map(l => `<option value="${l.code}">${l.code}</option>`).join('');
  },

  // 处理文件上传
  handleImgFile(input, previewId, urlInputId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      input._base64 = e.target.result;
      const prev = document.getElementById(previewId);
      if (prev) {
        prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:contain">
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击替换图片</div>`;
      }
      const urlInput = document.getElementById(urlInputId);
      if (urlInput) urlInput.value = '';
    };
    reader.readAsDataURL(file);
  },

  // 拖拽上传
  handleImgDrop(e, previewId, urlInputId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const prev = document.getElementById(previewId);
      if (prev) {
        prev.innerHTML = `<img src="${ev.target.result}" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:contain">
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击替换图片</div>`;
        prev._dropBase64 = ev.target.result;
      }
      const urlInput = document.getElementById(urlInputId);
      if (urlInput) { urlInput.value = ''; urlInput._dropBase64 = ev.target.result; }
    };
    reader.readAsDataURL(file);
  },

  // URL 输入实时预览
  previewImgUrl(urlInputId, previewId) {
    const url = document.getElementById(urlInputId).value.trim();
    const prev = document.getElementById(previewId);
    if (!prev) return;
    if (!url) {
      prev.innerHTML = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><div style="font-size:13px;color:var(--text-muted);margin-top:6px">点击或拖拽上传图片</div>`;
      return;
    }
    prev.innerHTML = `<img src="${url}" style="max-width:100%;max-height:120px;border-radius:8px;object-fit:contain" onerror="this.parentElement.innerHTML='<span style=color:var(--danger);font-size:12px>图片链接无效</span>'">
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">点击替换图片</div>`;
  },

  // ===== 扫码枪功能 =====
  toggleScan(mode) {
    const btnId = mode === 'add' ? 'gScanBtn' : 'geScanBtn';
    const btn = document.getElementById(btnId);

    if (BarcodeScanner.isActive()) {
      // 已激活 → 关闭
      BarcodeScanner.deactivate();
      if (btn) btn.classList.remove('active');
    } else {
      // 激活扫码模式
      BarcodeScanner.activate((code, match) => {
        // 扫码完成后关闭扫码模式
        BarcodeScanner.deactivate();
        if (btn) btn.classList.remove('active');
      });
      if (btn) btn.classList.add('active');
    }
  },

  // 商品列表页快速扫码搜索
  scanSearch() {
    if (BarcodeScanner.isActive()) {
      BarcodeScanner.deactivate();
      const btn = document.getElementById('goodsScanSearchBtn');
      if (btn) btn.classList.remove('active');
      return;
    }

    BarcodeScanner.activate((code, match) => {
      // 扫码后填入搜索框并搜索
      const searchInput = document.getElementById('goodsSearchInput');
      if (searchInput) {
        searchInput.value = code;
        this.keyword = code;
        this.page = 1;
        this.reload();
      }
      // 如果精确匹配到条码，高亮提示
      if (match) {
        toast(`扫码找到: ${match.name}`, 'success');
      }
      BarcodeScanner.deactivate();
      const btn = document.getElementById('goodsScanSearchBtn');
      if (btn) btn.classList.remove('active');
    });

    const btn = document.getElementById('goodsScanSearchBtn');
    if (btn) btn.classList.add('active');
    toast('扫码就绪，请扫描条码...', 'info');
  },

  // 导出商品CSV
  exportData() {
    if (!hasPerm('goods', 'export')) { toast('没有导出权限', 'error'); return; }
    const list = DB.get('goods');
    if (!list.length) { toast('没有可导出的数据', 'warning'); return; }
    const cats = DB.get('categories');
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c.name; });
    const headers = ['编码', '名称', '规格', '条码', '批次', '有效期', '分类', '单位', '成本价', '销售价', '库存', '最低库存', '最高库存', '位置', '状态'];
    const rows = list.map(g => [g.code, g.name, g.spec || '', g.barcode || '', g.batch || '', g.expiry || '', catMap[g.category] || '', g.unit || '', g.cost || 0, g.price || 0, g.stock || 0, g.minStock || 0, g.maxStock || 0, g.location || '', g.status === 1 ? '正常' : '下架']);
    exportTableToCSV(headers, rows, `商品列表_${new Date().toISOString().slice(0,10)}.csv`);
    toast(`已导出 ${list.length} 条商品`, 'success');
  },

  // 下载导入模板
  downloadTemplate() {
    const headers = ['编码', '名称', '规格', '条码', '批次', '有效期', '分类', '单位', '成本价', '销售价', '库存', '最低库存', '最高库存', '位置', '状态'];
    const sample = ['G0001', '示例商品', '100g/袋', '6901234567890', 'B20250101', '2026-12-31', '电子产品', '个', '10.00', '15.00', '100', '10', '500', 'A-01-01', '正常'];
    downloadImportTemplate(headers, sample, '商品导入模板.csv');
  },

  // 导入商品
  importData() {
    if (!hasPerm('goods', 'import')) { toast('没有导入权限', 'error'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = function() {
      const file = this.files[0];
      if (!file) return;
      const cats = DB.get('categories');
      const catNameMap = {};
      cats.forEach(c => { catNameMap[c.name] = c.id; });
      const fieldMap = { '编码': 'code', '名称': 'name', '规格': 'spec', '条码': 'barcode', '批次': 'batch', '有效期': 'expiry', '分类': '_categoryName', '单位': 'unit', '成本价': 'cost', '销售价': 'price', '库存': 'stock', '最低库存': 'minStock', '最高库存': 'maxStock', '位置': 'location', '状态': '_status' };
      openImportPreview(file, 'goods', fieldMap, ['name'], function(obj) {
        // 分类名称转ID
        if (obj._categoryName) {
          obj.category = catNameMap[obj._categoryName] || null;
          delete obj._categoryName;
        }
        // 状态文字转数字
        if (obj._status === '下架') obj.status = 0;
        else obj.status = 1;
        delete obj._status;
        // 数值转换
        ['cost','price','stock','minStock','maxStock'].forEach(f => { if (obj[f] !== undefined) obj[f] = parseFloat(obj[f]) || 0; });
        // 自动生成编码
        if (!obj.code) { const nextId = DB.nextId('goods'); obj.code = 'G' + String(nextId).padStart(4, '0'); }
        DB.add('goods', obj);
      });
    };
    input.click();
  },

  init() {}
};
