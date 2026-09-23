import assert from "node:assert/strict";
import { test } from "node:test";

import { baixarArquivo } from "../../lib/documentos-avaliacao/arquivo.ts";

// SPECSFY: US-002 FR-003 NFR-001 AC-007
test("AC-007 o arquivo leva texto e valor e guarda a cópia sem o restante", () => {
  const resultado = baixarArquivo({
    documentoId: "doc-1",
    pacienteId: "pac-1",
    texto: "queixas e conduta",
    valorProtocolo: 1200,
    audio: "gravacao.webm",
    anexo: "exame.pdf",
    tabela: "sessoes",
    listaDeVerificacao: "cuidados",
    subpagina: "detalhe",
    precosPorProcedimento: [300, 400],
    copiasAnteriores: [],
  });

  assert.equal(resultado.arquivo.texto, "queixas e conduta");
  assert.equal(resultado.arquivo.valorProtocolo, 1200);
  assert.equal(resultado.arquivo.audio, false);
  assert.equal(resultado.arquivo.anexo, false);
  assert.equal(resultado.arquivo.tabela, false);
  assert.equal(resultado.arquivo.listaDeVerificacao, false);
  assert.equal(resultado.arquivo.subpagina, false);
  assert.equal(resultado.copias.length, 1);
  assert.equal(resultado.copias[0]?.documentoId, "doc-1");
  assert.equal(resultado.copias[0]?.pacienteId, "pac-1");
});
