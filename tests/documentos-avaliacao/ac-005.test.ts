import assert from "node:assert/strict";
import { test } from "node:test";

import { salvarDocumento } from "../../lib/documentos-avaliacao/salvar.ts";

// SPECSFY: US-001 FR-002 AC-005
test("AC-005 salvar sem título deixa o documento salvo e a lista com Sem título", () => {
  const resultado = salvarDocumento({
    textoAnterior: null,
    textoNovo: "anotações da avaliação",
    titulo: null,
    valorProtocolo: null,
  });

  assert.equal(resultado.salvo, true);
  assert.equal(resultado.tituloNaLista, "Sem título");
});
