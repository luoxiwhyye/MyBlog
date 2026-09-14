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

      <p class="cropper-hint">
        在图片上拖动可调整位置，滚轮或上方滑块可缩放；框内即为最终效果。
        <span v-if="isOriginalRatio">「原图比例」不会强制裁剪，不动即为原图。</span>
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

const aspect = computed<number | null>(() => presets.value[presetIndex.value]?.aspect ?? null)
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
  presetIndex.value = index
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
