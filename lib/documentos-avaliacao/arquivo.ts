export type ConteudoDoArquivo = {
  texto: string;
  valorProtocolo: number | null;
  audio: false;
  anexo: false;
  tabela: false;
  listaDeVerificacao: false;
  subpagina: false;
  precoPorProcedimento: false;
};

export type CopiaEncaminhada = {
  id: string;
  documentoId: string;
  pacienteId: string;
  texto: string;
};

export type ResultadoDoDownload = {
  arquivo: ConteudoDoArquivo;
  copias: CopiaEncaminhada[];
  audioPermaneceNoDocumento: boolean;
};

export function baixarArquivo(_entrada: {
  documentoId: string;
  pacienteId: string;
  texto: string;
  valorProtocolo: number | null;
  audio: string | null;
  anexo: string | null;
  tabela: string | null;
  listaDeVerificacao: string | null;
  subpagina: string | null;
  precosPorProcedimento: number[];
  copiasAnteriores: CopiaEncaminhada[];
}): ResultadoDoDownload {
  throw new Error("comportamento ausente");
}
