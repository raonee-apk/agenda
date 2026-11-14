// Ponte do Web Push para o app (lib/core/web_push_web.dart).
// subscribe() precisa partir de um toque: o navegador só pede a permissão assim.
(function () {
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = () =>
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function keyBytes(b64) {
    const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  }

  const asJson = (sub) => {
    const j = sub.toJSON();
    return JSON.stringify({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth });
  };

  async function registration() {
    const reg = await navigator.serviceWorker.register('push-sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function current() {
    if (!supported() || Notification.permission !== 'granted') return null;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? asJson(sub) : null;
  }

  async function subscribe(key) {
    if (!supported()) return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const reg = await registration();
    const options = { userVisibleOnly: true, applicationServerKey: keyBytes(key) };
    let sub;
    try {
      sub = await reg.pushManager.subscribe(options);
    } catch (_) {
      // Assinatura antiga com outra chave: troca.
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      sub = await reg.pushManager.subscribe(options);
    }
    return asJson(sub);
  }

  async function unsubscribe() {
    const reg = supported() ? await navigator.serviceWorker.getRegistration() : null;
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  }

  window.uaiPush = {
    supported,
    ios,
    standalone,
    permission: () => (supported() ? Notification.permission : 'unsupported'),
    current,
    subscribe,
    unsubscribe,
  };
})();
