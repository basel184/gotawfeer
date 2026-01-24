export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const pixelId = config.public.fbPixelId;

  if (!pixelId) return; // 👇 تجاهل TypeScript لكود Meta (ده مقصود)
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;

    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };

    if (!f._fbq) f._fbq = n;

    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];

    t = b.createElement(e);
    t.async = true;
    t.src = v;

    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );

  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
});
