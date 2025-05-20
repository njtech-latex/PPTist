import axios from './config'
import url from './utils/url'

export const ASSET_URL = 'https://asset.pptist.cn'

export default {
  getMockData(filename: string): Promise<any> {
    return axios.get(`./mocks/${filename}.json`)
  },

  getFileData(filename: string): Promise<any> {
    return axios.get(`${ASSET_URL}/data/${filename}.json`)
  },

  AIPPT_Outline(content: string, language: string, model: string): Promise<any> {
    return fetch(url('/ppt/outline'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
      }),
    })
  },

  AIPPT(content: string, language: string, model: string): Promise<any> {
    return fetch(url('/ppt/slides'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        language,
        model,
        stream: true,
      }),
    })
  },
}
