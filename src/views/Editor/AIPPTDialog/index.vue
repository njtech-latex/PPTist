<template>
  <div class="aippt-dialog">
    <div class="header">
      <span class="title">AIPPT</span>
      <span class="subtite" v-if="step === 'template'">从下方挑选合适的模板，开始生成PPT</span>
      <span class="subtite" v-else-if="step === 'outline'">
        确认下方内容大纲（点击编辑内容，右键添加/删除大纲项），开始选择模板
      </span>
      <span class="subtite" v-else>根据您的论文内容，点击AI将自动生成PPT大纲</span>
    </div>

    <template v-if="step === 'setup'">
      <Button class="btn" type="primary" @click="createOutline()">生成大纲</Button>
    </template>

    <div class="preview" v-if="step === 'outline'">
      <pre ref="outlineRef" v-if="outlineCreating">{{ outline }}</pre>
      <div class="outline-view" v-else>
        <OutlineEditor v-model:value="outline" />
      </div>
      <div class="btns" v-if="!outlineCreating">
        <Button class="btn" @click="createOutline()">重新生成</Button>
        <Button class="btn" type="primary" @click="step = 'template'">选择模板</Button>
      </div>
    </div>

    <div class="select-template" v-if="step === 'template'">
      <div class="templates">
        <div
          class="template"
          :class="{ selected: selectedTemplate === template.id }"
          v-for="template in templates"
          :key="template.id"
          @click="selectedTemplate = template.id"
        >
          <img :src="template.cover" :alt="template.name" />
        </div>
      </div>
      <div class="btns">
        <Button class="btn" @click="step = 'outline'">返回大纲</Button>
        <Button class="btn" type="primary" @click="createPPT()">生成</Button>
      </div>
    </div>

    <FullscreenSpin :loading="loading" tip="AI生成中，请耐心等待 ..." />
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue'
  import { storeToRefs } from 'pinia'

  import useAIPPT from '@/hooks/useAIPPT'
  import { mocks } from '@/configs/mocks'
  import { useMainStore, useSlidesStore } from '@/store'
  import { generatePPTSlides, genereatePPTOutline } from './lib/api'
  import type { AIPPTSlide } from '@/types/AIPPT'

  import Button from '@/components/Button.vue'
  import FullscreenSpin from '@/components/FullscreenSpin.vue'
  import OutlineEditor from '@/components/OutlineEditor.vue'

  const mainStore = useMainStore()
  const { templates } = storeToRefs(useSlidesStore())
  const { AIPPT, getMdContent } = useAIPPT()

  const outline = ref('')
  const selectedTemplate = ref('template_1')
  const loading = ref(false)
  const outlineCreating = ref(false)
  const outlineRef = ref<HTMLElement>()
  const step = ref<'setup' | 'outline' | 'template'>('setup')

  const createOutline = async () => {
    loading.value = true
    outlineCreating.value = true

    const stream = await genereatePPTOutline()

    loading.value = false
    outline.value = ''
    step.value = 'outline'

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')

    const readStream = () => {
      reader.read().then(({ done, value }) => {
        if (done) {
          outline.value = getMdContent(outline.value)
          outlineCreating.value = false
          return
        }

        const chunk = decoder.decode(value, { stream: true })
        outline.value += chunk

        if (outlineRef.value) {
          outlineRef.value.scrollTop = outlineRef.value.scrollHeight + 20
        }

        readStream()
      })
    }
    readStream()
  }

  const createPPT = async () => {
    loading.value = true

    const stream = await generatePPTSlides(outline.value)
    const templateSlides = (await mocks).templates[selectedTemplate.value]

    const reader: ReadableStreamDefaultReader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')

    let chunk = ''

    const readStream = () => {
      const renderPPT = (content: string | string[]) => {
        const lines = Array.isArray(content) ? content : content.split('\n')
        lines
          .filter((l) => l.trim().length)
          .forEach((line) => {
            try {
              const slide: AIPPTSlide = JSON.parse(line)
              AIPPT(templateSlides, [slide])
            } catch (err) {
              console.error(err)
            }
          })
      }

      reader.read().then(({ done, value }) => {
        if (done) {
          if (chunk) renderPPT(chunk)

          loading.value = false
          mainStore.setAIPPTDialogState(false)
          return
        }

        chunk += decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        chunk = lines.pop() ?? ''

        renderPPT(lines)

        readStream()
      })
    }
    readStream()
  }
</script>

<style lang="scss" scoped>
  .aippt-dialog {
    margin: -20px;
    padding: 30px;
  }
  .header {
    margin-bottom: 12px;

    .title {
      font-weight: 700;
      font-size: 20px;
      margin-right: 8px;
      background: linear-gradient(270deg, #d897fd, #33bcfc);
      background-clip: text;
      color: transparent;
      vertical-align: text-bottom;
      line-height: 1.1;
    }
    .subtite {
      color: #888;
      font-size: 12px;
    }
  }
  .preview {
    pre {
      max-height: 450px;
      padding: 10px;
      margin-bottom: 15px;
      background-color: #f1f1f1;
      overflow: auto;
    }
    .outline-view {
      max-height: 450px;
      padding: 10px;
      margin-bottom: 15px;
      background-color: #f1f1f1;
      overflow: auto;
    }
    .btns {
      display: flex;
      justify-content: center;
      align-items: center;

      .btn {
        width: 120px;
        margin: 0 5px;
      }
    }
  }
  .select-template {
    .templates {
      display: flex;
      margin-bottom: 10px;
      @include flex-grid-layout();

      .template {
        border: 2px solid $borderColor;
        border-radius: $borderRadius;
        width: 304px;
        height: 172.75px;
        margin-bottom: 12px;

        &:not(:nth-child(2n)) {
          margin-right: 12px;
        }

        &.selected {
          border-color: $themeColor;
        }

        img {
          width: 100%;
        }
      }
    }
    .btns {
      display: flex;
      justify-content: center;
      align-items: center;

      .btn {
        width: 120px;
        margin: 0 5px;
      }
    }
  }
</style>
