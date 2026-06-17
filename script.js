import { db} from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// BANCO DE DADOS
async function buscarPartidas(ano, esporte) {

  const snapshot = await getDocs(
    collection(db, "partidas")
  );

  const partidas = [];

  snapshot.forEach((doc) => {

    const dados = doc.data();

    if (
      dados.ano === ano &&
      dados.esporte === esporte
    ) {
      partidas.push({
        id: doc.id,
        ...dados
      });
    }

  });

  partidas.sort(
    (a, b) =>
      a.posicaoChave - b.posicaoChave
  );

  return partidas;
}

// RANKING
async function buscarRanking(ano) {

    const snapshot = await getDoc(
        doc(db, "ranking", `${ano}ano`)
    );

    if (!snapshot.exists()) {
        return [];
    }

    const dados = snapshot.data();

    return Object.entries(dados)
        .map(([turma, pontos]) => ({
            turma,
            pontos
        }))
        .sort((a, b) => b.pontos - a.pontos);

}

// Lógica de Alternância de Tema
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleBtn.innerText = '☀️';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggleBtn.innerText = '🌙';
    }
});

// Banco de dados interno estruturado


let anoAtual = 1;
let esporteAtual = "futebol-m";

async function renderizarInterface() {

    const partidas = await buscarPartidas(
        anoAtual,
        esporteAtual
    );

    const ranking = await buscarRanking(
        anoAtual
    );

    const tabelaRanking =
        document.getElementById('tabela-ranking');

    tabelaRanking.innerHTML = '';

    ranking.forEach((posicao, index) => {

        const topClass =
            index < 3
                ? 'top-three'
                : '';

        tabelaRanking.innerHTML += `
            <tr class="${topClass}">
                <td class="pos-col">
                    ${index + 1}º
                </td>

                <td>
                    ${posicao.turma}
                </td>

                <td class="pts-col">
                    ${posicao.pontos} pts
                </td>
            </tr>
        `;

    });

    const containerJogos =
        document.getElementById('container-jogos');

    const bracketSection =
        document.getElementById('bracket-section');

    const tituloJogos =
        document.getElementById('titulo-jogos');

    if (partidas.length === 0) {
        const formatoNome = document.querySelector(`[data-sport="${esporteAtual}"]`).innerText;
        tituloJogos.innerText = `Partidas - ${formatoNome}`;
        containerJogos.innerHTML = '<div class="no-games">Nenhuma partida programada ou cadastrada para esta categoria.</div>';
        bracketSection.style.display = 'none';
        return;
    }

    bracketSection.style.display = 'block';
    tituloJogos.innerText =
    `${esporteAtual} - ${anoAtual}º Ano`;
    containerJogos.innerHTML = '';

    partidas.forEach(partida => {

  containerJogos.innerHTML += `
    <div class="match-card">
      <span class="team">
        ${partida.turmaA ?? "A definir"}
      </span>

      <div class="match-info">

        <span class="score">
          ${partida.placarA ?? "-"}
          x
          ${partida.placarB ?? "-"}
        </span>

        <span class="status">
          ${partida.status}
        </span>

      </div>

      <span class="team">
        ${partida.turmaB ?? "A definir"}
      </span>
    </div>
  `;

});

    bracketSection.style.display = "none";
}

const botoesAnos = document.querySelectorAll('.nav-btn');
botoesAnos.forEach(btn => {
    btn.addEventListener('click', () => {
        botoesAnos.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        anoAtual = Number(
            btn.getAttribute('data-year')
        );
        renderizarInterface();
    });
});

const botoesEsportes = document.querySelectorAll('.filter-btn');
botoesEsportes.forEach(btn => {
    btn.addEventListener('click', () => {
        botoesEsportes.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        esporteAtual = btn.getAttribute('data-sport');
        renderizarInterface();
    });
});

// Inicializa a interface no primeiro carregamento
renderizarInterface();
