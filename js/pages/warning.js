// ===========================
// 预警中心（增强版 v2.1）
// ===========================

const warning = {
  activeTab: 'inventory',

  render() {
    const goodsList = DB.get('goods');
    const outStock = goodsList.filter(g => g.stock === 0);
    const lowStock = goodsList.filter(g => g.stock > 0 && g.stock <= g.minStock);
    const highStock = goodsList.filter(g => g.stock >= g.maxStock * 0.95 && g.maxStock > 0);
    const normalCount = goodsList.length - outStock.length - lowStock.length - highStock.length;

    // 设备维护预警
    const equipment = DB.get('equipment');
    const today = new Date().toISOString().slice(0, 10);
    const overdueMaint = equipment.filter(e => e.nextMaintenance && e.nextMaintenance < today && e.status !== '报废');
    const upcomingMaint = equipment.filter(e => {
      if (!e.nextMaintenance || e.status === '报废') return false;
      const diff = (new Date(e.nextMaintenance) - new Date(today)) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });

    // 售后工单预警
    const tickets = DB.get('serviceTickets') || [];
    const overdueTickets = tickets.filter(t => [0, 1].includes(t.status) && t.dueDate && t.dueDate < today);
    const pendingTickets = tickets.filter(t => t.status === 0);

    // 总预警数
    const totalWarnings = outStock.length + lowStock.length + overdueMaint.length + overdueTickets.length;

    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 总览 -->
      <div class="stat-cards" style="margin-bottom:16px;grid-template-columns:repeat(4,1fr)">
        <div class="stat-card red" onclick="warning.switchTab('inventory')">
          <div class="stat-icon red">❌</div>
          <div class="stat-info">
            <div class="stat-label">断货商品</div>
            <div class="stat-value">${outStock.length}</div>
            <div class="stat-change down">需立即补货</div>
          </div>
        </div>
        <div class="stat-card orange" onclick="warning.switchTab('inventory')">
          <div class="stat-icon orange">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">库存不足</div>
            <div class="stat-value">${lowStock.length}</div>
            <div class="stat-change">低于最低库存</div>
          </div>
        </div>
        <div class="stat-card purple" onclick="warning.switchTab('equipment')">
          <div class="stat-icon purple">🔧</div>
          <div class="stat-info">
            <div class="stat-label">设备维护到期</div>
            <div class="stat-value">${overdueMaint.length + upcomingMaint.length}</div>
            <div class="stat-change">${overdueMaint.length} 台已逾期</div>
          </div>
        </div>
        <div class="stat-card blue" onclick="warning.switchTab('service')">
          <div class="stat-icon blue">🎫</div>
          <div class="stat-info">
            <div class="stat-label">售后超时工单</div>
            <div class="stat-value">${overdueTickets.length}</div>
            <div class="stat-change">${pendingTickets.length} 单待处理</div>
          </div>
        </div>
      </div>

      <!-- 子标签 -->
      <div style="display:flex;gap:4px;background:white;padding:6px;border-radius:12px;margin-bottom:16px;box-shadow:var(--shadow);width:fit-content">
        ${[
          ['inventory', '📦 库存预警', outStock.length + lowStock.length],
          ['overstock', '📊 库存上限', highStock.length],
          ['equipment', '🔧 设备维护', overdueMaint.length + upcomingMaint.length],
          ['service', '🎫 售后工单', overdueTickets.length + pendingTickets.length]
        ].map(([k, v, c]) => `
          <button onclick="warning.switchTab('${k}')"
            style="padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;font-family:inherit;position:relative;
            ${this.activeTab===k?'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(79,110,247,0.4)':'background:transparent;color:var(--text-muted)'}"
          >${v}${c > 0 ? `<span style="margin-left:6px;background:${this.activeTab===k?'rgba(255,255,255,0.3)':'var(--danger)'};color:${this.activeTab===k?'white':'white'};font-size:11px;padding:1px 6px;border-radius:10px;font-weight:600">${c}</span>` : ''}</button>`).join('')}
      </div>

      <div id="warningContent">${this.renderTabContent({outStock, lowStock, highStock, normalCount, overdueMaint, upcomingMaint, overdueTickets, pendingTickets, equipment, tickets})}</div>
    </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    // 重新渲染整个页面
    const container = document.getElementById('pageContainer');
    if (container) container.innerHTML = this.render();
  },

  renderTabContent(data) {
    const { outStock, lowStock, highStock, normalCount, overdueMaint, upcomingMaint, overdueTickets, pendingTickets, equipment, tickets } = data;

    if (this.activeTab === 'inventory') {
      if (!outStock.length && !lowStock.length) {
        return `<div class="card" style="text-align:center;padding:60px">
          <div style="font-size:60px;margin-bottom:16px">🎉</div>
          <div style="font-size:18px;font-weight:600;color:var(--success);margin-bottom:8px">库存状态良好！</div>
          <div style="color:var(--text-muted)">所有商品库存均在正常范围内，无需处理</div>
        </div>`;
      }
      let html = '';
      if (outStock.length > 0) {
        html += `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--danger)">
          <div class="card-title" style="color:var(--danger)">❌ 断货商品（${outStock.length}种）— 需立即补货</div>
          ${this.renderWarnTable(outStock, 'danger')}
        </div>`;
      }
      if (lowStock.length > 0) {
        html += `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--warning)">
          <div class="card-title" style="color:var(--warning)">⚠️ 库存不足（${lowStock.length}种）— 建议及时补货</div>
          ${this.renderWarnTable(lowStock, 'warning')}
        </div>`;
      }
      return html;
    }

    if (this.activeTab === 'overstock') {
      if (!highStock.length) {
        return `<div class="card" style="text-align:center;padding:60px">
          <div style="font-size:60px;margin-bottom:16px">✅</div>
          <div style="font-size:18px;font-weight:600;color:var(--success);margin-bottom:8px">无库存超限</div>
          <div style="color:var(--text-muted)">所有商品库存均未接近上限</div>
        </div>`;
      }
      return `<div class="card" style="border-left:4px solid var(--info)">
        <div class="card-title" style="color:var(--info)">📦 接近上限（${highStock.length}种）— 注意仓储空间</div>
        ${this.renderWarnTable(highStock, 'info')}
      </div>`;
    }

    if (this.activeTab === 'equipment') {
      return this.renderEquipmentWarning(overdueMaint, upcomingMaint, equipment);
    }

    if (this.activeTab === 'service') {
      return this.renderServiceWarning(overdueTickets, pendingTickets, tickets);
    }

    return '';
  },

  renderEquipmentWarning(overdue, upcoming, all) {
    if (!overdue.length && !upcoming.length) {
      return `<div class="card" style="text-align:center;padding:60px">
        <div style="font-size:60px;margin-bottom:16px">🔧</div>
        <div style="font-size:18px;font-weight:600;color:var(--success);margin-bottom:8px">设备状态正常</div>
        <div style="color:var(--text-muted)">所有设备维护计划均在正常范围内</div>
      </div>`;
    }

    let html = '';
    if (overdue.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--danger)">
        <div class="card-title" style="color:var(--danger)">🚨 已逾期设备（${overdue.length}台）— 需立即安排维护</div>
        <div class="table-wrap"><table>
          <thead><tr><th>设备编码</th><th>设备名称</th><th>位置</th><th>计划维护日</th><th>逾期天数</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${overdue.map(e => {
            const days = Math.floor((new Date() - new Date(e.nextMaintenance)) / (1000*60*60*24));
            return `<tr>
              <td style="font-size:12px;color:var(--primary)">${e.code}</td>
              <td style="font-weight:600">${e.name}</td>
              <td>${e.location || '-'}</td>
              <td style="color:var(--danger);font-weight:600">${e.nextMaintenance}</td>
              <td><span class="badge badge-danger">逾期 ${days} 天</span></td>
              <td><span class="badge ${e.status==='运行中'?'badge-success':'badge-warning'}">${e.status}</span></td>
              <td><button class="btn btn-primary btn-sm" onclick="showPage('eam')">去处理</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    }

    if (upcoming.length > 0) {
      html += `<div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title" style="color:var(--warning)">⏰ 即将到期设备（${upcoming.length}台）— 7天内需维护</div>
        <div class="table-wrap"><table>
          <thead><tr><th>设备编码</th><th>设备名称</th><th>位置</th><th>计划维护日</th><th>剩余天数</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${upcoming.map(e => {
            const days = Math.floor((new Date(e.nextMaintenance) - new Date()) / (1000*60*60*24));
            return `<tr>
              <td style="font-size:12px;color:var(--primary)">${e.code}</td>
              <td style="font-weight:600">${e.name}</td>
              <td>${e.location || '-'}</td>
              <td style="color:var(--warning);font-weight:600">${e.nextMaintenance}</td>
              <td><span class="badge badge-warning">剩余 ${days} 天</span></td>
              <td><span class="badge ${e.status==='运行中'?'badge-success':'badge-warning'}">${e.status}</span></td>
              <td><button class="btn btn-outline btn-sm" onclick="showPage('eam')">查看详情</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    }
    return html;
  },

  renderServiceWarning(overdue, pending, all) {
    if (!overdue.length && !pending.length) {
      return `<div class="card" style="text-align:center;padding:60px">
        <div style="font-size:60px;margin-bottom:16px">🎫</div>
        <div style="font-size:18px;font-weight:600;color:var(--success);margin-bottom:8px">售后工单正常</div>
        <div style="color:var(--text-muted)">所有工单均按时处理中，无超时或待处理工单</div>
      </div>`;
    }

    let html = '';
    if (overdue.length > 0) {
      html += `<div class="card" style="margin-bottom:16px;border-left:4px solid var(--danger)">
        <div class="card-title" style="color:var(--danger)">🚨 超时未处理工单（${overdue.length}单）— 需紧急跟进</div>
        <div class="table-wrap"><table>
          <thead><tr><th>工单号</th><th>类型</th><th>客户</th><th>故障描述</th><th>截止日期</th><th>超时天数</th><th>优先级</th><th>操作</th></tr></thead>
          <tbody>${overdue.map(t => {
            const days = Math.floor((new Date() - new Date(t.dueDate)) / (1000*60*60*24));
            const priorityColor = t.priority === '高' ? 'var(--danger)' : t.priority === '中' ? 'var(--warning)' : 'var(--text-muted)';
            return `<tr>
              <td style="font-size:12px;color:var(--primary);font-family:monospace">${t.ticketNo}</td>
              <td><span class="badge badge-default">${t.type}</span></td>
              <td style="font-weight:600">${t.customerName}</td>
              <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.faultDesc}</td>
              <td style="color:var(--danger);font-weight:600">${t.dueDate}</td>
              <td><span class="badge badge-danger">超时 ${days} 天</span></td>
              <td><span style="font-weight:600;color:${priorityColor}">${t.priority}</span></td>
              <td><button class="btn btn-primary btn-sm" onclick="showPage('eam')">去处理</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    }

    if (pending.length > 0) {
      html += `<div class="card" style="border-left:4px solid var(--warning)">
        <div class="card-title" style="color:var(--warning)">⏳ 待处理工单（${pending.length}单）— 请尽快分配处理人</div>
        <div class="table-wrap"><table>
          <thead><tr><th>工单号</th><th>类型</th><th>客户</th><th>故障描述</th><th>创建日期</th><th>优先级</th><th>操作</th></tr></thead>
          <tbody>${pending.map(t => {
            const priorityColor = t.priority === '高' ? 'var(--danger)' : t.priority === '中' ? 'var(--warning)' : 'var(--text-muted)';
            return `<tr>
              <td style="font-size:12px;color:var(--primary);font-family:monospace">${t.ticketNo}</td>
              <td><span class="badge badge-default">${t.type}</span></td>
              <td style="font-weight:600">${t.customerName}</td>
              <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.faultDesc}</td>
              <td style="font-size:12px;color:var(--text-muted)">${t.createDate}</td>
              <td><span style="font-weight:600;color:${priorityColor}">${t.priority}</span></td>
              <td><button class="btn btn-outline btn-sm" onclick="showPage('eam')">去分配</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>`;
    }
    return html;
  },

  renderWarnTable(list, type) {
    const colorMap = { danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };
    const color = colorMap[type];
    return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>商品编码</th><th>商品名称</th><th>当前库存</th><th>最低库存</th><th>最高库存</th><th>存放位置</th><th>快速操作</th></tr></thead>
        <tbody>
          ${list.map(g => `
            <tr>
              <td style="font-size:12px;color:var(--primary)">${g.code}</td>
              <td style="font-weight:600">${g.name}</td>
              <td><span style="font-weight:700;font-size:15px;color:${color}">${g.stock}</span> ${g.unit}</td>
              <td>${g.minStock}</td>
              <td>${g.maxStock}</td>
              <td>${g.location || '-'}</td>
              <td>
                <button class="btn btn-primary btn-sm" onclick="showPage('inbound');setTimeout(()=>{inbound.openAdd();},100)" title="去入库">📥 入库</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  },

  init() {}
};
