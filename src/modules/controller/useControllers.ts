// Pentru ECRANUL MARE: primește input de la telefoane (joystick, înclinare, butoane,
// desen, voturi, text) și decide ce layout văd telefoanele.
//
//   const screen = useControllers(code, { layout: "gamepad", prompt: "Mișcă-te!", choices: [] });
//   screen.snapshots.current.get(playerId).joystick   // citește în bucla de joc
//   screen.setScreen({ layout: "choices", prompt: "Care e mai bun?", choices: ["A", "B"] })

import { useEffect, useRef } from "react";
import { useRoom } from "../rooms/useRoom";
import { applyInput, type ControllerInput, type ControllerSnapshot, emptySnapshot, INPUT_EVENT, type ScreenState } from "./protocol";

export function useControllers(
  code: string | null,
  initial: ScreenState,
  options: { onInput?: (input: ControllerInput, playerId: string) => void } = {},
) {
  const room = useRoom<ScreenState>(code, { name: "Ecran", initialState: initial, meta: { role: "screen" }, authority: true });
  const snapshots = useRef(new Map<string, ControllerSnapshot>());
  const onInput = useRef(options.onInput);
  onInput.current = options.onInput;

  useEffect(
    () =>
      room.on(INPUT_EVENT, (data, from) => {
        const input = data as ControllerInput;
        const prev = snapshots.current.get(from) ?? emptySnapshot();
        snapshots.current.set(from, applyInput(prev, input, performance.now()));
        onInput.current?.(input, from);
      }),
    [room.on],
  );

  const controllers = room.players.filter((p) => p.meta?.role !== "screen");

  return {
    room,
    controllers,
    snapshots,
    screen: room.state ?? initial,
    /** schimbă ce afișează telefoanele; resetează voturile */
    setScreen: (next: ScreenState) => {
      for (const [id, s] of snapshots.current) snapshots.current.set(id, { ...s, choice: null });
      room.setState(next);
    },
  };
}
