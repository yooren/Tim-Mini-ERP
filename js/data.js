// ===========================
// 本地数据管理层（支持多账套）
// ===========================

const DB = {
  // 当前账套（默认 'default'）
  _currentAccount: 'default',

  // 账套数据集合键名列表（这些键会按账套隔离存储）
  _accountKeys: [
    'users', 'goods', 'inbounds', 'outbounds', 'suppliers', 'customers',
    'carriers', 'transportPlans', 'deliveryOrders', 'warehouses', 'transfers',
    'inventoryChecks', 'inventoryRecords', 'serviceTickets', 'ticketReplies',
    'productionOrders', 'boms', 'bomMaterials', 'outsourcingOrders', 'outsourcingMaterials',
    'equipment', 'maintenanceRecords', 'employees', 'departments', 'attendanceRecords',
    'incomingInspections', 'processInspections', 'finalInspections',
    'qualityNCRs', 'spcRecords', 'qualityCertificates',
    'salesLeads', 'salesQuotations', 'salesOrders', 'salesKpis', 'crmMembers',
    'purchaseOrders', 'purchaseInquiries', 'purchaseComparisons',
    'invoices', 'financeRecords', 'financeCategories',
    'customers', 'customerPriceLists',
    'audit', 'warnings', 'records',
    'permissions', 'customRoles'
  ],

  // ===== 账套管理 =====
  // 获取所有账套列表
  getAccounts() {
    try {
      return JSON.parse(localStorage.getItem('wms_accounts') || 'null') || [
        { id: 'default', name: '演示账套', desc: '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放', createdAt: '2025-01-01' }
      ];
    } catch(e) { return [{ id: 'default', name: '演示账套', desc: '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放', createdAt: '2025-01-01' }]; }
  },

  // 保存账套列表
  saveAccounts(accounts) {
    localStorage.setItem('wms_accounts', JSON.stringify(accounts));
  },

  // 获取当前账套ID
  getCurrentAccount() {
    return localStorage.getItem('wms_currentAccount') || 'default';
  },

  // 切换当前账套
  switchAccount(accountId) {
    const accounts = this.getAccounts();
    if (!accounts.find(a => a.id === accountId)) return false;
    this._currentAccount = accountId;
    localStorage.setItem('wms_currentAccount', accountId);
    // 注意：这里不能清除该账套的 _initialized 标记。
    // init() 用这个标记判断"是否需要 seedData() 播种初始演示数据"；
    // 之前的实现每次切换账套都会清掉标记，导致哪怕是已经用了很久、存了
    // 大量真实数据的账套，只要重新切换进去就会被 seedData() 整体覆盖，
    // 表现为账套数据无故清空、回到最初的演示数据。全新账套本来就没有
    // 这个标记，会被 init() 自然识别为"首次进入"并正确播种，无需在这里
    // 手动干预。
    return true;
  },

  // 创建新账套
  createAccount(name, desc) {
    const accounts = this.getAccounts();
    const id = 'acc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    accounts.push({ id, name, desc: desc || '', createdAt: new Date().toISOString().slice(0, 10) });
    this.saveAccounts(accounts);
    if (this._syncEnabled) {
      // 用本地生成的 id 在服务端创建同名账套，保持前后端账套 id 一致
      fetch(`${this.getApiBase()}/api/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, desc })
      }).catch(() => {});
    }
    return id;
  },

  // 删除账套
  deleteAccount(accountId) {
    if (accountId === 'default') return false; // 不允许删除默认账套
    let accounts = this.getAccounts();
    accounts = accounts.filter(a => a.id !== accountId);
    this.saveAccounts(accounts);
    // 清除该账套的所有数据
    const prefix = 'wms_' + accountId + '_';
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (this._syncEnabled) {
      fetch(`${this.getApiBase()}/api/accounts/${accountId}`, { method: 'DELETE' }).catch(() => {});
    }
    return true;
  },

  // 重命名账套
  renameAccount(accountId, name, desc) {
    const accounts = this.getAccounts();
    const acc = accounts.find(a => a.id === accountId);
    if (acc) {
      acc.name = name;
      if (desc !== undefined) acc.desc = desc;
      this.saveAccounts(accounts);
      if (this._syncEnabled) {
        fetch(`${this.getApiBase()}/api/accounts/${accountId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, desc: acc.desc })
        }).catch(() => {});
      }
      return true;
    }
    return false;
  },

  // 获取账套数据统计
  getAccountStats(accountId) {
    const prefix = 'wms_' + accountId + '_';
    let dataCount = 0;
    let keyCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keyCount++;
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(val)) dataCount += val.length;
        } catch(e) {}
      }
    }
    return { keyCount, dataCount };
  },

  // 导出指定账套数据
  exportAccount(accountId) {
    const prefix = 'wms_' + accountId + '_';
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const shortKey = key.slice(prefix.length);
        try { data[shortKey] = JSON.parse(localStorage.getItem(key)); } catch(e) {}
      }
    }
    return data;
  },

  // 导入数据到指定账套
  importAccount(accountId, data) {
    const prefix = 'wms_' + accountId + '_';
    Object.keys(data).forEach(key => {
      localStorage.setItem(prefix + key, JSON.stringify(data[key]));
    });
    localStorage.setItem(prefix + 'initialized', '1');
  },

  // 初始化账套
  init() {
    // 恢复当前账套
    this._currentAccount = this.getCurrentAccount();

    // 确保账套列表存在
    if (!localStorage.getItem('wms_accounts')) {
      this.saveAccounts([{ id: 'default', name: '演示账套', desc: '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放', createdAt: '2025-01-01' }]);
    }

    // 迁移旧数据：将 wms_key 格式的数据迁移到 wms_default_key 格式
    this._migrateToAccountSets();

    // 迁移：把管理员尚未手动改名过的默认账套，从旧名称"默认账套"改为"演示账套"，
    // 明确它只是内置示例数据，避免用户误把真实业务数据存进这个账套
    this.migrateDefaultAccountName();

    // 检查当前账套是否已初始化。只有内置的 'default' 账套播种完整示例数据（商品/
    // 供应商/出入库记录等，供用户体验功能）；其余全部是用户自己新建的账套，只初始化
    // 一个可登录的管理员账号和默认权限矩阵，不带任何业务基础数据/单据，保证新账套是
    // 真正的空白账套。
    const initKey = 'wms_' + this._currentAccount + '_initialized';
    if (!localStorage.getItem(initKey)) {
      if (this._currentAccount === 'default') {
        this.seedData();
      } else {
        this.seedEmptyAccount();
      }
      localStorage.setItem(initKey, '1');
    }

    // 迁移
    this.migrateGoodsImage();
    this.migrateRecordStatus();
    this.migrateQualityTables();
    this.migrateWarehouseStock();
    this.migratePermissionsDefault();
    this.migrateAuditKey();

    // 后台异步探测/同步服务端数据库（未配置后端地址时立即退出，不影响本地模式启动速度）
    this.initSync();
  },

  // ===== 服务端同步（可选）=====
  // 未配置 API 地址或后端不可达时，系统完全退化为纯 localStorage 单机模式，
  // 行为与原版一致；配置后可实现多终端共享同一份数据。
  getApiBase() {
    return localStorage.getItem('wms_apiBase') || '';
  },

  setApiBase(url) {
    if (url) localStorage.setItem('wms_apiBase', url.replace(/\/+$/, ''));
    else localStorage.removeItem('wms_apiBase');
  },

  _syncEnabled: false,

  // 探测后端是否可达（2.5秒超时），结果写入 this._syncEnabled
  async checkSync() {
    const base = this.getApiBase();
    if (!base) { this._syncEnabled = false; return false; }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(base + '/api/health', { signal: ctrl.signal });
      clearTimeout(timer);
      this._syncEnabled = res.ok;
    } catch (e) {
      this._syncEnabled = false;
    }
    return this._syncEnabled;
  },

  // 应用启动/切换账套时调用：探测后端，可用则与当前账套做一次同步
  async initSync() {
    const ok = await this.checkSync();
    if (!ok) {
      if (this.getApiBase()) console.warn('[WMS] 服务端数据库不可达，暂时降级为本地 localStorage 模式');
      return;
    }
    console.info('[WMS] 已连接服务端数据库:', this.getApiBase());
    await this._ensureServerAccount(this._currentAccount);
    await this._syncAccountFromServer(this._currentAccount);
  },

  // 确保当前账套在服务端存在（不存在则用本地账套信息创建，保持 id 一致，便于后续按 id 同步）
  async _ensureServerAccount(accountId) {
    const base = this.getApiBase();
    try {
      const res = await fetch(base + '/api/accounts');
      const accounts = res.ok ? await res.json() : [];
      if (accounts.find(a => a.id === accountId)) return;
      const local = this.getAccounts().find(a => a.id === accountId) || { name: accountId, desc: '' };
      await fetch(base + '/api/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, name: local.name, desc: local.desc })
      });
    } catch (e) { console.warn('[WMS] 同步账套信息到服务端失败', e); }
  },

  // 拉取服务端该账套下全部集合数据；若服务端尚无数据（全新后端），
  // 则把本地当前数据整体推送上去，作为其他客户端后续同步的初始数据源
  async _syncAccountFromServer(accountId) {
    const base = this.getApiBase();
    try {
      const res = await fetch(`${base}/api/${accountId}/_all`);
      const remote = res.ok ? await res.json() : {};
      const remoteKeys = Object.keys(remote);
      if (remoteKeys.length === 0) {
        const localDump = {};
        this._accountKeys.forEach(k => { localDump[k] = this.get(k); });
        await fetch(`${base}/api/${accountId}/_all`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(localDump)
        });
      } else {
        // 服务端已有数据：以服务端为权威副本覆盖本地，实现多终端共享同一份数据
        remoteKeys.forEach(k => {
          localStorage.setItem(this._prefix(k), JSON.stringify(remote[k]));
        });
      }
    } catch (e) { console.warn('[WMS] 拉取服务端数据失败，继续使用本地数据', e); }
  },

  // 写操作异步同步到服务端（fire-and-forget，不阻塞界面；网络失败时静默降级为本地模式，
  // 直到下次 initSync() 重新探测成功）
  _pushToServer(key, val) {
    if (!this._syncEnabled || !this._accountKeys.includes(key)) return;
    const base = this.getApiBase();
    fetch(`${base}/api/${this._currentAccount}/${key}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(val), keepalive: true
    }).catch(() => { this._syncEnabled = false; });
  },

  // 迁移：为未配置权限矩阵的账套写入安全默认值。
  // hasPerm() 在权限数据缺失时默认拒绝（而非放行），所以任何尚未经管理员手动
  // 配置过权限的账套（新建账套，或本次更新前就已初始化的旧账套）都必须在这里
  // 补齐一份默认矩阵，否则 staff/viewer 用户登录后将无法访问任何模块。
  migratePermissionsDefault() {
    const key = this._prefix('permissions');
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        // 只要 staff 角色已经有任意配置，视为管理员已手动设置过，不覆盖
        if (data && data.staff && Object.keys(data.staff).length > 0) return;
      } catch (e) {}
    }
    localStorage.setItem(key, JSON.stringify(this.buildDefaultPermissions()));
  },

  // 迁移：审计日志历史上使用未加账套前缀的全局键 wms_audit 存储，
  // 与账套隔离设计不一致（所有账套共享同一份审计记录）。将其迁移到
  // 当前账套命名空间下，避免历史数据在改用账套前缀后丢失或串号。
  migrateAuditKey() {
    const oldKey = 'wms_audit';
    const newKey = this._prefix('audit');
    if (oldKey === newKey) return;
    if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey));
    }
  },

  // 迁移：内置默认账套曾经叫"默认账套"，现改名为"演示账套"以明确它只是示例数据。
  // 只重命名仍是旧名称的（说明管理员没有手动改过名），避免覆盖管理员自己的命名。
  migrateDefaultAccountName() {
    const accounts = this.getAccounts();
    const acc = accounts.find(a => a.id === 'default');
    if (acc && acc.name === '默认账套') {
      acc.name = '演示账套';
      if (!acc.desc || acc.desc === '系统默认账套') {
        acc.desc = '内置示例数据，可用于体验系统功能；真实业务数据建议新建账套单独存放';
      }
      this.saveAccounts(accounts);
    }
  },

  // 生成默认权限矩阵：staff 除系统设置外拥有全部操作，viewer 仅查看/导出/打印。
  // 模块 key 列表需与 js/pages/settings.js 中 _permModules 保持一致。
  buildDefaultPermissions() {
    const modules = [
      'dashboard', 'goods', 'inbound', 'outbound', 'inventory', 'record', 'transfer', 'warehouse',
      'supplier', 'customer', 'department', 'report', 'finance', 'hrm', 'crm', 'analytics', 'salesKpi',
      'eam', 'invoice', 'customerPrice', 'carrier', 'transportPlan', 'freight', 'tracking', 'delivery',
      'bom', 'productionPlan', 'mes', 'outsourcing', 'quality', 'warning', 'audit', 'roles', 'settings'
    ];
    const allActions = ['view', 'create', 'edit', 'delete', 'export', 'import', 'print', 'approve'];
    const staff = {};
    const viewer = {};
    modules.forEach(m => {
      staff[m] = m === 'settings' ? ['view'] : [...allActions];
      viewer[m] = ['view', 'export', 'print'];
    });
    return { admin: {}, staff, viewer };
  },

  // 迁移旧数据到新账套格式
  _migrateToAccountSets() {
    // 检查是否已经迁移过
    if (localStorage.getItem('wms_accountMigrationDone')) return;
    
    // 将旧的 wms_key 数据迁移到 wms_default_key
    this._accountKeys.forEach(key => {
      const oldKey = 'wms_' + key;
      const newKey = 'wms_default_' + key;
      if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, localStorage.getItem(oldKey));
      }
    });

    // 迁移权限数据
    if (localStorage.getItem('wms_permissions') && !localStorage.getItem('wms_default_permissions')) {
      localStorage.setItem('wms_default_permissions', localStorage.getItem('wms_permissions'));
    }

    // 标记迁移完成
    localStorage.setItem('wms_accountMigrationDone', '1');
  },

  // 获取账套前缀（内部使用）
  _prefix(key) {
    // 账套数据使用带前缀的键，全局配置不使用前缀
    if (this._accountKeys.includes(key)) {
      return 'wms_' + this._currentAccount + '_' + key;
    }
    return 'wms_' + key;
  },

  // 迁移旧商品数据，补充 image 字段
  migrateGoodsImage() {
    const defaultImages = {
      1: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708',
      2: 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/mate60-pro/imgs/overview/kv/mate60pro-kv-1-pc.jpg',
      3: 'https://p3-ofp.static.pub/fes/cms/2022/09/23/gxs9u4kv5xfbvox0oazst1dp8ifqvs726570.png',
      9: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/monitors/u-series/u2722d/media-gallery/monitor-u2722d-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402&chrss=full'
    };
    const goods = this.get('goods');
    let changed = false;
    goods.forEach(g => {
      if (g.image === undefined) {
        g.image = defaultImages[g.id] || '';
        changed = true;
      }
    });
    if (changed) this.set('goods', goods);
  },

  // 迁移质量管理表名（旧名 → 新名）
  migrateQualityTables() {
    // iqcRecords → incomingInspections
    this.migrateTable('iqcRecords', 'incomingInspections');
    // ipqcRecords → processInspections
    this.migrateTable('ipqcRecords', 'processInspections');
    // oqcRecords → finalInspections
    this.migrateTable('oqcRecords', 'finalInspections');
    // defectRecords → qualityNCRs
    this.migrateTable('defectRecords', 'qualityNCRs');
    // spcData → spcRecords
    this.migrateTable('spcData', 'spcRecords');
    // certificates → qualityCertificates
    this.migrateTable('certificates', 'qualityCertificates');
  },

  // 迁移旧商品数据，补充 warehouseStock 字段（按仓库分配库存）
  migrateWarehouseStock() {
    const goods = this.get('goods');
    let changed = false;
    let warehouses = this.get('warehouses');
    // 从没有仓库集合的旧版本升级时（早于"仓库调拨"功能上线），兜底创建默认仓库，
    // 否则 warehouseStock 会永久保持缺失，导致按仓库维度的库存统计一直为空。
    if (!warehouses.length) {
      if (!goods.length) return; // 没有商品数据也没必要创建仓库
      warehouses = [
        { id: 1, name: '主仓库', code: 'WH001', address: '', manager: '', status: 1, createdAt: new Date().toISOString().slice(0, 10) },
        { id: 2, name: '分仓库A', code: 'WH002', address: '', manager: '', status: 1, createdAt: new Date().toISOString().slice(0, 10) }
      ];
      this.set('warehouses', warehouses);
    }

    goods.forEach(g => {
      if (!g.warehouseStock) {
        // 将现有总库存按仓库分配：70%主仓库，30%分仓库
        if (g.stock > 0) {
          const ws = {};
          const mainQty = Math.round(g.stock * 0.7);
          const remainQty = g.stock - mainQty;
          ws[warehouses[0].id] = mainQty; // 主仓库
          if (warehouses.length > 1 && remainQty > 0) {
            ws[warehouses[1].id] = remainQty; // 分仓库
          }
          g.warehouseStock = ws;
        } else {
          g.warehouseStock = {};
        }
        changed = true;
      }
    });
    if (changed) this.set('goods', goods);
  },

  migrateTable(oldKey, newKey) {
    const oldData = this.get(oldKey);
    if (oldData && oldData.length > 0) {
      const newData = this.get(newKey);
      if (!newData || newData.length === 0) {
        this.set(newKey, oldData);
      }
    }
  },

  // 迁移旧出入库记录，补上 status 字段
  migrateRecordStatus() {
    ['inbounds', 'outbounds'].forEach(key => {
      const items = this.get(key);
      let changed = false;
      items.forEach(item => {
        if (!item.status) { item.status = '已审核'; changed = true; }
      });
      if (changed) this.set(key, items);
    });
  },

  // 新建账套的初始化：只创建一个可登录的管理员账号 + 默认权限矩阵，
  // 不写入任何商品/供应商/客户/出入库/生产/质量等业务基础数据或单据，
  // 保证用户新建的账套是真正干净的空白账套（示例数据只保留在内置的演示账套里）。
  seedEmptyAccount() {
    this.set('users', [
      { id: 1, username: 'admin', password: '123456', name: '系统管理员', role: 'admin', avatar: 'A', status: 1, createdAt: new Date().toISOString().slice(0, 10) }
    ]);
    localStorage.setItem(this._prefix('permissions'), JSON.stringify(this.buildDefaultPermissions()));
  },

  seedData() {
    // 用户
    this.set('users', [
      { id: 1, username: 'admin', password: '123456', name: '系统管理员', role: 'admin', avatar: 'A', status: 1, createdAt: '2025-01-01' },
      { id: 2, username: 'staff', password: '123456', name: '仓库管理员', role: 'staff', avatar: 'S', status: 1, createdAt: '2025-01-10' },
      { id: 3, username: 'viewer', password: '123456', name: '只读用户', role: 'viewer', avatar: 'V', status: 1, createdAt: '2025-02-01' }
    ]);

    // 商品分类
    this.set('categories', [
      { id: 1, name: '电子产品', icon: '💻', desc: '手机、电脑等电子设备', count: 0 },
      { id: 2, name: '办公用品', icon: '📎', desc: '文具、耗材等办公物资', count: 0 },
      { id: 3, name: '食品饮料', icon: '🍎', desc: '食品、饮料等消耗品', count: 0 },
      { id: 4, name: '服装鞋帽', icon: '👕', desc: '衣物、鞋帽等纺织品', count: 0 },
      { id: 5, name: '机械配件', icon: '⚙️', desc: '机器零配件', count: 0 },
      { id: 6, name: '化工材料', icon: '🧪', desc: '化学原料及制品', count: 0 }
    ]);

    // 计量单位
    this.set('units', [
      { id: 1, name: '个', desc: '通用计数单位', status: 1 },
      { id: 2, name: '台', desc: '设备/机器', status: 1 },
      { id: 3, name: '箱', desc: '箱装商品', status: 1 },
      { id: 4, name: '盒', desc: '盒装商品', status: 1 },
      { id: 5, name: '件', desc: '大件数装', status: 1 },
      { id: 6, name: '套', desc: '套装/组合', status: 1 },
      { id: 7, name: '瓶', desc: '瓶装液体', status: 1 },
      { id: 8, name: '袋', desc: '袋装商品', status: 1 },
      { id: 9, name: '米', desc: '长度单位', status: 1 },
      { id: 10, name: '公斤', desc: '重量单位', status: 1 },
      { id: 11, name: '平方米', desc: '面积单位', status: 1 },
      { id: 12, name: '升', desc: '容量单位', status: 1 }
    ]);

    // 库位
    this.set('locations', [
      { id: 1, code: 'A-01-01', zone: 'A区', row: 1, col: 1, type: '货架', status: 1 },
      { id: 2, code: 'A-01-02', zone: 'A区', row: 1, col: 2, type: '货架', status: 1 },
      { id: 3, code: 'A-02-01', zone: 'A区', row: 2, col: 1, type: '货架', status: 1 },
      { id: 4, code: 'A-02-02', zone: 'A区', row: 2, col: 2, type: '货架', status: 1 },
      { id: 5, code: 'B-01-01', zone: 'B区', row: 1, col: 1, type: '货架', status: 1 },
      { id: 6, code: 'B-01-02', zone: 'B区', row: 1, col: 2, type: '货架', status: 1 },
      { id: 7, code: 'B-02-01', zone: 'B区', row: 2, col: 1, type: '货架', status: 1 },
      { id: 8, code: 'C-01-01', zone: 'C区', row: 1, col: 1, type: '货架', status: 1 },
      { id: 9, code: 'C-01-02', zone: 'C区', row: 1, col: 2, type: '货架', status: 1 },
      { id: 10, code: 'D-01-01', zone: 'D区', row: 1, col: 1, type: '地面', status: 1 },
      { id: 11, code: 'D-01-02', zone: 'D区', row: 1, col: 2, type: '地面', status: 1 },
      { id: 12, code: 'E-01-01', zone: 'E区', row: 1, col: 1, type: '堆叠区', status: 1 }
    ]);

    // 供应商
    this.set('suppliers', [
      { id: 1, name: '深圳华强电子', contact: '张经理', phone: '13800138001', email: 'zhang@hq.com', address: '广东省深圳市华强北路1号', categories: '电子产品', status: 1, createdAt: '2025-01-05' },
      { id: 2, name: '上海文具批发商', contact: '李总', phone: '13900139002', email: 'li@wj.com', address: '上海市静安区南京西路100号', categories: '办公用品,化工材料', status: 1, createdAt: '2025-01-08' },
      { id: 3, name: '广州食品贸易', contact: '王总', phone: '13600136003', email: 'wang@gzfood.com', address: '广东省广州市天河区天河路200号', categories: '食品饮料', status: 1, createdAt: '2025-01-12' },
      { id: 4, name: '北京机械零件厂', contact: '刘厂长', phone: '13700137004', email: 'liu@bjmachine.com', address: '北京市朝阳区望京路50号', categories: '机械配件,电子产品', status: 0, createdAt: '2025-02-01' }
    ]);

    // 客户
    this.set('customers', [
      { id: 1, name: '阿里巴巴集团', contact: '赵采购', phone: '13500135001', email: 'zhao@alibaba.com', address: '浙江省杭州市余杭区阿里巴巴园区', type: '企业客户', status: 1, createdAt: '2025-01-06' },
      { id: 2, name: '腾讯科技', contact: '孙经理', phone: '13400134002', email: 'sun@tencent.com', address: '广东省深圳市南山区科技园', type: '企业客户', status: 1, createdAt: '2025-01-09' },
      { id: 3, name: '中国平安', contact: '周总监', phone: '13300133003', email: 'zhou@pingan.com', address: '广东省深圳市福田区平安大厦', type: '企业客户', status: 1, createdAt: '2025-01-15' },
      { id: 4, name: '张先生（个人）', contact: '张三', phone: '13200132004', email: 'zhangsan@qq.com', address: '北京市海淀区中关村大街10号', type: '个人客户', status: 1, createdAt: '2025-02-10' }
    ]);

    // 部门
    this.set('departments', [
      { id: 1, name: '行政部', manager: '王芳', phone: '8001', desc: '负责公司行政事务、日常管理', status: 1, createdAt: '2025-01-01' },
      { id: 2, name: '财务部', manager: '李明', phone: '8002', desc: '负责公司财务核算与资金管理', status: 1, createdAt: '2025-01-01' },
      { id: 3, name: '技术部', manager: '张强', phone: '8003', desc: '负责技术研发与系统维护', status: 1, createdAt: '2025-01-01' },
      { id: 4, name: '市场部', manager: '赵敏', phone: '8004', desc: '负责市场拓展与品牌推广', status: 1, createdAt: '2025-01-01' }
    ]);

    // 员工
    this.set('employees', [
      { id: 1, name: '王芳', departmentId: 1, departmentName: '行政部', position: '行政总监', phone: '13800000001', email: 'wangfang@company.com', status: 1, createdAt: '2025-01-05' },
      { id: 2, name: '刘洋', departmentId: 1, departmentName: '行政部', position: '行政专员', phone: '13800000002', email: 'liuyang@company.com', status: 1, createdAt: '2025-01-08' },
      { id: 3, name: '李明', departmentId: 2, departmentName: '财务部', position: '财务经理', phone: '13800000003', email: 'liming@company.com', status: 1, createdAt: '2025-01-06' },
      { id: 4, name: '陈静', departmentId: 2, departmentName: '财务部', position: '会计', phone: '13800000004', email: 'chenjing@company.com', status: 1, createdAt: '2025-01-10' },
      { id: 5, name: '张强', departmentId: 3, departmentName: '技术部', position: '技术总监', phone: '13800000005', email: 'zhangqiang@company.com', status: 1, createdAt: '2025-01-05' },
      { id: 6, name: '周涛', departmentId: 3, departmentName: '技术部', position: '前端工程师', phone: '13800000006', email: 'zhoutao@company.com', status: 1, createdAt: '2025-01-12' },
      { id: 7, name: '吴倩', departmentId: 3, departmentName: '技术部', position: '后端工程师', phone: '13800000007', email: 'wuqian@company.com', status: 1, createdAt: '2025-01-15' },
      { id: 8, name: '赵敏', departmentId: 4, departmentName: '市场部', position: '市场总监', phone: '13800000008', email: 'zhaomin@company.com', status: 1, createdAt: '2025-01-06' },
      { id: 9, name: '孙伟', departmentId: 4, departmentName: '市场部', position: '市场专员', phone: '13800000009', email: 'sunwei@company.com', status: 1, createdAt: '2025-01-18' }
    ]);

    // 领取记录（办公用品）
    this.set('claimRecords', [
      { id: 1, employeeId: 1, employeeName: '王芳', departmentId: 1, departmentName: '行政部', goodsId: 4, goodsName: '得力圆珠笔(蓝)', unit: '盒', qty: 5, price: 18, total: 90, note: '部门办公使用', date: '2025-02-05' },
      { id: 2, employeeId: 2, employeeName: '刘洋', departmentId: 1, departmentName: '行政部', goodsId: 5, goodsName: 'A4打印纸', unit: '箱', qty: 2, price: 180, total: 360, note: '月结耗材', date: '2025-02-10' },
      { id: 3, employeeId: 6, employeeName: '周涛', departmentId: 3, departmentName: '技术部', goodsId: 9, goodsName: 'Dell显示器27寸', unit: '台', qty: 1, price: 2199, total: 2199, note: '新员工配发', date: '2025-02-15' },
      { id: 4, employeeId: 8, employeeName: '赵敏', departmentId: 4, departmentName: '市场部', goodsId: 4, goodsName: '得力圆珠笔(蓝)', unit: '盒', qty: 3, price: 18, total: 54, note: '会议记录', date: '2025-02-20' },
      { id: 5, employeeId: 7, employeeName: '吴倩', departmentId: 3, departmentName: '技术部', goodsId: 10, goodsName: '订书机', unit: '个', qty: 2, price: 35, total: 70, note: '文件装订', date: '2025-03-01' },
      { id: 6, employeeId: 4, employeeName: '陈静', departmentId: 2, departmentName: '财务部', goodsId: 5, goodsName: 'A4打印纸', unit: '箱', qty: 3, price: 180, total: 540, note: '财务凭证打印', date: '2025-03-05' },
      { id: 7, employeeId: 9, employeeName: '孙伟', departmentId: 4, departmentName: '市场部', goodsId: 4, goodsName: '得力圆珠笔(蓝)', unit: '盒', qty: 4, price: 18, total: 72, note: '销售团队配发', date: '2025-03-10' }
    ]);

    // 商品（初始库存为0，通过入库单审核后增加）
    // warehouseStock: { 仓库ID: 数量 } 用于按仓库跟踪库存分布
    const goods = [
      { id: 1, code: 'G0001', name: 'iPhone 15 Pro Max', category: 1, unit: '台', price: 9999, cost: 7800, stock: 50, minStock: 10, maxStock: 200, location: 'A-01-01', supplierId: 1, status: 1, barcode: '6901234567890', spec: '256GB/原色钛金属', batch: 'IP15PM-20250110', desc: 'Apple iPhone 15 Pro Max 256GB', image: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/iphone-15-pro-finish-select-202309-6-7inch-naturaltitanium?wid=5120&hei=2880&fmt=p-jpg&qlt=80&.v=1692845702708', warehouseStock: { 1: 30, 2: 15, 4: 5 }, createdAt: '2025-01-10' },
      { id: 2, code: 'G0002', name: '华为Mate 60 Pro', category: 1, unit: '台', price: 6999, cost: 5500, stock: 35, minStock: 10, maxStock: 150, location: 'A-01-02', supplierId: 1, status: 1, barcode: '6902345678901', spec: '512GB/雅丹黑', batch: 'HW60P-20250110', desc: '华为Mate 60 Pro 512GB', image: 'https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/phones/mate60-pro/imgs/overview/kv/mate60pro-kv-1-pc.jpg', warehouseStock: { 1: 20, 2: 10, 4: 5 }, createdAt: '2025-01-10' },
      { id: 3, code: 'G0003', name: '联想ThinkPad笔记本', category: 1, unit: '台', price: 7499, cost: 5800, stock: 20, minStock: 5, maxStock: 80, location: 'A-02-01', supplierId: 1, status: 1, barcode: '6903456789012', spec: 'X1 Carbon/i7/16G', desc: 'ThinkPad X1 Carbon i7 16G', image: 'https://p3-ofp.static.pub/fes/cms/2022/09/23/gxs9u4kv5xfbvox0oazst1dp8ifqvs726570.png', warehouseStock: { 1: 12, 3: 8 }, createdAt: '2025-01-11' },
      { id: 4, code: 'G0004', name: '得力圆珠笔(蓝)', category: 2, unit: '盒', price: 18, cost: 8, stock: 120, minStock: 20, maxStock: 500, location: 'B-01-01', supplierId: 2, status: 1, barcode: '6914567890123', spec: '50支/盒/蓝色', desc: '得力圆珠笔蓝色50支/盒', image: '', warehouseStock: { 1: 80, 2: 40 }, createdAt: '2025-01-12' },
      { id: 5, code: 'G0005', name: 'A4打印纸', category: 2, unit: '箱', price: 180, cost: 120, stock: 60, minStock: 20, maxStock: 300, location: 'B-01-02', supplierId: 2, status: 1, barcode: '6915678901234', spec: '70g/500张x10包/箱', desc: 'A4复印纸70g 500张/包 10包/箱', image: '', warehouseStock: { 1: 40, 2: 20 }, createdAt: '2025-01-12' },
      { id: 6, code: 'G0006', name: '农夫山泉矿泉水', category: 3, unit: '箱', price: 38, cost: 20, stock: 80, minStock: 30, maxStock: 600, location: 'C-01-01', supplierId: 3, status: 1, barcode: '6926789012345', spec: '550ml/24瓶/箱', batch: 'NFS-20250113', desc: '农夫山泉天然矿泉水550ml 24瓶/箱', image: '', warehouseStock: { 1: 50, 3: 30 }, createdAt: '2025-01-13' },
      { id: 7, code: 'G0007', name: '可口可乐330ml', category: 3, unit: '箱', price: 42, cost: 28, stock: 65, minStock: 30, maxStock: 500, location: 'C-01-02', supplierId: 3, status: 1, barcode: '6937890123456', spec: '330ml/24罐/箱', batch: 'KKKL-20250113', desc: '可口可乐碳酸饮料330ml 24罐/箱', image: '', warehouseStock: { 1: 40, 2: 25 }, createdAt: '2025-01-13' },
      { id: 8, code: 'G0008', name: '尼龙轴承', category: 5, unit: '个', price: 28, cost: 15, stock: 200, minStock: 50, maxStock: 1000, location: 'D-01-01', supplierId: 4, status: 1, barcode: '6948901234567', spec: '6204型号/尼龙', desc: '工业用尼龙轴承6204型号', image: '', warehouseStock: { 1: 120, 3: 80 }, createdAt: '2025-01-14' },
      { id: 9, code: 'G0009', name: 'Dell显示器27寸', category: 1, unit: '台', price: 2199, cost: 1650, stock: 15, minStock: 5, maxStock: 60, location: 'A-03-01', supplierId: 1, status: 1, barcode: '6959012345678', spec: 'U2722D/4K/27英寸', desc: 'Dell U2722D 27英寸4K显示器', image: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/monitors/u-series/u2722d/media-gallery/monitor-u2722d-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=402&wid=402&qlt=100,1&resMode=sharp2&size=402,402&chrss=full', warehouseStock: { 1: 10, 2: 5 }, createdAt: '2025-01-15' },
      { id: 10, code: 'G0010', name: '订书机', category: 2, unit: '个', price: 35, cost: 18, stock: 45, minStock: 10, maxStock: 200, location: 'B-02-01', supplierId: 2, status: 1, barcode: '6960123456789', spec: '12号/黑色', desc: '得力12号订书机', image: '', warehouseStock: { 1: 30, 2: 15 }, createdAt: '2025-01-16' }
    ];
    this.set('goods', goods);

    // 入库记录
    const inbounds = this.generateInbounds(goods);
    this.set('inbounds', inbounds);

    // 出库记录
    const outbounds = this.generateOutbounds(goods);
    this.set('outbounds', outbounds);

    // 盘点记录
    this.set('inventories', [
      { id: 1, code: 'IC202501', date: '2025-01-31', operator: 'admin', status: '已完成', note: '1月末例行盘点', items: 10, diff: -2, createdAt: '2025-01-31' },
      { id: 2, code: 'IC202502', date: '2025-02-28', operator: 'staff', status: '已完成', note: '2月末盘点', items: 10, diff: 1, createdAt: '2025-02-28' },
      { id: 3, code: 'IC202503', date: '2025-03-15', operator: 'admin', status: '进行中', note: '季末全面盘点', items: 10, diff: 0, createdAt: '2025-03-15' }
    ]);

    // ===== 新增：销售管理 =====
    // 客户价格表
    this.set('customerPrices', [
      { id: 1, customerId: 1, customerName: '阿里巴巴集团', goodsId: 1, goodsName: 'iPhone 15 Pro Max', price: 8999, discount: 10, unit: '台', effectiveDate: '2025-01-01', expiryDate: '2025-12-31', status: 1, createdAt: '2025-01-01' },
      { id: 2, customerId: 1, customerName: '阿里巴巴集团', goodsId: 3, goodsName: '联想ThinkPad笔记本', price: 6999, discount: 6.7, unit: '台', effectiveDate: '2025-01-01', expiryDate: '2025-12-31', status: 1, createdAt: '2025-01-01' },
      { id: 3, customerId: 2, customerName: '腾讯科技', goodsId: 2, goodsName: '华为Mate 60 Pro', price: 6599, discount: 5.7, unit: '台', effectiveDate: '2025-01-01', expiryDate: '2025-12-31', status: 1, createdAt: '2025-01-01' },
      { id: 4, customerId: 3, customerName: '中国平安', goodsId: 9, goodsName: 'Dell显示器27寸', price: 1999, discount: 9.1, unit: '台', effectiveDate: '2025-01-01', expiryDate: '2025-12-31', status: 1, createdAt: '2025-01-01' }
    ]);

    // 发票记录
    this.set('invoices', [
      { id: 1, invoiceNo: 'INV202501001', type: '增值税发票', title: '阿里巴巴集团', taxNo: '91330000XXXXXXXXXX', amount: 89990, taxAmount: 11698.7, totalAmount: 101688.7, customerId: 1, customerName: '阿里巴巴集团', relatedCode: 'OUT2501010001', issueDate: '2025-01-15', status: '已开具', operator: 'admin', note: '第一批iPhone采购', createdAt: '2025-01-15' },
      { id: 2, invoiceNo: 'INV202501002', type: '增值税发票', title: '腾讯科技', taxNo: '91440300XXXXXXXXXX', amount: 65990, taxAmount: 8578.7, totalAmount: 74568.7, customerId: 2, customerName: '腾讯科技', relatedCode: 'OUT2501020001', issueDate: '2025-01-20', status: '已开具', operator: 'admin', note: '华为手机采购', createdAt: '2025-01-20' }
    ]);

    // ===== 新增：物流配送 =====
    // 承运商
    this.set('carriers', [
      { id: 1, name: '顺丰速运', contact: '张经理', phone: '95338', address: '深圳市宝安区顺丰总部', vehicleTypes: '快递,陆运,空运', status: 1, rating: 5, createdAt: '2025-01-01' },
      { id: 2, name: '德邦物流', contact: '李经理', phone: '95353', address: '上海市青浦区德邦物流园', vehicleTypes: '陆运,快递', status: 1, rating: 4, createdAt: '2025-01-05' },
      { id: 3, name: '中通快递', contact: '王经理', phone: '95311', address: '杭州市余杭区中通总部', vehicleTypes: '快递,陆运', status: 1, rating: 4, createdAt: '2025-01-10' },
      { id: 4, name: '安能物流', contact: '赵经理', phone: '956089', address: '广州市白云区安能物流园', vehicleTypes: '陆运,零担', status: 1, rating: 4, createdAt: '2025-01-15' }
    ]);

    // 运费模板
    this.set('freightTemplates', [
      { id: 1, name: '标准快递', carrierId: 1, carrierName: '顺丰速运', firstWeight: 1, firstFee: 12, continueWeight: 1, continueFee: 5, freeThreshold: 99, status: 1, createdAt: '2025-01-01' },
      { id: 2, name: '经济快递', carrierId: 2, carrierName: '德邦物流', firstWeight: 1, firstFee: 8, continueWeight: 1, continueFee: 3, freeThreshold: 199, status: 1, createdAt: '2025-01-05' },
      { id: 3, name: '陆运专线', carrierId: 4, carrierName: '安能物流', firstWeight: 10, firstFee: 50, continueWeight: 1, continueFee: 2, freeThreshold: 999, status: 1, createdAt: '2025-01-10' }
    ]);

    // 运输计划
    this.set('transportPlans', [
      { id: 1, planNo: 'TP202501001', carrierId: 1, carrierName: '顺丰速运', outbounds: 'OUT2501010001', customerId: 1, customerName: '阿里巴巴集团', deliveryAddress: '浙江省杭州市余杭区阿里巴巴园区', goodsList: [{goodsId: 1, goodsName: 'iPhone 15 Pro Max', qty: 10}], totalWeight: 8.5, freightFee: 45, status: '已发货', shipDate: '2025-01-15', estimatedArrival: '2025-01-17', actualArrival: '2025-01-16', operator: 'admin', createdAt: '2025-01-15' },
      { id: 2, planNo: 'TP202501002', carrierId: 2, carrierName: '德邦物流', outbounds: 'OUT2501200001', customerId: 2, customerName: '腾讯科技', deliveryAddress: '广东省深圳市南山区科技园', goodsList: [{goodsId: 2, goodsName: '华为Mate 60 Pro', qty: 5}], totalWeight: 3.2, freightFee: 28, status: '配送中', shipDate: '2025-01-20', estimatedArrival: '2025-01-23', operator: 'staff', createdAt: '2025-01-20' }
    ]);

    // ===== 新增：生产制造 =====
    // BOM物料清单
    this.set('boms', [
      { id: 1, bomCode: 'BOM001', name: 'iPhone手机套装', version: 'V1.0', category: '成品', goodsId: 1, goodsName: 'iPhone 15 Pro Max', status: '启用', items: [
        { materialId: 1, materialName: '手机主板', qty: 1, unit: '个', scrapRate: 0.02 },
        { materialId: 2, materialName: '屏幕总成', qty: 1, unit: '个', scrapRate: 0.01 },
        { materialId: 3, materialName: '电池', qty: 1, unit: '个', scrapRate: 0.01 },
        { materialId: 4, materialName: '外壳', qty: 1, unit: '个', scrapRate: 0.03 }
      ], createdAt: '2025-01-01' },
      { id: 2, bomCode: 'BOM002', name: 'ThinkPad笔记本套装', version: 'V1.0', category: '成品', goodsId: 3, goodsName: '联想ThinkPad笔记本', status: '启用', items: [
        { materialId: 5, materialName: '笔记本主板', qty: 1, unit: '个', scrapRate: 0.02 },
        { materialId: 6, materialName: '显示屏', qty: 1, unit: '个', scrapRate: 0.01 },
        { materialId: 7, materialName: '键盘模组', qty: 1, unit: '个', scrapRate: 0.01 },
        { materialId: 8, materialName: '电池模组', qty: 1, unit: '个', scrapRate: 0.02 }
      ], createdAt: '2025-01-05' }
    ]);

    // BOM替代料
    this.set('bomSubstitutes', [
      { id: 1, bomId: 1, originalId: 1, originalName: '手机主板A款', substituteId: 9, substituteName: '手机主板B款', ratio: 1, priority: 1, status: 1, createdAt: '2025-01-01' }
    ]);

    // 工程变更单ECN
    this.set('ecns', [
      { id: 1, ecnNo: 'ECN202501001', bomId: 1, bomName: 'iPhone手机套装', version: 'V1.0', newVersion: 'V1.1', changeType: '物料替换', changeReason: '原供应商停产', changeContent: '将手机主板A款替换为B款', status: '已审核', applyDate: '2025-01-10', effectiveDate: '2025-01-15', applicant: 'admin', reviewer: '张强', createdAt: '2025-01-10' }
    ]);

    // 生产工单
    this.set('productionOrders', [
      { id: 1, orderNo: 'MO202501001', bomId: 1, bomName: 'iPhone手机套装', qty: 100, completedQty: 60, status: '生产中', priority: '高', plannedStart: '2025-01-10', plannedEnd: '2025-01-25', actualStart: '2025-01-10', actualEnd: null, workshop: '组装车间A', operator: 'admin', createdAt: '2025-01-08' },
      { id: 2, orderNo: 'MO202501002', bomId: 2, bomName: 'ThinkPad笔记本套装', qty: 50, completedQty: 50, status: '已完成', priority: '中', plannedStart: '2025-01-05', plannedEnd: '2025-01-20', actualStart: '2025-01-05', actualEnd: '2025-01-18', workshop: '组装车间B', operator: 'staff', createdAt: '2025-01-03' }
    ]);

    // 工序
    this.set('processes', [
      { id: 1, processNo: 'PRC001', name: '组装', sequence: 1, workshop: '组装车间A', workCenter: '组装线1', stdTime: 30, unit: '分钟/件', status: 1, createdAt: '2025-01-01' },
      { id: 2, processNo: 'PRC002', name: '测试', sequence: 2, workshop: '测试车间', workCenter: '测试线1', stdTime: 15, unit: '分钟/件', status: 1, createdAt: '2025-01-01' },
      { id: 3, processNo: 'PRC003', name: '包装', sequence: 3, workshop: '包装车间', workCenter: '包装线1', stdTime: 10, unit: '分钟/件', status: 1, createdAt: '2025-01-01' }
    ]);

    // 工单工序
    this.set('orderProcesses', [
      { id: 1, orderId: 1, processId: 1, processName: '组装', sequence: 1, planQty: 100, completedQty: 60, status: '已完成', startTime: '2025-01-10 08:00', endTime: '2025-01-15 18:00', operator: '张三', createdAt: '2025-01-08' },
      { id: 2, orderId: 1, processId: 2, processName: '测试', sequence: 2, planQty: 100, completedQty: 60, status: '生产中', startTime: '2025-01-15 18:00', endTime: null, operator: '李四', createdAt: '2025-01-08' }
    ]);

    // 报工记录
    this.set('workReports', [
      { id: 1, orderId: 1, orderNo: 'MO202501001', processId: 1, processName: '组装', reportQty: 30, qualifiedQty: 29, scrapQty: 1, reportTime: '2025-01-12 18:00', operator: '张三', status: '已审核', note: '正常生产', createdAt: '2025-01-12' },
      { id: 2, orderId: 1, orderNo: 'MO202501001', processId: 1, reportQty: 30, qualifiedQty: 30, scrapQty: 0, reportTime: '2025-01-15 18:00', operator: '张三', status: '已审核', note: '正常生产', createdAt: '2025-01-15' }
    ]);

    // 设备台账
    this.set('equipment', [
      { id: 1, code: 'EQ001', name: '自动装配机A1', category: '装配设备', model: 'ASM-2000', manufacturer: '西门子', purchaseDate: '2024-01-15', status: '运行中', location: '组装车间A', nextMaintenance: '2025-02-15', maintenanceCycle: 90, operator: '张三', createdAt: '2024-01-15' },
      { id: 2, code: 'EQ002', name: '老化测试仪T1', category: '测试设备', model: 'AGING-500', manufacturer: '华为', purchaseDate: '2024-03-20', status: '运行中', location: '测试车间', nextMaintenance: '2025-03-20', maintenanceCycle: 180, operator: '李四', createdAt: '2024-03-20' },
      { id: 3, code: 'EQ003', name: '自动包装机P1', category: '包装设备', model: 'PACK-300', manufacturer: '博世', purchaseDate: '2024-06-10', status: '维护中', location: '包装车间', nextMaintenance: '2025-01-10', maintenanceCycle: 60, operator: '王五', createdAt: '2024-06-10' }
    ]);

    // 工装模具
    this.set('tools', [
      { id: 1, code: 'TL001', name: 'iPhone治具', category: '装配治具', location: '组装车间A-01', status: '在用', life: 10000, usedCount: 3500, nextCheck: '2025-02-01', createdAt: '2024-01-01' },
      { id: 2, code: 'TL002', name: 'ThinkPad治具', category: '装配治具', location: '组装车间B-02', status: '在用', life: 8000, usedCount: 4200, nextCheck: '2025-02-10', createdAt: '2024-02-01' }
    ]);

    // ===== 新增：委外加工 =====
    // 委外单
    this.set('outsourcingOrders', [
      { id: 1, orderNo: 'OS202501001', supplierId: 4, supplierName: '北京机械零件厂', processName: 'SMT贴片', qty: 1000, unitQty: 1000, unitPrice: 2.5, totalAmount: 2500, status: '进行中', planSendDate: '2025-01-10', actualSendDate: '2025-01-10', planReceiveDate: '2025-01-20', actualReceiveDate: null, operator: 'admin', note: '第一批SMT加工', createdAt: '2025-01-08' }
    ]);

    // 委外发料
    this.set('outsourcingMaterials', [
      { id: 1, orderId: 1, orderNo: 'OS202501001', goodsId: 8, goodsName: '尼龙轴承', qty: 500, unit: '个', price: 28, total: 14000, sendDate: '2025-01-10', status: '已发料', operator: 'admin', createdAt: '2025-01-10' }
    ]);

    // ===== 新增：质量管理 =====
    // 来料检验
    this.set('incomingInspections', [
      { id: 1, code: 'IQC202501001', supplierId: 1, supplierName: '深圳华强电子', goodsId: 1, goodsName: 'iPhone 15 Pro Max', batchNo: 'LOT-250101', inspectQty: 100, sampleQty: 20, qualifiedQty: 19, unqualifiedQty: 1, result: '让步接收', status: '已完成', inspectDate: '2025-01-05', inspector: 'admin', note: '1件外观轻微瑕疵', createdAt: '2025-01-05' },
      { id: 2, code: 'IQC202501002', supplierId: 2, supplierName: '上海文具批发商', goodsId: 4, goodsName: '得力圆珠笔(蓝)', batchNo: 'LOT-250108', inspectQty: 500, sampleQty: 30, qualifiedQty: 500, unqualifiedQty: 0, result: '合格', status: '已完成', inspectDate: '2025-01-08', inspector: 'staff', note: '正常', createdAt: '2025-01-08' }
    ]);

    // 过程检验
    this.set('processInspections', [
      { id: 1, code: 'PQC202501001', orderId: 1, orderNo: 'MO202501001', goodsId: 1, goodsName: 'iPhone手机套装', processId: 1, processName: '组装', inspectQty: 10, qualifiedQty: 10, unqualifiedQty: 0, result: '合格', status: '已完成', inspectDate: '2025-01-10', inspector: '张三', note: '首件检验通过', createdAt: '2025-01-10' }
    ]);

    // 成品检验
    this.set('finalInspections', [
      { id: 1, code: 'FQC202501001', orderId: 2, orderNo: 'MO202501002', goodsId: 3, goodsName: 'ThinkPad笔记本套装', inspectQty: 50, qualifiedQty: 50, unqualifiedQty: 0, result: '合格', status: '已完成', certificate: '是', inspectDate: '2025-01-18', inspector: 'admin', note: '成品检验通过', createdAt: '2025-01-18' }
    ]);

    // 不良管理 NCR
    this.set('qualityNCRs', [
      { id: 1, code: 'NCR202501001', ncrType: '来料', relatedId: 1, goodsName: 'iPhone 15 Pro Max', batchNo: 'LOT-250101', defectQty: 1, defectDesc: '外观轻微划痕，不影响功能', handleMethod: '让步接收', handleResult: '降价5%接受', status: '已处理', inspector: 'admin', date: '2025-01-05', createdAt: '2025-01-05' }
    ]);

    // SPC记录
    this.set('spcRecords', [
      { id: 1, code: 'SPC202501001', processId: 1, processName: '组装', sampleTime: '2025-01-10T10:00', xValue: 10.2, usl: 12, ucl: 11.5, lcl: 8.5, lsl: 8, cl: 10, result: '受控', note: '正常生产', createdAt: '2025-01-10' },
      { id: 2, code: 'SPC202501002', processId: 1, processName: '组装', sampleTime: '2025-01-10T11:00', xValue: 10.5, usl: 12, ucl: 11.5, lcl: 8.5, lsl: 8, cl: 10, result: '受控', note: '正常', createdAt: '2025-01-10' },
      { id: 3, code: 'SPC202501003', processId: 1, processName: '组装', sampleTime: '2025-01-10T14:00', xValue: 11.8, usl: 12, ucl: 11.5, lcl: 8.5, lsl: 8, cl: 10, result: '超出控制限', note: '超过UCL，需关注', createdAt: '2025-01-10' }
    ]);

    // 合格证
    this.set('qualityCertificates', [
      { id: 1, code: 'CERT202501001', certificateNo: 'CERT202501001', relatedInspectionId: 1, goodsId: 3, goodsName: 'ThinkPad笔记本套装', batchNo: 'BN20250118', qty: 50, inspectionDate: '2025-01-18', validDate: '2027-01-18', issuer: 'admin', status: '有效', note: '成品检验合格自动出具', createdAt: '2025-01-18' }
    ]);

    // 配送单
    this.set('deliveryOrders', [
      { id: 1, code: 'D202501001', transportPlanId: 1, planNo: 'TP202501001', carrierId: 1, carrierName: '顺丰速运', customerId: 1, customerName: '阿里巴巴集团', address: '浙江省杭州市余杭区阿里巴巴园区', status: '已完成', shipDate: '2025-01-15', signDate: '2025-01-16', operator: 'admin', note: '', createdAt: '2025-01-15' },
      { id: 2, code: 'D202501002', transportPlanId: 2, planNo: 'TP202501002', carrierId: 2, carrierName: '德邦物流', customerId: 2, customerName: '腾讯科技', address: '广东省深圳市南山区科技园', status: '配送中', shipDate: '2025-01-20', signDate: null, operator: 'staff', note: '', createdAt: '2025-01-20' }
    ]);

    // ===== 新增：售后工单 =====
    this.set('serviceTickets', [
      { id: 1, ticketNo: 'ST202501001', type: '维修', goodsId: 1, goodsName: 'iPhone 15 Pro Max', customerId: 1, customerName: '阿里巴巴集团', contact: '赵采购', phone: '13500135001', faultDesc: '屏幕显示异常', status: 3, priority: '高', createDate: '2025-01-10', dueDate: '2025-01-15', endDate: '2025-01-14', handler: '张强', result: '更换屏幕总成', note: '保修期内免费维修', createdAt: '2025-01-10' },
      { id: 2, ticketNo: 'ST202501002', type: '退换货', goodsId: 2, goodsName: '华为Mate 60 Pro', customerId: 2, customerName: '腾讯科技', contact: '孙经理', phone: '13400134002', faultDesc: '充电口松动', status: 1, priority: '中', createDate: '2025-01-18', dueDate: '2025-01-25', endDate: null, handler: '周涛', result: '', note: '已安排寄回维修', createdAt: '2025-01-18' },
      { id: 3, ticketNo: 'ST202501003', type: '咨询', goodsId: 3, goodsName: '联想ThinkPad笔记本', customerId: 3, customerName: '中国平安', contact: '周总监', phone: '13300133003', faultDesc: '批量采购售后政策咨询', status: 0, priority: '低', createDate: '2025-01-20', dueDate: '2025-01-22', endDate: null, handler: '', result: '', note: '待分配处理人', createdAt: '2025-01-20' }
    ]);

    // ===== 新增：仓库管理 =====
    this.set('warehouses', [
      { id: 1, name: '主仓库', code: 'WH001', address: '公司总部一楼', manager: '仓库管理员', status: 1, createdAt: '2025-01-01' },
      { id: 2, name: '分仓库A', code: 'WH002', address: '东厂区2号库', manager: 'staff', status: 1, createdAt: '2025-01-01' },
      { id: 3, name: '分仓库B', code: 'WH003', address: '西厂区3号库', manager: 'staff', status: 1, createdAt: '2025-01-01' },
      { id: 4, name: '退货仓', code: 'WH004', address: '售后区临时存放', manager: 'staff', status: 1, createdAt: '2025-01-01' }
    ]);

    // ===== 新增：仓库调拨 =====
    this.set('transfers', [
      { id: 1, code: 'TR20250101001', date: '2025-01-10', type: '库存调拨', goodsId: 1, goodsName: 'iPhone 15 Pro Max', goodsCode: 'G001', qty: 5, price: 8999, amount: 44995, fromWarehouse: '主仓库', fromWarehouseId: 1, toWarehouse: '分仓库A', toWarehouseId: 2, reason: '分仓库A库存不足', note: '', status: '已完成', operator: 'admin', createdAt: '2025-01-10', completeTime: '2025-01-11' },
      { id: 2, code: 'TR20250115002', date: '2025-01-15', type: '库存调拨', goodsId: 3, goodsName: '联想ThinkPad笔记本', goodsCode: 'G003', qty: 3, price: 6999, amount: 20997, fromWarehouse: '主仓库', fromWarehouseId: 1, toWarehouse: '分仓库B', toWarehouseId: 3, reason: '新客户订单备货', note: '优先处理', status: '调拨中', operator: 'admin', createdAt: '2025-01-15', startTime: '2025-01-16' },
      { id: 3, code: 'TR20250120003', date: '2025-01-20', type: '退货调拨', goodsId: 2, goodsName: '华为Mate 60 Pro', goodsCode: 'G002', qty: 1, price: 6999, amount: 6999, fromWarehouse: '分仓库A', fromWarehouseId: 2, toWarehouse: '退货仓', toWarehouseId: 4, reason: '客户退货，退回退货仓检查', note: '屏幕有划痕', status: '待调拨', operator: 'staff', createdAt: '2025-01-20' }
    ]);
  },

  generateInbounds(goods) {
    const records = [];
    let id = 1;
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const warehouseNames = { 1: '主仓库', 2: '分仓库A', 3: '分仓库B', 4: '退货仓' };
    goods.forEach(g => {
      months.forEach((m, mi) => {
        const day = Math.floor(Math.random() * 28) + 1;
        const qty = Math.floor(Math.random() * 50) + 10;
        // 随机分配仓库（主仓库概率最高）
        const whId = mi % 3 === 0 ? 2 : (mi % 5 === 0 ? 3 : 1);
        records.push({
          id: id++,
          code: `IN${m.replace('-','')}${String(id).padStart(4,'0')}`,
          goodsId: g.id,
          goodsName: g.name,
          goodsCode: g.code,
          qty,
          price: g.cost,
          total: qty * g.cost,
          supplierId: g.supplierId,
          supplierName: ['深圳华强电子','上海文具批发商','广州食品贸易','北京机械零件厂'][g.supplierId - 1],
          operator: mi % 2 === 0 ? 'admin' : 'staff',
          note: '正常采购入库',
          status: '已完成',
          warehouseId: whId,
          warehouseName: warehouseNames[whId] || '主仓库',
          date: `${m}-${String(day).padStart(2,'0')}`
        });
      });
    });
    return records;
  },

  generateOutbounds(goods) {
    const records = [];
    let id = 1;
    const customers = ['阿里巴巴集团', '腾讯科技', '中国平安', '张先生（个人）'];
    const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];
    const warehouseNames = { 1: '主仓库', 2: '分仓库A', 3: '分仓库B', 4: '退货仓' };
    goods.forEach(g => {
      months.forEach((m, mi) => {
        const day = Math.floor(Math.random() * 28) + 1;
        const qty = Math.floor(Math.random() * 20) + 2;
        // 出库仓库（主要从主仓库出库）
        const whId = mi % 4 === 0 ? 2 : (mi % 6 === 0 ? 3 : 1);
        records.push({
          id: id++,
          code: `OUT${m.replace('-','')}${String(id).padStart(4,'0')}`,
          goodsId: g.id,
          goodsName: g.name,
          goodsCode: g.code,
          qty,
          price: g.price,
          total: qty * g.price,
          customerId: (mi % 4) + 1,
          customerName: customers[mi % 4],
          operator: mi % 2 === 0 ? 'admin' : 'staff',
          note: '客户订单出库',
          status: '已完成',
          warehouseId: whId,
          warehouseName: warehouseNames[whId] || '主仓库',
          date: `${m}-${String(day).padStart(2,'0')}`
        });
      });
    });
    return records;
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(this._prefix(key)) || '[]');
    } catch { return []; }
  },

  set(key, val) {
    localStorage.setItem(this._prefix(key), JSON.stringify(val));
    this._pushToServer(key, val);
  },

  nextId(key) {
    const items = this.get(key);
    return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  },

  add(key, item) {
    const items = this.get(key);
    item.id = this.nextId(key);
    item.createdAt = new Date().toISOString().slice(0, 10);
    items.push(item);
    this.set(key, items);
    return item;
  },

  update(key, id, data) {
    const items = this.get(key);
    // 使用宽松比较并转换类型，确保能找到记录
    const idx = items.findIndex(i => i.id == id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString().slice(0, 10) };
      this.set(key, items);
      return items[idx];
    }
    return null;
  },

  delete(key, id) {
    const items = this.get(key).filter(i => i.id !== id);
    this.set(key, items);
  },

  findById(key, id) {
    return this.get(key).find(i => i.id === id);
  },

  // 生成单号
  genCode(prefix) {
    const d = new Date();
    const ts = d.getFullYear().toString().slice(2) +
      String(d.getMonth()+1).padStart(2,'0') +
      String(d.getDate()).padStart(2,'0') +
      String(d.getHours()).padStart(2,'0') +
      String(d.getMinutes()).padStart(2,'0') +
      String(Math.floor(Math.random()*100)).padStart(2,'0');
    return prefix + ts;
  },

  // 获取统计数据
  getStats() {
    const goods = this.get('goods');
    const inbounds = this.get('inbounds');
    const outbounds = this.get('outbounds');
    const today = new Date().toISOString().slice(0, 10);
    const todayIn = inbounds.filter(r => r.date === today);
    const todayOut = outbounds.filter(r => r.date === today);
    const tickets = this.get('serviceTickets') || [];
    const productionOrders = this.get('productionOrders');
    const equipment = this.get('equipment');

    return {
      totalGoods: goods.length,
      totalStock: goods.reduce((s, g) => s + g.stock, 0),
      totalStockValue: goods.reduce((s, g) => s + g.stock * g.cost, 0),
      lowStock: goods.filter(g => g.stock <= g.minStock).length,
      outOfStock: goods.filter(g => g.stock === 0).length,
      todayInCount: todayIn.length,
      todayInTotal: todayIn.reduce((s, r) => s + r.total, 0),
      todayOutCount: todayOut.length,
      todayOutTotal: todayOut.reduce((s, r) => s + r.total, 0),
      totalInbounds: inbounds.length,
      totalOutbounds: outbounds.length,
      suppliers: this.get('suppliers').length,
      customers: this.get('customers').length,
      // 售后工单统计
      totalTickets: tickets.length,
      pendingTickets: tickets.filter(t => [0, 1].includes(t.status)).length,
      processingTickets: tickets.filter(t => t.status === 1).length,
      completedTickets: tickets.filter(t => t.status === 3).length,
      overdueTickets: tickets.filter(t => [0, 1].includes(t.status) && t.dueDate && t.dueDate < today).length,
      // 生产统计
      totalProductionOrders: productionOrders.length,
      producingOrders: productionOrders.filter(o => o.status === '生产中').length,
      completedProductionOrders: productionOrders.filter(o => o.status === '已完成').length,
      // 设备统计
      totalEquipment: equipment.length,
      runningEquipment: equipment.filter(e => e.status === '运行中').length,
      maintenanceEquipment: equipment.filter(e => e.status === '维护中').length
    };
  }
};
