// Configurarea extensiei. Script clasic (fără module): rulează atât în
// service worker (importScripts), cât și injectat în pagină înaintea lui content.js.
// APP_URL se schimbă pe adresa Vercel la deploy (apoi reîncarci extensia).
(function () {
  var APP_URL = "http://localhost:5173";
  globalThis.SPIRE_CONFIG = {
    BUILD: "marina-sections-20261107-2",
    APP_URL: APP_URL,
    APP_ORIGIN: new URL(APP_URL).origin,
  };
})();
