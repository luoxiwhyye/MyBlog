import { ref } from "vue";
import { emojiApi, type EmojiItem } from "~/api";

/**
 * 表情库 composable
 * 动态从后端拉取启用表情（含博主自定义图片表情），合并内置默认值兜底。
 * - 文本表情：直接输出（emoji/颜文字，Vue 默认转义，天然安全）
 * - 图片表情：content 为 http(s) URL，前端用 <img> 渲染
 */

// 内置默认文本表情（后端无数据显示的兜底）
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

// 判断是否为图片表情 URL
export const isEmojiImage = (content: string) =>
  /^https?:\/\/[^\s"'<>\\]+$/i.test(content);

export function useEmoji() {
  const emojiList = ref<string[]>([...DEFAULT_EMOJI]);
  const kaomojiList = ref<string[]>([...DEFAULT_KAOMOJI]);
  const imageEmojiList = ref<string[]>([]); // 博主自定义图片表情

  const loadEmoji = async () => {
    try {
      const res = await emojiApi.getEnabled();
      const items: EmojiItem[] = res.data || [];
      if (!items.length) return;

      // 按类型分组；图片 URL 单独归入 imageEmojiList
      const textEmoji: string[] = [];
      const textKaomoji: string[] = [];
      const images: string[] = [];

      for (const item of items) {
        const content = item.content?.trim();
        if (!content) continue;
        if (isEmojiImage(content)) {
          images.push(content);
        } else if (item.type === "kaomoji") {
          textKaomoji.push(content);
        } else {
          textEmoji.push(content);
        }
      }

      // 后端有数据则用后端（含自定义），否则保留默认兜底
      if (textEmoji.length) emojiList.value = textEmoji;
      if (textKaomoji.length) kaomojiList.value = textKaomoji;
      imageEmojiList.value = images;
    } catch {
      // 拉取失败：保留内置默认（静默）
    }
  };

  return { emojiList, kaomojiList, imageEmojiList, loadEmoji };
}
