// plugins/snapchat-pixel.client.ts
interface Snaptr {
  (...args: any[]): void;
  queue: any[];
  handleRequest?: (...args: any[]) => void;
}

declare global {
  interface Window {
    snaptr?: Snaptr;
  }
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const pixelId = config.public.snapPixelId;

  if (!pixelId) return; // Snapchat Pixel Base Code
  (function (e: any, t: any, n: any) {
    if (e.snaptr) return;
    const a: Snaptr = function () {
      if (a.handleRequest) {
        a.handleRequest.apply(a, Array.from(arguments));
      } else {
        a.queue.push(arguments);
      }
    } as Snaptr;

    a.queue = [];
    const s = t.createElement(n);
    s.async = true;
    s.src = "https://sc-static.net/scevent.min.js";
    const r = t.getElementsByTagName(n)[0];
    r.parentNode.insertBefore(s, r);
    e.snaptr = a;
  })(window, document, "script");

  // تهيئة البيكسل وتتبع الصفحة
  window.snaptr?.("init", pixelId);
  window.snaptr?.("track", "PAGE_VIEW");
});
