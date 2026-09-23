export type ItemDaLista = {
  dataDeCriacao: string;
  titulo: string;
};

export function listarDocumentos(
  _documentos: Array<{
    dataDeCriacao: string;
    titulo: string;
    textoAtual: string;
  }>,
): ItemDaLista[] {
  throw new Error("comportamento ausente");
}
