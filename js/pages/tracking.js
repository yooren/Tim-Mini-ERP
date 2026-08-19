// ===========================
// 物流跟踪
// ===========================

const tracking = {
  page: 1,
  pageSize: 12,
  keyword: '',

  render() {
    const stats = this.getStats();
    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 统计卡片 -->
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
        <div class="stat-card orange">
          <div class="stat-icon orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">待发货</div>
            <div class="stat-value">${stats.pending}</div>
          </div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">配送中</div>
            <div class="stat-value">${stats.shipping}</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">已签收</div>
            <div class="stat-value">${stats.delivered}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div class="stat-info">
            <div class="stat-label">本月运费</div>
            <div class="stat-value" style="font-size:20px">${fmtMoney(stats.monthFreight)}</div>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索计划号/客户..." value="${this.keyword}"
              oninput="tracking.keyword=this.value;tracking.page=1;tracking.reload()">
          </div>
        </div>
      </div>
      <div class="card" id="trackingCard">${this.renderTable()}</div>
    </div>`;
  },

  getStats() {
    const plans = DB.get('transportPlans');
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return {
      pending: plans.filter(p => p.status === '待发货').length,
      shipping: plans.filter(p => p.status === '已发货' || p.status === '配送中').length,
      delivered: plans.filter(p => p.status === '已签收').length,
      monthFreight: plans.filter(p => p.status === '已签收' && (p.shipDate || '').startsWith(thisMonth)).reduce((s, p) => s + (p.freightFee || 0), 0)
    };
  },

  renderTable() {
    let list = DB.get('transportPlans').filter(p => p.status === '已发货' || p.status === '配送中');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.planNo || '').toLowerCase().includes(kw) || 
        (r.customerName || '').toLowerCase().includes(kw) ||
        (r.carrierName || '').toLowerCase().includes(kw)
      );
    }
    list = list.sort((a, b) => (b.shipDate || '').localeCompare(a.shipDate || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📍</div><div class="empty-state-text">暂无配送中的货物</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>计划号</th><th>承运商</th><th>客户</th><th>收货地址</th><th>发货日期</th><th>预计到达</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const progress = this.getProgress(r);
          const statusBadge = r.status === '已发货' ? 'badge-info' : 'badge-primary';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.planNo}</span></td>
            <td>${r.carrierName || '-'}</td>
            <td><strong>${r.customerName || '-'}</strong></td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.deliveryAddress || ''}">${r.deliveryAddress || '-'}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.shipDate || '-'}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.estimatedArrival || '-'}</td>
            <td><span class="badge ${statusBadge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="tracking.viewTimeline(${r.id})">📍 轨迹</button>
                <button class="btn btn-outline btn-sm" onclick="transportPlan.updateProgress(${r.id})">🔄 更新</button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'tracking.goPage')}`;
  },

  getProgress(r) {
    const shipDate = r.shipDate ? new Date(r.shipDate) : new Date();
    const estDate = r.estimatedArrival ? new Date(r.estimatedArrival) : new Date(shipDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const total = estDate - shipDate;
    const elapsed = now - shipDate;
    return Math.min(100, Math.max(0, Math.round(elapsed / total * 100)));
  },

  reload() {
    const card = document.getElementById('trackingCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  viewTimeline(id) {
    const r = DB.findById('transportPlans', id);
    if (!r) return;

    const timeline = [
      { time: r.shipDate + ' 09:00', title: '已发货', desc: '货物已离开仓库，交由' + r.carrierName + '承运', done: true },
      { time: r.shipDate + ' 14:00', title: '运输中', desc: '货物正在运输途中', done: true },
      { time: r.estimatedArrival || '-', title: '预计到达', desc: '预计送达时间', done: false },
    ];

    openModal('物流轨迹 - ' + r.planNo, `
      <div style="margin-bottom:20px;padding:12px;background:var(--bg);border-radius:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:12px;color:var(--text-muted)">承运商</div>
            <div style="font-weight:600">${r.carrierName}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted)">收货人</div>
            <div style="font-weight:600">${r.customerName}</div>
          </div>
          <div>
            <div style="font-size:12px;color:var(--text-muted)">运费</div>
            <div style="font-weight:600;color:var(--success)">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:16px;font-size:13px;color:var(--text-muted)">收货地址：${r.deliveryAddress || '-'}</div>
      <div class="timeline">
        ${timeline.map((t, i) => `
          <div style="display:flex;gap:16px;margin-bottom:20px;position:relative">
            <div style="width:12px;height:12px;border-radius:50%;background:${t.done ? 'var(--success)' : 'var(--border)'};flex-shrink:0;margin-top:4px;${i < timeline.length - 1 ? 'position:absolute;left:5px;top:20px;width:2px;height:calc(100% + 16px);background:var(--border)' : ''}"></div>
            <div style="padding-left:20px">
              <div style="font-weight:600;${t.done ? 'color:var(--text)' : 'color:var(--text-muted)'}">${t.title}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${t.time}</div>
              <div style="font-size:13px;margin-top:4px">${t.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${r.status !== '已签收' ? `<button class="btn btn-primary" onclick="closeModal();transportPlan.updateProgress(${id})">确认签收</button>` : ''}`
    );
  }
};
