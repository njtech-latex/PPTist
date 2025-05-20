import type { Slide } from '@/types/slides'

async function loadMocks() {
  const files = import.meta.glob('/src/assets/mocks/*.json', { query: '?raw', import: 'default' })
  const data = await Promise.all(
    Object.entries(files).map(async ([id, loadContent]) => {
      const name = id.split('/').pop()?.split('.')[0] || ''
      const content = JSON.parse((await loadContent()) as string)
      return { name, content }
    })
  )

  let initSlides: Slide[] = []
  let templates: Record<string, Slide[]> = {}

  data.forEach((d) => {
    if (d.name === 'slides') initSlides = d.content
    else if (d.name.startsWith('template_'))
      templates = { ...templates, [d.name]: d.content.slides }
  })

  return { initSlides, templates }
}

export const mocks = loadMocks()
