import { db } from "../firebase.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function criarEstruturaInicial() {

  const esportes = [
    {
      id: "futebol-m",
      nome: "Futebol Masculino",
      usaPenaltis: true
    },
    {
      id: "futebol-f",
      nome: "Futebol Feminino",
      usaPenaltis: true
    },
    {
      id: "basquete",
      nome: "Basquete 3x3",
      usaPenaltis: false
    },
    {
      id: "volei-m",
      nome: "Vôlei Masculino",
      usaPenaltis: false
    },
    {
      id: "volei-f",
      nome: "Vôlei Feminino",
      usaPenaltis: false
    }
  ];

  for (let ano = 1; ano <= 3; ano++) {

    const anoId = `${ano}ano`;

    await setDoc(
      doc(db, "anos", anoId),
      {
        ano
      }
    );

    console.log(`Ano criado: ${anoId}`);

    for (const esporte of esportes) {

      await setDoc(
        doc(
          db,
          "anos",
          anoId,
          "esportes",
          esporte.id
        ),
        {
          nome: esporte.nome,
          usaPenaltis: esporte.usaPenaltis
        }
      );

      console.log(
        `Esporte criado: ${anoId}/${esporte.id}`
      );

    }

  }

  console.log(
    "Estrutura inicial criada com sucesso!"
  );

}

criarEstruturaInicial();
