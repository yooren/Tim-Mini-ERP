// ===========================
// 库存盘点
// ===========================

const inventory = {
  currentCheck: null,

  render() {
    const records = DB.get('inventories');
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <span style="color:var(--text-muted);font-size:13px">共 ${records.length} 次盘点记录</span>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-primary" onclick="inventory.startNew()">🔍 发起新盘点</button>
        </div>
      </div>

      <!-- 盘点历史 -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-title">📋 盘点历史</div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>盘点单号</th><th>盘点日期</th><th>操作员</th>
              <th>商品数</th><th>差异数量</th><th>状态</th><th>备注</th><th>操作</th>
            </tr></thead>
            <tbody>
              ${records.length === 0 ? '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">暂无盘点记录</td></tr>' :
                records.reverse().map(r => `
                  <tr>
                    <td><span style="color:var(--primary);font-family:monospace;font-size:12px">${r.code}</span></td>
                    <td>${r.date}</td>
                    <td>${r.operator}</td>
                    <td>${r.items} 种</td>
                    <td>
                      ${r.diff > 0 ? `<span style="color:var(--success);font-weight:600">+${r.diff}</span>` :
                        r.diff < 0 ? `<span style="color:var(--danger);font-weight:600">${r.diff}</span>` :
                        '<span style="color:var(--text-muted)">无差异</span>'}
                    </td>
                    <td>
                      ${r.status === '已完成' ? '<span class="badge badge-success">已完成</span>' :
                        r.status === '进行中' ? '<span class="badge badge-warning">进行中</span>' :
                        '<span class="badge badge-default">草稿</span>'}
                    </td>
                    <td style="font-size:12px;color:var(--text-muted)">${r.note || '-'}</td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="inventory.viewRecord(${r.id})">查看</button>
                      <button class="btn btn-outline btn-sm" onclick="PrintManager.printInventory(${r.id})">🖨 打印</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 当前库存快照 -->
      <div class="card">
        <div class="card-title">📦 当前库存状态</div>
        ${this.renderStockSnapshot()}
      </div>
    </div>`;
  },

  renderStockSnapshot() {
    const goodsList = DB.get('goods');
    const cats = DB.get('categories');
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });

    return `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>商品编码</th><th>商品名称</th><th>分类</th>
          <th>账面库存</th><th>最低库存</th><th>最高库存</th><th>库存价值</th><th>状态</th>
        </tr></thead>
        <tbody>
          ${goodsList.map(g => {
            const cat = catMap[g.category];
            let status = '';
            if (g.stock === 0) status = '<span class="badge badge-danger">断货</span>';
            else if (g.stock <= g.minStock) status = '<span class="badge badge-warning">库存不足</span>';
            else if (g.stock >= g.maxStock * 0.9) status = '<span class="badge badge-info">接近上限</span>';
            else status = '<span class="badge badge-success">正常</span>';
            return `
              <tr>
                <td><code style="font-size:12px;color:var(--primary)">${g.code}</code></td>
                <td style="font-weight:600">${g.name}</td>
                <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-weight:700;font-size:15px">${g.stock}</span>
                    <span style="font-size:11px;color:var(--text-muted)">${g.unit}</span>
                    <div class="progress" style="width:60px;height:6px">
                      <div class="progress-inner" style="width:${Math.min(100, g.maxStock>0?g.stock/g.maxStock*100:0)}%;
                        background:${g.stock===0?'var(--danger)':g.stock<=g.minStock?'var(--warning)':'var(--success)'}"></div>
                    </div>
                  </div>
                </td>
                <td style="color:var(--warning)">${g.minStock}</td>
                <td style="color:var(--info)">${g.maxStock}</td>
                <td style="font-weight:600">${fmtMoney(g.stock * g.cost)}</td>
                <td>${status}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  },

  startNew() {
    if (!hasPerm('inventory', 'create')) { toast('没有新建权限', 'error'); return; }
    const goodsList = DB.get('goods');
    const code = DB.genCode('IC');
    const today = new Date().toISOString().slice(0,10);

    openModal('发起库存盘点', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>盘点单号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
        &nbsp;|&nbsp; <strong>盘点日期：</strong>${today}
        &nbsp;|&nbsp; <strong>操作员：</strong>${currentUser.name}
      </div>
      <div class="form-item" style="margin-bottom:16px">
        <label>盘点备注</label>
        <input id="icNote" placeholder="如：月末例行盘点、专项盘点等">
      </div>
      <div class="table-wrap" style="max-height:360px;overflow-y:auto">
        <table>
          <thead><tr>
            <th>商品名称</th><th>账面库存</th><th>实际数量</th><th>差异</th>
          </tr></thead>
          <tbody id="checkItems">
            ${goodsList.map((g, i) => `
              <tr>
                <td>
                  <div style="font-weight:600;font-size:13px">${g.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${g.code}</div>
                </td>
                <td style="font-weight:700;color:var(--primary)">${g.stock} ${g.unit}</td>
                <td>
                  <input type="number" id="actualQty_${g.id}" value="${g.stock}" min="0"
                    style="width:80px;padding:6px 8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px"
                    oninput="inventory.calcDiff(${g.id},${g.stock})">
                </td>
                <td id="diff_${g.id}" style="font-weight:600;color:var(--text-muted)">0</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-warning" onclick="inventory.saveCheck('${code}','${today}')">保存盘点结果</button>`,
      true
    );
  },

  calcDiff(gid, book) {
    const actual = +document.getElementById(`actualQty_${gid}`).value;
    const diff = actual - book;
    const el = document.getElementById(`diff_${gid}`);
    el.textContent = diff > 0 ? `+${diff}` : diff;
    el.style.color = diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)';
  },

  saveCheck(code, date) {
    const goodsList = DB.get('goods');
    let totalDiff = 0;
    goodsList.forEach(g => {
      const el = document.getElementById(`actualQty_${g.id}`);
      if (!el) return;
      const actual = +el.value;
      const diff = actual - g.stock;
      if (diff !== 0) {
        DB.update('goods', g.id, { stock: actual });
        totalDiff += diff;
      }
    });

    DB.add('inventories', {
      code,
      date,
      operator: currentUser.username,
      status: '已完成',
      note: document.getElementById('icNote').value,
      items: goodsList.length,
      diff: totalDiff
    });

    audit.log('inventory', '盘点', code, `盘点${goodsList.length}种商品, 差异: ${totalDiff > 0 ? '+' : ''}${totalDiff}`);
    closeModal();
    toast(`盘点完成！共盘点 ${goodsList.length} 种商品，差异 ${totalDiff > 0 ? '+' : ''}${totalDiff}`, 'success');
    showPage('inventory');
    updateWarningBadge();
  },

  viewRecord(id) {
    const r = DB.findById('inventories', id);
    if (!r) return;
    openModal('盘点记录详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          ['盘点单号', `<code style="color:var(--primary)">${r.code}</code>`],
          ['盘点日期', r.date],
          ['操作员', r.operator],
          ['状态', r.status === '已完成' ? '<span class="badge badge-success">已完成</span>' : '<span class="badge badge-warning">进行中</span>'],
          ['商品总数', `${r.items} 种`],
          ['差异总量', r.diff > 0 ? `<span style="color:var(--success);font-weight:700">+${r.diff}</span>` : r.diff < 0 ? `<span style="color:var(--danger);font-weight:700">${r.diff}</span>` : '无差异'],
          ['备注', r.note || '-']
        ].map(([k,v]) => `
          <div style="background:var(--bg);border-radius:8px;padding:12px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${k}</div>
            <div style="font-size:14px;font-weight:500">${v}</div>
          </div>`).join('')}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       <button class="btn btn-danger" onclick="inventory.del(${r.id})">删除记录</button>`
    );
  },

  del(id) {
    if (!hasPerm('inventory', 'delete')) { toast('没有删除权限', 'error'); return; }
    openModal('确认删除',
      `<div style="text-align:center;padding:24px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div style="font-size:15px;color:#0f172a;font-weight:600;">确定要删除该盘点记录吗？</div>
        <div style="font-size:13px;color:#94a3b8;margin-top:6px;">此操作无法撤销</div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="inventory.confirmDel(${id})">确认删除</button>`
    );
  },

  confirmDel(id) {
    const r = DB.findById('inventories', id);
    DB.delete('inventories', id);
    if (r) audit.log('inventory', '删除', r.code, `盘点单号: ${r.code}, 日期: ${r.date}`);
    closeModal();
    toast('盘点记录已删除', 'warning');
    showPage('inventory');
  },

  init() {}
};
