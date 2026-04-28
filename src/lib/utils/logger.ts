// Simple logger utility
// @reuses: 所有日志统一通过此文件管理

// ============================================================
// 统一监听配置
// ============================================================
/**
 * MonitorConfig - 统一监听开关配置
 * @description 控制日志输出的全局开关，支持按模块独立控制
 * @property enabled - 总开关：true=开启日志，false=关闭所有日志
 * @property db - 数据库监听开关
 * @property api - API监听开关
 * @property router - 路由监听开关
 * @property auth - 认证模块监听开关
 * @property cart - 购物车模块监听开关
 * @property orders - 订单模块监听开关
 * @property inventory - 库存模块监听开关
 * @property payments - 支付模块监听开关
 * @property products - 商品模块监听开关
 * @property level - 日志级别：all=全部，debug=调试，error=仅错误，none=关闭
 */
export const MonitorConfig = {
  enabled: process.env.NODE_ENV === 'development',
  db: true,       // 数据库监听开关
  api: true,      // API监听开关
  router: true,   // 路由监听开关
  auth: true,     // 认证模块开关
  cart: true,     // 购物车模块开关
  orders: true,   // 订单模块开关
  inventory: true, // 库存模块开关
  payments: true,  // 支付模块开关
  products: true,  // 商品模块开关
  level: 'all',   // 日志级别：all=全部日志，debug=调试，error=仅错误，none=完全关闭
};

// ============================================================
// 工具函数
// ============================================================
/**
 * formatDuration - 格式化耗时
 * @description 将耗时毫秒数格式化为易读的字符串
 * @param startTime - 开始时间（高精度计时器）
 * @param endTime - 结束时间（高精度计时器）
 * @returns 格式化的耗时字符串，如 "12ms" 或 "1.5s"
 * @example formatDuration(performance.now(), performance.now() + 1234) 返回 "1.23s"
 */
function formatDuration(startTime: number, endTime: number): string {
  const duration = endTime - startTime;
  if (duration < 1000) {
    return `${duration.toFixed(2)}ms`;
  }
  return `${(duration / 1000).toFixed(2)}s`;
}

/**
 * filterSensitive - 过滤敏感信息
 * @description 过滤日志中的敏感字段，防止密码、token等泄露
 * @param data - 原始数据对象
 * @returns 过滤后的数据（敏感字段被替换为 [REDACTED]）
 * @example filterSensitive({ password: '123', token: 'abc' }) 返回 { password: '[REDACTED]', token: '[REDACTED]' }
 */
function filterSensitive(data: any): any {
  if (!data) return data;
  // 敏感字段列表
  const sensitiveFields = [
    'password', 'token', 'access_token', 'refresh_token',
    'secret', 'api_key', 'authorization', 'cookie'
  ];

  if (typeof data === 'object') {
    const filtered = Array.isArray(data) ? [...data] : { ...data };
    for (const key of Object.keys(filtered)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        filtered[key] = '[REDACTED]';
      } else if (typeof filtered[key] === 'object') {
        filtered[key] = filterSensitive(filtered[key]);
      }
    }
    return filtered;
  }
  return data;
}

/**
 * createLogEntry - 创建标准日志条目
 * @description 生成统一格式的日志数据结构，便于日志分析和检索
 * @param module - 模块名称，如 'DB', 'API', 'ROUTER'
 * @param action - 操作类型，如 'QUERY', 'REQUEST', 'RESPONSE'
 * @param data - 日志数据对象
 * @returns 标准化的日志条目对象
 * @example createLogEntry('DB', 'QUERY', { sql: 'SELECT * FROM users' })
 */
export function createLogEntry(module: string, action: string, data?: any): { timestamp: string; module: string; action: string; data?: any } {
  return {
    timestamp: new Date().toISOString(),
    module,
    action,
    data: data ? filterSensitive(data) : undefined,
  };
}

// ============================================================
// 统一日志函数
// ============================================================
/**
 * logMonitor - 统一日志输出函数
 * @description 所有监听日志的统一出口，支持开关控制和格式统一
 * @param module - 模块名称：'DB' | 'API' | 'ROUTER' | 'AUTH' | 'CART' | 'ORDERS' | 'INVENTORY' | 'PAYMENTS' | 'PRODUCTS'
 * @param action - 操作类型：'START' | 'END' | 'ERROR' | 'INFO' | 'REQUEST' | 'RESPONSE' | 'SUCCESS' | 'AUTH_FAILED' | 'VALIDATION_FAILED' | 'NOT_FOUND'
 * @param data - 日志数据对象（可选）
 * @example logMonitor('DB', 'QUERY', { sql: 'SELECT * FROM products' })
 * @example logMonitor('API', 'REQUEST', { method: 'GET', path: '/api/cart' })
 */
export function logMonitor(module: string, action: string, data?: any): void {
  // 如果总开关关闭或日志级别为none，直接返回
  if (!MonitorConfig.enabled || MonitorConfig.level === 'none') {
    return;
  }

  // 检查模块开关
  const moduleKey = module.toLowerCase() as 'db' | 'api' | 'router' | 'auth' | 'cart' | 'orders' | 'inventory' | 'payments' | 'products';
  if (MonitorConfig[moduleKey] === false) {
    return;
  }

  // 创建日志条目
  const logEntry = createLogEntry(module, action, data);

  // 根据日志级别和模块控制输出
  const shouldLog =
    MonitorConfig.level === 'all' ||
    (MonitorConfig.level === 'error' && action === 'ERROR') ||
    (MonitorConfig.level === 'debug');

  if (shouldLog) {
    // 输出到控制台，统一格式
    console.log(
      `[${logEntry.timestamp}]`,
      `[${module}]`,
      `[${action}]`,
      data || ''
    );
  }
}

// ============================================================
// 已有日志函数（保持兼容）
// ============================================================
/**
 * logInfo - 普通信息日志
 * @description 输出一般信息日志，不经过统一监听系统
 * @param message - 日志消息
 * @param args - 其他参数
 */
export function logInfo(message: string, ...args: any[]) {
  console.log('INFO:', message, ...args);
}

/**
 * logError - 错误日志
 * @description 输出错误日志，自动添加错误标记
 * @param message - 错误消息
 * @param args - 其他参数
 */
export function logError(message: string, ...args: any[]) {
  console.error('ERROR:', message, ...args);
}

/**
 * logDebug - 调试日志
 * @description 仅在开发环境输出调试信息
 * @param message - 调试消息
 * @param args - 其他参数
 */
export function logDebug(message: string, ...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    console.debug('DEBUG:', message, ...args);
  }
}
