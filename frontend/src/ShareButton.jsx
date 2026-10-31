/* Share button for product pages – FRONTEND ONLY (no backend / API needed).
   Phones: opens the native share sheet (WhatsApp, Instagram, SMS ...) through the browser's Web Share API.
   Desktop: small popup with WhatsApp / Facebook / X / Telegram / Email / Copy link. */
import { useEffect, useRef, useState } from 'react'

const Icon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
)

export default function ShareButton({ title, text }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef(null)
  const url = () => window.location.origin + window.location.pathname // clean link (no ?query)
  const msg = text || title

  useEffect(() => {
    if (!open) return
    const off = (e) => box.current && !box.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', off)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', off)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const click = async () => {
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title, text: msg, url: url() })
        return
      } catch (e) {
        if (e && e.name === 'AbortError') return // user closed the sheet
      }
    }
    setOpen((o) => !o)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url())
    } catch (e) {
      const t = document.createElement('textarea')
      t.value = url()
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      t.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const u = encodeURIComponent(url()),
    m = encodeURIComponent(msg)
  const links = [
    ['WhatsApp', `https://wa.me/?text=${m}%20${u}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['X', `https://twitter.com/intent/tweet?text=${m}&url=${u}`],
    ['Telegram', `https://t.me/share/url?url=${u}&text=${m}`],
    ['Email', `mailto:?subject=${m}&body=${u}`],
  ]

  return (
    <div className="shr" ref={box}>
      <button type="button" className="shr-btn" onClick={click} aria-label={'Share ' + title} aria-expanded={open}>
        <Icon />
      </button>
      {open && (
        <div className="shr-pop" role="menu">
          {links.map(([n, h]) => (
            <a key={n} href={h} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setOpen(false)}>
              {n}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={copy}>
            {copied ? 'Link copied ✓' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}