import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// If you deploy to username.github.io (root), leave base as '/'.
// If you deploy to username.github.io/mini-game-hub (project page),
// change base to '/mini-game-hub/' (must match your repo name).
export default defineConfig({
  plugins: [react()],
  base: '/mini-game-hub/',
})
