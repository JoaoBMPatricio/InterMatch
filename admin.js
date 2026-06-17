import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  updateDoc
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
        collection(db, "partidas")
    );

    selectPartida.innerHTML = "";

    snapshot.forEach((documento) => {

        const partida = documento.data();

        if (
            partida.ano === ano &&
            partida.esporte === esporte &&
            partida.status !== "encerrada"
        ) {

            const option =
                document.createElement("option");

            option.value = documento.id;

            option.textContent =
                `${partida.turmaA ?? "A definir"} x ${
                    partida.turmaB ?? "A definir"
                }`;

            selectPartida.appendChild(option);

        }

    });

}

// =====================
// SALVAR RESULTADO
// =====================

async function salvarResultado() {

    const idPartida =
        selectPartida.value;

    const placarA =
        Number(inputPlacarA.value);

    const placarB =
        Number(inputPlacarB.value);

    if (
        isNaN(placarA) ||
        isNaN(placarB)
    ) {

        mensagem.textContent =
            "Digite os dois placares.";

        return;
    }

    const partes =
        selectPartida.options[
            selectPartida.selectedIndex
        ].textContent.split(" x ");

    const turmaA = partes[0];
    const turmaB = partes[1];

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

    await updateDoc(
        doc(db, "partidas", idPartida),
        {
            placarA,
            placarB,
            vencedor,
            status: "encerrada"
        }
    );

    mensagem.textContent =
        "Resultado salvo com sucesso.";

}

// =====================

selectAno.addEventListener(
    "change",
    carregarPartidas
);

selectEsporte.addEventListener(
    "change",
    carregarPartidas
);

botaoSalvar.addEventListener(
    "click",
    salvarResultado
);

carregarPartidas();