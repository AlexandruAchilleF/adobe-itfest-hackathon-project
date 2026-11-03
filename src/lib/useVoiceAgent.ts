// Asistent vocal complet: ascultă → AI alege acțiuni → le execută → răspunde cu voce.
//
//   const agent = useVoiceAgent({ actions, context: () => describeState() });
//   <button onClick={agent.listen}>🎤</button>   agent.send("text scris")   agent.log

import { useCallback, useRef, useState } from "react";
import { speak } from "../modules/voice/speech";
import { useSpeechRecognition } from "../modules/voice/speech";
import { type AgentAction, type AgentTurn, type PlannedCall, runAgent } from "./agent";

interface Options {
  actions: AgentAction[];
  persona?: string;
  context?: () => string;
  lang?: string;
  /** citește răspunsul cu voce tare (default true) */
  speakReplies?: boolean;
}

export interface PendingConfirmation {
  calls: PlannedCall[];
  resolve: (answers: boolean[]) => void;
}

export function useVoiceAgent({ actions, persona, context, lang = "ro-RO", speakReplies = true }: Options) {
  const [log, setLog] = useState<AgentTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // acțiunile „write" propuse de AI așteaptă aici aprobarea omului (vezi <ConfirmActions />)
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const logRef = useRef<AgentTurn[]>([]);
  const opts = useRef({ actions, persona, context, speakReplies, lang });
  opts.current = { actions, persona, context, speakReplies, lang };

  const send = useCallback(async (input: string) => {
    const text = input.trim();
    if (!text) return;
    setThinking(true);
    setError(null);
    try {
      const turn = await runAgent({
        input: text,
        actions: opts.current.actions,
        persona: opts.current.persona,
        context: opts.current.context?.(),
        history: logRef.current,
        confirm: (calls) =>
          new Promise<boolean[]>((resolve) =>
            setPending({
              calls,
              resolve: (answers) => {
                setPending(null);
                resolve(answers);
              },
            }),
          ),
      });
      logRef.current = [...logRef.current, turn];
      setLog(logRef.current);
      if (opts.current.speakReplies && turn.say) void speak(turn.say.replace(/^\(demo\)\s*/, ""), { lang: opts.current.lang });
      return turn;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setThinking(false);
    }
  }, []);

  const speech = useSpeechRecognition({ lang, onFinal: (t) => void send(t) });

  return {
    send,
    log,
    pending,
    thinking,
    error: error ?? speech.error,
    listening: speech.listening,
    interim: speech.interim,
    supported: speech.supported,
    listen: speech.start,
    stopListening: speech.stop,
    reset: () => {
      logRef.current = [];
      setLog([]);
    },
  };
}
