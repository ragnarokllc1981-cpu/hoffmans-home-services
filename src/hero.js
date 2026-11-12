// Procedural 3D house. No external assets.
// Scrolling folds the exterior walls down and lifts the roof. Selecting a system tab ([data-sys])
// highlights that system, fades the rest, and shows its HTML label ([data-label]) over its 3D anchor.
import * as THREE from 'three';

const clamp01 = v => Math.min(Math.max(v, 0), 1);
const ease = t => t * t * (3 - 2 * t);

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x07080b);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07080b, 18, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);

  scene.add(new THREE.HemisphereLight(0x8899ff, 0x221100, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.PointLight(0xc6ff2e, 30, 20); rim.position.set(-5, 4, -3); scene.add(rim);

  const house = new THREE.Group();
  scene.add(house);
  const W = 8, D = 6, H = 3, ROOF = 2.4; // footprint & wall height
  const rafterLen = Math.hypot(D / 2, ROOF);
  const pitch = Math.atan2(ROOF, D / 2);

  // One group per inspected system. `focus` eases toward 1 while the system is selected, `dim` toward 0.1 while another is.
  const systems = {};
  const sys = (id, anchorPos) => {
    const group = new THREE.Group(); house.add(group);
    const anchor = new THREE.Object3D(); anchor.position.copy(anchorPos); group.add(anchor);
    return (systems[id] = { id, group, anchor, dim: 1, focus: 0 });
  };

  const grid = new THREE.GridHelper(60, 60, 0x1f2937, 0x111827); scene.add(grid);

  // --- Foundation: slab, perimeter footings, sump pit
  const foundation = sys('foundation', new THREE.Vector3(-W / 4, 0, D / 2 + 0.3));
  const concrete = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.95 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.2, D + 0.4), concrete); slab.position.y = -0.1; foundation.group.add(slab);
  for (const [w, d, x, z] of [[W + 0.8, 0.5, 0, D / 2], [W + 0.8, 0.5, 0, -D / 2], [0.5, D, W / 2, 0], [0.5, D, -W / 2, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), concrete); f.position.set(x, -0.42, z); foundation.group.add(f);
  }
  const sump = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.6 }));
  sump.position.set(-2.8, 0.03, 2.2); foundation.group.add(sump);

  // --- Structure: studs, plates, rafters, ridge
  const framing = sys('structure', new THREE.Vector3(-W / 2, H * 0.75, D / 2));
  const wood = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const stud = new THREE.BoxGeometry(0.1, H, 0.18);
  const addStud = (x, z, rotY = 0) => { const m = new THREE.Mesh(stud, wood); m.position.set(x, H / 2, z); m.rotation.y = rotY; framing.group.add(m); };
  for (let x = -W / 2; x <= W / 2 + 1e-6; x += 0.6) { addStud(x, -D / 2); addStud(x, D / 2); }
  for (let z = -D / 2 + 0.6; z < D / 2; z += 0.6) { addStud(-W / 2, z, Math.PI / 2); addStud(W / 2, z, Math.PI / 2); }
  for (let z = -D / 2 + 0.6; z < D / 2; z += 0.6) addStud(0.6, z, Math.PI / 2); // interior wall
  const plate = (len, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.2), wood); m.position.set(x, y, z); m.rotation.y = rotY; framing.group.add(m); };
  for (const y of [0.05, H - 0.05, H + 0.05]) { plate(W, 0, y, -D / 2, 0); plate(W, 0, y, D / 2, 0); plate(D, -W / 2, y, 0, Math.PI / 2); plate(D, W / 2, y, 0, Math.PI / 2); }
  for (let x = -W / 2; x <= W / 2 + 1e-6; x += 0.8) {
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, rafterLen), wood);
      r.position.set(x, H + ROOF / 2, s * D / 4); r.rotation.x = s * pitch; framing.group.add(r);
    }
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, 0.1), wood); ridge.position.set(0, H + ROOF, 0); framing.group.add(ridge);

  // --- Electrical: glowing runs to outlets + service panel
  const electrical = sys('electrical', new THREE.Vector3(-3.6, 2.0, -2.85));
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xc6ff2e });
  const wireRuns = [
    [[-3.6, 0.4, -2.9], [-3.6, 2.6, -2.9], [3.4, 2.6, -2.9], [3.4, 0.4, -2.9]],
    [[-3.6, 2.6, -2.9], [-3.9, 2.6, -2.9], [-3.9, 2.6, 2.6], [-3.9, 1.2, 2.6]],
    [[0.6, 2.7, -2.9], [0.6, 2.7, 2.4], [0.6, 1.3, 2.4]],
    [[-1.6, 2.6, -2.9], [-1.6, 1.3, -2.9]],
    [[3.9, 2.6, -2.4], [3.9, 2.6, 2.6], [2.0, 2.6, 2.9], [2.0, 1.2, 2.9]],
  ];
  const pulses = [];
  for (const pts of wireRuns) {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
    electrical.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.035, 6), wireMat));
    electrical.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xc6ff2e, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })));
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    p.userData = { curve, t: Math.random() }; electrical.group.add(p); pulses.push(p);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.08), new THREE.MeshStandardMaterial({ color: 0x27272a, emissive: 0xc6ff2e, emissiveIntensity: 0.3 }));
    box.position.copy(pts[pts.length - 1]); electrical.group.add(box);
  }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x52525b, emissive: 0xc6ff2e, emissiveIntensity: 0.15 }));
  panel.position.set(-3.6, 1.4, -2.85); electrical.group.add(panel);

  // --- Plumbing: water heater, hot/cold supply, drain-waste-vent stack, fixtures
  const plumbing = sys('plumbing', new THREE.Vector3(1.4, 1.6, 2.2));
  const hot = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.35 });
  const cold = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1e3a8a, emissiveIntensity: 0.6, metalness: 0.5, roughness: 0.35 });
  const pvc = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.5 });
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.3 });
  const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 24), new THREE.MeshStandardMaterial({ color: 0xe4e4e7, metalness: 0.3, roughness: 0.4 }));
  heater.position.set(1.4, 0.7, 2.2); plumbing.group.add(heater);
  const pipe = (pts, mat, r = 0.045, parent = plumbing.group) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.02);
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, r, 8), mat));
  };
  pipe([[1.3, 1.4, 2.2], [1.3, 2.3, 2.2], [-2.0, 2.3, 2.2], [-2.0, 0.9, 2.5]], hot);
  pipe([[1.5, 1.4, 2.2], [1.5, 2.15, 2.2], [1.5, 2.15, -1.9], [-2.4, 2.15, -1.9], [-2.4, 0.6, -2.2]], cold);
  pipe([[1.55, 1.4, 2.3], [1.55, 2.0, 2.4], [-1.8, 2.0, 2.4], [-1.8, 0.9, 2.55]], cold);
  pipe([[-1.2, 0.05, -0.6], [-1.2, H + ROOF * (1 - 0.6 / (D / 2)) + 0.45, -0.6]], pvc, 0.1); // vent stack exits the roof
  pipe([[-2.0, 0.7, 2.5], [-2.0, 0.08, 2.5], [-1.2, 0.08, -0.6]], pvc, 0.07);
  pipe([[-2.6, 0.08, -2.2], [-1.2, 0.08, -0.6]], pvc, 0.07);
  const tub = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.75), porcelain); tub.position.set(-2.8, 0.25, -2.4); plumbing.group.add(tub);
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.45), porcelain); sink.position.set(-2.0, 0.92, 2.55); plumbing.group.add(sink);

  // --- HVAC: furnace, supply trunk, branches, outdoor condenser
  const hvac = sys('hvac', new THREE.Vector3(2.8, 1.7, 1.6));
  const metal = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, metalness: 0.85, roughness: 0.3, emissive: 0x0a2540 });
  const furnace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.4, emissive: 0x0c4a6e, emissiveIntensity: 0.6 }));
  furnace.position.set(2.8, 0.8, 1.6); hvac.group.add(furnace);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 0.6), metal); trunk.position.set(-0.3, H - 0.35, 0.8); hvac.group.add(trunk);
  const riser = new THREE.Mesh(new THREE.BoxGeometry(0.5, H - 1.9, 0.5), metal); riser.position.set(2.8, 1.6 + (H - 1.9) / 2, 1.6); hvac.group.add(riser);
  for (const x of [-3, -1.6, -0.2, 1.4]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 16), metal);
    b.rotation.x = Math.PI / 2; b.position.set(x, H - 0.35, x % 2 ? -0.6 : 2.0); hvac.group.add(b);
  }
  const condenser = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.6, roughness: 0.4 }));
  condenser.position.set(W / 2 + 1.0, 0.4, 1.6); hvac.group.add(condenser);
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x18181b, emissive: 0x38bdf8, emissiveIntensity: 0.4 }));
  fan.position.set(W / 2 + 1.0, 0.82, 1.6); hvac.group.add(fan);
  pipe([[W / 2 + 0.55, 0.5, 1.6], [W / 2 - 0.1, 0.5, 1.6], [3.25, 0.5, 1.6]], new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.7, roughness: 0.3 }), 0.03, hvac.group); // refrigerant line set

  // --- Attic insulation: batts between the ceiling joists
  const insulation = sys('insulation', new THREE.Vector3(W / 2, H + 0.3, -D / 2));
  const batt = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, roughness: 1, emissive: 0x831843, emissiveIntensity: 0.25 });
  for (let z = -D / 2 + 0.3; z < D / 2; z += 0.6) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.26, 0.5), batt); b.position.set(0, H + 0.23, z); insulation.group.add(b);
  }

  // --- Exterior: siding walls with windows that fold down flat
  const exterior = sys('exterior', new THREE.Vector3(0, 0, 0));
  const siding = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.7, side: THREE.DoubleSide });
  const panels = [];
  const mkWall = (w, h, pos, rotY, dir) => {
    const pivot = new THREE.Group(); pivot.position.copy(pos); pivot.rotation.y = rotY;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), siding.clone()); m.position.y = h / 2; pivot.add(m);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0xfbbf24, emissiveIntensity: 0.5 }));
    win.position.set(w * 0.2, h * 0.55, 0.07); pivot.add(win);
    const win2 = win.clone(); win2.material = win.material.clone(); win2.position.x = -w * 0.25; pivot.add(win2);
    exterior.group.add(pivot); panels.push({ pivot, dir });
    return pivot;
  };
  const front = mkWall(W, H, new THREE.Vector3(0, 0, D / 2 + 0.07), 0, new THREE.Vector3(0, 0, 1));
  mkWall(D, H, new THREE.Vector3(W / 2 + 0.07, 0, 0), Math.PI / 2, new THREE.Vector3(1, 0, 0));
  mkWall(W, H, new THREE.Vector3(0, 0, -D / 2 - 0.07), Math.PI, new THREE.Vector3(0, 0, -1));
  mkWall(D, H, new THREE.Vector3(-W / 2 - 0.07, 0, 0), -Math.PI / 2, new THREE.Vector3(-1, 0, 0));
  front.add(exterior.anchor); exterior.anchor.position.set(W * 0.2, H * 0.9, 0.1); // label rides the front wall

  // --- Roof: two planes, trim and gables. Lifts as one piece in phase B.
  const roof = sys('roof', new THREE.Vector3(W / 2 + 0.2, H + ROOF * 0.35, 0)); // gable end, so the label stays on screen
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff6a1a, emissiveIntensity: 0.3 });
  const roofs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(0, H + ROOF, 0);
    const r = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.12, rafterLen + 0.4), roofMat.clone()); r.position.set(0, 0, s * (rafterLen + 0.4) / 2); pivot.add(r);
    const t = new THREE.Mesh(new THREE.BoxGeometry(W + 0.62, 0.05, 0.1), trim.clone()); t.position.set(0, 0.06, s * (rafterLen + 0.4)); pivot.add(t);
    pivot.rotation.x = s * pitch; roof.group.add(pivot); roofs.push({ pivot, s });
  }
  const gableShape = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, ROOF)]);
  const gables = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), siding.clone());
    g.rotation.y = Math.PI / 2; g.position.set(s * (W / 2 + 0.07), H, 0); roof.group.add(g); gables.push({ g, s });
  }

  house.position.y = -1.6;
  house.rotation.y = -0.6;
  grid.position.y = house.position.y - 0.65; // just below the footings

  // Every material gets a base opacity so dimming (legend hover) and fades compose cleanly.
  const GHOST = new THREE.Color(0x64748b); // faint slate "x-ray" tint for unselected systems
  for (const s of Object.values(systems)) s.group.traverse(o => {
    const m = o.material; if (!m || m.userData.base !== undefined) return;
    m.transparent = true;
    m.userData = { base: m.opacity, color: m.color.clone(), glow: m.emissiveIntensity ?? 0, metal: m.metalness ?? 0, emissive: m.emissive?.clone() };
  });

  // --- System tabs + labels
  const labelEls = [...document.querySelectorAll('[data-label]')].map(el => ({ el, s: systems[el.dataset.label] })).filter(l => l.s);
  // Hover/focus previews a system; click/tap pins it (click again to unpin).
  let hovered = null, pinned = null, highlight = null;
  const refresh = () => {
    highlight = hovered ?? pinned;
    document.querySelectorAll('[data-sys]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sys === pinned)));
    labelEls.forEach(({ el, s }) => el.classList.toggle('is-active', s.id === highlight));
  };
  document.querySelectorAll('[data-sys]').forEach(b => {
    const id = b.dataset.sys;
    b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = id; refresh(); } });
    b.addEventListener('pointerleave', () => { hovered = null; refresh(); });
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) { hovered = id; refresh(); } });
    b.addEventListener('blur', () => { hovered = null; refresh(); });
    b.addEventListener('click', () => { pinned = pinned === id ? null : id; refresh(); });
  });

  // --- Interaction state
  const hero = document.getElementById('hero');
  let progress = 0, target = 0, mouseX = 0, mouseY = 0, autoT = 0, userScrolled = false;
  const onScroll = () => {
    const max = hero.offsetHeight - window.innerHeight;
    if (window.scrollY > 4) userScrolled = true;
    target = clamp01(window.scrollY / Math.max(max, 1));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', e => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; }, { passive: true });
  const forced = new URLSearchParams(location.search).get('peel');

  let vw = 1, vh = 1;
  const resize = () => {
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize); resize();

  const copy = document.getElementById('hero-copy'), shade = document.getElementById('hero-shade');
  let copyFade = 1;
  const v = new THREE.Vector3();
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!userScrolled) { autoT += dt; target = 0.5 + 0.5 * Math.sin(autoT * 0.6 - Math.PI / 2); } // teaser peel until the user scrolls
    if (forced !== null) target = parseFloat(forced);
    progress += (target - progress) * Math.min(1, dt * 4);
    const e = ease(progress);
    const k8 = Math.min(1, dt * 8);
    for (const s of Object.values(systems)) {
      s.dim += ((highlight && highlight !== s.id ? 0.1 : 1) - s.dim) * k8;
      s.focus += ((highlight === s.id ? 1 : 0) - s.focus) * k8;
    }

    // fade: scroll-driven opacity (walls, roof). dim: 1 normal, 0.1 when another system is selected → ghosted:
    // slate tint, no glow, not metallic (unlit metal renders black), low opacity, no depth writes.
    wireMat.userData.color.setHSL(0.22, 1, 0.5 + 0.15 * Math.sin(t * 6)); // pulse the wiring (before ghosting is applied)
    const setLook = (obj, fade, dim, focus = 0) => obj.traverse(o => {
      const m = o.material; if (!m) return;
      const g = (1 - dim) / 0.9; // 0 normal → 1 fully ghosted
      const a = m.userData.base * fade * (1 - g * 0.94);
      m.opacity = a; // transparent stays true (set once): toggling it doesn't recompile the shader, so alpha would be ignored
      m.depthWrite = g < 0.5 && m.blending === THREE.NormalBlending;
      m.color.lerpColors(m.userData.color, GHOST, g);
      if (m.metalness !== undefined) m.metalness = m.userData.metal * (1 - g);
      if (m.emissive) { // selected system glows in its own color
        m.emissive.lerpColors(m.userData.emissive, m.userData.color, focus * 0.45);
        m.emissiveIntensity = Math.max(m.userData.glow, focus) * (1 - g);
      }
    });
    for (const id of ['structure', 'electrical', 'plumbing', 'hvac', 'foundation']) setLook(systems[id].group, 1, systems[id].dim, systems[id].focus);
    setLook(insulation.group, 0.12 + 0.88 * insulation.focus, insulation.dim, insulation.focus); // faint unless selected, so the attic stays see-through

    // Walls fold flat as you scroll; selecting Exterior stands them back up.
    const wallFold = e * (1 - exterior.focus);
    panels.forEach(({ pivot, dir }, i) => {
      const k = ease(clamp01(wallFold * 1.4 - i * 0.08));
      pivot.rotation.x = dir.z * k * 1.5; pivot.rotation.z = -dir.x * k * 1.5;
      pivot.position.y = -k * 0.2;
      setLook(pivot, 1 - k * 0.85, exterior.dim, exterior.focus * 0.5);
    });
    // Roof halves lift and spread as you scroll; selecting Roof closes it back up.
    const spread = e * (1 - roof.focus);
    roofs.forEach(({ pivot, s }) => {
      pivot.rotation.x = s * (pitch + spread * 0.5); pivot.position.y = H + ROOF + spread * 3.5; pivot.position.z = s * spread * 3;
      setLook(pivot, 1 - spread * 0.8, roof.dim, roof.focus * 0.5);
    });
    gables.forEach(({ g, s }) => { g.position.x = s * (W / 2 + 0.07 + spread * 3); setLook(g, 1 - spread, roof.dim, roof.focus * 0.5); });

    pulses.forEach(p => { p.userData.t = (p.userData.t + dt * 0.35) % 1; p.position.copy(p.userData.curve.getPointAt(p.userData.t)); });
    fan.rotation.y += dt * 4;

    // Orbit + parallax; house sits right of the hero copy.
    // Phones with a system selected: center the house and pull back so the whole system fits.
    const m = (1 - copyFade) / 0.88;
    const ang = 0.6 + Math.sin(t * 0.15) * 0.35 + mouseX * 0.5;
    const r = (19 - e * 2.5) * (1 + m * 0.9);
    const lx = -3.2 * (1 - m);
    camera.position.set(Math.sin(ang) * r + lx + 0.2 * (1 - m), 6 + e * 1.5 + m * 3 + mouseY * -2, Math.cos(ang) * r);
    camera.lookAt(lx, 0.8, 0);
    renderer.render(scene, camera);

    // Phones: the copy covers the house, so fade it while a system is selected.
    copyFade += (((highlight && vw < 640) ? 0.12 : 1) - copyFade) * k8;
    if (copy) { copy.style.opacity = copyFade; copy.style.pointerEvents = copyFade < 0.5 ? 'none' : ''; }
    if (shade) shade.style.opacity = copyFade;

    // Only the selected system's label shows, pinned over its anchor.
    for (const { el, s } of labelEls) {
      s.anchor.getWorldPosition(v).project(camera);
      const visible = s.focus > 0.02 && v.z < 1;
      el.style.opacity = visible ? s.focus : 0;
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) el.style.transform = `translate(${((v.x + 1) / 2) * vw}px, ${((1 - v.y) / 2) * vh}px) translate(-50%, -100%)`;
    }
  }

  // Only render while the hero is on screen and the tab is visible (saves battery after scrolling past).
  let onScreen = true;
  const sync = () => renderer.setAnimationLoop(onScreen && !document.hidden ? frame : null);
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; clock.getDelta(); sync(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { clock.getDelta(); sync(); });
  sync();
  return { renderer };
}
