// Simple vanilla JS carousel
// - Auto-rotates every 3 seconds
// - No external libraries
// - Injects a banner/carousel at the top of <main>

(function () {
  // Simple image slides (data-URI SVG placeholders). Replace or extend with real image URLs if you like.
  const slides = [
    {
      alt: 'Freshly brewed coffee',
      img: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><rect width="100%" height="100%" fill="#f7efe9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="#6b3f2a" font-family="Arial">Freshly brewed — Titan Coffee Run</text></svg>`)
    },
    {
      alt: 'Iced nitro cold brew',
      img: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><rect width="100%" height="100%" fill="#eefaf6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="#155e63" font-family="Arial">Iced Nitro Cold Brew</text></svg>`)
    },
    {
      alt: 'Almond latte special',
      img: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420"><rect width="100%" height="100%" fill="#fff7f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40" fill="#8b5e3c" font-family="Arial">Almond Latte — Today's Special</text></svg>`)
    }
  ];

  // Inject minimal carousel styles
  const style = document.createElement('style');
  style.textContent = `
    .simple-carousel { max-width:1100px; margin:18px auto; position:relative; border-radius:12px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.06); }
    .simple-carousel .slides { position:relative; height:0; padding-bottom:35%; }
    .simple-carousel .slide { position:absolute; inset:0; opacity:0; transition:opacity .6s ease; display:flex; align-items:center; justify-content:center; }
    .simple-carousel .slide img { width:100%; height:100%; object-fit:cover; display:block; }
    .simple-carousel .slide.active { opacity:1; }
    .simple-carousel .indicators { position:absolute; right:12px; bottom:12px; display:flex; gap:8px; }
    .simple-carousel .dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,0.6); border:1px solid rgba(0,0,0,0.08); cursor:pointer; }
    .simple-carousel .dot.active { background:#fff; box-shadow:0 0 0 4px rgba(255,255,255,0.06) inset; }
    .simple-carousel .controls { position:absolute; top:50%; left:0; right:0; display:flex; justify-content:space-between; transform:translateY(-50%); pointer-events:none; }
    .simple-carousel .btn { pointer-events:auto; background:rgba(0,0,0,0.45); color:#fff; border:0; padding:8px 10px; margin:0 8px; border-radius:8px; cursor:pointer; }
    @media (max-width:640px){ .simple-carousel .slides{padding-bottom:50%} }
  `;
  document.head.appendChild(style);

  function buildCarousel() {
    const container = document.createElement('div');
    container.className = 'simple-carousel';

    const slidesWrap = document.createElement('div');
    slidesWrap.className = 'slides';
    container.appendChild(slidesWrap);

    slides.forEach((s, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide' + (i === 0 ? ' active' : '');
      slide.dataset.index = i;

      const img = document.createElement('img');
      img.src = s.img;
      img.alt = s.alt || '';

      slide.appendChild(img);
      slidesWrap.appendChild(slide);
    });

    // indicators
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
    let current = 0;
    const total = slideElems.length;
    let timer = null;
    const interval = 3000; // 3s

    function show(index) {
      if (index === current) return;
      slideElems[current].classList.remove('active');
      dotElems[current].classList.remove('active');
      current = (index + total) % total;
      slideElems[current].classList.add('active');
      dotElems[current].classList.add('active');
    }
    function nextSlide() { show(current + 1); }
    function prevSlide() { show(current - 1); }
    function start() { stop(); timer = setInterval(nextSlide, interval); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // Pause on hover/focus
    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);
    container.addEventListener('focusin', stop);
    container.addEventListener('focusout', start);

    // keyboard navigation
    container.tabIndex = -1;
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });

    start();
    return { container, nextSlide, prevSlide, show, start, stop };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildCarousel);
  } else {
    buildCarousel();
  }
})();