// ===========================
// 扫码枪输入监听模块 v2.1
// ===========================
// 原理：扫码枪模拟键盘输入，字符间间隔 <30ms，末尾发送 Enter
// 支持：EAN-13 / Code-128 / QR 等常见条码
// 功能：
//   1. 新增商品时扫码 → 自动填入条码字段
//   2. 扫已有商品条码 → 自动回填全部商品信息
//   3. 全局扫码搜索（任意页面可用）

const BarcodeScanner = {
  _buffer: '',
  _lastTime: 0,
  _timeout: null,
  _active: false,       // 是否激活扫码模式
  _indicator: null,     // 扫码指示器 DOM
  _onScan: null,        // 扫码回调
  _CHAR_THRESHOLD: 50,  // 字符间隔阈值(ms)，扫码枪 < 50ms，人手 > 80ms
  _MIN_LENGTH: 3,       // 最短条码长度（过滤误触）

  // ===== 初始化全局监听 =====
  init() {
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
  },

  // ===== 激活扫码模式（表单内点击扫码按钮时调用） =====
  activate(onScanCallback) {
    this._active = true;
    this._onScan = onScanCallback || null;
    this._showIndicator();
  },

  // ===== 停用扫码模式 =====
  deactivate() {
    this._active = false;
    this._onScan = null;
    this._buffer = '';
    this._hideIndicator();
  },

  // ===== 是否激活 =====
  isActive() {
    return this._active;
  },

  // ===== 核心：键盘事件处理 =====
  _onKeyDown(e) {
    // 忽略修饰键
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Enter 键 → 处理扫码结果
    if (e.key === 'Enter') {
      if (this._buffer.length >= this._MIN_LENGTH) {
        e.preventDefault();
        e.stopPropagation();
        this._processScan(this._buffer);
        this._buffer = '';
        this._lastTime = 0;
        if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
        return;
      }
      this._buffer = '';
      this._lastTime = 0;
      return;
    }

    // 只接受可打印字符
    if (e.key.length !== 1) return;

    const now = Date.now();

    // 第一个字符 或 间隔太短（防抖）
    if (this._buffer.length === 0 || (now - this._lastTime) < 10) {
      this._buffer += e.key;
      this._lastTime = now;
      this._resetTimeout();
      // 第一个字符时，如果是扫码模式则阻止默认（避免输入到当前焦点的 input）
      if (this._active && this._buffer.length === 1) {
        e.preventDefault();
      }
      return;
    }

    // 检测是否为扫码枪输入（字符间隔 < 阈值）
    if ((now - this._lastTime) < this._CHAR_THRESHOLD) {
      this._buffer += e.key;
      this._lastTime = now;
      this._resetTimeout();

      // 扫码模式下阻止字符输入到表单字段
      if (this._active) {
        e.preventDefault();
      }
    } else {
      // 间隔过长，重置缓冲
      this._buffer = e.key;
      this._lastTime = now;
      this._resetTimeout();
    }
  },

  // ===== 超时清理（防止残留缓冲） =====
  _resetTimeout() {
    if (this._timeout) clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      this._buffer = '';
      this._lastTime = 0;
    }, 300);
  },

  // ===== 处理扫码结果 =====
  _processScan(code) {
    // 1. 尝试在已有商品中查找
    const goods = DB.get('goods') || [];
    const match = goods.find(g => g.barcode === code);

    // 闪绿提示
    this._flashResult(true, code);

    if (match) {
      // 找到匹配商品 → 填充商品信息
      this._fillGoodsForm(match);
      toast(`扫码匹配: ${match.name}`, 'success');
    } else {
      // 未匹配 → 仅填入条码值
      this._fillBarcode(code);
      if (this._active) {
        toast(`条码 ${code} 已填入（未找到匹配商品）`);
      }
    }

    // 回调（供外部模块使用）
    if (this._onScan) {
      this._onScan(code, match || null);
    }
  },

  // ===== 填充商品表单（新增/编辑表单通用） =====
  _fillGoodsForm(g) {
    // 新增表单字段 ID 映射
    const fieldMap = {
      'gName': g.name,
      'gSpec': g.spec || '',
      'gBarcode': g.barcode || '',
      'gBatch': g.batch || '',
      'gCost': g.cost || 0,
      'gPrice': g.price || 0,
      'gUnit': g.unit || '',
      'gLoc': g.location || '',
      'gMin': g.minStock || 10,
      'gMax': g.maxStock || 1000,
      'gDesc': g.desc || '',
      // 编辑表单字段
      'geName': g.name,
      'geSpec': g.spec || '',
      'geBarcode': g.barcode || '',
      'geBatch': g.batch || '',
      'geCost': g.cost || 0,
      'gePrice': g.price || 0,
      'geUnit': g.unit || '',
      'geLoc': g.location || '',
      'geMin': g.minStock || 10,
      'geMax': g.maxStock || 1000,
      'geDesc': g.desc || ''
    };

    let filledCount = 0;
    for (const [id, val] of Object.entries(fieldMap)) {
      const el = document.getElementById(id);
      if (el && val !== '' && val !== null && val !== undefined) {
        if (el.tagName === 'SELECT') {
          // select 需要匹配 option
          for (const opt of el.options) {
            if (opt.value === String(val)) { el.value = val; filledCount++; break; }
          }
        } else {
          el.value = val;
          filledCount++;
        }
      }
    }

    // 保质期处理
    if (g.expiry) {
      const expiryEl = document.getElementById('gExpiry') || document.getElementById('geExpiry');
      if (expiryEl) { expiryEl.value = g.expiry; filledCount++; }
    }

    // 分类处理
    if (g.category) {
      const catEl = document.getElementById('gCat') || document.getElementById('geCat');
      if (catEl) { catEl.value = g.category; filledCount++; }
    }

    // 供应商处理
    if (g.supplierId) {
      const supEl = document.getElementById('gSupplier') || document.getElementById('geSupplier');
      if (supEl) { supEl.value = g.supplierId; filledCount++; }
    }

    if (filledCount > 0) {
      this._flashIndicator('green', `✓ 已填充 ${filledCount} 个字段`);
    }
  },

  // ===== 仅填入条码值 =====
  _fillBarcode(code) {
    const ids = ['gBarcode', 'geBarcode'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        el.value = code;
        el.style.transition = 'background 0.3s';
        el.style.background = 'rgba(59,110,255,0.08)';
        setTimeout(() => { el.style.background = ''; }, 800);
        break;
      }
    }
  },

  // ===== UI：扫码指示器 =====
  _showIndicator() {
    this._hideIndicator();
    const div = document.createElement('div');
    div.id = 'scanIndicator';
    div.className = 'scan-indicator';
    div.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
        <line x1="7" y1="12" x2="17" y2="12"/>
      </svg>
      <span>扫码就绪</span>`;
    document.body.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    this._indicator = div;
  },

  _hideIndicator() {
    const el = document.getElementById('scanIndicator');
    if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }
    this._indicator = null;
  },

  _flashIndicator(color, text) {
    if (!this._indicator) return;
    const span = this._indicator.querySelector('span');
    const origText = span.textContent;
    const origColor = color === 'green' ? 'var(--success)' : 'var(--danger)';
    span.textContent = text;
    this._indicator.style.borderColor = origColor;
    this._indicator.style.color = origColor;
    setTimeout(() => {
      if (this._indicator) {
        span.textContent = origText;
        this._indicator.style.borderColor = '';
        this._indicator.style.color = '';
      }
    }, 1500);
  },

  // ===== UI：扫码结果闪烁 =====
  _flashResult(success, code) {
    // 在页面右上角短暂显示扫码结果
    const div = document.createElement('div');
    div.className = 'scan-toast';
    div.innerHTML = `
      <span style="font-size:18px">${success ? '✅' : '❌'}</span>
      <span style="font-family:monospace;font-size:13px;margin-left:6px">${code}</span>`;
    document.body.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    setTimeout(() => {
      div.classList.remove('show');
      setTimeout(() => div.remove(), 300);
    }, 2000);
  },

  // ===== 便捷方法：在指定输入框上启用扫码 =====
  // 用于非表单场景（如搜索框、入库/出库商品选择等）
  scanTo(targetInputId, callback) {
    this._active = true;
    this._onScan = (code, match) => {
      // 填入目标输入框
      const input = document.getElementById(targetInputId);
      if (input) {
        input.value = code;
        input.dispatchEvent(new Event('input'));
      }
      if (callback) callback(code, match);
    };
    this._showIndicator();
  }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => BarcodeScanner.init());
