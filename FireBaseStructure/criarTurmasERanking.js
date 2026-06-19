import { db } from "../firebase.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function criarTurmasERanking() {

  const cursos = {
    IOT: 4,
    CDD: 2,
    MKT: 4,
    MM: 8,
    ADM: 4,
    TI: 4
  };

  const ranking3Ano = {};

  // =====================
  // TURMAS DO 3º ANO
  // =====================

  for (const [curso, quantidade] of Object.entries(cursos)) {

    for (let sala = 1; sala <= quantidade; sala++) {

      const id = `3${curso}${sala}`;

      await setDoc(
        doc(db, "turmas", id),
        {
          ano: 3,
          curso,
          sala
        }
      );

      ranking3Ano[id] = 0;

      console.log(`Turma criada: ${id}`);
    }
  }

  // =====================
  // RANKING
  // =====================

  await setDoc(
    doc(db, "ranking", "1ano"),
    {}
  );

  await setDoc(
    doc(db, "ranking", "2ano"),
    {}
  );

  await setDoc(
    doc(db, "ranking", "3ano"),
    ranking3Ano
  );

  console.log("Ranking criado");

  console.log("Processo concluído");
}

criarTurmasERanking();