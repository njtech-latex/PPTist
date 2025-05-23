<template>
  <div class="aippt-dialog">
    <div class="header">
      <span class="title">AIPPT</span>
      <span class="subtite" v-if="step === 'template'">从下方挑选合适的模板，开始生成PPT</span>
      <span class="subtite" v-else-if="step === 'outline'">
        <span v-if="outlineCreating">
          <span>大纲内容生成中，请稍后...</span>
          <IconLoading class="spinner" />
        </span>

        <span v-else-if="outline">
          确认下方内容大纲（点击编辑内容，右键添加/删除大纲项），开始选择模板
        </span>

        <span v-else>大纲生成失败，请稍后重试</span>
      </span>
      <span class="subtite" v-else>根据您的内容，生成PPT大纲</span>
    </div>

    <template v-if="step === 'setup'">
      <div class="setup">
        <div class="toggle-btns" v-if="mainStore.isEmbed || getEnv().dev">
          <button
            type="button"
            @click="inputMethod = 'subject'"
            :class="{ active: inputMethod === 'subject' }"
          >
            输入主题
          </button>

          <button
            type="button"
            @click="inputMethod = 'embed'"
            :class="{ active: inputMethod === 'embed' }"
          >
            根据论文
          </button>
        </div>

        <div class="input-area">
          <div class="title" v-if="inputMethod === 'subject'">
            <h2>PPT主题</h2>
            <p>请输入您想要生成的PPT主题</p>
            <input
              class="input"
              type="text"
              name="ppt-subject"
              placeholder="请输入PPT主题"
              v-model="content.subject"
            />
          </div>

          <div class="title" v-else-if="inputMethod === 'embed'">
            <h2>根据论文</h2>
            <p>根据您当前的论文生成对应的PPT大纲</p>
            <input
              class="input"
              type="text"
              name="ppt-embed"
              v-model="content.embed"
              :disabled="mainStore.isEmbed"
            />
          </div>

          <div class="title">
            <h2>深度思考</h2>
            <p class="subtite">深度思考会让AI更深入的理解您的内容</p>
            <Switch v-model:value="deepThink" />
          </div>
        </div>

        <div class="btns">
          <Button class="btn" @click="step = 'outline'" v-if="outline.length">查看已有大纲</Button>
          <Button class="btn" type="primary" @click="createOutline()">
            <span v-if="outline">重新生成大纲</span>
            <span v-else>生成大纲</span>
          </Button>
        </div>
      </div>
    </template>

    <div class="preview" v-if="step === 'outline'">
      <pre ref="outlineRef" v-if="outlineCreating">{{ outline }}</pre>
      <div class="outline-view" v-else>
        <OutlineEditor v-model:value="outline" />
      </div>
      <div class="btns" v-if="!outlineCreating">
        <Button class="btn" @click="step = 'setup'">重新生成</Button>
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
  import z from 'zod'
  import { storeToRefs } from 'pinia'
  import { onMounted, onUnmounted, ref } from 'vue'

  import message from '@/utils/message'
  import useAIPPT from '@/hooks/useAIPPT'
  import { mocks } from '@/configs/mocks'
  import { getEnv } from '@/utils/getEnv'
  import { useMainStore, useSlidesStore } from '@/store'
  import { generatePPTSlides, genereatePPTOutline } from './lib/api'
  import type { AIPPTSlide } from '@/types/AIPPT'

  import Switch from '@/components/Switch.vue'
  import Button from '@/components/Button.vue'
  import OutlineEditor from '@/components/OutlineEditor.vue'
  import FullscreenSpin from '@/components/FullscreenSpin.vue'

  const mainStore = useMainStore()
  const { AIPPT, getMdContent } = useAIPPT()
  const { templates } = storeToRefs(useSlidesStore())

  const inputMethod = ref<'subject' | 'embed'>('subject')
  const content = ref<{ subject: string; embed: string }>({ subject: '', embed: '' })

  const deepThink = ref(false)
  const outline = ref('')
  const selectedTemplate = ref('template_1')
  const loading = ref(false)
  const outlineCreating = ref(false)
  const outlineRef = ref<HTMLElement>()
  const step = ref<'setup' | 'outline' | 'template'>('setup')

  const createOutline = async () => {
    // TODO: 这里需要根据用户选择的主题或论文链接生成大纲
    // 目前只支持 embed 类型
    if (inputMethod.value !== 'embed') return message.error('目前只支持根据论文生成大纲')

    const input = (() => {
      const [open_id, slug] = content.value.embed.split('/')
      if (!open_id || !slug) return null
      return { open_id, slug }
    })()
    if (!input) return message.error('请输入正确的论文链接，格式为 open_id/slug')

    outline.value = ''
    step.value = 'outline'
    outlineCreating.value = true

    function handleReceiveData(data: string) {
      outline.value += data
      if (outlineRef.value) outlineRef.value.scrollTop = outlineRef.value.scrollHeight + 20
    }

    const body = { deep_think: deepThink.value }
    const options = { type: 'embed', ...input } as const
    const res = await genereatePPTOutline(body, options, handleReceiveData)

    if (!res.success) message.error(res.message)
    else outline.value = getMdContent(outline.value)

    outlineCreating.value = false
  }

  const createPPT = async () => {
    // TODO: 这里需要根据用户选择的主题或论文链接生成大纲
    // 目前只支持 embed 类型
    if (inputMethod.value !== 'embed') return message.error('请使用论文链接生成大纲')

    const input = (() => {
      const [open_id, slug] = content.value.embed.split('/')
      if (!open_id || !slug) return null
      return { open_id, slug }
    })()
    if (!input) return message.error('请输入正确的论文链接，格式为 open_id/slug')

    loading.value = true
    const templateSlides = (await mocks).templates[selectedTemplate.value]

    function handleReceiveData(slide: AIPPTSlide) {
      try {
        AIPPT(templateSlides, [slide])
      } catch (err) {}
    }

    const body = { deep_think: deepThink.value, outline: outline.value }
    const options = { type: 'embed', ...input } as const
    const res = await generatePPTSlides(body, options, handleReceiveData)
    if (!res.success) message.error(res.message)
    else mainStore.setAIPPTDialogState(false)

    loading.value = false
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.source === window) return
    if (content.value.embed) return

    // 解析消息
    const schema = z.object({ open_id: z.string(), slug: z.string() })
    const parsed = schema.safeParse(event.data.presentation)
    if (!parsed.success) return

    mainStore.setIsEmbedState(true)
    inputMethod.value = 'embed'
    content.value.embed = `${parsed.data.open_id}/${parsed.data.slug}`
  }

  onMounted(() => {
    window.parent.postMessage({ presentation: { action: 'init' } }, '*')
    window.addEventListener('message', handleMessage)
  })
  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })
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
  .spinner {
    margin-left: 5px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .setup {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    color: black;

    .toggle-btns {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      padding: 7px;
      background-color: #f1f1f1;
      border-radius: 7px;

      button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;

        &.active {
          background-color: white;
        }
      }
    }

    .input-area {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 18px;

      .title {
        display: flex;
        flex-direction: column;
        gap: 5px;

        h2 {
          font-size: 15px;
          font-weight: normal;
        }

        p {
          font-size: 12px;
          color: #888;
        }

        span.switch {
          width: fit-content;
        }
      }

      .input {
        font-size: 14px;
        outline: none;
        padding: 14px;
        border-radius: 6px;
        border: 1px solid #dcdcdc;

        &:focus {
          border-color: $themeColor;
        }
      }
    }

    .btns {
      margin-top: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
    }
  }
</style>
