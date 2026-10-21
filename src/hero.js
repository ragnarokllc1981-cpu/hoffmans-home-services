// Procedural 3D house cross-section. No external assets.
import * as THREE from 'three';

export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x07080b);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07080b, 18, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0x8899ff, 0x221100, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(6, 10, 8); scene.add(key);
  const rim = new THREE.PointLight(0xc6ff2e, 30, 20); rim.position.set(-5, 4, -3); scene.add(rim);

  const house = new THREE.Group();
  scene.add(house);
  const W = 8, D = 6, H = 3, ROOF = 2.4; // footprint & wall height

  // Ground grid + slab
  const grid = new THREE.GridHelper(40, 40, 0x1f2937, 0x111827); grid.position.y = -0.01; scene.add(grid);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.2, D + 0.4), new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.9 }));
  slab.position.y = -0.1; house.add(slab);

  // --- Framing (studs, plates, rafters)
  const wood = new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.8 });
  const framing = new THREE.Group(); house.add(framing);
  const stud = new THREE.BoxGeometry(0.1, H, 0.18);
  const addStud = (x, z, rotY = 0) => { const m = new THREE.Mesh(stud, wood); m.position.set(x, H / 2, z); m.rotation.y = rotY; framing.add(m); };
  for (let x = -W / 2; x <= W / 2 + 1e-6; x += 0.6) { addStud(x, -D / 2); addStud(x, D / 2); }
  for (let z = -D / 2 + 0.6; z < D / 2; z += 0.6) { addStud(-W / 2, z, Math.PI / 2); addStud(W / 2, z, Math.PI / 2); }
  for (let z = -D / 2 + 0.6; z < D / 2; z += 0.6) addStud(0.6, z, Math.PI / 2); // interior wall
  const plate = (len, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.2), wood); m.position.set(x, y, z); m.rotation.y = rotY; framing.add(m); };
  for (const y of [0.05, H - 0.05, H + 0.05]) { plate(W, 0, y, -D / 2, 0); plate(W, 0, y, D / 2, 0); plate(D, -W / 2, y, 0, Math.PI / 2); plate(D, W / 2, y, 0, Math.PI / 2); }
  const rafterLen = Math.hypot(D / 2, ROOF);
  const pitch = Math.atan2(ROOF, D / 2);
  for (let x = -W / 2; x <= W / 2 + 1e-6; x += 0.8) {
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, rafterLen), wood);
      r.position.set(x, H + ROOF / 2, s * D / 4); r.rotation.x = s * pitch; framing.add(r);
    }
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, 0.1), wood); ridge.position.set(0, H + ROOF, 0); framing.add(ridge);

  // --- Wiring: glowing tubes along walls to outlets + panel
  const wiring = new THREE.Group(); house.add(wiring);
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
    wiring.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.035, 6), wireMat));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.09, 8), new THREE.MeshBasicMaterial({ color: 0xc6ff2e, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    wiring.add(glow);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    p.userData = { curve, t: Math.random() }; wiring.add(p); pulses.push(p);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.08), new THREE.MeshStandardMaterial({ color: 0x27272a, emissive: 0xc6ff2e, emissiveIntensity: 0.3 }));
    box.position.copy(pts[pts.length - 1]); wiring.add(box);
  }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: 0x52525b, emissive: 0xc6ff2e, emissiveIntensity: 0.15 }));
  panel.position.set(-3.6, 1.4, -2.85); wiring.add(panel);

  // --- Ductwork: furnace + trunk + branches
  const duct = new THREE.Group(); house.add(duct);
  const metal = new THREE.MeshStandardMaterial({ color: 0x9fb4c8, metalness: 0.85, roughness: 0.3, emissive: 0x0a2540 });
  const furnace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.9), new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.4, emissive: 0x0c4a6e, emissiveIntensity: 0.6 }));
  furnace.position.set(2.8, 0.8, 1.6); duct.add(furnace);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.4, 0.6), metal); trunk.position.set(-0.3, H - 0.35, 0.8); duct.add(trunk);
  const riser = new THREE.Mesh(new THREE.BoxGeometry(0.5, H - 1.9, 0.5), metal); riser.position.set(2.8, 1.6 + (H - 1.9) / 2, 1.6); duct.add(riser);
  for (const x of [-3, -1.6, -0.2, 1.4]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 16), metal);
    b.rotation.x = Math.PI / 2; b.position.set(x, H - 0.35, x % 2 ? -0.6 : 2.0); duct.add(b);
  }

  // --- Exterior shell (walls + roof) that peels away
  const shell = new THREE.Group(); house.add(shell);
  const siding = new THREE.MeshStandardMaterial({ color: 0xe4e4e7, roughness: 0.7, side: THREE.DoubleSide });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, side: THREE.DoubleSide });
  const trim = new THREE.MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff6a1a, emissiveIntensity: 0.3 });
  const panels = [];
  const mkWall = (w, h, pos, rotY, dir) => {
    const pivot = new THREE.Group(); pivot.position.copy(pos); pivot.rotation.y = rotY;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), siding.clone()); m.position.y = h / 2; pivot.add(m);
    // window
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0xfbbf24, emissiveIntensity: 0.5 }));
    win.position.set(w * 0.2, h * 0.55, 0.07); pivot.add(win);
    const win2 = win.clone(); win2.position.x = -w * 0.25; pivot.add(win2);
    shell.add(pivot); panels.push({ pivot, dir, base: pos.clone() });
  };
  mkWall(W, H, new THREE.Vector3(0, 0, D / 2 + 0.07), 0, new THREE.Vector3(0, 0, 1));
  mkWall(D, H, new THREE.Vector3(W / 2 + 0.07, 0, 0), Math.PI / 2, new THREE.Vector3(1, 0, 0));
  mkWall(W, H, new THREE.Vector3(0, 0, -D / 2 - 0.07), Math.PI, new THREE.Vector3(0, 0, -1));
  mkWall(D, H, new THREE.Vector3(-W / 2 - 0.07, 0, 0), -Math.PI / 2, new THREE.Vector3(-1, 0, 0));
  const roofs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(0, H + ROOF, 0);
    const r = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.12, rafterLen + 0.4), Object.assign(roofMat.clone(), { transparent: true }));
    r.position.set(0, 0, s * (rafterLen + 0.4) / 2); pivot.add(r);
    const t = new THREE.Mesh(new THREE.BoxGeometry(W + 0.62, 0.05, 0.1), trim); t.position.set(0, 0.06, s * (rafterLen + 0.4)); pivot.add(t);
    pivot.rotation.x = s * pitch; shell.add(pivot); roofs.push({ pivot, s });
  }
  // Gable triangles
  const gableShape = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, ROOF)]);
  const gables = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), Object.assign(siding.clone(), { transparent: true }));
    g.rotation.y = Math.PI / 2; g.position.set(s * (W / 2 + 0.07), H, 0); shell.add(g); gables.push({ g, s });
  }

  house.position.y = -1.6;
  house.rotation.y = -0.6;

  // --- Interaction state
  let peel = 0, peelTarget = 0, mouseX = 0, mouseY = 0, autoT = 0, userScrolled = false;
  const onScroll = () => {
    const hero = document.getElementById('hero');
    const max = hero.offsetHeight - window.innerHeight;
    const p = Math.min(Math.max(window.scrollY / Math.max(max, 1), 0), 1);
    if (window.scrollY > 4) userScrolled = true;
    peelTarget = p;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pointermove', e => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; });
  const forced = new URLSearchParams(location.search).get('peel');

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize); resize();

  const ease = t => t * t * (3 - 2 * t);
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    // Timer-driven teaser peel until user scrolls
    if (!userScrolled) { autoT += dt; peelTarget = 0.5 + 0.5 * Math.sin(autoT * 0.6 - Math.PI / 2); }
    if (forced !== null) peelTarget = parseFloat(forced);
    peel += (peelTarget - peel) * Math.min(1, dt * 4);
    const e = ease(peel);
    panels.forEach(({ pivot, dir }, i) => {
      const k = ease(Math.min(Math.max(peel * 1.4 - i * 0.08, 0), 1));
      pivot.rotation.x = dir.z * k * 1.45; pivot.rotation.z = -dir.x * k * 1.45;
      pivot.position.y = -k * 0.2;
      pivot.children.forEach(c => { c.material.transparent = true; c.material.opacity = 1 - k * 0.85; });
    });
    roofs.forEach(({ pivot, s }) => { pivot.rotation.x = s * (pitch + e * 0.5); pivot.position.y = H + ROOF + e * 3.5; pivot.position.z = s * e * 3; pivot.children.forEach(c => { c.material.transparent = true; c.material.opacity = 1 - e * 0.8; }); });
    gables.forEach(({ g, s }) => { g.position.x = s * (W / 2 + 0.07 + e * 3); g.material.opacity = 1 - e; });
    wireMat.color.setHSL(0.22, 1, 0.5 + 0.15 * Math.sin(t * 6));
    pulses.forEach(p => { p.userData.t = (p.userData.t + dt * 0.35) % 1; p.position.copy(p.userData.curve.getPointAt(p.userData.t)); });
    // Orbit + parallax
    const ang = 0.6 + Math.sin(t * 0.15) * 0.35 + mouseX * 0.5;
    const r = 19 - e * 2.5;
    camera.position.set(Math.sin(ang) * r - 3, 6 + mouseY * -2 + e * 1.5, Math.cos(ang) * r);
    camera.lookAt(-3.2, 0.8, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
  return { renderer };
}
