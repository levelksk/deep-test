// ========================================
// deep-test: 类型定义
// ========================================

/**
 * AI Agent 返回的动作
 * @typedef {Object} AIAction
 * @property {'click'|'fill'|'select'|'press'|'navigate'|'assert'|'scroll'|'wait'|'done'|'extract'} type
 * @property {string} [selector] - Playwright 选择器
 * @property {string} [value] - 输入值
 * @property {string} [description] - 动作描述
 * @property {boolean} [success] - done 时任务是否成功
 * @property {string} [message] - done 时的消息
 */

/**
 * DOM 元素摘要
 * @typedef {Object} ElementSummary
 * @property {number} index - 元素索引
 * @property {string} tag - HTML 标签
 * @property {string} text - 可见文本
 * @property {Object} attrs - 关键属性
 * @property {string} selector - Playwright CSS 选择器
 * @property {string} [role] - ARIA role
 * @property {boolean} interactive - 是否可交互
 * @property {string} [state] - checked/selected/disabled
 */

/**
 * 页面状态摘要
 * @typedef {Object} PageState
 * @property {string} url - 当前 URL
 * @property {string} title - 页面标题
 * @property {ElementSummary[]} elements - 可交互元素列表
 * @property {number} elementCount - 元素总数
 */

export default {};
