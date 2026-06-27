import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone: gera `.next/standalone/server.js` com só o necessário
  // pra rodar (sem precisar de `node_modules` no runner). Imagem Docker fica
  // pequena e o boot é rápido.
  output: "standalone",
  experimental: {
    serverActions: {
      // Lotes de fotos clínicas: até MAX_PHOTOS_PER_BATCH × MAX_PHOTO_BYTES (15 × 12 MB).
      // PDFs de template e branding continuam validados por tipo/tamanho no servidor.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
