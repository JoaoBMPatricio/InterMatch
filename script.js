import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

  partidas.sort((a, b) => {
    if (a.rodada !== b.rodada) {
      return a.rodada - b.rodada;
    }

    return a.posicaoChave - b.posicaoChave;
  });

  return partidas;
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
      pontos,
    }))
    .sort((a, b) => b.pontos - a.pontos);
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

let anoAtual = 1;
let esporteAtual = "futebol-m";

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
  return document.querySelector(`[data-sport="${esporteAtual}"]`).innerText;
}

async function renderizarInterface() {
  const containerJogos = document.getElementById("container-jogos");
  const tabelaRanking = document.getElementById("tabela-ranking");
  const proximosContainer = document.getElementById("proximos-jogos");
  const bracketSection = document.getElementById("bracket-section");
  const tituloJogos = document.getElementById("titulo-jogos");

  try {
    const partidas = await buscarPartidas(anoAtual, esporteAtual);
    const ranking = await buscarRanking(anoAtual);

    gerarChaveamento(partidas);

    const proximosJogos = partidas
      .filter(
        (partida) =>
          partida.data && partida.hora && partida.status !== "encerrada",
      )
      .sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.hora}`);
        const dataB = new Date(`${b.data}T${b.hora}`);

        return dataA - dataB;
      })
      .slice(0, 5);

    proximosContainer.innerHTML = "";

    if (proximosJogos.length === 0) {
      proximosContainer.innerHTML =
        '<div class="no-games">Nenhum próximo jogo cadastrado.</div>';
    }

    proximosJogos.forEach((jogo) => {
      proximosContainer.innerHTML += `
        <div class="match-card">
          <span class="team">${textoSeguro(jogo.turmaA ?? "A definir")}</span>

          <div class="match-info">
            <span class="score">VS</span>
            <span class="status">
              ${textoSeguro(formatarDiaMes(jogo.data))} - ${textoSeguro(jogo.hora)}
            </span>
            <span class="status">${textoSeguro(jogo.local ?? "")}</span>
          </div>

          <span class="team">${textoSeguro(jogo.turmaB ?? "A definir")}</span>
        </div>
      `;
    });

    tabelaRanking.innerHTML = "";

    ranking.forEach((posicao, index) => {
      const topClass = index < 3 ? "top-three" : "";

      tabelaRanking.innerHTML += `
        <tr class="${topClass}">
          <td class="pos-col">${index + 1}º</td>
          <td>${textoSeguro(posicao.turma)}</td>
          <td class="pts-col">${textoSeguro(posicao.pontos)} pts</td>
        </tr>
      `;
    });

    if (ranking.length === 0) {
      tabelaRanking.innerHTML =
        '<tr><td colspan="3" class="empty-table">Ranking ainda não cadastrado.</td></tr>';
    }

    if (partidas.length === 0) {
      tituloJogos.innerText = `Partidas - ${nomeEsporteAtual()}`;
      containerJogos.innerHTML =
        '<div class="no-games">Nenhuma partida programada ou cadastrada para esta categoria.</div>';
      bracketSection.style.display = "none";
      return;
    }

    bracketSection.style.display = "block";
    tituloJogos.innerText = `${nomeEsporteAtual()} - ${anoAtual}º Ano`;
    containerJogos.innerHTML = "";

    const partidasFiltradas = partidas.filter((partida) => {
      const turmaA = partida.turmaA ?? "A definir";
      const turmaB = partida.turmaB ?? "A definir";

      return !(turmaA === "A definir" && turmaB === "A definir");
    });

    if (partidasFiltradas.length === 0) {
      containerJogos.innerHTML =
        '<div class="no-games">As partidas desta categoria ainda não têm equipes definidas.</div>';
      return;
    }

    partidasFiltradas.forEach((partida) => {
      const data = formatarDiaMes(partida.data);
      const separadorDataHora = partida.data || partida.hora ? " - " : "";

      containerJogos.innerHTML += `
        <div class="match-card">
          <span class="team">${textoSeguro(partida.turmaA ?? "A definir")}</span>

          <div class="match-info">
            <span class="score">
              ${textoSeguro(partida.placarA ?? "-")} x ${textoSeguro(partida.placarB ?? "-")}
            </span>

            <span class="status">${textoSeguro(partida.status ?? "")}</span>

            <div class="agenda-partida">
              <span>${textoSeguro(data)}</span>
              <span>${separadorDataHora}</span>
              <span>${textoSeguro(partida.hora ?? "")}</span>
              <span>${textoSeguro(partida.local ?? "")}</span>
            </div>
          </div>

          <span class="team">${textoSeguro(partida.turmaB ?? "A definir")}</span>
        </div>
      `;
    });
  } catch (erro) {
    console.error(erro);
    tituloJogos.innerText = "Não foi possível carregar os jogos";
    containerJogos.innerHTML =
      '<div class="no-games">Confira sua conexão e tente novamente.</div>';
    proximosContainer.innerHTML = "";
    tabelaRanking.innerHTML = "";
    bracketSection.style.display = "none";
  }
}

function gerarChaveamento(partidas) {
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
      '<div class="no-games">Chaveamento ainda não cadastrado para esta categoria.</div>';
    return;
  }

  const mobile = window.innerWidth <= 768;
  const cardWidth = mobile ? 130 : 170;
  const cardHeight = mobile ? 56 : 64;
  const colWidth = mobile ? 145 : 220;
  const baseVertical = mobile ? 50 : 130;
  const titleOffset = 28;

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

    const partidasRodada = rodadas[rodada].sort(
      (a, b) => a.posicaoChave - b.posicaoChave,
    );

    partidasRodada.forEach((partida, index) => {
      const x = (rodada - 1) * colWidth;
      const y =
        titleOffset +
        (Math.pow(2, rodada - 1) - 1) * (baseVertical / 2) +
        index * baseVertical * Math.pow(2, rodada - 1);

      maxY = Math.max(maxY, y);

      const vencedorA = partida.vencedor === partida.turmaA;
      const vencedorB = partida.vencedor === partida.turmaB;

      const match = document.createElement("div");

      match.className = "bracket-match absolute-match";
      match.style.left = `${x}px`;
      match.style.top = `${y}px`;

      match.innerHTML = `
        <div class="bracket-team ${vencedorA ? "winner" : ""}">
          <span class="b-name">${textoSeguro(partida.turmaA ?? "A definir")}</span>
          <span class="b-score">${textoSeguro(partida.placarA ?? "-")}</span>
        </div>

        <div class="bracket-team ${vencedorB ? "winner" : ""}">
          <span class="b-name">${textoSeguro(partida.turmaB ?? "A definir")}</span>
          <span class="b-score">${textoSeguro(partida.placarB ?? "-")}</span>
        </div>
      `;

      bracket.appendChild(match);
    });
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.classList.add("bracket-lines");
  svg.setAttribute("width", rounds.length * colWidth + cardWidth);
  svg.setAttribute("height", maxY + cardHeight + 100);

  rounds.forEach((rodada) => {
    const atual = rodadas[rodada];

    if (!rodadas[rodada + 1]) return;

    atual
      .sort((a, b) => a.posicaoChave - b.posicaoChave)
      .forEach((partida, index) => {
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
          `
          M ${x1} ${y1}
          H ${middleX}
          V ${y2}
          H ${x2}
        `,
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#64748b");
        path.setAttribute("stroke-width", mobile ? "1.5" : "2");

        svg.appendChild(path);
      });
  });

  bracket.appendChild(svg);

  bracket.style.width = rounds.length * colWidth + cardWidth + "px";
  bracket.style.height = maxY + cardHeight + 100 + "px";

  wrapper.appendChild(bracket);
}

const botoesAnos = document.querySelectorAll(".nav-btn");
botoesAnos.forEach((btn) => {
  btn.addEventListener("click", () => {
    botoesAnos.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    anoAtual = Number(btn.getAttribute("data-year"));
    renderizarInterface();
  });
});

const botoesEsportes = document.querySelectorAll(".filter-btn");
botoesEsportes.forEach((btn) => {
  btn.addEventListener("click", () => {
    botoesEsportes.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    esporteAtual = btn.getAttribute("data-sport");
    renderizarInterface();
  });
});

renderizarInterface();
