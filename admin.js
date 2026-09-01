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
const inputPenaltisA = document.getElementById("penaltisA");
const inputPenaltisB = document.getElementById("penaltisB");

const botaoSalvar = document.getElementById("salvar");
const mensagem = document.getElementById("mensagem");
const botaoSalvarAgenda = document.getElementById("salvarAgenda");

const inputData = document.getElementById("dataPartida");
const inputHora = document.getElementById("horaPartida");
const inputLocal = document.getElementById("localPartida");

async function carregarPartidas() {
  try {
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

    limparFormularioPartida();

    if (selectPartida.options.length > 0) {
      await carregarDadosPartida();
    } else {
      mensagem.textContent = "Nenhuma partida disponível para editar.";
    }
  } catch (erro) {
    console.error(erro);
    selectPartida.innerHTML = "";
    limparFormularioPartida();
    mensagem.textContent =
      "Não foi possível carregar as partidas. Verifique as permissões do Firebase.";
  }
}

function limparFormularioPartida() {
  inputPlacarA.value = "";
  inputPlacarB.value = "";
  inputPenaltisA.value = "";
  inputPenaltisB.value = "";
  inputData.value = "";
  inputHora.value = "";
  inputLocal.value = "";
  mensagem.textContent = "";
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

  if (!config?.[esporte]) {
    throw new Error(`Pontuação não configurada para ${esporte}`);
  }

  const pontosCampeao = config[esporte].campeao;
  const pontosVice = config[esporte].vice;
  const rankingRef = doc(db, "ranking", `${ano}ano`);
  const rankingSnapshot = await getDoc(rankingRef);
  const rankingAtual = rankingSnapshot.exists() ? rankingSnapshot.data() : {};

  rankingAtual[campeao] = (rankingAtual[campeao] || 0) + pontosCampeao;
  rankingAtual[vice] = (rankingAtual[vice] || 0) + pontosVice;

  await setDoc(rankingRef, rankingAtual);
}

async function salvarResultado() {
  try {
    if (!selectPartida.value) {
      mensagem.textContent = "Selecione uma partida.";
      return;
    }

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
    let penaltisA = null;
    let penaltisB = null;

    if (placarA > placarB) {
      vencedor = turmaA;
    } else if (placarB > placarA) {
      vencedor = turmaB;
    } else {
      penaltisA = Number(inputPenaltisA.value);
      penaltisB = Number(inputPenaltisB.value);

      if (isNaN(penaltisA) || isNaN(penaltisB) || penaltisA === penaltisB) {
        mensagem.textContent = "Empate. Preencha os pênaltis com um vencedor.";
        return;
      }

      vencedor = penaltisA > penaltisB ? turmaA : turmaB;
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

    await updateDoc(partidaRef, {
      placarA,
      placarB,
      penaltisA,
      penaltisB,
      vencedor,
      status: "encerrada",
    });

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

    await carregarPartidas();
    mensagem.textContent = "Resultado salvo com sucesso.";
  } catch (erro) {
    console.error(erro);
    mensagem.textContent =
      "Não foi possível salvar o resultado. Verifique as permissões do Firebase.";
  }
}

async function salvarAgenda() {
  try {
    if (!selectPartida.value) {
      mensagem.textContent = "Selecione uma partida.";
      return;
    }

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
  } catch (erro) {
    console.error(erro);
    mensagem.textContent =
      "Não foi possível salvar a agenda. Verifique as permissões do Firebase.";
  }
}

async function carregarDadosPartida() {
  try {
    if (!selectPartida.value) {
      limparFormularioPartida();
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
    inputPenaltisA.value = partida.penaltisA ?? "";
    inputPenaltisB.value = partida.penaltisB ?? "";
    inputData.value = partida.data ?? "";
    inputHora.value = partida.hora ?? "";
    inputLocal.value = partida.local ?? "";
  } catch (erro) {
    console.error(erro);
    mensagem.textContent =
      "Não foi possível carregar os dados da partida.";
  }
}

selectAno.addEventListener("change", carregarPartidas);
selectEsporte.addEventListener("change", carregarPartidas);
selectPartida.addEventListener("change", carregarDadosPartida);
botaoSalvar.addEventListener("click", salvarResultado);
botaoSalvarAgenda.addEventListener("click", salvarAgenda);

await carregarPartidas();
