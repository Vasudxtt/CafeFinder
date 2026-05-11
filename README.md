<div align="center">

# ☕ CafeFindr

*find your perfect cup — anywhere on earth*

[live demo](https://cafefindr.netlify.app) &nbsp;·&nbsp; [report bug](https://github.com/vasudxtt/cafefindr/issues) &nbsp;·&nbsp; [source](https://github.com/vasudxtt/cafefindr)

</div>

---

CafeFindr is a single-file café discovery app powered by live [OpenStreetMap](https://www.openstreetmap.org/) data. Search any city on Earth, filter by vibe, and explore real cafés on an interactive map — wrapped in a luxury editorial dark UI with a Three.js particle field and scroll-triggered coffee pour animation.

No server. No API key. No framework. Just one `index.html`.

---

**Features**

```
🌍  worldwide coverage    any city via Nominatim geocoding
🗺️  live map              Leaflet + custom gold SVG markers
🔍  smart filters         WiFi · Outdoor · Pet · Vegan · Open Now
📋  café drawer           hours · tags · price · Google & Apple Maps
✨  animated UI           Three.js particles · scroll pour · grain overlay
⚡  fast & reliable       3-mirror Overpass fallback · 10-min cache
```

---

**Stack**

```
Data        Overpass API  (OpenStreetMap)
Map         Leaflet.js 1.9.4  ·  CARTO dark tiles
3D          Three.js r128
Geocoding   Nominatim
Frontend    HTML  ·  CSS  ·  Vanilla JS   —   no build step
Fonts       Playfair Display  ·  DM Sans  ·  Syne
```

---

**Run locally**

```bash
git clone https://github.com/vasudxtt/cafefindr.git
cd cafefindr
open index.html          # or: npx serve .
```

---

<div align="center">

[cafefindr.netlify.app](https://cafefindr.netlify.app) &nbsp;·&nbsp; MIT © [vasudxtt](https://github.com/vasudxtt)

</div>
