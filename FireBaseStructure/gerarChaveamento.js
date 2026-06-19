import { db } from "../firebase.js";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// =====================
// EMBARALHAR
// =====================

function embaralhar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }
}

// =====================
// POTÊNCIA DE 2
// =====================

function proximaPotenciaDe2(n) {
  let potencia = 1;

  while (potencia < n) {
    potencia *= 2;
  }

  return potencia;
}

// =====================
// FASE
// =====================

function obterNomeDaFase(participantes) {
  switch (participantes) {
    case 2:
      return "final";

    case 4:
      return "semifinal";

    case 8:
      return "quartas";

    case 16:
      return "oitavas";

    case 32:
      return "16-avos";

    case 64:
      return "32-avos";

    default:
      return "mata-mata";
  }
}

// =====================
// AVANÇAR VENCEDOR
// =====================

async function avancarVencedor(ano, esporte, partidaAtual, vencedor) {
  if (!partidaAtual.proximaPartida) {
    return;
  }

  const proximaRef = doc(
    db,
    "anos",
    `${ano}ano`,
    "esportes",
    esporte,
    "partidas",
    partidaAtual.proximaPartida,
  );

  const numeroPartidaAtual = partidaAtual.posicaoChave;

  const campoDestino = numeroPartidaAtual % 2 === 1 ? "turmaA" : "turmaB";

  await updateDoc(proximaRef, {
    [campoDestino]: vencedor,
  });
}

// =====================
// GERAR CHAVEAMENTO
// =====================

async function gerarChaveamento(ano, esporte) {
  try {
    const snapshot = await getDocs(collection(db, "turmas"));

    const turmas = [];

    snapshot.forEach((documento) => {
      const dados = documento.data();

      if (Number(dados.ano) === Number(ano)) {
        turmas.push(documento.id);
      }
    });

    if (turmas.length === 0) {
      console.error("Nenhuma turma encontrada.");

      return;
    }

    console.log("Turmas encontradas:", turmas.length);
    console.log(turmas);

    embaralhar(turmas);

    const tamanhoChave = proximaPotenciaDe2(turmas.length);

    const quantidadeByes = tamanhoChave - turmas.length;

    while (turmas.length < tamanhoChave) {
      turmas.push(null);
    }

    embaralhar(turmas);

    // evita null x null
    for (let i = 0; i < turmas.length - 1; i += 2) {
      if (turmas[i] === null && turmas[i + 1] === null) {
        for (let j = i + 2; j < turmas.length; j++) {
          if (turmas[j] !== null) {
            [turmas[i], turmas[j]] = [turmas[j], turmas[i]];

            break;
          }
        }
      }
    }

    console.log(`Turmas: ${turmas.length - quantidadeByes}`);

    console.log(`BYEs: ${quantidadeByes}`);

    // =====================
    // CRIAR TODAS AS RODADAS
    // =====================

    let participantes = tamanhoChave;

    let rodada = 1;

    while (participantes >= 2) {
      const partidasNaRodada = participantes / 2;

      const fase = obterNomeDaFase(participantes);

      for (let posicao = 1; posicao <= partidasNaRodada; posicao++) {
        const idPartida = `r${rodada}-p${posicao}`;

        let proximaPartida = null;

        if (participantes > 2) {
          proximaPartida = `r${rodada + 1}-p${Math.ceil(posicao / 2)}`;
        }

        let turmaA = null;
        let turmaB = null;
        let bye = false;
        let vencedor = null;
        let status = "aguardando";

        if (rodada === 1) {
          turmaA = turmas[(posicao - 1) * 2];

          turmaB = turmas[(posicao - 1) * 2 + 1];

          if ((turmaA && !turmaB) || (!turmaA && turmaB)) {
            bye = true;
            vencedor = turmaA || turmaB;
            status = "encerrada";
          }
        }

        turmaA = turmaA ?? null;
        turmaB = turmaB ?? null;

        await setDoc(
          doc(
            db,
            "anos",
            `${ano}ano`,
            "esportes",
            esporte,
            "partidas",
            idPartida,
          ),

          {
            rodada,

            fase,

            posicaoChave: posicao,

            turmaA,
            turmaB,

            placarA: null,
            placarB: null,

            penaltisA: null,
            penaltisB: null,

            vencedor,

            bye,

            status,

            proximaPartida,
          },
        );
      }

      participantes = participantes / 2;

      rodada++;
    }

    // =====================
    // AVANÇAR BYEs
    // =====================

    const partidasR1 = await getDocs(
      collection(db, "anos", `${ano}ano`, "esportes", esporte, "partidas"),
    );

    for (const documento of partidasR1.docs) {
      const partida = documento.data();

      if (partida.rodada === 1 && partida.bye === true) {
        await avancarVencedor(ano, esporte, partida, partida.vencedor);
      }
    }

    console.log("Chaveamento criado com sucesso!");
  } catch (erro) {
    console.error(erro);
  }
}

// =====================
// EXECUTAR
// =====================

gerarChaveamento(3, "futebol-m");
