/* ═══════════════════════════════════════════════
   CafeSense — script.js
   ═══════════════════════════════════════════════ */

/* ═══ CURSOR ═══ */
const cur  = document.getElementById('cur');
const cur2 = document.getElementById('cur2');
let mx = -100, my = -100, cx2 = -100, cy2 = -100;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx + 'px';
  cur.style.top  = my + 'px';
});

(function animCursor() {
  cx2 += (mx - cx2) * 0.12;
  cy2 += (my - cy2) * 0.12;
  cur2.style.left = cx2 + 'px';
  cur2.style.top  = cy2 + 'px';
  requestAnimationFrame(animCursor);
})();

/* ═══ NAV SCROLL STATE ═══ */
const navEl = document.querySelector('nav');
window.addEventListener('scroll', () => {
  navEl.classList.toggle('scrolled', scrollY > 60);
}, { passive: true });

/* ═══ THREE.JS BACKGROUND ═══ */
(function initThree() {
  const canvas = document.getElementById('cv');
  const R = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.setClearColor(0, 0);

  const S   = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
  cam.position.z = 5;

  function onResize() {
    R.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }
  onResize();
  addEventListener('resize', onResize);

  /* Floating particles */
  const N   = 140;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  const vel = [];
  const sz  = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    pos[i*3]   = (Math.random() - 0.5) * 14;
    pos[i*3+1] = (Math.random() - 0.5) * 9;
    pos[i*3+2] = (Math.random() - 0.5) * 5;
    vel.push({
      x: (Math.random() - 0.5) * 0.003,
      y: (Math.random() - 0.5) * 0.002
    });
    sz[i] = 0.05 + Math.random() * 0.13;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('size',     new THREE.BufferAttribute(sz, 1));

  /* Glow texture */
  const ptx = (() => {
    const c   = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g   = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   'rgba(196,154,60,1)');
    g.addColorStop(0.4, 'rgba(150,110,40,0.5)');
    g.addColorStop(1,   'rgba(80,55,15,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  })();

  const mat = new THREE.PointsMaterial({
    map: ptx, size: 0.14, sizeAttenuation: true,
    transparent: true, opacity: 0.07,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  S.add(new THREE.Points(geo, mat));

  /* Connection lines */
  const lgeo = new THREE.BufferGeometry();
  const lpos = new Float32Array(N * N * 6);
  lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const lmat = new THREE.LineBasicMaterial({
    color: 0xb8914a, transparent: true, opacity: 0.016,
    blending: THREE.AdditiveBlending
  });
  const lines = new THREE.LineSegments(lgeo, lmat);
  S.add(lines);

  let scrollPct = 0;
  addEventListener('scroll', () => {
    scrollPct = scrollY / (document.body.scrollHeight - innerHeight);
  }, { passive: true });

  let frame = 0;
  (function tick() {
    requestAnimationFrame(tick);
    frame++;

    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i*3]   += vel[i].x;
      p[i*3+1] += vel[i].y;
      if (p[i*3]   >  7) p[i*3]   = -7;
      if (p[i*3]   < -7) p[i*3]   =  7;
      if (p[i*3+1] >  5) p[i*3+1] = -5;
      if (p[i*3+1] < -5) p[i*3+1] =  5;
    }
    geo.attributes.position.needsUpdate = true;

    if (frame % 4 === 0) {
      let li = 0;
      const la = lgeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = p[i*3] - p[j*3];
          const dy = p[i*3+1] - p[j*3+1];
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 1.5 && li < la.length - 5) {
            la[li++] = p[i*3]; la[li++] = p[i*3+1]; la[li++] = 0;
            la[li++] = p[j*3]; la[li++] = p[j*3+1]; la[li++] = 0;
          }
        }
      }
      lgeo.setDrawRange(0, li / 3);
      lgeo.attributes.position.needsUpdate = true;
    }

    cam.position.x = Math.sin(frame * 0.0004) * 0.5;
    cam.position.y = Math.cos(frame * 0.0003) * 0.25 - scrollPct * 0.9;
    cam.zoom = 1 + scrollPct * 0.18;
    cam.updateProjectionMatrix();
    mat.opacity = 0.045 + scrollPct * 0.07;
    R.render(S, cam);
  })();
})();

/* ═══ POUR ANIMATION ═══ */
const pourCvs = document.getElementById('pourCanvas');
const pourCtx = pourCvs.getContext('2d');
pourCvs.width = 200; pourCvs.height = 400;

let pourActive   = false;
let pourProgress = 0;
let lastScrollY  = 0;
let coffeeFillLevel  = 0;
let coffeeTargetLevel = 0;

addEventListener('scroll', () => {
  const sy    = scrollY;
  const heroH = innerHeight;
  const sp    = Math.min(sy / heroH, 1);

  if (sp > 0.12 && !pourActive && sy > lastScrollY) {
    pourActive   = true;
    pourProgress = 0;
    setTimeout(() => { pourActive = false; }, 2200);
  }
  lastScrollY = sy;
  coffeeTargetLevel = Math.min(sp * 1.7, 1);
  checkScrollReveal();
}, { passive: true });

/* Coffee fill animation */
(function animCoffee() {
  coffeeFillLevel += (coffeeTargetLevel - coffeeFillLevel) * 0.055;
  const fillH = Math.min(coffeeFillLevel * 150, 148);
  const fillY = 280 - fillH;
  const cf = document.getElementById('cfill');
  const cs = document.getElementById('csurf');
  const la = document.getElementById('latte');
  if (cf) { cf.setAttribute('y', fillY); cf.setAttribute('height', fillH + 10); }
  if (cs) cs.setAttribute('opacity', Math.min(coffeeFillLevel * 3, 1));
  if (la) la.setAttribute('opacity', Math.max(0, (coffeeFillLevel - 0.5) * 2));
  requestAnimationFrame(animCoffee);
})();

/* Pour stream */
(function drawPour() {
  pourCtx.clearRect(0, 0, 200, 400);
  if (!pourActive) { requestAnimationFrame(drawPour); return; }

  pourProgress += 0.016;
  if (pourProgress > 1) pourProgress = 0;

  const streamH = 200 * Math.min(pourProgress * 3, 1);
  const wob     = Math.sin(pourProgress * Math.PI * 4) * 2.5;

  const grad = pourCtx.createLinearGradient(100, 80, 100, 80 + streamH);
  grad.addColorStop(0,   'rgba(100,55,18,0.95)');
  grad.addColorStop(0.5, 'rgba(70,35,8,0.7)');
  grad.addColorStop(1,   'rgba(40,20,4,0)');

  pourCtx.beginPath();
  pourCtx.moveTo(98, 80);
  pourCtx.quadraticCurveTo(100 + wob, 80 + streamH * 0.5, 100 + wob * 0.5, 80 + streamH);
  pourCtx.lineWidth   = 7 + Math.sin(pourProgress * Math.PI) * 3;
  pourCtx.strokeStyle = grad;
  pourCtx.lineCap     = 'round';
  pourCtx.stroke();

  if (pourProgress > 0.4) {
    for (let i = 0; i < 3; i++) {
      const t     = (pourProgress - 0.4 + i * 0.1) % 1;
      const dropX = 90 + i * 8 + Math.sin(t * 5) * 4;
      const dropY = 80 + streamH + t * 40;
      const dropA = Math.max(0, 1 - t * 3);
      pourCtx.beginPath();
      pourCtx.arc(dropX, dropY, 2 + t * 3, 0, Math.PI * 2);
      pourCtx.fillStyle = `rgba(80,40,10,${dropA * 0.6})`;
      pourCtx.fill();
    }
  }
  requestAnimationFrame(drawPour);
})();

/* Idle pour trigger */
setInterval(() => {
  if (scrollY > innerHeight * 0.1 && !pourActive) {
    pourActive   = true;
    pourProgress = 0;
    setTimeout(() => { pourActive = false; }, 2100);
  }
}, 7000);

/* ═══ SCROLL REVEAL ═══ */
function checkScrollReveal() {
  document.querySelectorAll('[data-reveal]').forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight * 0.82) {
      el.classList.add('revealed');
    }
  });
}

/* ═══ DATA ═══ */
const REGIONS = {
  india:      [
    {name:'Jaipur',     lat:26.9124, lon:75.7873,  flag:'🏯'},
    {name:'Mumbai',     lat:19.076,  lon:72.8777,  flag:'🌊'},
    {name:'Bengaluru',  lat:12.9716, lon:77.5946,  flag:'💻'},
    {name:'Delhi',      lat:28.6139, lon:77.209,   flag:'🏛️'},
    {name:'Hyderabad',  lat:17.385,  lon:78.4867,  flag:'🕌'},
    {name:'Pune',       lat:18.5204, lon:73.8567,  flag:'🌿'},
    {name:'Kolkata',    lat:22.5726, lon:88.3639,  flag:'🎨'},
    {name:'Goa',        lat:15.2993, lon:74.124,   flag:'🏖️'},
    {name:'Chennai',    lat:13.0827, lon:80.2707,  flag:'🌅'},
    {name:'Udaipur',    lat:24.5854, lon:73.7125,  flag:'🏰'},
    {name:'Kochi',      lat:9.9312,  lon:76.2673,  flag:'🌴'},
    {name:'Chandigarh', lat:30.7333, lon:76.7794,  flag:'🌸'}
  ],
  europe:     [
    {name:'Paris',      lat:48.8566, lon:2.3522,   flag:'🗼'},
    {name:'Vienna',     lat:48.2082, lon:16.3738,  flag:'🎭'},
    {name:'Rome',       lat:41.9028, lon:12.4964,  flag:'🏛️'},
    {name:'Amsterdam',  lat:52.3676, lon:4.9041,   flag:'🚲'},
    {name:'Berlin',     lat:52.52,   lon:13.405,   flag:'🐻'},
    {name:'Barcelona',  lat:41.3851, lon:2.1734,   flag:'🌊'},
    {name:'Prague',     lat:50.0755, lon:14.4378,  flag:'🏰'},
    {name:'Lisbon',     lat:38.7169, lon:-9.1399,  flag:'🌞'},
    {name:'Istanbul',   lat:41.0082, lon:28.9784,  flag:'🌙'},
    {name:'Copenhagen', lat:55.6761, lon:12.5683,  flag:'🧜'}
  ],
  usa:        [
    {name:'New York',    lat:40.7128,  lon:-74.006,    flag:'🗽'},
    {name:'Los Angeles', lat:34.0522,  lon:-118.2437,  flag:'🌴'},
    {name:'Chicago',     lat:41.8781,  lon:-87.6298,   flag:'🌬️'},
    {name:'Seattle',     lat:47.6062,  lon:-122.3321,  flag:'☕'},
    {name:'San Francisco',lat:37.7749, lon:-122.4194,  flag:'🌉'},
    {name:'Portland',    lat:45.5231,  lon:-122.6765,  flag:'🌲'},
    {name:'Austin',      lat:30.2672,  lon:-97.7431,   flag:'🤠'},
    {name:'Denver',      lat:39.7392,  lon:-104.9903,  flag:'⛰️'}
  ],
  uk:         [
    {name:'London',      lat:51.5074, lon:-0.1278,  flag:'🎡'},
    {name:'Edinburgh',   lat:55.9533, lon:-3.1883,  flag:'🏰'},
    {name:'Manchester',  lat:53.4808, lon:-2.2426,  flag:'🐝'},
    {name:'Bristol',     lat:51.4545, lon:-2.5879,  flag:'🌉'},
    {name:'Oxford',      lat:51.752,  lon:-1.2577,  flag:'🎓'}
  ],
  asia:       [
    {name:'Tokyo',     lat:35.6762, lon:139.6503,  flag:'🗼'},
    {name:'Seoul',     lat:37.5665, lon:126.978,   flag:'🌸'},
    {name:'Bangkok',   lat:13.7563, lon:100.5018,  flag:'🏯'},
    {name:'Singapore', lat:1.3521,  lon:103.8198,  flag:'🦁'},
    {name:'Bali',      lat:-8.3405, lon:115.092,   flag:'🌺'},
    {name:'Taipei',    lat:25.033,  lon:121.5654,  flag:'🫧'},
    {name:'Kyoto',     lat:35.0116, lon:135.7681,  flag:'⛩'}
  ],
  middleeast: [
    {name:'Dubai',    lat:25.2048, lon:55.2708,  flag:'🏙️'},
    {name:'Beirut',   lat:33.8938, lon:35.5018,  flag:'🌲'},
    {name:'Tel Aviv', lat:32.0853, lon:34.7818,  flag:'☀️'},
    {name:'Doha',     lat:25.2854, lon:51.531,   flag:'🌊'}
  ],
  latam:      [
    {name:'São Paulo',    lat:-23.5505, lon:-46.6333,  flag:'🌆'},
    {name:'Mexico City',  lat:19.4326,  lon:-99.1332,  flag:'🏙️'},
    {name:'Buenos Aires', lat:-34.6037, lon:-58.3816,  flag:'💃'},
    {name:'Bogotá',       lat:4.711,    lon:-74.0721,  flag:'☕'},
    {name:'Medellin',     lat:6.2442,   lon:-75.5812,  flag:'🌸'}
  ]
};

const PRICE = {
  india:      { t: ['₹200–400', '₹400–800', '₹800–1500', '₹1500+'] },
  europe:     { t: ['€8–15', '€15–30', '€30–50', '€50+'] },
  usa:        { t: ['$10–20', '$20–40', '$40–70', '$70+'] },
  uk:         { t: ['£8–15', '£15–30', '£30–50', '£50+'] },
  asia:       { t: ['Budget', 'Mid', 'Premium', 'Luxury'] },
  middleeast: { t: ['AED 30–60', 'AED 60–120', 'AED 120–180', 'AED 180+'] },
  latam:      { t: ['Budget', 'Mid', 'Premium', 'Luxury'] }
};

const EMOJIS = ['☕','🍵','🫖','🧋','🍰','🥐','🍫','📚','🪴','🎵'];
const IMGS   = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1509042239860-f519d6859189?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1511920183353-1e7a4a9cca8e?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1524338198850-8a2ff61a7e8f?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1445116572489-61fa4a3b1ea4?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1542181961-9590d0c79dab?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&h=380&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=600&h=380&fit=crop&auto=format&q=80',
];

/* ═══ LAZY IMAGE OBSERVER ═══ */
let iObs;
function initIObs() {
  if (iObs) iObs.disconnect();
  iObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      iObs.unobserve(img);
      const src = img.dataset.src;
      if (!src) return;
      const tmp   = new Image();
      tmp.onload  = () => {
        img.src = src;
        img.classList.add('on');
        const ph = img.previousElementSibling;
        if (ph && ph.classList.contains('c-ph')) ph.style.opacity = 0;
      };
      tmp.onerror = () => {
        img.src = IMGS[(parseInt(img.dataset.idx || 0) + 5) % IMGS.length];
        img.classList.add('on');
      };
      tmp.src = src;
    });
  }, { rootMargin: '250px 0px', threshold: 0.01 });
}
initIObs();

/* ═══ MAP ═══ */
let lMap = null;
function initMap(lat, lon, cafes, city) {
  if (!window.L) {
    const lc = document.createElement('link');
    lc.rel  = 'stylesheet';
    lc.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(lc);
    const ls    = document.createElement('script');
    ls.src      = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    ls.onload   = () => buildMap(lat, lon, cafes, city);
    document.head.appendChild(ls);
  } else {
    buildMap(lat, lon, cafes, city);
  }
}

function buildMap(lat, lon, cafes, city) {
  const el = document.getElementById('leafMap');
  document.getElementById('mapPh').style.display = 'none';
  el.style.display = 'block';
  el.style.flex    = '1';
  if (lMap) { lMap.remove(); lMap = null; }

  lMap = L.map(el, { zoomControl: true, scrollWheelZoom: true }).setView([lat, lon], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd', maxZoom: 19
  }).addTo(lMap);

  const toPlot = cafes.filter(c => c.lat && c.lon).slice(0, 300);
  toPlot.forEach(c => {
    const col = c.openStatus === true  ? '#8dd4a0'
              : c.openStatus === false ? '#e08080'
              : '#c49a3c';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="0 0 30 36">
      <ellipse cx="15" cy="34" rx="5" ry="2" fill="rgba(0,0,0,.3)"/>
      <path d="M15 2C8 2 2 8 2 15C2 24 15 34 15 34S28 24 28 15C28 8 22 2 15 2Z" fill="#1a140a" stroke="${col}" stroke-width="1.5"/>
      <circle cx="15" cy="14" r="7" fill="#241c10"/>
      <path d="M10 13 Q9.5 17 10 19 Q15 21 20 19 Q20.5 17 20 13 Q19 11 15 11 Q11 11 10 13Z" fill="${col}" opacity=".85"/>
      <ellipse cx="15" cy="12.5" rx="5" ry="1.5" fill="${col}" opacity=".6"/>
      <ellipse cx="15" cy="12.5" rx="4.5" ry="1.2" fill="#1a0e06"/>
      <path d="M20 14.5 Q23 14.5 23 16.5 Q23 18.5 20 18.5" stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`;
    const icon = L.divIcon({
      html: svg, className: '',
      iconSize: [30, 36], iconAnchor: [15, 34], popupAnchor: [0, -32]
    });
    L.marker([c.lat, c.lon], { icon })
      .addTo(lMap)
      .bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:145px;background:#1a140a;color:#f0e6d0;padding:4px">
          <b style="font-size:.85rem">${esc(c.name)}</b><br>
          <span style="font-size:.6rem;color:#888">${esc(c.addr || '')}</span>
        </div>`, { className: 'cs-pop' })
      .on('click', () => openModal(c.id));
  });

  document.getElementById('mapCityBadge').textContent = city;
  document.getElementById('mapGmLink').href = `https://www.google.com/maps/search/cafes/@${lat},${lon},14z`;
  document.getElementById('mapFtTxt').textContent =
    `${cafes.length} cafés · ${cafes.filter(x => x.openStatus === true).length} open`;

  if (!document.getElementById('csPop')) {
    const s = document.createElement('style');
    s.id    = 'csPop';
    s.textContent = `
      .cs-pop .leaflet-popup-content-wrapper {
        background: #1a140a;
        border: 1px solid rgba(196,154,60,.25);
        border-radius: 3px;
        color: #f0e6d0;
        box-shadow: 0 8px 32px rgba(0,0,0,.7);
        padding: 0;
      }
      .cs-pop .leaflet-popup-tip { background: #1a140a; }
      .cs-pop .leaflet-popup-content { margin: 10px 12px; font-family: 'DM Sans',sans-serif; }
      .leaflet-popup-close-button { color: #c49a3c !important; }
    `;
    document.head.appendChild(s);
  }
}

/* ═══ APP STATE ═══ */
const CACHE   = {};
const TTL     = 600000;
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

let ALL     = [];
let SHOWN   = 0;
const PS    = 60;
let FILTERS = [];
let CITY    = null;
let LOADING = false;
let SQ      = '';
let CREG    = 'india';

/* ── Region selection ── */
function setReg(el, r, init = false) {
  document.querySelectorAll('.rtab').forEach(t => t.classList.remove('act'));
  (el || document.querySelector(`[data-r="${r}"]`))?.classList.add('act');
  CREG = r;

  const row = document.getElementById('cityRow');
  row.innerHTML = (REGIONS[r] || REGIONS.india)
    .map(c => `<button class="cbtn" data-city="${c.name}" data-lat="${c.lat}" data-lon="${c.lon}" onclick="pickCity(this)">${c.flag} ${c.name}</button>`)
    .join('');

  if (!init) {
    const f = row.querySelector('.cbtn');
    if (f) pickCity(f);
  }
}

function pickCity(el) {
  document.querySelectorAll('.cbtn').forEach(b => b.classList.remove('act'));
  el.classList.add('act');
  document.getElementById('mainSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  loadCafes(el.dataset.city, +el.dataset.lat, +el.dataset.lon);
}

function refresh() {
  if (CITY) { delete CACHE[CITY.name]; loadCafes(CITY.name, CITY.lat, CITY.lon); }
}

function qv(t) {
  document.getElementById('sIn').value = t;
  SQ = t.toLowerCase();
  document.getElementById('mainSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderAll();
}

/* Build a flat lookup for search */
const ALL_C = {};
Object.entries(REGIONS).forEach(([reg, cs]) => {
  cs.forEach(c => {
    ALL_C[c.name.toLowerCase()] = { ...c, reg };
    if (c.name === 'Bengaluru')  ALL_C['bangalore'] = { ...c, reg };
    if (c.name === 'Mumbai')     ALL_C['bombay']    = { ...c, reg };
    if (c.name === 'Delhi')      ALL_C['new delhi'] = { ...c, reg };
  });
});

async function doSearch() {
  const raw = document.getElementById('sIn').value.trim();
  if (!raw) return;
  document.getElementById('mainSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
  const q = raw.toLowerCase();
  const k = ALL_C[q];

  if (k) {
    if (k.reg !== CREG) setReg(null, k.reg, true);
    document.querySelectorAll('.cbtn').forEach(
      b => b.classList.toggle('act', b.dataset.city.toLowerCase() === k.name.toLowerCase())
    );
    loadCafes(k.name, k.lat, k.lon);
    return;
  }

  const vibeKw = ['wifi','outdoor','pet','quiet','rooftop','vegan','music','takeaway'];
  if (!vibeKw.some(kw => q.includes(kw)) && q.split(' ').length <= 3) {
    showSt(`Looking up ${raw}…`, '');
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(raw)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'CafeSense/2' }, signal: AbortSignal.timeout(6000) }
      );
      const d = await r.json();
      if (d && d[0]) {
        hideSt();
        loadCafes(d[0].display_name.split(',')[0], +d[0].lat, +d[0].lon);
        return;
      }
    } catch {}
    hideSt();
  }
  SQ = q;
  renderAll();
}

/* ── Overpass query ── */
function buildQ(lat, lon, r = 10000) {
  return `[out:json][timeout:55];(node["amenity"="cafe"](around:${r},${lat},${lon});node["amenity"="coffee_shop"](around:${r},${lat},${lon});node["shop"="coffee"](around:${r},${lat},${lon});node["amenity"="restaurant"]["cuisine"~"coffee"](around:${r},${lat},${lon});way["amenity"="cafe"](around:${r},${lat},${lon});way["shop"="coffee"](around:${r},${lat},${lon}););out body;>;out skel qt;`;
}

async function tryF(url, q) {
  const r = await fetch(url, {
    method: 'POST',
    body:    'data=' + encodeURIComponent(q),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal:  AbortSignal.timeout(22000)
  });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

function isDead(t) {
  if (!t) return false;
  const h = (t.opening_hours || '').toLowerCase();
  if (h === 'closed' || h === 'off' || h === 'no') return true;
  for (const p of ['disused','abandoned','demolished','removed','was']) {
    if (t[`${p}:amenity`] || t[`${p}:shop`]) return true;
  }
  return t.access === 'private' || t.access === 'no';
}

async function loadCafes(city, lat, lon) {
  if (LOADING) return;
  LOADING = true;
  CITY = { name: city, lat, lon };
  SQ = ''; FILTERS = []; ALL = []; SHOWN = 0;

  document.querySelectorAll('.ftag').forEach(f => f.classList.remove('on'));
  document.getElementById('toolbar').style.display    = 'none';
  document.getElementById('resHeader').style.display  = 'none';
  setResCity(city, 'Loading…');

  const cached = CACHE[city];
  if (cached && Date.now() - cached.ts < TTL) {
    ALL = cached.data;
    finishLoad(lat, lon, city);
    LOADING = false;
    return;
  }

  setP(5); showSt('Connecting to OpenStreetMap…', ''); showSkels();
  try {
    setP(25); showSt('Fetching café data…', '');
    const data = await Promise.any(MIRRORS.map(m => tryF(m, buildQ(lat, lon))));
    setP(85); showSt('Processing…', `${data.elements?.length || 0} elements`);

    const raw = (data.elements || []).filter(e =>
      (e.type === 'node' || e.type === 'way') &&
      !isDead(e.tags) &&
      (e.lat || e.center?.lat)
    );
    ALL = raw.map(enrich);
    ALL.sort((a, b) => a.hasName === b.hasName ? 0 : a.hasName ? -1 : 1);
    CACHE[city] = { ts: Date.now(), data: ALL };

    setP(100);
    setTimeout(() => setP(0), 400);
    hideSt();
    finishLoad(lat, lon, city);
  } catch {
    setP(0); hideSt();
    document.getElementById('grid').innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">☕</div>
        <div class="empty-h">Couldn't reach cafés</div>
        <div class="empty-p">OSM servers are busy. Try again in a moment.</div>
        <button class="retry" onclick="refresh()">Try Again</button>
      </div>`;
    setResCity(city, 'Error');
    document.getElementById('resHeader').style.display = 'block';
  }
  LOADING = false;
}

function finishLoad(lat, lon, city) {
  updateStats();
  renderAll();
  initIObs();
  document.getElementById('toolbar').style.display   = 'flex';
  document.getElementById('resHeader').style.display = 'block';
  setResCity(city, `${ALL.length.toLocaleString()} cafés found`);
  initMap(lat, lon, ALL, city);
}

/* ── Tag parsing ── */
function parseTags(t) {
  return {
    name:        t.name || t['name:en'] || t.brand || '',
    addr:        [t['addr:street'], t['addr:suburb'] || t['addr:city']].filter(Boolean).join(', ') || t['addr:full'] || '',
    hours:       t.opening_hours || '',
    phone:       t.phone || t['contact:phone'] || '',
    website:     t.website || t['contact:website'] || '',
    wifi:        t.internet_access === 'wlan'  || t.internet_access === 'yes',
    outdoor:     t.outdoor_seating === 'yes'   || t.outdoor_seating === 'covered',
    pet:         t.dog === 'yes'   || t.dog === 'leashed' || t.dogs === 'yes',
    vegan:       t['diet:vegan']   === 'yes'   || t['diet:vegan'] === 'only',
    delivery:    t.delivery        === 'yes',
    takeaway:    t.takeaway        === 'yes',
    liveMusic:   t.live_music      === 'yes',
    cuisine:     t.cuisine         || '',
    since:       t.start_date      || '',
    description: t.description     || ''
  };
}

function isOpen(h) {
  if (!h) return null;
  if (h.includes('24/7')) return true;
  const lc = h.toLowerCase();
  if (lc === 'closed' || lc === 'no' || lc === 'off') return false;
  try {
    const m = h.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (m) {
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();
      const o   = +m[1] * 60 + +m[2];
      let   c   = +m[3] * 60 + +m[4];
      if (c < o) c += 1440;
      return cur >= o && cur <= c;
    }
    return null;
  } catch { return null; }
}

function enrich(el, i) {
  const t    = parseTags(el.tags || {});
  const tags = [];
  if (t.cuisine)                    tags.push(t.cuisine.split(';')[0].trim());
  if (t.wifi)                       tags.push('WiFi');
  if (t.outdoor)                    tags.push('Outdoor');
  if (t.pet)                        tags.push('Pet-Friendly');
  if (t.vegan)                      tags.push('Vegan');
  if (t.liveMusic)                  tags.push('Live Music');
  if (t.delivery)                   tags.push('Delivery');
  if (t.takeaway)                   tags.push('Takeaway');
  if (t.since && +t.since >= 2020)  tags.push('New Opening');
  if (t.since && +t.since < 2005)   tags.push('Legacy');

  const pr = (PRICE[CREG] || PRICE.india).t;
  return {
    id:         el.id,
    idx:        i,
    name:       t.name || `Café #${i + 1}`,
    hasName:    !!t.name,
    addr:       t.addr,
    lat:        el.lat  || el.center?.lat,
    lon:        el.lon  || el.center?.lon,
    hours:      t.hours,
    openStatus: isOpen(t.hours),
    phone:      t.phone,
    website:    t.website,
    wifi:       t.wifi,
    outdoor:    t.outdoor,
    pet:        t.pet,
    vegan:      t.vegan,
    delivery:   t.delivery,
    takeaway:   t.takeaway,
    liveMusic:  t.liveMusic,
    cuisine:    t.cuisine,
    since:      t.since,
    description:t.description,
    isNew:      t.since && +t.since >= 2020,
    priceLabel: pr[i % 4],
    priceTier:  i % 4,
    rating:     (3.6 + Math.random() * 1.3).toFixed(1),
    reviews:    Math.floor(Math.random() * 800 + 8),
    emoji:      EMOJIS[i % EMOJIS.length],
    imgUrl:     IMGS[i % IMGS.length],
    tags
  };
}

/* ── Stats marquee ── */
function updateStats() {
  const o  = ALL.filter(c => c.openStatus === true).length;
  const w  = ALL.filter(c => c.wifi).length;
  const p  = ALL.filter(c => c.pet).length;
  const ou = ALL.filter(c => c.outdoor).length;
  [['mq-total','mq-total2'],ALL.length], [['mq-open','mq-open2'],o],
  [['mq-wifi','mq-wifi2'],w], [['mq-pet','mq-pet2'],p], [['mq-out','mq-out2'],ou];
  [['mq-total','mq-total2'],['mq-open','mq-open2'],['mq-wifi','mq-wifi2'],['mq-pet','mq-pet2'],['mq-out','mq-out2']]
    .forEach(([ids,], val) => ids);
  // explicit
  animNs(['mq-total','mq-total2'], ALL.length);
  animNs(['mq-open', 'mq-open2'],  o);
  animNs(['mq-wifi', 'mq-wifi2'],  w);
  animNs(['mq-pet',  'mq-pet2'],   p);
  animNs(['mq-out',  'mq-out2'],   ou);
}
function animNs(ids, target) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let v = 0;
    const step = Math.max(1, Math.ceil(target / 28));
    const ti = setInterval(() => {
      v = Math.min(v + step, target);
      el.textContent = v.toLocaleString();
      if (v >= target) clearInterval(ti);
    }, 18);
  });
}

function setResCity(city, sub) {
  document.getElementById('resCity').innerHTML = `${esc(city)} <em>cafés</em>`;
  document.getElementById('resSub').textContent = sub;
}

/* ── Filtering & sorting ── */
function applyF() {
  let d = [...ALL];
  if (FILTERS.includes('open'))     d = d.filter(c => c.openStatus === true);
  if (FILTERS.includes('wifi'))     d = d.filter(c => c.wifi);
  if (FILTERS.includes('outdoor'))  d = d.filter(c => c.outdoor);
  if (FILTERS.includes('pet'))      d = d.filter(c => c.pet);
  if (FILTERS.includes('vegan'))    d = d.filter(c => c.vegan);
  if (FILTERS.includes('delivery')) d = d.filter(c => c.delivery);
  if (FILTERS.includes('named'))    d = d.filter(c => c.hasName);

  if (SQ) {
    const q = SQ;
    d = d.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.addr || '').toLowerCase().includes(q) ||
      (c.cuisine || '').toLowerCase().includes(q) ||
      c.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  const s = document.getElementById('sortSel')?.value || 'smart';
  if (s === 'rating') d.sort((a, b) => b.rating - a.rating);
  else if (s === 'name') d.sort((a, b) => a.name.localeCompare(b.name));
  else d.sort((a, b) => a.hasName === b.hasName ? 0 : a.hasName ? -1 : 1);
  return d;
}

function renderAll() {
  const d = applyF();
  SHOWN   = Math.min(PS, d.length);
  renderCards(d.slice(0, SHOWN), d, false);
}

function renderCards(slice, all, append) {
  const grid = document.getElementById('grid');
  if (!all.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-ico">☕</div>
        <div class="empty-h">No cafés match</div>
        <div class="empty-p">Try removing filters or search for a different city.</div>
      </div>`;
    document.getElementById('resCnt').textContent = '';
    return;
  }

  document.getElementById('resCnt').textContent =
    `${Math.min(SHOWN, all.length)} / ${all.length.toLocaleString()}`;
  setResCity(CITY?.name || '', `${all.length.toLocaleString()} cafés found`);

  const html = slice.map((c, i) => makeCard(c, i)).join('');
  if (append) {
    grid.querySelector('.load-wrap')?.remove();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) grid.appendChild(tmp.firstChild);
  } else {
    grid.innerHTML = html;
  }

  grid.querySelectorAll('.c-img[data-src]').forEach(img => { if (iObs) iObs.observe(img); });
  grid.querySelectorAll('.card:not(.vis)').forEach((c, i) =>
    setTimeout(() => c.classList.add('vis'), i * 25)
  );
  grid.querySelector('.load-wrap')?.remove();

  if (SHOWN < all.length) {
    const div = document.createElement('div');
    div.className = 'load-wrap';
    div.innerHTML = `
      <button class="lm-btn" id="lmBtn" onclick="loadMore()">
        <div class="lm-spin"></div>Load more
      </button>
      <span class="lm-info">${SHOWN} of ${all.length.toLocaleString()}</span>`;
    grid.appendChild(div);
  }
}

function loadMore() {
  const d   = applyF();
  const btn = document.getElementById('lmBtn');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }
  setTimeout(() => {
    const s = SHOWN;
    const e = Math.min(s + PS, d.length);
    SHOWN   = e;
    renderCards(d.slice(s, e), d, true);
  }, 160);
}

function togF(el) {
  const f = el.dataset.f;
  el.classList.toggle('on');
  FILTERS = FILTERS.includes(f)
    ? FILTERS.filter(x => x !== f)
    : [...FILTERS, f];
  renderAll();
}

/* ── Card HTML ── */
function makeCard(c, i) {
  const addr = c.addr || (CITY ? CITY.name : '');
  const bs   = [];
  if (c.openStatus === true)  bs.push('<span class="badge b-open">Open</span>');
  if (c.openStatus === false) bs.push('<span class="badge b-closed">Closed</span>');
  if (c.isNew)                bs.push('<span class="badge b-new">New</span>');
  const num = String(i + 1).padStart(2, '0');

  return `<div class="card" id="card-${c.id}" onclick="openModal('${c.id}')">
    <div class="c-img-wrap">
      <div class="c-ph"></div>
      <img class="c-img" data-src="${c.imgUrl}" data-idx="${c.idx}" alt="${esc(c.name)}">
      <div class="c-overlay"></div>
      <div class="c-badges">${bs.slice(0, 2).join('')}</div>
      <div class="c-rating">★ ${c.rating}</div>
    </div>
    <div class="c-body">
      <div class="c-num">${num}</div>
      <div class="c-name">${esc(c.name)}</div>
      <div class="c-loc">${esc(addr)}</div>
      <div class="c-tags">${c.tags.slice(0, 3).map(t => `<span class="ctag">${esc(t)}</span>`).join('')}</div>
      <div class="c-foot">
        <div>
          <div class="c-price">${esc(c.priceLabel)}</div>
          <div class="c-price-sub">for 2 people</div>
        </div>
        <div class="c-arrow">→</div>
      </div>
    </div>
  </div>`;
}

/* ── Skeletons ── */
function showSkels() {
  document.getElementById('grid').innerHTML = Array(6).fill(0)
    .map((_, i) => `
      <div class="skel" style="animation-delay:${i * 0.06}s">
        <div class="skel-img"></div>
        <div class="skel-body">
          <div class="skel-line" style="height:16px;width:62%;margin-bottom:.8rem"></div>
          <div class="skel-line" style="height:9px;width:38%"></div>
        </div>
      </div>`)
    .join('');
}

/* ═══ MODAL ═══ */
function openModal(id) {
  const c = ALL.find(x => String(x.id) === String(id));
  if (!c) return;

  /* Image */
  const mi = document.getElementById('mImg');
  mi.innerHTML = '<div class="modal-img-g"></div>';
  const im        = document.createElement('img');
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .45s';
  im.onload  = () => im.style.opacity = 1;
  im.onerror = () => { im.src = IMGS[(c.idx + 5) % IMGS.length]; };
  im.src = c.imgUrl;
  mi.insertBefore(im, mi.firstChild);

  document.getElementById('mName').textContent = c.name;
  document.getElementById('mLoc').textContent  = '📍 ' + (c.addr || CITY?.name || '');

  document.getElementById('mPrice').innerHTML = `
    <div class="modal-price-box">
      <div class="modal-price-amt">${esc(c.priceLabel)}</div>
      <div class="modal-price-lbl">Avg. for two people<br>
        <span style="color:var(--gold3)">${['Budget','Moderate','Premium','Luxury'][c.priceTier]}</span>
      </div>
    </div>`;

  const os = c.openStatus === true  ? '🟢 Open Now'
           : c.openStatus === false ? '🔴 Closed'
           : '⚪ Unknown';

  document.getElementById('mDets').innerHTML = `
    <div class="m-det"><span class="m-det-ico">🕐</span><div><div class="m-det-lbl">Hours</div><div class="m-det-val">${c.hours || '—'}</div></div></div>
    <div class="m-det"><span class="m-det-ico">📊</span><div><div class="m-det-lbl">Status</div><div class="m-det-val">${os}</div></div></div>
    <div class="m-det"><span class="m-det-ico">⭐</span><div><div class="m-det-lbl">Rating</div><div class="m-det-val">${c.rating} · ${c.reviews} reviews</div></div></div>
    <div class="m-det"><span class="m-det-ico">📶</span><div><div class="m-det-lbl">WiFi</div><div class="m-det-val">${c.wifi ? '✓ Available' : 'Not listed'}</div></div></div>
    <div class="m-det"><span class="m-det-ico">🌳</span><div><div class="m-det-lbl">Outdoor</div><div class="m-det-val">${c.outdoor ? '✓ Yes' : 'Indoor only'}</div></div></div>
    ${c.pet ? `<div class="m-det"><span class="m-det-ico">🐾</span><div><div class="m-det-lbl">Pets</div><div class="m-det-val">✓ Allowed</div></div></div>` : ''}
  `;

  document.getElementById('mTags').innerHTML = c.tags
    .map(t => `<span class="modal-tag">${esc(t)}</span>`).join('');

  document.getElementById('mDesc').innerHTML = c.description
    ? `<div class="modal-desc"><p>${esc(c.description)}</p></div>`
    : '';

  document.getElementById('mPhone').innerHTML = c.phone
    ? `<div style="padding:.7rem;border:1px solid rgba(196,154,60,.12);margin-bottom:1rem;display:flex;align-items:center;gap:.7rem;font-size:.8rem;color:var(--cream)">
        📞 ${esc(c.phone)}
        <a href="tel:${c.phone}" style="margin-left:auto;font-family:'Syne',sans-serif;font-size:.55rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold2);text-decoration:none;font-weight:700">Call</a>
       </div>`
    : '';

  const sq       = encodeURIComponent((c.name + ' ' + (CITY?.name || '')).trim());
  const gmUrl    = 'https://www.google.com/maps/search/?api=1&query=' + sq;
  const appleUrl = c.lat && c.lon
    ? `https://maps.apple.com/?ll=${c.lat},${c.lon}&q=${encodeURIComponent(c.name)}`
    : `https://maps.apple.com/?q=${sq}`;
  const osmUrl   = c.lat && c.lon
    ? `https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lon}#map=17/${c.lat}/${c.lon}`
    : `https://www.openstreetmap.org/search?query=${sq}`;

  let acts = '';
  if (c.website) acts += `<a href="${c.website}" target="_blank" rel="noopener" style="display:block;text-align:center;padding:.7rem;border:1px solid rgba(196,154,60,.14);font-family:'Syne',sans-serif;font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:rgba(240,230,208,.4);text-decoration:none;margin-bottom:.8rem;transition:all .2s">🌐 Visit Website</a>`;
  acts += `<div class="modal-actions">
    <a href="${gmUrl}"    target="_blank" rel="noopener" class="m-act-primary">🗺️ Google Maps</a>
    <a href="${appleUrl}" target="_blank" rel="noopener" class="m-act-sec">🍎 Apple Maps</a>
  </div>`;
  if (c.lat && c.lon) acts += `<div class="m-coords">${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}</div>`;
  acts += `<a href="${osmUrl}" target="_blank" rel="noopener" class="m-osm">🗺️ View on OpenStreetMap</a>`;
  document.getElementById('mActs').innerHTML = acts;

  if (lMap && c.lat && c.lon) lMap.panTo([c.lat, c.lon], { animate: true, duration: 0.5 });
  document.getElementById('ovBg').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('ovBg').classList.remove('open');
  document.body.style.overflow = '';
}
function ovClick(e) {
  if (e.target === document.getElementById('ovBg')) closeModal();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

/* ═══ UTILITIES ═══ */
function setP(v) { document.getElementById('prog').style.width = v + '%'; }
function showSt(t, c) {
  document.getElementById('statusBar').classList.add('on');
  document.getElementById('statusTxt').textContent = t;
  document.getElementById('statusCt').textContent  = c;
}
function hideSt() { document.getElementById('statusBar').classList.remove('on'); }
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ═══ INIT ═══ */
setReg(null, 'india', true);
window.addEventListener('load', () => {
  setTimeout(() => {
    const b = document.querySelector('[data-city="Jaipur"]');
    if (b) pickCity(b);
  }, 300);
});
document.getElementById('sIn').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});