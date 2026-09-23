import assert from "node:assert/strict";
import { test } from "node:test";

import { lugarDasAcoes } from "../../lib/documentos-avaliacao/acoes.ts";

// SPECSFY: US-001 FR-004 AC-011
test("AC-011 no computador as ações ficam no painel lateral sem cobrir o texto", () => {
  const lugar = lugarDasAcoes({ viewport: "computador" });

  assert.equal(lugar.lugar, "painel-lateral");
  assert.equal(lugar.cobreTexto, false);
});
