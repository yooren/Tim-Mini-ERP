// ===========================
// 数据看板
// ===========================

const dashboard = {
  render() {
    const stats = DB.getStats();
    const goods = DB.get('goods');
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');

    // 售后工单数据（使用 getStats 已有统计 + 补充本月完成数）
    const tickets = DB.get('serviceTickets') || [];
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';
    stats.completedTickets = tickets.filter(t => t.status === 3 && t.endDate && t.endDate >= monthStart).length;

    // 近7天趋势数据
    const trendData = this.getTrendData(inbounds, outbounds);
    // 库存分类分布
    const catData = this.getCategoryData(goods);
    // 库存预警
    const warnings = goods.filter(g => g.stock <= g.minStock);
    // 最近入库
    const recentIn = [...inbounds].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
    // 最近出库
    const recentOut = [...outbounds].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

    // SVG 图标集

    const SVG = {
      box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      warehouse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      arrowDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>`,
      arrowUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 17 12 21 8 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>`,
      bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
      bars: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      pie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      serviceTicket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    };

    return `
    <div class="dashboard-page">
      <!-- 统计卡片 第一行 -->
      <div class="stat-cards">
        <div class="stat-card blue" onclick="showPage('goods')">
          <div class="stat-icon blue">${SVG.box}</div>
          <div class="stat-info">
            <div class="stat-label">商品种类</div>
            <div class="stat-value">${stats.totalGoods}</div>
            <div class="stat-change up">活跃商品 ${goods.filter(g=>g.status===1).length} 种</div>
          </div>
        </div>
        <div class="stat-card green" onclick="showPage('goods')">
          <div class="stat-icon green">${SVG.warehouse}</div>
          <div class="stat-info">
            <div class="stat-label">库存总量</div>
            <div class="stat-value">${fmt(stats.totalStock)}</div>
            <div class="stat-change up">库存价值 ${fmtMoney(stats.totalStockValue)}</div>
          </div>
        </div>
        <div class="stat-card orange" onclick="showPage('inbound')">
          <div class="stat-icon orange">${SVG.arrowDown}</div>
          <div class="stat-info">
            <div class="stat-label">今日入库</div>
            <div class="stat-value">${stats.todayInCount}</div>
            <div class="stat-change neutral">金额 ${fmtMoney(stats.todayInTotal)}</div>
          </div>
        </div>
        <div class="stat-card red" onclick="showPage('warning')">
          <div class="stat-icon red">${SVG.bell}</div>
          <div class="stat-info">
            <div class="stat-label">库存预警</div>
            <div class="stat-value">${stats.lowStock}</div>
            <div class="stat-change down">${stats.outOfStock} 种商品已断货</div>
          </div>
        </div>
      </div>

      <!-- 统计卡片 第二行 -->
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card blue" onclick="showPage('outbound')">
          <div class="stat-icon blue">${SVG.arrowUp}</div>
          <div class="stat-info">
            <div class="stat-label">今日出库</div>
            <div class="stat-value">${stats.todayOutCount}</div>
            <div class="stat-change neutral">金额 ${fmtMoney(stats.todayOutTotal)}</div>
          </div>
        </div>
        <div class="stat-card green" onclick="showPage('inbound')">
          <div class="stat-icon green">${SVG.file}</div>
          <div class="stat-info">
            <div class="stat-label">入库总单数</div>
            <div class="stat-value">${fmt(stats.totalInbounds)}</div>
            <div class="stat-change up">历史所有入库</div>
          </div>
        </div>
        <div class="stat-card orange" onclick="showPage('supplier')">
          <div class="stat-icon orange">${SVG.building}</div>
          <div class="stat-info">
            <div class="stat-label">供应商数量</div>
            <div class="stat-value">${stats.suppliers}</div>
            <div class="stat-change up">活跃合作伙伴</div>
          </div>
        </div>
        <div class="stat-card cyan" onclick="showPage('customer')">
          <div class="stat-icon cyan">${SVG.users}</div>
          <div class="stat-info">
            <div class="stat-label">客户数量</div>
            <div class="stat-value">${stats.customers}</div>
            <div class="stat-change up">已入档客户</div>
          </div>
        </div>
      </div>

      <!-- 统计卡片 第三行：售后管理 -->
      <div class="stat-cards" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card purple" onclick="showPage('eam')">
          <div class="stat-icon purple">${SVG.serviceTicket}</div>
          <div class="stat-info">
            <div class="stat-label">待处理工单</div>
            <div class="stat-value">${stats.pendingTickets}</div>
            <div class="stat-change down">需及时处理</div>
          </div>
        </div>
        <div class="stat-card orange" onclick="showPage('eam')">
          <div class="stat-icon orange">${SVG.serviceTicket}</div>
          <div class="stat-info">
            <div class="stat-label">处理中工单</div>
            <div class="stat-value">${stats.processingTickets}</div>
            <div class="stat-change neutral">进行中</div>
          </div>
        </div>
        <div class="stat-card green" onclick="showPage('eam')">
          <div class="stat-icon green">${SVG.serviceTicket}</div>
          <div class="stat-info">
            <div class="stat-label">本月已完成</div>
            <div class="stat-value">${stats.completedTickets}</div>
            <div class="stat-change up">本月处理完成</div>
          </div>
        </div>
        <div class="stat-card red" onclick="showPage('eam')">
          <div class="stat-icon red">${SVG.serviceTicket}</div>
          <div class="stat-info">
            <div class="stat-label">超时未完成</div>
            <div class="stat-value">${stats.overdueTickets}</div>
            <div class="stat-change down">需紧急处理</div>
          </div>
        </div>
      </div>

      <!-- 图表区 -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px">
        <div class="card">
          <div class="card-title">
            <span class="card-title-icon blue">${SVG.trend}</span>
            近30天入出库趋势
          </div>
          <div class="chart-wrap">
            <canvas id="trendChart" width="100%" height="240"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-title">
            <span class="card-title-icon orange">${SVG.pie}</span>
            库存分类分布
          </div>
          <div class="chart-wrap">
            <canvas id="pieChart" width="100%" height="240"></canvas>
          </div>
        </div>
      </div>

      <!-- 预警 + 快速操作 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px">
        <div class="card">
          <div class="card-title" style="justify-content:space-between">
            <span style="display:flex;align-items:center;gap:8px">
              <span class="card-title-icon red">${SVG.warning}</span>库存预警商品
            </span>
            <button class="btn btn-ghost btn-sm" onclick="showPage('warning')">查看全部</button>
          </div>
          ${warnings.length === 0 ?
          `<div class="empty-state">
            <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="empty-state-text">暂无预警商品</div>
            <div class="empty-state-desc">所有商品库存正常</div>
          </div>` :
          `<div class="table-wrap">
            <table>
              <thead><tr><th>商品名称</th><th>当前库存</th><th>最低库存</th><th>状态</th></tr></thead>
              <tbody>
                ${warnings.slice(0,6).map(g => `
                  <tr>
                    <td>${g.name}</td>
                    <td><span style="font-weight:700;color:${g.stock===0?'#ef4444':'#f59e0b'}">${g.stock}</span> <span style="color:var(--text-muted);font-size:12px">${g.unit}</span></td>
                    <td>${g.minStock} <span style="color:var(--text-muted);font-size:12px">${g.unit}</span></td>
                    <td>${g.stock === 0 ? '<span class="badge badge-danger">断货</span>' : '<span class="badge badge-warning">不足</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>`}
        </div>

        <div class="card">
          <div class="card-title">
            <span class="card-title-icon purple">${SVG.zap}</span>快速操作
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button class="quick-action-btn" onclick="showPage('inbound');setTimeout(()=>inbound.openAdd(),100)">
              <span class="qa-icon blue">${SVG.arrowDown}</span><span>新建入库单</span>
            </button>
            <button class="quick-action-btn" onclick="showPage('outbound');setTimeout(()=>outbound.openAdd(),100)">
              <span class="qa-icon orange">${SVG.arrowUp}</span><span>新建出库单</span>
            </button>
            <button class="quick-action-btn" onclick="showPage('goods');setTimeout(()=>goods.openAdd(),100)">
              <span class="qa-icon green">${SVG.box}</span><span>新增商品</span>
            </button>
            <button class="quick-action-btn" onclick="showPage('inventory')">
              <span class="qa-icon cyan">${SVG.check}</span><span>发起盘点</span>
            </button>
            <button class="quick-action-btn" onclick="showPage('report')">
              <span class="qa-icon purple">${SVG.bars}</span><span>生成报表</span>
            </button>
            <button class="quick-action-btn" onclick="showPage('supplier');setTimeout(()=>supplier.openAdd(),100)">
              <span class="qa-icon red">${SVG.building}</span><span>新增供应商</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 最近记录 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        <div class="card">
          <div class="card-title" style="justify-content:space-between">
            <span style="display:flex;align-items:center;gap:8px">
              <span class="card-title-icon green">${SVG.arrowDown}</span>最近入库
            </span>
            <button class="btn btn-ghost btn-sm" onclick="showPage('inbound')">更多</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>单号</th><th>商品</th><th>数量</th><th>日期</th></tr></thead>
              <tbody>
                ${recentIn.length ? recentIn.map(r => `
                  <tr>
                    <td style="color:var(--primary);font-size:12px;font-weight:600">${r.code}</td>
                    <td>${r.goodsName}</td>
                    <td style="font-weight:700;color:var(--success)">+${r.qty}</td>
                    <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">暂无记录</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="justify-content:space-between">
            <span style="display:flex;align-items:center;gap:8px">
              <span class="card-title-icon red">${SVG.arrowUp}</span>最近出库
            </span>
            <button class="btn btn-ghost btn-sm" onclick="showPage('outbound')">更多</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>单号</th><th>商品</th><th>数量</th><th>日期</th></tr></thead>
              <tbody>
                ${recentOut.length ? recentOut.map(r => `
                  <tr>
                    <td style="color:var(--primary);font-size:12px;font-weight:600">${r.code}</td>
                    <td>${r.goodsName}</td>
                    <td style="font-weight:700;color:var(--danger)">-${r.qty}</td>
                    <td style="font-size:12px;color:var(--text-muted)">${r.date}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">暂无记录</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <style>
    .dashboard-page { animation: fadeIn 0.35s ease; }

    .card-title-icon {
      width: 26px; height: 26px;
      border-radius: 7px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .card-title-icon svg { width: 14px; height: 14px; }
    .card-title-icon.blue { background: rgba(59,110,255,0.1); color: var(--primary); }
    .card-title-icon.green { background: rgba(16,185,129,0.1); color: var(--success); }
    .card-title-icon.orange { background: rgba(245,158,11,0.1); color: var(--warning); }
    .card-title-icon.red { background: rgba(239,68,68,0.1); color: var(--danger); }
    .card-title-icon.purple { background: rgba(124,58,237,0.1); color: var(--secondary); }
    .card-title-icon.cyan { background: rgba(14,165,233,0.1); color: var(--info); }

    .quick-action-btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 10px; padding: 18px 10px;
      background: var(--bg); border: 1.5px solid var(--border);
      border-radius: var(--radius-sm); cursor: pointer; font-size: 12.5px;
      color: var(--text-secondary); transition: all 0.25s ease; font-family: inherit;
      font-weight: 500;
    }
    .quick-action-btn:hover {
      background: var(--primary-light); border-color: var(--primary);
      color: var(--primary); transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59,110,255,0.12);
    }

    .qa-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.25s ease;
    }
    .qa-icon svg { width: 18px; height: 18px; }
    .qa-icon.blue { background: rgba(59,110,255,0.1); color: var(--primary); }
    .qa-icon.green { background: rgba(16,185,129,0.1); color: var(--success); }
    .qa-icon.orange { background: rgba(245,158,11,0.1); color: var(--warning); }
    .qa-icon.red { background: rgba(239,68,68,0.1); color: var(--danger); }
    .qa-icon.purple { background: rgba(124,58,237,0.1); color: var(--secondary); }
    .qa-icon.cyan { background: rgba(14,165,233,0.1); color: var(--info); }
    .quick-action-btn:hover .qa-icon { transform: scale(1.1); }
    </style>
    `;
  },

  init() {
    this.drawTrendChart();
    this.drawPieChart();
  },

  getTrendData(inbounds, outbounds) {
    const days = 30;
    const labels = [];
    const inData = [];
    const outData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      labels.push(d.getMonth() + 1 + '/' + d.getDate());
      inData.push(inbounds.filter(r => r.date === dateStr).reduce((s,r) => s + r.qty, 0));
      outData.push(outbounds.filter(r => r.date === dateStr).reduce((s,r) => s + r.qty, 0));
    }
    return { labels, inData, outData };
  },

  getCategoryData(goods) {
    const cats = DB.get('categories');
    return cats.map(c => ({
      name: c.name,
      value: goods.filter(g => g.category === c.id).reduce((s,g) => s + g.stock, 0)
    })).filter(c => c.value > 0);
  },

  drawTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');
    const { labels, inData, outData } = this.getTrendData(inbounds, outbounds);

    const ctx = canvas.getContext('2d');
    const W = canvas.parentElement.clientWidth || 600;
    const H = 220;
    canvas.width = W;
    canvas.height = H;

    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const maxVal = Math.max(...inData, ...outData, 10);

    ctx.clearRect(0, 0, W, H);

    // 网格
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i/4)), pad.left - 6, y + 4);
    }

    // 绘制折线
    const drawLine = (data, color, fill) => {
      if (data.every(v => v === 0)) return;
      const pts = data.map((v, i) => ({
        x: pad.left + (i / (data.length - 1)) * chartW,
        y: pad.top + (1 - v / maxVal) * chartH
      }));

      // 填充
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cp = (pts[i].x + pts[i-1].x) / 2;
        ctx.bezierCurveTo(cp, pts[i-1].y, cp, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.lineTo(pts[pts.length-1].x, pad.top + chartH);
      ctx.lineTo(pts[0].x, pad.top + chartH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
      grad.addColorStop(0, fill);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // 线
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const cp = (pts[i].x + pts[i-1].x) / 2;
        ctx.bezierCurveTo(cp, pts[i-1].y, cp, pts[i].y, pts[i].x, pts[i].y);
      }
      ctx.stroke();
    };

    drawLine(inData, '#10b981', 'rgba(16,185,129,0.12)');
    drawLine(outData, '#ef4444', 'rgba(239,68,68,0.12)');

    // X轴标签（每5天一个）
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((l, i) => {
      if (i % 5 === 0) {
        const x = pad.left + (i / (labels.length - 1)) * chartW;
        ctx.fillText(l, x, H - 8);
      }
    });

    // 图例
    ctx.fillStyle = '#10b981'; ctx.fillRect(W - 120, 10, 14, 3);
    ctx.fillStyle = '#475569'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('入库', W - 102, 14);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(W - 58, 10, 14, 3);
    ctx.fillStyle = '#475569';
    ctx.fillText('出库', W - 40, 14);
  },

  drawPieChart() {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;
    const goods = DB.get('goods');
    const data = this.getCategoryData(goods);
    if (!data.length) return;

    const W = canvas.parentElement.clientWidth || 300;
    const H = 220;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const colors = ['#3b6eff','#10b981','#f59e0b','#ef4444','#7c3aed','#0ea5e9'];
    const cx = W / 2 - 30;
    const cy = H / 2;
    const r = Math.min(cx, cy) - 20;
    const total = data.reduce((s, d) => s + d.value, 0);

    let startAngle = -Math.PI / 2;
    data.forEach((d, i) => {
      const slice = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      startAngle += slice;
    });

    // 中心圆（甜甜圈效果）
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 图例
    const lx = W - 110;
    data.forEach((d, i) => {
      const ly = 20 + i * 26;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      // 手动画圆角矩形路径（用 arcTo 而不是 ctx.roundRect()），
      // 因为 roundRect() 是较新的 Canvas API，部分浏览器/内核不支持，会导致整个图表渲染失败
      const rx = lx, ry = ly, rw = 10, rh = 10, rr = 3;
      ctx.moveTo(rx + rr, ry);
      ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, rr);
      ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, rr);
      ctx.arcTo(rx, ry + rh, rx, ry, rr);
      ctx.arcTo(rx, ry, rx + rw, ry, rr);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = '11.5px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      const pct = Math.round(d.value / total * 100);
      ctx.fillText(`${d.name} ${pct}%`, lx + 14, ly + 9);
    });

    // 中心文字
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fmt(total), cx, cy - 4);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('总库存', cx, cy + 14);
  }
};
