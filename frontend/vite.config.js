import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

/* One project, two apps with separate bundles (so the admin's Tailwind reset never touches the public site):
     /        public website   (index.html, src/)         - history-API routes, SEO prerender files in public/
     /admin/  admin app        (admin/index.html, admin/src/) - login-protected, hash routes (#/categories ...) */
const adminSlash = () => {
  const mw = (req, res, next) => {
    if (req.url === '/admin' || req.url.startsWith('/admin?')) {
      res.statusCode = 301
      res.setHeader('Location', req.url.replace('/admin', '/admin/'))
      return res.end()
    }
    next()
  }
  return {
    name: 'admin-trailing-slash',
    configureServer(s) { s.middlewares.use(mw) } /* returns nothing: a returned function would be treated as a post-hook by Vite */,
    configurePreviewServer(s) { s.middlewares.use(mw) },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_DEV_PROXY_TARGET || 'http://localhost:3000'
  /* The API does not need CORS in development: the browser talks to this server and /api, /uploads are forwarded to the backend. */
  const proxy = { '/api': { target, changeOrigin: true }, '/uploads': { target, changeOrigin: true } }
  return {
    plugins: [react(), adminSlash()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      rollupOptions: { input: { main: resolve(process.cwd(), 'index.html'), admin: resolve(process.cwd(), 'admin/index.html') } },
    },
  }
})
