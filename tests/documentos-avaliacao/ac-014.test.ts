import assert from "node:assert/strict";
import { test } from "node:test";

import { contratoGuardaCopia } from "../../lib/documentos-avaliacao/separacao.ts";

// SPECSFY: US-002 FR-005 AC-014
test("AC-014 o contrato não guarda cópia e o documento continua na seção", () => {
  const contrato = contratoGuardaCopia({ documentoId: "doc-1" });

  assert.equal(contrato.guardaCopia, false);
  assert.equal(contrato.documentoPermaneceNaSecao, true);
});
