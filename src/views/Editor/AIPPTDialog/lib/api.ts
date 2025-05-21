import url from './utils/url'

export async function genereatePPTOutline(
  open_id: string,
  slug: string
): Promise<ReadableStreamDefaultReader | string> {
  const fallbackMessage = '大纲生成失败，请稍后再试'

  try {
    const apiPath = `/api/compile/v1/users/${open_id}/projects/${slug}/ppt/outline`
    const res = await fetch(url(apiPath), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    if (res.status === 200) return res.body?.getReader() ?? fallbackMessage
    const { message } = await res.json()
    return message || fallbackMessage
  } catch (err) {
    console.error(err)
    return fallbackMessage
  }
}

export async function generatePPTSlides(
  open_id: string,
  slug: string,
  outline: string
): Promise<ReadableStreamDefaultReader | string> {
  const fallbackMessage = '幻灯片生成失败，请稍后再试'

  try {
    const apiPath = `/api/compile/v1/users/${open_id}/projects/${slug}/ppt/slides`
    const res = await fetch(url(apiPath), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outline }),
    })

    if (res.status == 200) return res.body?.getReader() ?? fallbackMessage
    const { message } = await res.json()
    return message || fallbackMessage
  } catch (err) {
    console.error(err)
    return fallbackMessage
  }
}
