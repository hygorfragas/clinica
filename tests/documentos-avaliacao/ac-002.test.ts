import assert from "node:assert/strict";
import { test } from "node:test";

import { listarDocumentos } from "../../lib/documentos-avaliacao/listar.ts";

// SPECSFY: US-001 FR-001 AC-002
test("AC-002 a lista mostra a data de criação e o título, e a data não muda", () => {
  const lista = listarDocumentos([
    {
      dataDeCriacao: "2026-09-01",
      titulo: "Primeira avaliação",
      textoAtual: "texto alterado depois",
    },
    {
      dataDeCriacao: "2026-09-10",
      titulo: "Retorno",
      textoAtual: "outro texto",
    },
  ]);

  assert.deepEqual(
    lista.map((item) => ({ data: item.dataDeCriacao, titulo: item.titulo })),
    [
      { data: "2026-09-01", titulo: "Primeira avaliação" },
      { data: "2026-09-10", titulo: "Retorno" },
    ],
  );
});
