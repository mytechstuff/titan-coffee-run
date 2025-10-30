// Simple vanilla JS carousel (section overview)
// - Auto-rotates every 3 seconds (3000ms)
// - No external libraries (pure DOM + CSS)
// - Injects a banner/carousel at the top of <main>
//
// This file is organized by conceptual sections. Each section contains a short
// explanation followed by the code that implements it. The goal is to make the
// script approachable for students learning modern DOM programming and state
// management in JavaScript.
//
// Sections:
// 1. Data model — the `slides` array (slide metadata)
// 2. Styles injection — small, component-scoped CSS appended to <head>
// 3. DOM construction — buildCarousel(): creates carousel DOM nodes
// 4. Controls & indicators — event wiring for prev/next and dot buttons
// 5. State management & timing — `current`, `start`, `stop`, and `show`
// 6. Accessibility & interaction patterns — keyboard, hover/focus pause
// 7. Bootstrap — run on DOMContentLoaded or immediately if ready
//
// Teaching notes (what students should focus on):
// - Separation of concerns: model vs view vs controller. `slides` is the model,
//   DOM nodes are the view, and event handlers + timer are the controller.
// - Idempotence: building the carousel should be safe if called once; avoid
//   calling build multiple times without teardown to prevent leaks.
// - Progressive enhancement: the page content remains readable if JS fails;
//   the carousel adds visual enhancements only.

(function () {
  // --- Data model: slides array ---
  // This is the canonical source of truth for the carousel. Each object represents
  // one slide (a pure data object). In a more complex app this might come from
  // an API or CMS. Keeping the data model separate makes the rendering code
  // deterministic and testable.
  // Fields: { alt, img } where `img` is a URL or data-URI and `alt` is the
  // accessible textual description for screen readers.
  // Slide sources are now external image files stored under public/assets/img.
  // We store only filenames here so other pages (root vs public preview) can
  // resolve the correct path at runtime using resolveImagePath().
  const slides = [
    // Slides reference files under public/assets/img/.
    // Provide optional `objectPosition` and `srcsetArray` for responsive crops.
    {
      alt: 'Freshly brewed coffee',
      img: 'banner-hero.jpg',
      objectPosition: 'top center'
    },
    {
      alt: 'Iced nitro cold brew',
      img: 'carousel-1.jpg',
      objectPosition: 'center center'
    },
    {
      alt: "Almond latte special",
      img: 'carousel-2.jpg',
      objectPosition: 'top center'
    },
    {
      alt: 'Student study special',
      img: 'carousel-4.png',
      objectPosition: 'center top'
    }
  ];

  // Helper: resolve the correct relative path for images depending on whether
  // the current document is the root index or the demo page inside /public/.
  // - If the page lives under /public/ (e.g., public/index.html), images are
  //   in ./assets/img/
  // - Otherwise (root index.html), images are in ./public/assets/img/
  // Build candidate absolute URLs for an asset filename using the module base
  // (import.meta.url). We try several likely locations so the same code works
  // when previewing with Live Server, from /public, or on GitHub Pages where the
  // site may be served from a repo subpath.
  function buildImageCandidates(filename) {
    try {
      // Use relative paths from this module to construct absolute URLs.
      const candidates = [];

      // If the site is hosted under a repo subpath (GitHub Pages), derive
      // the repo base from the pathname (first non-empty segment) and try
      // repo-prefixed absolute URLs. Be conservative: skip this when the
      // first segment looks like a filename (e.g. 'index.html') to avoid
      // producing '/index.html/public/...' on local previews.
      try {
        const segs = location.pathname.split('/').filter(Boolean);
        if (segs.length && !segs[0].includes('.') && segs[0] !== 'public') {
          const repoBase = '/' + segs[0];
          candidates.push(location.origin + repoBase + '/public/assets/img/' + filename);
          candidates.push(location.origin + repoBase + '/assets/img/' + filename);
        }
      } catch (e) {
        // ignore
      }

      // Module-relative candidates (covers Live Server and relative previews)
      candidates.push(new URL('../public/assets/img/' + filename, import.meta.url).href);
      candidates.push(new URL('../assets/img/' + filename, import.meta.url).href);
      candidates.push(new URL('./public/assets/img/' + filename, import.meta.url).href);
      candidates.push(new URL('./assets/img/' + filename, import.meta.url).href);
      // fallback using location origin + path
      candidates.push(location.origin + '/public/assets/img/' + filename);
      candidates.push(location.origin + '/assets/img/' + filename);
      // Deduplicate while preserving order
      return [...new Set(candidates)];
    } catch (e) {
      return ['./public/assets/img/' + filename, './assets/img/' + filename];
    }
  }

  // Convenience for srcset building: return the most likely candidate (first)
  function resolveImagePath(filename) {
    const c = buildImageCandidates(filename);
    return c && c.length ? c[0] : './public/assets/img/' + filename;
  }

  // --- Styles injection ---
  // We append a small stylesheet programmatically so the carousel is self-contained.
  // This is a lightweight pattern used for isolated components (no build step).
  // Pros: the component can be dropped into any page and will carry its styles.
  // Cons: harder to override globally; for larger apps prefer separate CSS files
  // and class scoping via BEM or CSS modules.
  const style = document.createElement('style');
  style.textContent = `
    /* Restored the stable overlay carousel layout used previously.
       This uses a fixed aspect container (padding-bottom) and absolutely
       positioned slides so only the active slide is visible and clickable.
       It avoids flicker and unstable click targets caused by stacked,
       flowing slide elements. */
    .simple-carousel { max-width:1100px; margin:18px auto; position:relative; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
    .simple-carousel .slides { position:relative; height:0; padding-bottom:35%; }
    .simple-carousel .slide { position:absolute; inset:0; opacity:0; transition:opacity .6s ease; display:flex; align-items:center; justify-content:center; pointer-events:none; }
  .simple-carousel .slide img { width:100%; height:100%; object-fit:contain; display:block; }
    .simple-carousel .slide.active { opacity:1; pointer-events:auto; }
    .simple-carousel .indicators { position:absolute; right:12px; bottom:12px; display:flex; gap:8px; }
    .simple-carousel .dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,0.6); border:1px solid rgba(0,0,0,0.08); cursor:pointer; }
    .simple-carousel .dot.active { background:#fff; box-shadow:0 0 0 4px rgba(255,255,255,0.06) inset; }
    .simple-carousel .controls { position:absolute; top:50%; left:0; right:0; display:flex; justify-content:space-between; transform:translateY(-50%); pointer-events:none; }
    .simple-carousel .btn { pointer-events:auto; background:rgba(0,0,0,0.45); color:#fff; border:0; padding:8px 10px; margin:0 8px; border-radius:8px; cursor:pointer; }
    @media (max-width:640px){ .simple-carousel .slides{padding-bottom:50%} }
  `;
  document.head.appendChild(style);

  // --- DOM construction ---
  // buildCarousel is responsible for creating the DOM structure for the carousel,
  // wiring event listeners, and starting the autoplay timer. It returns an
  // interface object so callers can control the instance (start/stop/show).
  function buildCarousel() {
    const container = document.createElement('div');
    container.className = 'simple-carousel';
    // Accessibility: announceable region and roledescription
    container.setAttribute('role', 'region');
    container.setAttribute('aria-roledescription', 'carousel');
    container.setAttribute('aria-label', 'Homepage hero carousel');

    const slidesWrap = document.createElement('div');
    slidesWrap.className = 'slides';
    container.appendChild(slidesWrap);

  // offscreen status for screen readers to announce slide changes
  const statusEl = document.createElement('div');
  statusEl.className = 'sr-only';
  statusEl.setAttribute('aria-live', 'polite');
  container.appendChild(statusEl);

    // Diagnostic panel: show resolved image URLs and load status for each slide.
    const debug = document.createElement('div');
    debug.style.cssText = 'font-size:.85rem;color:var(--muted);margin-top:.5rem;max-width:1100px;margin-left:auto;margin-right:auto;padding:0 1rem';
    debug.id = 'carousel-debug';
    // append below the carousel container so maintainers can see load status
    container.insertAdjacentElement('afterend', debug);

    // 1) Create slide elements from the `slides` data.
    //    Each slide receives a `data-index` so we can correlate slides with
    //    indicators without relying on DOM order traversal at runtime.
    slides.forEach((s, i) => {
      const slide = document.createElement('div');
      // mark the first slide active so the CSS reveals it by default
      slide.className = 'slide' + (i === 0 ? ' active' : '');
      slide.dataset.index = i;

  const img = document.createElement('img');
  // Provide intrinsic dimensions to reduce layout shift
  img.width = 1200;
  img.height = 420;
      // Use resolveImagePath to find the image under public/assets/img or
      // public preview's assets folder. Add a runtime fallback so we try both
      // likely locations in case the server maps the site root differently.
      // This helps when previewing from `/` vs `/public/` without manual edits.
      const primarySrc = resolveImagePath(s.img);
      const fallbackSrc = primarySrc.replace('./public/assets/img/', './assets/img/');
      // Try candidate URLs sequentially so the browser resolves the one that
      // actually exists on the current server mapping (Live Server, GH Pages, etc.).
      const candidates = buildImageCandidates(s.img);
  let cIndex = 0;
  // Expose candidate list on the element for easier inspection in DevTools
  try { img.dataset.candidates = candidates.join(','); } catch (e) {}
  console.debug && console.debug('carousel: slide', i + 1, 'candidates', candidates);
  img.src = candidates[cIndex];
      img.onerror = () => {
        if (cIndex < candidates.length - 1) {
          cIndex += 1;
          img.src = candidates[cIndex];
        }
      };
      img.alt = s.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      // apply optional object position per-slide to control cropping point
      if (s.objectPosition) img.style.objectPosition = s.objectPosition;
      // wire up responsive srcset if provided
      if (Array.isArray(s.srcsetArray) && s.srcsetArray.length) {
        // Build srcset using our resolveImagePath helper (first candidate).
        img.srcset = s.srcsetArray.map(x => `${resolveImagePath(x.file)} ${x.width}w`).join(', ');
        img.sizes = s.sizes || '(max-width:640px) 100vw, 1100px';
      }

      slide.appendChild(img);
      slidesWrap.appendChild(slide);
      // Add simple load/error reporting for diagnostics
      (function (imgRef, slideIndex, candidateList) {
        const entry = document.createElement('div');
        entry.textContent = `Slide ${slideIndex + 1}: trying ${candidateList.join(' | ')}`;
        entry.style.opacity = '0.9';
        debug.appendChild(entry);
        imgRef.addEventListener('load', () => {
          entry.textContent = `Slide ${slideIndex + 1}: loaded ${imgRef.currentSrc || imgRef.src}`;
          entry.style.color = 'green';
        });
        imgRef.addEventListener('error', () => {
          entry.textContent = `Slide ${slideIndex + 1}: failed ${imgRef.src}`;
          entry.style.color = 'crimson';
        });
      })(img, i, candidates);
    });

    // indicators
    // 2) Create indicators (dots) and wire them to the slides.
    //    Using buttons gives us keyboard accessibility for free. Each button
    //    stores a `data-index` mirroring the slides' indices; clicking a dot
    //    calls `show(index)` which centralizes state updates.
    const indicators = document.createElement('div');
    indicators.className = 'indicators';
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.type = 'button';
      d.dataset.index = i;
      d.setAttribute('aria-label', `Go to slide ${i + 1}`);
      d.addEventListener('click', () => show(parseInt(d.dataset.index, 10)));
      indicators.appendChild(d);
    });
    container.appendChild(indicators);

    // simple prev/next
    const controls = document.createElement('div');
    controls.className = 'controls';
    const prev = document.createElement('button');
    prev.className = 'btn prev';
    prev.type = 'button';
    prev.textContent = '‹';
    const next = document.createElement('button');
    next.className = 'btn next';
    next.type = 'button';
    next.textContent = '›';
    prev.addEventListener('click', prevSlide);
    next.addEventListener('click', nextSlide);
    controls.appendChild(prev);
    controls.appendChild(next);
    container.appendChild(controls);

    // insert at top of main (preserve requested location)
    const main = document.querySelector('main') || document.body;
    main.insertBefore(container, main.firstChild);

    const slideElems = slidesWrap.querySelectorAll('.slide');
    const dotElems = indicators.querySelectorAll('.dot');

  

    // --- State management & timing ---
    // `current` holds the index of the visible slide. We keep this as the
    // single source of truth for which slide is active. All UI updates (class
    // toggles, aria updates if added) derive from this value.
    let current = 0;

    // `total` caches the number of slides so we avoid querying the DOM inside
    // tight loops. This is a small optimization and makes reasoning easier.
    const total = slideElems.length;

    // `timer` stores the ID returned by setInterval so we can stop it later.
    // It is `null` when autoplay is paused or not running.
    let timer = null;

    // Autoplay interval (ms). Keep this constant near the top of the file so
    // it's easy to tweak as a single-setting tuning parameter for UX tests.
    const interval = 3000; // 3s

    // `show(index)` is the single function that performs the visible-state
    // transition. Responsibilities:
    // - normalize the incoming index (allow negative values or values >= total)
    // - update the `current` state
    // - mutate the DOM to reflect the new state (toggle `.active` classes)
    // - (optional) update accessibility attributes such as `aria-hidden` or
    //   `aria-current` when present
    // Centralizing these steps in one function reduces bugs caused by
    // duplicated state changes in multiple event handlers.
    function show(index) {
      // normalize to [0, total)
      const normalized = ((index % total) + total) % total;
      if (normalized === current) return; // no-op if already visible

      // remove active from previous
      slideElems[current].classList.remove('active');
      dotElems[current].classList.remove('active');

      // update state
      current = normalized;

      // add active to new
      slideElems[current].classList.add('active');
      dotElems[current].classList.add('active');

      // Announce slide change for screen readers
      try {
        const alt = slides[current] && slides[current].alt ? slides[current].alt : (`Slide ${current+1}`);
        statusEl.textContent = `Slide ${current+1} of ${total}: ${alt}`;
      } catch (e) {}
    }

    // Convenience wrappers keep call sites readable. They delegate to show()
    // so all side-effects remain in one place.
    function nextSlide() { show(current + 1); }
    function prevSlide() { show(current - 1); }

    // Start/stop control the autoplay timer. `start()` first ensures any
    // existing timer is cleared (avoid double timers after repeated starts),
    // then begins a fresh interval. `stop()` clears and nulls the timer.
    // These are intentionally simple; in a larger app you might debounce or
    // back off after manual interaction to be less intrusive.
    function start() { stop(); timer = setInterval(nextSlide, interval); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // Interaction wiring: pause autoplay on hover/focus, resume on leave.
    // This pattern improves accessibility and reduces motion for users who are
    // interacting with the control. We listen for `focusin`/`focusout` so that
    // keyboard users (tabbing into buttons) also pause the rotation.
    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);
    container.addEventListener('focusin', stop);
    container.addEventListener('focusout', start);

    // keyboard navigation: attach left/right arrows to move between slides.
    // We set tabIndex so the container can receive keyboard events when focused.
    // For clarity, this simple handler does not stop propagation; a larger
    // component might provide finer control or route events to focused child
    // controls instead.
    container.tabIndex = -1;
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    // start autoplay by default
    start();
    return { container, nextSlide, prevSlide, show, start, stop };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildCarousel);
  } else {
    buildCarousel();
  }
})();