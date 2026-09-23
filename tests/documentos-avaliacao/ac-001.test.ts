import assert from "node:assert/strict";
import { test } from "node:test";

import { abrirSecaoDocumentos } from "../../lib/documentos-avaliacao/acesso.ts";

// SPECSFY: US-001 FR-001 NFR-001 AC-001
test("AC-001 a profissional responsável sem documentos vê a página em branco", () => {
  const resultado = abrirSecaoDocumentos({
    profissionalResponsavel: true,
    quantidadeDeDocumentos: 0,
  });

  assert.equal(resultado.tela, "pagina-em-branco");
  assert.equal(resultado.podeEscrever, true);
});
