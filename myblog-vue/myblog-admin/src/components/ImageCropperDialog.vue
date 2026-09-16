<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="min(560px, 94vw)"
    append-to-body
    :close-on-click-modal="false"
    class="cropper-dialog"
    @update:model-value="handleVisibleChange"
  >
    <div class="cropper">
      <div class="cropper-stage-box">
        <div
          ref="stageRef"
          class="cropper-stage"
          :class="{ 'is-dragging': dragging }"
          :style="stageStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
        >
          <img
            v-if="previewUrl"
            :src="previewUrl"
            class="cropper-image"
            :style="imageStyle"
            alt="待裁剪图片"
            draggable="false"
          />
          <div class="cropper-frame">
            <div class="cropper-frame-grid"></div>
          </div>
          <div v-if="loading" class="cropper-loading">图片加载中…</div>
        </div>
      </div>

      <div class="cropper-toolbar">
        <el-radio-group
          v-if="presets.length > 1"
          :model-value="presetIndex"
          size="small"
          @change="handlePresetChange"
        >
          <el-radio-button v-for="(preset, index) in presets" :key="preset.label" :value="index">
            {{ preset.label }}
          </el-radio-button>
        </el-radio-group>

        <div class="cropper-zoom">
          <span class="cropper-zoom-label">缩放</span>
          <el-slider
            v-model="zoom"
            class="cropper-zoom-slider"
            :min="1"
            :max="4"
            :step="0.01"
            :show-tooltip="false"
          />
          <el-button link size="small" @click="handleReset">重置</el-button>
        </div>
      </div>

      <div v-if="isCustomRatio" class="cropper-custom">
        <span class="cropper-custom-label">宽 : 高</span>
        <el-input-number
          v-model="customW"
          class="cropper-custom-input"
          :min="CUSTOM_EDGE_MIN"
          :max="CUSTOM_EDGE_MAX"
          :controls="false"
          size="small"
          @change="handleCustomEdgeChange('w')"
        />
        <span class="cropper-custom-colon">:</span>
        <el-input-number
          v-model="customH"
          class="cropper-custom-input"
          :min="CUSTOM_EDGE_MIN"
          :max="CUSTOM_EDGE_MAX"
          :controls="false"
          size="small"
          @change="handleCustomEdgeChange('h')"
        />
        <div class="cropper-custom-quick">
          <el-button
            v-for="ratio in QUICK_RATIOS"
            :key="ratio.label"
            link
            size="small"
            @click="applyQuickRatio(ratio)"
          >
            {{ ratio.label }}
          </el-button>
        </div>
      </div>

      <p class="cropper-hint">
        在图片上拖动可调整位置，滚轮或上方滑块可缩放；框内即为最终效果。
        <span v-if="isOriginalRatio">「原图比例」不会强制裁剪，不动即为原图。</span>
        <span v-else-if="isCustomRatio">自定义比例即输出比例，可在 1:6 ~ 6:1 之间调整。</span>
      </p>
    </div>

    <template #footer>
      <div class="cropper-footer">
        <span class="cropper-output">输出 {{ outputSize.w }} × {{ outputSize.h }}</span>
        <div class="cropper-actions">
          <el-button v-if="allowSkip" @click="handleSkip">不裁剪，直接上传</el-button>
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" :disabled="loading || !ready" @click="handleConfirm">
            确定
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  closeImageCropper,
  cropperFile,
  cropperOptions,
  cropperVisible,
  cropPresets,
  CUSTOM_EDGE_MAX,
  CUSTOM_EDGE_MIN,
  CUSTOM_RATIO_MAX,
  CUSTOM_RATIO_MIN,
  type CropPreset,
} from '@/utils/imageCropper'

// 裁剪框（= 舞台）在对话框内可用的最大尺寸；窄屏时再按视口收缩
const MAX_STAGE_W = 496
const MAX_STAGE_H = 340
// 「原图比例」时舞台比例的收缩范围：极端长条图（全景 / 长截图）直接按原比例
// 会得到一条几乎不可操作的细缝，这里做一点视觉收敛 —— 框内所见即所得，
// 用户看到的画面就是会被保留的部分。
const FREE_ASPECT_MIN = 0.4
const FREE_ASPECT_MAX = 2.5
const ZOOM_MIN = 1
const ZOOM_MAX = 4

/** 自定义比例的快捷值 */
const QUICK_RATIOS = [
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '16:9', w: 16, h: 9 },
  { label: '3:4', w: 3, h: 4 },
  { label: '9:16', w: 9, h: 16 },
]

const DEFAULT_PRESETS: CropPreset[] = cropPresets('article-content')

const visible = computed(() => cropperVisible.value)
const title = computed(() => cropperOptions.value.title || '裁剪图片')
const allowSkip = computed(() => cropperOptions.value.allowSkip === true)

const stageRef = ref<HTMLElement | null>(null)
const presets = ref<CropPreset[]>(DEFAULT_PRESETS)
const presetIndex = ref(0)
const zoom = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const stageW = ref(MAX_STAGE_W)
const stageH = ref(MAX_STAGE_H)
// 自定义比例的宽 / 高（整数）。只在本次会话里有效：每次打开对话框都从推荐比例
// 重新开始，避免「上次的 7:3」被下次剪封面时默默用上。
const customW = ref(16)
const customH = ref(9)
const imgNatural = reactive({ w: 0, h: 0 })
const previewUrl = ref('')
const loading = ref(false)
const ready = ref(false)
const dragging = ref(false)

let loadedImg: HTMLImageElement | null = null
let objectUrl = ''
let sessionId = 0
let dragStartX = 0
let dragStartY = 0
let dragStartOffsetX = 0
let dragStartOffsetY = 0

const currentPreset = computed(() => presets.value[presetIndex.value])
const isCustomRatio = computed(() => currentPreset.value?.custom === true)

/**
 * 当前生效的比例。
 *
 * ⚠️ 自定义比例**必须原值使用、不做视觉收敛**：裁剪框本身就是「输出区域」
 * （`outputSize` 由 `cropNaturalW/H` = `stageW/H ÷ drawScale` 反算），框的比例就是
 * 输出的比例。一旦像「原图比例」那样把框夹到 0.4~2.5，就变成「输入 100:1、
 * 输出 2.5:1」了。因此改为**限制输入**（见 `clampCustomRatio`），
 * 保证框既可用、比例又精确。
 */
const aspect = computed<number | null>(() => {
  const preset = currentPreset.value
  if (!preset) return null
  if (preset.custom) return customW.value / customH.value
  return preset.aspect ?? null
})
const isOriginalRatio = computed(() => aspect.value === null)

const coverScale = computed(() => {
  if (!imgNatural.w || !imgNatural.h) return 1
  return Math.max(stageW.value / imgNatural.w, stageH.value / imgNatural.h)
})
const drawScale = computed(() => coverScale.value * zoom.value)
const imageW = computed(() => imgNatural.w * drawScale.value)
const imageH = computed(() => imgNatural.h * drawScale.value)
const imageLeft = computed(() => (stageW.value - imageW.value) / 2 + offsetX.value)
const imageTop = computed(() => (stageH.value - imageH.value) / 2 + offsetY.value)

/** 裁剪区域在「原图像素」坐标系下的尺寸（与舞台是同一个矩形，只是换算回原图） */
const cropNaturalW = computed(() =>
  drawScale.value > 0 ? stageW.value / drawScale.value : stageW.value,
)
const cropNaturalH = computed(() =>
  drawScale.value > 0 ? stageH.value / drawScale.value : stageH.value,
)

const outputSize = computed(() => {
  const maxEdge = cropperOptions.value.maxOutputEdge ?? 2000
  const w = Math.max(1, Math.round(cropNaturalW.value))
  const h = Math.max(1, Math.round(cropNaturalH.value))
  const longest = Math.max(w, h)
  if (longest <= maxEdge) return { w, h }
  const ratio = maxEdge / longest
  return { w: Math.max(1, Math.round(w * ratio)), h: Math.max(1, Math.round(h * ratio)) }
})

const stageStyle = computed(() => ({
  width: `${stageW.value}px`,
  height: `${stageH.value}px`,
}))
const imageStyle = computed(() => ({
  width: `${imageW.value}px`,
  height: `${imageH.value}px`,
  left: `${imageLeft.value}px`,
  top: `${imageTop.value}px`,
}))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * 把比例拆成一对「尽量简洁」的整数（如 1.778 → 16:9），用于做自定义比例的起点。
 * 从最小的分母开始找，误差严格更小才替换 —— 于是 1.778 会停在 16:9 而不是 32:18。
 */
const ratioToEdges = (ratio: number) => {
  let best = { w: 16, h: 9, error: Infinity }
  for (let h = CUSTOM_EDGE_MIN; h <= CUSTOM_EDGE_MAX; h++) {
    const w = Math.round(h * ratio)
    if (w < CUSTOM_EDGE_MIN || w > CUSTOM_EDGE_MAX) continue
    const error = Math.abs(w / h - ratio) / ratio
    if (error < best.error - 1e-9) best = { w, h, error }
  }
  return { w: best.w, h: best.h }
}

/**
 * 保证「宽 / 高」的两个值落在可操作区间：改一侧就把另一侧夹回范围内。
 *
 * 夹的是输入而不是比例，所以用户看到的数值就是实际生效的比例，
 * 既不会出现 100:1 那种几乎点不中的细缝框，也不会出现「显示与输出不符」。
 */
const clampCustomRatio = (changed: 'w' | 'h') => {
  if (changed === 'w') {
    const minH = Math.max(CUSTOM_EDGE_MIN, Math.ceil(customW.value / CUSTOM_RATIO_MAX))
    const maxH = Math.max(
      minH,
      Math.min(CUSTOM_EDGE_MAX, Math.floor(customW.value / CUSTOM_RATIO_MIN)),
    )
    customH.value = clamp(customH.value, minH, maxH)
  } else {
    const minW = Math.max(CUSTOM_EDGE_MIN, Math.ceil(customH.value * CUSTOM_RATIO_MIN))
    const maxW = Math.max(
      minW,
      Math.min(CUSTOM_EDGE_MAX, Math.floor(customH.value * CUSTOM_RATIO_MAX)),
    )
    customW.value = clamp(customW.value, minW, maxW)
  }
}

const handleCustomEdgeChange = (changed: 'w' | 'h') => {
  clampCustomRatio(changed)
  updateStageSize()
}

const applyQuickRatio = (ratio: { label: string; w: number; h: number }) => {
  customW.value = ratio.w
  customH.value = ratio.h
  updateStageSize()
}

/** 切到「自定义」时的起点：优先沿用上一个比例，否则用原图比例 */
const seedCustomRatio = (base: number) => {
  const { w, h } = ratioToEdges(clamp(base, CUSTOM_RATIO_MIN, CUSTOM_RATIO_MAX))
  customW.value = w
  customH.value = h
}
/** 让图片始终盖满裁剪框：可拖动的余量 = 图片超出框的一半 */
const clampOffsets = () => {
  const maxX = Math.max(0, (imageW.value - stageW.value) / 2)
  const maxY = Math.max(0, (imageH.value - stageH.value) / 2)
  offsetX.value = clamp(offsetX.value, -maxX, maxX)
  offsetY.value = clamp(offsetY.value, -maxY, maxY)
}

/** 按当前比例把舞台放进可用区域（窄屏时按视口收缩，避免对话框内横向溢出） */
const updateStageSize = () => {
  const maxW = Math.max(200, Math.min(MAX_STAGE_W, window.innerWidth - 120))
  const maxH = MAX_STAGE_H
  const freeAspect =
    imgNatural.w && imgNatural.h ? imgNatural.w / imgNatural.h : MAX_STAGE_W / MAX_STAGE_H
  const raw = aspect.value ?? clamp(freeAspect, FREE_ASPECT_MIN, FREE_ASPECT_MAX)
  let w = maxW
  let h = w / raw
  if (h > maxH) {
    h = maxH
    w = h * raw
  }
  stageW.value = Math.round(w)
  stageH.value = Math.round(h)
  clampOffsets()
}

const cleanup = () => {
  sessionId += 1
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
  previewUrl.value = ''
  loadedImg = null
  imgNatural.w = 0
  imgNatural.h = 0
  ready.value = false
  loading.value = false
  dragging.value = false
}

const initSession = async () => {
  cleanup()
  const id = sessionId
  const file = cropperFile.value
  if (!file) return
  const options = cropperOptions.value
  const list = options.presets && options.presets.length ? options.presets : DEFAULT_PRESETS
  presets.value = list
  presetIndex.value = 0
  zoom.value = ZOOM_MIN
  offsetX.value = 0
  offsetY.value = 0
  loading.value = true

  const url = URL.createObjectURL(file)
  objectUrl = url
  const img = new Image()
  img.decoding = 'async'
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = url
    })
  } catch (err) {
    if (id === sessionId) {
      loading.value = false
      ElMessage.error('图片加载失败，请换一张试试')
    }
    console.error('裁剪图片加载失败', err)
    return
  }
  if (id !== sessionId) return
  loadedImg = img
  imgNatural.w = img.naturalWidth
  imgNatural.h = img.naturalHeight
  previewUrl.value = url
  updateStageSize()
  loading.value = false
  ready.value = true
}

const handleReset = () => {
  zoom.value = ZOOM_MIN
  offsetX.value = 0
  offsetY.value = 0
  updateStageSize()
}

const handlePresetChange = (value: string | number | boolean | undefined) => {
  const index = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(index) || index < 0 || index >= presets.value.length) return
  // 切到「自定义」时，用「切之前生效的比例」做起点 —— 从 9:16 / 原图比例切过去
  // 都比固定 16:9 更贴当下的意图
  const base = aspect.value ?? (imgNatural.w && imgNatural.h ? imgNatural.w / imgNatural.h : 16 / 9)
  presetIndex.value = index
  if (presets.value[index]?.custom) seedCustomRatio(base)
  handleReset()
}

// ===== 拖拽 / 缩放 =====
const onPointerDown = (event: PointerEvent) => {
  if (!ready.value) return
  dragging.value = true
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragStartOffsetX = offsetX.value
  dragStartOffsetY = offsetY.value
  stageRef.value?.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value) return
  offsetX.value = dragStartOffsetX + (event.clientX - dragStartX)
  offsetY.value = dragStartOffsetY + (event.clientY - dragStartY)
  clampOffsets()
}

const onPointerUp = (event: PointerEvent) => {
  if (!dragging.value) return
  dragging.value = false
  if (stageRef.value?.hasPointerCapture(event.pointerId)) {
    stageRef.value.releasePointerCapture(event.pointerId)
  }
}

const onWheel = (event: WheelEvent) => {
  if (!ready.value) return
  const step = event.deltaY > 0 ? -0.08 : 0.08
  zoom.value = clamp(Number((zoom.value + step).toFixed(2)), ZOOM_MIN, ZOOM_MAX)
}

watch(zoom, () => clampOffsets())

// ===== 会话生命周期 =====
watch(cropperVisible, (open) => {
  if (open) {
    void initSession()
  } else {
    cleanup()
    dragging.value = false
  }
})

const resolveOutputFormat = (file: File) => {
  // JPEG 源本来就无透明通道；PNG / WebP 源保留 PNG 以免丢透明与后续 WebP 变体生成
  return /^image\/jpe?g$/i.test(file.type)
    ? { mime: 'image/jpeg', ext: 'jpg' }
    : { mime: 'image/png', ext: 'png' }
}

const handleConfirm = async () => {
  const file = cropperFile.value
  const img = loadedImg
  if (!file || !img || !ready.value) return
  try {
    const { mime, ext } = resolveOutputFormat(file)
    const { w, h } = outputSize.value
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器不支持 canvas')
    const scale = drawScale.value
    const srcW = cropNaturalW.value
    const srcH = cropNaturalH.value
    // 浮点误差可能让取景框探出原图边界 1px，这里夹回安全区间
    const sx = clamp(-imageLeft.value / scale, 0, Math.max(0, img.naturalWidth - srcW))
    const sy = clamp(-imageTop.value / scale, 0, Math.max(0, img.naturalHeight - srcH))
    ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mime, cropperOptions.value.quality ?? 0.92)
    })
    if (!blob) throw new Error('导出图片失败')
    closeImageCropper(new File([blob], `crop_${Date.now()}.${ext}`, { type: mime }))
  } catch (err) {
    console.error('图片裁剪失败', err)
    ElMessage.error('图片裁剪失败，请重试')
  }
}

const handleSkip = () => closeImageCropper(cropperFile.value)
const handleCancel = () => closeImageCropper(null)
const handleVisibleChange = (value: boolean) => {
  if (!value) closeImageCropper(null)
}
</script>

<style lang="scss" scoped>
.cropper-stage-box {
  display: flex;
  justify-content: center;
}

.cropper-stage {
  position: relative;
  overflow: hidden;
  border-radius: $border-radius-base;
  background: var(--bg-hover);
  cursor: grab;
  touch-action: none;
  user-select: none;

  &.is-dragging {
    cursor: grabbing;
  }
}

.cropper-image {
  position: absolute;
  display: block;
  max-width: none;
  pointer-events: none;
}

.cropper-frame {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  pointer-events: none;
}

.cropper-frame-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, currentColor 1px, transparent 1px),
    linear-gradient(to bottom, currentColor 1px, transparent 1px);
  background-size: 33.334% 33.334%;
  opacity: 0.22;
}

.cropper-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}

.cropper-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-3;
  margin-top: $spacing-4;
}

.cropper-zoom {
  display: flex;
  align-items: center;
  gap: $spacing-2;
  margin-left: auto;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}

.cropper-zoom-slider {
  width: 150px;
}

/* 自定义比例行：宽 : 高 两个输入框 + 快捷比例 */
.cropper-custom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-2;
  margin-top: $spacing-3;
  color: var(--text-secondary);
  font-size: $font-size-sm;
}

.cropper-custom-input {
  width: 76px;
}

.cropper-custom-colon {
  color: var(--text-muted);
}

.cropper-custom-quick {
  display: flex;
  align-items: center;
  margin-left: auto;
  color: var(--text-muted);
}

.cropper-hint {
  margin: $spacing-3 0 0;
  color: var(--text-muted);
  font-size: $font-size-xs;
  line-height: $line-height-normal;
}

.cropper-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-3;
}

.cropper-output {
  color: var(--text-muted);
  font-size: $font-size-xs;
}

.cropper-actions {
  display: flex;
  gap: $spacing-2;
}
</style>
