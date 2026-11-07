# Spire critique → brief: Implementation Plan

> Pentru implementare: superpowers:subagent-driven-development; pe main, conform instrucțiunii existente de colaborare.

**Goal:** observații diverse și scurte, propuneri la final, răspunsuri memorate pentru campanie.
**Architecture:** reguli pure în critique.ts; întrebări locale și storage al extensiei; contract validat de bridge și reutilizarea Answers/fluxului campaniei.
**Tech stack:** JavaScript MV3, React/TypeScript, Zod, Vitest, Playwright.

- [x] Păstrează corecția namespace SVG și concizia deja implementate; validează și salvează înainte de lucrul nou.
- [x] Reguli: diversificare și prioritate pentru constatări la nivel de pagină, o observație scurtă, fix formulat la condițional pentru rezumat; teste pure RED/GREEN; regenerează critique.js.
- [x] Flux: formular după rezumat, storage per origină cu salvare/uitare explicite, handshake cu iframe-ul; extinde bridge/Answers/campanie/prompt; răspunsuri editabile păstrate după analiză; teste pure și browser.
- [x] Integrare: teste pentru motor + extensie + campanie, review și npm run check; commit, integrare remote fără pierderea muncii colegului, push autorizat.
- [x] Actualizare AI: adaptor client ask()/api/ai cu rubrică critique compactă, o singură cerere și schemă validată; engine-ul rămâne colegului.
- [x] Bridge AI ascuns în iframe, captură opțională, ID de corelare/origini, timeout și proveniență mock/rezervă; păstrează memoria și campania.
