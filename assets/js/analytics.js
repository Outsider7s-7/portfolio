/*
 * Lightweight, cookie-free visitor analytics for the portfolio.
 * Sends anonymous events to Supabase (table public.events). No IP, no name, no cookies:
 * a random visitor id lives in localStorage and a session id in sessionStorage.
 * Open the site once with ?notrack to stop counting your own visits on that browser
 * (logging into admin.html does this automatically).
 */
(function () {
  const C = window.AEM_CONFIG || {};
  const enabled = !!(C.supabaseUrl && C.supabaseAnonKey);
  const store = (s, k, v) => { try { if (v === undefined) return s.getItem(k); s.setItem(k, v); } catch (e) { return null; } };
  const rid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  if (/[?&]notrack\b/.test(location.search)) store(localStorage, 'aem-notrack', '1');
  const optedOut = store(localStorage, 'aem-notrack') === '1';

  let vid = store(localStorage, 'aem-vid'); if (!vid) { vid = rid(); store(localStorage, 'aem-vid', vid); }
  let sid = store(sessionStorage, 'aem-sid'); if (!sid) { sid = rid(); store(sessionStorage, 'aem-sid', sid); }

  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet' : /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';

  // approximate country from the visitor's time zone (no IP lookup), falling back to the browser locale
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  const TZ = {
    'Africa/Casablanca': 'Morocco', 'Africa/El_Aaiun': 'Morocco', 'Africa/Algiers': 'Algeria', 'Africa/Tunis': 'Tunisia', 'Africa/Cairo': 'Egypt',
    'Europe/Paris': 'France', 'Europe/Madrid': 'Spain', 'Europe/Brussels': 'Belgium', 'Europe/Amsterdam': 'Netherlands', 'Europe/Berlin': 'Germany',
    'Europe/Rome': 'Italy', 'Europe/London': 'United Kingdom', 'Europe/Lisbon': 'Portugal', 'Europe/Zurich': 'Switzerland', 'Europe/Istanbul': 'Turkey',
    'America/Toronto': 'Canada', 'America/Montreal': 'Canada', 'America/Vancouver': 'Canada', 'America/Edmonton': 'Canada', 'America/Halifax': 'Canada', 'America/Winnipeg': 'Canada',
    'America/New_York': 'United States', 'America/Chicago': 'United States', 'America/Denver': 'United States', 'America/Los_Angeles': 'United States',
    'Asia/Dubai': 'UAE', 'Asia/Riyadh': 'Saudi Arabia', 'Asia/Qatar': 'Qatar', 'Asia/Seoul': 'South Korea', 'Asia/Tokyo': 'Japan',
  };
  let country = TZ[tz] || '';
  if (!country) {
    const region = (navigator.language || '').split('-')[1];
    try { if (region && Intl.DisplayNames) country = new Intl.DisplayNames(['en'], { type: 'region' }).of(region.toUpperCase()); } catch (e) {}
  }
  if (!country) country = tz ? tz.split('/')[0] : 'Unknown';

  let ref = document.referrer || '';
  try { ref = ref ? (new URL(ref).host === location.host ? '' : new URL(ref).host) : ''; } catch (e) { ref = ''; }

  function track(type, label) {
    if (!enabled || optedOut) return;
    const h = document.documentElement;
    const body = {
      visitor_id: vid, session_id: sid, type,
      label: label ? String(label).slice(0, 200) : null,
      mode: h.dataset.mode === 'producer' ? 'producer' : 'dev',
      lang: (h.lang || '').slice(0, 8),
      path: location.pathname.slice(0, 300),
      referrer: ref ? ref.slice(0, 500) : null,
      device, browser, os,
      screen: `${screen.width}x${screen.height}`,
      timezone: tz.slice(0, 64), country: country.slice(0, 64),
    };
    fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/events', {
      method: 'POST', keepalive: true,
      // apikey alone works for both legacy anon keys and the newer sb_publishable_ keys
      headers: { apikey: C.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }
  window.AEMtrack = track;

  // page view once the page has settled on its language/profile
  addEventListener('load', () => setTimeout(() => track('pageview', location.hash || null), 1200));

  // which sections people actually reach (once per section per session)
  const seen = new Set();
  addEventListener('load', () => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      const id = e.target.id;
      if (e.isIntersecting && !seen.has(id) && e.target.offsetParent !== null) { seen.add(id); track('section_view', id); }
    }), { threshold: 0.35 });
    document.querySelectorAll('section[id]').forEach(s => io.observe(s));
  });

  // contact / social clicks
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const href = a.getAttribute('href');
    const kind = href.startsWith('mailto:') ? 'Email' : /wa\.me|whatsapp/.test(href) ? 'WhatsApp' : /linkedin\.com/.test(href) ? 'LinkedIn'
      : /github\.com/.test(href) ? 'GitHub' : /instagram\.com/.test(href) ? 'Instagram' : /youtube\.com|youtu\.be/.test(href) ? 'YouTube' : null;
    if (kind) track('contact_click', kind);
  }, true);
})();
