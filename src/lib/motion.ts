// Mișcarea din povestea de pe prima pagină, fără biblioteci: apariția la derulare și textul care se
// scrie singur. Respectă prefers-reduced-motion (textul apare întreg, elementele apar direct).

import { type RefObject, useEffect, useState } from "react";

export const reducedMotion = (): boolean => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** true când elementul intră în ecran (o singură dată, dacă `once`). */
export function useInView(ref: RefObject<Element | null>, { once = true, margin = "0px 0px -15% 0px", threshold = 0 } = {}): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin: margin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, once, margin, threshold]);
  return inView;
}

/**
 * Textul scris literă cu literă cât `active` e true. Cu `loop`, după o pauză se șterge și o ia de la capăt.
 * Întoarce textul scris până acum și dacă a terminat.
 */
export function useTypewriter(text: string, { active = true, speed = 38, loop = false, pause = 2200 } = {}): { typed: string; done: boolean } {
  const [n, setN] = useState(0);
  const [erasing, setErasing] = useState(false);
  useEffect(() => {
    if (!active) return;
    if (reducedMotion()) return setN(text.length);
    let t: ReturnType<typeof setTimeout>;
    if (!erasing && n < text.length) t = setTimeout(() => setN(n + 1), speed + (text[n] === " " ? 30 : 0));
    else if (!erasing && loop) t = setTimeout(() => setErasing(true), pause);
    else if (erasing && n > 0) t = setTimeout(() => setN(Math.max(0, n - 3)), 18);
    else if (erasing) t = setTimeout(() => setErasing(false), 400);
    return () => clearTimeout(t);
  }, [active, n, erasing, text, speed, loop, pause]);
  return { typed: text.slice(0, n), done: n >= text.length && !erasing };
}
