/* ══════════════════════════════════════════════════════════
   yorilabs.ai — motion
   Anime.js v4 drives every animation. Lenis handles smooth
   scroll; Anime's ScrollObserver reads document scroll, so the
   two pair without either owning the other.

   Two kinds of scroll motion, used deliberately:
     · reveal — plays once when a block arrives  (once: true)
     · sync   — progress tied to scroll position (sync: …)
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasAnime = typeof window.anime !== 'undefined';
  var hasLenis = typeof window.Lenis !== 'undefined';

  // Library missing, or motion switched off: show everything and stop.
  if (!hasAnime || reduced) {
    document.documentElement.classList.remove('js');
    var pre0 = document.getElementById('preloader');
    if (pre0) pre0.remove();
    document.body.classList.add('loaded');
    return;
  }

  var animate = anime.animate;
  var createTimeline = anime.createTimeline;
  var stagger = anime.stagger;
  var onScroll = anime.onScroll;
  var utils = anime.utils;

  function $(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ── one pacing model for every pinned section ───────────────────
     The page reads unevenly if one section spends five screens on a
     single move and another finishes in half a screen. So the whole
     page works to one unit:

       a state rests for      0.8 screens
       a transition travels   1.0 screens

     Section heights in the stylesheet are built from that, and the
     windows below are the same split expressed as a fraction of each
     section's own run. DWELL_F + TRAVEL_F are read straight off it.
     ─────────────────────────────────────────────────────────────── */
  var HOLD_F    = 0.1556;  // half a dwell, either side of a resting state
  var TRAVEL_F  = 0.3113;  // one half of a hand-over, out or in
  var MOVE_IN   = 0.2222;  // a single cover starts here in its run
  var MOVE_SPAN = 0.5556;  // and takes this much of it

  var clamp01 = function (n) { return n < 0 ? 0 : n > 1 ? 1 : n; };
  // smootherstep: flat at both ends, so nothing snaps into motion and
  // nothing arrives abruptly. Every travel on the page uses it.
  var ease = function (n) { return n * n * n * (n * (n * 6 - 15) + 10); };

  /* ── smooth scroll ─────────────────────────────────────── */
  var lenis = null;
  if (hasLenis) {
    // a low lerp gives a long glide, and a wheel notch that moves less
    // ground means nothing on the page is ever asked to jump
    lenis = new Lenis({
      lerp: 0.055,
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.2
    });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
  }

  // Every slide in the product deck sits absolutely inside one sticky
  // pin, so they all share an offsetTop and #bidyori would land on
  // Site Mirror. Work out where that product is actually settled and
  // scroll there instead, so the footer's product list really works.
  function productStop(i) {
    var deck = document.querySelector('.pdeck');
    var n = document.querySelectorAll('.pslide').length;
    if (!deck || n < 2) return null;
    if (!window.matchMedia('(min-width:1001px)').matches) return deck.offsetTop;
    var run = deck.offsetHeight - window.innerHeight;
    var landed = (i / (n - 1)) * 0.94 + 0.03;      // the deck's own inset
    return Math.round(deck.offsetTop + run * landed);
  }

  $('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var p = a.getAttribute('data-product');
      if (p !== null) {
        var y = productStop(parseInt(p, 10));
        if (y !== null) {
          e.preventDefault();
          if (lenis) lenis.scrollTo(y, { duration: 2.1 });
          else window.scrollTo({ top: y, behavior: 'smooth' });
          return;
        }
      }
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.9 });
      else t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── the subscribe field hands off to mail ───────────────────
     There is no backend, so rather than a box that swallows an
     address and does nothing, this opens a pre-addressed message.
     ───────────────────────────────────────────────────────── */
  var subForm = document.querySelector('[data-subscribe]');
  if (subForm) {
    subForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var field = subForm.querySelector('input');
      var addr = (field.value || '').trim();
      if (!addr) return;
      var note = document.querySelector('[data-subscribe-note]');
      window.location.href = 'mailto:info@yorilabs.com'
        + '?subject=' + encodeURIComponent('Add me to the list')
        + '&body=' + encodeURIComponent('Please add ' + addr + ' to the Yori Labs list.');
      if (note) note.textContent = 'Your mail app is opening. Send it and you are on.';
      field.value = '';
    });
  }

  /* ── helpers ───────────────────────────────────────────── */

  // plays once, when the block has properly arrived
  function reveal(el, params) {
    return animate(el, Object.assign({
      duration: 900,
      ease: 'out(3)',
      autoplay: onScroll({ target: el, once: true })
    }, params));
  }

  // both ends stated, so percentage transforms can never be misparsed
  function revealLines(block) {
    var lines = $('span i', block);
    if (!lines.length) return null;
    return animate(lines, {
      translateY: ['102%', '0%'],
      duration: 1150,
      ease: 'out(4)',
      delay: stagger(85),
      autoplay: onScroll({ target: block, once: true })
    });
  }

  function countUp(el, extra) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return null;
    if (target === 0) { el.textContent = '0'; return null; }
    var obj = { v: 0 };
    return animate(obj, Object.assign({
      v: target,
      duration: 1900,
      ease: 'out(3)',
      onUpdate: function () {
        el.textContent = Math.round(obj.v).toLocaleString('en-US');
      }
    }, extra || {}));
  }

  /* ══ HERO ═══════════════════════════════════════════════
     One orchestrated entrance: the preloader hands off to the
     rail, then the headline, the plate, and the stat band.
     ═══════════════════════════════════════════════════════ */

  var preloader = document.getElementById('preloader');
  var preCount = document.getElementById('preCount');
  var preBar = document.getElementById('preBar');
  var counter = { v: 0 };

  if (lenis) lenis.stop();

  var intro = createTimeline({
    defaults: { ease: 'out(3)' },
    onComplete: function () {
      if (preloader && preloader.parentNode) preloader.remove();
      document.body.classList.add('loaded');
      if (lenis) lenis.start();
    }
  });

  intro.add(counter, {
    v: 100, duration: 1400, ease: 'inOut(2)',
    onUpdate: function () { if (preCount) preCount.textContent = Math.round(counter.v); }
  }, 0);

  if (preBar) intro.add(preBar, { right: ['100%', '0%'], duration: 1400, ease: 'inOut(2)' }, 0);
  intro.add('.pre-inner, .pre-bar', { opacity: [1, 0], duration: 320, ease: 'in(2)' }, 1450);
  if (preloader) intro.add(preloader, { translateY: ['0%', '-100%'], duration: 900, ease: 'inOut(4)' }, 1600);

  // the photograph settles first, behind everything
  var heroPlate = document.querySelector('.hero-fig img');
  if (heroPlate) {
    intro.add(heroPlate, { opacity: [0, 1], scale: [1.07, 1], duration: 1700, ease: 'out(4)' }, 1700);
  }

  // rail: the blue measure draws itself out
  intro.add('.hero .rail-line', { scaleX: [0, 1], duration: 900, ease: 'inOut(3)' }, 1950);
  intro.add('.hero-rail .rail-l, .hero-rail .rail-n, .hero-rail .rail-r',
    { opacity: [0, 1], translateY: [8, 0], duration: 700, delay: stagger(70) }, 1980);

  // headline, line by line
  var heroLines = $('.hero-h span i');
  if (heroLines.length) {
    intro.add(heroLines, {
      translateY: ['102%', '0%'], duration: 1250, ease: 'out(4)', delay: stagger(95)
    }, 1900);
  }

  intro.add('.hero-sub, .hero-actions',
    { opacity: [0, 1], translateY: [22, 0], duration: 850, delay: stagger(110) }, 2320);

  // lane labels drop in, their rules extending after them
  var tags = $('.tag');
  if (tags.length) {
    intro.add(tags, { opacity: [0, 1], duration: 700, delay: stagger(95) }, 2200);
    intro.add($('.tag b'), { translateY: [-12, 0], duration: 700, delay: stagger(95) }, 2200);
    intro.add(tags, { '--rule': [0, 1], duration: 760, delay: stagger(95), ease: 'out(3)' }, 2280);
  }

  // stat band
  intro.add('.hs', { opacity: [0, 1], translateY: [18, 0], duration: 780, delay: stagger(95) }, 2420);
  $('.hero-stats [data-count]').forEach(function (el) {
    intro.call(function () { countUp(el); }, 2520);
  });

  /* ── hero, scroll-linked ───────────────────────────────────
     Driven from scroll position rather than a ScrollObserver.
     The hero starts at the top of the document, so it has no
     "before" state for an observer to sit at zero in — using one
     left the copy pre-faded at rest. This is exactly 0 at the top.
     ───────────────────────────────────────────────────────── */
  var heroEl = document.querySelector('.hero');
  var heroCopy = document.querySelector('.hero-copy');
  if (heroEl && (heroCopy || heroPlate)) {
    var pending = false;
    var applyHero = function () {
      var h = heroEl.offsetHeight || 1;
      var t = Math.min(1, Math.max(0, window.scrollY / h));
      if (heroCopy) {
        utils.set(heroCopy, { opacity: 1 - t * 0.55, translateY: -34 * t });
      }
      if (heroPlate) utils.set(heroPlate, { scale: 1 + 0.06 * t });
      pending = false;
    };
    window.addEventListener('scroll', function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(applyHero);
    }, { passive: true });
    applyHero();
  }

  /* ══ SCROLL ═════════════════════════════════════════════ */

  $('[data-lines]').forEach(function (b) {
    if (b.closest('.hero') || b.closest('.deck')) return;   // deck-driven
    revealLines(b);
  });

  $('[data-reveal]').forEach(function (el) {
    if (el.closest('.hero') || el.closest('.deck')) return;   // deck-driven
    reveal(el, { opacity: [0, 1], translateY: [26, 0] });
  });

  /* ── flow section ──────────────────────────────────────── */
  var plate = document.querySelector('.flow-plate img');
  if (plate) {
    animate(plate, {
      opacity: [0, 1], scale: [0.965, 1], duration: 1300, ease: 'out(4)',
      autoplay: onScroll({ target: '.flow-plate', once: true })
    });
    animate(plate, {
      translateY: [24, -24], ease: 'linear',
      autoplay: onScroll({ target: '.flow', sync: 0.6 })
    });
  }
  var caps = $('.fs-cap p');
  if (caps.length) {
    animate(caps, {
      opacity: [0, 1], translateY: [20, 0], duration: 850, ease: 'out(3)', delay: stagger(110),
      autoplay: onScroll({ target: '.flow-caps', once: true })
    });
  }






  /* ── product deck ───────────────────────────────────────────
     The pin holds the paper and is never transformed. Each product
     is split in two: the copy leaves and returns on the left, the
     panel on the right. Between them the frame goes empty before
     the next product arrives. Written for any number of slides.
     ───────────────────────────────────────────────────────── */
  var pdeck = document.querySelector('.pdeck');
  var pslides = $('.pslide');
  if (pdeck && pslides.length > 1 && window.matchMedia('(min-width:1001px)').matches) {
    var parts = pslides.map(function (sl) {
      return {
        left:  [sl.querySelector('.p1-copy')].filter(Boolean),
        right: [sl.querySelector('.p1-stage'), sl.querySelector('.p1-foot')].filter(Boolean),
        card:  sl.querySelector('[data-pcard]')
      };
    });
    var pPending = false;
    var p01 = clamp01;
    var pOut = ease;
    var OFF = 118;   // how far off-frame each half sits, in % of its own width

    var applyPdeck = function () {
      var r = pdeck.getBoundingClientRect();
      var run = pdeck.offsetHeight - window.innerHeight;
      var raw = run > 0 ? -r.top / run : 0;
      // inset so both ends are actually reached despite sticky rounding
      var t = p01((raw - 0.03) / 0.94);

      var span = 1 / (pslides.length - 1);  // where each product sits
      var HOLD = span * HOLD_F;             // still, fully in frame
      var TRAVEL = span * TRAVEL_F;         // sliding off or on
      // the gap left over between one leaving and the next arriving is
      // the empty beat: nothing on screen but the paper

      parts.forEach(function (part, i) {
        var dist = Math.abs(t - i * span);
        var vis = p01((HOLD + TRAVEL - dist) / TRAVEL);
        var e = pOut(vis);
        var off = (1 - e) * OFF;

        part.left.forEach(function (el) {
          utils.set(el, { translateX: -off + '%', opacity: vis });
        });
        part.right.forEach(function (el) {
          utils.set(el, { translateX: off + '%', opacity: vis });
        });
        if (part.card) {
          utils.set(part.card, { rotateX: (14 - 14 * e) + 'deg', scale: 1.04 - 0.04 * e });
        }
        pslides[i].style.pointerEvents = vis > 0.5 ? 'auto' : 'none';
        pslides[i].setAttribute('aria-hidden', vis > 0.5 ? 'false' : 'true');
      });

      pPending = false;
    };

    window.addEventListener('scroll', function () {
      if (pPending) return;
      pPending = true;
      requestAnimationFrame(applyPdeck);
    }, { passive: true });
    window.addEventListener('resize', applyPdeck, { passive: true });
    applyPdeck();
  } else {
    $('[data-pcard]').forEach(function (c) { utils.set(c, { rotateX: '0deg', scale: 1 }); });
  }

  /* ── products: the five tiles arrive in sequence ───────── */
  var prodItems = $('.prod-row li');
  if (prodItems.length) {
    animate(prodItems, {
      opacity: [0, 1], translateY: [24, 0], duration: 800, ease: 'out(3)',
      delay: stagger(85),
      autoplay: onScroll({ target: '.prod-row', once: true })
    });
  }

  /* ── the deck: section 5 slides over section 4 ──────────────
     Both slides are pinned in the same box, so the outgoing one
     stays on screen and is pushed rather than scrolled away —
     a cover transition rather than a cut to empty page.
     ───────────────────────────────────────────────────────── */
  var deck = document.querySelector('.deck');
  var slideOut = document.querySelector('[data-deck="0"]');
  var slideIn = document.querySelector('[data-deck="1"]');
  var wide = window.matchMedia('(min-width:901px)');

  if (deck && slideOut && slideIn && wide.matches) {
    var brainMedia = document.querySelector('[data-brain-media]');
    var brainBits = $('[data-b]', slideIn);
    var brainLines = $('.brain-h span i', slideIn);
    var dPending = false, seated = false;
    var c01 = clamp01;
    var easeOut = ease;

    var applyDeck = function () {
      var r = deck.getBoundingClientRect();
      var run = deck.offsetHeight - window.innerHeight;
      var t = run > 0 ? c01(-r.top / run) : 0;

      // dwell, cover, dwell — on the same clock as every other section
      var m = easeOut(c01((t - MOVE_IN) / MOVE_SPAN));

      utils.set(slideIn, { translateX: (100 - 100 * m) + '%' });
      // the outgoing slide is pushed and settles back, so it reads as depth
      utils.set(slideOut, { translateX: (-17 * m) + '%', scale: 1 - 0.035 * m, opacity: 1 - 0.42 * m });
      // the plate lags inside the incoming slide
      if (brainMedia) utils.set(brainMedia, { translateX: (-9 + 9 * m) + '%' });

      if (!seated && m > 0.9) {
        seated = true;
        if (brainLines.length) {
          animate(brainLines, {
            translateY: ['102%', '0%'], duration: 1050, ease: 'out(4)', delay: stagger(95)
          });
        }
        animate(brainBits, {
          opacity: [0, 1], translateY: [20, 0], duration: 820, ease: 'out(3)', delay: stagger(110)
        });
      }
      dPending = false;
    };

    window.addEventListener('scroll', function () {
      if (dPending) return;
      dPending = true;
      requestAnimationFrame(applyDeck);
    }, { passive: true });
    window.addEventListener('resize', applyDeck, { passive: true });
    applyDeck();
  } else if (slideIn) {
    // narrow screens: the two simply stack
    utils.set(slideIn, { translateX: '0%' });
    utils.set($('[data-b]', slideIn), { opacity: 1, translateY: 0 });
    utils.set($('.brain-h span i', slideIn), { translateY: '0%' });
  }

  /* ── ledger: closed → sketch → built ────────────────────────
     Driven from scroll position, like the hero. A three-way
     cross-dissolve needs exact control at both ends of each
     transition, which an observer window does not give.
     ───────────────────────────────────────────────────────── */
  var ledger = document.querySelector('.ledger');
  var plates = $('.lp');
  if (ledger && plates.length === 2) {
    var copyStates = $('.lc');
    var lState = document.querySelector('[data-lstate]');
    var lPending = false;

    var applyLedger = function () {
      var r = ledger.getBoundingClientRect();
      var run = ledger.offsetHeight - window.innerHeight;
      var raw = run > 0 ? -r.top / run : 0;
      // inset the range: sticky/svh rounding means the true ends are never
      // quite reached, so map 6%..94% onto 0..1 and both states resolve fully
      var t = clamp01((raw - 0.06) / 0.88);
      // dwell, dissolve, dwell — the same window the cover above uses.
      // a dissolve stays linear: easing one reads as a hesitation.
      var mix = clamp01((t - MOVE_IN) / MOVE_SPAN);

      var o = [1 - mix, mix];
      for (var i = 0; i < 2; i++) {
        // a touch of scale keeps each state alive rather than a flat dip
        utils.set(plates[i], { opacity: o[i], scale: 0.985 + 0.015 * o[i] });
        if (copyStates[i]) {
          utils.set(copyStates[i], { opacity: o[i], translateY: 14 * (o[i] - 1) });
        }
      }
      var active = mix < 0.5 ? 0 : 1;
      if (lState) lState.textContent = active === 0 ? '01 Closed' : '02 Open';
      // only the visible state should be reachable by keyboard or screen reader
      copyStates.forEach(function (c, i) {
        c.setAttribute('aria-hidden', i === active ? 'false' : 'true');
        c.style.pointerEvents = i === active ? 'auto' : 'none';
      });
      lPending = false;
    };

    window.addEventListener('scroll', function () {
      if (lPending) return;
      lPending = true;
      requestAnimationFrame(applyLedger);
    }, { passive: true });
    window.addEventListener('resize', applyLedger, { passive: true });
    applyLedger();
  }

  /* ── outro ──────────────────────────────────────────────────
     The camera starts inside the blue disc in the O of the mark, so
     the screen is nothing but that blue, and pulls back until the
     whole logo stands on the paper. Then it walks to the corner of
     section 07 and stays there.

     It begins while the last product is still stuck on screen, so it
     is driven from a range that starts at the deck's final pinned
     frame, not at the outro's own top.

     The take-over runs inside the last product's own dwell and is
     finished by the time the deck would unpin, so the colour lands on
     top of section 06 standing still. Started any later, the deck
     releases mid-fade and you watch it slide away under the blue.

     After the take-over, on q:
       0.00 - 0.50  push     the pull back, anchored on the disc, until
                             the mark stands centred
       0.50 - 0.62  hold
       0.62 - 0.84  walk     to the corner of section 07
       0.84 - 0.95  hand off the overlay fades onto 07's own mark,
                             which is the same file in the same place
       0.95         copy     and only then does the text come up
     ───────────────────────────────────────────────────────── */
  var outro = document.querySelector('.outro');
  var field = document.querySelector('.outro-field');
  var mark = document.querySelector('.outro-mark');
  var deckEl = document.querySelector('.pdeck');

  if (outro && field && mark && window.matchMedia('(min-width:1001px)').matches) {
    var nxLines = $('.nx-h span i');
    var nxBits = $('[data-nx]');
    var nxMark = document.querySelector('.nx-mark');
    var oPending = false, arrived = false, lit = false;

    // measured off the file: where the disc sits inside the artwork,
    // how big it is, and the artwork's own proportions
    var DISC_X = 0.3350, DISC_Y = 0.4648, DISC_R = 0.02734;
    var ART = 782 / 1664;

    var applyOutro = function () {
      var vw = window.innerWidth, vh = window.innerHeight;

      // How much scroll the last product spends standing still: the deck
      // holds each slide for HOLD_F of its span, and insets its own range
      // by 3%/94%. The take-over is given exactly that, so it starts the
      // moment the product lands and ends as the pin lets go.
      var deckRun = deckEl ? Math.max(1, deckEl.offsetHeight - vh) : 0;
      var deckEnd = deckEl ? deckEl.offsetTop + deckRun : outro.offsetTop;
      var slides = document.querySelectorAll('.pslide').length;
      var span = slides > 1 ? 1 / (slides - 1) : 1;
      var landed = (1 - span * HOLD_F) * 0.94 + 0.03;
      var take = Math.min(vh * 0.6, deckRun * (1 - landed));

      var from = deckEnd - take;
      var to = outro.offsetTop + Math.max(1, outro.offsetHeight - vh);
      var t = clamp01((window.scrollY - from) / (to - from));

      var on = t > 0 && t < 1;
      if (on !== lit) {
        lit = on;
        field.style.visibility = on ? 'visible' : 'hidden';
      }

      // 1 · the screen goes over to the blue inside the disc
      var takeEnd = take / (to - from);
      field.style.setProperty('--in', ease(clamp01(t / takeEnd)));

      // everything after it runs on its own clock, so the take-over can
      // be as long as the deck's dwell happens to be
      var q = clamp01((t - takeEnd) / (1 - takeEnd));
      var win = function (a, b) { return clamp01((q - a) / (b - a)); };
      field.style.setProperty('--out', ease(win(0.84, 0.95)));

      // 2 · the pull back. Width is interpolated in log space: stepping
      //     it linearly from forty thousand pixels down to six hundred
      //     would spend the whole move at the very end and read as a
      //     snap. In log space the zoom rate is constant, the way a
      //     camera pulling back actually looks.
      var restW = Math.min(vw * 0.42, 660);
      var coverW = Math.hypot(vw, vh) / 2 / DISC_R;   // disc fills the screen
      var push = ease(win(0.00, 0.50));
      var pw = Math.exp(Math.log(coverW) + (Math.log(restW) - Math.log(coverW)) * push);

      // The point of the artwork pinned to the middle of the screen slides
      // from the disc to the centre of the lockup, but that slide is driven
      // by how wide the mark currently is, not by time. Sixteen percent of
      // a thirty-thousand pixel artwork is a whole screen, so blending it
      // early throws the disc off the middle; held until the mark is within
      // a few multiples of its resting size, the same blend reads as the
      // lockup settling into place.
      var settle = 1 - clamp01(Math.log(pw / restW) / Math.log(8));
      var ax = DISC_X + (0.5 - DISC_X) * settle;
      var ay = DISC_Y + (0.5 - DISC_Y) * settle;
      var sx = vw / 2, sy = vh / 2;

      // 3 · then it walks to where section 07 keeps its own mark
      var walk = ease(win(0.62, 0.84));
      var w = pw;
      if (nxMark) {
        var r = nxMark.getBoundingClientRect();
        if (r.width) {
          w = pw + (r.width - pw) * walk;
          sx = sx + (r.left + r.width / 2 - sx) * walk;
          sy = sy + (r.top + r.height / 2 - sy) * walk;
          ax = ax + (0.5 - ax) * walk;
          ay = ay + (0.5 - ay) * walk;
        }
      }

      mark.style.backgroundSize = w + 'px auto';
      mark.style.backgroundPosition =
        (sx - ax * w) + 'px ' + (sy - ay * w * ART) + 'px';

      // 4 · the copy arrives once the mark is home
      if (!arrived && q > 0.95) {
        arrived = true;
        if (nxLines.length) {
          animate(nxLines, {
            translateY: ['102%', '0%'], duration: 1100, ease: 'out(4)', delay: stagger(90)
          });
        }
        if (nxBits.length) {
          animate(nxBits, {
            opacity: [0, 1], translateY: [22, 0], duration: 880, ease: 'out(3)', delay: stagger(110)
          });
        }
      }
      oPending = false;
    };

    window.addEventListener('scroll', function () {
      if (oPending) return;
      oPending = true;
      requestAnimationFrame(applyOutro);
    }, { passive: true });
    window.addEventListener('resize', applyOutro, { passive: true });
    applyOutro();
  } else {
    if (field) field.style.display = 'none';
    utils.set($('.nx-h span i'), { translateY: '0%' });
    utils.set($('[data-nx]'), { opacity: 1, translateY: 0 });
  }

  /* ── the footer mark, breathing ──────────────────────────────
     A long, shallow rise and fall on one clock, started when the
     footer arrives. Enough to look alive, not enough to read as
     an animation. The reduced-motion guard at the top of the file
     means it never runs for anyone who has asked it not to.
     ───────────────────────────────────────────────────────── */
  var ftrMark = document.querySelector('.ftr-mark');
  if (ftrMark) {
    animate(ftrMark, {
      translateY: [0, -10],
      scale: [1, 1.012],
      duration: 3800,
      ease: 'inOut(2)',
      loop: true,
      alternate: true,
      autoplay: onScroll({ target: '.ftr' })
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

  /* ── scroll progress ───────────────────────────────────── */
  var progBar = document.getElementById('progBar');
  if (progBar) {
    animate(progBar, {
      width: ['0%', '100%'], ease: 'linear',
      autoplay: onScroll({ target: document.documentElement, sync: true
 })
    });
  }
})();
