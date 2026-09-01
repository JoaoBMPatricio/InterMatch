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
    const proximosJogos = partidas
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

    atualizarMetricas(partidas, ranking, proximosJogos);
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
    notaJogos.innerText = `${partidas.filter(ehPartidaReal).length} jogos definidos`;
    notaProximos.innerText = proximosJogos.length
      ? `${proximosJogos.length} na agenda`
      : "Sem jogos agendados";

    renderizarPartidas(partidas, containerJogos);
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

function renderizarPartidas(partidas, containerJogos) {
  containerJogos.innerHTML = "";

  const partidasVisiveis = partidas.filter(
    (partida) => ehPartidaReal(partida) || obterTurmaBye(partida),
  );

  if (partidasVisiveis.length === 0) {
    containerJogos.innerHTML =
      '<div class="empty-state">As partidas desta categoria ainda não têm equipes definidas.</div>';
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

  if (bye) {
    return `
      <article class="match-card bye-card">
        <span class="team highlight">${textoSeguro(bye)}</span>
        <div class="match-info">
          <span class="score">Avançou</span>
          <span class="status-badge ${status.classe}">${status.texto}</span>
        </div>
        <span class="team muted">BYE</span>
      </article>
    `;
  }

  return `
    <article class="match-card ${opcoes.compacto ? "is-compact" : ""}">
      <span class="team">${textoSeguro(partida.turmaA ?? "A definir")}</span>

      <div class="match-info">
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
  const cardWidth = mobile ? 132 : 172;
  const cardHeight = mobile ? 58 : 66;
  const colWidth = mobile ? 150 : 222;
  const baseVertical = mobile ? 54 : 132;
  const titleOffset = 30;

  const bracket = document.createElement("div");
  bracket.className = "bracket-canvas";

  let maxY = 0;

  rounds.forEach((rodada) => {
    const titulo = document.createElement("div");
    const quantidade = rodadas[rodada].length;
    const nomesFase = {
      16: "16-Avos",
      8: "Oitavas",
      4: "Quartas",
      2: "Semifinal",
      1: "Final",
    };

    titulo.className = "round-title";
    titulo.textContent = nomesFase[quantidade] ?? `Rodada ${rodada}`;
    titulo.style.left = `${(rodada - 1) * colWidth}px`;
    bracket.appendChild(titulo);

    const partidasRodada = rodadas[rodada].sort(ordenarPartidas);

    partidasRodada.forEach((partida, index) => {
      const x = (rodada - 1) * colWidth;
      const y =
        titleOffset +
        (Math.pow(2, rodada - 1) - 1) * (baseVertical / 2) +
        index * baseVertical * Math.pow(2, rodada - 1);

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
    baseVertical,
    titleOffset,
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
    baseVertical,
    titleOffset,
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
      const y1 =
        titleOffset +
        (Math.pow(2, rodada - 1) - 1) * (baseVertical / 2) +
        index * baseVertical * Math.pow(2, rodada - 1) +
        cardHeight / 2;
      const x2 = rodada * colWidth + 2;
      const y2 =
        titleOffset +
        (Math.pow(2, rodada) - 1) * (baseVertical / 2) +
        parentIndex * baseVertical * Math.pow(2, rodada) +
        cardHeight / 2;
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
    atualizarBotoesAtivos();
    renderizarInterface();
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    esporteAtual = btn.getAttribute("data-sport");
    primeiraCarga = false;
    atualizarBotoesAtivos();
    renderizarInterface();
  });
});

ativarArrasteHorizontal(document.getElementById("bracket-wrapper"));

renderizarInterface();
