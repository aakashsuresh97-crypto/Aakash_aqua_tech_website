/* Conversion tracking: pushes events to window.dataLayer (works with Google Tag Manager / GA4).
   Add your GTM snippet to index.html and these events (click_call, click_whatsapp, demo_open, demo_submit ...) appear automatically. */
export const track = (event, params = {}) => {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

export const installTracking = () => {
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('a,button')
    if (!el) return
    const href = el.getAttribute('href') || ''
    if (href.startsWith('tel:')) track('click_call', { href })
    else if (href.includes('wa.me')) track('click_whatsapp', { href })
    else if (href.startsWith('mailto:')) track('click_email', { href })
    else if (el.dataset.cta) track(el.dataset.cta, { label: el.textContent.trim().slice(0, 60) })
  })
}
