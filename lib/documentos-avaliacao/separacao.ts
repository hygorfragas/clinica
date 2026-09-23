export function orcamentoPermaneceIndependente(_entrada: {
  precosPorProcedimento: number[];
}): boolean {
  throw new Error("comportamento ausente");
}

export function contratoGuardaCopia(_entrada: {
  documentoId: string;
}): { guardaCopia: boolean; documentoPermaneceNaSecao: boolean } {
  throw new Error("comportamento ausente");
}

export function apagarDocumento(_entrada: {
  documentoId: string;
  copias: string[];
}): { documentoVisivel: boolean; copiasRestantes: string[] } {
  throw new Error("comportamento ausente");
}

export function consultarAposPrazo(_entrada: {
  diasDecorridos: number;
  profissionalApagou: boolean;
}): { documentoDisponivel: boolean; copiaDisponivel: boolean } {
  throw new Error("comportamento ausente");
}
