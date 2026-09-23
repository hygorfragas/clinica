import assert from "node:assert/strict";
import { test } from "node:test";

import { secaoDocumentosVisivel } from "../../lib/documentos-avaliacao/acesso.ts";

// SPECSFY: US-001 FR-001 NFR-001 AC-003
test("AC-003 a seção Documentos não aparece para quem não é a responsável", () => {
  const visivel = secaoDocumentosVisivel({ profissionalResponsavel: false });

  assert.equal(visivel, false);
});
