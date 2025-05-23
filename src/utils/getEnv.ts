function isIP(ip: string) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(ip)
}

export function getEnv() {
  const protocol = typeof window === 'undefined' ? 'http' : window.location.protocol
  const host = typeof window === 'undefined' ? 'localhost' : window.location.host

  let local = false
  /**
   * Check environment is local
   *
   * - host contains localhost or local.
   * - host is an ip address
   * - host protocol is http://
   */
  if (/localhost|local./.test(host)) local = true
  else if (isIP(host)) local = true
  else if (/^http:/.test(protocol)) local = true

  let dev = false
  /**
   * Check environment is development
   *
   * - local is true
   * - host contains dev.
   */
  if (local) dev = true
  else if (/dev./.test(host)) dev = true

  return { local, dev }
}
