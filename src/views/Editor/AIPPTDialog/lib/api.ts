import { z } from 'zod'

import url from './utils/url'
import streamWrapperGenerator from '@/utils/streamWrapperGenerator'
import type { AIPPTSlide } from '@/types/AIPPT'
import type { ApiResultType } from '@/types/app'

type PPTOptions =
  | {
      type: 'embed'
      open_id: string
      slug: string
    }
  | { type: 'subject'; subject: string }

export async function genereatePPTOutline(
  body: { deep_think: boolean },
  options: PPTOptions,
  onData?: (data: string) => void,
  controller?: AbortController
): Promise<ApiResultType<string>> {
  // TODO: 这里需要根据不同的类型来处理
  // 目前只支持 embed 类型
  if (options.type !== 'embed') return { success: false, message: '目前只支持根据论文生成大纲' }

  const apiPath = `/api/compile/v1/users/${options.open_id}/projects/${options.slug}/ppt/outline`
  const res = fetch(url(apiPath), {
    method: 'POST',
    credentials: 'include',
    signal: controller?.signal,
    body: JSON.stringify(body),
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
  })

  const streamGenerator = streamWrapperGenerator(res)

  function handleValue(chunk: string[]) {
    let result = ''
    for (const line of chunk) {
      try {
        const parsed = z.object({ message: z.string() }).safeParse(JSON.parse(line.trim()))
        if (parsed.success) result += parsed.data.message
      } catch (err) {}
    }
    return result
  }

  while (true) {
    const { value } = await streamGenerator.next()
    if (Array.isArray(value)) onData?.(handleValue(value))
    else {
      if (!value.success) return value
      return { success: true, data: handleValue(value.data) }
    }
  }
}

export async function generatePPTSlides(
  body: { deep_think: boolean; outline: string },
  options: PPTOptions,
  onData?: (data: AIPPTSlide) => void,
  controller?: AbortController
): Promise<Promise<ApiResultType<AIPPTSlide[]>>> {
  // TODO: 这里需要根据不同的类型来处理
  // 目前只支持 embed 类型
  if (options.type !== 'embed') return { success: false, message: '目前只支持根据论文生成大纲' }

  const apiPath = `/api/compile/v1/users/${options.open_id}/projects/${options.slug}/ppt/slides`
  const res = fetch(url(apiPath), {
    method: 'POST',
    credentials: 'include',
    signal: controller?.signal,
    body: JSON.stringify(body),
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
  })

  const streamGenerator = streamWrapperGenerator(res)

  let chunk = ''
  const slides: AIPPTSlide[] = []

  function handleValue(chunk: string[]) {
    let result = ''
    for (const line of chunk) {
      try {
        const parsed = z.object({ message: z.string() }).safeParse(JSON.parse(line.trim()))
        if (parsed.success) result += parsed.data.message
      } catch (err) {}
    }
    return result
  }

  function handleChunk(chunk: string | string[]) {
    const lines = Array.isArray(chunk) ? chunk : chunk.split('\n')
    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        try {
          const slide = JSON.parse(line) as AIPPTSlide
          onData?.(slide)
          slides.push(slide)
        } catch (e) {}
      })
  }

  while (true) {
    const { value } = await streamGenerator.next()

    // If the stream is done, break the loop
    if (!Array.isArray(value)) {
      if (chunk) handleChunk(chunk)
      if (!value.success) return value
      return { success: true, data: slides }
    }

    // If the stream is not done, process the data
    chunk += handleValue(value)
    const lines = chunk.split('\n')
    chunk = lines.pop() ?? ''

    handleChunk(lines)
  }
}
