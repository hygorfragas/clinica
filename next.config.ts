import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone: gera `.next/standalone/server.js` com só o necessário
  // pra rodar (sem precisar de `node_modules` no runner). Imagem Docker fica
  // pequena e o boot é rápido.
  output: "standalone",
  experimental: {
    serverActions: {
      // PDFs de template, branding e lotes de fotos clínicas (até 15 por envio,
      // comprimidas no cliente antes do POST). Validação por arquivo continua em
      // MAX_PHOTO_BYTES (12 MB) e MAX_DOCUMENT_BYTES (20 MB).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
