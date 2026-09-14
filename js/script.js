import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdBpKecvDzCZCCqpLXC-dC3G1acGPBqM0",
  authDomain: "finaletorneomeme-23ce6.firebaseapp.com",
  projectId: "finaletorneomeme-23ce6",
  storageBucket: "finaletorneomeme-23ce6.firebasestorage.app",
  messagingSenderId: "419745298947",
  appId: "1:419745298947:web:00d52ab888634a6615ac36",
  measurementId: "G-9XEPR4QJ0G"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const risultatiRef = doc(db, "classifica", "risultati");

document.addEventListener("DOMContentLoaded", () => {
  const startOverlay = document.getElementById("start-overlay");
  const startButton = document.getElementById("start-button");
  const introVideo = document.getElementById("intro-video");

  const accessSection = document.getElementById("access-section");
  const accessForm = document.getElementById("access-form");
  const matricolaInput = document.getElementById("matricola");
  const errorMessage = document.getElementById("error-message");

  const mainContent = document.getElementById("main-content");
  const tvButtons = document.querySelectorAll(".tv-button");
  let esperienzaAvviata = false;
  let annullaListenerClassifica = null;

  // Sostituire questi valori con le matricole autorizzate.
  const matricoleValide = ["0512116879", "0512117293", "0512117161", "0512117110", "0512117074", "0512117185", "0512117128", "0512117092", "0512117917"];

  function avviaListenerClassifica() {
    if (annullaListenerClassifica) {
      return;
    }

    annullaListenerClassifica = onSnapshot(
      risultatiRef,
      (snapshot) => {
        const risultati = snapshot.exists() ? snapshot.data() : {};
        document.getElementById("voti-1").textContent = risultati.voto1 ?? 0;
        document.getElementById("voti-2").textContent = risultati.voto2 ?? 0;
      },
      (error) => {
        console.error("Errore nel listener della classifica:", error);
        document.getElementById("message").textContent =
          "Impossibile aggiornare la classifica in tempo reale.";
      }
    );
  }

  function mostraAccesso() {
    introVideo.pause();
    introVideo.classList.add("hidden");
    accessSection.classList.remove("hidden");
    matricolaInput.focus();
  }

  // Avvia l'intro dopo l'interazione esplicita dell'utente.
  startButton.addEventListener("click", async () => {
    esperienzaAvviata = true;
    startOverlay.classList.add("hidden");
    introVideo.classList.remove("hidden");
    introVideo.muted = false;
    introVideo.volume = 1;
    introVideo.load();

    try {
      await introVideo.play();
    } catch (error) {
      console.error("Impossibile avviare il video introduttivo:", error);
      mostraAccesso();
    }
  });

  // Passaggio dalla FASE 1 alla FASE 2.
  introVideo.addEventListener("ended", () => {
    mostraAccesso();
  });

  // Se il file intro non viene caricato, consente comunque di proseguire.
  introVideo.addEventListener("error", () => {
    if (!esperienzaAvviata) {
      return;
    }

    console.error("Impossibile caricare videos/intro.mp4.");
    mostraAccesso();
  });

  // Validazione della matricola e accesso alla FASE 3.
  accessForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const matricolaInserita = matricolaInput.value.trim();

    const matricolaValida = matricoleValide.some(
      (matricola) =>
        matricola.toLowerCase() === matricolaInserita.toLowerCase()
    );

    if (!matricolaValida) {
      errorMessage.textContent = "Matricola non valida.";
      matricolaInput.focus();
      return;
    }

    errorMessage.textContent = "";
    localStorage.setItem("userMatricola", matricolaInserita);
    accessSection.classList.add("hidden");
    mainContent.classList.remove("hidden");
    avviaListenerClassifica();
  });

  // Gestisce separatamente il play/pausa di ogni televisore.
  tvButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const videoId = button.dataset.video;
      const video = document.getElementById(videoId);

      if (video.paused) {
        video.muted = false;
        video.volume = 1;
        video.play().catch((error) => {
          console.error("Impossibile avviare il video:", error);
        });
      } else {
        video.pause();
      }
    });
  });
});

const btnVota = document.getElementById("submit-vote");
const message = document.getElementById("message");

if (btnVota && message) {
  btnVota.addEventListener("click", async () => {
    const matricola = localStorage.getItem("userMatricola");
    const votoScelto = document.querySelector('input[name="vote"]:checked');

    if (!matricola) {
      message.textContent = "Sessione non valida. Effettua nuovamente l'accesso.";
      return;
    }

    // Il controllo locale avviene prima di qualsiasi scrittura su Firestore.
    if (localStorage.getItem(`votato_${matricola}`)) {
      message.textContent = "Hai già espresso il tuo voto!";
      return;
    }

    if (!votoScelto) {
      message.textContent = "Seleziona un'opzione!";
      return;
    }

    const campo = votoScelto.value === "Roman Giangi Ars Maxima" ? "voto1" : "voto2";
    btnVota.disabled = true;
    message.textContent = "Invio del voto...";

    try {
      await setDoc(risultatiRef, { [campo]: increment(1) }, { merge: true });
      localStorage.setItem(`votato_${matricola}`, "true");
      message.textContent = "Voto registrato con successo!";
    } catch (error) {
      console.error("Errore durante l'invio del voto:", error);
      message.textContent = "Impossibile registrare il voto. Riprova.";
      btnVota.disabled = false;
    }
  });
}