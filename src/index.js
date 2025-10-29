// /c:/Users/mikec/Titan Coffee Run/src/index.js
// Vanilla JS carousel that injects a 3-4 picture carousel into the main page.
// Images are embedded SVG data-URIs representing a college-run coffee shop.

(function () {
    // Utility to convert SVG markup to data URI
    function svgDataURI(svg) {
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    // Four SVG "photos" that represent a college coffee shop vibe
    const svgs = [
        {
            caption: 'Campus Coffee — Study Fuel',
            svg: `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
                <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                        <stop offset="0" stop-color="#f7d794"/>
                        <stop offset="1" stop-color="#f0932b"/>
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="#f1f2f6"/>
                <rect x="60" y="60" width="1080" height="420" rx="18" fill="url(#g1)" />
                <g transform="translate(160,140)">
                    <rect x="0" y="0" width="480" height="360" rx="24" fill="#fff" stroke="#eccc68" stroke-width="6"/>
                    <g transform="translate(40,36)">
                        <ellipse cx="200" cy="160" rx="100" ry="70" fill="#6f4e37" />
                        <circle cx="150" cy="140" r="12" fill="#fff" opacity="0.35"/>
                        <text x="20" y="320" fill="#222" font-size="36" font-family="Arial">College Run Coffee</text>
                    </g>
                </g>
                <text x="720" y="520" fill="#2f3542" font-size="28" font-family="Arial">Open late for study sessions</text>
            </svg>`
        },
        {
            caption: 'Friendly Baristas & Fresh Brews',
            svg: `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
                <rect width="100%" height="100%" fill="#ffffff"/>
                <g transform="translate(80,60)">
                    <rect x="0" y="0" width="1040" height="555" rx="20" fill="#f8f9fa" stroke="#dfe4ea"/>
                    <g transform="translate(60,40)">
                        <!-- storefront -->
                        <rect x="0" y="0" width="440" height="360" rx="16" fill="#fff"/>
                        <rect x="20" y="20" width="400" height="60" rx="8" fill="#2f3542"/>
                        <text x="40" y="60" fill="#fff" font-size="30" font-family="Arial">Campus Coffee</text>
                        <!-- barista figure -->
                        <g transform="translate(520,40)">
                            <circle cx="60" cy="60" r="40" fill="#ffd19c"/>
                            <rect x="20" y="110" width="80" height="140" rx="12" fill="#6c5ce7"/>
                            <rect x="10" y="250" width="100" height="30" rx="8" fill="#2d3436"/>
                            <path d="M60 90 q40 20 80 0" stroke="#fff" stroke-width="6" fill="none" />
                        </g>
                        <!-- coffee cup close-up -->
                        <g transform="translate(260,140)">
                            <ellipse cx="60" cy="40" rx="60" ry="18" fill="#fff"/>
                            <rect x="0" y="40" width="120" height="120" rx="20" fill="#6f4e37"/>
                            <ellipse cx="60" cy="40" rx="40" ry="12" fill="#f7f2e7"/>
                            <text x="0" y="220" fill="#2f3542" font-size="22" font-family="Arial">Baristas who know your name</text>
                        </g>
                    </g>
                </g>
            </svg>`
        },
        {
            caption: 'Late-night Study Specials',
            svg: `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
                <rect width="100%" height="100%" fill="#0f1724"/>
                <g transform="translate(80,60)">
                    <rect x="0" y="0" width="1040" height="555" rx="20" fill="#0b1220" stroke="#1f2937"/>
                    <text x="80" y="110" fill="#fef3c7" font-size="42" font-family="Arial">Study Nights</text>
                    <g transform="translate(80,160)">
                        <rect x="0" y="0" width="420" height="300" rx="18" fill="#111827" stroke="#374151"/>
                        <g transform="translate(40,28)">
                            <ellipse cx="150" cy="70" rx="90" ry="38" fill="#1f2937"/>
                            <rect x="70" y="80" width="160" height="120" rx="18" fill="#6b7280"/>
                            <text x="0" y="240" fill="#c7d2fe" font-size="20" font-family="Arial">Midnight lattes & quiet corners</text>
                        </g>
                    </g>
                    <g transform="translate(620,160)">
                        <text x="0" y="40" fill="#fff" font-size="28" font-family="Arial">Open until 2 AM</text>
                        <g transform="translate(0,60)">
                            <rect x="0" y="0" width="360" height="200" rx="14" fill="#111827"/>
                            <circle cx="80" cy="80" r="48" fill="#f97316"/>
                            <text x="150" y="95" fill="#fff" font-size="20" font-family="Arial">Quiet study spots</text>
                        </g>
                    </g>
                </g>
            </svg>`
        },
        {
            caption: 'Campus Events & Community',
            svg: `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
                <rect width="100%" height="100%" fill="#fff8f0"/>
                <g transform="translate(80,60)">
                    <rect x="0" y="0" width="1040" height="555" rx="20" fill="#fff" stroke="#f1c40f"/>
                    <g transform="translate(40,40)">
                        <text x="0" y="40" fill="#2d3436" font-size="34" font-family="Arial">Weekend Open Mic & Events</text>
                        <g transform="translate(0,80)">
                            <rect x="0" y="0" width="300" height="220" rx="12" fill="#ffe3d8"/>
                            <circle cx="60" cy="60" r="34" fill="#ff7f50"/>
                            <rect x="340" y="0" width="400" height="220" rx="12" fill="#dff7e1"/>
                            <text x="360" y="60" fill="#2f3542" font-size="20" font-family="Arial">Live music nights</text>
                        </g>
                    </g>
                </g>
            </svg>`
        }
    ];

    // Build slide objects with data URIs
    const slides = svgs.map((s) => ({
        img: svgDataURI(s.svg),
        caption: s.caption
    }));

    // Inject styles scoped to this carousel
    const style = document.createElement('style');
    style.textContent = `
    .ccr-carousel { --w:100%; max-width:1100px; margin:24px auto; position:relative; font-family:Arial,Helvetica,sans-serif; }
    .ccr-slides { position:relative; overflow:hidden; border-radius:12px; background:#f7f7f8; }
    .ccr-slide { position:absolute; inset:0; opacity:0; transition:opacity 600ms ease; display:flex; align-items:flex-end; justify-content:center; }
    .ccr-slide img { width:100%; height:auto; display:block; object-fit:cover; }
    .ccr-slide.active { opacity:1; position:relative; }
    .ccr-caption { position:absolute; left:18px; bottom:18px; background:rgba(0,0,0,0.55); color:#fff; padding:10px 14px; border-radius:8px; font-size:16px; }
    .ccr-nav { position:absolute; top:50%; transform:translateY(-50%); width:100%; display:flex; justify-content:space-between; pointer-events:none; }
    .ccr-btn { pointer-events:auto; background:rgba(0,0,0,0.55); color:#fff; border:0; padding:10px 12px; margin:0 10px; border-radius:8px; cursor:pointer; }
    .ccr-indicators { display:flex; gap:8px; position:absolute; right:18px; bottom:18px; }
    .ccr-dot { width:12px; height:12px; border-radius:50%; background:rgba(255,255,255,0.45); border:1px solid rgba(0,0,0,0.1); cursor:pointer; }
    .ccr-dot.active { background:#fff; box-shadow:0 0 0 3px rgba(255,255,255,0.08) inset; }
    @media (max-width:640px) {
        .ccr-caption { font-size:14px; left:12px; bottom:12px; padding:8px 10px }
        .ccr-btn { padding:8px; }
    }
    `;
    document.head.appendChild(style);

    function createCarousel(containerId) {
        const container = document.createElement('div');
        container.className = 'ccr-carousel';
        container.id = containerId || 'campus-coffee-carousel';

        const slidesWrap = document.createElement('div');
        slidesWrap.className = 'ccr-slides';
        container.appendChild(slidesWrap);

        // create slides
        slides.forEach((s, i) => {
            const slide = document.createElement('div');
            slide.className = 'ccr-slide' + (i === 0 ? ' active' : '');
            slide.setAttribute('data-index', i);

            const img = document.createElement('img');
            img.src = s.img;
            img.alt = s.caption;

            const caption = document.createElement('div');
            caption.className = 'ccr-caption';
            caption.textContent = s.caption;

            slide.appendChild(img);
            slide.appendChild(caption);
            slidesWrap.appendChild(slide);
        });

        // nav buttons
        const nav = document.createElement('div');
        nav.className = 'ccr-nav';
        const btnPrev = document.createElement('button');
        btnPrev.className = 'ccr-btn ccr-prev';
        btnPrev.type = 'button';
        btnPrev.title = 'Previous';
        btnPrev.textContent = '‹';
        const btnNext = document.createElement('button');
        btnNext.className = 'ccr-btn ccr-next';
        btnNext.type = 'button';
        btnNext.title = 'Next';
        btnNext.textContent = '›';
        nav.appendChild(btnPrev);
        nav.appendChild(btnNext);
        container.appendChild(nav);

        // indicators
        const indicators = document.createElement('div');
        indicators.className = 'ccr-indicators';
        slides.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'ccr-dot' + (i === 0 ? ' active' : '');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
            dot.dataset.index = i;
            indicators.appendChild(dot);
        });
        container.appendChild(indicators);

        // Insert carousel into the page:
        // If there's a main element, append there; otherwise append to body.
        const main = document.querySelector('main') || document.body;
        main.insertBefore(container, main.firstChild);

        // Carousel behavior
        let current = 0;
        const total = slides.length;
        const slideElems = slidesWrap.querySelectorAll('.ccr-slide');
        const dotElems = indicators.querySelectorAll('.ccr-dot');
        let interval = null;
        const delay = 4000;

        function show(index) {
            if (index === current) return;
            slideElems[current].classList.remove('active');
            dotElems[current].classList.remove('active');
            current = (index + total) % total;
            slideElems[current].classList.add('active');
            dotElems[current].classList.add('active');
        }

        function next() { show(current + 1); }
        function prev() { show(current - 1); }
        function start() {
            stop();
            interval = setInterval(next, delay);
        }
        function stop() {
            if (interval) { clearInterval(interval); interval = null; }
        }

        btnNext.addEventListener('click', () => { next(); start(); });
        btnPrev.addEventListener('click', () => { prev(); start(); });

        dotElems.forEach((d) => {
            d.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index, 10);
                show(idx);
                start();
            });
        });

        // pause on hover / focus for accessibility
        container.addEventListener('mouseenter', stop);
        container.addEventListener('mouseleave', start);
        container.addEventListener('focusin', stop);
        container.addEventListener('focusout', start);

        // keyboard navigation
        container.tabIndex = -1;
        container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') { next(); start(); }
            if (e.key === 'ArrowLeft') { prev(); start(); }
        });

        // Start autoplay
        start();

        return {
            element: container,
            next,
            prev,
            show,
            start,
            stop
        };
    }

    // Create the carousel on DOMContentLoaded or immediately if ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => createCarousel());
    } else {
        createCarousel();
    }
})();