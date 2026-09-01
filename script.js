import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const esportes = {
  "futebol-m": "Futebol Masc.",
  "futebol-f": "Futebol Fem.",
  basquete: "Basquete 3x3",
  "volei-m": "Vôlei Masc.",
  "volei-f": "Vôlei Fem.",
};

const nomesFase = {
  "32-avos": "32-Avos",
  "16-avos": "16-Avos",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semifinal",
  final: "Final",
  "mata-mata": "Mata-Mata",
};

const ordemFases = [
  "todos",
  "32-avos",
  "16-avos",
  "oitavas",
  "quartas",
  "semifinal",
  "final",
];

const anos = [1, 2, 3];
const ordemInicial = [
  { ano: 3, esporte: "futebol-m" },
  { ano: 1, esporte: "futebol-m" },
  { ano: 2, esporte: "futebol-m" },
  ...anos.flatMap((ano) =>
    Object.keys(esportes)
      .filter((esporte) => esporte !== "futebol-m")
      .map((esporte) => ({ ano, esporte })),
  ),
];

let anoAtual = 1;
let esporteAtual = "futebol-m";
let primeiraCarga = true;
let filtroFaseAtual = "todos";
let termoBusca = "";
let partidasAtuais = [];

async function buscarPartidas(ano, esporte) {
  const snapshot = await getDocs(
    collection(db, "anos", `${ano}ano`, "esportes", esporte, "partidas"),
  );

  const partidas = [];

  snapshot.forEach((documento) => {
    partidas.push({
      id: documento.id,
      ...documento.data(),
    });
  });

  return partidas.sort(ordenarPartidas);
}

async function buscarRanking(ano) {
  const snapshot = await getDoc(doc(db, "ranking", `${ano}ano`));

  if (!snapshot.exists()) {
    return [];
  }

  const dados = snapshot.data();

  return Object.entries(dados)
    .map(([turma, pontos]) => ({
      turma,
      pontos: Number(pontos) || 0,
    }))
    .sort((a, b) => b.pontos - a.pontos || a.turma.localeCompare(b.turma));
}

function ordenarPartidas(a, b) {
  return (
    Number(a.rodada ?? 999) - Number(b.rodada ?? 999) ||
    Number(a.posicaoChave ?? 999) - Number(b.posicaoChave ?? 999) ||
    String(a.id).localeCompare(String(b.id))
  );
}

function formatarDiaMes(dataString) {
  if (!dataString) return "";

  const partes = dataString.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`;
  }

  return dataString;
}

function textoSeguro(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nomeEsporteAtual() {
  return esportes[esporteAtual] ?? esporteAtual;
}

function nomeFase(partida) {
  return nomesFase[partida.fase] ?? `Rodada ${partida.rodada ?? "-"}`;
}

function obterTurmaBye(partida) {
  if (!partida.bye) return null;
  return partida.turmaA || partida.turmaB || partida.vencedor || null;
}

function ehPartidaReal(partida) {
  return Boolean(partida.turmaA && partida.turmaB);
}

function obterStatus(partida) {
  const bye = obterTurmaBye(partida);

  if (bye) {
    return {
      texto: "Classificado direto",
      classe: "is-bye",
    };
  }

  if (partida.status === "encerrada") {
    return {
      texto: "Finalizada",
      classe: "is-finished",
    };
  }

  if (partida.status === "ao-vivo") {
    return {
      texto: "Ao vivo",
      classe: "is-live",
    };
  }

  return {
    texto: "A jogar",
    classe: "is-pending",
  };
}

function obterAgenda(partida) {
  const data = formatarDiaMes(partida.data);
  const hora = partida.hora ?? "";
  const local = partida.local ?? "";
  const dataHora = [data, hora].filter(Boolean).join(" - ");

  return [dataHora, local].filter(Boolean).join(" • ");
}

function partidaContemTurma(partida, busca) {
  if (!busca) return true;

  return [partida.turmaA, partida.turmaB, partida.vencedor]
    .filter(Boolean)
    .some((turma) => turma.toLowerCase().includes(busca));
}

async function encontrarCategoriaInicial() {
  for (const categoria of ordemInicial) {
    const partidas = await buscarPartidas(categoria.ano, categoria.esporte);

    if (partidas.length > 0) {
      return categoria;
    }
  }

  return { ano: 1, esporte: "futebol-m" };
}

function atualizarBotoesAtivos() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.year) === anoAtual);
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.sport === esporteAtual);
  });
}

function atualizarMetricas(partidas, ranking, proximosJogos) {
  const partidasReais = partidas.filter(ehPartidaReal);
  const finalizadas = partidasReais.filter(
    (partida) => partida.status === "encerrada",
  );
  const lider = ranking.find((posicao) => posicao.pontos > 0);

  document.getElementById("metric-categoria").textContent =
    `${nomeEsporteAtual()} • ${anoAtual}º Ano`;
  document.getElementById("metric-partidas").textContent = partidasReais.length;
  document.getElementById("metric-finalizadas").textContent =
    finalizadas.length;
  document.getElementById("metric-proximas").textContent = proximosJogos.length;
  document.getElementById("metric-lider").textContent = lider?.turma ?? "-";
}

async function renderizarInterface() {
  const containerJogos = document.getElementById("container-jogos");
  const tabelaRanking = document.getElementById("tabela-ranking");
  const proximosContainer = document.getElementById("proximos-jogos");
  const bracketSection = document.getElementById("bracket-section");
  const tituloJogos = document.getElementById("titulo-jogos");
  const notaJogos = document.getElementById("nota-jogos");
  const notaProximos = document.getElementById("nota-proximos");
  const notaRanking = document.getElementById("nota-ranking");

  try {
    if (primeiraCarga) {
      const categoria = await encontrarCategoriaInicial();
      anoAtual = categoria.ano;
      esporteAtual = categoria.esporte;
      primeiraCarga = false;
      atualizarBotoesAtivos();
    }

    const partidas = await buscarPartidas(anoAtual, esporteAtual);
    const ranking = await buscarRanking(anoAtual);
    const proximosJogos = obterProximosJogos(partidas);

    partidasAtuais = partidas;
    atualizarMetricas(partidas, ranking, proximosJogos);
    renderizarPartidaDestaque(proximosJogos[0]);
    renderizarFiltrosFase(partidas);
    renderizarChaveamento(partidas);
    renderizarProximosJogos(proximosJogos, proximosContainer);
    renderizarRanking(ranking, tabelaRanking, notaRanking);

    if (partidas.length === 0) {
      tituloJogos.innerText = `Partidas - ${nomeEsporteAtual()}`;
      notaJogos.innerText = "Sem jogos nesta categoria";
      notaProximos.innerText = "";
      containerJogos.innerHTML =
        '<div class="empty-state">Nenhuma partida cadastrada para esta categoria.</div>';
      bracketSection.style.display = "none";
      return;
    }

    bracketSection.style.display = "block";
    tituloJogos.innerText = `${nomeEsporteAtual()} - ${anoAtual}º Ano`;
    notaProximos.innerText = proximosJogos.length
      ? `${proximosJogos.length} na agenda`
      : "Sem jogos agendados";

    renderizarPartidas(partidas, containerJogos, notaJogos);
  } catch (erro) {
    console.error(erro);
    tituloJogos.innerText = "Não foi possível carregar os jogos";
    notaJogos.innerText = "";
    containerJogos.innerHTML =
      '<div class="empty-state">Confira sua conexão e tente novamente.</div>';
    proximosContainer.innerHTML = "";
    tabelaRanking.innerHTML = "";
    bracketSection.style.display = "none";
  }
}

function obterProximosJogos(partidas) {
  return partidas
    .filter(
      (partida) =>
        ehPartidaReal(partida) &&
        partida.data &&
        partida.hora &&
        partida.status !== "encerrada",
    )
    .sort((a, b) => {
      const dataA = new Date(`${a.data}T${a.hora}`);
      const dataB = new Date(`${b.data}T${b.hora}`);

      return dataA - dataB;
    })
    .slice(0, 5);
}

function renderizarPartidaDestaque(partida) {
  const destaque = document.getElementById("partida-destaque");

  if (!partida) {
    destaque.innerHTML = `
      <div class="featured-copy">
        <span class="featured-label">Próxima partida</span>
        <strong>Nenhum jogo agendado</strong>
      </div>
    `;
    return;
  }

  destaque.innerHTML = `
    <div class="featured-copy">
      <span class="featured-label">Próxima partida</span>
      <strong>${textoSeguro(partida.turmaA)} x ${textoSeguro(partida.turmaB)}</strong>
      <span>${textoSeguro(obterAgenda(partida))}</span>
    </div>
    <button class="featured-action" data-match-id="${textoSeguro(partida.id)}">Ver detalhes</button>
  `;
}

function renderizarFiltrosFase(partidas) {
  const container = document.getElementById("filtros-fase");
  const fasesPresentes = new Set(
    partidas
      .map((partida) => partida.fase)
      .filter(Boolean),
  );
  const fases = ordemFases.filter(
    (fase) => fase === "todos" || fasesPresentes.has(fase),
  );

  if (filtroFaseAtual !== "todos" && !fasesPresentes.has(filtroFaseAtual)) {
    filtroFaseAtual = "todos";
  }

  container.innerHTML = fases
    .map((fase) => {
      const label = fase === "todos" ? "Todos" : nomesFase[fase] ?? fase;
      const ativo = fase === filtroFaseAtual ? "active" : "";

      return `<button class="phase-btn ${ativo}" data-phase="${textoSeguro(fase)}">${textoSeguro(label)}</button>`;
    })
    .join("");
}

function aplicarFiltrosPartidas(partidas) {
  const busca = termoBusca.trim().toLowerCase();

  return partidas.filter((partida) => {
    const visivel = ehPartidaReal(partida) || obterTurmaBye(partida);
    const faseOk = filtroFaseAtual === "todos" || partida.fase === filtroFaseAtual;
    const buscaOk = partidaContemTurma(partida, busca);

    return visivel && faseOk && buscaOk;
  });
}

function renderizarProximosJogos(proximosJogos, container) {
  container.innerHTML = "";

  if (proximosJogos.length === 0) {
    container.innerHTML =
      '<div class="empty-state compact">Nenhum próximo jogo cadastrado.</div>';
    return;
  }

  proximosJogos.forEach((jogo) => {
    container.innerHTML += criarCardPartida(jogo, { compacto: true });
  });
}

function renderizarRanking(ranking, tabelaRanking, notaRanking) {
  tabelaRanking.innerHTML = "";

  const todosZerados = ranking.length > 0 && ranking.every((item) => item.pontos === 0);

  notaRanking.innerText = todosZerados
    ? "Pontuação começa após as finais"
    : `${ranking.length} turmas`;

  if (ranking.length === 0) {
    tabelaRanking.innerHTML =
      '<tr><td colspan="3" class="empty-table">Ranking ainda não cadastrado.</td></tr>';
    return;
  }

  const rankingOrdenado = todosZerados
    ? [...ranking].sort((a, b) => a.turma.localeCompare(b.turma))
    : ranking;

  rankingOrdenado.forEach((posicao, index) => {
    const topClass = !todosZerados && index < 3 ? "top-three" : "";

    tabelaRanking.innerHTML += `
      <tr class="${topClass}">
        <td class="pos-col">${index + 1}º</td>
        <td>${textoSeguro(posicao.turma)}</td>
        <td class="pts-col">${textoSeguro(posicao.pontos)} pts</td>
      </tr>
    `;
  });
}

function renderizarPartidas(partidas, containerJogos, notaJogos) {
  containerJogos.innerHTML = "";

  const partidasVisiveis = aplicarFiltrosPartidas(partidas);
  const totalJogos = partidas.filter(ehPartidaReal).length;
  const descricaoBusca = termoBusca ? ` • busca: ${termoBusca}` : "";
  const descricaoFase =
    filtroFaseAtual === "todos"
      ? ""
      : ` • ${nomesFase[filtroFaseAtual] ?? filtroFaseAtual}`;

  notaJogos.innerText =
    `${partidasVisiveis.length} exibidas de ${totalJogos} jogos definidos${descricaoFase}${descricaoBusca}`;

  if (partidasVisiveis.length === 0) {
    containerJogos.innerHTML =
      '<div class="empty-state">Nenhuma partida encontrada com os filtros atuais.</div>';
    return;
  }

  partidasVisiveis.forEach((partida) => {
    containerJogos.innerHTML += criarCardPartida(partida);
  });
}

function criarCardPartida(partida, opcoes = {}) {
  const bye = obterTurmaBye(partida);
  const status = obterStatus(partida);
  const agenda = obterAgenda(partida);
  const dataId = `data-match-id="${textoSeguro(partida.id)}"`;

  if (bye) {
    return `
      <article class="match-card bye-card" ${dataId}>
        <span class="team highlight">${textoSeguro(bye)}</span>
        <div class="match-info">
          <span class="match-phase">${textoSeguro(nomeFase(partida))}</span>
          <span class="score">Avançou</span>
          <span class="status-badge ${status.classe}">${status.texto}</span>
        </div>
        <span class="team muted">BYE</span>
      </article>
    `;
  }

  return `
    <article class="match-card ${opcoes.compacto ? "is-compact" : ""}" ${dataId}>
      <span class="team">${textoSeguro(partida.turmaA ?? "A definir")}</span>

      <div class="match-info">
        <span class="match-phase">${textoSeguro(nomeFase(partida))}</span>
        <span class="score">
          ${textoSeguro(partida.placarA ?? "-")} x ${textoSeguro(partida.placarB ?? "-")}
        </span>
        <span class="status-badge ${status.classe}">${status.texto}</span>
        <span class="agenda-partida">${textoSeguro(agenda)}</span>
      </div>

      <span class="team">${textoSeguro(partida.turmaB ?? "A definir")}</span>
    </article>
  `;
}

function renderizarChaveamento(partidas) {
  const wrapper = document.getElementById("bracket-wrapper");

  wrapper.innerHTML = "";

  const rodadas = {};

  partidas
    .filter((partida) => Number.isFinite(Number(partida.rodada)))
    .forEach((partida) => {
      const rodada = Number(partida.rodada);

      if (!rodadas[rodada]) {
        rodadas[rodada] = [];
      }

      rodadas[rodada].push(partida);
    });

  const rounds = Object.keys(rodadas)
    .map(Number)
    .sort((a, b) => a - b);

  if (rounds.length === 0) {
    wrapper.innerHTML =
      '<div class="empty-state compact">Chaveamento ainda não cadastrado.</div>';
    return;
  }

  const mobile = window.innerWidth <= 768;
  const cardWidth = mobile ? 124 : 146;
  const cardHeight = mobile ? 44 : 48;
  const colWidth = mobile ? 136 : 168;
  const innerPairGap = mobile ? 2 : 2;
  const groupGap = mobile ? 12 : 16;
  const titleOffset = 28;
  const leafStep = cardHeight + innerPairGap;
  const leafCenter = (index) =>
    titleOffset +
    index * leafStep +
    Math.floor(index / 2) * groupGap +
    cardHeight / 2;
  const calcularY = (rodada, index) => {
    const grupo = Math.pow(2, rodada - 1);
    const primeiro = index * grupo;
    const ultimo = primeiro + grupo - 1;
    const centro = (leafCenter(primeiro) + leafCenter(ultimo)) / 2;

    return centro - cardHeight / 2;
  };

  const bracket = document.createElement("div");
  bracket.className = "bracket-canvas";

  let maxY = 0;

  rounds.forEach((rodada) => {
    const titulo = document.createElement("div");
    const quantidade = rodadas[rodada].length;
    const nomesPorQuantidade = {
      16: "16-Avos",
      8: "Oitavas",
      4: "Quartas",
      2: "Semifinal",
      1: "Final",
    };

    titulo.className = "round-title";
    titulo.textContent = nomesPorQuantidade[quantidade] ?? `Rodada ${rodada}`;
    titulo.style.left = `${(rodada - 1) * colWidth}px`;
    bracket.appendChild(titulo);

    const partidasRodada = rodadas[rodada].sort(ordenarPartidas);

    partidasRodada.forEach((partida, index) => {
      const x = (rodada - 1) * colWidth;
      const y = calcularY(rodada, index);

      maxY = Math.max(maxY, y);

      const match = document.createElement("div");

      match.className = `bracket-match absolute-match ${partida.bye ? "is-bye-match" : ""}`;
      match.style.left = `${x}px`;
      match.style.top = `${y}px`;
      match.innerHTML = criarConteudoChaveamento(partida);

      bracket.appendChild(match);
    });
  });

  desenharLinhasChaveamento({
    bracket,
    rounds,
    rodadas,
    cardWidth,
    cardHeight,
    colWidth,
    calcularY,
    mobile,
    maxY,
  });

  bracket.style.width = rounds.length * colWidth + cardWidth + "px";
  bracket.style.height = maxY + cardHeight + 100 + "px";

  wrapper.appendChild(bracket);
}

function criarConteudoChaveamento(partida) {
  const bye = obterTurmaBye(partida);

  if (bye) {
    return `
      <div class="bracket-team winner">
        <span class="b-name">${textoSeguro(bye)}</span>
        <span class="b-score">BYE</span>
      </div>
      <div class="bracket-team muted">
        <span class="b-name">Classificado direto</span>
        <span class="b-score"></span>
      </div>
    `;
  }

  const vencedorA = partida.vencedor === partida.turmaA;
  const vencedorB = partida.vencedor === partida.turmaB;

  return `
    <div class="bracket-team ${vencedorA ? "winner" : ""}">
      <span class="b-name">${textoSeguro(partida.turmaA ?? "A definir")}</span>
      <span class="b-score">${textoSeguro(partida.placarA ?? "-")}</span>
    </div>

    <div class="bracket-team ${vencedorB ? "winner" : ""}">
      <span class="b-name">${textoSeguro(partida.turmaB ?? "A definir")}</span>
      <span class="b-score">${textoSeguro(partida.placarB ?? "-")}</span>
    </div>
  `;
}

function desenharLinhasChaveamento(config) {
  const {
    bracket,
    rounds,
    rodadas,
    cardWidth,
    cardHeight,
    colWidth,
    calcularY,
    mobile,
    maxY,
  } = config;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.classList.add("bracket-lines");
  svg.setAttribute("width", rounds.length * colWidth + cardWidth);
  svg.setAttribute("height", maxY + cardHeight + 100);

  rounds.forEach((rodada) => {
    const atual = rodadas[rodada];

    if (!rodadas[rodada + 1]) return;

    atual.sort(ordenarPartidas).forEach((partida, index) => {
      const parentIndex = Math.floor(index / 2);
      const x1 = (rodada - 1) * colWidth + cardWidth;
      const y1 = calcularY(rodada, index) + cardHeight / 2;
      const x2 = rodada * colWidth + 2;
      const y2 = calcularY(rodada + 1, parentIndex) + cardHeight / 2;
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const middleX = x1 + (x2 - x1) / 2;

      path.setAttribute(
        "d",
        `M ${x1} ${y1} H ${middleX} V ${y2} H ${x2}`,
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#94a3b8");
      path.setAttribute("stroke-width", mobile ? "1.5" : "2");

      svg.appendChild(path);
    });
  });

  bracket.appendChild(svg);
}

function abrirDetalhesPartida(idPartida) {
  const partida = partidasAtuais.find((item) => item.id === idPartida);

  if (!partida) return;

  const modal = document.getElementById("modal-partida");
  const status = obterStatus(partida);
  const bye = obterTurmaBye(partida);
  const titulo = bye
    ? `${bye} avançou direto`
    : `${partida.turmaA ?? "A definir"} x ${partida.turmaB ?? "A definir"}`;
  const placar = bye
    ? "BYE"
    : `${partida.placarA ?? "-"} x ${partida.placarB ?? "-"}`;
  const penalti =
    partida.penaltisA != null && partida.penaltisB != null
      ? `${partida.penaltisA} x ${partida.penaltisB} nos pênaltis`
      : null;
  const agenda = obterAgenda(partida) || "Sem data definida";
  const vencedor = partida.vencedor || bye || "A definir";

  document.getElementById("modal-fase").textContent =
    `${nomeFase(partida)} • ${nomeEsporteAtual()} • ${anoAtual}º Ano`;
  document.getElementById("modal-titulo").textContent = titulo;
  document.getElementById("modal-placar").textContent = placar;
  document.getElementById("modal-detalhes").innerHTML = `
    <div><span>Status</span><strong class="status-badge ${status.classe}">${status.texto}</strong></div>
    <div><span>Agenda</span><strong>${textoSeguro(agenda)}</strong></div>
    <div><span>Vencedor</span><strong>${textoSeguro(vencedor)}</strong></div>
    ${penalti ? `<div><span>Decisão</span><strong>${textoSeguro(penalti)}</strong></div>` : ""}
  `;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function fecharDetalhesPartida() {
  const modal = document.getElementById("modal-partida");

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

function ativarArrasteHorizontal(elemento) {
  let arrastando = false;
  let inicioX = 0;
  let inicioY = 0;
  let scrollInicial = 0;
  let toqueHorizontal = false;

  elemento.addEventListener("pointerdown", (evento) => {
    if (elemento.scrollWidth <= elemento.clientWidth) return;

    arrastando = true;
    inicioX = evento.clientX;
    inicioY = evento.clientY;
    scrollInicial = elemento.scrollLeft;
    elemento.classList.add("is-dragging");
    elemento.setPointerCapture(evento.pointerId);
  });

  elemento.addEventListener("pointermove", (evento) => {
    if (!arrastando) return;

    const distanciaX = evento.clientX - inicioX;
    const distanciaY = evento.clientY - inicioY;

    if (Math.abs(distanciaX) > Math.abs(distanciaY)) {
      evento.preventDefault();
      elemento.scrollLeft = scrollInicial - distanciaX;
    }
  });

  function encerrarArraste(evento) {
    if (!arrastando) return;

    arrastando = false;
    elemento.classList.remove("is-dragging");

    if (elemento.hasPointerCapture(evento.pointerId)) {
      elemento.releasePointerCapture(evento.pointerId);
    }
  }

  elemento.addEventListener("pointerup", encerrarArraste);
  elemento.addEventListener("pointercancel", encerrarArraste);
  elemento.addEventListener("pointerleave", encerrarArraste);

  elemento.addEventListener(
    "touchstart",
    (evento) => {
      if (elemento.scrollWidth <= elemento.clientWidth) return;

      const toque = evento.touches[0];
      inicioX = toque.clientX;
      inicioY = toque.clientY;
      scrollInicial = elemento.scrollLeft;
      toqueHorizontal = false;
    },
    { passive: true },
  );

  elemento.addEventListener(
    "touchmove",
    (evento) => {
      if (elemento.scrollWidth <= elemento.clientWidth) return;

      const toque = evento.touches[0];
      const distanciaX = toque.clientX - inicioX;
      const distanciaY = toque.clientY - inicioY;

      if (!toqueHorizontal) {
        toqueHorizontal = Math.abs(distanciaX) > Math.abs(distanciaY);
      }

      if (toqueHorizontal) {
        evento.preventDefault();
        elemento.scrollLeft = scrollInicial - distanciaX;
      }
    },
    { passive: false },
  );

  elemento.addEventListener("touchend", () => {
    toqueHorizontal = false;
  });
}

const themeToggleBtn = document.getElementById("theme-toggle");
themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");

  if (currentTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "light");
    themeToggleBtn.innerText = "☀️";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggleBtn.innerText = "🌙";
  }
});

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    anoAtual = Number(btn.getAttribute("data-year"));
    primeiraCarga = false;
    filtroFaseAtual = "todos";
    termoBusca = "";
    document.getElementById("busca-turma").value = "";
    atualizarBotoesAtivos();
    renderizarInterface();
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    esporteAtual = btn.getAttribute("data-sport");
    primeiraCarga = false;
    filtroFaseAtual = "todos";
    termoBusca = "";
    document.getElementById("busca-turma").value = "";
    atualizarBotoesAtivos();
    renderizarInterface();
  });
});

document.getElementById("busca-turma").addEventListener("input", (evento) => {
  termoBusca = evento.target.value;
  renderizarPartidas(
    partidasAtuais,
    document.getElementById("container-jogos"),
    document.getElementById("nota-jogos"),
  );
});

document.getElementById("filtros-fase").addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-phase]");

  if (!botao) return;

  filtroFaseAtual = botao.dataset.phase;
  renderizarFiltrosFase(partidasAtuais);
  renderizarPartidas(
    partidasAtuais,
    document.getElementById("container-jogos"),
    document.getElementById("nota-jogos"),
  );
});

document.addEventListener("click", (evento) => {
  const acionador = evento.target.closest("[data-match-id]");

  if (!acionador) return;

  abrirDetalhesPartida(acionador.dataset.matchId);
});

document.getElementById("fechar-modal").addEventListener("click", fecharDetalhesPartida);
document.getElementById("modal-partida").addEventListener("click", (evento) => {
  if (evento.target.id === "modal-partida") {
    fecharDetalhesPartida();
  }
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") {
    fecharDetalhesPartida();
  }
});

ativarArrasteHorizontal(document.getElementById("bracket-wrapper"));

renderizarInterface();
