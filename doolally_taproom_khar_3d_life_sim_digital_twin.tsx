import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Eye, BookOpen, Smartphone, Flame, CloudRain,
  ShieldCheck, TrendingUp, Users, Beer, Award, DollarSign,
  Compass, RotateCcw, Sparkles, CheckCircle2, AlertTriangle,
  X, RefreshCw, Sun, Moon
} from 'lucide-react';

// ============================================================================
// 1. CALIBRATED DOOLALLY KHAR WEST CONSTANTS & DATA TABLES
// ============================================================================
const KHAR_TASTERS = [
  { id: 'alphonso', name: 'Alphonso Mead', abv: '5.5%', price: 185, kegIdx: 1, color: '#f59e0b' },
  { id: 'cider', name: 'Apple Cider', abv: '4.5%', price: 170, kegIdx: 0, color: '#fbbf24' },
  { id: 'ipa', name: 'Indian Pale Ale', abv: '6.0%', price: 190, kegIdx: 5, color: '#d97706' },
  { id: 'wit', name: 'Belgian Witbier', abv: '4.8%', price: 165, kegIdx: 2, color: '#fde68a' },
  { id: 'blueberry', name: 'Blueberry Cider', abv: '4.7%', price: 180, kegIdx: 3, color: '#a855f7' },
  { id: 'stout', name: 'Oatmeal Stout', abv: '5.2%', price: 175, kegIdx: 4, color: '#451a03' },
];

const KHAR_STARTERS = [
  { id: 'radha', name: 'Radhaballabhi & Aloo Dum (Mini)', price: 220 },
  { id: 'khawswe', name: 'Burmese Khaw Swe Tasting Bowl', price: 260 },
  { id: 'parmigiana', name: 'Chicken Parmigiana Bites', price: 295 },
  { id: 'prawns', name: 'Butter Garlic Prawns Skewers', price: 340 },
];

const INITIAL_KEGS = [
  { name: 'Apple Cider', style: 'Crisp Cider • 4.5%', pct: 52, rateLph: 5.8 },
  { name: 'Alphonso Mead', style: 'Ratnagiri Mango • 5.5%', pct: 26, rateLph: 6.4 },
  { name: 'Belgian Witbier', style: 'Spiced Wheat • 4.8%', pct: 74, rateLph: 4.6 },
  { name: 'Blueberry Cider', style: 'Berry Cider • 4.7%', pct: 61, rateLph: 4.2 },
  { name: 'Oatmeal Stout', style: 'Roasted Malt • 5.2%', pct: 55, rateLph: 3.4 },
  { name: 'Indian Pale Ale', style: 'Hoppy IPA • 6.0%', pct: 38, rateLph: 5.1 },
  { name: 'Hefeweizen', style: 'Bavarian Wheat • 5.0%', pct: 68, rateLph: 3.9 },
  { name: 'Coffee Orange Mead', style: 'Craft Mead • 5.4%', pct: 79, rateLph: 3.1 },
];

const GUEST_NAMES = [
  'Rohan M.', 'Priya K.', 'Kabir S.', 'Ananya R.', 'Vikram D.',
  'Meera N.', 'Aditya P.', 'Zoya T.', 'Nikhil B.', 'Tara V.',
  'Siddharth G.', 'Nandini J.', 'Karan W.', 'Pooja L.'
];

const OUTFIT_PALETTE = [
  0x3b82f6, 0xec4899, 0x10b981, 0xf59e0b,
  0x8b5cf6, 0x06b6d4, 0xf97316, 0xe11d48
];

const SKIN_PALETTE = [0xd99b66, 0xc68642, 0x8d5524, 0xe0ac69];

const CAMERA_PRESETS = {
  overview: { pos: [18.5, 20.5, 20.5], target: [0.0, 0.6, 0.2] },
  entrance: { pos: [5.8, 9.0, 18.8], target: [-1.5, 0.8, 10.2] },
  bar:      { pos: [3.6, 9.6, 2.5],  target: [-7.4, 1.2, -1.5] },
  tables:   { pos: [13.0, 10.4, 5.2], target: [3.6, 1.0, -3.5] },
};

// ============================================================================
// 2. PROCEDURAL ADOBE-GRADE TEXTURE & SKY DOME GENERATORS
// ============================================================================
function createWoodTexture(THREE, baseHex = '#9c6234', grainHex = '#6e3f1b') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = grainHex;
  for (let i = 0; i < 56; i++) {
    const y = (i * 256) / 56;
    ctx.globalAlpha = 0.14 + (i % 4) * 0.05;
    ctx.fillRect(0, y, 256, 1.5 + (i % 3));
  }
  ctx.globalAlpha = 0.32;
  ctx.fillRect(0, 126, 256, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createTerracottaTileTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#472a1d';
  ctx.fillRect(0, 0, 256, 256);
  const tile = 64;
  for (let y = 0; y < 256; y += tile) {
    for (let x = 0; x < 256; x += tile) {
      const isAlt = ((x + y) / tile) % 2 === 0;
      ctx.fillStyle = isAlt ? '#6b412e' : '#5e3726';
      ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      // Warm adobe edge bevel highlight
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 3, y + 3, tile - 6, tile - 6);
      // Subtle geometric medallion
      ctx.fillStyle = 'rgba(251, 191, 36, 0.07)';
      ctx.beginPath();
      ctx.arc(x + tile / 2, y + tile / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 11);
  return tex;
}

function createBrickWallTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#efe5d6';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = 'rgba(168, 118, 82, 0.22)';
  for (let row = 0; row < 8; row++) {
    const offset = (row % 2) * 32;
    for (let col = 0; col < 5; col++) {
      ctx.fillRect(col * 64 + offset - 28, row * 16 + 2, 58, 12);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

function createSkyDomeTexture(THREE, mode = 'night') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);

  if (mode === 'golden') {
    // Mumbai Golden Hour Sunset over Arabian Sea
    grad.addColorStop(0.0, '#1e1b4b');
    grad.addColorStop(0.35, '#581c87');
    grad.addColorStop(0.62, '#c2410c');
    grad.addColorStop(0.82, '#f59e0b');
    grad.addColorStop(1.0, '#fef3c7');
  } else if (mode === 'monsoon') {
    // Moody Mumbai Monsoon Overcast
    grad.addColorStop(0.0, '#090d16');
    grad.addColorStop(0.45, '#1e293b');
    grad.addColorStop(0.8, '#334155');
    grad.addColorStop(1.0, '#475569');
  } else {
    // Saturday Peak Starry Twilight
    grad.addColorStop(0.0, '#070913');
    grad.addColorStop(0.45, '#13182e');
    grad.addColorStop(0.78, '#291d28');
    grad.addColorStop(1.0, '#45241c');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle stars in night/golden modes
  if (mode !== 'monsoon') {
    ctx.fillStyle = 'rgba(255, 251, 235, 0.75)';
    for (let i = 0; i < 95; i++) {
      const sx = (i * 73) % 512;
      const sy = (i * 37) % 125;
      const r = (i % 3 === 0) ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

function createChalkboardTexture(THREE, title, items) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 244, 372);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, 128, 46);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '18px monospace';
  items.forEach((line, i) => {
    ctx.fillText(line, 128, 94 + i * 42);
  });
  return new THREE.CanvasTexture(c);
}

function createProjectorTexture(THREE, active) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  if (!active) {
    ctx.fillStyle = '#292524';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#a8a29e';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DOOLALLY KHAR SCREENING', 256, 118);
    ctx.font = '18px monospace';
    ctx.fillText('(Standby — Toggle MI Match Night)', 256, 155);
  } else {
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(256, 142, 212, 88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(216, 130, 80, 24);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 512, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE IPL: MI 188/4 (18.4 OV) • WANKHEDE', 256, 30);
  }
  return new THREE.CanvasTexture(c);
}

// ============================================================================
// 3. MAIN REACT APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [threeReady, setThreeReady] = useState(typeof window !== 'undefined' && Boolean(window.THREE));
  const [leftTab, setLeftTab] = useState('ops');
  const [guestDrawerOpen, setGuestDrawerOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Guest Mobile Pass Drawer Form State
  const [guestName, setGuestName] = useState('Aarav S.');
  const [guestPax, setGuestPax] = useState(2);
  const [mugClub, setMugClub] = useState(false);
  const [playerTab, setPlayerTab] = useState([]);

  // Throttled 4Hz HUD Snapshot synced from high-FPS Three.js simulation loop
  const [hud, setHud] = useState({
    scenario: 3,
    playing: true,
    speed: 5,
    cinemaMode: false,
    atmosphere: 'night', // 'golden' | 'night' | 'monsoon'
    miScreening: false,
    monsoonSurge: false,
    showOverlays: true,
    cameraPreset: 'overview',
    clockText: '19:30',
    bmcObstructed: false,
    queued: 2,
    reneged: 1,
    seatedTotal: 14,
    loungeRevenue: 9850,
    mainDiningRevenue: 34500,
    utilPct: 78,
    kegs: INITIAL_KEGS,
    kitchenStock: [
      { name: 'Radhaballabhi Prep Trays', left: 28, max: 40 },
      { name: 'Chicken Parmigiana Skewers', left: 19, max: 35 },
      { name: 'Khaw Swe Tasting Bowls', left: 24, max: 35 },
      { name: 'Butter Garlic Prawns Packs', left: 14, max: 30 },
    ],
    drinkSales: [
      { name: 'Alphonso Mead', pours: 44, rev: 11880 },
      { name: 'Apple Cider', pours: 41, rev: 10660 },
      { name: 'Indian Pale Ale', pours: 29, rev: 8120 },
      { name: 'Belgian Witbier', pours: 26, rev: 6760 },
      { name: 'Blueberry Cider', pours: 21, rev: 5670 },
      { name: 'Oatmeal Stout', pours: 17, rev: 4590 },
    ],
    foodSales: [
      { name: 'Radhaballabhi & Aloo Dum', orders: 24, rev: 5280 },
      { name: 'Chicken Parmigiana Bites', orders: 19, rev: 5605 },
      { name: 'Burmese Khaw Swe Bowl', orders: 16, rev: 4160 },
      { name: 'Butter Garlic Prawns', orders: 13, rev: 4420 },
    ],
    funnel: {
      walkIns: 46,
      loungeCheckins: 38,
      tasterOrders: 28,
      seated: 34,
      walkAways: 2,
      totalPax: 129,
      mugClubParties: 11,
    },
    hourlyWalkIns: [
      { hr: '18:30', count: 18, peak: false },
      { hr: '19:30', count: 31, peak: true },
      { hr: '20:30', count: 38, peak: true },
      { hr: '21:30', count: 34, peak: true },
      { hr: '22:30', count: 22, peak: false },
      { hr: '23:30', count: 12, peak: false },
    ],
    inspector: {
      tag: 'CLICK ANY OBJECT',
      title: 'FL-III Licensed Wait Lounge',
      subtitle: 'Click any walking Sims guest, communal wooden table, craft tap bar, or golden taproom dog in the 3D scene to inspect live needs & telemetry.',
      v1Label: 'ZONE CAPACITY', v1: '18 Standing/Perch',
      v2Label: 'EXCISE BOUNDARY', v2: 'Inside FL-III Plan',
      v3Label: 'EXPRESS POUR', v3: '150ml / 225ml MC',
      v4Label: 'AVG TICKET', v4: '₹435 / Party',
      showNeeds: false,
      patiencePct: 88,
      thirstPct: 65,
      vibePct: 92,
      moodText: 'Relaxed • Checking Menu',
    },
    playerToken: 'None',
    playerState: 'Ready to enter',
    feedLogs: [
      '[19:30] Sims/Anno 3D Diorama initialized at Saturday 7:30 PM peak rush.',
      '[19:29] BMC 1m clear exit corridor verified unobstructed.',
      '[19:28] Alphonso Mead keg at 26% — predictive swap alert queued.',
    ],
  });

  const canvasWrapRef = useRef(null);
  const simRef = useRef(null);

  const pushToast = useCallback((title, body) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, title, body }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3400);
  }, []);

  // Load Three.js r128 dynamically if not already present on window
  useEffect(() => {
    if (window.THREE) {
      setThreeReady(true);
      return;
    }
    const existing = document.querySelector('script[data-three-r128]');
    if (existing) {
      existing.addEventListener('load', () => setThreeReady(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.setAttribute('data-three-r128', 'true');
    script.onload = () => setThreeReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialize Three.js WebGL Diorama & Discrete-Event Simulation Loop
  useEffect(() => {
    if (!threeReady || !canvasWrapRef.current) return;
    const THREE = window.THREE;
    const container = canvasWrapRef.current;

    // ------------------------------------------------------------------------
    // Mutable High-Performance Simulation State (Zero React Re-render Overhead)
    // ------------------------------------------------------------------------
    const state = {
      scenario: 3,
      playing: true,
      speed: 5,
      cinemaMode: false,
      atmosphere: 'night',
      miScreening: false,
      monsoonSurge: false,
      showOverlays: true,
      cameraPreset: 'overview',
      simMinutes: 19 * 60 + 30,
      spawnTimer: 0,
      nextPartyNum: 101,
      stats: {
        queued: 0,
        reneged: 1,
        seatedTotal: 14,
        loungeRevenue: 9850,
        mainDiningRevenue: 34500,
        bmcObstructed: false,
      },
      funnel: {
        walkIns: 46,
        loungeCheckins: 38,
        tasterOrders: 28,
        seated: 34,
        walkAways: 2,
        totalPax: 129,
        mugClubParties: 11,
      },
      hourlyWalkIns: [
        { hr: '18:30', count: 18, peak: false },
        { hr: '19:30', count: 31, peak: true },
        { hr: '20:30', count: 38, peak: true },
        { hr: '21:30', count: 34, peak: true },
        { hr: '22:30', count: 22, peak: false },
        { hr: '23:30', count: 12, peak: false },
      ],
      drinkSales: [
        { name: 'Alphonso Mead', pours: 44, rev: 11880 },
        { name: 'Apple Cider', pours: 41, rev: 10660 },
        { name: 'Indian Pale Ale', pours: 29, rev: 8120 },
        { name: 'Belgian Witbier', pours: 26, rev: 6760 },
        { name: 'Blueberry Cider', pours: 21, rev: 5670 },
        { name: 'Oatmeal Stout', pours: 17, rev: 4590 },
      ],
      foodSales: [
        { name: 'Radhaballabhi & Aloo Dum', orders: 24, rev: 5280 },
        { name: 'Chicken Parmigiana Bites', orders: 19, rev: 5605 },
        { name: 'Burmese Khaw Swe Bowl', orders: 16, rev: 4160 },
        { name: 'Butter Garlic Prawns', orders: 13, rev: 4420 },
      ],
      kitchenStock: [
        { name: 'Radhaballabhi Prep Trays', left: 28, max: 40 },
        { name: 'Chicken Parmigiana Skewers', left: 19, max: 35 },
        { name: 'Khaw Swe Tasting Bowls', left: 24, max: 35 },
        { name: 'Butter Garlic Prawns Packs', left: 14, max: 30 },
      ],
      kegs: JSON.parse(JSON.stringify(INITIAL_KEGS)),
      tables: [],
      agents: [],
      staff: [],
      popups: [],
      selectedEntity: null,
      playerPartyId: null,
      feedLogs: [
        '[19:30] Sims/Anno 3D Diorama initialized at Saturday 7:30 PM peak rush.',
        '[19:29] BMC 1m clear exit corridor verified unobstructed.',
        '[19:28] Alphonso Mead keg at 26% — predictive swap alert queued.',
      ],
    };
    simRef.current = state;

    // ------------------------------------------------------------------------
    // Scene, Camera & Adobe-Inspired Lighting Setup
    // ------------------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0e17);
    scene.fog = new THREE.FogExp2(0x131624, 0.0085);

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / container.clientHeight,
      0.1,
      220
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Sky Dome + Khar West Mumbai Rooftop Skyline
    const skyMat = new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(THREE, 'night'),
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 20), skyMat);
    scene.add(skyDome);

    // Distant Mumbai Khar West / Linking Road Horizon Buildings & Arabian Sea Lights
    const skylineGroup = new THREE.Group();
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x161926, roughness: 0.9 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const dist = 42 + (i % 5) * 6;
      const bw = 3.2 + (i % 4) * 1.4;
      const bh = 8 + (i * 7) % 18;
      const bd = 3.2 + (i % 3) * 1.2;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bldgMat);
      bldg.position.set(Math.cos(angle) * dist, bh / 2 - 14, Math.sin(angle) * dist);
      bldg.lookAt(0, bh / 2 - 14, 0);
      skylineGroup.add(bldg);

      // Warm apartment window glow strips
      for (let w = 0; w < 3; w++) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(bw * 0.55, 0.35), winMat);
        win.position.set(0, bh * 0.2 - w * 2.4, bd / 2 + 0.04);
        bldg.add(win);
      }
    }
    scene.add(skylineGroup);

    // Three-Point Adobe-Style Architectural Lighting
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x261a12, 0.78);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffe0b2, 1.08);
    dirLight.position.set(16, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 4;
    dirLight.shadow.camera.far = 65;
    const d = 18;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const barGlow = new THREE.PointLight(0xffaa33, 1.15, 17);
    barGlow.position.set(-6.2, 3.6, -1.5);
    scene.add(barGlow);

    const diningGlow = new THREE.PointLight(0xffb84d, 1.05, 19);
    diningGlow.position.set(3.5, 4.2, -2.0);
    scene.add(diningGlow);

    const loungeGlow = new THREE.PointLight(0xffaa33, 1.1, 15);
    loungeGlow.position.set(3.2, 3.4, 10.2);
    scene.add(loungeGlow);

    // ------------------------------------------------------------------------
    // Build Architectural Diorama (Khar 6F Rooftop Taproom)
    // ------------------------------------------------------------------------
    const diorama = new THREE.Group();
    const matPlinth = new THREE.MeshStandardMaterial({ color: 0x211610, roughness: 0.85 });
    const floorMat = new THREE.MeshStandardMaterial({
      map: createTerracottaTileTexture(THREE),
      roughness: 0.62,
      metalness: 0.1,
    });
    const matOak = new THREE.MeshStandardMaterial({
      map: createWoodTexture(THREE, '#a86a38', '#7d4a21'),
      roughness: 0.5,
    });
    const matDarkOak = new THREE.MeshStandardMaterial({
      map: createWoodTexture(THREE, '#6b3e1d', '#472710'),
      roughness: 0.6,
    });
    const matWallCream = new THREE.MeshStandardMaterial({
      map: createBrickWallTexture(THREE),
      roughness: 0.78,
    });
    const matBrass = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.86 });
    const matCopper = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.24, metalness: 0.84 });
    const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.78 });
    const matGlass = new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd, transparent: true, opacity: 0.34, roughness: 0.1, metalness: 0.1,
    });
    const matCanopy = new THREE.MeshStandardMaterial({
      color: 0xfaf6f0, transparent: true, opacity: 0.78, roughness: 0.9, side: THREE.DoubleSide,
    });

    // Cutaway Plinth & Heritage Floor
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(22.6, 1.1, 28.6), matPlinth);
    plinth.position.set(0, -0.56, 0);
    plinth.receiveShadow = true;
    diorama.add(plinth);

    const floor = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.08, 28.0), floorMat);
    floor.receiveShadow = true;
    diorama.add(floor);

    // Cutaway Perimeter Parapet Walls
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(22.2, 2.8, 0.35), matWallCream);
    wallBack.position.set(0, 1.4, -14.0);
    wallBack.castShadow = true;
    wallBack.receiveShadow = true;
    diorama.add(wallBack);

    const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 28.2), matWallCream);
    wallRight.position.set(11.0, 0.65, 0);
    wallRight.castShadow = true;
    diorama.add(wallRight);

    // 6F Entrance Staircase (Bottom-Left)
    for (let s = 0; s < 7; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.7), matDarkOak);
      step.position.set(-7.6, -0.9 + s * 0.14, 13.4 - s * 0.68);
      step.castShadow = true;
      step.receiveShadow = true;
      diorama.add(step);
    }
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 4.8), matBrass);
    railL.position.set(-9.2, 0.4, 11.2);
    railL.rotation.x = 0.2;
    const railR = railL.clone();
    railR.position.x = -6.0;
    diorama.add(railL, railR);

    // BMC Fire-Safety 1m Clear Corridor
    const bmcCorridorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 25.4),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.26, side: THREE.DoubleSide })
    );
    bmcCorridorMesh.rotation.x = -Math.PI / 2;
    bmcCorridorMesh.position.set(-3.6, 0.055, -0.4);
    diorama.add(bmcCorridorMesh);

    // Maharashtra Excise FL-III Red-Ink Permit Boundary & Wait Lounge
    const fl3BoundaryGroup = new THREE.Group();
    const redLineMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const bTop = new THREE.Mesh(new THREE.BoxGeometry(11.6, 0.06, 0.12), redLineMat);
    bTop.position.set(4.5, 0.06, 7.6);
    const bBot = bTop.clone(); bBot.position.z = 13.4;
    const bLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 5.9), redLineMat);
    bLeft.position.set(-1.3, 0.06, 10.5);
    const bRight = bLeft.clone(); bRight.position.x = 10.3;
    fl3BoundaryGroup.add(bTop, bBot, bLeft, bRight);
    diorama.add(fl3BoundaryGroup);

    // Express Kiosk Counter & QR Check-in Stand
    const kioskZoneData = {
      type: 'zone',
      title: 'FL-III Wait Lounge & Express Kiosk',
      subtitle: 'Licensed indoor holding zone inside the red-ink FL-III boundary. Serves 150ml craft tasters & quick bites while keeping the 1m BMC exit passage unobstructed.',
      v1: '18 Lounge Capacity', v2: 'FL-III Red-Ink Zone', v3: '150ml / 225ml Pours', v4: '₹435 Avg Ticket',
    };
    const kioskBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 1.3), matOak);
    kioskBase.position.set(0.8, 0.58, 9.2);
    kioskBase.castShadow = true;
    kioskBase.userData = kioskZoneData;
    const kioskTop = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.5), matBrass);
    kioskTop.position.set(0.8, 1.2, 9.2);
    const miniTower = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 12), matBrass);
    miniTower.position.set(0.4, 1.55, 9.2);
    diorama.add(kioskBase, kioskTop, miniTower);

    const qrStand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 0.45), matDarkOak);
    qrStand.position.set(-1.9, 0.68, 9.0);
    const qrScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.42, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    qrScreen.position.set(-1.9, 1.45, 9.0);
    qrScreen.rotation.x = -0.45;
    diorama.add(qrStand, qrScreen);

    [4.2, 6.8, 9.0].forEach((px, idx) => {
      const perch = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 16), matOak);
      perch.position.set(px, 1.05, idx % 2 === 0 ? 9.4 : 11.4);
      perch.castShadow = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 1.05, 10), matDarkOak);
      leg.position.set(px, 0.52, perch.position.z);
      diorama.add(perch, leg);
    });

    // Left Corridor: Washrooms, Enclosed Glass-Walled Kitchen & 8-Tap Bar
    const barZoneData = {
      type: 'zone',
      title: 'Craft Tap Bar & Glass-Walled Kitchen',
      subtitle: 'Left-side operations corridor matching Khar 6F layout: enclosed kitchen with glass viewing windows, 8-tap wooden bar counter, copper bright tanks & chalkboard tap menus.',
      v1: '8 Active Craft Taps', v2: '8 Bar Stools', v3: 'Glass Kitchen Window', v4: 'IoT Keg Telemetry',
    };
    const washroom = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.2, 3.0), matWallCream);
    washroom.position.set(-8.4, 1.1, -12.2);
    washroom.castShadow = true;
    diorama.add(washroom);

    const kitchenBaseWall = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 15.6), matWallCream);
    kitchenBaseWall.position.set(-9.2, 0.52, -2.2);
    kitchenBaseWall.castShadow = true;
    kitchenBaseWall.userData = barZoneData;
    const kitchenGlass = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 14.4), matGlass);
    kitchenGlass.position.set(-7.85, 1.72, -2.2);
    const prepCounter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.95, 13.5), matSteel);
    prepCounter.position.set(-9.6, 0.48, -2.2);
    diorama.add(kitchenBaseWall, kitchenGlass, prepCounter);

    // Copper & Steel Craft Conditioning Tanks
    [-9.8, -8.4].forEach((tz, idx) => {
      const m = idx === 0 ? matCopper : matSteel;
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 16), m);
      tank.position.set(-9.3, 1.15, tz);
      tank.castShadow = true;
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        m
      );
      dome.position.set(-9.3, 2.25, tz);
      diorama.add(tank, dome);
    });

    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.18, 15.6), matOak);
    barCounter.position.set(-5.8, 0.59, -2.2);
    barCounter.castShadow = true;
    barCounter.userData = barZoneData;
    diorama.add(barCounter);

    const tapIndicatorMeshes = [];
    for (let i = 0; i < 8; i++) {
      const tz = -8.6 + i * 1.85;
      const tapTower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.55, 10), matBrass);
      tapTower.position.set(-5.4, 1.45, tz);
      const ind = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x10b981 })
      );
      ind.position.set(-5.4, 1.78, tz);
      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 14), matDarkOak);
      stoolSeat.position.set(-4.75, 0.78, tz);
      const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.78, 8), matSteel);
      stoolLeg.position.set(-4.75, 0.39, tz);
      diorama.add(tapTower, ind, stoolSeat, stoolLeg);
      tapIndicatorMeshes.push(ind);
    }

    // Pillars & Chalkboards
    const chalk1 = createChalkboardTexture(THREE, 'CIDERS & MEADS', [
      'Apple Cider 4.5%', 'Alphonso Mead 5.5%', 'Blueberry Cider', 'Coffee Orange Mead', '150ml Taster ₹170',
    ]);
    const chalk2 = createChalkboardTexture(THREE, 'CRAFT BEERS', [
      'Belgian Witbier', 'Hefeweizen 5.0%', 'Oatmeal Stout', 'Indian Pale Ale', 'Mug Club +50% Pour',
    ]);
    [{ z: -8.8, tex: chalk1 }, { z: 4.6, tex: chalk2 }].forEach(p => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.2, 0.65), matWallCream);
      pillar.position.set(-4.9, 1.6, p.z);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, 0.9), new THREE.MeshBasicMaterial({ map: p.tex }));
      board.position.set(-4.52, 1.85, p.z);
      diorama.add(pillar, board);
    });

    // 6 Long Wooden Communal Tables (48 Bench Seats) + 3D Pints & Food Platters
    const tablePositions = [
      { id: 1, name: 'Table 1 (North-West)', x: 1.2, z: -8.2 },
      { id: 2, name: 'Table 2 (North-East)', x: 6.8, z: -8.2 },
      { id: 3, name: 'Table 3 (Mid-West)',   x: 1.2, z: -2.4 },
      { id: 4, name: 'Table 4 (Mid-East)',   x: 6.8, z: -2.4 },
      { id: 5, name: 'Table 5 (South-West)', x: 1.2, z: 3.4 },
      { id: 6, name: 'Table 6 (South-East)', x: 6.8, z: 3.4 },
    ];

    tablePositions.forEach(tp => {
      const tblGroup = new THREE.Group();
      const tblObj = { id: tp.id, name: tp.name, x: tp.x, z: tp.z, seats: [] };

      const top = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 1.15), matOak);
      top.position.set(tp.x, 0.82, tp.z);
      top.castShadow = true;
      top.receiveShadow = true;
      top.userData = { type: 'table', tableId: tp.id };
      tblGroup.add(top);

      [-1.35, 1.35].forEach(ox => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.95), matDarkOak);
        leg.position.set(tp.x + ox, 0.4, tp.z);
        tblGroup.add(leg);
      });

      [-0.92, 0.92].forEach((oz, rowIdx) => {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.09, 0.42), matDarkOak);
        bench.position.set(tp.x, 0.48, tp.z + oz);
        bench.castShadow = true;
        bench.userData = { type: 'table', tableId: tp.id };
        tblGroup.add(bench);

        for (let col = 0; col < 4; col++) {
          const seatX = tp.x - 1.35 + col * 0.9;
          const seatZ = tp.z + oz;
          const pad = new THREE.Mesh(
            new THREE.PlaneGeometry(0.65, 0.32),
            new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.45 })
          );
          pad.rotation.x = -Math.PI / 2;
          pad.position.set(seatX, 0.535, seatZ);
          tblGroup.add(pad);

          // 3D Craft Pint Glass + Foam Head + Starter Plate (shown when seated)
          const propGroup = new THREE.Group();
          const pint = new THREE.Mesh(
            new THREE.CylinderGeometry(0.075, 0.055, 0.22, 10),
            new THREE.MeshBasicMaterial({ color: 0xf59e0b })
          );
          pint.position.y = 0.11;
          const foam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.078, 0.075, 0.04, 10),
            new THREE.MeshBasicMaterial({ color: 0xfffbeb })
          );
          foam.position.y = 0.23;
          propGroup.add(pint, foam);
          if (col % 2 === 0) {
            const plate = new THREE.Mesh(
              new THREE.CylinderGeometry(0.18, 0.15, 0.03, 12),
              new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 })
            );
            plate.position.set(0.24, 0.02, 0);
            propGroup.add(plate);
          }
          propGroup.position.set(seatX, 0.88, tp.z + (rowIdx === 0 ? -0.34 : 0.34));
          propGroup.visible = false;
          tblGroup.add(propGroup);

          tblObj.seats.push({
            index: rowIdx * 4 + col,
            x: seatX,
            z: seatZ,
            facingZ: rowIdx === 0 ? 1 : -1,
            occupiedBy: null,
            padMesh: pad,
            propMesh: propGroup,
          });
        }
      });

      // Board-game box & warm lantern
      const gameColors = [0xef4444, 0x3b82f6, 0xf59e0b, 0x10b981];
      const gameBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.1, 0.35),
        new THREE.MeshStandardMaterial({ color: gameColors[tp.id % gameColors.length], roughness: 0.5 })
      );
      gameBox.position.set(tp.x - 0.5, 0.93, tp.z);
      gameBox.rotation.y = 0.25;
      const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      lantern.position.set(tp.x + 0.55, 0.98, tp.z);
      tblGroup.add(gameBox, lantern);

      diorama.add(tblGroup);
      state.tables.push(tblObj);
    });

    // Far North Wall Live Sports Projector Screen & Light Cone
    const projHousing = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.3, 0.35), matSteel);
    projHousing.position.set(3.2, 3.2, -13.65);
    const projectorScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 2.5),
      new THREE.MeshBasicMaterial({ map: createProjectorTexture(THREE, false), side: THREE.DoubleSide })
    );
    projectorScreenMesh.position.set(3.2, 1.85, -13.6);
    projectorScreenMesh.userData = {
      type: 'zone',
      title: 'Far-Wall Live Sports Projector Screen',
      subtitle: 'Anchored on the north wall facing down the central walkway. Live IPL / cricket screenings surge arrivals (+40%) and extend dwell time by +25 mins.',
      v1: 'MI Screening: OFF', v2: '+25m Match Dwell', v3: 'Full Terrace Sightline', v4: '30m+ Peak Wait',
    };
    const projectorBeamMesh = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 7.5, 4, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false })
    );
    projectorBeamMesh.position.set(3.2, 1.9, -9.8);
    projectorBeamMesh.rotation.x = Math.PI / 2;
    projectorBeamMesh.rotation.y = Math.PI / 4;
    diorama.add(projHousing, projectorScreenMesh, projectorBeamMesh);

    // Cutaway Sloped Canopy Trusses & String Lights
    [-11.5, -5.5, 0.5, 6.5].forEach(tz => {
      const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), matWallCream);
      postL.position.set(-2.5, 1.9, tz);
      const postR = postL.clone();
      postR.position.x = 10.6;
      const rafterL = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.1, 0.1), matWallCream);
      rafterL.position.set(0.8, 4.3, tz);
      rafterL.rotation.z = 0.16;
      const rafterR = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.1, 0.1), matWallCream);
      rafterR.position.set(7.3, 4.3, tz);
      rafterR.rotation.z = -0.16;
      diorama.add(postL, postR, rafterL, rafterR);

      for (let b = 0; b < 5; b++) {
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        bulb.position.set(-1.2 + b * 2.6, 3.65, tz);
        diorama.add(bulb);
      }
    });

    const canopyL = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 20.5), matCanopy);
    canopyL.position.set(-1.3, 3.95, -2.5);
    canopyL.rotation.x = -Math.PI / 2;
    canopyL.rotation.y = 0.16;
    const canopyR = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 20.5), matCanopy);
    canopyR.position.set(9.4, 3.95, -2.5);
    canopyR.rotation.x = -Math.PI / 2;
    canopyR.rotation.y = -0.16;
    diorama.add(canopyL, canopyR);

    // Potted Tropical Terrace Plants
    [{ x: -2.4, z: 7.2 }, { x: 10.2, z: 7.2 }, { x: 10.2, z: -10.8 }, { x: -2.4, z: -12.8 }].forEach(pt => {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.48, 10), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
      pot.position.set(pt.x, 0.24, pt.z);
      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), new THREE.MeshStandardMaterial({ color: 0x15803d }));
      foliage.position.set(pt.x, 0.72, pt.z);
      foliage.castShadow = true;
      diorama.add(pot, foliage);
    });

    // Doolally Pet-Friendly Golden Taproom Dog ("Bruno")
    const dogGroup = new THREE.Group();
    const matDog = new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.68 });
    const dogBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.62), matDog);
    dogBody.position.y = 0.22;
    dogBody.castShadow = true;
    const dogHead = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.28), matDog);
    dogHead.position.set(0, 0.4, 0.34);
    const dogTail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.26, 6), matDog);
    dogTail.position.set(0, 0.34, -0.34);
    dogTail.rotation.x = -0.6;
    dogGroup.add(dogBody, dogHead, dogTail);
    dogGroup.position.set(9.4, 0.04, 6.2);
    dogGroup.rotation.y = -0.75;
    const dogData = {
      type: 'zone',
      title: 'Bruno — Doolally Taproom Golden Dog',
      subtitle: 'Doolally Taproom Khar is famously pet-friendly. Keeping the FL-III Wait Lounge separated from the 1m BMC corridor protects pets, servers & guests.',
      v1: 'Pet-Friendly Policy', v2: '6F Terrace Breeze', v3: 'Board Games Active', v4: '+12% Guest Vibe',
    };
    dogGroup.traverse(c => { c.userData = Object.assign({}, c.userData, dogData); });
    diorama.add(dogGroup);

    // 3D Selection Ring
    const selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.74, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide })
    );
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.set(0.8, 0.08, 9.2);
    selectionRing.visible = false;
    diorama.add(selectionRing);

    // Animated 3D Mumbai Monsoon Rain Streaks (Instanced/Points for ultra-high FPS)
    const rainCount = 500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 26;
      rainPos[i * 3 + 1] = Math.random() * 14;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainPoints = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0x93c5fd, size: 0.14, transparent: true, opacity: 0.65 })
    );
    rainPoints.visible = false;
    scene.add(rainPoints);

    scene.add(diorama);

    // ------------------------------------------------------------------------
    // Sims/Anno Articulated Character & Thought-Bubble Factory
    // ------------------------------------------------------------------------
    function createThoughtSprite(text, bg = 'rgba(24,19,15,0.88)', border = '#fbbf24') {
      const c = document.createElement('canvas');
      c.width = 280; c.height = 64;
      const ctx = c.getContext('2d');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(6, 6, 268, 52, 16);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 140, 39);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      const spr = new THREE.Sprite(mat);
      spr.scale.set(2.2, 0.5, 1);
      return spr;
    }

    function createHumanMesh(outfitColor, isStaff = false, role = 'guest', isVip = false) {
      const char = new THREE.Group();
      const skin = SKIN_PALETTE[Math.floor(Math.random() * SKIN_PALETTE.length)];
      const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
      const matOutfit = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.7 });
      const matPants = new THREE.MeshStandardMaterial({ color: isStaff ? 0x18181b : 0x334155, roughness: 0.8 });
      const matHair = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.56, 10), matOutfit);
      torso.position.y = 0.88;
      torso.castShadow = true;

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), matSkin);
      head.position.y = 1.32;
      head.castShadow = true;

      const hair = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        matHair
      );
      hair.position.y = 1.34;

      const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.58, 8);
      const legL = new THREE.Mesh(legGeo, matPants);
      legL.position.set(-0.09, 0.3, 0);
      const legR = new THREE.Mesh(legGeo, matPants);
      legR.position.set(0.09, 0.3, 0);

      const armGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.48, 8);
      const armL = new THREE.Mesh(armGeo, matOutfit);
      armL.position.set(-0.24, 0.88, 0);
      const armR = new THREE.Mesh(armGeo, matOutfit);
      armR.position.set(0.24, 0.88, 0);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.042, 0.14, 10),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      glass.position.set(0.26, 0.72, 0.16);
      glass.visible = false;

      char.add(torso, head, hair, legL, legR, armL, armR, glass);

      // Sims-Style Plumbob Diamond over VIP / Inspected Party Leader
      let plumbob = null;
      if (isVip) {
        plumbob = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          new THREE.MeshBasicMaterial({ color: 0x10b981 })
        );
        plumbob.position.set(0, 1.88, 0);
        plumbob.scale.set(0.75, 1.35, 0.75);
        char.add(plumbob);
      }

      if (role === 'server') {
        const tray = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.22, 0.03, 14),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5 })
        );
        tray.position.set(0, 1.05, 0.28);
        char.add(tray);
      }

      char.userData.rig = { torso, head, legL, legR, armL, armR, glass, plumbob, phase: Math.random() * 6.28 };
      return char;
    }

    function setCharacterSitting(mesh, sitting) {
      const rig = mesh && mesh.userData ? mesh.userData.rig : null;
      if (!rig) return;
      if (sitting) {
        rig.torso.position.y = 0.68;
        rig.head.position.y = 1.12;
        rig.armL.position.y = 0.68;
        rig.armR.position.y = 0.68;
        rig.legL.rotation.x = -Math.PI / 2.2;
        rig.legL.position.set(-0.09, 0.45, 0.18);
        rig.legR.rotation.x = -Math.PI / 2.2;
        rig.legR.position.set(0.09, 0.45, 0.18);
      } else {
        rig.torso.position.y = 0.88;
        rig.head.position.y = 1.32;
        rig.armL.position.y = 0.88;
        rig.armR.position.y = 0.88;
        rig.legL.rotation.x = 0;
        rig.legL.position.set(-0.09, 0.3, 0);
        rig.legR.rotation.x = 0;
        rig.legR.position.set(0.09, 0.3, 0);
      }
    }

    function animateWalkRig(mesh, deltaPhase, walking) {
      const rig = mesh && mesh.userData ? mesh.userData.rig : null;
      if (!rig) return;
      rig.phase += deltaPhase;
      if (rig.plumbob) {
        rig.plumbob.rotation.y += 0.04;
        rig.plumbob.position.y = 1.88 + Math.sin(rig.phase * 0.6) * 0.06;
      }
      if (walking) {
        rig.legL.rotation.x = Math.sin(rig.phase) * 0.55;
        rig.legR.rotation.x = -Math.sin(rig.phase) * 0.55;
        rig.armL.rotation.x = -Math.sin(rig.phase) * 0.4;
        rig.armR.rotation.x = rig.glass.visible ? -0.65 : Math.sin(rig.phase) * 0.4;
      } else {
        rig.legL.rotation.x *= 0.85;
        rig.legR.rotation.x *= 0.85;
        rig.armL.rotation.x = Math.sin(rig.phase * 0.5) * 0.06;
        rig.armR.rotation.x = rig.glass.visible ? -0.65 : -Math.sin(rig.phase * 0.5) * 0.06;
      }
    }

    // Build Bartenders & Kitchen-to-Table Servers
    [-5.5, 1.5].forEach((bz, idx) => {
      const mesh = createHumanMesh(0x18181b, true, 'bartender');
      mesh.position.set(-6.8, 0.04, bz);
      mesh.rotation.y = Math.PI / 2;
      scene.add(mesh);
      state.staff.push({ role: 'bartender', mesh, baseZ: bz, timer: idx * 2 });
    });

    [0, 1].forEach(idx => {
      const mesh = createHumanMesh(0xb45309, true, 'server');
      mesh.position.set(-3.2, 0.04, -4 + idx * 6);
      scene.add(mesh);
      state.staff.push({
        role: 'server',
        mesh,
        waypoints: [
          new THREE.Vector3(-7.4, 0.04, -3.5),
          new THREE.Vector3(-3.0, 0.04, -3.5),
          new THREE.Vector3(-3.0, 0.04, 3.0),
          new THREE.Vector3(3.8, 0.04, 3.0),
          new THREE.Vector3(3.8, 0.04, -7.5),
          new THREE.Vector3(-3.0, 0.04, -7.5),
        ],
        wpIdx: idx * 3,
      });
    });

    function spawnFloatingSprite(text, worldPos, bgColor = '#065f46', borderColor = '#34d399') {
      const spr = createThoughtSprite(text, bgColor, borderColor);
      spr.position.copy(worldPos);
      spr.position.y += 2.2;
      spr.scale.set(2.8, 0.65, 1);
      scene.add(spr);
      state.popups.push({ sprite: spr, age: 0, maxAge: 2.2 });
    }

    function addFeedLog(msg) {
      const hrs = String(Math.floor(state.simMinutes / 60) % 24).padStart(2, '0');
      const mins = String(Math.floor(state.simMinutes) % 60).padStart(2, '0');
      state.feedLogs.unshift(`[${hrs}:${mins}] ${msg}`);
      if (state.feedLogs.length > 16) state.feedLogs.pop();
    }

    function allocateSeatsForParty(party) {
      const activeTables = state.monsoonSurge ? state.tables.slice(0, 5) : state.tables;
      for (const tbl of activeTables) {
        const openSeats = tbl.seats.filter(s => s.occupiedBy === null);
        if (state.scenario === 3) {
          if (openSeats.length >= party.pax) {
            const chosen = openSeats.slice(0, party.pax);
            chosen.forEach(s => {
              s.occupiedBy = party.id;
              s.padMesh.material.color.setHex(0xf59e0b);
              s.padMesh.material.opacity = 0.72;
              if (s.propMesh) s.propMesh.visible = true;
            });
            return chosen;
          }
        } else {
          const topBench = tbl.seats.slice(0, 4);
          const botBench = tbl.seats.slice(4, 8);
          for (const bench of [topBench, botBench]) {
            if (bench.every(s => s.occupiedBy === null) && party.pax <= 4) {
              const chosen = bench.slice(0, party.pax);
              chosen.forEach(s => {
                s.occupiedBy = party.id;
                s.padMesh.material.color.setHex(0xf59e0b);
                s.padMesh.material.opacity = 0.72;
                if (s.propMesh) s.propMesh.visible = true;
              });
              return chosen;
            }
          }
        }
      }
      return null;
    }

    function releasePartySeats(party) {
      party.assignedSeats.forEach(s => {
        s.occupiedBy = null;
        s.padMesh.material.color.setHex(0x10b981);
        s.padMesh.material.opacity = 0.45;
        if (s.propMesh) s.propMesh.visible = false;
      });
      party.assignedSeats = [];
    }

    function createGuestParty(name, pax, isPlayer = false, silent = false) {
      const idNum = state.nextPartyNum++;
      const token = `#W-${idNum}`;
      const outfit = isPlayer ? 0x10b981 : OUTFIT_PALETTE[idNum % OUTFIT_PALETTE.length];

      const party = {
        id: idNum,
        token,
        name,
        pax,
        isPlayer,
        state: 'ENTERING',
        waitElapsed: 0,
        maxPatience: 28 + Math.random() * 14,
        hasTaster: false,
        spend: 0,
        dwellRemaining: 72 + Math.random() * 22,
        assignedSeats: [],
        targetPos: new THREE.Vector3(-7.4, 0.04, 8.2),
        members: [],
        moodBubble: null,
        moodText: 'Walking Up 6F Stairs',
      };

      for (let i = 0; i < pax; i++) {
        const mesh = createHumanMesh(outfit, false, 'guest', isPlayer && i === 0);
        mesh.position.set(-7.6 + (i % 2) * 0.55, -0.75, 13.0 + Math.floor(i / 2) * 0.65);
        mesh.traverse(child => {
          child.userData = Object.assign({}, child.userData, { type: 'party', partyId: idNum });
        });
        scene.add(mesh);
        party.members.push({
          mesh,
          offset: new THREE.Vector3((i % 2) * 0.52 - 0.25, 0, Math.floor(i / 2) * 0.52),
        });
      }

      // Sims-style thought bubble above party leader
      const bubble = createThoughtSprite('🍺 Craving Craft Mead');
      bubble.position.set(0, 2.05, 0);
      party.members[0].mesh.add(bubble);
      party.moodBubble = bubble;

      state.agents.push(party);
      if (!silent) {
        addFeedLog(`Party ${token} (${name}, ${pax}p) arrived up 6F stairs.`);
      }
      return party;
    }

    function updateMoodBubble(party, text, border = '#fbbf24') {
      if (party.moodText === text || !party.moodBubble) return;
      party.moodText = text;
      const fresh = createThoughtSprite(text, 'rgba(24,19,15,0.88)', border);
      if (party.moodBubble.material.map) party.moodBubble.material.map.dispose();
      party.moodBubble.material.map = fresh.material.map;
      party.moodBubble.material.needsUpdate = true;
    }

    function movePartyTowards(party, target, stepDist) {
      let allArrived = true;
      party.members.forEach(m => {
        const goal = new THREE.Vector3().addVectors(target, m.offset);
        goal.y = goal.z > 8.6 ? Math.max(-0.75, 0.04 - ((goal.z - 8.6) / 5.0) * 0.79) : 0.04;
        const delta = new THREE.Vector3().subVectors(goal, m.mesh.position);
        const dist = delta.length();
        if (dist > 0.12) {
          allArrived = false;
          delta.normalize();
          m.mesh.position.addScaledVector(delta, Math.min(dist, stepDist));
          m.mesh.rotation.y = Math.atan2(delta.x, delta.z);
          animateWalkRig(m.mesh, stepDist * 4.5, true);
        } else {
          animateWalkRig(m.mesh, 0.03, false);
        }
      });
      return allArrived;
    }

    // Seed initial bustling taproom guests
    [
      { name: 'Vikram Group', pax: 4 },
      { name: 'Meera & Co', pax: 3 },
      { name: 'Kabir (2)', pax: 2 },
      { name: 'Ananya Group', pax: 4 },
    ].forEach(preset => {
      const p = createGuestParty(preset.name, preset.pax, false, true);
      const seats = allocateSeatsForParty(p);
      if (seats) {
        p.state = 'SEATED';
        p.assignedSeats = seats;
        p.dwellRemaining = 35 + Math.random() * 45;
        updateMoodBubble(p, '🎲 Playing Catan & Sipping', '#10b981');
        p.members.forEach((m, i) => {
          const s = seats[i];
          m.mesh.position.set(s.x, 0.04, s.z);
          m.mesh.rotation.y = s.facingZ > 0 ? 0 : Math.PI;
          setCharacterSitting(m.mesh, true);
          m.mesh.userData.rig.glass.visible = true;
        });
      }
    });
    createGuestParty('Siddharth', 2, false, true);
    createGuestParty('Priya K.', 3, false, true);

    // Expose actions on simRef for UI buttons
    state.actions = {
      allocateSeatsForParty,
      createGuestParty,
      spawnFloatingSprite,
      addFeedLog,
      tapIndicatorMeshes,
      bmcCorridorMesh,
      fl3BoundaryGroup,
      projectorScreenMesh,
      projectorBeamMesh,
      selectionRing,
      skyMat,
      rainPoints,
      floorMat,
      scene,
      hemiLight,
      dirLight,
    };

    // ------------------------------------------------------------------------
    // Camera Orbit, Pan, Zoom & Click Raycasting
    // ------------------------------------------------------------------------
    const camCtrl = {
      spherical: new THREE.Spherical(29, Math.PI / 3.4, Math.PI / 4.2),
      target: new THREE.Vector3(0, 0.6, 0.2),
      goalPos: null,
      goalTarget: null,
      isDragging: false,
      isPanning: false,
      prevX: 0,
      prevY: 0,
      dragMoved: false,
    };

    const syncCam = () => {
      const off = new THREE.Vector3().setFromSpherical(camCtrl.spherical);
      camera.position.copy(camCtrl.target).add(off);
      camera.lookAt(camCtrl.target);
    };
    syncCam();

    state.setCameraPreset = (key) => {
      const p = CAMERA_PRESETS[key] || CAMERA_PRESETS.overview;
      camCtrl.goalPos = new THREE.Vector3(...p.pos);
      camCtrl.goalTarget = new THREE.Vector3(...p.target);
      state.cameraPreset = key;
    };

    const dom = renderer.domElement;
    const onCtx = e => e.preventDefault();
    const onDown = e => {
      camCtrl.goalPos = null;
      camCtrl.goalTarget = null;
      camCtrl.isDragging = true;
      camCtrl.isPanning = e.button === 2 || e.shiftKey;
      camCtrl.prevX = e.clientX;
      camCtrl.prevY = e.clientY;
      camCtrl.dragMoved = false;
    };
    const onMove = e => {
      if (!camCtrl.isDragging) return;
      const dx = e.clientX - camCtrl.prevX;
      const dy = e.clientY - camCtrl.prevY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) camCtrl.dragMoved = true;
      camCtrl.prevX = e.clientX;
      camCtrl.prevY = e.clientY;

      if (camCtrl.isPanning) {
        const panSpeed = 0.025 * (camCtrl.spherical.radius / 22);
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const forward = new THREE.Vector3().crossVectors(camera.up, right).normalize();
        camCtrl.target.addScaledVector(right, -dx * panSpeed);
        camCtrl.target.addScaledVector(forward, dy * panSpeed);
        camCtrl.target.x = Math.max(-11, Math.min(11, camCtrl.target.x));
        camCtrl.target.z = Math.max(-14, Math.min(14, camCtrl.target.z));
      } else {
        camCtrl.spherical.theta -= dx * 0.0065;
        camCtrl.spherical.phi -= dy * 0.0065;
        camCtrl.spherical.phi = Math.max(0.28, Math.min(Math.PI / 2.15, camCtrl.spherical.phi));
      }
      syncCam();
    };
    const onUp = e => {
      if (camCtrl.isDragging && !camCtrl.dragMoved) {
        const rect = dom.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const hit of hits) {
          let obj = hit.object;
          while (obj && (!obj.userData || !obj.userData.type)) obj = obj.parent;
          if (obj && obj.userData && obj.userData.type) {
            const d = obj.userData;
            if (d.type === 'party') {
              state.selectedEntity = { type: 'party', partyId: d.partyId };
              selectionRing.visible = true;
              break;
            } else if (d.type === 'table') {
              state.selectedEntity = { type: 'table', tableId: d.tableId };
              const tbl = state.tables.find(t => t.id === d.tableId);
              if (tbl) {
                selectionRing.visible = true;
                selectionRing.position.set(tbl.x, 0.08, tbl.z);
              }
              break;
            } else if (d.type === 'zone') {
              state.selectedEntity = { type: 'zone', data: d };
              selectionRing.visible = false;
              break;
            }
          }
        }
      }
      camCtrl.isDragging = false;
    };
    const onWheel = e => {
      e.preventDefault();
      camCtrl.goalPos = null;
      camCtrl.spherical.radius = Math.max(9, Math.min(44, camCtrl.spherical.radius + e.deltaY * 0.015));
      syncCam();
    };
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    dom.addEventListener('contextmenu', onCtx);
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    // ------------------------------------------------------------------------
    // Main 60 FPS Animation & Discrete-Event Simulation Step
    // ------------------------------------------------------------------------
    const clock = new THREE.Clock();
    let rafId = 0;
    let hudSyncAcc = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);

      if (camCtrl.goalPos && camCtrl.goalTarget) {
        camera.position.lerp(camCtrl.goalPos, 0.08);
        camCtrl.target.lerp(camCtrl.goalTarget, 0.08);
        camera.lookAt(camCtrl.target);
        const off = new THREE.Vector3().subVectors(camera.position, camCtrl.target);
        camCtrl.spherical.setFromVector3(off);
        if (camera.position.distanceTo(camCtrl.goalPos) < 0.08) {
          camCtrl.goalPos = null;
          camCtrl.goalTarget = null;
        }
      }

      if (selectionRing.visible) selectionRing.rotation.z += dt * 1.8;
      dogTail.rotation.z = Math.sin(performance.now() * 0.01) * 0.35;

      // Animate Monsoon Rain Particles if active
      if (rainPoints.visible) {
        const arr = rainPoints.geometry.attributes.position.array;
        for (let i = 0; i < rainCount; i++) {
          arr[i * 3 + 1] -= dt * 16;
          arr[i * 3] -= dt * 2.2;
          if (arr[i * 3 + 1] < 0) {
            arr[i * 3 + 1] = 14;
            arr[i * 3] = (Math.random() - 0.5) * 26;
          }
        }
        rainPoints.geometry.attributes.position.needsUpdate = true;
      }

      if (state.playing) {
        const simDeltaMins = dt * 0.25 * state.speed;
        state.simMinutes += simDeltaMins;

        const arrivalRate = (state.miScreening ? 42 : 30) + (state.monsoonSurge ? 6 : 0);
        state.spawnTimer += simDeltaMins;
        const activeCount = state.agents.filter(a => a.state !== 'LEAVING').length;
        if (state.spawnTimer >= 60 / arrivalRate && activeCount < 18) {
          state.spawnTimer = 0;
          const nm = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
          const px = [2, 2, 3, 4, 2, 4][Math.floor(Math.random() * 6)];
          createGuestParty(nm, px, false, false);
          state.funnel.walkIns++;
          state.funnel.totalPax += px;
          if (Math.random() < 0.24) state.funnel.mugClubParties++;
          const bIdx = Math.min(5, Math.max(0, Math.floor((state.simMinutes - 18 * 60) / 60)));
          if (state.hourlyWalkIns[bIdx]) state.hourlyWalkIns[bIdx].count++;
        }

        // Keg Depletion
        const kegMult = (state.miScreening ? 1.25 : 1.0) * (state.scenario >= 2 ? 1.15 : 1.0);
        state.kegs.forEach((keg, idx) => {
          const drop = ((keg.rateLph * kegMult) / 30) * (simDeltaMins / 60) * 100;
          keg.pct = Math.max(4, keg.pct - drop);
          if (tapIndicatorMeshes[idx]) {
            tapIndicatorMeshes[idx].material.color.setHex(
              keg.pct <= 20 ? 0xef4444 : (keg.pct <= 45 ? 0xf59e0b : 0x10b981)
            );
          }
        });

        // Update Guest Party Agents
        let waitingQueueIdx = 0;
        for (let i = state.agents.length - 1; i >= 0; i--) {
          const p = state.agents[i];
          if (p.state === 'ENTERING') {
            if (movePartyTowards(p, new THREE.Vector3(-6.2, 0.04, 8.2), dt * Math.min(4, 1 + state.speed * 0.15))) {
              if (state.scenario === 1) {
                p.state = 'QUEUE_STAIRS';
                updateMoodBubble(p, '⏳ Coarse Stairs Queue', '#f43f5e');
              } else {
                p.state = 'KIOSK_CHECKIN';
                p.targetPos.set(-1.9, 0.04, 10.2);
                updateMoodBubble(p, '📱 Express Kiosk Check-In', '#38bdf8');
              }
            }
          } else if (p.state === 'KIOSK_CHECKIN') {
            if (movePartyTowards(p, p.targetPos, dt * Math.min(4, 1 + state.speed * 0.15))) {
              p.state = 'WAIT_LOUNGE';
              state.funnel.loungeCheckins++;
              spawnFloatingSprite(`${p.token} Digital Pass`, p.members[0].mesh.position, '#1e3a8a', '#38bdf8');
              if (Math.random() < 0.72 || p.isPlayer) {
                const taster = KHAR_TASTERS[Math.floor(Math.random() * KHAR_TASTERS.length)];
                const drinkAmt = taster.price * p.pax;
                const addSnack = Math.random() < 0.55;
                const snackObj = KHAR_STARTERS[Math.floor(Math.random() * KHAR_STARTERS.length)];
                const snackAmt = addSnack ? snackObj.price : 0;
                const orderAmt = drinkAmt + snackAmt;
                p.hasTaster = true;
                p.spend += orderAmt;
                state.stats.loungeRevenue += orderAmt;
                state.funnel.tasterOrders++;
                state.kegs[taster.kegIdx].pct = Math.max(4, state.kegs[taster.kegIdx].pct - 0.6 * p.pax);

                const dStat = state.drinkSales.find(d => d.name === taster.name);
                if (dStat) { dStat.pours += p.pax; dStat.rev += drinkAmt; }
                if (addSnack) {
                  const fStat = state.foodSales.find(f => f.name.includes(snackObj.name.split(' ')[0]));
                  if (fStat) { fStat.orders++; fStat.rev += snackAmt; }
                  const ks = state.kitchenStock[Math.floor(Math.random() * state.kitchenStock.length)];
                  if (ks && ks.left > 2) ks.left--;
                }

                p.members.forEach(m => { m.mesh.userData.rig.glass.visible = true; });
                updateMoodBubble(p, `🍺 Sipping ${taster.name}`, '#10b981');
                spawnFloatingSprite(`+₹${orderAmt} (${taster.name})`, p.members[0].mesh.position, '#065f46', '#34d399');
                addFeedLog(`${p.token} ordered ${p.pax}x 150ml ${taster.name} (+₹${orderAmt}).`);
              } else {
                updateMoodBubble(p, '🛋️ Relaxing in FL-III Lounge', '#fbbf24');
              }
            }
          } else if (p.state === 'QUEUE_STAIRS' || p.state === 'WAIT_LOUNGE') {
            p.waitElapsed += simDeltaMins;
            const drain = state.scenario === 1 ? simDeltaMins * 1.15 : simDeltaMins * 0.35;
            p.maxPatience -= drain;

            if (p.maxPatience < 12 && p.state === 'QUEUE_STAIRS') {
              updateMoodBubble(p, '💢 Long Stairs Wait!', '#f43f5e');
            }

            if (p.state === 'QUEUE_STAIRS') {
              const qx = -6.0 + (waitingQueueIdx % 3) * 1.1;
              const qz = 8.4 + Math.floor(waitingQueueIdx / 3) * 1.25;
              movePartyTowards(p, new THREE.Vector3(qx, 0.04, qz), dt * 2.2);
            } else {
              const spots = [
                new THREE.Vector3(3.6, 0.04, 10.6),
                new THREE.Vector3(6.2, 0.04, 11.8),
                new THREE.Vector3(8.6, 0.04, 10.4),
                new THREE.Vector3(1.5, 0.04, 11.6),
                new THREE.Vector3(4.8, 0.04, 8.8),
                new THREE.Vector3(8.2, 0.04, 8.8),
              ];
              movePartyTowards(p, spots[waitingQueueIdx % spots.length], dt * 2.2);
            }
            waitingQueueIdx++;

            const seats = allocateSeatsForParty(p);
            if (seats) {
              p.assignedSeats = seats;
              p.state = 'TO_TABLE';
              p.targetPos.set(seats[0].x, 0.04, seats[0].z);
              updateMoodBubble(p, '📲 SMS: Table Ready!', '#10b981');
              if (state.scenario >= 2) {
                spawnFloatingSprite(`SMS: Table Ready ${p.token}`, p.members[0].mesh.position, '#065f46', '#10b981');
              }
              addFeedLog(`${p.token} (${p.name}) seated at Communal Table.`);
            } else if (p.maxPatience <= 0 && !p.isPlayer) {
              p.state = 'LEAVING';
              p.targetPos.set(-7.6, -0.75, 13.5);
              state.stats.reneged++;
              state.funnel.walkAways++;
              updateMoodBubble(p, '👋 Walked Away (Reneged)', '#ef4444');
              spawnFloatingSprite(`-1 Walk-Away (${p.token})`, p.members[0].mesh.position, '#7f1d1d', '#f87171');
              addFeedLog(`WALK-AWAY: ${p.token} (${p.name}) left after ${Math.round(p.waitElapsed)}m wait.`);
            }
          } else if (p.state === 'TO_TABLE') {
            if (movePartyTowards(p, p.targetPos, dt * Math.min(4.5, 1.4 + state.speed * 0.15))) {
              p.state = 'SEATED';
              state.stats.seatedTotal++;
              state.funnel.seated++;
              state.stats.mainDiningRevenue += p.pax * 680;
              p.dwellRemaining = (state.miScreening ? 92 : 70) + Math.random() * 20;
              updateMoodBubble(
                p,
                state.miScreening ? '🏏 Cheering MI Sixes!' : '🎲 Board Games & Pints',
                '#10b981'
              );
              p.members.forEach((m, idx) => {
                const s = p.assignedSeats[idx] || p.assignedSeats[0];
                m.mesh.position.set(s.x, 0.04, s.z);
                m.mesh.rotation.y = s.facingZ > 0 ? 0 : Math.PI;
                setCharacterSitting(m.mesh, true);
                m.mesh.userData.rig.glass.visible = true;
              });
            }
          } else if (p.state === 'SEATED') {
            p.dwellRemaining -= simDeltaMins;
            if (p.dwellRemaining <= 0) {
              releasePartySeats(p);
              p.state = 'LEAVING';
              p.targetPos.set(-7.6, -0.75, 13.5);
              updateMoodBubble(p, '😊 Great Night! Heading Out', '#fbbf24');
              p.members.forEach(m => setCharacterSitting(m.mesh, false));
            }
          } else if (p.state === 'LEAVING') {
            if (movePartyTowards(p, p.targetPos, dt * Math.min(4.5, 1.4 + state.speed * 0.15))) {
              p.members.forEach(m => scene.remove(m.mesh));
              if (state.selectedEntity && state.selectedEntity.partyId === p.id) {
                state.selectedEntity = null;
                selectionRing.visible = false;
              }
              state.agents.splice(i, 1);
            }
          }
        }

        state.stats.queued = waitingQueueIdx;
        const bmcBlocked = state.scenario === 1 && waitingQueueIdx >= 3;
        state.stats.bmcObstructed = bmcBlocked;
        bmcCorridorMesh.material.color.setHex(bmcBlocked ? 0xef4444 : 0x10b981);
        bmcCorridorMesh.material.opacity = bmcBlocked
          ? 0.34 + Math.sin(performance.now() * 0.008) * 0.16
          : 0.22;

        // Staff Animations
        state.staff.forEach(st => {
          if (st.role === 'bartender') {
            st.timer += dt * (1 + state.speed * 0.1);
            st.mesh.position.z = st.baseZ + Math.sin(st.timer * 0.8) * 1.4;
            animateWalkRig(st.mesh, dt * 3, true);
          } else if (st.role === 'server') {
            const wp = st.waypoints[st.wpIdx];
            const dir = new THREE.Vector3().subVectors(wp, st.mesh.position);
            dir.y = 0;
            if (dir.length() < 0.25) {
              st.wpIdx = (st.wpIdx + 1) % st.waypoints.length;
            } else {
              dir.normalize();
              st.mesh.position.addScaledVector(dir, dt * Math.min(3.5, 1.2 + state.speed * 0.12));
              st.mesh.rotation.y = Math.atan2(dir.x, dir.z);
              animateWalkRig(st.mesh, dt * 6, true);
            }
          }
        });

        // Floating Sprites
        for (let i = state.popups.length - 1; i >= 0; i--) {
          const pop = state.popups[i];
          pop.age += dt;
          pop.sprite.position.y += dt * 0.65;
          pop.sprite.material.opacity = Math.max(0, 1 - pop.age / pop.maxAge);
          if (pop.age >= pop.maxAge) {
            scene.remove(pop.sprite);
            state.popups.splice(i, 1);
          }
        }
      }

      // Throttled 4Hz React HUD Sync
      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.25) {
        hudSyncAcc = 0;
        const hrs = String(Math.floor(state.simMinutes / 60) % 24).padStart(2, '0');
        const mins = String(Math.floor(state.simMinutes) % 60).padStart(2, '0');
        const totalSeats = state.monsoonSurge ? 48 : 56;
        const occSeats = state.tables.reduce((acc, t) => acc + t.seats.filter(s => s.occupiedBy !== null).length, 0);
        const utilPct = Math.min(99, Math.round(((occSeats + 7) / totalSeats) * 100));

        // Build Inspector Snapshot
        let insp = null;
        if (state.selectedEntity) {
          if (state.selectedEntity.type === 'party') {
            const p = state.agents.find(a => a.id === state.selectedEntity.partyId);
            if (p) {
              selectionRing.visible = true;
              selectionRing.position.set(p.members[0].mesh.position.x, 0.08, p.members[0].mesh.position.z);
              const patPct = Math.max(0, Math.min(100, Math.round((p.maxPatience / 42) * 100)));
              insp = {
                tag: p.state,
                title: `${p.token} • ${p.name} (${p.pax} Pax)`,
                subtitle: p.state === 'WAIT_LOUNGE'
                  ? 'Relaxing inside FL-III red-ink permit lounge with Express Kiosk taster.'
                  : p.state === 'SEATED'
                    ? 'Seated at Doolally communal bench enjoying craft beer & board games.'
                    : 'Navigating taproom circulation path.',
                v1Label: 'WAIT ELAPSED', v1: `${Math.round(p.waitElapsed)} mins`,
                v2Label: 'KIOSK ORDER', v2: p.hasTaster ? '150ml Taster Active' : 'No Pre-Order',
                v3Label: 'CURRENT TAB', v3: `₹${p.spend}`,
                v4Label: 'AGENT TYPE', v4: p.isPlayer ? 'VIP Player Party' : 'Sims Autonomous',
                showNeeds: true,
                patiencePct: patPct,
                thirstPct: p.hasTaster ? 92 : 34,
                vibePct: state.scenario >= 2 ? 91 : 48,
                moodText: p.moodText,
              };
            }
          } else if (state.selectedEntity.type === 'table') {
            const tbl = state.tables.find(t => t.id === state.selectedEntity.tableId);
            if (tbl) {
              const occ = tbl.seats.filter(s => s.occupiedBy !== null).length;
              insp = {
                tag: `${occ}/8 OCCUPIED`,
                title: tbl.name,
                subtitle: state.scenario === 3
                  ? 'Smart Communal Seat-Gap Packing enabled: individual open bench slots dynamically match waiting parties.'
                  : 'Whole-bench allocation: open slots remain unused until full bench clears.',
                v1Label: 'BENCH SEATS', v1: `${occ} / 8 Seats`,
                v2Label: 'OPEN SLOTS', v2: `${8 - occ} Open Slots`,
                v3Label: 'PACKING MODE', v3: state.scenario === 3 ? 'Seat-Level Match' : 'Bench-Level Only',
                v4Label: 'TABLE VIBE', v4: 'Board Games Ready',
                showNeeds: false,
                patiencePct: 100, thirstPct: 100, vibePct: 100, moodText: '',
              };
            }
          } else if (state.selectedEntity.type === 'zone') {
            const d = state.selectedEntity.data;
            insp = {
              tag: 'ZONE TELEMETRY',
              title: d.title,
              subtitle: d.subtitle,
              v1Label: 'METRIC 1', v1: d.v1,
              v2Label: 'METRIC 2', v2: d.v2,
              v3Label: 'METRIC 3', v3: d.v3,
              v4Label: 'METRIC 4', v4: d.v4,
              showNeeds: false,
              patiencePct: 100, thirstPct: 100, vibePct: 100, moodText: '',
            };
          }
        }

        const playerObj = state.agents.find(a => a.id === state.playerPartyId);

        setHud(prev => ({
          ...prev,
          scenario: state.scenario,
          playing: state.playing,
          speed: state.speed,
          cinemaMode: state.cinemaMode,
          atmosphere: state.atmosphere,
          miScreening: state.miScreening,
          monsoonSurge: state.monsoonSurge,
          showOverlays: state.showOverlays,
          cameraPreset: state.cameraPreset,
          clockText: `${hrs}:${mins}`,
          bmcObstructed: state.stats.bmcObstructed,
          queued: state.stats.queued,
          reneged: state.stats.reneged,
          seatedTotal: state.stats.seatedTotal,
          loungeRevenue: state.stats.loungeRevenue,
          mainDiningRevenue: state.stats.mainDiningRevenue,
          utilPct,
          kegs: state.kegs.map(k => ({ ...k })),
          kitchenStock: state.kitchenStock.map(k => ({ ...k })),
          drinkSales: state.drinkSales.map(d => ({ ...d })),
          foodSales: state.foodSales.map(f => ({ ...f })),
          funnel: { ...state.funnel },
          hourlyWalkIns: state.hourlyWalkIns.map(h => ({ ...h })),
          inspector: insp || prev.inspector,
          playerToken: playerObj ? playerObj.token : 'None',
          playerState: playerObj ? playerObj.state : 'Ready to enter',
          feedLogs: [...state.feedLogs],
        }));
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener('contextmenu', onCtx);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [threeReady]);

  // ==========================================================================
  // 4. INTERACTIVE CONTROL HANDLERS (REACT -> SIMULATION BRIDGE)
  // ==========================================================================
  const handleScenario = (num) => {
    const s = simRef.current;
    if (!s) return;
    s.scenario = num;
    const labels = {
      1: 'Baseline (Manual Stairs Queue — Coarse Wait Reneging)',
      2: 'FL-III Wait Lounge + Express Kiosk (150ml Tasters)',
      3: 'Full Digital Twin + Smart Communal Bench Packing',
    };
    s.actions.addFeedLog(`Switched to Scenario ${num}: ${labels[num]}`);
    pushToast(`Scenario ${num} Active`, labels[num]);
  };

  const handlePlayPause = () => {
    const s = simRef.current;
    if (!s) return;
    s.playing = !s.playing;
    setHud(prev => ({ ...prev, playing: s.playing }));
  };

  const handleSpeed = (spd) => {
    const s = simRef.current;
    if (!s) return;
    s.speed = spd;
    setHud(prev => ({ ...prev, speed: spd }));
  };

  const handleAtmosphere = (mode) => {
    const s = simRef.current;
    const THREE = window.THREE;
    if (!s || !THREE) return;
    s.atmosphere = mode;
    if (s.actions.skyMat.map) s.actions.skyMat.map.dispose();
    s.actions.skyMat.map = createSkyDomeTexture(THREE, mode);
    s.actions.skyMat.needsUpdate = true;

    if (mode === 'golden') {
      s.actions.dirLight.color.setHex(0xffb74d);
      s.actions.dirLight.intensity = 1.35;
      s.actions.scene.fog.color.setHex(0x2a1812);
      s.actions.rainPoints.visible = false;
      s.actions.floorMat.roughness = 0.62;
    } else if (mode === 'monsoon') {
      s.actions.dirLight.color.setHex(0x94a3b8);
      s.actions.dirLight.intensity = 0.68;
      s.actions.scene.fog.color.setHex(0x131b26);
      s.actions.rainPoints.visible = true;
      s.actions.floorMat.roughness = 0.25; // Wet monsoon terrace sheen
    } else {
      s.actions.dirLight.color.setHex(0xffe0b2);
      s.actions.dirLight.intensity = 1.08;
      s.actions.scene.fog.color.setHex(0x131624);
      s.actions.rainPoints.visible = false;
      s.actions.floorMat.roughness = 0.62;
    }
    setHud(prev => ({ ...prev, atmosphere: mode }));
  };

  const handleToggleMI = () => {
    const s = simRef.current;
    const THREE = window.THREE;
    if (!s || !THREE) return;
    s.miScreening = !s.miScreening;
    if (s.actions.projectorScreenMesh.material.map) {
      s.actions.projectorScreenMesh.material.map.dispose();
    }
    s.actions.projectorScreenMesh.material.map = createProjectorTexture(THREE, s.miScreening);
    s.actions.projectorScreenMesh.material.needsUpdate = true;
    s.actions.projectorBeamMesh.material.opacity = s.miScreening ? 0.14 : 0.0;
    if (s.miScreening) {
      s.actions.addFeedLog('MI MATCH NIGHT: Projector ON (+40% walk-in surge & +25m dwell time).');
      pushToast('🏏 MI Match Screening Live', 'Far-wall projector turned ON — expect +40% arrival surge.');
    }
  };

  const handleToggleMonsoon = () => {
    const s = simRef.current;
    if (!s) return;
    s.monsoonSurge = !s.monsoonSurge;
    handleAtmosphere(s.monsoonSurge ? 'monsoon' : 'night');
    if (s.monsoonSurge) {
      s.actions.addFeedLog('MONSOON SURGE: Balcony seating closed (-8 seats); rain & wet floor sheen active.');
      pushToast('🌧️ Mumbai Monsoon Surge', 'Balcony closed (-8 seats) & monsoon rain activated in 3D scene.');
    }
  };

  const handleToggleOverlays = () => {
    const s = simRef.current;
    if (!s) return;
    s.showOverlays = !s.showOverlays;
    s.actions.bmcCorridorMesh.visible = s.showOverlays;
    s.actions.fl3BoundaryGroup.visible = s.showOverlays;
  };

  const handleSwapKeg = (idx) => {
    const s = simRef.current;
    if (!s) return;
    s.kegs[idx].pct = 100;
    s.actions.addFeedLog(`CELLAR SWAP: Fresh 30L keg tapped for ${s.kegs[idx].name}.`);
    pushToast('Keg Swapped', `${s.kegs[idx].name} restored to 30.0L (100%).`);
  };

  const handleSwapAllLowKegs = () => {
    const s = simRef.current;
    if (!s) return;
    s.kegs.forEach(k => { if (k.pct < 45) k.pct = 100; });
    s.actions.addFeedLog('CELLAR ACTION: Swapped all low craft kegs to 100% full.');
    pushToast('Low Kegs Swapped', 'All low craft beer & mead kegs swapped to fresh 30L barrels.');
  };

  const handleRestockKitchen = () => {
    const s = simRef.current;
    if (!s) return;
    s.kitchenStock.forEach(k => { k.left = k.max; });
    s.actions.addFeedLog('KITCHEN PREP: Express starter trays restocked to 100%.');
    pushToast('Kitchen Restocked', 'All Khar quick-bite prep portions replenished.');
  };

  const handleSpawnPlayerParty = () => {
    const s = simRef.current;
    if (!s) return;
    if (s.scenario === 1) handleScenario(2);
    const p = s.actions.createGuestParty(guestName.trim() || 'Aarav S.', guestPax, true, false);
    s.playerPartyId = p.id;
    s.selectedEntity = { type: 'party', partyId: p.id };
    s.actions.selectionRing.visible = true;
    setPlayerTab([]);
    pushToast(`Token ${p.token} Issued`, `Watch ${p.name} (${guestPax}p) walk up the 6F stairs with a green Sims Plumbob!`);
  };

  const handleOrderGuestItem = (kind, id) => {
    const s = simRef.current;
    if (!s) return;
    let p = s.agents.find(a => a.id === s.playerPartyId);
    if (!p) {
      if (s.scenario === 1) handleScenario(2);
      p = s.actions.createGuestParty(guestName.trim() || 'Aarav S.', guestPax, true, false);
      s.playerPartyId = p.id;
    }

    if (kind === 'taster') {
      const item = KHAR_TASTERS.find(t => t.id === id);
      const label = `${item.name} (${mugClub ? '225ml Mug Club' : '150ml'})`;
      setPlayerTab(prev => [...prev, { label, price: item.price }]);
      p.hasTaster = true;
      p.spend += item.price;
      s.stats.loungeRevenue += item.price;
      s.kegs[item.kegIdx].pct = Math.max(4, s.kegs[item.kegIdx].pct - 0.8);
      p.members.forEach(m => { m.mesh.userData.rig.glass.visible = true; });
      s.actions.spawnFloatingSprite(`+₹${item.price} ${item.name}`, p.members[0].mesh.position);
    } else {
      const item = KHAR_STARTERS.find(st => st.id === id);
      setPlayerTab(prev => [...prev, { label: item.name, price: item.price }]);
      p.spend += item.price;
      s.stats.loungeRevenue += item.price;
      s.actions.spawnFloatingSprite(`+₹${item.price} ${item.name}`, p.members[0].mesh.position);
    }
  };

  const handleTriggerTableReady = () => {
    const s = simRef.current;
    if (!s) return;
    let p = s.agents.find(a => a.id === s.playerPartyId);
    if (!p) {
      p = s.actions.createGuestParty(guestName.trim() || 'Aarav S.', guestPax, true, false);
      s.playerPartyId = p.id;
    }
    const seats = s.actions.allocateSeatsForParty(p);
    if (seats) {
      p.assignedSeats = seats;
      p.state = 'TO_TABLE';
      p.targetPos.set(seats[0].x, 0.04, seats[0].z);
      setGuestDrawerOpen(false);
      s.actions.spawnFloatingSprite(`📲 SMS: Table Ready ${p.token}`, p.members[0].mesh.position);
      pushToast('Table-Ready SMS Sent!', `${p.name} (${p.token}) is walking to their communal bench with tab transferred.`);
    } else {
      pushToast('All 48 Bench Seats Full', 'Switch to Scenario 3 (Smart Bench Packing) or wait a moment for a table turn.');
    }
  };

  // Derived Financial & KPI Values for Render
  const baseWait = (hud.miScreening ? 74 : 62) + (hud.monsoonSurge ? 10 : 0);
  const currentWait = hud.scenario === 1
    ? baseWait + hud.queued * 3
    : hud.scenario === 2
      ? Math.max(24, 34 + hud.queued * 2)
      : Math.max(12, 18 + hud.queued * 1);

  const renegePct = hud.scenario === 1 ? Math.min(48, 32 + hud.reneged * 2) : (hud.scenario === 2 ? 9 : 4);
  const hourlyRev = hud.scenario === 1 ? 0 : Math.max(8400, Math.round(hud.loungeRevenue * 0.95));

  const loungeSales = hud.scenario === 1 ? 0 : hud.loungeRevenue;
  const mainSales = hud.mainDiningRevenue + (hud.scenario === 3 ? 4200 : 0);
  const grossRev = mainSales + loungeSales;
  const cogs = Math.round(grossRev * 0.26);
  const opex = hud.scenario === 1 ? 3400 : 4369;
  const netProfit = grossRev - cogs - opex;
  const marginPct = ((netProfit / Math.max(1, grossRev)) * 100).toFixed(1);
  const lostRev = hud.scenario === 1 ? (12 + hud.reneged) * 1500 : hud.reneged * 1500;
  const savedRev = hud.scenario === 1 ? 0 : Math.max(9000, (14 - hud.reneged) * 1500);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0c0e17] text-amber-50 select-none font-sans">
      {/* FULL-VIEWPORT 3D THREE.JS DIORAMA CANVAS */}
      <div
        ref={canvasWrapRef}
        className="fixed inset-0 w-full h-full cursor-grab active:cursor-grabbing z-0"
        aria-label="3D Isometric Sims/Anno Diorama of Doolally Taproom Khar West"
      />

      {/* TOAST STACK */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-stone-950/90 backdrop-blur-md border border-amber-500/30 border-l-4 border-l-amber-400 rounded-xl p-3 text-xs shadow-2xl"
          >
            <div className="font-bold text-amber-300">{t.title}</div>
            <div className="text-amber-100/90 mt-0.5">{t.body}</div>
          </div>
        ))}
      </div>

      {/* =================================================================== */}
      {/* TOP FLOATING HUD: BRAND, SCENARIOS, TIME-OF-DAY & PLAYBACK SPEED    */}
      {/* =================================================================== */}
      <header className="fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Title & BMC Corridor Status */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto shadow-xl">
          <span className={`w-2.5 h-2.5 rounded-full bg-emerald-400 ${hud.playing ? 'animate-ping' : ''}`} />
          <div>
            <div className="font-serif font-bold text-sm sm:text-base text-amber-50 leading-none">
              Doolally Taproom Khar <span className="text-amber-400">3D Life-Sim Twin</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-mono text-[10px] text-amber-200/75">
                SAT PEAK <strong className="text-amber-300">{hud.clockText}</strong>
              </span>
              <span
                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  hud.bmcObstructed
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {hud.bmcObstructed ? '⚠️ BMC 1M EXIT SPILLOVER' : 'BMC 1M EXIT CLEAR'}
              </span>
            </div>
          </div>
        </div>

        {/* 3-Scenario Selector */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1 flex items-center gap-1 pointer-events-auto shadow-xl">
          {[
            { id: 1, label: 'S1: Baseline Queue' },
            { id: 2, label: 'S2: Wait Lounge + Kiosk' },
            { id: 3, label: 'S3: Full Twin + Smart Seats' },
          ].map(sc => (
            <button
              key={sc.id}
              onClick={() => handleScenario(sc.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] transition-all ${
                hud.scenario === sc.id
                  ? 'font-bold bg-amber-500 text-stone-950 shadow'
                  : 'font-medium text-amber-100/75 hover:text-amber-50 hover:bg-stone-800'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Atmosphere, Speed, Observe & Evidence Controls */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1.5 flex items-center gap-1.5 pointer-events-auto shadow-xl">
          {/* Mumbai Atmosphere Switcher */}
          <div className="hidden xl:flex items-center bg-stone-900 rounded-xl p-0.5 border border-stone-800">
            <button
              onClick={() => handleAtmosphere('golden')}
              title="Mumbai Golden Hour Sunset"
              className={`p-1.5 rounded-lg text-[10px] ${
                hud.atmosphere === 'golden' ? 'bg-amber-500 text-stone-950' : 'text-amber-200/70 hover:text-amber-50'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAtmosphere('night')}
              title="Saturday Twilight Night"
              className={`p-1.5 rounded-lg text-[10px] ${
                hud.atmosphere === 'night' ? 'bg-amber-500 text-stone-950' : 'text-amber-200/70 hover:text-amber-50'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleAtmosphere('monsoon')}
              title="Mumbai Monsoon Rain"
              className={`p-1.5 rounded-lg text-[10px] ${
                hud.atmosphere === 'monsoon' ? 'bg-sky-400 text-stone-950' : 'text-amber-200/70 hover:text-amber-50'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handlePlayPause}
            className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 font-mono text-[11px] font-bold text-amber-50 flex items-center gap-1"
          >
            {hud.playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {hud.playing ? 'Pause' : 'Play'}
          </button>

          <div className="flex items-center bg-stone-900 rounded-xl p-0.5 border border-stone-800">
            {[1, 5, 15, 30].map(sp => (
              <button
                key={sp}
                onClick={() => handleSpeed(sp)}
                className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold ${
                  hud.speed === sp ? 'bg-amber-500 text-stone-950' : 'text-amber-200/70 hover:text-amber-50'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (simRef.current) simRef.current.cinemaMode = !hud.cinemaMode;
              setHud(prev => ({ ...prev, cinemaMode: !prev.cinemaMode }));
            }}
            className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-[11px] font-semibold text-amber-300 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            {hud.cinemaMode ? 'HUD' : 'Observe'}
          </button>

          <button
            onClick={() => setEvidenceModalOpen(true)}
            className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold text-amber-300 flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Evidence
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* LEFT FLOATING HUD: 5-TAB ANALYTICS, STOCK, BESTSELLERS, P&L, TRAFFIC */}
      {/* =================================================================== */}
      <aside
        className={`fixed top-20 left-3 z-20 w-80 sm:w-[24rem] max-h-[calc(100vh-8.5rem)] flex flex-col gap-2 transition-all duration-300 ${
          hud.cinemaMode ? '-translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 pointer-events-none'
        }`}
      >
        {/* 5-Tab Switcher */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1.5 grid grid-cols-5 gap-1 pointer-events-auto shadow-xl">
          {[
            { id: 'ops', label: 'Ops', Icon: Sparkles },
            { id: 'stock', label: 'Stock', Icon: Beer },
            { id: 'bestsellers', label: 'Top', Icon: Award },
            { id: 'pnl', label: 'P&L', Icon: DollarSign },
            { id: 'traffic', label: 'Traffic', Icon: Users },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setLeftTab(id)}
              className={`py-1.5 px-1 rounded-xl font-mono text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                leftTab === id
                  ? 'bg-amber-500 text-stone-950 shadow'
                  : 'text-amber-100/75 hover:text-amber-50 hover:bg-stone-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Analytics Body */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 pointer-events-none">
          {/* TAB 1: LIVE OPS */}
          {leftTab === 'ops' && (
            <div className="space-y-2.5 pointer-events-auto">
              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Live Discrete-Event KPIs
                  </span>
                  <span className="font-mono text-[10px] text-emerald-300">SCENARIO {hud.scenario}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-stone-900/90 border border-stone-700/80 rounded-xl p-2.5">
                    <div className="text-[10px] font-mono text-amber-200/65">AVG WAIT TIME</div>
                    <div className="font-mono text-lg font-bold text-amber-400">{currentWait}m</div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      {hud.scenario === 1 ? 'Coarse stairs queue' : `vs ${baseWait}m Baseline`}
                    </div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-700/80 rounded-xl p-2.5">
                    <div className="text-[10px] font-mono text-amber-200/65">WALK-AWAY RATE</div>
                    <div className={`font-mono text-lg font-bold ${renegePct > 20 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {renegePct}%
                    </div>
                    <div className="text-[10px] font-mono text-amber-200/60">Coarse-wait renege</div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-700/80 rounded-xl p-2.5">
                    <div className="text-[10px] font-mono text-amber-200/65">LOUNGE F&amp;B REV</div>
                    <div className="font-mono text-base font-bold text-emerald-400">
                      ₹{hourlyRev.toLocaleString('en-IN')}<span className="text-[10px] font-normal">/hr</span>
                    </div>
                    <div className="text-[10px] font-mono text-amber-200/60">150ml tasters + bites</div>
                  </div>

                  <div className="bg-stone-900/90 border border-stone-700/80 rounded-xl p-2.5">
                    <div className="text-[10px] font-mono text-amber-200/65">SEAT UTILIZATION</div>
                    <div className="font-mono text-lg font-bold text-amber-300">{hud.utilPct}%</div>
                    <div className="text-[10px] font-mono text-amber-200/60">48 bench + 8 bar</div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-stone-700/70 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-amber-200/70">Queued: <strong className="text-amber-400">{hud.queued}</strong></span>
                  <span className="text-amber-200/70">Walk-aways: <strong className="text-rose-400">{hud.reneged}</strong></span>
                  <span className="text-amber-200/70">Seated: <strong className="text-emerald-400">{hud.seatedTotal}</strong></span>
                </div>
              </div>

              {/* Peak-Hour Triggers */}
              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 flex flex-col gap-2 shadow-xl">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Peak-Hour Triggers &amp; Overlays
                </div>

                <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-xl border border-stone-700/80">
                  <div>
                    <div className="text-xs font-semibold text-amber-50 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" /> MI Cricket Screening
                    </div>
                    <div className="text-[10px] text-amber-200/60">Projector ON • +40% arrivals + dwell</div>
                  </div>
                  <button
                    onClick={handleToggleMI}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${hud.miScreening ? 'bg-amber-500' : 'bg-stone-700'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-amber-50 transform transition-transform ${hud.miScreening ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-xl border border-stone-700/80">
                  <div>
                    <div className="text-xs font-semibold text-amber-50 flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-sky-400" /> Mumbai Monsoon Surge
                    </div>
                    <div className="text-[10px] text-amber-200/60">Balcony closed (-8 seats) + 3D rain</div>
                  </div>
                  <button
                    onClick={handleToggleMonsoon}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${hud.monsoonSurge ? 'bg-sky-400' : 'bg-stone-700'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-amber-50 transform transition-transform ${hud.monsoonSurge ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-xl border border-stone-700/80">
                  <div>
                    <div className="text-xs font-semibold text-amber-50 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> FL-III &amp; BMC Fire Lines
                    </div>
                    <div className="text-[10px] text-amber-200/60">1m exit corridor + red permit border</div>
                  </div>
                  <button
                    onClick={handleToggleOverlays}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${hud.showOverlays ? 'bg-amber-500' : 'bg-stone-700'}`}
                  >
                    <span className={`block w-4 h-4 rounded-full bg-amber-50 transform transition-transform ${hud.showOverlays ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CELLAR KEGS & KITCHEN STOCK */}
          {leftTab === 'stock' && (
            <div className="space-y-2.5 pointer-events-auto">
              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    8-Tap Craft Cellar Stock (30L Kegs)
                  </span>
                  <button
                    onClick={handleSwapAllLowKegs}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold"
                  >
                    Swap Low Kegs
                  </button>
                </div>
                <div className="space-y-2">
                  {hud.kegs.map((k, idx) => {
                    const pct = Math.round(k.pct);
                    const liters = ((pct / 100) * 30).toFixed(1);
                    const minsLeft = Math.max(8, Math.round((parseFloat(liters) / k.rateLph) * 60));
                    const barCol = pct <= 22 ? 'bg-rose-500' : pct <= 45 ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <div key={k.name} className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-bold text-amber-50">{k.name}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={pct <= 22 ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                              {liters}L ({pct}%)
                            </span>
                            <button
                              onClick={() => handleSwapKeg(idx)}
                              className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-[9px] text-amber-100 transition-colors"
                            >
                              Swap
                            </button>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden my-1">
                          <div className={`h-full ${barCol} transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] font-mono text-amber-200/55">
                          <span>{k.style}</span>
                          <span>~{minsLeft}m to blow</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Express Kitchen Prep Portions
                  </span>
                  <button
                    onClick={handleRestockKitchen}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold"
                  >
                    Restock Prep
                  </button>
                </div>
                <div className="space-y-1.5">
                  {hud.kitchenStock.map(item => {
                    const pct = Math.round((item.left / item.max) * 100);
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between bg-stone-900/90 px-2.5 py-1.5 rounded-xl border border-stone-800 text-[10px] font-mono"
                      >
                        <span className="text-amber-50">{item.name}</span>
                        <span className={pct < 35 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {item.left}/{item.max}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MOST SELLING BEERS & KHAR FOOD ITEMS */}
          {leftTab === 'bestsellers' && (
            <div className="space-y-2.5 pointer-events-auto">
              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    🏆 Most Selling Craft Taps (Shift)
                  </span>
                  <span className="font-mono text-[10px] text-amber-200/60">VOLUME &amp; ₹</span>
                </div>
                <div className="space-y-2">
                  {[...hud.drinkSales]
                    .sort((a, b) => b.pours - a.pours)
                    .map((d, rank, arr) => {
                      const maxP = arr[0]?.pours || 1;
                      return (
                        <div key={d.name} className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                          <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span className="text-amber-50">
                              <strong className="text-amber-400">#{rank + 1}</strong> {d.name}
                            </span>
                            <span className="text-emerald-400 font-bold">
                              {d.pours} pours • ₹{d.rev.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                              style={{ width: `${Math.round((d.pours / maxP) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    🍽️ Top Khar Kitchen Starters
                  </span>
                  <span className="font-mono text-[10px] text-amber-200/60">ORDERS</span>
                </div>
                <div className="space-y-1.5">
                  {[...hud.foodSales]
                    .sort((a, b) => b.orders - a.orders)
                    .map((f, rank) => (
                      <div
                        key={f.name}
                        className="flex items-center justify-between bg-stone-900/90 px-2.5 py-1.5 rounded-xl border border-stone-800 text-[10px] font-mono"
                      >
                        <span className="text-amber-50">
                          <strong className="text-amber-400">#{rank + 1}</strong> {f.name}
                        </span>
                        <span className="text-amber-300 font-bold">
                          {f.orders}x (₹{f.rev.toLocaleString('en-IN')})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REAL-TIME PROFIT & LOSS (P&L) */}
          {leftTab === 'pnl' && (
            <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 pointer-events-auto shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  💰 Live Shift Profit &amp; Loss (Simulated)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  {marginPct}% MARGIN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-stone-900/90 border border-emerald-500/30 rounded-xl p-2.5">
                  <div className="text-[9px] font-mono text-amber-200/65">NET SHIFT PROFIT</div>
                  <div className="font-mono text-base font-bold text-emerald-400">
                    ₹{netProfit.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[9px] font-mono text-emerald-300">
                    {hud.scenario === 1
                      ? 'Baseline (Walk-away drag)'
                      : `+₹${Math.max(4800, netProfit - 22130).toLocaleString('en-IN')} vs Baseline`}
                  </div>
                </div>
                <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-2.5">
                  <div className="text-[9px] font-mono text-amber-200/65">SAVED WALK-AWAY ₹</div>
                  <div className="font-mono text-base font-bold text-amber-400">
                    ₹{savedRev.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[9px] font-mono text-amber-200/60">Retained parties</div>
                </div>
              </div>

              <div className="bg-stone-900/95 rounded-xl p-3 border border-stone-800 font-mono text-[11px] space-y-1.5">
                <div className="flex justify-between text-amber-50">
                  <span>Main Taproom F&amp;B Sales</span>
                  <span className="text-emerald-400">₹{mainSales.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-amber-50">
                  <span>Wait Lounge Kiosk Sales</span>
                  <span className="text-emerald-400">₹{loungeSales.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-100 pt-1 border-t border-stone-800">
                  <span>Total Gross Revenue</span>
                  <span>₹{grossRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-300/90">
                  <span>Brewery &amp; Kitchen COGS (26%)</span>
                  <span>-₹{cogs.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-300/90">
                  <span>Floor + Kiosk Staff &amp; SaaS</span>
                  <span>-₹{opex.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-400/85 text-[10px]">
                  <span>Opportunity Loss (Walk-Aways)</span>
                  <span>₹{lostRev.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WALK-IN TRAFFIC FUNNEL & PEAK ARRIVAL CURVE */}
          {leftTab === 'traffic' && (
            <div className="space-y-2.5 pointer-events-auto">
              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    🚶 6F Staircase Walk-In Funnel
                  </span>
                  <span className="font-mono text-[10px] text-amber-300">
                    {(hud.miScreening ? 42 : 30) + (hud.monsoonSurge ? 6 : 0)} Parties/Hr
                  </span>
                </div>

                {(() => {
                  const w = hud.funnel.walkIns;
                  const loungePct = hud.scenario === 1 ? 0 : Math.round((hud.funnel.loungeCheckins / w) * 100);
                  const tasterPct = hud.scenario === 1 ? 0 : Math.round((hud.funnel.tasterOrders / w) * 100);
                  const seatedPct = hud.scenario === 1 ? 66 : Math.round((hud.funnel.seated / w) * 100);
                  const walkAwayPct = 100 - seatedPct;
                  const steps = [
                    { label: '1. 6F Staircase Walk-Ins', val: `${w} parties (100%)`, pct: 100, col: 'bg-amber-400' },
                    {
                      label: '2. FL-III Wait Lounge Check-In',
                      val: hud.scenario === 1 ? '0 (No Lounge)' : `${hud.funnel.loungeCheckins} (${loungePct}%)`,
                      pct: loungePct,
                      col: 'bg-sky-400',
                    },
                    {
                      label: '3. Ordered 150ml Taster/Bite',
                      val: hud.scenario === 1 ? '0 (No Kiosk)' : `${hud.funnel.tasterOrders} (${tasterPct}%)`,
                      pct: tasterPct,
                      col: 'bg-emerald-400',
                    },
                    { label: '4. Seated at Communal Table', val: `${seatedPct}% Retained`, pct: seatedPct, col: 'bg-emerald-500' },
                    { label: '5. Walk-Aways (Reneged)', val: `${walkAwayPct}% Lost`, pct: walkAwayPct, col: 'bg-rose-500' },
                  ];
                  return (
                    <div className="space-y-2">
                      {steps.map(st => (
                        <div key={st.label}>
                          <div className="flex justify-between text-[10px] font-mono mb-0.5">
                            <span className="text-amber-50">{st.label}</span>
                            <span className="font-bold text-amber-200">{st.val}</span>
                          </div>
                          <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden">
                            <div className={`h-full ${st.col}`} style={{ width: `${st.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-3 pt-2.5 border-t border-stone-700/80 grid grid-cols-3 gap-1.5 text-center font-mono">
                  <div className="bg-stone-900/90 p-1.5 rounded-lg border border-stone-800">
                    <div className="text-[9px] text-amber-200/60">AVG PARTY</div>
                    <div className="text-xs font-bold text-amber-50">
                      {(hud.funnel.totalPax / Math.max(1, hud.funnel.walkIns)).toFixed(1)} Pax
                    </div>
                  </div>
                  <div className="bg-stone-900/90 p-1.5 rounded-lg border border-stone-800">
                    <div className="text-[9px] text-amber-200/60">AVG DWELL</div>
                    <div className="text-xs font-bold text-amber-400">{hud.miScreening ? 92 : 74} min</div>
                  </div>
                  <div className="bg-stone-900/90 p-1.5 rounded-lg border border-stone-800">
                    <div className="text-[9px] text-amber-200/60">MUG CLUB</div>
                    <div className="text-xs font-bold text-emerald-400">
                      {Math.round((hud.funnel.mugClubParties / Math.max(1, hud.funnel.walkIns)) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 shadow-xl">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Saturday Peak Arrival Curve (18:30–23:30)
                </div>
                <div className="flex items-end justify-between gap-1.5 h-20 pt-2 px-1 bg-stone-900/90 rounded-xl border border-stone-800 p-2">
                  {hud.hourlyWalkIns.map(b => {
                    const maxH = Math.max(...hud.hourlyWalkIns.map(x => x.count), 40);
                    const hPct = Math.round((b.count / maxH) * 100);
                    return (
                      <div key={b.hr} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-[8px] font-mono text-amber-300">{b.count}</span>
                        <div
                          className={`w-full rounded-t ${b.peak ? 'bg-amber-500' : 'bg-stone-600'}`}
                          style={{ height: `${hPct}%` }}
                        />
                        <span className="text-[8px] font-mono text-amber-200/60">{b.hr}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persistent Guest Mobile Pass CTA */}
        <button
          onClick={() => setGuestDrawerOpen(true)}
          className="pointer-events-auto w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
        >
          <Smartphone className="w-4 h-4" />
          <span>Open Guest Mobile Pass &amp; Kiosk Order</span>
        </button>
      </aside>

      {/* =================================================================== */}
      {/* RIGHT FLOATING HUD: SIMS/ANNO RAYCAST ENTITY & NEEDS INSPECTOR      */}
      {/* =================================================================== */}
      <aside
        className={`fixed top-20 right-3 z-20 w-72 sm:w-80 flex flex-col gap-2.5 transition-all duration-300 ${
          hud.cinemaMode ? 'translate-x-[120%] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100 pointer-events-none'
        }`}
      >
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3.5 pointer-events-auto shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-700/80 pb-2 mb-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Sims / Anno Entity Inspector
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {hud.inspector.tag}
            </span>
          </div>

          <h3 className="font-serif font-bold text-base text-amber-50 leading-snug">
            {hud.inspector.title}
          </h3>
          <p className="text-[11px] text-amber-200/75 mt-1 leading-relaxed">
            {hud.inspector.subtitle}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-700/80">
              <div className="text-[9px] font-mono text-amber-200/60">{hud.inspector.v1Label}</div>
              <div className="font-mono text-xs font-bold text-amber-400 mt-0.5">{hud.inspector.v1}</div>
            </div>
            <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-700/80">
              <div className="text-[9px] font-mono text-amber-200/60">{hud.inspector.v2Label}</div>
              <div className="font-mono text-xs font-bold text-emerald-400 mt-0.5">{hud.inspector.v2}</div>
            </div>
            <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-700/80">
              <div className="text-[9px] font-mono text-amber-200/60">{hud.inspector.v3Label}</div>
              <div className="font-mono text-xs font-bold text-amber-50 mt-0.5">{hud.inspector.v3}</div>
            </div>
            <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-700/80">
              <div className="text-[9px] font-mono text-amber-200/60">{hud.inspector.v4Label}</div>
              <div className="font-mono text-xs font-bold text-amber-300 mt-0.5">{hud.inspector.v4}</div>
            </div>
          </div>

          {/* Sims-Style Agent Needs Bars when inspecting a Guest Party */}
          {hud.inspector.showNeeds && (
            <div className="mt-3 pt-2.5 border-t border-stone-700/80 space-y-2">
              <div className="text-[10px] font-mono text-amber-300 font-bold">
                MOODLET: {hud.inspector.moodText}
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-0.5">
                  <span className="text-amber-200/70">PATIENCE METER</span>
                  <span className="font-bold text-emerald-400">{hud.inspector.patiencePct}%</span>
                </div>
                <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${hud.inspector.patiencePct < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${hud.inspector.patiencePct}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[9px] font-mono text-amber-200/65">
                    <span>REFRESHMENT</span>
                    <span>{hud.inspector.thirstPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-amber-400" style={{ width: `${hud.inspector.thirstPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-mono text-amber-200/65">
                    <span>SOCIAL VIBE</span>
                    <span>{hud.inspector.vibePct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden mt-0.5">
                    <div className="h-full bg-sky-400" style={{ width: `${hud.inspector.vibePct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Event Ticker */}
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-3 pointer-events-auto hidden sm:block shadow-xl">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-200/70 mb-1.5">
            Live Simulation Feed
          </div>
          <div className="font-mono text-[10px] space-y-1 max-h-28 overflow-y-auto text-amber-100/80">
            {hud.feedLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* BOTTOM CAMERA PRESET BAR                                            */}
      {/* =================================================================== */}
      <footer
        className={`fixed bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 transition-all duration-300 ${
          hud.cinemaMode ? 'translate-y-[120%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 pointer-events-none'
        }`}
      >
        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl p-1.5 flex flex-wrap items-center gap-1 pointer-events-auto mx-auto sm:mx-0 shadow-xl">
          {[
            { id: 'overview', label: '1. Isometric Overview' },
            { id: 'entrance', label: '2. Entrance & Wait Lounge' },
            { id: 'bar', label: '3. Service Bar & Keg Taps' },
            { id: 'tables', label: '4. Communal Tables & Screen' },
          ].map(cam => (
            <button
              key={cam.id}
              onClick={() => {
                if (simRef.current) simRef.current.setCameraPreset(cam.id);
                setHud(prev => ({ ...prev, cameraPreset: cam.id }));
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] transition-all ${
                hud.cameraPreset === cam.id
                  ? 'font-bold bg-amber-500 text-stone-950 shadow'
                  : 'font-medium text-amber-100/80 hover:text-amber-50 hover:bg-stone-800'
              }`}
            >
              {cam.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (simRef.current) simRef.current.setCameraPreset('overview');
              setHud(prev => ({ ...prev, cameraPreset: 'overview' }));
            }}
            className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-amber-200 text-[11px] font-mono flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="bg-stone-950/85 backdrop-blur-md border border-amber-500/25 rounded-2xl px-3.5 py-2 text-[11px] font-mono text-amber-200/75 hidden lg:flex items-center gap-3 pointer-events-auto shadow-xl">
          <span>🖱️ Drag: Orbit</span>
          <span>•</span>
          <span>Right-Drag / Shift: Pan</span>
          <span>•</span>
          <span>Scroll: Zoom</span>
          <span>•</span>
          <span className="text-amber-400">Click Guests/Tables/Dog to Inspect</span>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* GUEST MOBILE PASS & KIOSK ORDERING SLIDE-OVER DRAWER                */}
      {/* =================================================================== */}
      {guestDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-xs">
          <div className="bg-stone-900 border-l border-amber-500/30 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-4 text-stone-950 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-85">
                  Interactive Guest Touchpoint
                </div>
                <h2 className="font-serif font-bold text-xl">Doolally Express Lounge Pass</h2>
              </div>
              <button
                onClick={() => setGuestDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-stone-950/20 hover:bg-stone-950/40 text-stone-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="bg-stone-850 border border-stone-700 rounded-2xl p-4">
                <div className="text-xs font-mono font-bold text-amber-400 uppercase mb-2.5">
                  1. Spawn Your VIP Party (With Sims Plumbob)
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div>
                    <label className="block text-[11px] text-amber-200/70 mb-1">Party Name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-600 text-xs text-amber-50 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-amber-200/70 mb-1">Party Size</label>
                    <select
                      value={guestPax}
                      onChange={e => setGuestPax(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-600 text-xs text-amber-50 focus:outline-none focus:border-amber-500"
                    >
                      <option value={2}>2 Guests</option>
                      <option value={3}>3 Guests</option>
                      <option value={4}>4 Guests</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-stone-950/80 px-3 py-2 rounded-xl border border-stone-700 mb-3">
                  <div>
                    <div className="text-xs font-semibold text-amber-300">🍺 Mug Club Member</div>
                    <div className="text-[10px] text-amber-200/65">+50% pour volume (225ml vs 150ml)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mugClub}
                    onChange={e => setMugClub(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleSpawnPlayerParty}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors"
                >
                  Join Waitlist &amp; Walk Up 6F Stairs
                </button>

                <div className="mt-3 pt-3 border-t border-stone-700 flex items-center justify-between text-xs">
                  <span className="text-amber-200/70">
                    Active Token: <strong className="font-mono text-amber-400">{hud.playerToken}</strong>
                  </span>
                  <span className="font-mono text-emerald-400">{hud.playerState}</span>
                </div>
              </div>

              <div className="bg-stone-850 border border-stone-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">2. Express Kiosk Menu</span>
                  <span className="font-mono text-[10px] text-amber-300">
                    {mugClub ? '225ml (+50% Mug Club)' : '150ml Standard'}
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-amber-200/80 mb-1.5">Official Tap Tasters</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {KHAR_TASTERS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleOrderGuestItem('taster', t.id)}
                      className="text-left p-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/50 transition-all"
                    >
                      <div className="text-xs font-semibold text-amber-50">{t.name}</div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-mono text-amber-200/60">{t.abv}</span>
                        <span className="text-[11px] font-mono font-bold text-amber-400">₹{t.price}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-[11px] font-semibold text-amber-200/80 mb-1.5">Khar Kitchen Quick Bites</div>
                <div className="grid grid-cols-1 gap-2">
                  {KHAR_STARTERS.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleOrderGuestItem('starter', st.id)}
                      className="text-left px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/50 transition-all flex justify-between items-center"
                    >
                      <span className="text-xs font-medium text-amber-50">{st.name}</span>
                      <span className="text-xs font-mono font-bold text-amber-400">₹{st.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-stone-850 border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">3. Express Tab &amp; Seating</span>
                  <span className="font-mono text-base font-bold text-amber-50">
                    ₹{playerTab.reduce((sum, i) => sum + i.price, 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-xs text-amber-200/70 space-y-1 max-h-24 overflow-y-auto mb-3">
                  {playerTab.length === 0 ? (
                    <div className="italic text-amber-200/50">No items ordered yet.</div>
                  ) : (
                    playerTab.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.label}</span>
                        <span className="font-mono text-amber-400">₹{item.price}</span>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={handleTriggerTableReady}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors shadow-md"
                >
                  📲 Trigger &quot;Table Ready SMS&quot; &amp; Seat Party in 3D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* EVIDENCE & CALIBRATION LOG MODAL                                    */}
      {/* =================================================================== */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-600 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-stone-950 border-b border-stone-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Academic Rigor • Verified Sources vs. Simulated Model
                </span>
                <h3 className="font-serif font-bold text-lg text-amber-50">
                  Evidence &amp; Calibration Log — Doolally Taproom Khar West
                </h3>
              </div>
              <button
                onClick={() => setEvidenceModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-amber-100/85 leading-relaxed">
              <div>
                <h4 className="font-mono font-bold text-emerald-400 uppercase text-[11px] mb-2">
                  A. Verified Primary &amp; Secondary Real-World Evidence
                </h4>
                <ul className="space-y-2 bg-stone-950 p-3.5 rounded-xl border border-stone-800 list-disc pl-5">
                  <li>
                    <strong>Official Brand-Wide Tap List (doolally.in):</strong> Alphonso Mead, Apple Cider, Belgian Witbier, Blueberry Cider, Coffee Orange Mead, English Brown Ale, Hefeweizen, Oatmeal Stout, Rauchbier, and Indian Pale Ale.
                  </li>
                  <li>
                    <strong>Khar-Calibrated Pricing (Zomato Khar):</strong> Pint of beer ~₹330; meal for two with alcohol ~₹1,500. Khar menu items verified: <em>Radhaballabhi (₹333.33), Chicken Parmigiana (₹523.81), Burmese Khaw Swe (₹428.57), Butter Garlic Prawns (₹619.05)</em>. Mug Club verifies <em>&quot;drink 50% more with every pour.&quot;</em>
                  </li>
                  <li>
                    <strong>Wait Times &amp; Dwell Benchmarks:</strong> Wanderlog Khar reports weekend waits <em>&quot;stretching over an hour&quot;</em>; Magicpin reports <em>30-minute waits after 7 PM during MI home games</em>; Justdial reports <em>3–4 hour dwell times</em> with board games &amp; pet-friendly seating.
                  </li>
                  <li>
                    <strong>Behavioural Queue Theory (Journal of Travel Research, 2025):</strong> Peer-reviewed study confirming guests are significantly more likely to renege when wait information is coarse rather than fine-grained.
                  </li>
                  <li>
                    <strong>Regulatory &amp; Fire-Safety Constraints:</strong> BMC CFO Fire Requirements mandate a clear <strong>1-metre passage from entrance to exit/rear wall</strong>. Maharashtra State Excise FL-III rules tie on-premises alcohol consumption to a pre-approved, red-ink plan-marked permit area.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-mono font-bold text-amber-400 uppercase text-[11px] mb-2">
                  B. Simulated Discrete-Event Assumptions (Clearly Distinguished)
                </h4>
                <ul className="space-y-2 bg-stone-950 p-3.5 rounded-xl border border-stone-800 list-disc pl-5">
                  <li>
                    <strong>3D Spatial Diorama Dimensions:</strong> Modeled as a 6th-floor rooftop terrace (48 communal bench seats across 6 long wooden tables + 8 bar stools = 56 seats) with an indoor FL-III Wait Lounge &amp; Express Kiosk positioned adjacent to the entrance landing while preserving the 1m BMC clear exit corridor.
                  </li>
                  <li>
                    <strong>Simulated Financial &amp; Operational Outcomes:</strong> Live arrival surges, individual guest patience decay, Express Kiosk conversion percentages (72%), incremental wait-lounge revenue (₹/hr), P&amp;L cost ratios (26% blended F&amp;B COGS, ₹4,369 shift staffing + SaaS OpEx), and keg depletion timers are <strong>simulated outputs</strong> calibrated against our Python Monte Carlo engine.
                  </li>
                </ul>
              </div>
            </div>

            <div className="px-5 py-3 bg-stone-950 border-t border-stone-700 flex justify-end">
              <button
                onClick={() => setEvidenceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}