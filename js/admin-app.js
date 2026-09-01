import {
  addDoc,
  auth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  limit,
  onAuthStateChanged,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
} from "./firebase-service.js";
import {
  formatarStatus,
  nomeFase,
  ordenarPartidas,
  textoSeguro,
} from "./shared.js";
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
const loginScreen = document.getElementById("login-screen");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginSenha = document.getElementById("login-senha");
const loginMensagem = document.getElementById("login-mensagem");
const adminUser = document.getElementById("admin-user");
const botaoSair = document.getElementById("sair-admin");
const filtrosAdmin = document.getElementById("filtros-admin");
const historicoAdmin = document.getElementById("historico-admin");

let partidasAdmin = [];
let partidaSelecionada = null;
let filtroAdminAtual = "todas";
let usuarioAtual = null;


function setMensagem(texto, tipo = "info") {
  mensagem.textContent = texto;
  mensagem.dataset.type = tipo;
}

function setLoginMensagem(texto, tipo = "info") {
  loginMensagem.textContent = texto;
  loginMensagem.dataset.type = tipo;
}

function atualizarTelaAuth(usuario) {
  usuarioAtual = usuario;
  loginScreen.hidden = Boolean(usuario);
  adminUser.textContent = usuario?.email ?? "";
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
  const agenda = [partidaSelecionada.data, partidaSelecionada.hora, partidaSelecionada.local]
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

function partidaPassaFiltro(partida) {
  if (filtroAdminAtual === "todas") return true;
  if (filtroAdminAtual === "sem-agenda") return !partida.data || !partida.hora || !partida.local;
  if (filtroAdminAtual === "pendente") return partida.status !== "encerrada" && partida.status !== "ao-vivo";

  return partida.status === filtroAdminAtual;
}

function renderizarOpcoesPartidas() {
  const selecionadaAntes = selectPartida.value;
  const partidasFiltradas = partidasAdmin.filter(partidaPassaFiltro);

  selectPartida.innerHTML = "";
  partidasFiltradas.forEach((partida) => {
    const option = document.createElement("option");

    option.value = partida.id;
    option.textContent =
      `[${nomeFase(partida)}] ${partida.turmaA ?? "A definir"} x ` +
      `${partida.turmaB ?? "A definir"} • ${formatarStatus(partida.status)}`;
    selectPartida.appendChild(option);
  });

  if (partidasFiltradas.some((partida) => partida.id === selecionadaAntes)) {
    selectPartida.value = selecionadaAntes;
  }

  document.querySelectorAll("[data-admin-filter]").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.adminFilter === filtroAdminAtual);
  });
}

function obterRefPartida(idPartida = selectPartida.value) {
  return doc(
    db,
    "anos",
    `${selectAno.value}ano`,
    "esportes",
    selectEsporte.value,
    "partidas",
    idPartida,
  );
}

async function carregarPartidaPorId(idPartida) {
  const snapshot = await getDoc(obterRefPartida(idPartida));

  return {
    id: idPartida,
    ...snapshot.data(),
  };
}

async function registrarHistorico(acao, partida, extras = {}) {
  try {
    await addDoc(collection(db, "historicoAlteracoes"), {
      acao,
      ano: Number(selectAno.value),
      esporte: selectEsporte.value,
      partidaId: partida?.id ?? selectPartida.value ?? null,
      fase: partida?.fase ?? null,
      turmaA: partida?.turmaA ?? null,
      turmaB: partida?.turmaB ?? null,
      usuario: usuarioAtual?.email ?? "admin",
      criadoEm: serverTimestamp(),
      ...extras,
    });
  } catch (erro) {
    console.warn("Historico nao registrado", erro);
  }
}

async function carregarHistorico() {
  try {
    const historicoQuery = query(
      collection(db, "historicoAlteracoes"),
      orderBy("criadoEm", "desc"),
      limit(8),
    );
    const snapshot = await getDocs(historicoQuery);

    if (snapshot.empty) {
      historicoAdmin.innerHTML = '<div class="empty-state compact">Nenhuma alteração registrada ainda.</div>';
      return;
    }

    historicoAdmin.innerHTML = "";
    snapshot.forEach((documento) => {
      const item = documento.data();
      const partida = item.turmaA && item.turmaB ? `${item.turmaA} x ${item.turmaB}` : "Partida";

      historicoAdmin.innerHTML += `
        <article class="history-item">
          <strong>${textoSeguro(item.acao)}</strong>
          <span>${textoSeguro(partida)} • ${textoSeguro(item.esporte ?? "-")} • ${textoSeguro(item.ano ?? "-")}º Ano</span>
          <small>${textoSeguro(item.usuario ?? "admin")}</small>
        </article>
      `;
    });
  } catch (erro) {
    console.error(erro);
    historicoAdmin.innerHTML =
      '<div class="empty-state compact">Não foi possível carregar o histórico.</div>';
  }
}

async function carregarPartidas() {
  try {
    const snapshot = await getDocs(
      collection(db, "anos", `${selectAno.value}ano`, "esportes", selectEsporte.value, "partidas"),
    );

    partidasAdmin = [];
    snapshot.forEach((documento) => {
      const partida = documento.data();

      if (partida.turmaA && partida.turmaB) {
        partidasAdmin.push({ id: documento.id, ...partida });
      }
    });

    partidasAdmin.sort(ordenarPartidas);
    renderizarOpcoesPartidas();
    limparFormularioPartida();
    atualizarResumoAdmin();

    if (selectPartida.options.length > 0) {
      await carregarDadosPartida();
    } else {
      partidaSelecionada = null;
      atualizarPreviewPartida();
      setMensagem("Nenhuma partida disponível para editar.", "warning");
    }

    await carregarHistorico();
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
  if (!partida.proximaPartida) return null;

  const proximaRef = doc(
    db,
    "anos",
    `${ano}ano`,
    "esportes",
    esporte,
    "partidas",
    partida.proximaPartida,
  );
  const proximaSnapshot = await getDoc(proximaRef);
  const proximaAntes = proximaSnapshot.exists() ? proximaSnapshot.data() : {};
  const campoDestino = partida.posicaoChave % 2 === 1 ? "turmaA" : "turmaB";

  await updateDoc(proximaRef, { [campoDestino]: vencedor });

  return {
    proximaPartida: partida.proximaPartida,
    campoDestino,
    valorAnterior: proximaAntes[campoDestino] ?? null,
  };
}

async function ajustarRankingFinal(ano, esporte, campeao, vice, direcao) {
  const configSnapshot = await getDoc(doc(db, "config", "esportes"));
  const config = configSnapshot.data();

  if (!config?.[esporte]) {
    throw new Error(`Pontuação não configurada para ${esporte}`);
  }

  const rankingRef = doc(db, "ranking", `${ano}ano`);
  const rankingSnapshot = await getDoc(rankingRef);
  const rankingAtual = rankingSnapshot.exists() ? rankingSnapshot.data() : {};
  const multiplicador = direcao === "remover" ? -1 : 1;

  rankingAtual[campeao] = Math.max(0, (rankingAtual[campeao] || 0) + config[esporte].campeao * multiplicador);
  rankingAtual[vice] = Math.max(0, (rankingAtual[vice] || 0) + config[esporte].vice * multiplicador);

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

    if (!Number.isFinite(placarA) || !Number.isFinite(placarB) || placarA < 0 || placarB < 0) {
      setMensagem("Digite placares válidos, sem números negativos.", "warning");
      return;
    }

    const idPartida = selectPartida.value;
    const partida = await carregarPartidaPorId(idPartida);
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

      if (!Number.isFinite(penaltisA) || !Number.isFinite(penaltisB) || penaltisA < 0 || penaltisB < 0 || penaltisA === penaltisB) {
        setMensagem("Preencha pênaltis válidos, sem empate e sem números negativos.", "warning");
        return;
      }

      vencedor = penaltisA > penaltisB ? turmaA : turmaB;
    }

    await updateDoc(obterRefPartida(idPartida), {
      placarA,
      placarB,
      penaltisA,
      penaltisB,
      vencedor,
      status: "encerrada",
    });

    const avanco = await avancarVencedor(selectAno.value, selectEsporte.value, partida, vencedor);

    if (partida.fase === "final" && partida.status !== "encerrada") {
      const vice = vencedor === turmaA ? turmaB : turmaA;
      await ajustarRankingFinal(selectAno.value, selectEsporte.value, vencedor, vice, "adicionar");
    }

    await registrarHistorico("Resultado finalizado", partida, {
      placar: `${placarA} x ${placarB}`,
      vencedor,
      avanco,
    });
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

    if ((inputData.value || inputHora.value || inputLocal.value) && (!inputData.value || !inputHora.value || !inputLocal.value.trim())) {
      setMensagem("Para publicar agenda, preencha data, hora e local.", "warning");
      return;
    }

    const idPartida = selectPartida.value;
    const partida = await carregarPartidaPorId(idPartida);

    await updateDoc(obterRefPartida(idPartida), {
      data: inputData.value,
      hora: inputHora.value,
      local: inputLocal.value.trim(),
    });
    await registrarHistorico("Agenda atualizada", partida, {
      agenda: [inputData.value, inputHora.value, inputLocal.value.trim()].filter(Boolean).join(" • "),
    });
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
    const partida = await carregarPartidaPorId(idPartida);

    await updateDoc(obterRefPartida(idPartida), { status });
    await registrarHistorico(`Status: ${formatarStatus(status)}`, partida);
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
    const partida = await carregarPartidaPorId(idPartida);
    const vencedorAnterior = partida.vencedor ?? null;

    if (partida.proximaPartida && vencedorAnterior) {
      const proxima = await carregarPartidaPorId(partida.proximaPartida);
      const campoDestino = partida.posicaoChave % 2 === 1 ? "turmaA" : "turmaB";

      if (proxima[campoDestino] === vencedorAnterior) {
        await updateDoc(obterRefPartida(partida.proximaPartida), {
          [campoDestino]: null,
        });
      }
    }

    if (partida.fase === "final" && partida.status === "encerrada" && vencedorAnterior) {
      const vice = vencedorAnterior === partida.turmaA ? partida.turmaB : partida.turmaA;
      await ajustarRankingFinal(selectAno.value, selectEsporte.value, vencedorAnterior, vice, "remover");
    }

    await updateDoc(obterRefPartida(idPartida), {
      placarA: null,
      placarB: null,
      penaltisA: null,
      penaltisB: null,
      vencedor: null,
      status: "pendente",
    });
    await registrarHistorico("Avanço desfeito", partida, {
      vencedorAnterior,
      proximaPartida: partida.proximaPartida ?? null,
    });
    await carregarPartidas();
    selectPartida.value = idPartida;
    await carregarDadosPartida();
    setMensagem("Placar limpo e avanço removido quando possível.", "success");
  } catch (erro) {
    console.error(erro);
    setMensagem("Não foi possível desfazer o avanço.", "error");
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

    const partida = await carregarPartidaPorId(selectPartida.value);

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

loginForm.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  setLoginMensagem("Entrando...");

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginSenha.value);
    loginSenha.value = "";
    setLoginMensagem("");
  } catch (erro) {
    console.error(erro);
    setLoginMensagem("E-mail ou senha inválidos.", "error");
  }
});

botaoSair.addEventListener("click", () => signOut(auth));
selectAno.addEventListener("change", carregarPartidas);
selectEsporte.addEventListener("change", carregarPartidas);
selectPartida.addEventListener("change", carregarDadosPartida);
botaoSalvar.addEventListener("click", salvarResultado);
botaoSalvarAgenda.addEventListener("click", salvarAgenda);
botaoMarcarAoVivo.addEventListener("click", () => atualizarStatusPartida("ao-vivo"));
botaoLimparResultado.addEventListener("click", limparResultado);
filtrosAdmin.addEventListener("click", async (evento) => {
  const botao = evento.target.closest("[data-admin-filter]");

  if (!botao) return;

  filtroAdminAtual = botao.dataset.adminFilter;
  renderizarOpcoesPartidas();
  await carregarDadosPartida();
});

onAuthStateChanged(auth, async (usuario) => {
  atualizarTelaAuth(usuario);

  if (usuario) {
    await carregarPartidas();
    return;
  }

  partidasAdmin = [];
  partidaSelecionada = null;
  selectPartida.innerHTML = "";
  limparFormularioPartida();
  atualizarResumoAdmin();
  atualizarPreviewPartida();
  historicoAdmin.innerHTML = "";
});

