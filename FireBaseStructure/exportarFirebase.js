import { db } from "../firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function exportarTudo() {
  const colecoes = [
    "anos",
    "config",
    "ranking",
    "turmas"
  ];

  const backup = {};

  for (const nomeColecao of colecoes) {
    console.log(`Exportando ${nomeColecao}...`);

    const snapshot = await getDocs(
      collection(db, nomeColecao)
    );

    backup[nomeColecao] = [];

    snapshot.forEach((doc) => {
      backup[nomeColecao].push({
        id: doc.id,
        ...doc.data()
      });
    });
  }

  const json = JSON.stringify(backup, null, 2);

  const blob = new Blob(
    [json],
    { type: "application/json" }
  );

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "backup-firebase.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log("Backup concluído!");
}

exportarTudo();