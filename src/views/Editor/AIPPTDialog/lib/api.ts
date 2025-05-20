import url from './utils/url'

export async function genereatePPTOutline(): Promise<any> {
  const content = '大学生社会实践'

  return fetch(url('/ppt/outline'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export async function generatePPTSlides(outline: string): Promise<any> {
  return fetch(url('/ppt/slides'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outline }),
  })
}
