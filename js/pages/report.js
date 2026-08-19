// ===========================
// 报表中心
// ===========================

const report = {
  activeTab: 'inout',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <!-- 标签页 -->
      <div id="reportTabs" style="display:flex;gap:4px;background:white;padding:6px;border-radius:12px;margin-bottom:16px;box-shadow:var(--shadow);width:fit-content">
        ${[
          ['inout','📊 出入库报表'],
          ['stock','📦 库存报表'],
          ['value','💰 价值报表']
        ].map(([k,v]) => `
          <button onclick="report.switchTab('${k}')"
            style="padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;font-family:inherit;
            ${this.activeTab===k?'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(79,110,247,0.4)':'background:transparent;color:var(--text-muted)'}"
          >${v}</button>`).join('')}
      </div>

      <div id="reportContent">
        ${this.renderTabContent()}
      </div>
    </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabs = [
      ['inout','📊 出入库报表'],
      ['stock','📦 库存报表'],
      ['value','💰 价值报表']
    ];
    document.getElementById('reportTabs').innerHTML = tabs.map(([k,v]) => `
      <button onclick="report.switchTab('${k}')"
        style="padding:8px 18px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;font-family:inherit;
        ${this.activeTab===k?'background:var(--primary);color:white;box-shadow:0 2px 8px rgba(79,110,247,0.4)':'background:transparent;color:var(--text-muted)'}"
      >${v}</button>`).join('');
    document.getElementById('reportContent').innerHTML = this.renderTabContent();
    this.initCharts();
  },

  renderTabContent() {
    if (this.activeTab === 'inout') return this.renderInoutReport();
    if (this.activeTab === 'stock') return this.renderStockReport();
    if (this.activeTab === 'value') return this.renderValueReport();
    return '';
  },

  renderInoutReport() {
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');

    // 月度汇总
    const monthMap = {};
    inbounds.forEach(r => {
      const m = r.date.slice(0,7);
      if (!monthMap[m]) monthMap[m] = { inQty: 0, inAmt: 0, outQty: 0, outAmt: 0 };
      monthMap[m].inQty += r.qty;
      monthMap[m].inAmt += r.total;
    });
    outbounds.forEach(r => {
      const m = r.date.slice(0,7);
      if (!monthMap[m]) monthMap[m] = { inQty: 0, inAmt: 0, outQty: 0, outAmt: 0 };
      monthMap[m].outQty += r.qty;
      monthMap[m].outAmt += r.total;
    });
    const months = Object.keys(monthMap).sort();

    // 商品排行
    const goodsMap = {};
    outbounds.forEach(r => {
      if (!goodsMap[r.goodsName]) goodsMap[r.goodsName] = { outQty: 0, outAmt: 0 };
      goodsMap[r.goodsName].outQty += r.qty;
      goodsMap[r.goodsName].outAmt += r.total;
    });
    const topGoods = Object.entries(goodsMap).sort((a,b) => b[1].outAmt - a[1].outAmt).slice(0, 8);

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-title">📈 月度出入库量趋势</div>
        <div class="chart-wrap"><canvas id="reportChart1" height="220"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">💰 月度金额走势</div>
        <div class="chart-wrap"><canvas id="reportChart2" height="220"></canvas></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>📋 月度汇总表</span>
        <button class="btn btn-ghost btn-sm" onclick="report.exportTable('monthTable')">📥 导出CSV</button>
      </div>
      <div class="table-wrap">
        <table id="monthTable">
          <thead><tr>
            <th>月份</th><th>入库数量</th><th>入库金额</th>
            <th>出库数量</th><th>出库金额</th><th>净变化(量)</th><th>净变化(额)</th>
          </tr></thead>
          <tbody>
            ${months.map(m => {
              const d = monthMap[m];
              const netQty = d.inQty - d.outQty;
              const netAmt = d.inAmt - d.outAmt;
              return `<tr>
                <td style="font-weight:600">${m}</td>
                <td style="color:var(--success)">+${fmt(d.inQty)}</td>
                <td>${fmtMoney(d.inAmt)}</td>
                <td style="color:var(--danger)">-${fmt(d.outQty)}</td>
                <td>${fmtMoney(d.outAmt)}</td>
                <td style="font-weight:600;color:${netQty>=0?'var(--success)':'var(--danger)'}">${netQty>=0?'+':''}${fmt(netQty)}</td>
                <td style="font-weight:600;color:${netAmt>=0?'var(--success)':'var(--danger)'}">${netAmt>=0?'+':''}${fmtMoney(netAmt)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">🏆 商品出库排行 TOP 8</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>排名</th><th>商品名称</th><th>出库数量</th><th>出库金额</th><th>占比</th></tr></thead>
          <tbody>
            ${(() => {
              const totalAmt = topGoods.reduce((s,[,d]) => s + d.outAmt, 0);
              return topGoods.map(([name, d], i) => `
                <tr>
                  <td>
                    <span style="display:inline-flex;width:24px;height:24px;background:${i<3?'var(--primary)':'var(--bg)'};color:${i<3?'white':'var(--text)'};border-radius:50%;align-items:center;justify-content:center;font-size:12px;font-weight:700">
                      ${i+1}
                    </span>
                  </td>
                  <td style="font-weight:600">${name}</td>
                  <td>${fmt(d.outQty)}</td>
                  <td style="color:var(--primary);font-weight:600">${fmtMoney(d.outAmt)}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="progress" style="width:80px"><div class="progress-inner" style="width:${Math.round(d.outAmt/totalAmt*100)}%"></div></div>
                      <span style="font-size:12px;color:var(--text-muted)">${Math.round(d.outAmt/totalAmt*100)}%</span>
                    </div>
                  </td>
                </tr>`).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>
    `;
  },

  renderStockReport() {
    const goodsList = DB.get('goods');
    const cats = DB.get('categories');
    const catMap = {};
    cats.forEach(c => { catMap[c.id] = c; });
    const totalStock = goodsList.reduce((s,g) => s + g.stock, 0);

    return `
    <div class="stat-cards" style="margin-bottom:16px">
      <div class="stat-card blue">
        <div class="stat-icon blue">📦</div>
        <div class="stat-info">
          <div class="stat-label">商品总种类</div>
          <div class="stat-value">${goodsList.length}</div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green">🏪</div>
        <div class="stat-info">
          <div class="stat-label">库存总量</div>
          <div class="stat-value">${fmt(totalStock)}</div>
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange">⚠️</div>
        <div class="stat-info">
          <div class="stat-label">库存不足</div>
          <div class="stat-value">${goodsList.filter(g=>g.stock>0&&g.stock<=g.minStock).length}</div>
        </div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon red">❌</div>
        <div class="stat-info">
          <div class="stat-label">已断货</div>
          <div class="stat-value">${goodsList.filter(g=>g.stock===0).length}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>📊 库存明细报表</span>
        <button class="btn btn-ghost btn-sm" onclick="report.exportTable('stockTable')">📥 导出CSV</button>
      </div>
      <div class="table-wrap">
        <table id="stockTable">
          <thead><tr>
            <th>编码</th><th>商品名称</th><th>分类</th><th>当前库存</th>
            <th>最低库存</th><th>最高库存</th><th>库存率</th><th>状态</th>
          </tr></thead>
          <tbody>
            ${goodsList.map(g => {
              const cat = catMap[g.category];
              const rate = g.maxStock > 0 ? Math.round(g.stock/g.maxStock*100) : 0;
              let status = g.stock===0?'<span class="badge badge-danger">断货</span>':g.stock<=g.minStock?'<span class="badge badge-warning">不足</span>':'<span class="badge badge-success">正常</span>';
              return `<tr>
                <td style="font-size:12px;color:var(--primary)">${g.code}</td>
                <td style="font-weight:600">${g.name}</td>
                <td>${cat?`${cat.icon} ${cat.name}`:'-'}</td>
                <td style="font-weight:700;color:${g.stock===0?'var(--danger)':g.stock<=g.minStock?'var(--warning)':'var(--text)'}">${g.stock} ${g.unit}</td>
                <td>${g.minStock}</td><td>${g.maxStock}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <div class="progress" style="width:60px"><div class="progress-inner" style="width:${Math.min(100,rate)}%;background:${rate<20?'var(--danger)':rate<50?'var(--warning)':'var(--success)'}"></div></div>
                    <span style="font-size:12px">${rate}%</span>
                  </div>
                </td>
                <td>${status}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  renderValueReport() {
    const goodsList = DB.get('goods');
    const totalCost = goodsList.reduce((s,g) => s + g.stock * g.cost, 0);
    const totalSale = goodsList.reduce((s,g) => s + g.stock * g.price, 0);
    const profit = totalSale - totalCost;

    return `
    <div class="stat-cards" style="margin-bottom:16px">
      <div class="stat-card blue">
        <div class="stat-icon blue">💵</div>
        <div class="stat-info">
          <div class="stat-label">库存成本总值</div>
          <div class="stat-value" style="font-size:20px">${fmtMoney(totalCost)}</div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green">💰</div>
        <div class="stat-info">
          <div class="stat-label">库存售出总值</div>
          <div class="stat-value" style="font-size:20px">${fmtMoney(totalSale)}</div>
        </div>
      </div>
      <div class="stat-card orange">
        <div class="stat-icon orange">📈</div>
        <div class="stat-info">
          <div class="stat-label">潜在毛利润</div>
          <div class="stat-value" style="font-size:20px">${fmtMoney(profit)}</div>
        </div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon green">📊</div>
        <div class="stat-info">
          <div class="stat-label">平均毛利率</div>
          <div class="stat-value" style="font-size:20px">${totalCost>0?Math.round(profit/totalCost*100):0}%</div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="justify-content:space-between">
        <span>💰 商品价值明细</span>
        <button class="btn btn-ghost btn-sm" onclick="report.exportTable('valueTable')">📥 导出CSV</button>
      </div>
      <div class="table-wrap">
        <table id="valueTable">
          <thead><tr>
            <th>商品名称</th><th>当前库存</th>
            <th>成本价</th><th>销售价</th>
            <th>库存成本</th><th>库存售值</th><th>潜在利润</th><th>毛利率</th>
          </tr></thead>
          <tbody>
            ${goodsList.sort((a,b)=>(b.stock*b.cost)-(a.stock*a.cost)).map(g => {
              const cost = g.stock * g.cost;
              const sale = g.stock * g.price;
              const profit = sale - cost;
              const rate = cost > 0 ? Math.round(profit/cost*100) : 0;
              return `<tr>
                <td style="font-weight:600">${g.name}</td>
                <td>${g.stock} ${g.unit}</td>
                <td>${fmtMoney(g.cost)}</td>
                <td style="color:var(--success)">${fmtMoney(g.price)}</td>
                <td>${fmtMoney(cost)}</td>
                <td style="color:var(--primary);font-weight:600">${fmtMoney(sale)}</td>
                <td style="color:var(--success);font-weight:600">${fmtMoney(profit)}</td>
                <td>
                  <span style="font-weight:600;color:${rate>=30?'var(--success)':rate>=10?'var(--warning)':'var(--danger)'}">${rate}%</span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  },

  exportTable(tableId) {
    if (!hasPerm('report', 'export')) { toast('没有导出权限', 'error'); return; }
    const table = document.getElementById(tableId);
    if (!table) return;
    let csv = '';
    table.querySelectorAll('tr').forEach(row => {
      const cells = [...row.querySelectorAll('th,td')].map(cell => {
        let text = cell.innerText.replace(/\n/g, ' ').trim();
        if (text.includes(',')) text = `"${text}"`;
        return text;
      });
      csv += cells.join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `报表_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast('报表已导出！');
  },

  initCharts() {
    if (this.activeTab === 'inout') {
      setTimeout(() => {
        this.drawInoutChart();
        this.drawAmtChart();
      }, 50);
    }
  },

  drawInoutChart() {
    const canvas = document.getElementById('reportChart1');
    if (!canvas) return;
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');
    const monthMap = {};
    inbounds.forEach(r => { const m = r.date.slice(0,7); if (!monthMap[m]) monthMap[m]={inQty:0,outQty:0}; monthMap[m].inQty+=r.qty; });
    outbounds.forEach(r => { const m = r.date.slice(0,7); if (!monthMap[m]) monthMap[m]={inQty:0,outQty:0}; monthMap[m].outQty+=r.qty; });
    const months = Object.keys(monthMap).sort();
    this.drawBarChart(canvas, months.map(m=>m.slice(5)), months.map(m=>monthMap[m].inQty), months.map(m=>monthMap[m].outQty), '#10b981', '#ef4444', '入库量', '出库量');
  },

  drawAmtChart() {
    const canvas = document.getElementById('reportChart2');
    if (!canvas) return;
    const inbounds = DB.get('inbounds');
    const outbounds = DB.get('outbounds');
    const monthMap = {};
    inbounds.forEach(r => { const m = r.date.slice(0,7); if (!monthMap[m]) monthMap[m]={inAmt:0,outAmt:0}; monthMap[m].inAmt+=r.total; });
    outbounds.forEach(r => { const m = r.date.slice(0,7); if (!monthMap[m]) monthMap[m]={inAmt:0,outAmt:0}; monthMap[m].outAmt+=r.total; });
    const months = Object.keys(monthMap).sort();
    this.drawBarChart(canvas, months.map(m=>m.slice(5)), months.map(m=>monthMap[m].inAmt), months.map(m=>monthMap[m].outAmt), '#4f6ef7', '#f59e0b', '入库额', '出库额');
  },

  drawBarChart(canvas, labels, data1, data2, color1, color2, label1, label2) {
    const W = canvas.parentElement.clientWidth || 400;
    const H = 220;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const maxVal = Math.max(...data1, ...data2, 1);
    const n = labels.length;
    const groupW = chartW / n;
    const barW = Math.min(groupW * 0.35, 20);

    ctx.clearRect(0,0,W,H);

    // 网格
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.strokeStyle = '#f0f2f8'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W-pad.right, y); ctx.stroke();
      ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
      const v = maxVal * (1 - i/4);
      ctx.fillText(v >= 10000 ? (v/10000).toFixed(1)+'w' : Math.round(v), pad.left-4, y+4);
    }

    labels.forEach((l, i) => {
      const cx = pad.left + (i + 0.5) * groupW;
      const h1 = (data1[i] / maxVal) * chartH;
      const h2 = (data2[i] / maxVal) * chartH;

      ctx.fillStyle = color1;
      ctx.fillRect(cx - barW - 2, pad.top + chartH - h1, barW, h1);
      ctx.fillStyle = color2;
      ctx.fillRect(cx + 2, pad.top + chartH - h2, barW, h2);

      ctx.fillStyle = '#9ca3af'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(l, cx, H - 8);
    });

    // 图例
    ctx.fillStyle = color1; ctx.fillRect(W - 130, 8, 12, 10);
    ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label1, W - 114, 17);
    ctx.fillStyle = color2; ctx.fillRect(W - 65, 8, 12, 10);
    ctx.fillText(label2, W - 49, 17);
  },

  init() {
    setTimeout(() => this.initCharts(), 50);
  }
};
