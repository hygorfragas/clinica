import assert from "node:assert/strict";
import { test } from "node:test";

import { apagarDocumento } from "../../lib/documentos-avaliacao/separacao.ts";

// SPECSFY: US-002 FR-005 NFR-002 AC-015
test("AC-015 apagar o documento remove as duas cópias", () => {
  const resultado = apagarDocumento({
    documentoId: "doc-1",
    copias: ["copia-1", "copia-2"],
  });

  assert.equal(resultado.documentoVisivel, false);
  assert.deepEqual(resultado.copiasRestantes, []);
});
