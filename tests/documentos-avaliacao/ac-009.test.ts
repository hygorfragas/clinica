import assert from "node:assert/strict";
import { test } from "node:test";

import { baixarArquivo } from "../../lib/documentos-avaliacao/arquivo.ts";

// SPECSFY: US-002 FR-003 AC-009
test("AC-009 o segundo download conserva a cópia anterior", () => {
  const resultado = baixarArquivo({
    documentoId: "doc-1",
    pacienteId: "pac-1",
    texto: "texto revisado",
    valorProtocolo: 900,
    audio: null,
    anexo: null,
    tabela: null,
    listaDeVerificacao: null,
    subpagina: null,
    precosPorProcedimento: [],
    copiasAnteriores: [
      {
        id: "copia-1",
        documentoId: "doc-1",
        pacienteId: "pac-1",
        texto: "texto antigo",
      },
    ],
  });

  assert.equal(resultado.copias.length, 2);
  assert.deepEqual(
    resultado.copias.map((copia) => copia.texto),
    ["texto antigo", "texto revisado"],
  );
  assert.ok(resultado.copias.every((copia) => copia.pacienteId === "pac-1"));
  assert.ok(resultado.copias.every((copia) => copia.documentoId === "doc-1"));
});
