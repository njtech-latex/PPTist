<template>
  <template v-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else-if="_isPC" />
    <Mobile v-else />
  </template>
  <FullscreenSpin tip="数据初始化中，请稍等 ..." v-else loading :mask="false" />
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue'
  import { storeToRefs } from 'pinia'

  import { deleteDiscardedDB } from '@/utils/database'
  import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'
  import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'

  import { isPC } from '@/utils/common'
  import { mocks } from './configs/mocks'
  import { loadSlides, saveSlides } from './store/slides'

  import Editor from './views/Editor/index.vue'
  import Screen from './views/Screen/index.vue'
  import Mobile from './views/Mobile/index.vue'
  import FullscreenSpin from '@/components/FullscreenSpin.vue'

  const _isPC = isPC()

  const mainStore = useMainStore()
  const slidesStore = useSlidesStore()
  const snapshotStore = useSnapshotStore()
  const { databaseId } = storeToRefs(mainStore)
  const { slides } = storeToRefs(slidesStore)
  const { screening } = storeToRefs(useScreenStore())

  onMounted(async () => {
    // 加载并持久化 slides 数据
    const initSlides = loadSlides()

    if (initSlides.slides.length) slidesStore.setSlides(initSlides.slides)
    else slidesStore.setSlides([...(await mocks).initSlides])

    slidesStore.setTitle(initSlides.title)
    slidesStore.setTheme(initSlides.theme)
    slidesStore.setViewportSize(initSlides.viewportSize)
    slidesStore.setViewportRatio(initSlides.viewportRatio)
    slidesStore.setTemplates(initSlides.templates)

    slidesStore.$subscribe((_, state) => saveSlides(state))

    await deleteDiscardedDB()
    snapshotStore.initSnapshotDatabase()
  })

  // 应用注销时向 localStorage 中记录下本次 indexedDB 的数据库ID，用于之后清除数据库
  window.addEventListener('unload', () => {
    const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
    const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

    discardedDBList.push(databaseId.value)

    const newDiscardedDB = JSON.stringify(discardedDBList)
    localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
  })
</script>

<style lang="scss">
  #app {
    height: 100%;
  }
</style>
