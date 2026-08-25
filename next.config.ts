import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Turnstile: el widget corre en el browser y necesita el site key, pero
  // queremos el mismo nombre de variable en local y en Vercel (sin el prefijo
  // NEXT_PUBLIC_, que en Vercel obliga a tipar la variable como Config).
  // Listarlas acá hace que Next las inlinee en el bundle igual que una
  // NEXT_PUBLIC_. Ojo: son públicas de todas formas — nunca agregar
  // TURNSTILE_SECRET_KEY a esta lista.
  env: {
    TURNSTILE_ENABLED: process.env.TURNSTILE_ENABLED,
    TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY,
  },
}

export default nextConfig
