import assert from "node:assert/strict";
import { test } from "node:test";

import { pacienteAbreDocumentoNoSistema } from "../../lib/documentos-avaliacao/acesso.ts";

// SPECSFY: US-002 NFR-001 AC-016
test("AC-016 a paciente não abre o documento e fica com o arquivo recebido", () => {
  const acesso = pacienteAbreDocumentoNoSistema({ arquivoEnviadoPorFora: true });

  assert.equal(acesso.abreNoSistema, false);
  assert.equal(acesso.ficaComArquivoRecebido, true);
});
