import assert from "node:assert/strict";
import { test } from "node:test";

import { imprimirPagina } from "../../lib/documentos-avaliacao/acoes.ts";

// SPECSFY: US-001 FR-004 AC-010
test("AC-010 a impressão mostra a página como ela está vendo", () => {
  const impressao = imprimirPagina({
    texto: "relato",
    tabela: "sessões",
    audio: "gravacao.webm",
  });

  assert.equal(impressao.texto, "relato");
  assert.equal(impressao.tabela, "sessões");
  assert.equal(impressao.audio, "gravacao.webm");
});
