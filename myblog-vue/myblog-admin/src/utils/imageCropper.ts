// ============================================
// 图片裁剪会话控制器
//
// 设计要点：
// - 裁剪对话框是「全站唯一实例」，挂在 App.vue 上（ImageCropperDialog.vue），
//   各上传入口只调 cropImage() 拿一个 Promise，不用在页面里重复挂组件；
// - 返回值为 File 时可直接交给 api.upload.image()（与选文件出来的 File 等价，
//   带正确的 type 与扩展名，不会被后端 config/upload.js 的 fileFilter 拒绝）；
// - 后端 config/upload.js 仍会按 scene 校验 mimetype/扩展名，且 sharp 仍会
//   生成 1200px 主图 + 400px 缩略图两种 WebP 变体 —— 前端裁剪只解决构图，
//   不替代服务端压缩。
// ============================================
import { ref, shallowRef } from 'vue'
import { ElMessage } from 'element-plus'

/** 裁剪比例预设；aspect 为 null 表示「按原图比例」（不强制裁剪） */
export interface CropPreset {
  label: string
  aspect: number | null
  /** 「自定义」项：aspect 由对话框里用户输入的宽 / 高实时算出，不由本表提供 */
  custom?: boolean
}

/**
 * 自定义比例的可操作范围（宽/高之比）。
 *
 * 裁剪框本身就是「输出区域」（输出 = 框内画面按原图像素换算），所以框的比例
 * **就是**输出的比例，不能像「原图比例」那样做视觉收敛 —— 否则「输出比例 ==
 * 输入比例」就不成立。因此改为**限制输入**：超出这个范围时，对话框会把另一侧
 * 的数值夹回区间内（用户能直接看到夹后的值，不会出现 100:1 那种细缝框）。
 */
export const CUSTOM_RATIO_MIN = 1 / 6
export const CUSTOM_RATIO_MAX = 6
/** 自定义比例宽 / 高的输入上下限 */
export const CUSTOM_EDGE_MIN = 1
export const CUSTOM_EDGE_MAX = 100

/** 各上传入口的「自定义」项：新建对象而非共享引用，避免今后被误改 */
const customPreset = (): CropPreset => ({ label: '自定义', aspect: null, custom: true })

export interface CropOptions {
  /** 对话框标题 */
  title?: string
  /** 可选比例预设（默认取 CROP_PRESETS['article-content']） */
  presets?: CropPreset[]
  /** 是否提供「不裁剪，直接上传原图」快捷项 */
  allowSkip?: boolean
  /** 输出最长边上限，默认 2000（只缩不放，避免产出超大文件） */
  maxOutputEdge?: number
  /** JPEG 质量，0-1，默认 0.92 */
  quality?: number
  /** 设为 false 时 GIF 也进裁剪（默认 GIF 跳过裁剪，避免动画被压成静帧） */
  skipGif?: boolean
}

/** 各上传入口的比例预设（外部只传 key，避免比例值散落在各页面） */
const PRESET_DEFS = {
  'article-cover': [
    { label: '16:9', aspect: 16 / 9 },
    { label: '4:3', aspect: 4 / 3 },
    { label: '原图比例', aspect: null },
    customPreset(),
  ],
  'article-content': [
    { label: '原图比例', aspect: null },
    { label: '16:9', aspect: 16 / 9 },
    { label: '1:1', aspect: 1 },
    customPreset(),
  ],
  avatar: [{ label: '1:1', aspect: 1 }, customPreset()],
  emoji: [{ label: '1:1', aspect: 1 }, customPreset()],
  'setting-logo': [
    { label: '原图比例', aspect: null },
    { label: '1:1', aspect: 1 },
    customPreset(),
  ],
  'setting-favicon': [{ label: '1:1', aspect: 1 }, customPreset()],
  'setting-bg-desktop': [
    { label: '16:9', aspect: 16 / 9 },
    { label: '4:3', aspect: 4 / 3 },
    { label: '原图比例', aspect: null },
    customPreset(),
  ],
  'setting-bg-mobile': [
    { label: '9:16', aspect: 9 / 16 },
    { label: '3:4', aspect: 3 / 4 },
    { label: '原图比例', aspect: null },
    customPreset(),
  ],
}

export type CropScene = keyof typeof PRESET_DEFS

/** 取某个上传入口的比例预设（返回的是内部常量引用，调用方不要改） */
export const cropPresets = (scene: CropScene): CropPreset[] => PRESET_DEFS[scene]

// ===== 会话状态（供 ImageCropperDialog.vue 消费）=====
export const cropperVisible = ref(false)
export const cropperFile = shallowRef<File | null>(null)
export const cropperOptions = ref<CropOptions>({})

let pending: ((file: File | null) => void) | null = null

/**
 * 打开裁剪对话框；用户确认返回裁剪后的 File，取消返回 null。
 * 同一时刻只允许一个裁剪会话，后开的会把前一个按「取消」结算。
 */
export const openImageCropper = (file: File, options: CropOptions = {}): Promise<File | null> => {
  pending?.(null)
  pending = null
  cropperFile.value = file
  cropperOptions.value = options
  cropperVisible.value = true
  return new Promise<File | null>((resolve) => {
    pending = resolve
  })
}

/** 由对话框调用：result 为 null 表示取消 */
export const closeImageCropper = (result: File | null) => {
  cropperVisible.value = false
  cropperFile.value = null
  const resolve = pending
  pending = null
  resolve?.(result)
}

/**
 * 上传入口统一入口：需要在「选到文件之后、调用 upload 之前」插一步裁剪的，
 * 用它替换直接调用 upload.image()。
 */
export const cropImage = (file: File, options: CropOptions = {}): Promise<File | null> => {
  // GIF 动图用 canvas 裁完只剩第一帧 —— 与其悄悄毁掉动画，不如原样上传
  if (file.type === 'image/gif' && options.skipGif !== false) {
    ElMessage.info('GIF 动图不支持裁剪，已按原图上传')
    return Promise.resolve(file)
  }
  return openImageCropper(file, options)
}
