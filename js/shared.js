export const esportes = {
  "futebol-m": "Futebol Masc.",
  "futebol-f": "Futebol Fem.",
  basquete: "Basquete 3x3",
  "volei-m": "Vôlei Masc.",
  "volei-f": "Vôlei Fem.",
};

export const nomesFase = {
  "32-avos": "32-Avos",
  "16-avos": "16-Avos",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semifinal",
  final: "Final",
  "mata-mata": "Mata-Mata",
};

export const ordemFases = [
  "todos",
  "32-avos",
  "16-avos",
  "oitavas",
  "quartas",
  "semifinal",
  "final",
];

export function ordenarPartidas(a, b) {
  return (
    Number(a.rodada ?? 999) - Number(b.rodada ?? 999) ||
    Number(a.posicaoChave ?? 999) - Number(b.posicaoChave ?? 999) ||
    String(a.id).localeCompare(String(b.id))
  );
}

export function textoSeguro(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function nomeFase(partida) {
  return nomesFase[partida?.fase] ?? `Rodada ${partida?.rodada ?? "-"}`;
}

export function formatarStatus(status) {
  if (status === "encerrada") return "Finalizada";
  if (status === "ao-vivo") return "Ao vivo";
  return "A jogar";
}
