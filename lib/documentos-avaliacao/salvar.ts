export type VersaoDoDocumento = {
  texto: string;
  titulo: string | null;
  valorProtocolo: number | null;
  podeConsultar: boolean;
  podeAlterar: boolean;
  podeApagar: boolean;
};

export type DocumentoSalvo = {
  salvo: boolean;
  tituloNaLista: string;
  valorProtocolo: number | null;
  atual: VersaoDoDocumento;
  versaoAnterior: VersaoDoDocumento | null;
  exclusaoAutomaticaMarcada: boolean;
};

export function salvarDocumento(_entrada: {
  textoAnterior: string | null;
  textoNovo: string;
  titulo: string | null;
  valorProtocolo: number | null;
}): DocumentoSalvo {
  throw new Error("comportamento ausente");
}
