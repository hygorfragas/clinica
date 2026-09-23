export type AberturaDaSecao = {
  tela: "pagina-em-branco";
  podeEscrever: true;
};

export function abrirSecaoDocumentos(_entrada: {
  profissionalResponsavel: boolean;
  quantidadeDeDocumentos: number;
}): AberturaDaSecao {
  throw new Error("comportamento ausente");
}

export function secaoDocumentosVisivel(_entrada: {
  profissionalResponsavel: boolean;
}): boolean {
  throw new Error("comportamento ausente");
}

export function pacienteAbreDocumentoNoSistema(_entrada: {
  arquivoEnviadoPorFora: boolean;
}): { abreNoSistema: boolean; ficaComArquivoRecebido: boolean } {
  throw new Error("comportamento ausente");
}
