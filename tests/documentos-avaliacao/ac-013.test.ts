import assert from "node:assert/strict";
import { test } from "node:test";

import { baixarArquivo } from "../../lib/documentos-avaliacao/arquivo.ts";
import { orcamentoPermaneceIndependente } from "../../lib/documentos-avaliacao/separacao.ts";

// SPECSFY: US-002 FR-005 AC-013
test("AC-013 o arquivo leva o valor do protocolo e não o preço de cada procedimento", () => {
  const resultado = baixarArquivo({
    documentoId: "doc-1",
    pacienteId: "pac-1",
    texto: "protocolo",
    valorProtocolo: 1500,
    audio: null,
    anexo: null,
    tabela: null,
    listaDeVerificacao: null,
    subpagina: null,
    precosPorProcedimento: [400, 600],
    copiasAnteriores: [],
  });

  assert.equal(resultado.arquivo.valorProtocolo, 1500);
  assert.equal(resultado.arquivo.precoPorProcedimento, false);
  assert.equal(orcamentoPermaneceIndependente({ precosPorProcedimento: [400, 600] }), true);
});
