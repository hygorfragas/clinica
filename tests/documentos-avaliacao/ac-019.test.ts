import assert from "node:assert/strict";
import { test } from "node:test";

import { salvarDocumento } from "../../lib/documentos-avaliacao/salvar.ts";

// SPECSFY: US-001 NFR-002 AC-019
test("AC-019 salvar uma alteração não marca exclusão automática", () => {
  const resultado = salvarDocumento({
    textoAnterior: "texto antigo",
    textoNovo: "texto novo",
    titulo: "Avaliação",
    valorProtocolo: 700,
  });

  assert.equal(resultado.salvo, true);
  assert.equal(resultado.exclusaoAutomaticaMarcada, false);
});
