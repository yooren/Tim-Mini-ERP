// ===========================
// 发票管理
// ===========================

const invoice = {
  page: 1,
  pageSize: 12,
  keyword: '',
  statusFilter: '',

  render() {
    return `
    <div style="animation:fadeIn 0.4s ease">
      <div class="action-bar">
        <div class="action-bar-left">
          <div class="search-input-wrap">
            <span>🔍</span>
            <input type="text" placeholder="搜索发票号/客户名称..." value="${this.keyword}"
              oninput="invoice.keyword=this.value;invoice.page=1;invoice.reload()">
          </div>
          <select class="filter-select" value="${this.statusFilter}"
            onchange="invoice.statusFilter=this.value;invoice.page=1;invoice.reload()">
            <option value="" ${!this.statusFilter?'selected':''}>全部状态</option>
            <option value="待开票" ${this.statusFilter==='待开票'?'selected':''}>待开票</option>
            <option value="已开具" ${this.statusFilter==='已开具'?'selected':''}>已开具</option>
            <option value="已作废" ${this.statusFilter==='已作废'?'selected':''}>已作废</option>
            <option value="已红冲" ${this.statusFilter==='已红冲'?'selected':''}>已红冲</option>
          </select>
        </div>
        <div class="action-bar-right">
          <button class="btn btn-primary" onclick="invoice.openAdd()">+ 新建发票</button>
        </div>
      </div>
      <div class="card" id="invoiceCard">${this.renderTable()}</div>
    </div>`;
  },

  renderTable() {
    let list = DB.get('invoices');
    if (this.keyword) {
      const kw = this.keyword.toLowerCase();
      list = list.filter(r => 
        (r.invoiceNo || '').toLowerCase().includes(kw) || 
        (r.customerName || '').toLowerCase().includes(kw) ||
        (r.title || '').toLowerCase().includes(kw)
      );
    }
    if (this.statusFilter) list = list.filter(r => r.status === this.statusFilter);
    list = list.sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));

    const total = list.length;
    const start = (this.page - 1) * this.pageSize;
    const pageData = list.slice(start, start + this.pageSize);

    if (!pageData.length) return `<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-text">暂无发票记录</div></div>`;

    return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>发票号</th><th>发票类型</th><th>发票抬头</th><th>价税合计</th>
        <th>客户</th><th>开票日期</th><th>状态</th><th>操作</th>
      </tr></thead>
      <tbody>
        ${pageData.map(r => {
          const badge = r.status === '已开具' ? 'badge-success' : r.status === '待开票' ? 'badge-warning' : r.status === '已作废' ? 'badge-default' : 'badge-danger';
          return `<tr>
            <td><span style="color:var(--primary);font-size:12px;font-family:monospace">${r.invoiceNo}</span></td>
            <td><span class="badge badge-default">${r.type}</span></td>
            <td style="font-weight:600">${r.title}</td>
            <td><span style="font-weight:700;color:var(--success)">${fmtMoney(r.totalAmount)}</span></td>
            <td>${r.customerName}</td>
            <td style="font-size:12px;color:var(--text-muted)">${r.issueDate}</td>
            <td><span class="badge ${badge}">${r.status}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="invoice.view(${r.id})">👁 查看</button>
                ${r.status === '已开具' ? `<button class="btn btn-ghost btn-sm" onclick="invoice.printInvoice(${r.id})">🖨 打印</button>` : ''}
                ${r.status === '待开票' ? `<button class="btn btn-primary btn-sm" onclick="invoice.issueInvoice(${r.id})">✅ 开具</button>` : ''}
                ${r.status === '已开具' ? `<button class="btn btn-outline btn-sm" onclick="invoice.redFlush(${r.id})">↩️ 红冲</button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
    ${renderPagination(total, this.page, this.pageSize, 'invoice.goPage')}`;
  },

  reload() {
    const card = document.getElementById('invoiceCard');
    if (card) card.innerHTML = this.renderTable();
  },

  goPage(p) { this.page = p; this.reload(); },
  init() {},

  openAdd() {
    if (!hasPerm('invoice', 'create')) { toast('没有新建权限', 'error'); return; }
    const customers = DB.get('customers').filter(c => c.status === 1);
    const today = new Date().toISOString().slice(0, 10);
    const code = DB.genCode('INV');

    openModal('新建发票', `
      <div style="background:var(--primary-light);border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        <strong>发票号：</strong><span style="color:var(--primary);font-family:monospace">${code}</span>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>客户 *</label>
          <select id="invCustomer" onchange="invoice.onCustomerChange()">
            <option value="">-- 请选择客户 --</option>
            ${customers.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-item"><label>发票类型</label>
          <select id="invType">
            <option value="增值税发票">增值税发票</option>
            <option value="普通发票">普通发票</option>
            <option value="电子发票">电子发票</option>
            <option value="专用发票">专用发票</option>
          </select>
        </div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>发票抬头</label><input id="invTitle" placeholder="公司全称"></div>
        <div class="form-item"><label>税号</label><input id="invTaxNo" placeholder="统一社会信用代码"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>金额(¥)</label><input id="invAmount" type="number" step="0.01" value="0" oninput="invoice.calcTotal()"></div>
        <div class="form-item"><label>税率(%)</label><input id="invTaxRate" type="number" step="0.01" value="13" oninput="invoice.calcTotal()"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>税额(¥)</label><input id="invTaxAmount" readonly style="background:#f0f2f8;font-weight:600" value="¥0.00"></div>
        <div class="form-item"><label>价税合计(¥)</label><input id="invTotalAmount" readonly style="background:rgba(16,185,129,0.1);color:var(--success);font-weight:600" value="¥0.00"></div>
      </div>
      <div class="form-row cols-2">
        <div class="form-item"><label>开票日期</label><input id="invDate" type="date" value="${today}"></div>
        <div class="form-item"><label>关联单号</label><input id="invRelatedCode" placeholder="关联的出库单号"></div>
      </div>
      <div class="form-row">
        <div class="form-item"><label>备注</label><input id="invNote" placeholder="开票备注"></div>
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-primary" onclick="invoice.save('${code}')">保存发票</button>`
    );
  },

  onCustomerChange() {
    const cid = +document.getElementById('invCustomer').value;
    if (!cid) return;
    const customer = DB.findById('customers', cid);
    if (customer) {
      document.getElementById('invTitle').value = customer.name;
    }
  },

  calcTotal() {
    const amount = +document.getElementById('invAmount').value || 0;
    const taxRate = +document.getElementById('invTaxRate').value || 0;
    const taxAmount = amount * taxRate / 100;
    const totalAmount = amount + taxAmount;
    document.getElementById('invTaxAmount').value = fmtMoney(taxAmount);
    document.getElementById('invTotalAmount').value = fmtMoney(totalAmount);
  },

  save(code) {
    const cid = +document.getElementById('invCustomer').value;
    if (!cid) { toast('请选择客户', 'error'); return; }
    const amount = +document.getElementById('invAmount').value;
    if (amount <= 0) { toast('请输入有效金额', 'error'); return; }

    const customer = DB.findById('customers', cid);
    const taxRate = +document.getElementById('invTaxRate').value || 0;
    const taxAmount = amount * taxRate / 100;

    DB.add('invoices', {
      invoiceNo: code,
      type: document.getElementById('invType').value,
      title: document.getElementById('invTitle').value || customer?.name || '',
      taxNo: document.getElementById('invTaxNo').value,
      amount: amount,
      taxRate: taxRate,
      taxAmount: taxAmount,
      totalAmount: amount + taxAmount,
      customerId: cid,
      customerName: customer?.name || '',
      relatedCode: document.getElementById('invRelatedCode').value,
      issueDate: document.getElementById('invDate').value,
      status: '待开票',
      operator: currentUser.username,
      note: document.getElementById('invNote').value,
      createdAt: new Date().toISOString().slice(0, 10)
    });

    audit.log('invoice', '新建发票', customer?.name, `发票号: ${code}, 金额: ${fmtMoney(amount)}`);
    closeModal();
    toast('发票已保存，待开具', 'success');
    this.reload();
  },

  view(id) {
    const r = DB.findById('invoices', id);
    if (!r) return;
    const badge = r.status === '已开具' ? 'badge-success' : r.status === '待开票' ? 'badge-warning' : r.status === '已作废' ? 'badge-default' : 'badge-danger';

    openModal('发票详情', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">发票号</div>
          <div style="font-size:14px;font-weight:600;color:var(--primary)">${r.invoiceNo}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">状态</div>
          <div><span class="badge ${badge}">${r.status}</span></div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">发票类型</div>
          <div style="font-size:14px;font-weight:500">${r.type}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">开票日期</div>
          <div style="font-size:14px;font-weight:500">${r.issueDate}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">发票抬头</div>
          <div style="font-size:14px;font-weight:500">${r.title}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">税号</div>
          <div style="font-size:14px;font-weight:500;font-family:monospace">${r.taxNo || '-'}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">金额</div>
          <div style="font-size:16px;font-weight:700">${fmtMoney(r.amount)}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">税率</div>
          <div style="font-size:14px;font-weight:500">${r.taxRate}%</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">税额</div>
          <div style="font-size:14px;font-weight:600;color:var(--danger)">${fmtMoney(r.taxAmount)}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">价税合计</div>
          <div style="font-size:16px;font-weight:700;color:var(--success)">${fmtMoney(r.totalAmount)}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">客户</div>
          <div style="font-size:14px;font-weight:500">${r.customerName}</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:12px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">关联单号</div>
          <div style="font-size:14px;font-weight:500">${r.relatedCode || '-'}</div>
        </div>
      </div>
      ${r.note ? `<div style="margin-top:12px;background:var(--bg);border-radius:8px;padding:12px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">备注</div>
        <div style="font-size:13px">${r.note}</div>
      </div>` : ''}`,
      `<button class="btn btn-ghost" onclick="closeModal()">关闭</button>
       ${r.status === '待开票' ? `<button class="btn btn-primary" onclick="closeModal();invoice.issueInvoice(${id})">✅ 开具发票</button>` : ''}
       ${r.status === '已开具' ? `<button class="btn btn-outline" onclick="invoice.printInvoice(${id})">🖨 打印</button>` : ''}`
    );
  },

  issueInvoice(id) {
    if (!hasPerm('invoice', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('invoices', id);
    if (!r) return;
    DB.update('invoices', id, { status: '已开具' });
    audit.log('invoice', '开具发票', r.customerName, `发票号: ${r.invoiceNo}, 金额: ${fmtMoney(r.totalAmount)}`);
    toast('发票已开具', 'success');
    this.reload();
  },

  redFlush(id) {
    if (!hasPerm('invoice', 'approve')) { toast('没有审核权限', 'error'); return; }
    const r = DB.findById('invoices', id);
    if (!r) return;
    openModal('发票红冲', `
      <div style="text-align:center;padding:16px 0">
        <div style="width:64px;height:64px;background:rgba(239,68,68,0.08);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px">↩️</div>
        <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--danger)">确认红冲此发票？</div>
        <div style="font-size:13px;color:var(--text-muted)">发票号: <strong>${r.invoiceNo}</strong> | 金额: ${fmtMoney(r.totalAmount)}</div>
      </div>
      <div class="form-item" style="margin-top:12px">
        <label>红冲原因 *</label>
        <input id="redFlushReason" placeholder="请填写红冲原因">
      </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">取消</button>
       <button class="btn btn-danger" onclick="invoice.confirmRedFlush(${id})">确认红冲</button>`
    );
  },

  confirmRedFlush(id) {
    const reason = document.getElementById('redFlushReason').value;
    if (!reason) { toast('请填写红冲原因', 'error'); return; }
    DB.update('invoices', id, { status: '已红冲', redFlushReason: reason });
    toast('发票已红冲', 'warning');
    this.reload();
    closeModal();
  },

  printInvoice(id) {
    const r = DB.findById('invoices', id);
    if (!r) return;

    const printHtml = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>发票 - ${r.invoiceNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Microsoft YaHei", "SimHei", sans-serif; padding: 40px; color: #333; font-size: 14px; }
        .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .invoice-title { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
        .invoice-no { font-size: 14px; color: #666; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-left, .info-right { width: 48%; }
        .info-row { display: flex; margin-bottom: 8px; font-size: 13px; }
        .info-label { width: 80px; color: #666; }
        .info-value { font-weight: 600; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .invoice-table th, .invoice-table td { border: 1px solid #ccc; padding: 10px 12px; text-align: left; font-size: 13px; }
        .invoice-table th { background: #f5f5f5; font-weight: 600; }
        .invoice-table .num { text-align: right; }
        .invoice-total { text-align: right; font-size: 16px; margin-bottom: 30px; }
        .invoice-total .amount { font-size: 24px; font-weight: 700; color: #c00; }
        .invoice-footer { display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; }
        .invoice-footer div { text-align: center; min-width: 150px; }
        .sign-line { border-bottom: 1px solid #ccc; margin-top: 50px; width: 120px; display: inline-block; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="invoice-header">
        <div class="invoice-title">增值税发票</div>
        <div class="invoice-no">发票号码：${r.invoiceNo}</div>
      </div>
      <div class="invoice-info">
        <div class="info-left">
          <div class="info-row"><span class="info-label">开票日期：</span><span class="info-value">${r.issueDate}</span></div>
          <div class="info-row"><span class="info-label">发票类型：</span><span class="info-value">${r.type}</span></div>
        </div>
        <div class="info-right">
          <div class="info-row"><span class="info-label">购方名称：</span><span class="info-value">${r.title}</span></div>
          <div class="info-row"><span class="info-label">税　　号：</span><span class="info-value">${r.taxNo || '-'}</span></div>
        </div>
      </div>
      <table class="invoice-table">
        <thead>
          <tr><th>序号</th><th>货物或应税劳务名称</th><th>规格型号</th><th>单位</th><th>数量</th><th>单价</th><th>金额</th><th>税率</th><th>税额</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>商品</td>
            <td>-</td>
            <td>批</td>
            <td class="num">1</td>
            <td class="num">${fmtMoney(r.amount)}</td>
            <td class="num">${fmtMoney(r.amount)}</td>
            <td class="num">${r.taxRate}%</td>
            <td class="num">${fmtMoney(r.taxAmount)}</td>
          </tr>
        </tbody>
      </table>
      <div class="invoice-total">
        <div>价税合计（大写）：<strong>${this.toChineseNum(r.totalAmount)}</strong></div>
        <div>价税合计（小写）：<span class="amount">¥${fmtMoney(r.totalAmount)}</span></div>
      </div>
      <div class="invoice-footer">
        <div>开票人<br><span class="sign-line"></span><br>${r.operator}</div>
        <div>复核人<br><span class="sign-line"></span></div>
        <div>收款人<br><span class="sign-line"></span></div>
      </div>
    </body>
    </html>`;

    const win = window.open('', '_blank', 'width=800,height=600');
    win.document.write(printHtml);
    win.document.close();
    win.onload = () => { win.print(); };
  },

  toChineseNum(num) {
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
    let s = '';
    num = Math.round(num * 100) / 100;
    if (num === 0) return '零圆整';
    if (num < 0) { s = '负'; num = Math.abs(num); }
    const Decimal = num.toString().split('.')[1] || '';
    const Int = num.toString().split('.')[0];
    if (Int !== '0') s += digit[Int[0]] + '圆整';
    return s;
  }
};
