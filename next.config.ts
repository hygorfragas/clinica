import type { NextConfig } from "next";

/** Limite de upload de fotos clínicas (1 arquivo por Server Action na biblioteca). */
const CLINICAL_PHOTO_UPLOAD_BODY_LIMIT = "400mb" as const;

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
      bodySizeLimit: CLINICAL_PHOTO_UPLOAD_BODY_LIMIT,
    },
    // Server Actions POSTam na URL da página; o middleware bufferiza o body
    // (default 10 MB) antes de chegar na action — sem isso: "Unexpected end of form".
    middlewareClientMaxBodySize: CLINICAL_PHOTO_UPLOAD_BODY_LIMIT,
  },
};

export default nextConfig;
