/**
 * Olympos Sync — universal website embed.
 *
 * Renders a business's published check-ins as a real HTML gallery (not an
 * iframe) directly into the host page's DOM, plus JSON-LD structured data so
 * Google can index the jobs and images as part of the customer's own site.
 *
 * Usage on ANY site (Next.js, Astro, WordPress, plain HTML):
 *   <div data-olympos-widget="BUSINESS_ID"></div>
 *   <script src="https://YOUR_DOMAIN/embed.js" async></script>
 */
(function () {
  "use strict";

  // Resolve our own origin from this script's src so the widget keeps working
  // regardless of which domain Olympos is deployed on.
  var thisScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("embed.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  var ORIGIN = "https://olympossync.com";
  try {
    if (thisScript && thisScript.src) {
      ORIGIN = new URL(thisScript.src).origin;
    }
  } catch (e) {
    /* keep fallback */
  }

  var STYLE_ID = "olympos-widget-styles";
  var CSS =
    ".olv{--olv-radius:14px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;box-sizing:border-box}" +
    ".olv *{box-sizing:border-box}" +
    ".olv__head{margin:0 0 16px}" +
    ".olv__title{font-size:1.25rem;font-weight:700;margin:0}" +
    ".olv__sub{font-size:.875rem;color:#64748b;margin:2px 0 0}" +
    ".olv__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}" +
    ".olv__card{border:1px solid #e2e8f0;border-radius:var(--olv-radius);overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:box-shadow .2s,transform .2s}" +
    ".olv__card:hover{box-shadow:0 10px 25px -5px rgba(15,23,42,.12);transform:translateY(-2px)}" +
    ".olv__cover{position:relative;aspect-ratio:4/3;background:#f1f5f9;overflow:hidden;border:0;padding:0;cursor:pointer;width:100%;display:block}" +
    ".olv__cover img,.olv__cover video{width:100%;height:100%;object-fit:cover;display:block;transition:transform .3s}" +
    ".olv__cover:hover img{transform:scale(1.05)}" +
    ".olv__badge{position:absolute;left:10px;top:10px;background:rgba(15,23,42,.78);color:#fff;font-size:.7rem;font-weight:600;padding:3px 8px;border-radius:999px}" +
    ".olv__body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}" +
    ".olv__addr{font-size:.95rem;font-weight:600;margin:0;line-height:1.3}" +
    ".olv__desc{font-size:.85rem;color:#475569;margin:0;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}" +
    ".olv__thumbs{display:flex;gap:6px;margin-top:4px}" +
    ".olv__thumb{width:44px;height:44px;border-radius:8px;overflow:hidden;border:0;padding:0;cursor:pointer;background:#f1f5f9;flex:0 0 auto}" +
    ".olv__thumb img,.olv__thumb video{width:100%;height:100%;object-fit:cover;display:block}" +
    ".olv__date{font-size:.75rem;color:#94a3b8;margin:auto 0 0}" +
    ".olv__foot{margin-top:16px;text-align:right}" +
    ".olv__foot a{font-size:.75rem;color:#94a3b8;text-decoration:none}" +
    ".olv__foot a:hover{color:#475569}" +
    ".olv__lb{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.86);padding:16px}" +
    ".olv__lb img,.olv__lb video{max-height:90vh;max-width:95vw;border-radius:12px;object-fit:contain}" +
    ".olv__close{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:999px;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:1.5rem;line-height:1;cursor:pointer}" +
    ".olv__close:hover{background:rgba(255,255,255,.22)}" +
    ".olv__empty{padding:32px;text-align:center;color:#64748b;font-size:.9rem;border:1px dashed #cbd5e1;border-radius:var(--olv-radius)}";

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch (e) {
      return "";
    }
  }

  function altFor(businessName, job) {
    var what = (job.description || "Completed job").replace(/\s+/g, " ").trim();
    var short = what.length > 80 ? what.slice(0, 77) + "…" : what;
    return businessName + " — " + short + " at " + job.full_address;
  }

  function mediaTag(media, cls, alt) {
    if (media.type === "video") {
      return (
        '<video src="' +
        esc(media.url) +
        '" muted playsinline aria-label="' +
        esc(alt) +
        '" class="' +
        cls +
        '"></video>'
      );
    }
    return (
      '<img src="' +
      esc(media.url) +
      '" alt="' +
      esc(alt) +
      '" loading="lazy" class="' +
      cls +
      '">'
    );
  }

  // Lightbox shared across all widgets on the page.
  var lb = null;
  function openLightbox(url, type) {
    closeLightbox();
    lb = document.createElement("div");
    lb.className = "olv__lb";
    lb.innerHTML =
      '<button class="olv__close" aria-label="Close">&times;</button>' +
      (type === "video"
        ? '<video src="' + esc(url) + '" controls autoplay></video>'
        : '<img src="' + esc(url) + '" alt="">');
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.className === "olv__close") closeLightbox();
    });
    document.body.appendChild(lb);
    document.addEventListener("keydown", onKey);
  }
  function closeLightbox() {
    if (lb) {
      document.removeEventListener("keydown", onKey);
      lb.remove();
      lb = null;
    }
  }
  function onKey(e) {
    if (e.key === "Escape") closeLightbox();
  }

  function buildJsonLd(business, jobs, mount) {
    var images = [];
    jobs.forEach(function (job) {
      (job.media || []).forEach(function (m) {
        if (m.type === "image") {
          images.push({
            "@type": "ImageObject",
            contentUrl: m.url,
            caption: altFor(business.name, job),
            description: job.description || job.full_address,
            contentLocation: { "@type": "Place", address: job.full_address },
            uploadDate: job.created_at,
          });
        }
      });
    });
    var schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: business.name,
      image: images.slice(0, 30),
      subjectOf: jobs.slice(0, 30).map(function (job) {
        return {
          "@type": "CreativeWork",
          about: job.description || job.full_address,
          contentLocation: { "@type": "Place", address: job.full_address },
          dateCreated: job.created_at,
        };
      }),
    };
    var tag = document.createElement("script");
    tag.type = "application/ld+json";
    tag.textContent = JSON.stringify(schema);
    mount.appendChild(tag);
  }

  function render(mount, data) {
    var business = data.business || { name: "Our work" };
    var jobs = data.check_ins || [];

    var root = document.createElement("div");
    root.className = "olv";

    if (jobs.length === 0) {
      root.innerHTML =
        '<div class="olv__empty">No published jobs yet.</div>';
      mount.innerHTML = "";
      mount.appendChild(root);
      return;
    }

    var html =
      '<div class="olv__head">' +
      '<h2 class="olv__title">' +
      esc(business.name) +
      "</h2>" +
      '<p class="olv__sub">' +
      jobs.length +
      " recent job" +
      (jobs.length === 1 ? "" : "s") +
      "</p></div>";

    html += '<div class="olv__grid">';
    jobs.forEach(function (job) {
      var media = job.media || [];
      var cover = media[0];
      var alt = altFor(business.name, job);
      html += '<article class="olv__card">';
      if (cover) {
        html +=
          '<button class="olv__cover" aria-label="' +
          esc(alt) +
          '" data-url="' +
          esc(cover.url) +
          '" data-type="' +
          esc(cover.type) +
          '">' +
          mediaTag(cover, "", alt) +
          '<span class="olv__badge">' +
          (media.length > 1 ? media.length + " photos" : "1 photo") +
          "</span></button>";
      }
      html += '<div class="olv__body">';
      html += '<p class="olv__addr">' + esc(job.full_address) + "</p>";
      if (job.description) {
        html += '<p class="olv__desc">' + esc(job.description) + "</p>";
      }
      if (media.length > 1) {
        html += '<div class="olv__thumbs">';
        media.slice(1, 5).forEach(function (m) {
          html +=
            '<button class="olv__thumb" aria-label="' +
            esc(alt) +
            '" data-url="' +
            esc(m.url) +
            '" data-type="' +
            esc(m.type) +
            '">' +
            mediaTag(m, "", alt) +
            "</button>";
        });
        html += "</div>";
      }
      html += '<p class="olv__date">' + fmtDate(job.created_at) + "</p>";
      html += "</div></article>";
    });
    html += "</div>";

    html +=
      '<div class="olv__foot"><a href="' +
      ORIGIN +
      '" target="_blank" rel="noopener">Powered by Olympos Sync</a></div>';

    root.innerHTML = html;

    // Wire up lightbox triggers.
    root.querySelectorAll("[data-url]").forEach(function (el) {
      el.addEventListener("click", function () {
        openLightbox(el.getAttribute("data-url"), el.getAttribute("data-type"));
      });
    });

    mount.innerHTML = "";
    mount.appendChild(root);
    buildJsonLd(business, jobs, mount);
  }

  function hydrate(mount) {
    var businessId = mount.getAttribute("data-olympos-widget");
    if (!businessId || mount.getAttribute("data-olv-done") === "1") return;
    mount.setAttribute("data-olv-done", "1");

    fetch(ORIGIN + "/api/widget/" + encodeURIComponent(businessId))
      .then(function (res) {
        if (!res.ok) throw new Error("widget fetch failed");
        return res.json();
      })
      .then(function (data) {
        injectStyles();
        render(mount, data);
      })
      .catch(function () {
        mount.setAttribute("data-olv-done", "0");
      });
  }

  function init() {
    var mounts = document.querySelectorAll("[data-olympos-widget]");
    for (var i = 0; i < mounts.length; i++) hydrate(mounts[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
