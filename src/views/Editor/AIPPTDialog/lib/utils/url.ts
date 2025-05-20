import { getEnv } from './getEnv'

const localServer = 'http://127.0.0.1:3412/'
const productionServer = 'http://127.0.0.1:3412/'

export default function url(...paths: string[]) {
  let base = productionServer
  if (!getEnv().dev) base = localServer

  const path = paths.join('/').replace(/\/+/g, '/')
  if (!path) return base
  return new URL(path, base).toString()
}
