/* Çevik Çözüm — etkileşimler */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var I = window.I18N;
  var current = 'tr';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function t(key) { return (I.dict[current] && I.dict[current][key]) || I.dict.tr[key] || ''; }

  /* ---------- dil ---------- */
  function applyLang(code) {
    if (!I.dict[code]) code = 'tr';
    current = code;
    document.documentElement.lang = code;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (v) el.innerHTML = v;
    });
    document.title = t('meta.title');
    var meta = I.langs.filter(function (l) { return l.code === code; })[0];
    document.getElementById('lang-current').textContent = meta.short;
    document.querySelectorAll('#lang-list li').forEach(function (li) { li.setAttribute('aria-selected', li.dataset.lang === code); });
    buildMarquee();
    renderStatus();
  }

  function initLang() {
    var wrap = document.getElementById('lang'), btn = document.getElementById('lang-btn'), list = document.getElementById('lang-list');
    I.langs.forEach(function (l) {
      var li = document.createElement('li');
      li.tabIndex = 0; li.setAttribute('role', 'option'); li.dataset.lang = l.code;
      li.innerHTML = '<span>' + l.label + '</span><span class="mono">' + l.code.toUpperCase() + '</span>';
      li.addEventListener('click', function () { choose(l.code); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(l.code); } });
      list.appendChild(li);
    });
    function open(state) {
      wrap.classList.toggle('open', state);
      btn.setAttribute('aria-expanded', state);
      if (state) (list.querySelector('[aria-selected="true"]') || list.firstChild).focus();
    }
    function choose(code) { store('ui-lang', code); applyLang(code); open(false); btn.focus(); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); open(!wrap.classList.contains('open')); });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) open(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') open(false);
      if (!wrap.classList.contains('open')) return;
      var items = [].slice.call(list.children), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    var saved = store('ui-lang');
    var nav = (navigator.language || 'tr').slice(0, 2);
    applyLang(saved || (I.dict[nav] ? nav : 'tr'));
  }

  /* ---------- nav ---------- */
  function initNav() {
    var nav = document.getElementById('nav'), menu = document.getElementById('menu-btn'), links = document.getElementById('nav-links');
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 20); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    menu.addEventListener('click', function () {
      var open = !links.classList.contains('open');
      links.classList.toggle('open', open); menu.setAttribute('aria-expanded', open);
    });
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', false); } });
    if ('IntersectionObserver' in window) {
      var map = {};
      links.querySelectorAll('a').forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (!en.isIntersecting || !map[en.target.id]) return;
          links.querySelectorAll('a').forEach(function (a) { a.classList.remove('active'); });
          map[en.target.id].classList.add('active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) spy.observe(el); });
    }
  }

  /* ---------- görünürken beliren öğeler ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- kartlarda imleci izleyen ışık ---------- */
  function initCards() {
    document.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ---------- kayan şerit ---------- */
  function buildMarquee() {
    var track = document.querySelector('.marquee-track');
    if (!track) return;
    [].slice.call(track.querySelectorAll('[data-clone]')).forEach(function (n) { n.remove(); });
    [].slice.call(track.children).forEach(function (n) {
      var c = n.cloneNode(true); c.setAttribute('data-clone', ''); c.removeAttribute('data-i18n'); c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
  }

  /* ---------- sprint döngüsü ---------- */
  function initLoop() {
    var nodes = document.querySelectorAll('.loop-node'), i = 0;
    if (!nodes.length) return;
    nodes[0].classList.add('on');
    if (reduce) return;
    setInterval(function () { nodes[i].classList.remove('on'); i = (i + 1) % nodes.length; nodes[i].classList.add('on'); }, 2000);
  }

  /* ---------- başlık harf karıştırma efekti ---------- */
  function scramble(el) {
    if (reduce || !el) return;
    var html = el.innerHTML, final = el.textContent, chars = '!<>-_\\/[]{}—=+*^?#01', frame = 0, total = 36;
    (function step() {
      var out = '';
      for (var k = 0; k < final.length; k++) {
        out += (k < (frame / total) * final.length || final[k] === ' ') ? final[k] : chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = out;
      if (++frame <= total) requestAnimationFrame(step); else el.innerHTML = html;
    })();
  }

  /* ---------- canlı sürüm konsolu (/_deploy/status.json) ---------- */
  var status = null;
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!isFinite(s)) return '—';
    if (s < 60) return t('ago.now');
    if (s < 3600) return t('ago.min').replace('{n}', Math.round(s / 60));
    if (s < 86400) return t('ago.hour').replace('{n}', Math.round(s / 3600));
    return t('ago.day').replace('{n}', Math.round(s / 86400));
  }
  function renderStatus() {
    if (!status) return;
    document.getElementById('c-commit').textContent = status.commit.slice(0, 7);
    document.getElementById('c-time').textContent = ago(status.deployedAt);
    document.getElementById('c-msg').textContent = '“' + (status.subject || '') + '”';
    document.getElementById('footer-build').textContent = 'build ' + status.commit.slice(0, 7);
  }
  function initStatus() {
    if (!window.fetch) return;
    fetch('_deploy/status.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.commit) return;
      status = j; renderStatus();
      document.getElementById('console').hidden = false;
      setInterval(renderStatus, 30000);
    }).catch(function () {});
  }

  /* ---------- arka plan paralaks ---------- */
  function initParallax() {
    if (reduce) return;
    var fl = document.querySelector('.floaters'), orbs = document.querySelectorAll('.orb');
    var mx = 0, my = 0, sy = 0, raf = 0;
    function apply() {
      raf = 0;
      if (fl) fl.style.transform = 'translate3d(' + (mx * 30) + 'px,' + (my * 30 - sy * 0.15) + 'px,0)';
      orbs.forEach(function (o, i) { o.style.translate = (mx * (i + 1) * -18) + 'px ' + (my * (i + 1) * -18 - sy * 0.05 * (i + 1)) + 'px'; });
    }
    function req() { if (!raf) raf = requestAnimationFrame(apply); }
    window.addEventListener('pointermove', function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; req(); }, { passive: true });
    window.addEventListener('scroll', function () { sy = window.scrollY; req(); }, { passive: true });
  }

  /* ---------- hero: bağlantılı parçacık ağı ---------- */
  function initField() {
    var cv = document.getElementById('field');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, pts = [], mouse = { x: -9999, y: -9999 }, visible = true, LINK = 140;
    function resize() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(110, Math.round(W * H / 14000));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6, hue: Math.random() });
      if (reduce) draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduce) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 22000) { var f = (22000 - d2) / 22000 * .6; p.vx += dx / 140 * f * .1; p.vy += dy / 140 * f * .1; }
          p.vx *= .985; p.vy *= .985;
          if (Math.abs(p.vx) < .08) p.vx += (Math.random() - .5) * .04;
          if (Math.abs(p.vy) < .08) p.vy += (Math.random() - .5) * .04;
          p.x += p.vx; p.y += p.vy;
          if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
          if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
        }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, d = Math.sqrt(ex * ex + ey * ey);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(80,170,255,' + (1 - d / LINK) * .28 + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < pts.length; k++) {
        var s = pts[k];
        ctx.fillStyle = s.hue > .7 ? 'rgba(124,92,255,.9)' : s.hue > .35 ? 'rgba(0,229,255,.9)' : 'rgba(9,137,251,.95)';
        ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    function loop() { if (visible) draw(); requestAnimationFrame(loop); }
    resize();
    window.addEventListener('resize', resize);
    cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    if (!reduce) loop();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('year').textContent = new Date().getFullYear();
    initLang();
    initNav();
    initReveal();
    initCards();
    initLoop();
    initParallax();
    initField();
    initStatus();
    scramble(document.querySelector('[data-scramble]'));
  });
})();
