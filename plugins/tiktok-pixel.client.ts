declare global {
  interface Window {
    ttq?: any;
  }
}

export default defineNuxtPlugin(() => {
  const { tiktokPixelId } = useRuntimeConfig().public;
  if (!process.client || !tiktokPixelId) return;

  if (window.ttq) return; // منع التكرار

  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
    ];
    ttq.setAndDefer = function (t: any, e: any) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq.load = function (id: string) {
      const s = d.createElement("script");
      s.async = true;
      s.src =
        "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" +
        id +
        "&lib=" +
        t;
      const x = d.getElementsByTagName("script")[0];
      x.parentNode?.insertBefore(s, x);
    };

    ttq.load(tiktokPixelId);
    ttq.page();
  })(window, document, "ttq");

  console.log("[TikTok Pixel] Initialized");
});
