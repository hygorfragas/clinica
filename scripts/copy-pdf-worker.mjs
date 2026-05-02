#!/usr/bin/env node
/**
 * Copia o worker do pdfjs-dist para `public/pdf-worker/` para que possa ser
 * servido como asset estático do Next.js (sem CORS, sem dependência de CDN).
 *
 * Rodado automaticamente via postinstall e exposto como `npm run pdf:copy-worker`.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const src = resolve(
  root,
  "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
);
const dstDir = resolve(root, "public/pdf-worker");
const dst = resolve(dstDir, "pdf.worker.min.mjs");

if (!existsSync(src)) {
  console.warn(
    "[copy-pdf-worker] pdfjs-dist não encontrado em node_modules — pulando.",
  );
  process.exit(0);
}

mkdirSync(dstDir, { recursive: true });
copyFileSync(src, dst);
console.log(`[copy-pdf-worker] ${src} → ${dst}`);
