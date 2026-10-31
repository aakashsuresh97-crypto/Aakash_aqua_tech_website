/* Tiny History-API router: real URLs (/shop/domestic/ro) instead of /#/shop/..., so each page can be indexed. */
export const getPath = () => {
  const p = decodeURI(window.location.pathname).replace(/\/+$/, '')
  return p || '/'
}

export const navigate = (path, { replace = false } = {}) => {
  if (getPath() === path.split('?')[0].replace(/\/+$/, '').replace(/^$/, '/')) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  window.dispatchEvent(new Event('locationchange'))
}

/* Old links like /#/about keep working: they are rewritten to /about on first load. */
export const migrateHashUrl = () => {
  const { hash } = window.location
  if (hash.startsWith('#/')) window.history.replaceState({}, '', hash.slice(1))
}

/* Any <a href="/something"> becomes a client-side navigation (no full reload). */
export const installLinkInterceptor = () => {
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest && e.target.closest('a[href]')
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
    const href = a.getAttribute('href')
    if (!href || !href.startsWith('/') || href.startsWith('//')) return
    e.preventDefault()
    navigate(href)
  })
}
