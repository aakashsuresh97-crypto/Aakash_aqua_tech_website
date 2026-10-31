/* Animated link click for the blog pages: a sandal-cream "water wave" sweeps over the screen, THEN the page changes.
   Use:  <a href={h} onClick={(e) => wipeNav(e, h)}>   (styles: .bl-wipe in blog.css)
   - works for in-app paths (/blog, /benefits-of-amc-...) and for external links
   - ctrl/cmd/shift-click, new-tab links and "reduce motion" users get the normal instant link */
import { navigate } from './router.js'

export const wipeNav = (e, href) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  e.preventDefault()
  if (document.querySelector('.bl-wipe')) return /* already animating */

  const el = document.createElement('div')
  el.className = 'bl-wipe'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = '<i></i><i></i><i></i>'
  document.body.appendChild(el)

  const external = /^https?:\/\//.test(href) && !href.startsWith(window.location.origin)
  setTimeout(() => {
    if (external) return window.location.assign(href)
    navigate(href)
    el.classList.add('out') /* new page is already rendered underneath: wave slides away */
    setTimeout(() => el.remove(), 700)
  }, 520)
}
