import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// عند البناء داخل GitHub Actions نستخدم base خاص باسم المستودع؛ محليًا يبقى "/"
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/motohub-egypt/' : '/',
})
