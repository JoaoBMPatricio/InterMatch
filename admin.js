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
const inputData = document.getElementById("dataPartida");
const inputHora = document.getElementById("horaPartida");
const inputLocal = document.getElementById("localPartida");

const botaoSalvar = document.getElementById("salvar");
const botaoSalvarAgenda = document.getElementById("salvarAgenda");
const botaoMarcarAoVivo = document.getElementById("marcarAoVivo");
const botaoLimparResultado = document.getElementById("limparResultado");

const mensagem = document.getElementById("mensagem");
const resumoAdmin = document.getElementById("resumo-admin");
const previewPartida = document.getElementById("preview-partida");
const labelTimeA = document.getElementById("labelTimeA");
const labelTimeB = document.getElementById("labelTimeB");

const nomesFase = {
  "32-avos": "32-Avos",
  "16-avos": "16-Avos",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semifinal",
  final: "Final",
  "mata-mata": "Mata-Mata",
};

let partidasAdmin = [];
let partidaSelecionada = null;

function textoSeguro(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nomeFase(partida) {
  return nomesFase[partida?.fase] ?? `Rodada ${partida?.rodada ?? "-"}`;
}

function ordenarPartidas(a, b) {
  return (
    Number(a.rodada ?? 999) - Number(b.rodada ?? 999) ||
    Number(a.posicaoChave ?? 999) - Number(b.posicaoChave ?? 999) ||
    String(a.id).localeCompare(String(b.id))
  );
}

function formatarStatus(status) {
  if (status === "encerrada") return "Finalizada";
  if (status === "ao-vivo") return "Ao vivo";
  return "A jogar";
}

function setMensagem(texto, tipo = "info") {
  mensagem.textContent = texto;
  mensagem.dataset.type = tipo;
}

function limparFormularioPartida() {
  inputPlacarA.value = "";
  inputPlacarB.value = "";
  inputPenaltisA.value = "";
  inputPenaltisB.value = "";
  inputData.value = "";
  inputHora.value = "";
  inputLocal.value = "";
  labelTimeA.textContent = "Time A";
  labelTimeB.textContent = "Time B";
  setMensagem("");
}

function atualizarResumoAdmin() {
  const total = partidasAdmin.length;
  const finalizadas = partidasAdmin.filter((partida) => partida.status === "encerrada").length;
  const aoVivo = partidasAdmin.filter((partida) => partida.status === "ao-vivo").length;
  const pendentes = total - finalizadas - aoVivo;

  resumoAdmin.innerHTML = `
    <div><span>Total</span><strong>${total}</strong></div>
    <div><span>A jogar</span><strong>${pendentes}</strong></div>
    <div><span>Ao vivo</span><strong>${aoVivo}</strong></div>
    <div><span>Finalizadas</span><strong>${finalizadas}</strong></div>
  `;
}

function atualizarPreviewPartida() {
  if (!partidaSelecionada) {
    previewPartida.innerHTML = "Selecione uma partida para ver os detalhes.";
    return;
  }

  const placar =
    partidaSelecionada.placarA != null && partidaSelecionada.placarB != null
      ? `${partidaSelecionada.placarA} x ${partidaSelecionada.placarB}`
      : "- x -";
  const agenda = [
    partidaSelecionada.data,
    partidaSelecionada.hora,
    partidaSelecionada.local,
  ]
    .filter(Boolean)
    .join(" • ");

  labelTimeA.textContent = partidaSelecionada.turmaA ?? "Time A";
  labelTimeB.textContent = partidaSelecionada.turmaB ?? "Time B";

  previewPartida.innerHTML = `
    <span>${textoSeguro(nomeFase(partidaSelecionada))}</span>
    <strong>${textoSeguro(partidaSelecionada.turmaA)} x ${textoSeguro(partidaSelecionada.turmaB)}</strong>
    <div class="admin-preview-score">${textoSeguro(placar)}</div>
    <small>${textoSeguro(formatarStatus(partidaSelecionada.status))}${agenda ? ` • ${textoSeguro(agenda)}` : ""}</small>
  `;
}

async function carregarPartidas() {
  try {
    const ano = Number(selectAno.value);
    const esporte = selectEsporte.value;

    const snapshot = await getDocs(
      collection(db, "anos", `${ano}ano`, "esportes", esporte, "partidas"),
    );

    selectPartida.innerHTML = "";
    partidasAdmin = [];

    snapshot.forEach((documento) => {
      const partida = documento.data();

      if (partida.turmaA && partida.turmaB) {
        partidasAdmin.push({
          id: documento.id,
          ...partida,
        });
      }
    });

    partidasAdmin.sort(ordenarPartidas);

    partidasAdmin.forEach((partida) => {
      const option = document.createElement("option");

      option.value = partida.id;
      option.textContent =
        `[${nomeFase(partida)}] ` +
        `${partida.turmaA ?? "A definir"} x ` +
        `${partida.turmaB ?? "A definir"} • ` +
        formatarStatus(partida.status);

      selectPartida.appendChild(option);
    });

    limparFormularioPartida();
    atualizarResumoAdmin();

    if (selectPartida.options.length > 0) {
      await carregarDadosPartida();
    } else {
      partidaSelecionada = null;
      atualizarPreviewPartida();
      setMensagem("Nenhuma partida disponível para editar.", "warning");
    }
  } catch (erro) {
    console.error(erro);
    selectPartida.innerHTML = "";
    partidasAdmin = [];
    partidaSelecionada = null;
    limparFormularioPartida();
    atualizarResumoAdmin();
    atualizarPreviewPartida();
    setMensagem(
      "Não foi possível carregar as partidas. Verifique as permissões do Firebase.",
      "error",
    );
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
      setMensagem("Selecione uma partida.", "warning");
      return;
    }

    if (inputPlacarA.value === "" || inputPlacarB.value === "") {
      setMensagem("Digite os dois placares.", "warning");
      return;
    }

    const placarA = Number(inputPlacarA.value);
    const placarB = Number(inputPlacarB.value);

    if (!Number.isFinite(placarA) || !Number.isFinite(placarB)) {
      setMensagem("Digite placares válidos.", "warning");
      return;
    }

    const idPartida = selectPartida.value;
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
    const partida = {
      id: idPartida,
      ...partidaSnapshot.data(),
    };
    const turmaA = partida.turmaA;
    const turmaB = partida.turmaB;

    let vencedor;
    let penaltisA = null;
    let penaltisB = null;

    if (placarA > placarB) {
      vencedor = turmaA;
    } else if (placarB > placarA) {
      vencedor = turmaB;
    } else {
      if (inputPenaltisA.value === "" || inputPenaltisB.value === "") {
        setMensagem("Empate. Preencha os pênaltis com um vencedor.", "warning");
        return;
      }

      penaltisA = Number(inputPenaltisA.value);
      penaltisB = Number(inputPenaltisB.value);

      if (!Number.isFinite(penaltisA) || !Number.isFinite(penaltisB) || penaltisA === penaltisB) {
        setMensagem("Empate. Preencha os pênaltis com um vencedor.", "warning");
        return;
      }

      vencedor = penaltisA > penaltisB ? turmaA : turmaB;
    }

    await updateDoc(partidaRef, {
      placarA,
      placarB,
      penaltisA,
      penaltisB,
      vencedor,
      status: "encerrada",
    });

    await avancarVencedor(selectAno.value, selectEsporte.value, partida, vencedor);

    if (partida.fase === "final" && partida.status !== "encerrada") {
      const campeao = vencedor;
      const vice = vencedor === turmaA ? turmaB : turmaA;

      await atualizarRanking(selectAno.value, selectEsporte.value, campeao, vice);
    }

    await carregarPartidas();
    selectPartida.value = idPartida;
    await carregarDadosPartida();
    setMensagem("Resultado salvo, vencedor avançado e partida finalizada.", "success");
  } catch (erro) {
    console.error(erro);
    setMensagem(
      "Não foi possível salvar o resultado. Verifique as permissões do Firebase.",
      "error",
    );
  }
}

async function salvarAgenda() {
  try {
    if (!selectPartida.value) {
      setMensagem("Selecione uma partida.", "warning");
      return;
    }

    const idPartida = selectPartida.value;

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

    await carregarPartidas();
    selectPartida.value = idPartida;
    await carregarDadosPartida();
    setMensagem("Agenda salva com sucesso.", "success");
  } catch (erro) {
    console.error(erro);
    setMensagem(
      "Não foi possível salvar a agenda. Verifique as permissões do Firebase.",
      "error",
    );
  }
}

async function atualizarStatusPartida(status) {
  try {
    if (!selectPartida.value) {
      setMensagem("Selecione uma partida.", "warning");
      return;
    }

    const idPartida = selectPartida.value;

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
      { status },
    );

    await carregarPartidas();
    selectPartida.value = idPartida;
    await carregarDadosPartida();
    setMensagem(`Partida marcada como ${formatarStatus(status).toLowerCase()}.`, "success");
  } catch (erro) {
    console.error(erro);
    setMensagem("Não foi possível atualizar o status.", "error");
  }
}

async function limparResultado() {
  try {
    if (!selectPartida.value) {
      setMensagem("Selecione uma partida.", "warning");
      return;
    }

    const idPartida = selectPartida.value;

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
        placarA: null,
        placarB: null,
        penaltisA: null,
        penaltisB: null,
        vencedor: null,
        status: "pendente",
      },
    );

    await carregarPartidas();
    selectPartida.value = idPartida;
    await carregarDadosPartida();
    setMensagem("Placar limpo. Revise as próximas fases se essa partida já havia avançado alguém.", "warning");
  } catch (erro) {
    console.error(erro);
    setMensagem("Não foi possível limpar o placar.", "error");
  }
}

async function carregarDadosPartida() {
  try {
    if (!selectPartida.value) {
      limparFormularioPartida();
      partidaSelecionada = null;
      atualizarPreviewPartida();
      return;
    }

    const partidaRef = doc(
      db,
      "anos",
      `${selectAno.value}ano`,
      "esportes",
      selectEsporte.value,
      "partidas",
      selectPartida.value,
    );
    const snapshot = await getDoc(partidaRef);
    const partida = {
      id: selectPartida.value,
      ...snapshot.data(),
    };

    partidaSelecionada = partida;
    inputPlacarA.value = partida.placarA ?? "";
    inputPlacarB.value = partida.placarB ?? "";
    inputPenaltisA.value = partida.penaltisA ?? "";
    inputPenaltisB.value = partida.penaltisB ?? "";
    inputData.value = partida.data ?? "";
    inputHora.value = partida.hora ?? "";
    inputLocal.value = partida.local ?? "";
    atualizarPreviewPartida();
    setMensagem("");
  } catch (erro) {
    console.error(erro);
    setMensagem("Não foi possível carregar os dados da partida.", "error");
  }
}

selectAno.addEventListener("change", carregarPartidas);
selectEsporte.addEventListener("change", carregarPartidas);
selectPartida.addEventListener("change", carregarDadosPartida);
botaoSalvar.addEventListener("click", salvarResultado);
botaoSalvarAgenda.addEventListener("click", salvarAgenda);
botaoMarcarAoVivo.addEventListener("click", () => atualizarStatusPartida("ao-vivo"));
botaoLimparResultado.addEventListener("click", limparResultado);

await carregarPartidas();
