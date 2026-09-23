import assert from "node:assert/strict";
import { test } from "node:test";

import { salvarDocumento } from "../../lib/documentos-avaliacao/salvar.ts";

// SPECSFY: US-001 FR-002 AC-004
test("AC-004 salvar uma alteração guarda a versão anterior consultável", () => {
  const resultado = salvarDocumento({
    textoAnterior: "queixa inicial",
    textoNovo: "queixa revisada",
    titulo: "Avaliação",
    valorProtocolo: 800,
  });

  assert.equal(resultado.versaoAnterior?.texto, "queixa inicial");
  assert.equal(resultado.atual.texto, "queixa revisada");
  assert.equal(resultado.versaoAnterior?.podeConsultar, true);
  assert.equal(resultado.versaoAnterior?.podeAlterar, true);
  assert.equal(resultado.versaoAnterior?.podeApagar, true);
});
