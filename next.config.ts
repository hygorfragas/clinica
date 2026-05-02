import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Build standalone: gera `.next/standalone/server.js` com só o necessário
  // pra rodar (sem precisar de `node_modules` no runner). Imagem Docker fica
  // pequena e o boot é rápido.
  output: "standalone",
  experimental: {
    serverActions: {
      // Server Actions recebem PDFs (templates de anamnese/evolução/contrato)
      // e imagens de branding (header/footer/logo). 3 MB cobre todos os fluxos
      // atuais com folga; cada validação interna ainda restringe por tipo
      // (MAX_BRANDING_BYTES = 4 MB, MAX_DOCUMENT_BYTES = 20 MB).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
