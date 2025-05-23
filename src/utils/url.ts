import { getEnv } from './getEnv'

const devServer = 'https://dev.keepresearch.com'
const productionServer = 'https://www.keepresearch.com'

export default function url(...paths: string[]) {
  let base = devServer
  if (!getEnv().dev) base = productionServer

  const path = paths.join('/').replace(/\/+/g, '/')
  if (!path) return base
  return new URL(path, base).toString()
}
