import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const selectAno = document.getElementById("ano");
const selectEsporte = document.getElementById("esporte");
const selectPartida = document.getElementById("partida");

const inputPlacarA = document.getElementById("placarA");
const inputPlacarB = document.getElementById("placarB");

const botaoSalvar = document.getElementById("salvar");
const mensagem = document.getElementById("mensagem");
const botaoSalvarAgenda = document.getElementById("salvarAgenda");

const inputData = document.getElementById("dataPartida");
const inputHora = document.getElementById("horaPartida");
const inputLocal = document.getElementById("localPartida");

// =====================
// CARREGAR PARTIDAS
// =====================

async function carregarPartidas() {
  const ano = Number(selectAno.value);
  const esporte = selectEsporte.value;

  const snapshot = await getDocs(
    collection(db, "anos", `${ano}ano`, "esportes", esporte, "partidas"),
  );

  selectPartida.innerHTML = "";

  snapshot.forEach((documento) => {
    const partida = documento.data();

    if (partida.status !== "encerrada" && partida.turmaA && partida.turmaB) {
      const option = document.createElement("option");

      option.value = JSON.stringify({
        id: documento.id,
        turmaA: partida.turmaA,
        turmaB: partida.turmaB,
      });

      option.textContent =
        `[${partida.fase.toUpperCase()}] ` +
        `${partida.turmaA ?? "A definir"} x ` +
        `${partida.turmaB ?? "A definir"}`;

      selectPartida.appendChild(option);
    }
  });

  if (selectPartida.options.length > 0) {
    await carregarDadosPartida();
  }
}

async function avancarVencedor(ano, esporte, partida, vencedor) {
  if (!partida.proximaPartida) {
    return;
  }

  const proximaRef = doc(
    db,
    "anos",
    `${ano}ano`,
    "esportes",
    esporte,
    "partidas",
    partida.proximaPartida,
  );

  const campoDestino = partida.posicaoChave % 2 === 1 ? "turmaA" : "turmaB";

  await updateDoc(proximaRef, {
    [campoDestino]: vencedor,
  });
}

async function atualizarRanking(ano, esporte, campeao, vice) {
  const configSnapshot = await getDoc(doc(db, "config", "esportes"));

  const config = configSnapshot.data();

  const pontosCampeao = config[esporte].campeao;

  const pontosVice = config[esporte].vice;

  const rankingRef = doc(db, "ranking", `${ano}ano`);

  const rankingSnapshot = await getDoc(rankingRef);

  const rankingAtual = rankingSnapshot.exists() ? rankingSnapshot.data() : {};

  rankingAtual[campeao] = (rankingAtual[campeao] || 0) + pontosCampeao;

  rankingAtual[vice] = (rankingAtual[vice] || 0) + pontosVice;

  await setDoc(rankingRef, rankingAtual);

  console.log("Ranking atualizado!");
}

async function salvarResultado() {
  const placarA = Number(inputPlacarA.value);

  const placarB = Number(inputPlacarB.value);

  if (isNaN(placarA) || isNaN(placarB)) {
    mensagem.textContent = "Digite os dois placares.";

    return;
  }

  const dadosPartida = JSON.parse(selectPartida.value);

  const turmaA = dadosPartida.turmaA;

  const turmaB = dadosPartida.turmaB;

  const idPartida = dadosPartida.id;

  let vencedor;

  if (placarA > placarB) {
    vencedor = turmaA;
  } else if (placarB > placarA) {
    vencedor = turmaB;
  } else {
    mensagem.textContent =
      "Empate. Registre o vencedor pelos pênaltis futuramente.";

    return;
  }

  const partidaRef = doc(
    db,
    "anos",
    `${selectAno.value}ano`,
    "esportes",
    selectEsporte.value,
    "partidas",
    idPartida,
  );

  const partidaSnapshot = await getDoc(partidaRef);

  const partida = partidaSnapshot.data();

  await updateDoc(
    doc(
      db,
      "anos",
      `${selectAno.value}ano`,
      "esportes",
      selectEsporte.value,
      "partidas",
      idPartida,
    ),
    {
      placarA,
      placarB,
      vencedor,
      status: "encerrada",
    },
  );

  await avancarVencedor(
    selectAno.value,
    selectEsporte.value,
    partida,
    vencedor,
  );

  if (partida.fase === "final") {
    const campeao = vencedor;

    const vice = vencedor === turmaA ? turmaB : turmaA;

    await atualizarRanking(selectAno.value, selectEsporte.value, campeao, vice);
  }

  mensagem.textContent = "Resultado salvo com sucesso.";
}

async function salvarAgenda() {
  const dadosPartida = JSON.parse(selectPartida.value);

  const idPartida = dadosPartida.id;

  await updateDoc(
    doc(
      db,
      "anos",
      `${selectAno.value}ano`,
      "esportes",
      selectEsporte.value,
      "partidas",
      idPartida,
    ),
    {
      data: inputData.value,
      hora: inputHora.value,
      local: inputLocal.value,
    },
  );

  mensagem.textContent = "Agenda salva com sucesso.";
}

async function carregarDadosPartida() {
  if (!selectPartida.value) {
    return;
  }

  const dadosPartida = JSON.parse(selectPartida.value);

  const partidaRef = doc(
    db,
    "anos",
    `${selectAno.value}ano`,
    "esportes",
    selectEsporte.value,
    "partidas",
    dadosPartida.id,
  );

  const snapshot = await getDoc(partidaRef);

  const partida = snapshot.data();

  inputPlacarA.value = partida.placarA ?? "";

  inputPlacarB.value = partida.placarB ?? "";

  inputData.value = partida.data ?? "";

  inputHora.value = partida.hora ?? "";

  inputLocal.value = partida.local ?? "";
}

await carregarPartidas();

inputPlacarA.value = "";
inputPlacarB.value = "";

// =====================

selectAno.addEventListener("change", carregarPartidas);

selectEsporte.addEventListener("change", carregarPartidas);

botaoSalvar.addEventListener("click", salvarResultado);

carregarPartidas();

botaoSalvarAgenda.addEventListener("click", salvarAgenda);

selectPartida.addEventListener("change", carregarDadosPartida);
