import assert from "node:assert/strict";
import { test } from "node:test";

import { salvarDocumento } from "../../lib/documentos-avaliacao/salvar.ts";

// SPECSFY: US-001 FR-002 AC-006
test("AC-006 salvar sem valor de protocolo guarda o documento", () => {
  const resultado = salvarDocumento({
    textoAnterior: null,
    textoNovo: "o que foi conversado",
    titulo: "Avaliação",
    valorProtocolo: null,
  });

  assert.equal(resultado.salvo, true);
  assert.equal(resultado.valorProtocolo, null);
});
