// ===========================
// 统一打印管理模块 v2.1
// ===========================

const PrintManager = {
  // 通用打印样式
  _baseStyle() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: "Microsoft YaHei", "SimHei", sans-serif; padding: 40px; color: #333; font-size: 14px; }
      .print-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
      .print-title { font-size: 22px; font-weight: 700; letter-spacing: 4px; }
      .print-sub { font-size: 12px; color: #666; margin-top: 4px; letter-spacing: 0; }
      .print-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 13px; }
      .print-meta .label { color: #666; }
      .print-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .print-table th, .print-table td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; font-size: 13px; }
      .print-table th { background: #f5f5f5; font-weight: 600; }
      .print-table .num { text-align: right; font-family: "Consolas", monospace; }
      .print-total { text-align: right; font-size: 15px; font-weight: 700; margin-bottom: 20px; padding: 10px 0; border-top: 1px solid #ccc; }
      .print-footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 13px; color: #666; }
      .print-footer div { text-align: center; min-width: 150px; }
      .print-footer .sign-line { border-bottom: 1px solid #ccc; margin-top: 40px; width: 120px; display: inline-block; }
      .print-note { margin-bottom: 20px; font-size: 13px; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px solid #eee; }
      .print-note .label { color: #666; }
      @media print { body { padding: 20px; } .no-print { display: none !important; } }
    `;
  },

  // 打开打印窗口
  _openPrintWindow(title, bodyHtml) {
    // 读取自定义打印设置
    let ps = {};
    try { ps = JSON.parse(localStorage.getItem('wms_printSettings') || '{}'); } catch(e) {}
    const companyName = ps.companyName || '智能业务管理系统';
    const companySub = ps.companySub || ('智能业务管理系统 ERP ' + (localStorage.getItem('wms_sysVersion') || 'v2.2').replace(/^v/, ''));
    const fontSize = ps.fontSize || 14;
    const showFooter = ps.showFooter !== false;
    const footerText = ps.footerText || '本单据由系统自动生成';
    const showLogo = ps.showLogo !== false;
    const logoUrl = ps.logoUrl || 'LOGO.png';

    // 替换模板中的公司名称
    let html = bodyHtml.replace(/智能仓储管理系统 WMS v2\.1/g, companySub);
    
    // 添加 Logo 到打印头部（如果启用）
    if (showLogo && logoUrl) {
      html = `
        <div style="text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #e5e7eb">
          <img src="${logoUrl}" alt="Logo" style="max-height:60px;max-width:200px" onerror="this.parentElement.style.display='none'">
        </div>
      ` + html;
    }
    
    // 添加页脚
    if (showFooter && footerText) {
      html += `<div style="text-align:center;margin-top:30px;padding-top:15px;border-top:1px dashed #ccc;font-size:11px;color:#999">${footerText}</div>`;
    }

    const style = this._baseStyle().replace('font-size: 14px', `font-size: ${fontSize}px`);
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(`<html><head><meta charset="UTF-8"><title>${title}</title><style>${style}</style></head><body>${html}</body></html>`);
    w.document.close();
    
    const autoPrint = ps.autoPrint !== false;
    if (autoPrint) {
      w.onload = () => w.print();
    }
  },

  // ====== 入库单打印 ======
  printInbound(id) {
    const r = DB.findById('inbounds', id);
    if (!r) return;
    const isReturn = r.type === '退货入库';
    this._openPrintWindow(`入库单 - ${r.code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">${isReturn ? '退 货 入 库 单' : '入 库 单'}</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>日期: ${r.date}</div>
          <div>类型: ${isReturn ? '退货入库' : '采购入库'}</div>
          <div>状态: ${r.status || '已完成'}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">${isReturn ? '退货客户：' : '供应商：'}</span>${isReturn ? (r.customerName || '-') : (r.supplierName || '-')}</div>
        <div><span class="label">操作员：</span>${r.operator}</div>
        <div><span class="label">商品名称：</span>${r.goodsName}</div>
        <div><span class="label">商品编码：</span>${r.goodsCode}</div>
      </div>
      <table class="print-table">
        <thead><tr><th style="width:50px">序号</th><th>项目</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>
        <tbody><tr><td>1</td><td>${r.goodsName}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.price)}</td><td class="num">${fmtMoney(r.total)}</td></tr></tbody>
      </table>
      <div class="print-total">合计金额: ${fmtMoney(r.total)}</div>
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>审核人<br><span class="sign-line"></span></div>
        <div>收货人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 出库单打印 ======
  printOutbound(id) {
    const r = DB.findById('outbounds', id);
    if (!r) return;
    const isReturn = r.type === '退货出库';
    this._openPrintWindow(`出库单 - ${r.code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">${isReturn ? '退 货 出 库 单' : '出 库 单'}</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>日期: ${r.date}</div>
          <div>类型: ${isReturn ? '退货出库' : '销售出库'}</div>
          <div>状态: ${r.status || '已完成'}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">${isReturn ? '退回供应商：' : '客户：'}</span>${r.customerName}</div>
        <div><span class="label">操作员：</span>${r.operator}</div>
        <div><span class="label">商品名称：</span>${r.goodsName}</div>
        <div><span class="label">商品编码：</span>${r.goodsCode}</div>
        ${r.equipSerial ? `<div><span class="label">设备序列号：</span><strong>${r.equipSerial}</strong></div>` : ''}
        ${!isReturn && r.salesmanName ? `<div><span class="label">销售人员：</span>${r.salesmanName}</div>` : ''}
      </div>
      <table class="print-table">
        <thead><tr><th style="width:50px">序号</th><th>项目</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>
        <tbody><tr><td>1</td><td>${r.goodsName}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.price)}</td><td class="num">${fmtMoney(r.total)}</td></tr></tbody>
      </table>
      <div class="print-total">合计金额: ${fmtMoney(r.total)}</div>
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>审核人<br><span class="sign-line"></span></div>
        <div>领货人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 盘点单打印 ======
  printInventory(id) {
    const r = DB.findById('inventories', id);
    if (!r) return;
    const statusText = r.status === '已完成' ? '已完成' : '进行中';
    this._openPrintWindow(`盘点单 - ${r.code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">库 存 盘 点 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>盘点日期: ${r.date}</div>
          <div>状态: ${statusText}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">盘点人：</span>${r.operator}</div>
        <div><span class="label">盘点商品数：</span>${r.items} 种</div>
        <div><span class="label">差异数量：</span><span style="color:${r.diff > 0 ? '#16a34a' : r.diff < 0 ? '#ef4444' : '#333'};font-weight:600">${r.diff > 0 ? '+' : ''}${r.diff}</span></div>
        <div><span class="label">备注：</span>${r.note || '-'}</div>
      </div>
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px;font-size:13px">
        <div style="font-weight:600;margin-bottom:8px">盘点结果摘要</div>
        <div>本次盘点共涉及 <strong>${r.items}</strong> 种商品，盘盈/盘亏差异 <strong>${Math.abs(r.diff)}</strong> 项。</div>
        ${r.diff === 0 ? '<div style="color:#16a34a;margin-top:4px">✅ 账实一致，无差异。</div>' : `<div style="color:${r.diff > 0 ? '#16a34a' : '#ef4444'};margin-top:4px">${r.diff > 0 ? '📈 盘盈' : '📉 盘亏'} ${Math.abs(r.diff)} 项，需进一步核实。</div>`}
      </div>
      <div class="print-footer">
        <div>盘点人<br><span class="sign-line"></span></div>
        <div>复核人<br><span class="sign-line"></span></div>
        <div>仓库主管<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 运输计划打印 ======
  printTransportPlan(id) {
    const r = DB.findById('transportPlans', id);
    if (!r) return;
    const goodsList = r.goodsList || [];
    this._openPrintWindow(`运输计划 - ${r.planNo}`, `
      <div class="print-header">
        <div>
          <div class="print-title">运 输 计 划 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>计划号: <strong>${r.planNo}</strong></div>
          <div>发货日期: ${r.shipDate}</div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">承运商：</span>${r.carrierName}</div>
        <div><span class="label">客户：</span>${r.customerName}</div>
        <div style="grid-column:1/-1"><span class="label">收货地址：</span>${r.deliveryAddress || '-'}</div>
        <div><span class="label">预计到达：</span>${r.estimatedArrival || '-'}</div>
        <div><span class="label">实际到达：</span>${r.actualArrival || '-'}</div>
        <div><span class="label">总重量：</span>${r.totalWeight ? r.totalWeight + ' kg' : '-'}</div>
        <div><span class="label">运费：</span><span style="font-weight:600;color:#16a34a">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</span></div>
      </div>
      ${goodsList.length ? `
      <table class="print-table">
        <thead><tr><th style="width:50px">序号</th><th>商品名称</th><th class="num">数量</th></tr></thead>
        <tbody>${goodsList.map((g, i) => `<tr><td>${i + 1}</td><td>${g.goodsName}</td><td class="num">${g.qty}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      ${r.outbounds ? `<div class="print-note"><span class="label">关联出库单：</span>${r.outbounds}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>承运商签收<br><span class="sign-line"></span></div>
        <div>客户签收<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 配送单打印 ======
  printDelivery(id) {
    const r = DB.findById('transportPlans', id);
    if (!r) return;
    this._openPrintWindow(`配送单 - ${r.planNo}`, `
      <div class="print-header">
        <div>
          <div class="print-title">配 送 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>配送单号: <strong>${r.planNo}</strong></div>
          <div>发货日期: ${r.shipDate}</div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">承运商：</span>${r.carrierName}</div>
        <div><span class="label">客户：</span>${r.customerName}</div>
        <div style="grid-column:1/-1"><span class="label">收货地址：</span>${r.deliveryAddress || '-'}</div>
        <div><span class="label">预计到达：</span>${r.estimatedArrival || '-'}</div>
        <div><span class="label">实际到达：</span>${r.actualArrival || '-'}</div>
        <div><span class="label">运费：</span><span style="font-weight:600;color:#16a34a">${r.freightFee ? fmtMoney(r.freightFee) : '-'}</span></div>
      </div>
      <div class="print-footer">
        <div>发货人<br><span class="sign-line"></span></div>
        <div>配送员<br><span class="sign-line"></span></div>
        <div>客户签收<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 发票打印 ======
  printInvoice(id) {
    const r = DB.findById('invoices', id);
    if (!r) return;
    this._openPrintWindow(`发票 - ${r.invoiceNo}`, `
      <div class="print-header">
        <div>
          <div class="print-title">${r.type || '增值税发票'}</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>发票号: <strong>${r.invoiceNo}</strong></div>
          <div>开票日期: ${r.issueDate}</div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">发票抬头：</span><strong>${r.title}</strong></div>
        <div><span class="label">税号：</span><span style="font-family:monospace">${r.taxNo || '-'}</span></div>
        <div><span class="label">客户：</span>${r.customerName}</div>
        <div><span class="label">关联单号：</span>${r.relatedCode || '-'}</div>
      </div>
      <table class="print-table">
        <thead><tr><th>项目</th><th class="num">金额</th><th class="num">税率</th><th class="num">税额</th><th class="num">价税合计</th></tr></thead>
        <tbody><tr>
          <td>详见清单</td>
          <td class="num">${fmtMoney(r.amount)}</td>
          <td class="num">13%</td>
          <td class="num">${fmtMoney(r.taxAmount)}</td>
          <td class="num">${fmtMoney(r.totalAmount)}</td>
        </tr></tbody>
      </table>
      <div class="print-total">价税合计（大写）: ${fmtMoney(r.totalAmount)}</div>
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>开票人<br><span class="sign-line"></span></div>
        <div>复核人<br><span class="sign-line"></span></div>
        <div>收款人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 生产工单打印 ======
  printProductionOrder(id) {
    const r = DB.findById('productionOrders', id);
    if (!r) return;
    const orderProcesses = DB.get('orderProcesses').filter(op => op.orderId === id);
    this._openPrintWindow(`生产工单 - ${r.orderNo}`, `
      <div class="print-header">
        <div>
          <div class="print-title">生 产 工 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>工单号: <strong>${r.orderNo}</strong></div>
          <div>优先级: ${r.priority}</div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">产品名称：</span>${r.bomName}</div>
        <div><span class="label">计划数量：</span>${r.qty}</div>
        <div><span class="label">已完成数量：</span><span style="font-weight:600;color:#16a34a">${r.completedQty}</span></div>
        <div><span class="label">车间：</span>${r.workshop}</div>
        <div><span class="label">计划开始：</span>${r.plannedStart}</div>
        <div><span class="label">计划结束：</span>${r.plannedEnd}</div>
        <div><span class="label">实际开始：</span>${r.actualStart || '-'}</div>
        <div><span class="label">实际结束：</span>${r.actualEnd || '-'}</div>
      </div>
      ${orderProcesses.length ? `
      <div style="font-weight:600;margin-bottom:8px;font-size:14px">工序进度</div>
      <table class="print-table">
        <thead><tr><th>序号</th><th>工序</th><th class="num">计划数量</th><th class="num">完成数量</th><th>状态</th><th>操作员</th></tr></thead>
        <tbody>${orderProcesses.map(op => `
          <tr><td>${op.sequence}</td><td>${op.processName}</td><td class="num">${op.planQty}</td><td class="num">${op.completedQty}</td><td>${op.status}</td><td>${op.operator}</td></tr>
        `).join('')}</tbody>
      </table>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>车间主任<br><span class="sign-line"></span></div>
        <div>质检员<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 委外加工单打印 ======
  printOutsourcing(id) {
    const r = DB.findById('outsourcingOrders', id);
    if (!r) return;
    const materials = DB.get('outsourcingMaterials').filter(m => m.orderId === id);
    this._openPrintWindow(`委外加工单 - ${r.orderNo}`, `
      <div class="print-header">
        <div>
          <div class="print-title">委 外 加 工 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.orderNo}</strong></div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">供应商：</span>${r.supplierName}</div>
        <div><span class="label">加工工序：</span>${r.processName}</div>
        <div><span class="label">数量：</span>${r.qty}</div>
        <div><span class="label">单价：</span>${fmtMoney(r.unitPrice)}</div>
        <div><span class="label">总金额：</span><span style="font-weight:600;color:#16a34a">${fmtMoney(r.totalAmount)}</span></div>
        <div><span class="label">操作员：</span>${r.operator}</div>
        <div><span class="label">计划发出：</span>${r.planSendDate}</div>
        <div><span class="label">计划收回：</span>${r.planReceiveDate}</div>
        <div><span class="label">实际发出：</span>${r.actualSendDate || '-'}</div>
        <div><span class="label">实际收回：</span>${r.actualReceiveDate || '-'}</div>
      </div>
      ${materials.length ? `
      <div style="font-weight:600;margin-bottom:8px;font-size:14px">发料明细</div>
      <table class="print-table">
        <thead><tr><th>序号</th><th>物料名称</th><th class="num">数量</th><th>单位</th><th class="num">金额</th><th>状态</th></tr></thead>
        <tbody>${materials.map((m, i) => `
          <tr><td>${i + 1}</td><td>${m.goodsName}</td><td class="num">${m.qty}</td><td>${m.unit}</td><td class="num">${fmtMoney(m.total)}</td><td>${m.status}</td></tr>
        `).join('')}</tbody>
      </table>` : ''}
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>供应商签收<br><span class="sign-line"></span></div>
        <div>验收人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 售后工单打印（兼容eam.js和种子数据两种结构） ======
  printServiceTicket(id) {
    const r = DB.findById('serviceTickets', id);
    if (!r) return;
    // 兼容两种数据结构
    const code = r.code || r.ticketNo || '-';
    const type = r.type || '维修';
    const goodsName = r.equipmentName || r.goodsName || '-';
    const customerName = r.customerName || '-';
    const contact = r.contact || r.handlerName || '-';
    const phone = r.phone || '-';
    const faultDesc = r.problem || r.faultDesc || '-';
    const handler = r.handlerName || r.handler || '-';
    const createDate = r.createDate || (r.createdAt ? r.createdAt.slice(0,10) : '-');
    const dueDate = r.dueDate || r.estimatedDate || '-';
    const priority = r.priority || '一般';
    const priorityColor = (priority === '高' || priority === '紧急') ? '#ef4444' : priority === '中' ? '#f59e0b' : '#666';
    const result = r.result || r.completeNote || '';
    const statusText = typeof r.status === 'number'
      ? {0:'待处理',1:'处理中',2:'待确认',3:'已完成',4:'已关闭'}[r.status]
      : (r.status || '-');

    this._openPrintWindow(`售后工单 - ${code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">售 后 工 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>工单号: <strong>${code}</strong></div>
          <div>创建日期: ${createDate}</div>
          <div>状态: ${statusText}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">工单类型：</span>${type}</div>
        <div><span class="label">优先级：</span><span style="font-weight:600;color:${priorityColor}">${priority}</span></div>
        <div><span class="label">设备/商品：</span>${goodsName}</div>
        <div><span class="label">客户：</span>${customerName}</div>
        <div><span class="label">联系人：</span>${contact}</div>
        <div><span class="label">联系电话：</span>${phone}</div>
        <div style="grid-column:1/-1"><span class="label">故障描述：</span>${faultDesc}</div>
        <div><span class="label">处理人：</span>${handler}</div>
        <div><span class="label">截止日期：</span>${dueDate}</div>
        ${r.supplierName ? `<div><span class="label">供应商：</span>${r.supplierName}</div>` : ''}
        ${result ? `<div style="grid-column:1/-1"><span class="label">处理结果：</span>${result}</div>` : ''}
      </div>
      ${r.parts && r.parts.length ? `
      <div style="font-weight:600;margin-bottom:8px;font-size:14px">配件明细</div>
      <table class="print-table">
        <thead><tr><th>序号</th><th>配件名称</th><th class="num">数量</th><th>状态</th></tr></thead>
        <tbody>${r.parts.map((p,i) => `<tr><td>${i+1}</td><td>${p.name}</td><td class="num">${p.qty}</td><td>${p.received ? '已到货' : '待到货'}</td></tr>`).join('')}</tbody>
      </table>` : ''}
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>创建人<br><span class="sign-line"></span></div>
        <div>处理人<br><span class="sign-line"></span></div>
        <div>客户确认<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 仓库调拨单打印 ======
  printTransfer(id) {
    const r = DB.findById('transfers', id);
    if (!r) return;
    this._openPrintWindow(`调拨单 - ${r.code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">仓 库 调 拨 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>日期: ${r.date}</div>
          <div>类型: ${r.type || '库存调拨'}</div>
          <div>状态: ${r.status}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">调出仓库：</span><strong style="color:#dc2626">${r.fromWarehouse}</strong></div>
        <div><span class="label">调入仓库：</span><strong style="color:#059669">${r.toWarehouse}</strong></div>
        <div><span class="label">商品名称：</span>${r.goodsName}</div>
        <div><span class="label">商品编码：</span>${r.goodsCode}</div>
        <div><span class="label">调拨数量：</span><span style="font-weight:700;color:#ef4444;font-size:16px">${r.qty}</span></div>
        <div><span class="label">单价：</span>${fmtMoney(r.price)}</div>
        <div><span class="label">调拨金额：</span><span style="font-weight:700;color:var(--primary)">${fmtMoney(r.amount||0)}</span></div>
        <div><span class="label">操作员：</span>${r.operator}</div>
        ${r.reason ? `<div style="grid-column:1/-1"><span class="label">调拨原因：</span>${r.reason}</div>` : ''}
      </div>
      <table class="print-table">
        <thead><tr><th style="width:50px">序号</th><th>商品名称</th><th>商品编码</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>
        <tbody><tr><td>1</td><td>${r.goodsName}</td><td>${r.goodsCode}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.price)}</td><td class="num">${fmtMoney(r.amount||0)}</td></tr></tbody>
      </table>
      <div class="print-total">调拨金额合计: ${fmtMoney(r.amount||0)}</div>
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0;padding:16px;background:#f9fafb;border-radius:8px">
        <div style="text-align:center">
          <div style="font-size:12px;color:#666;margin-bottom:4px">调出仓库</div>
          <div style="font-size:15px;font-weight:700;color:#dc2626">${r.fromWarehouse}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:12px;color:#666;margin-bottom:4px">调入仓库</div>
          <div style="font-size:15px;font-weight:700;color:#059669">${r.toWarehouse}</div>
        </div>
      </div>
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>调出仓管<br><span class="sign-line"></span></div>
        <div>调入仓管<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 销售单/销售退单打印 ======
  printSalesOrder(id, source) {
    // source: 'outbound'(默认) 或 'inbound'
    let r;
    if (source === 'inbound') {
      r = DB.findById('inbounds', id);
    } else {
      r = DB.findById('outbounds', id);
    }
    if (!r) return;
    const isReturn = r.type === '退货出库' || r.type === '退货入库';
    const title = isReturn ? '销 售 退 单' : '销 售 单';
    const typeText = isReturn ? '销售退货' : (r.type === '退货入库' ? '退货入库' : '销售出库');
    this._openPrintWindow(`${isReturn?'销售退单':'销售单'} - ${r.code}`, `
      <div class="print-header">
        <div>
          <div class="print-title">${title}</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>单号: <strong>${r.code}</strong></div>
          <div>日期: ${r.date}</div>
          <div>类型: ${typeText}</div>
          <div>状态: ${r.status || '已完成'}</div>
        </div>
      </div>
      <div class="print-meta">
        <div><span class="label">${isReturn ? '退货客户：' : '客户名称：'}</span><strong>${r.customerName || '-'}</strong></div>
        <div><span class="label">销售人员：</span>${r.salesmanName || '-'}</div>
        <div><span class="label">商品名称：</span>${r.goodsName}</div>
        <div><span class="label">商品编码：</span>${r.goodsCode}</div>
        ${r.orderNo ? `<div><span class="label">订单编号：</span><span style="font-family:monospace">${r.orderNo}</span></div>` : ''}
        <div><span class="label">操作员：</span>${r.operator}</div>
      </div>
      <table class="print-table">
        <thead><tr><th style="width:50px">序号</th><th>商品名称</th><th>商品编码</th><th class="num">数量</th><th class="num">单价</th><th class="num">金额</th></tr></thead>
        <tbody><tr><td>1</td><td>${r.goodsName}</td><td>${r.goodsCode}</td><td class="num">${r.qty}</td><td class="num">${fmtMoney(r.price)}</td><td class="num">${fmtMoney(r.total)}</td></tr></tbody>
      </table>
      <div class="print-total">${isReturn ? '退货' : '销售'}金额合计: <span style="color:${isReturn?'#ef4444':'#16a34a'}">${fmtMoney(r.total)}</span></div>
      ${isReturn && r.returnReason ? `<div class="print-note"><span class="label">退货原因：</span>${r.returnReason}</div>` : ''}
      ${r.note ? `<div class="print-note"><span class="label">备注：</span>${r.note}</div>` : ''}
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>销售人员<br><span class="sign-line"></span></div>
        <div>${isReturn?'退货确认':'客户签收'}<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  },

  // ====== 打印测试 ======
  printPreviewTest() {
    this._openPrintWindow('打印测试', `
      <div class="print-header">
        <div>
          <div class="print-title">打 印 测 试 单</div>
          <div class="print-sub">智能仓储管理系统 WMS v2.1</div>
        </div>
        <div style="text-align:right;font-size:13px">
          <div>测试单号: <strong>TEST-001</strong></div>
          <div>日期: ${new Date().toISOString().slice(0,10)}</div>
        </div>
      </div>
      <div style="padding:40px;text-align:center;color:#666">
        <div style="font-size:48px;margin-bottom:16px">✅</div>
        <div style="font-size:18px;font-weight:600;margin-bottom:8px">打印设置测试成功！</div>
        <div style="font-size:13px">如果您能看到此页面，说明打印设置已正确应用。</div>
        <div style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:8px;text-align:left;font-size:12px">
          <div>当前打印设置：</div>
          <div style="margin-top:8px">
            <div>• 字体大小: ${(() => { try { return JSON.parse(localStorage.getItem('wms_printSettings')||'{}').fontSize||14; } catch(e) { return 14; } })()}px</div>
            <div>• 纸张大小: ${(() => { try { return JSON.parse(localStorage.getItem('wms_printSettings')||'{}').paperSize||'A4'; } catch(e) { return 'A4'; } })()}</div>
            <div>• 自动打印: ${(() => { try { return JSON.parse(localStorage.getItem('wms_printSettings')||'{}').autoPrint ? '是' : '否'; } catch(e) { return '是'; } })()}</div>
            <div>• 显示页脚: ${(() => { try { return JSON.parse(localStorage.getItem('wms_printSettings')||'{}').showFooter !== false ? '是' : '否'; } catch(e) { return '是'; } })()}</div>
          </div>
        </div>
      </div>
      <div class="print-footer">
        <div>制单人<br><span class="sign-line"></span></div>
        <div>审核人<br><span class="sign-line"></span></div>
        <div>确认人<br><span class="sign-line"></span></div>
        <div>日期<br><span class="sign-line"></span></div>
      </div>
    `);
  }
};
