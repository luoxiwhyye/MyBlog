<template>
  <div id="app">
    <router-view />
    <!-- 裁剪对话框全站唯一实例：上传入口通过 utils/imageCropper 的 cropImage() 调用 -->
    <ImageCropperDialog />
  </div>
</template>

<script setup lang="ts">
import ImageCropperDialog from '@/components/ImageCropperDialog.vue'
</script>
