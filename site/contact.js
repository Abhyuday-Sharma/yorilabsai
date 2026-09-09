/* ══════════════════════════════════════════════════════════
   yorilabs.ai — the contact page

   Its own file rather than app.js: that script is built around
   the home page's pinned decks and preloader, none of which
   exist here. This page needs three things only.
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasAnime = typeof window.anime !== 'undefined';

  function $(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ── smooth scroll, on the same settings as the home page ── */
  if (typeof window.Lenis !== 'undefined' && !reduced) {
    var lenis = new Lenis({
      lerp: 0.055,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.2
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  /* ── the enquiry composes a mail ──────────────────────────
     There is no server to post to. Rather than a form that
     swallows what someone typed, this opens a message already
     written. Name and email are the two we need to answer at
     all; everything else is left out of the mail if it is blank.
     ───────────────────────────────────────────────────────── */
  var form = document.querySelector('[data-enquiry]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var val = function (name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? (el.value || '').trim() : '';
      };
      var heard = $('[name="heard"]:checked', form).map(function (c) { return c.value; });

      var lines = [];
      var add = function (label, v) { if (v) lines.push(label + ': ' + v); };
      add('Name', val('name'));
      add('Email', val('email'));
      add('Company', val('company'));
      add('Role', val('role'));
      add('Looking to build', val('build'));
      add('Heard about us', heard.join(', '));

      var message = val('message');
      if (message) {
        if (lines.length) lines.push('');
        lines.push(message);
      }

      var note = document.querySelector('[data-enquiry-note]');

      // the two we cannot answer without. The form carries novalidate so
      // the message reads in this site's voice rather than the browser's.
      var bad = null, why = '';
      if (!val('name')) {
        bad = form.querySelector('[name="name"]');
        why = 'We need a name<br>to reply to.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) {
        bad = form.querySelector('[name="email"]');
        why = val('email') ? 'That email looks off.<br>Mind checking it?'
                           : 'We need an email<br>to reply to.';
      }
      if (bad) {
        bad.setAttribute('aria-invalid', 'true');
        bad.focus();
        if (note) note.innerHTML = why;
        return;
      }

      var who = val('name') || val('company');
      window.location.href = 'mailto:info@yorilabs.com'
        + '?subject=' + encodeURIComponent('Enquiry' + (who ? ' from ' + who : ''))
        + '&body=' + encodeURIComponent(lines.join('\n'));

      if (note) note.innerHTML = 'Your mail app is opening.<br>Send it and it reaches us.';
    });

    // clear the flag as soon as they start fixing it
    $('[name="name"], [name="email"]', form).forEach(function (el) {
      el.addEventListener('input', function () { el.removeAttribute('aria-invalid'); });
    });
  }

  /* ── the phone menu ─────────────────────────────────────────
     The burger shipped with no panel behind it, so a phone had
     no navigation at all. Opening locks the page under it and
     keeps the tab ring inside the panel until it closes.
     ───────────────────────────────────────────────────────── */
  var burger = document.querySelector('.hdr-menu');
  var mnav = document.getElementById('mnav');
  if (burger && mnav) {
    var closeBtn = mnav.querySelector('.mnav-x');
    var mLinks = Array.prototype.slice.call(
      mnav.querySelectorAll('a, button'));
    var lastFocus = null;

    var setMenu = function (open) {
      mnav.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.documentElement.classList.toggle('mnav-open', open);
      document.body.classList.toggle('mnav-open', open);
      if (open) {
        lastFocus = document.activeElement;
        if (typeof lenis !== 'undefined' && lenis) lenis.stop();
        if (mLinks[0]) mLinks[0].focus();
      } else {
        if (typeof lenis !== 'undefined' && lenis) lenis.start();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
    };

    var phone = window.matchMedia('(max-width:900px)');
    burger.addEventListener('click', function () {
      // the same button sits in the desktop header, where the panel is
      // display:none; answering there would lock the page behind nothing
      if (!phone.matches) return;
      setMenu(mnav.hidden);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });

    // a link is a destination, so the panel gets out of the way
    mnav.querySelectorAll('.mnav-links a, .mnav-foot a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (mnav.hidden) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab' || !mLinks.length) return;
      var first = mLinks[0], last = mLinks[mLinks.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // turning the phone to landscape can cross the breakpoint
    window.addEventListener('resize', function () {
      if (!mnav.hidden && window.matchMedia('(min-width:901px)').matches) setMenu(false);
    }, { passive: true });
  }

  /* ── a quiet entrance ─────────────────────────────────── */
  if (!hasAnime || reduced) {
    document.documentElement.classList.remove('js');
    return;
  }

  var animate = anime.animate;
  var stagger = anime.stagger;
  var createTimeline = anime.createTimeline;

  var intro = createTimeline({ defaults: { ease: 'out(3)' } });

  var lines = $('.cx-h span i');
  if (lines.length) {
    intro.add(lines, { translateY: ['102%', '0%'], duration: 1050, delay: stagger(95) }, 120);
  }
  var bits = $('[data-cx]');
  if (bits.length) {
    intro.add(bits, { opacity: [0, 1], translateY: [20, 0], duration: 820, delay: stagger(90) }, 260);
  }
  var card = document.querySelector('.cx-card');
  if (card) {
    intro.add(card, { opacity: [0, 1], translateY: [26, 0], duration: 900 }, 300);
  }
})();
