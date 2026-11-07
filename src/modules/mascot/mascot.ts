// Mascota aplicației: un personaj care arată, prin expresie, ce face AI-ul.
// Logică pură (fără React): stările, mesajele și o „magistrală" simplă de evenimente.
//
//   mascot.say("Am verificat toate citatele!", "happy");
//   mascot.set("thinking");

// „searching”: se uită prin lupă (scanarea paginii din extensie); stare de lucru, ca „thinking”.
export type MascotMood = "idle" | "listening" | "thinking" | "searching" | "happy" | "worried" | "celebrate";

export interface MascotState {
  mood: MascotMood;
  message: string | null;
  /** cât timp rămâne mesajul pe ecran (ms); 0 = până la următoarea schimbare */
  ttl: number;
  at: number;
}

type Listener = (s: MascotState) => void;

/** Cât stă fiecare stare înainte de revenirea la „idle" (stările de lucru rămân până sunt schimbate). */
export const MOOD_TTL: Record<MascotMood, number> = {
  idle: 0,
  listening: 0,
  thinking: 0,
  searching: 0,
  happy: 4000,
  worried: 6000,
  celebrate: 3500,
};

export function createMascot(now: () => number = () => Date.now()) {
  let state: MascotState = { mood: "idle", message: null, ttl: 0, at: now() };
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((l) => l(state));
  return {
    get: () => state,
    set(mood: MascotMood, message: string | null = null) {
      state = { mood, message, ttl: MOOD_TTL[mood], at: now() };
      emit();
    },
    say(message: string, mood: MascotMood = "idle") {
      state = { mood, message, ttl: Math.max(MOOD_TTL[mood], 3000 + message.length * 40), at: now() };
      emit();
    },
    /** revine la idle dacă a expirat starea curentă; returnează true dacă s-a schimbat */
    tick(): boolean {
      if (state.ttl && now() - state.at >= state.ttl) {
        state = { mood: "idle", message: null, ttl: 0, at: now() };
        emit();
        return true;
      }
      return false;
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

/** Instanța globală folosită de pagini. */
export const mascot = createMascot();

/**
 * Reacția la un rezultat verificat: toate citatele/regulile trec → bucuros, unele nu → îngrijorat.
 * Așa „ce se întâmplă când AI-ul greșește" devine vizibil, nu doar un ✗ mic.
 */
export function moodForChecks(passed: number, total: number): { mood: MascotMood; message: string } {
  if (total === 0) return { mood: "worried", message: "N-am găsit nimic de verificat. Mai încearcă o dată?" };
  if (passed === total) return { mood: "happy", message: total === 1 ? "Am verificat sursa: e în document." : `Am verificat toate cele ${total} surse.` };
  const bad = total - passed;
  return { mood: "worried", message: bad === 1 ? "Atenție: o sursă nu există în document. Verific-o tu." : `Atenție: ${bad} din ${total} surse nu se găsesc în document.` };
}
