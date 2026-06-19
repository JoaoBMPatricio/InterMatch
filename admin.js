import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const selectAno = document.getElementById("ano");
const selectEsporte = document.getElementById("esporte");
const selectPartida = document.getElementById("partida");

const inputPlacarA = document.getElementById("placarA");
const inputPlacarB = document.getElementById("placarB");

const botaoSalvar = document.getElementById("salvar");
const mensagem = document.getElementById("mensagem");

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

      option.textContent = `${partida.turmaA ?? "A definir"} x ${
        partida.turmaB ?? "A definir"
      }`;

      selectPartida.appendChild(option);
    }
  });
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

// =====================
// SALVAR RESULTADO
// =====================

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

  mensagem.textContent = "Resultado salvo com sucesso.";
}

await carregarPartidas();

inputPlacarA.value = "";
inputPlacarB.value = "";

// =====================

selectAno.addEventListener("change", carregarPartidas);

selectEsporte.addEventListener("change", carregarPartidas);

botaoSalvar.addEventListener("click", salvarResultado);

carregarPartidas();
