import type { ApiResultType } from '@/types/app'

/**
 * Async generator that streams data chunks from a fetch response into strings.
 *
 * @yields Each chunk of text received.
 */
export default async function* streamWrapperGenerator<T>(
  response: Promise<Response>
): AsyncGenerator<string[], ApiResultType<string[]>, unknown> {
  try {
    const res = await response

    if (!res.body || !res.ok) {
      const message = (await res.json()).message
      throw new Error(message ?? 'Failed to retrieve data')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf-8')

    let chunk = ''
    const result: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      chunk += decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      chunk = lines.pop() ?? ''

      const data = lines
        .filter((line) => line.startsWith('data: '))
        .map((line) => line.slice(6))
        .filter((line) => line !== '[DONE]')

      result.push(...data)
      yield data
    }

    return { success: true, data: result }
  } catch (err) {
    // Return the error
    return { success: false, message: (err as Error).message }
  }
}
