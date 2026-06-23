import { db } from "../firebase.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

async function criarConfiguracaoPontuacao() {

  await setDoc(
    doc(
      db,
      "config",
      "esportes"
    ),
    {

      "futebol-m": {
        campeao: 10,
        vice: 6
      },

      "futebol-f": {
        campeao: 10,
        vice: 6
      },

      "basquete": {
        campeao: 8,
        vice: 4
      },

      "volei-m": {
        campeao: 12,
        vice: 8
      },

      "volei-f": {
        campeao: 12,
        vice: 8
      }

    }
  );

  console.log(
    "Configuração de pontuação criada com sucesso!"
  );

}

criarConfiguracaoPontuacao();