/* One listener for every <img> on the site (no change needed in each component).
   1st failure: a /img/wp/... local copy is retried at its original WordPress address, and an original address at the local copy.
   2nd failure: a neutral water-drop placeholder, so a missing picture never shows the browser's broken-image icon. */
import { WP } from './data.js'

export const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#efe6d4"/><path d="M120 62S78 116 78 146a42 42 0 0 0 84 0c0-30-42-84-42-84z" fill="#0d8d97" opacity=".55"/></svg>',
  )

export function installImageFallback() {
  document.addEventListener(
    'error',
    (e) => {
      const img = e.target
      if (!img || img.tagName !== 'IMG' || img.src === PLACEHOLDER || img.src.startsWith('data:')) return
      const step = Number(img.dataset.fb || 0)
      img.dataset.fb = String(step + 1)
      const src = img.getAttribute('src') || ''
      if (step === 0) {
        if (src.startsWith('/img/wp/')) return void (img.src = WP + src.slice('/img/wp/'.length))
        if (src.startsWith(WP)) return void (img.src = '/img/wp/' + src.slice(WP.length))
      }
      img.removeAttribute('srcset')
      img.src = PLACEHOLDER
    },
    true /* error events do not bubble, so listen in the capture phase */,
  )
}
