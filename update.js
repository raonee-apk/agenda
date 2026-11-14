// Atualização da versão web: o app instalado pelo site (PWA) costuma ficar
// aberto em segundo plano por dias e não recarrega sozinho. Aqui ele confere o
// web_build.json (gravado pelo scripts/deploy_web.sh, que também troca o
// 20261114100133 abaixo) e recarrega quando a pessoa volta ao app, nunca no meio
// do uso.
(function () {
  const BUILD = '20261114100133';
  if (BUILD.startsWith('__')) return; // flutter run / build sem o deploy
  const CHECK_EVERY = 30 * 60 * 1000;
  const MIN_AWAY = 60 * 1000;
  let pending = false;
  let hiddenAt = 0;

  async function latest() {
    try {
      const res = await fetch('web_build.json', { cache: 'no-store' });
      return res.ok ? (await res.json()).build : null;
    } catch (_) {
      return null;
    }
  }

  async function check() {
    const b = await latest();
    pending = b != null && b !== BUILD;
    return b;
  }

  async function apply(build) {
    // Evita laço se o servidor ainda entrega a página antiga.
    try {
      if (sessionStorage.getItem('uai_reloaded_for') === build) return;
      sessionStorage.setItem('uai_reloaded_for', build);
    } catch (_) {}
    // Os arquivos principais vão com ?v=<build>; estes não, então renova o cache deles.
    const fresh = ['./', 'AssetManifest.bin', 'AssetManifest.bin.json', 'FontManifest.json',
      'assets/fonts/MaterialIcons-Regular.otf'];
    await Promise.all(fresh.map((u) => fetch(u, { cache: 'reload' }).catch(() => null)));
    location.reload();
  }

  // Ao abrir: se a página veio de um cache antigo, já troca antes de a pessoa usar.
  check().then((b) => pending && apply(b));
  setInterval(check, CHECK_EVERY);

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    if (!hiddenAt || Date.now() - hiddenAt < MIN_AWAY) return;
    const b = await check();
    if (pending) apply(b);
  });
})();
