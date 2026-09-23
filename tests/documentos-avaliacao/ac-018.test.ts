import assert from "node:assert/strict";
import { test } from "node:test";

import { consultarAposPrazo } from "../../lib/documentos-avaliacao/separacao.ts";

// SPECSFY: US-002 NFR-002 AC-018
test("AC-018 o tempo sozinho não apaga o documento nem a cópia", () => {
  const consulta = consultarAposPrazo({
    diasDecorridos: 400,
    profissionalApagou: false,
  });

  assert.equal(consulta.documentoDisponivel, true);
  assert.equal(consulta.copiaDisponivel, true);
});
