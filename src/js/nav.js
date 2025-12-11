// nav.js — small helper to toggle mobile navigation
(function(){
  const headers = document.querySelectorAll('header');
  headers.forEach(header => {
    const toggle = header.querySelector('.nav-toggle');
    const nav = header.querySelector('nav');
    if (!toggle || !nav) return;
    const closeOnEscape = (e)=>{
      if (e.key === 'Escape') {
        header.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded','false');
      }
    };
    toggle.addEventListener('click', ()=>{
      const isOpen = header.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) document.addEventListener('keydown', closeOnEscape, { once:true });
    });
  });
})();
