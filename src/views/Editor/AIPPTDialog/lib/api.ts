import type { ApiResultType } from '@/types/app'

import url from './utils/url'
import streamWrapperGenerator from '@/utils/streamWrapperGenerator'
import type { AIPPTSlide } from '@/types/AIPPT'

export async function genereatePPTOutline(
  type: 'subject' | 'file' | 'embed',
  content: string | File,
  onData?: (data: string) => void,
  controller?: AbortController
): Promise<ApiResultType<string>> {
  const formData = new FormData()
  formData.append('type', type)
  formData.append('content', content)

  const res = fetch(url('/ppt/outline'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal: controller?.signal,
  })

  const streamGenerator = streamWrapperGenerator(res)

  while (true) {
    const { value } = await streamGenerator.next()
    if (typeof value === 'object') return value
    else onData?.(value)
  }
}

export async function generatePPTSlides(
  type: 'subject' | 'file' | 'embed',
  outline: string,
  content: string | File,
  onData?: (data: AIPPTSlide) => void,
  controller?: AbortController
): Promise<Promise<ApiResultType<AIPPTSlide[]>>> {
  const formData = new FormData()
  formData.append('type', type)
  formData.append('outline', outline)
  if (type !== 'subject') formData.append('content', content)

  const res = fetch(url('/ppt/slides'), {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal: controller?.signal,
  })

  const streamGenerator = streamWrapperGenerator(res)

  let chunk = ''
  const slides: AIPPTSlide[] = []

  while (true) {
    const { value } = await streamGenerator.next()

    // If the stream is done, break the loop
    if (typeof value === 'object') {
      if (!value.success) return value
      return { success: true, data: slides }
    }

    // If the stream is not done, process the data
    chunk += value
    const lines = chunk.split('\n')
    chunk = lines.pop() ?? ''

    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        try {
          const slide = JSON.parse(line) as AIPPTSlide
          onData?.(slide)
          slides.push(slide)
        } catch (e) {
          // Ignore JSON parse errors
        }
      })
  }
}
