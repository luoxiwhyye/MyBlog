import { ref, computed } from "vue";
import { TOOL_LIST } from "~/config/tools";
import type { ToolId, ToolMeta } from "~/types/tool";

/**
 * 工具箱「最近使用」记录 composable（纯前端，localStorage 持久化）。
 *
 * 背景：工具箱首页原先有一个无标题、静态写死 4 个工具的「热门区」，
 * 与下方分类区/收藏区区分度低、定位不明。这里把它改为由「最近使用」
 * 驱动的动态快捷区——工具详情页写入、首页读取，首次访问无记录时由首页
 * 回退为「常用推荐」，从而与「按分类罗列全部工具」形成清晰分工。
 */

const RECENT_TOOLS_KEY = "myblog:tools:recent";
/** 最近使用最多保留条数（首页快捷区一屏内可扫完） */
const RECENT_TOOLS_LIMIT = 6;

/** 读取本地最近使用的工具 id，过滤掉已下线/不存在的工具，并限制条数 */
const readRecentToolIds = (): string[] => {
  if (!import.meta.client) return [];
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const knownIds = new Set<string>(TOOL_LIST.map((tool) => tool.id));
    return parsed
      .filter((id): id is string => typeof id === "string" && knownIds.has(id))
      .slice(0, RECENT_TOOLS_LIMIT);
  } catch {
    return [];
  }
};

export const useRecentTools = () => {
  const recentToolIds = ref<string[]>([]);

  const loadRecentTools = () => {
    recentToolIds.value = readRecentToolIds();
  };

  /** 记录一次工具使用（去重后置顶，超出上限截断） */
  const recordRecentTool = (id: ToolId) => {
    if (!import.meta.client) return;
    if (!TOOL_LIST.some((tool) => tool.id === id)) return;
    const next = [
      id,
      ...recentToolIds.value.filter((item) => item !== id),
    ].slice(0, RECENT_TOOLS_LIMIT);
    recentToolIds.value = next;
    try {
      localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
    } catch {
      // 隐私模式/存储配额不足等场景下写入失败，静默忽略
    }
  };

  const recentTools = computed(() =>
    recentToolIds.value
      .map((id) => TOOL_LIST.find((tool) => tool.id === id))
      .filter((tool): tool is ToolMeta => Boolean(tool)),
  );

  loadRecentTools();

  return { recentToolIds, recentTools, recordRecentTool, loadRecentTools };
};
