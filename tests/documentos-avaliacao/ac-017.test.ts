import assert from "node:assert/strict";
import { test } from "node:test";

import { baixarArquivo } from "../../lib/documentos-avaliacao/arquivo.ts";

// SPECSFY: US-002 FR-003 NFR-001 AC-017
test("AC-017 o áudio permanece no documento e fora do arquivo", () => {
  const resultado = baixarArquivo({
    documentoId: "doc-1",
    pacienteId: "pac-1",
    texto: "relato",
    valorProtocolo: 500,
    audio: "gravacao.webm",
    anexo: null,
    tabela: null,
    listaDeVerificacao: null,
    subpagina: null,
    precosPorProcedimento: [],
    copiasAnteriores: [],
  });

  assert.equal(resultado.arquivo.audio, false);
  assert.equal(resultado.audioPermaneceNoDocumento, true);
});
