import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      $assets: path.resolve(__dirname, "src/assets"),
      $components: path.resolve(__dirname, "src/components"),
    },
  },
});
