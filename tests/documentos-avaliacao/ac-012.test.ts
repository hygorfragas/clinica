import assert from "node:assert/strict";
import { test } from "node:test";

import { lugarDasAcoes } from "../../lib/documentos-avaliacao/acoes.ts";

// SPECSFY: US-001 FR-004 AC-012
test("AC-012 no celular as ações ficam no alto da página", () => {
  const lugar = lugarDasAcoes({ viewport: "celular" });

  assert.equal(lugar.lugar, "alto-da-pagina");
  assert.equal(lugar.cobreTexto, false);
});
