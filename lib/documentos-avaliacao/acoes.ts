export type ImpressaoDaPagina = {
  texto: string;
  tabela: string;
  audio: string;
};

export function imprimirPagina(_entrada: {
  texto: string;
  tabela: string;
  audio: string;
}): ImpressaoDaPagina {
  throw new Error("comportamento ausente");
}

export function lugarDasAcoes(_entrada: {
  viewport: "computador" | "celular";
}): { lugar: "painel-lateral" | "alto-da-pagina"; cobreTexto: boolean } {
  throw new Error("comportamento ausente");
}
