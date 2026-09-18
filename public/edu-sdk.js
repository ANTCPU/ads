// public/edu-sdk.js — antcpu EDU v1
// Served at: https://antcpu-ads.vercel.app/edu-sdk.js
// Drop before </body> on every lesson HTML file:
// <script src="https://antcpu-ads.vercel.app/edu-sdk.js"></script>
//
// Handles:
//   - Student identity (email capture → /api/edu/signup)
//   - Progress sync (localStorage + /api/edu/progress on return)
//   - Progress bar (top of page, fills as lessons complete)
//   - Lesson nav (dynamic from /api/edu/classes, replaces hardcoded)
//   - Gate logic (lesson N locked until N-1 complete)
//   - Mark Complete button (injected if missing, wired if present)
//   - Auto-advance to next lesson after complete
//   - Class complete overlay on last lesson
//
// URL pattern expected: /edu/classes/[class-slug]/[lesson-slug].html

(function () {

  // ── Config ──────────────────────────────────────────────────────────────────
  var BASE        = 'https://antcpu-ads.vercel.app';
  var API_CLASSES = BASE + '/api/edu/classes';
  var API_COMPLETE= BASE + '/api/edu/complete';
  var API_SIGNUP  = BASE + '/api/edu/signup';
  var API_PROGRESS= BASE + '/api/edu/progress';
  var EDU_BASE    = 'https://antcpu.com/edu/classes/';
  var CACHE_KEY   = 'edu_cls_v1';
  var EMAIL_KEY   = 'edu_email';
  var PROG_KEY    = 'edu_prog_v1';
  var CAT_COLOR   = { cpu:'#4caf50', art:'#f5e642', music:'#64b5f6', religion:'#ce93d8' };

  // ── Parse URL ───────────────────────────────────────────────────────────────
  // Expected: /edu/classes/[class-slug]/[lesson-slug].html
  var parts      = window.location.pathname.split('/').filter(Boolean);
  var classSlug  = parts[2] || '';
  var lessonSlug = (parts[3] || '').replace('.html', '');
  if (!classSlug || !lessonSlug) return;

  // ── Storage helpers ─────────────────────────────────────────────────────────
  function getEmail() { return localStorage.getItem(EMAIL_KEY) || null; }
  function setEmail(e) { localStorage.setItem(EMAIL_KEY, e.trim().toLowerCase()); }

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(PROG_KEY, JSON.stringify(p)); }

  function markLocalDone(cs, ls) {
    var p = getProgress();
    if (!p[cs]) p[cs] = [];
    if (p[cs].indexOf(ls) === -1) p[cs].push(ls);
    saveProgress(p);
  }
  function isLocalDone(cs, ls) {
    var p = getProgress();
    return !!(p[cs] && p[cs].indexOf(ls) !== -1);
  }

  // Merge server progress into localStorage
  function mergeServerProgress(serverClasses) {
    var p = getProgress();
    var changed = false;
    (serverClasses || []).forEach(function(sc) {
      if (!p[sc.class_slug]) p[sc.class_slug] = [];
      (sc.lessons || []).forEach(function(ls) {
        if (p[sc.class_slug].indexOf(ls) === -1) {
          p[sc.class_slug].push(ls);
          changed = true;
        }
      });
    });
    if (changed) saveProgress(p);
  }

  // ── API calls ───────────────────────────────────────────────────────────────
  function apiSignup(email, cb) {
    fetch(API_SIGNUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, name: 'Student' })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { cb && cb(d); })
    .catch(function() { cb && cb(null); });
  }

  function apiProgress(email, cb) {
    fetch(API_PROGRESS + '?email=' + encodeURIComponent(email))
      .then(function(r) { return r.json(); })
      .then(function(d) { cb && cb(d); })
      .catch(function() { cb && cb(null); });
  }

  function apiComplete(email, cs, ls) {
    if (!email) return;
    fetch(API_COMPLETE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, class_slug: cs, lesson_slug: ls })
    }).catch(function() {});
  }

  // ── Load classes (cached in sessionStorage) ─────────────────────────────────
  function loadClasses(cb) {
    var cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try { return cb(JSON.parse(cached)); } catch(e) {}
    }
    fetch(API_CLASSES)
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok && d.classes) {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(d.classes));
          cb(d.classes);
        }
      })
      .catch(function() {});
  }

  // ── Progress bar ────────────────────────────────────────────────────────────
  function injectProgressBar(cls) {
    var existing = document.getElementById('edu-bar');
    if (existing) existing.remove();
    var done  = (getProgress()[cls.slug] || []).length;
    var total = (cls.lessons || []).length;
    var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    var bar   = document.createElement('div');
    bar.id    = 'edu-bar';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:3px;background:#111;z-index:9998;pointer-events:none';
    bar.innerHTML = '<div id="edu-bar-fill" style="height:100%;width:' + pct + '%;background:#4caf50;transition:width .5s ease"></div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function updateProgressBar(cls) {
    var done  = (getProgress()[cls.slug] || []).length;
    var total = (cls.lessons || []).length;
    var pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    var fill  = document.getElementById('edu-bar-fill');
    if (fill) fill.style.width = pct + '%';
  }

  // ── Lesson nav ──────────────────────────────────────────────────────────────
  function injectNav(cls, currentSlug) {
    // Remove existing hardcoded nav if present
    var old = document.getElementById('edu-nav');
    if (old) old.remove();

    var color = CAT_COLOR[cls.category] || '#4caf50';
    var nav   = document.createElement('div');
    nav.id    = 'edu-nav';
    nav.style.cssText = [
      'display:flex',
      'gap:4px',
      'flex-wrap:wrap',
      'padding:10px 0 14px',
      'border-bottom:1px solid #1a1a14',
      'margin-bottom:24px',
      'font-family:monospace',
      'align-items:center'
    ].join(';');

    // Back link
    var back = document.createElement('a');
    back.href = '/edu/classes/' + cls.slug + '/';
    back.style.cssText = 'font-size:11px;color:#555;text-decoration:none;margin-right:8px;letter-spacing:.04em';
    back.textContent = '← ' + cls.label;
    nav.appendChild(back);

    // Lesson tabs
    (cls.lessons || []).forEach(function(l, i) {
      var done    = isLocalDone(cls.slug, l.slug);
      var current = l.slug === currentSlug;
      var locked  = i > 0 && !isLocalDone(cls.slug, (cls.lessons[i-1] || {}).slug);
      var isLive  = l.status === 'live';

      var el;
      if (!locked && isLive) {
        el = document.createElement('a');
        el.href = EDU_BASE + cls.slug + '/' + l.slug + '.html';
      } else {
        el = document.createElement('span');
      }

      el.style.cssText = [
        'padding:4px 10px',
        'border-radius:4px',
        'font-size:11px',
        'font-family:monospace',
        'text-decoration:none',
        'border:1px solid ' + (current ? '#333' : 'transparent'),
        'background:' + (current ? '#1a1a14' : 'transparent'),
        'color:' + (current ? '#fff' : done ? color : locked ? '#2a2a2a' : '#555'),
        'cursor:' + (locked ? 'default' : 'pointer'),
        'transition:color .15s'
      ].join(';');

      el.textContent = (done ? '✓' : locked ? '🔒' : '') + (i + 1);
      if (!locked && !current) {
        el.title = l.title || ('Lesson ' + (i + 1));
      }
      nav.appendChild(el);
    });

    // Insert at top of body after progress bar
    var bar = document.getElementById('edu-bar');
    if (bar && bar.nextSibling) {
      document.body.insertBefore(nav, bar.nextSibling);
    } else {
      document.body.insertBefore(nav, document.body.firstChild);
    }
  }

  // ── Gate check ──────────────────────────────────────────────────────────────
  function isGateOpen(cls, currentSlug) {
    var lessons = cls.lessons || [];
    var idx = lessons.findIndex(function(l) { return l.slug === currentSlug; });
    if (idx <= 0) return true;
    var prev = lessons[idx - 1];
    return isLocalDone(cls.slug, prev.slug);
  }

  function showGateLock(cls, currentSlug) {
    var lessons = cls.lessons || [];
    var idx     = lessons.findIndex(function(l) { return l.slug === currentSlug; });
    var prev    = lessons[idx - 1];
    var prevUrl = EDU_BASE + cls.slug + '/' + prev.slug + '.html';
    var color   = CAT_COLOR[cls.category] || '#4caf50';

    // Hide page content — keep nav + bar
    Array.from(document.body.children).forEach(function(el) {
      if (el.id !== 'edu-bar' && el.id !== 'edu-nav') {
        el.style.display = 'none';
      }
    });

    var gate = document.createElement('div');
    gate.style.cssText = [
      'max-width:480px',
      'margin:60px auto',
      'padding:36px',
      'background:#0f0f0b',
      'border:1px solid #1a1a14',
      'border-radius:8px',
      'font-family:monospace',
      'text-align:center'
    ].join(';');

    gate.innerHTML =
      '<div style="font-size:32px;margin-bottom:16px">🔒</div>' +
      '<div style="font-size:16px;font-weight:700;color:#fff;margin-bottom:8px">Lesson ' + (idx + 1) + ' is locked</div>' +
      '<div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:24px">' +
        'Complete <strong style="color:#e6e6e0">' + (prev.title || 'the previous lesson') + '</strong> first.' +
      '</div>' +
      '<a href="' + prevUrl + '" style="' + [
        'display:inline-block',
        'padding:9px 24px',
        'background:rgba(76,175,80,.08)',
        'border:1px solid rgba(76,175,80,.3)',
        'border-radius:6px',
        'color:' + color,
        'font-family:monospace',
        'font-size:12px',
        'font-weight:700',
        'text-decoration:none'
      ].join(';') + '">← Go to Lesson ' + idx + '</a>';

    document.body.appendChild(gate);
  }

  // ── Mark Complete button ─────────────────────────────────────────────────────
  function findOrInjectCompleteBtn(cls, currentSlug) {
    var lessons = cls.lessons || [];
    var idx     = lessons.findIndex(function(l) { return l.slug === currentSlug; });
    var isLast  = idx === lessons.length - 1;
    var next    = !isLast ? lessons[idx + 1] : null;
    var color   = CAT_COLOR[cls.category] || '#4caf50';

    // Try to find existing button by text
    var btn = null;
    var allLinks = Array.from(document.querySelectorAll('a, button'));
    for (var i = 0; i < allLinks.length; i++) {
      var txt = (allLinks[i].textContent || '').toLowerCase();
      if (txt.indexOf('mark complete') !== -1 || txt.indexOf('complete & continue') !== -1) {
        btn = allLinks[i];
        break;
      }
    }

    // If not found — inject one before the next/previous nav links
    if (!btn) {
      btn = document.createElement('a');
      btn.href = '#';
      btn.style.cssText = [
        'display:inline-block',
        'margin:24px 0',
        'padding:10px 24px',
        'background:rgba(76,175,80,.08)',
        'border:1px solid rgba(76,175,80,.3)',
        'border-radius:6px',
        'color:' + color,
        'font-family:monospace',
        'font-size:13px',
        'font-weight:700',
        'text-decoration:none',
        'cursor:pointer'
      ].join(';');
      btn.textContent = isLast ? 'Complete Class →' : 'Mark Complete & Continue →';

      // Find next/prev nav to insert before
      var navLink = null;
      for (var j = 0; j < allLinks.length; j++) {
        var t = (allLinks[j].textContent || '').toLowerCase();
        if (t.indexOf('next lesson') !== -1 || t.indexOf('previous') !== -1) {
          navLink = allLinks[j];
          break;
        }
      }
      if (navLink && navLink.parentNode) {
        navLink.parentNode.insertBefore(btn, navLink);
        // Add line break
        navLink.parentNode.insertBefore(document.createElement('br'), navLink);
      } else {
        document.body.appendChild(btn);
      }
    }

    // Already done state
    if (isLocalDone(cls.slug, currentSlug)) {
      btn.textContent = '✓ Complete';
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
      return;
    }

    // Wire click
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (isLocalDone(cls.slug, currentSlug)) return;

      // Mark done locally first — instant feedback
      markLocalDone(cls.slug, currentSlug);
      btn.textContent = '✓ Complete';
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
      updateProgressBar(cls);
      injectNav(cls, currentSlug); // refresh nav checkmarks

      // Email capture → signup → sync → advance
      showEmailBanner(function(email) {
        apiComplete(email, cls.slug, currentSlug);
        if (isLast) {
          setTimeout(function() { showClassComplete(cls); }, 500);
        } else if (next) {
          setTimeout(function() {
            window.location.href = EDU_BASE + cls.slug + '/' + next.slug + '.html';
          }, 700);
        }
      });
    });
  }

  // ── Email capture banner ─────────────────────────────────────────────────────
  function showEmailBanner(cb) {
    var email = getEmail();
    if (email) { cb(email); return; }

    var banner = document.createElement('div');
    banner.id  = 'edu-banner';
    banner.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'background:#0f0f0b',
      'border-top:1px solid #1a1a14',
      'padding:12px 20px',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'z-index:9999',
      'font-family:monospace',
      'font-size:12px',
      'flex-wrap:wrap'
    ].join(';');

    banner.innerHTML =
      '<span style="color:#4caf50;flex-shrink:0">🎓 Save progress across devices?</span>' +
      '<input id="edu-em" type="email" placeholder="your@email.com" autocomplete="email" style="' + [
        'flex:1',
        'min-width:180px',
        'background:#1a1a14',
        'border:1px solid #333',
        'border-radius:4px',
        'padding:6px 10px',
        'color:#e6e6e0',
        'font-family:monospace',
        'font-size:12px',
        'outline:none'
      ].join(';') + '"/>' +
      '<button id="edu-save" style="' + [
        'background:rgba(76,175,80,.1)',
        'border:1px solid rgba(76,175,80,.35)',
        'border-radius:4px',
        'padding:6px 16px',
        'color:#4caf50',
        'font-family:monospace',
        'font-size:11px',
        'font-weight:700',
        'cursor:pointer',
        'white-space:nowrap'
      ].join(';') + '">Save →</button>' +
      '<button id="edu-skip" style="background:none;border:none;color:#444;font-family:monospace;font-size:11px;cursor:pointer">skip</button>';

    document.body.appendChild(banner);

    // Enter key support
    document.getElementById('edu-em').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('edu-save').click();
    });

    document.getElementById('edu-save').addEventListener('click', function() {
      var val = (document.getElementById('edu-em').value || '').trim().toLowerCase();
      if (!val || !val.includes('@')) return;
      setEmail(val);
      banner.remove();
      apiSignup(val, function() { cb(val); });
    });

    document.getElementById('edu-skip').addEventListener('click', function() {
      banner.remove();
      cb(null);
    });
  }

  // ── Class complete overlay ───────────────────────────────────────────────────
  function showClassComplete(cls) {
    var color = CAT_COLOR[cls.category] || '#4caf50';
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(10,10,8,.96)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:99999',
      'font-family:monospace',
      'padding:20px'
    ].join(';');

    overlay.innerHTML =
      '<div style="max-width:460px;text-align:center">' +
        '<div style="font-size:52px;margin-bottom:16px">' + (cls.icon || '🎓') + '</div>' +
        '<div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:' + color + ';margin-bottom:10px">Class Complete</div>' +
        '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:10px">' + cls.label + '</div>' +
        '<div style="font-size:12px;color:#666;line-height:1.7;margin-bottom:28px">' +
          (cls.lessons || []).length + ' lessons done. Free. No certificate needed — you know it now.' +
        '</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          '<a href="/edu/" style="' + [
            'padding:9px 22px',
            'background:rgba(76,175,80,.08)',
            'border:1px solid rgba(76,175,80,.3)',
            'border-radius:6px',
            'color:#4caf50',
            'font-size:12px',
            'font-weight:700',
            'text-decoration:none'
          ].join(';') + '">← Back to EDU</a>' +
          '<a href="/edu/live4.html" style="' + [
            'padding:9px 22px',
            'background:#4caf50',
            'border-radius:6px',
            'color:#000',
            'font-size:12px',
            'font-weight:700',
            'text-decoration:none'
          ].join(';') + '">Find Next Class →</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    loadClasses(function(classes) {
      var cls = null;
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].slug === classSlug) { cls = classes[i]; break; }
      }
      if (!cls) return;

      // If returning student with email — sync server progress first
      var email = getEmail();
      if (email) {
        apiProgress(email, function(data) {
          if (data && data.ok) mergeServerProgress(data.classes);
          bootPage(cls);
        });
      } else {
        bootPage(cls);
      }
    });
  });

  function bootPage(cls) {
    injectProgressBar(cls);
    injectNav(cls, lessonSlug);

    if (!isGateOpen(cls, lessonSlug)) {
      showGateLock(cls, lessonSlug);
      return;
    }

    findOrInjectCompleteBtn(cls, lessonSlug);
  }

})();
