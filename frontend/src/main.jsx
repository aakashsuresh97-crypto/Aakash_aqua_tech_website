import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { installLinkInterceptor, migrateHashUrl } from './router.js'
import { installTracking } from './track.js'
import { installImageFallback } from './imageFallback.js'
import './index.css'
import './hero.css'
import './products.css'
import './about.css'
import './about-page.css'
import './brands.css'
import './shop.css'
import './spares.css'
import './sand.css'
import './zones.css'
import './testimonials.css'
import './privacy.css'
import './terms.css'
import './service.css'
import './shipping.css'
import './theme.css'
import './polish.css'
import './cart.css'
import './contact.css'
import { loadSite } from './site.js'

migrateHashUrl()
installLinkInterceptor()
installTracking()
installImageFallback()
/* Live content first (prices, stock, banners) so the page does not flash old values; never wait more than 1.5 s. */
const live = loadSite()
Promise.race([live, new Promise((r) => setTimeout(r, 1500))]).finally(() => {
  const root = document.getElementById('root')
  createRoot(root).render(<App />)
  root.classList.add('ready') /* hides the index.html loader (see the <style> block in index.html) */
})