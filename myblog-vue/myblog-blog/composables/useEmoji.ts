import { ref } from "vue";
import { emojiApi, type EmojiGroupData, type EmojiType } from "~/api";

/**
 * 表情库 composable（表情包体系重做 · C：分组）
 * 动态从后端拉取启用表情（含博主自定义图片表情），按分组返回。
 * 内置「默认 / 颜文字」两组始终保留在最前，后端分组（含博主自定义）追加在后。
 *
 * - 文本表情：直接输出（emoji/颜文字，Vue 默认转义，天然安全）
 * - 图片表情：content 为 http(s) URL，前端用 <img> 渲染
 * - 状态提升为模块级单例：多个 picker 实例只发一次 /emoji/grouped
 */

// 内置基础表情（「默认」与「颜文字」两组的内容来源）
const DEFAULT_EMOJI = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😎",
  "🤩",
  "🥳",
  "😏",
  "😒",
  "😞",
  "😔",
  "😟",
  "😕",
  "🙁",
  "😣",
  "😖",
  "😫",
  "😩",
  "🥺",
  "😢",
  "😭",
  "😤",
  "😠",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "💪",
  "👀",
  "🧠",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "💖",
  "💗",
  "🔥",
  "⭐",
  "✨",
  "🎉",
  "🎊",
  "🙏",
  "💯",
  "✅",
  "❌",
  "❓",
  "❗",
  "💡",
  "📌",
  "🔗",
  "💻",
  "📱",
  "🖥️",
  "⌨️",
  "🎵",
  "🌈",
];

const DEFAULT_KAOMOJI = [
  "(｡･ω･｡)",
  "(◕‿◕)",
  "(◠‿◠)",
  "(≧◡≦)",
  "(⌒‿⌒)",
  "(＾▽＾)",
  "(◍•ᴗ•◍)",
  "(づ｡◕‿‿◕｡)づ",
  "(╥_╥)",
  "(╯︵╰,)",
  "(╥﹏╥)",
  "(个_个)",
  "(¬_¬)",
  "(ーー;)",
  "(￣ω￣)",
  "(＾～＾)",
  "(╯°□°）╯︵ ┻━┻",
  "┐(￣ヘ￣)┌",
  "¯\\_(ツ)_/¯",
  "( ´ ▽ ` )ﾉ",
  "(☞ﾟヮﾟ)☞",
  "( ͡° ͜ʖ ͡°)",
  "(⌐■_■)",
  "(＃￣0￣)",
  "(˘▽˘)っ♨",
  "(^_−)☆",
  "(•̀ᴗ•́)و",
  "ರ_ರ",
  "(ᗒᗣᗕ)՞",
];

// 图片表情判定统一由 utils/commentRender 的 isEmojiImage 提供（渲染与校验共用同一规则）

/** 前台视图模型：表情条目 */
export interface EmojiEntry {
  id: number;
  content: string;
  type: EmojiType;
}

/** 前台视图模型：分组（id 为负数是前端内置分组；0 是后端「未归属分组」的容器） */
export interface EmojiGroupView {
  id: number;
  name: string;
  cover: string;
  emojis: EmojiEntry[];
}

// 内置基础表情分组：**始终保留在 tab 栏最前**。
// 后端无数据时它就是全部；博主建了自定义分组时，自定义分组追加在其后。
// id 用负数，避免与后端分组 id 撞车。
const buildBuiltinGroups = (): EmojiGroupView[] => [
  {
    id: -1,
    name: "默认",
    cover: "😀",
    emojis: DEFAULT_EMOJI.map((content, index) => ({
      id: -(index + 1),
      content,
      type: "emoji" as const,
    })),
  },
  {
    id: -2,
    name: "颜文字",
    cover: "(｡･ω･｡)",
    emojis: DEFAULT_KAOMOJI.map((content, index) => ({
      id: -(index + 1),
      content,
      type: "kaomoji" as const,
    })),
  },
];

// 模块级单例状态：多个 picker 实例共用，避免各拉一次接口
const groups = ref<EmojiGroupView[]>(buildBuiltinGroups());
const loaded = ref(false);
let inflight: Promise<void> | null = null;

const normalizeGroups = (data: EmojiGroupData[]): EmojiGroupView[] =>
  data
    .map((group) => ({
      id: group.id,
      // 后端 id=0 是「未归属任何分组」的表情容器，改名避免与内置「默认」分组重名
      name: group.id === 0 ? "未分组" : group.name,
      cover: group.cover || "",
      emojis: (group.emojis || [])
        .map((item) => ({
          id: item.id,
          content: (item.content || "").trim(),
          type: item.type,
        }))
        .filter((item) => item.content),
    }))
    .filter((group) => group.emojis.length > 0);

export function useEmoji() {
  const loadEmoji = (force = false) => {
    if (loaded.value && !force) return Promise.resolve();
    if (inflight) return inflight;

    inflight = (async () => {
      try {
        const res = await emojiApi.getGrouped();
        const list = (res.data as EmojiGroupData[]) || [];
        // 内置两组始终在最前（基础表情始终可用），后端分组（含博主自定义）追加在后
        groups.value = [...buildBuiltinGroups(), ...normalizeGroups(list)];
      } catch {
        // 拉取失败：保留内置默认（静默）
      } finally {
        loaded.value = true;
        inflight = null;
      }
    })();

    return inflight;
  };

  return { groups, loaded, loadEmoji };
}

/** 重置为内置默认（测试 / HMR 用） */
export const __resetEmoji = () => {
  groups.value = buildBuiltinGroups();
  loaded.value = false;
  inflight = null;
};
