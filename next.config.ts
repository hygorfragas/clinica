import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone: gera `.next/standalone/server.js` com só o necessário
  // pra rodar (sem precisar de `node_modules` no runner). Imagem Docker fica
  // pequena e o boot é rápido.
  output: "standalone",
  experimental: {
    serverActions: {
      // Biblioteca: 1 foto por request, até MAX_PHOTO_BATCH_BYTES (400 MB).
      // PDFs de template e branding continuam validados por tipo/tamanho no servidor.
      bodySizeLimit: "400mb",
    },
  },
};

export default nextConfig;
