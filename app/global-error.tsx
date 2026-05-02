"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] erro fatal:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily:
            "DM Sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#f7f4ef",
          color: "#1f2a24",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <main
          style={{
            maxWidth: 480,
            margin: "10vh auto 0",
            background: "#ffffff",
            border: "1px solid #e4dfd4",
            borderRadius: 16,
            padding: "2rem",
            boxShadow: "0 20px 40px -24px rgba(31,42,36,0.18)",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontWeight: 600,
            }}
          >
            Ocorreu um erro inesperado
          </h1>
          <p style={{ marginTop: 12, color: "#5a645d", lineHeight: 1.5 }}>
            A aplicação não conseguiu renderizar esta tela. Recarregar geralmente
            resolve. Se o problema continuar, avise o suporte.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: 16,
                padding: "8px 12px",
                fontSize: 12,
                background: "#efece4",
                borderRadius: 8,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Código: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#4a655a",
                color: "#f6f4ee",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
