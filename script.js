import { db} from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
const dadosInterclasse = {
    '1': {
        'futebol-m': {
            titulo: 'Futebol Masculino (1º Ano)',
            jogos: [
                { timeA: 'MMD 1', timeB: 'IOT 1', placarA: '2', placarB: '1', status: '● AO VIVO', isLive: true }
            ],
            chave: {
                semi1: { timeA: 'MMD 1', placarA: '2', timeB: 'IOT 1', placarB: '1', winner: 'A' },
                semi2: { timeA: 'MKT 1', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null },
                final: { timeA: 'MMD 1', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null }
            }
        },
        'futebol-f': null,
        'basquete': {
            titulo: 'Basquete 3x3 (1º Ano)',
            jogos: [{ timeA: 'IOT 1', timeB: 'MKT 1', placarA: '11', placarB: '15', status: 'Finalizado', isLive: false }],
            chave: {
                semi1: { timeA: 'IOT 1', placarA: '11', timeB: 'MKT 1', placarB: '15', winner: 'B' },
                semi2: { timeA: 'MMD 1', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null },
                final: { timeA: 'MKT 1', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null }
            }
        },
        'volei-m': null, 'volei-f': null,
        ranking: [
            { turma: 'MMD 1', pontos: 15 },
            { turma: 'MKT 1', pontos: 10 },
            { turma: 'IOT 1', pontos: 6 }
        ]
    },
    '2': {
        'futebol-m': {
            titulo: 'Futebol Masculino (2º Ano)',
            jogos: [{ timeA: 'IOT 2', timeB: 'MMD 2', placarA: '0', placarB: '3', status: 'Finalizado', isLive: false }],
            chave: {
                semi1: { timeA: 'IOT 2', placarA: '0', timeB: 'MMD 2', placarB: '3', winner: 'B' },
                semi2: { timeA: 'MKT 2', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null },
                final: { timeA: 'MMD 2', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null }
            }
        },
        'futebol-f': null, 'basquete': null, 'volei-m': null, 'volei-f': null,
        ranking: [
            { turma: 'MMD 2', pontos: 18 },
            { turma: 'IOT 2', pontos: 12 },
            { turma: 'MKT 2', pontos: 4 }
        ]
    },
    '3': {
        'futebol-m': {
            titulo: 'Futebol Masculino (3º Ano)',
            jogos: [{ timeA: 'MMD 3', timeB: 'IOT 3', placarA: '4', placarB: '2', status: 'Finalizado', isLive: false }],
            chave: {
                semi1: { timeA: 'MMD 3', placarA: '4', timeB: 'IOT 3', placarB: '2', winner: 'A' },
                semi2: { timeA: 'IOT 3', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null },
                final: { timeA: 'MMD 3', placarA: '-', timeB: 'A Definir', placarB: '-', winner: null }
            }
        },
        'futebol-f': null, 'basquete': null, 'volei-m': null, 'volei-f': null,
        ranking: [
            { turma: 'MMD 3', pontos: 22 },
            { turma: 'IOT 3', pontos: 14 }
        ]
    }
};

let anoAtual = '1';
let esporteAtual = 'futebol-m';

function renderizarInterface() {
    const anoDados = dadosInterclasse[anoAtual];
    const dados = anoDados ? anoDados[esporteAtual] : null;

    const containerJogos = document.getElementById('container-jogos');
    const bracketSection = document.getElementById('bracket-section');
    const tituloJogos = document.getElementById('titulo-jogos');

    const tabelaRanking = document.getElementById('tabela-ranking');
    tabelaRanking.innerHTML = '';
    if (anoDados && anoDados.ranking) {
        anoDados.ranking.forEach((posicao, index) => {
            const topClass = index < 3 ? 'top-three' : '';
            tabelaRanking.innerHTML += `
                <tr class="${topClass}">
                    <td class="pos-col">${index + 1}º</td>
                    <td>${posicao.turma}</td>
                    <td class="pts-col">${posicao.pontos} pts</td>
                </tr>
            `;
        });
    }

    if (!dados) {
        const formatoNome = document.querySelector(`[data-sport="${esporteAtual}"]`).innerText;
        tituloJogos.innerText = `Partidas - ${formatoNome}`;
        containerJogos.innerHTML = '<div class="no-games">Nenhuma partida programada ou cadastrada para esta categoria.</div>';
        bracketSection.style.display = 'none';
        return;
    }

    bracketSection.style.display = 'block';
    tituloJogos.innerText = dados.titulo;
    containerJogos.innerHTML = '';
    dados.jogos.forEach(jogo => {
        const liveClass = jogo.isLive ? 'live-badge' : '';
        containerJogos.innerHTML += `
            <div class="match-card">
                <span class="team">${jogo.timeA}</span>
                <div class="match-info">
                    <span class="score">${jogo.placarA} x ${jogo.placarB}</span>
                    <span class="status ${liveClass}">${jogo.status}</span>
                </div>
                <span class="team">${jogo.timeB}</span>
            </div>
        `;
    });

    const bracketSemis = document.getElementById('bracket-semis');
    const bracketFinal = document.getElementById('bracket-final');
    
    const criarCardChave = (partida) => {
        const classA = partida.winner === 'A' ? 'winner' : '';
        const classB = partida.winner === 'B' ? 'winner' : '';
        return `
            <div class="bracket-team ${classA}">
                <span class="b-name">${partida.timeA}</span>
                <span class="b-score">${partida.placarA}</span>
            </div>
            <div class="bracket-team ${classB}">
                <span class="b-name">${partida.timeB}</span>
                <span class="b-score">${partida.placarB}</span>
            </div>
        `;
    };

    bracketSemis.innerHTML = `
        <div class="bracket-round-title">Semifinais</div>
        <div class="bracket-match">${criarCardChave(dados.chave.semi1)}</div>
        <div class="bracket-match">${criarCardChave(dados.chave.semi2)}</div>
    `;
    bracketFinal.innerHTML = criarCardChave(dados.chave.final);
}

const botoesAnos = document.querySelectorAll('.nav-btn');
botoesAnos.forEach(btn => {
    btn.addEventListener('click', () => {
        botoesAnos.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        anoAtual = btn.getAttribute('data-year');
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
