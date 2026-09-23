import assert from "node:assert/strict";
import { test } from "node:test";

import { baixarArquivo } from "../../lib/documentos-avaliacao/arquivo.ts";

// SPECSFY: US-002 FR-003 AC-008
test("AC-008 baixar sem valor gera arquivo só com o texto", () => {
  const resultado = baixarArquivo({
    documentoId: "doc-1",
    pacienteId: "pac-1",
    texto: "somente o relato",
    valorProtocolo: null,
    audio: null,
    anexo: null,
    tabela: null,
    listaDeVerificacao: null,
    subpagina: null,
    precosPorProcedimento: [],
    copiasAnteriores: [],
  });

  assert.equal(resultado.arquivo.texto, "somente o relato");
  assert.equal(resultado.arquivo.valorProtocolo, null);
});
