import { defineNuxtConfig } from "nuxt/config";

// Nuxt 3 configuration
export default defineNuxtConfig({
  ssr: true,
  srcDir: ".",

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      fbPixelId: process.env.NUXT_PUBLIC_FB_PIXEL_ID || "",
      snapPixelId: process.env.NUXT_PUBLIC_SNAP_PIXEL_ID || "",
      fbConversionApiToken:
        process.env.NUXT_PUBLIC_FB_CONVERSION_API_TOKEN || "",
    },
  },

  nitro: {
    preset: "node-server",
    compatibilityDate: "2025-09-11",
    routeRules: {
      "/api/**": {
        cors: true,
        headers: {
          "Access-Control-Allow-Methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
        },
      },
    },
  },

  typescript: {
    strict: false,
    typeCheck: false,
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith("swiper-"),
    },
  },

  app: {
    pageTransition: {
      name: "page",
      mode: "default", // Allow parallel transitions for faster SPA navigation
      duration: 50,
    },
    // htmlAttrs will be set dynamically in app.vue based on i18n locale
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "جو توفير - Go Tawfeer",
      meta: [
        {
          name: "description",
          content:
            "مرحباً بكم في جو توفير، وجهتك الأولى للتسوق الإلكتروني في المملكة العربية السعودية.",
        },
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [
        {
          rel: "icon",
          type: "image/webp",
          href: "https://admin.gotawfeer.com/storage/app/public/company/2025-10-16-68f0b5d9d7806.webp",
        },
        {
          rel: "apple-touch-icon",
          type: "image/webp",
          href: "https://admin.gotawfeer.com/storage/app/public/company/2025-10-16-68f0b5d9d7806.webp",
        },
        {
          rel: "stylesheet",
          href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
          crossorigin: "anonymous",
          referrerpolicy: "no-referrer",
        },
      ],
      script: [
        {
          hid: "gtm",
          innerHTML: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5796K66F');
          `,
          type: "text/javascript",
        },
        {
          hid: "clarity",
          innerHTML: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "updq0wpk1w");
          `,
          type: "text/javascript",
        },
        {
          hid: "tiktok",
          innerHTML: `
            (function (w, d, t) {
              w.TiktokAnalyticsObject = t;
              var ttq = w[t] = w[t] || [];
              ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
              ttq.setAndDefer = function (t, e) {
                t[e] = function () {
                  t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
                };
              };
              for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
              ttq.instance = function (t) {
                for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
                return e;
              };
              ttq.load = function (e, n) {
                var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
                ttq._i = ttq._i || {};
                ttq._i[e] = [];
                ttq._i[e]._u = r;
                ttq._t = ttq._t || {};
                ttq._t[e] = +new Date;
                ttq._o = ttq._o || {};
                ttq._o[e] = n || {};
                n = d.createElement("script");
                n.type = "text/javascript";
                n.async = !0;
                n.src = r + "?sdkid=" + e + "&lib=" + t;
                e = d.getElementsByTagName("script")[0];
                e.parentNode.insertBefore(n, e);
              };
              ttq.load('D5H3M7BC77U894MD6PB0');
              ttq.page();
            })(window, document, 'ttq');
          `,
          type: "text/javascript",
        },
        // {
        //   hid: 'facebook-pixel',
        //   innerHTML: `
        //     !function(f,b,e,v,n,t,s)
        //     {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        //     n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        //     if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        //     n.queue=[];t=b.createElement(e);t.async=!0;
        //     t.src=v;s=b.getElementsByTagName(e)[0];
        //     s.parentNode.insertBefore(t,s)}(window, document,'script',
        //     'https://connect.facebook.net/en_US/fbevents.js');
        //     fbq('init', '${process.env.NUXT_PUBLIC_FB_PIXEL_ID || ''}');
        //   `,
        //   type: 'text/javascript'
        // }
      ],
      // __dangerouslyDisableSanitizersByTagID: {
      //   gtm: ['innerHTML'],
      //   clarity: ['innerHTML'],
      //   tiktok: ['innerHTML'],
      //   'facebook-pixel': ['innerHTML']
      // }
    } as any,
  },

  experimental: {
    payloadExtraction: false, // Faster page transitions - don't extract payload
    viewTransition: false,
  },

  // Route Rules - Critical for proper SSR/SPA behavior
  // Note: SSR is enabled globally, so we only need to set prerender: false for dynamic routes
  routeRules: {
    // Homepage - no prerender (dynamic content)
    "/": {
      prerender: false,
    },

    // Shop pages - no prerender (dynamic content)
    "/shop": {
      prerender: false,
    },
    "/shop/**": {
      prerender: false,
    },

    // Dynamic product pages
    "/product/**": {
      prerender: false,
    },

    // Dynamic category pages
    "/category/**": {
      prerender: false,
    },

    // Dynamic brand pages
    "/brand/**": {
      prerender: false,
    },

    // Collection pages
    "/collection/**": {
      prerender: false,
    },

    // Static pages - no prerender (may have dynamic content)
    "/about": {
      prerender: false,
    },
    "/categories": {
      prerender: false,
    },
    "/brands": {
      prerender: false,
    },

    // Account pages - require auth (handled by middleware)
    "/account/**": {
      prerender: false,
    },

    // Checkout pages
    "/checkout/**": {
      prerender: false,
    },

    // English locale pages - same rules apply
    "/en/**": {
      prerender: false,
    },
  },

  modules: ["@nuxtjs/i18n"],

  plugins: [{ src: "~/plugins/bootstrap.client.ts", mode: "client" }],

  // @ts-expect-error i18n module runtime typing
  // i18n configuration
  i18n: {
    strategy: "prefix_except_default", // default (ar) without prefix, others with prefix (/en)
    defaultLocale: "ar",
    detectBrowserLanguage: false, // Disable auto-detection for consistent behavior
    langDir: "locales",
    locales: [
      {
        code: "ar",
        language: "ar",
        name: "العربية",
        dir: "rtl",
        file: "ar.json",
      },
      {
        code: "en",
        language: "en",
        name: "English",
        dir: "ltr",
        file: "en.json",
      },
    ],
    vueI18n: "./i18n.config.ts",
    compilation: {
      strictMessage: false,
      escapeHtml: false,
    },
    // Let Nuxt auto-discover routes instead of manual config
    // This ensures dynamic routes work correctly
    // customRoutes: 'config' was causing issues with dynamic routes
  },
});
