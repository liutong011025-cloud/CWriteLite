import definitions from './process-catalog.json';

export const CODING_VERSION = 'lite-process-v1';
export const PROCESS_PARAMETERS = { drawingIdleMs: 5000, drawingSegmentMs: 30000, inputIdleMs: 2000, inputSegmentMs: 15000, pauseMinMs: 10000 };
export const CATEGORY_LABELS: Record<string, string> = {
  planning: '构思与规划', independent_writing: '自主写作', ai_help_seeking: '主动寻求 AI 帮助',
  ai_output_evaluation: 'AI 输出接触与评价', revision: '修改与修订', completion: '提交与完成',
  pause_temporal: '停顿与时间行为', navigation: '导航与资源浏览', farm_social: '农场与同伴互动',
  system: '系统辅助记录', admin: '管理操作',
};
const extras = [
  ['NAV_UI_ACTION', 'navigation', '界面操作', '点击界面控件，保留控件名称与所在界面'],
  ['SYS_AUTO_SAVE', 'system', '自动保存', '草稿、角色或画布保存结果'],
  ['SYS_COACH_REQUEST', 'system', '自动提示', '自动 Cagent 请求，不计主动求助'],
  ['SYS_IMAGE_READY', 'system', '图片结果', '图片完成、失败或模拟结果'],
  ['SYS_AI_RESULT', 'system', 'AI 请求结果', '服务器返回结果，不等同于学生已阅读'],
  ['SYS_VIDEO_RESULT', 'system', '视频结果', '视频请求结果'],
  ['SYS_GROWTH_RESULT', 'system', '成长结果', '树成长或地图更新结果'],
  ['SYS_RECORD_DELIVERY', 'system', '传输状态', '日志缓存或传输异常'],
  ['ADM_RECORD_START', 'admin', '开始记录', 'Tony 开始记录'],
  ['ADM_RECORD_STOP', 'admin', '停止记录', 'Tony 停止记录'],
  ['ADM_RECORD_EXPORT', 'admin', '导出记录', 'Tony 导出行为数据'],
];
export const PROCESS_CATALOG = Object.fromEntries([
  ...definitions.map(d => [d.code, d] as const),
  ...extras.map(([code, category, subcategory, description]) => [code, { code, category, subcategory, description, screens: '平台', rule: '有效操作或结果变化时记录', details: '', legacy: '' }] as const),
]);
export type ProcessOrigin = 'student' | 'auto_agent' | 'platform_gate' | 'system' | 'admin';
export type ProcessContext = { stage: string; workId?: string; workType?: string; sectionIndex?: number; sceneId?: string; characterId?: string };
export type ProcessRecord = {
  eventUid: string; recordingId: string; sessionId: string; sequence: number;
  code: string; clientTs: number; clientEndTs?: number; durationMs?: number; activeDurationMs?: number;
  origin: ProcessOrigin; context: ProcessContext; payload: Record<string, unknown>;
};

/** A contiguous text change. Equal-length replacements and mixed deletion/addition are revisions. */
export function textDifference(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let endBefore = before.length, endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) { endBefore--; endAfter--; }
  return { insertionAt: start, insertedChars: endAfter - start, deletedChars: endBefore - start };
}
export function textCode(before: string, after: string, inputType = '', fromAI = false) {
  if (inputType === 'insertFromPaste') return 'PROD_TEXT_PASTE';
  if (fromAI) return 'REV_AI_TEXT_EDIT';
  if (!before) return 'PROD_TEXT_DRAFT';
  if (after.startsWith(before) && after.length > before.length) return 'PROD_TEXT_EXPAND';
  return 'REV_TEXT_EDIT';
}
export function pauseBand(ms: number) { return ms < 10000 ? 'micro' : ms <= 60000 ? 'meso' : 'macro'; }
