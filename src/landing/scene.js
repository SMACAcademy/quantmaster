/**
 * The landing page's 3D journey (three.js). A night sky of drifting numbers and
 * symbols, and one small moving model per station: trains meeting, a tank
 * filling, people taking seats, charts rising, a clock, stacks of coins, a Venn
 * diagram and a die. Scrolling flies the camera from station to station.
 *
 * Loaded only by the landing page, so the rest of the app never pays for it.
 */

import * as THREE from 'three';
import { STATIONS, ease, focusOf } from './journey.js';

const SPACING = 34;
const FOG = 0x060914;
const GLYPHS = ['%', 'π', '√', '∑', 'x²', '÷', '∞', 'Δ', '₹', '7', '3', '9', '½', '∠', '≥', '×', '+', '=', 'θ', 'n!'];
const PALETTE = ['#7c8cff', '#60a5fa', '#06b6d4', '#a78bfa', '#f472b6', '#fbbf24', '#fb923c', '#34d399'];

/** Whether this browser can draw the scene at all (three.js needs WebGL 2). */
export function canRenderWebGL() {
  try {
    const probe = document.createElement('canvas');
    return Boolean(window.WebGL2RenderingContext && probe.getContext('webgl2'));
  } catch (_) {
    return false;
  }
}

/* ---------------- small builders ---------------- */

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** A text sprite that always faces the camera. `height` is its world height. */
function label(text, { color = '#eef1f8', height = 0.5, weight = 700, font = 'system-ui, -apple-system, Segoe UI, sans-serif', pill = false } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const px = 96;
  const draw = (value) => {
    ctx.font = `${weight} ${px}px ${font}`;
    const width = Math.ceil(ctx.measureText(value).width) + (pill ? px * 0.9 : px * 0.3);
    canvas.width = width;
    canvas.height = Math.ceil(px * 1.45);
    ctx.font = `${weight} ${px}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (pill) {
      const r = canvas.height / 2;
      ctx.fillStyle = 'rgba(10, 14, 30, 0.72)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(3, 3, canvas.width - 6, canvas.height - 6, r - 3);
      else ctx.rect(3, 3, canvas.width - 6, canvas.height - 6);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.fillText(value, canvas.width / 2, canvas.height / 2 + px * 0.04);
  };
  draw(text);
  const material = new THREE.SpriteMaterial({ map: canvasTexture(canvas), transparent: true, depthWrite: false, fog: true });
  const sprite = new THREE.Sprite(material);
  const fit = () => sprite.scale.set((height * canvas.width) / canvas.height, height, 1);
  fit();
  let current = text;
  sprite.userData.setText = (value) => {
    if (value === current) return;
    current = value;
    draw(value);
    material.map.dispose();
    material.map = canvasTexture(canvas);
    fit();
  };
  return sprite;
}

let haloTexture = null;
function halo(color, size, opacity = 0.55) {
  if (!haloTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    haloTexture = canvasTexture(canvas);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: haloTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  sprite.scale.set(size, size, 1);
  return sprite;
}

const standard = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15, ...extra });
const glow = (color, intensity = 0.6, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4, metalness: 0.1, ...extra });

/* ---------------- stations ---------------- */

function heroStation() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.MeshStandardMaterial({ color: '#6473ff', emissive: '#3b2f9a', emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.55, flatShading: true })
  );
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.25, 1)),
    new THREE.LineBasicMaterial({ color: '#67e8f9', transparent: true, opacity: 0.55 })
  );
  group.add(halo('#7c8cff', 9, 0.5), core, shell);

  const rings = [];
  [
    [0.3, 0, '#7c8cff'],
    [1.2, 0.6, '#f472b6'],
    [-0.9, 1.4, '#fbbf24']
  ].forEach(([tiltX, tiltZ, color], r) => {
    const ring = new THREE.Group();
    ring.rotation.set(tiltX, 0, tiltZ);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(3.4 + r * 0.45, 0.018, 8, 160), glow(color, 1.2)));
    const glyphs = GLYPHS.slice(r * 4, r * 4 + 4);
    glyphs.forEach((g, i) => {
      const sprite = label(g, { color, height: 0.62 });
      const a = (i / glyphs.length) * Math.PI * 2;
      sprite.position.set(Math.cos(a) * (3.4 + r * 0.45), Math.sin(a) * (3.4 + r * 0.45), 0);
      ring.add(sprite);
    });
    group.add(ring);
    rings.push(ring);
  });

  return {
    group,
    update(t) {
      core.rotation.set(t * 0.21, t * 0.33, 0);
      shell.rotation.set(-t * 0.12, -t * 0.18, 0);
      rings.forEach((ring, i) => (ring.rotation.y = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1)));
    }
  };
}

function trainStation() {
  const group = new THREE.Group();
  const LENGTH = 16;
  const rail = new THREE.BoxGeometry(LENGTH, 0.06, 0.08);
  const railMat = standard('#94a3b8', { metalness: 0.8, roughness: 0.3 });
  const sleeperMat = standard('#3b4261');
  for (const z of [-0.9, 0.9]) {
    for (const dz of [-0.32, 0.32]) {
      const r = new THREE.Mesh(rail, railMat);
      r.position.set(0, 0, z + dz);
      group.add(r);
    }
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.05, 1), sleeperMat, 40);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) sleepers.setMatrixAt(i, m.makeTranslation(-LENGTH / 2 + (i + 0.5) * (LENGTH / 40), -0.05, z));
    group.add(sleepers);
  }

  const train = (color, dir) => {
    const t = new THREE.Group();
    const body = glow(color, 0.25, { metalness: 0.35, roughness: 0.35 });
    const dark = standard('#1e2438');
    const windowMat = glow('#e0f2fe', 0.9);
    const wheel = new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16);
    for (let c = 0; c < 3; c++) {
      const car = new THREE.Group();
      const isEngine = c === 0;
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.62, 0.72), body);
      box.position.y = 0.5;
      car.add(box);
      if (isEngine) {
        const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.72, 20, 1, false, 0, Math.PI), body);
        nose.rotation.x = Math.PI / 2;
        nose.rotation.z = -Math.PI / 2;
        nose.position.set(0.75, 0.5, 0);
        car.add(nose);
        const lamp = halo('#fde68a', 0.9, 0.9);
        lamp.position.set(1.12, 0.45, 0);
        car.add(lamp);
      }
      for (let w = 0; w < 3; w++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.74), windowMat);
        win.position.set(-0.45 + w * 0.42, 0.62, 0);
        car.add(win);
      }
      for (const x of [-0.45, 0.45]) {
        for (const z of [-0.32, 0.32]) {
          const wh = new THREE.Mesh(wheel, dark);
          wh.rotation.x = Math.PI / 2;
          wh.position.set(x, 0.17, z);
          car.add(wh);
        }
      }
      car.position.x = -c * 1.62;
      t.add(car);
    }
    t.scale.x = dir;
    return t;
  };

  const a = train('#60a5fa', 1);
  a.position.z = 0.9;
  const b = train('#f472b6', -1);
  b.position.z = -0.9;
  const speedA = label('60 km/h →', { color: '#93c5fd', height: 0.42, pill: true });
  const speedB = label('← 40 km/h', { color: '#f9a8d4', height: 0.42, pill: true });
  const gapBar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), glow('#fbbf24', 1.4));
  gapBar.position.y = 1.6;
  const gapLabel = label('gap 300 km', { color: '#fde68a', height: 0.4 });
  const meet = label('they meet at 3/5 of the way', { color: '#fde68a', height: 0.34, pill: true });
  meet.position.set(0, 2.6, 0);
  const flash = halo('#fbbf24', 3, 0);
  group.add(a, b, speedA, speedB, gapBar, gapLabel, meet, flash);

  const START = 7;
  const MEET_X = -START + (2 * START * 3) / 5;
  return {
    group,
    update(t) {
      const cycle = 7;
      const p = (t % cycle) / cycle;
      const run = Math.min(p / 0.62, 1);
      const xa = -START + (MEET_X + START) * run + Math.max(0, p - 0.62) * 9;
      const xb = START - (START - MEET_X) * run - Math.max(0, p - 0.62) * 6;
      a.position.x = xa;
      b.position.x = xb;
      speedA.position.set(xa - 1.2, 1.45, 0.9);
      speedB.position.set(xb + 1.2, 1.45, -0.9);
      const gap = Math.max(xb - xa, 0.001);
      gapBar.scale.x = gap;
      gapBar.position.x = (xa + xb) / 2;
      gapBar.visible = run < 1;
      gapLabel.visible = run < 1;
      gapLabel.position.set((xa + xb) / 2, 1.95, 0);
      gapLabel.userData.setText(`gap ${Math.round((300 * gap) / (2 * START) / 10) * 10} km`);
      flash.position.set(MEET_X, 0.6, 0);
      flash.material.opacity = run >= 1 ? 0.8 * Math.max(0, 1 - (p - 0.62) * 4) : 0;
      meet.material.opacity = run >= 1 ? 1 : 0.35;
    }
  };
}

function tankStation() {
  const group = new THREE.Group();
  const R = 1.6;
  const H = 3.4;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 48, 1, true),
    new THREE.MeshPhysicalMaterial({ color: '#cbd5ff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })
  );
  const rimMat = glow('#67e8f9', 0.8);
  const rimTop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.05, 8, 64), rimMat);
  rimTop.rotation.x = Math.PI / 2;
  rimTop.position.y = H / 2;
  const rimBottom = rimTop.clone();
  rimBottom.position.y = -H / 2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.15, R + 0.25, 0.2, 48), standard('#1e2438'));
  base.position.y = -H / 2 - 0.1;
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.06, R - 0.06, 1, 48),
    new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#0e7490', emissiveIntensity: 0.6, transparent: true, opacity: 0.78, roughness: 0.15 })
  );
  const surface = new THREE.Mesh(new THREE.CircleGeometry(R - 0.06, 48), glow('#67e8f9', 0.9, { transparent: true, opacity: 0.6 }));
  surface.rotation.x = -Math.PI / 2;
  group.add(glass, rimTop, rimBottom, base, water, surface);

  const pipeMat = standard('#94a3b8', { metalness: 0.75, roughness: 0.3 });
  const pipe = (points) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 40, 0.13, 12), pipeMat);
  group.add(
    pipe([[-4.2, 2.6, 0], [-2.2, 2.6, 0], [-0.8, 2.6, 0], [-0.8, 2.05, 0]]),
    pipe([[4.2, 3.2, -0.4], [2.2, 3.2, -0.4], [0.7, 3.2, -0.4], [0.7, 2.05, -0.4]]),
    pipe([[1.2, -1.45, 0.6], [2.4, -1.45, 0.9], [4.2, -1.45, 0.9], [4.2, -2.4, 0.9]])
  );
  const tags = [
    ['A fills in 12 min', '#67e8f9', [-3.2, 3.15, 0]],
    ['B fills in 15 min', '#a5b4fc', [3.0, 3.75, -0.4]],
    ['C empties in 20 min', '#fda4af', [3.6, -0.85, 0.9]]
  ].map(([text, color, pos]) => {
    const tag = label(text, { color, height: 0.36, pill: true });
    tag.position.set(...pos);
    return tag;
  });
  const result = label('together: full in 10 min', { color: '#fde68a', height: 0.4, pill: true });
  result.position.set(0, -2.6, 1.4);
  group.add(...tags, result);

  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 8), glow('#67e8f9', 1.2), 30);
  group.add(drops);
  const m = new THREE.Matrix4();
  const streams = [
    { x: -0.8, z: 0, top: 2.0, n: 10 },
    { x: 0.7, z: -0.4, top: 2.0, n: 10 }
  ];

  return {
    group,
    update(t) {
      const cycle = 9;
      const p = (t % cycle) / cycle;
      const level = p < 0.8 ? p / 0.8 : 1 - (p - 0.8) / 0.2;
      const h = Math.max(0.02, level * (H - 0.1));
      water.scale.y = h;
      water.position.y = -H / 2 + h / 2;
      surface.position.y = -H / 2 + h + 0.005;
      result.material.opacity = level > 0.97 ? 1 : 0.4;
      let k = 0;
      for (const s of streams) {
        for (let i = 0; i < s.n; i++, k++) {
          const f = (t * 1.4 + i / s.n) % 1;
          const y = s.top - f * (s.top - (-H / 2 + h));
          m.makeTranslation(s.x + Math.sin(i * 7) * 0.03, y, s.z);
          drops.setMatrixAt(k, m);
        }
      }
      for (let i = 0; i < 10; i++, k++) {
        const f = (t * 1.1 + i / 10) % 1;
        m.makeTranslation(4.2, -2.45 - f * 1.6, 0.9);
        drops.setMatrixAt(k, m);
      }
      drops.instanceMatrix.needsUpdate = true;
    }
  };
}

function seatingStation() {
  const group = new THREE.Group();
  const table = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.16, 64), standard('#3b2f6b', { roughness: 0.3, metalness: 0.3 }));
  table.position.y = 0.9;
  const top = new THREE.Mesh(new THREE.TorusGeometry(2, 0.05, 8, 96), glow('#f472b6', 0.9));
  top.rotation.x = Math.PI / 2;
  top.position.y = 0.99;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.5, 0.9, 20), standard('#1e2438'));
  leg.position.y = 0.45;
  const floor = new THREE.Mesh(new THREE.RingGeometry(2.4, 4.4, 64), new THREE.MeshBasicMaterial({ color: '#f472b6', transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2;
  group.add(table, top, leg, floor);

  const N = 8;
  const people = [];
  const chairMat = standard('#2a3150');
  for (let i = 0; i < N; i++) {
    const angle = (i / N) * Math.PI * 2;
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.62), chairMat);
    seat.position.y = 0.5;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.08), chairMat);
    back.position.set(0, 0.85, -0.3);
    chair.add(seat, back);
    chair.position.set(Math.cos(angle) * 2.85, 0, Math.sin(angle) * 2.85);
    chair.lookAt(0, 0, 0);
    group.add(chair);

    const color = PALETTE[i % PALETTE.length];
    const person = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.42, 6, 14), glow(color, 0.35));
    body.position.y = 0.33;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), glow(color, 0.5));
    head.position.y = 0.88;
    const tag = label(String.fromCharCode(65 + i), { color, height: 0.5 });
    tag.position.y = 1.45;
    person.add(body, head, tag);
    group.add(person);
    people.push({ person, angle });
  }
  const clue = label('A sits third to the left of E, facing the centre', { color: '#f9a8d4', height: 0.34, pill: true });
  clue.position.set(0, 3.3, 0);
  group.add(clue);

  return {
    group,
    update(t) {
      const cycle = 11;
      const p = (t % cycle) / cycle;
      people.forEach(({ person, angle }, i) => {
        const e = ease((p * cycle - i * 0.6) / 1.1);
        const out = p > 0.88 ? ease((p - 0.88) / 0.1) : 0;
        const k = e * (1 - out);
        const a = angle + (1 - k) * Math.PI * 0.9;
        const r = 2.85 + (1 - k) * 1.5;
        person.position.set(Math.cos(a) * r, 0.42 + Math.sin(Math.PI * k) * 0.9, Math.sin(a) * r);
      });
      group.rotation.y = Math.sin(t * 0.15) * 0.35;
    }
  };
}

function dataStation() {
  const group = new THREE.Group();
  const grid = new THREE.GridHelper(6, 12, '#fbbf24', '#3b3524');
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.set(-1.3, -1.6, 0);
  group.add(grid);
  const values = [2.2, 3.4, 1.7, 4.3, 2.9, 3.8];
  const bars = values.map((v, i) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1, 0.55), glow(i % 2 ? '#fb923c' : '#fbbf24', 0.45, { metalness: 0.3 }));
    bar.position.set(-3.8 + i * 1.0, -1.6, 0);
    group.add(bar);
    const tag = label(String(Math.round(v * 25)), { color: '#fde68a', height: 0.34 });
    group.add(tag);
    return { bar, tag, v };
  });

  const pie = new THREE.Group();
  pie.position.set(2.3, 1.0, -0.6);
  pie.rotation.x = 1.05;
  const shares = [0.32, 0.24, 0.18, 0.15, 0.11];
  const colors = ['#fbbf24', '#fb923c', '#f472b6', '#a78bfa', '#60a5fa'];
  let start = 0;
  const slices = shares.map((share, i) => {
    const length = share * Math.PI * 2;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.32 + i * 0.06, 40, 1, false, start, length), glow(colors[i], 0.35, { metalness: 0.25 }));
    const mid = start + length / 2;
    start += length;
    pie.add(mesh);
    return { mesh, dir: new THREE.Vector3(Math.sin(mid), 0, Math.cos(mid)) };
  });
  const share = label('32% of 360° = 115.2°', { color: '#fde68a', height: 0.36, pill: true });
  share.position.set(2.3, 2.85, -0.6);
  group.add(pie, share);

  return {
    group,
    update(t, focus) {
      const grow = ease(focus * 1.4);
      bars.forEach(({ bar, tag, v }, i) => {
        const h = Math.max(0.01, v * grow * (0.92 + 0.08 * Math.sin(t * 1.6 + i)));
        bar.scale.y = h;
        bar.position.y = -1.6 + h / 2;
        tag.position.set(bar.position.x, -1.6 + h + 0.3, 0);
        tag.material.opacity = grow;
      });
      pie.rotation.y = t * 0.35;
      const pull = 0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.3));
      slices.forEach(({ mesh, dir }, i) => mesh.position.copy(dir).multiplyScalar(i === 0 ? pull * 1.8 : pull * 0.4));
    }
  };
}

function clockStation() {
  const group = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.18, 72), standard('#141a30', { roughness: 0.25, metalness: 0.4 }));
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.09, 12, 96), glow('#a78bfa', 0.9, { metalness: 0.6 }));
  group.add(halo('#a78bfa', 8, 0.25), face, rim);
  for (let i = 0; i < 60; i++) {
    const big = i % 5 === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.08 : 0.035, big ? 0.32 : 0.14, 0.04), glow(big ? '#e9d5ff' : '#6d5bb0', big ? 0.9 : 0.4));
    const a = (i / 60) * Math.PI * 2;
    tick.position.set(Math.sin(a) * 2.12, Math.cos(a) * 2.12, 0.11);
    tick.rotation.z = -a;
    group.add(tick);
  }
  [12, 3, 6, 9].forEach((n, i) => {
    const tag = label(String(n), { color: '#e9d5ff', height: 0.42 });
    const a = (i / 4) * Math.PI * 2;
    tag.position.set(Math.sin(a) * 1.62, Math.cos(a) * 1.62, 0.15);
    group.add(tag);
  });

  const SEGMENTS = 120;
  const sector = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, SEGMENTS),
    new THREE.MeshBasicMaterial({ color: '#c084fc', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })
  );
  sector.position.z = 0.12;
  const hand = (length, width, color) => {
    const pivot = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.06), glow(color, 1));
    bar.position.y = length / 2 - 0.15;
    pivot.add(bar);
    pivot.position.z = 0.16;
    return pivot;
  };
  const hourHand = hand(1.25, 0.12, '#f9a8d4');
  const minuteHand = hand(1.9, 0.07, '#e0f2fe');
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 20), glow('#fde68a', 1));
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.22;
  const reading = label('3:40  →  θ = 130°', { color: '#f5d0fe', height: 0.42, pill: true });
  reading.position.set(0, -3.15, 0.3);
  const formula = label('θ = |30H − 5.5M|', { color: '#c4b5fd', height: 0.4 });
  formula.position.set(0, 3.2, 0.3);
  group.add(sector, hourHand, minuteHand, hub, reading, formula);

  let lastText = '';
  return {
    group,
    update(t) {
      const totalMinutes = (t * 22) % 720;
      const H = Math.floor(totalMinutes / 60) || 12;
      const M = Math.floor(totalMinutes % 60);
      const hourAngle = ((totalMinutes / 60) % 12) * (Math.PI / 6);
      const minuteAngle = (totalMinutes % 60) * (Math.PI / 30);
      hourHand.rotation.z = -hourAngle;
      minuteHand.rotation.z = -minuteAngle;
      // Sweep from the minute hand to the hour hand the short way round.
      let diff = hourAngle - minuteAngle;
      diff = ((diff % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const clockwise = diff <= Math.PI;
      const sweep = clockwise ? diff : Math.PI * 2 - diff;
      const from = clockwise ? minuteAngle : hourAngle;
      sector.rotation.z = Math.PI / 2 - from - sweep;
      sector.geometry.setDrawRange(0, Math.max(3, Math.round((sweep / (Math.PI * 2)) * SEGMENTS) * 3));
      // The reading steps every five minutes, so its texture is not redrawn every frame.
      const M5 = M - (M % 5);
      const theta = Math.abs(30 * (H % 12) - 5.5 * M5);
      const shown = Math.round(theta > 180 ? 360 - theta : theta);
      const text = `${H}:${String(M5).padStart(2, '0')}  →  θ = ${shown}°`;
      if (text !== lastText) {
        lastText = text;
        reading.userData.setText(text);
      }
      group.rotation.y = Math.sin(t * 0.3) * 0.25;
    }
  };
}

function moneyStation() {
  const group = new THREE.Group();
  const YEARS = 8;
  const simple = Array.from({ length: YEARS }, (_, n) => 4 + n);
  const compound = Array.from({ length: YEARS }, (_, n) => Math.round(4 * Math.pow(1.3, n)));
  const total = simple.reduce((a, b) => a + b, 0) + compound.reduce((a, b) => a + b, 0);
  const coin = new THREE.CylinderGeometry(0.34, 0.34, 0.09, 28);
  const gold = new THREE.InstancedMesh(coin, new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#92400e', emissiveIntensity: 0.35, metalness: 0.85, roughness: 0.28 }), total);
  const silver = new THREE.InstancedMesh(coin, new THREE.MeshStandardMaterial({ color: '#cbd5e1', emissive: '#334155', emissiveIntensity: 0.3, metalness: 0.85, roughness: 0.3 }), total);
  group.add(gold, silver);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(YEARS * 0.9 + 0.6, 0.12, 2.9), standard('#1b2036'));
  plinth.position.set(0, -2.06, 0);
  group.add(plinth);
  const tagSI = label('Simple interest: same coins every year', { color: '#e2e8f0', height: 0.32, pill: true });
  tagSI.position.set(-0.6, -2.55, 1.3);
  const tagCI = label('Compound: interest on the interest', { color: '#fde68a', height: 0.34, pill: true });
  tagCI.position.set(0.3, 3.4, -0.7);
  const year = label('year 1', { color: '#fed7aa', height: 0.4 });
  year.position.set(-4.2, 0.6, 0);
  group.add(tagSI, tagCI, year);
  const m = new THREE.Matrix4();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const x0 = -((YEARS - 1) * 0.9) / 2;

  const fill = (mesh, stacks, z, shown, t) => {
    let k = 0;
    stacks.forEach((count, n) => {
      for (let c = 0; c < count; c++, k++) {
        if (n > shown) {
          mesh.setMatrixAt(k, hidden);
          continue;
        }
        const fresh = n === Math.floor(shown) ? Math.max(0, 1 - (shown - n) * 3) : 0;
        const drop = fresh * (2 + c * 0.05);
        m.makeRotationY(c * 0.4 + t * 0.2 * (n % 2 ? 1 : -1));
        m.setPosition(x0 + n * 0.9, -1.95 + c * 0.1 + drop, z);
        mesh.setMatrixAt(k, m);
      }
    });
    for (; k < total; k++) mesh.setMatrixAt(k, hidden);
    mesh.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    update(t) {
      const cycle = 10;
      const p = (t % cycle) / cycle;
      const shown = Math.min(YEARS - 1, p * (YEARS + 2));
      fill(silver, simple, 0.75, shown, t);
      fill(gold, compound, -0.75, shown, t);
      year.userData.setText(`year ${Math.floor(shown) + 1}`);
      group.rotation.y = -0.35 + Math.sin(t * 0.2) * 0.12;
    }
  };
}

function logicStation() {
  const group = new THREE.Group();
  const venn = new THREE.Group();
  const discs = [
    ['#f472b6', 'Doctors', [-0.85, 0.55]],
    ['#06b6d4', 'Singers', [0.85, 0.55]],
    ['#a78bfa', 'Runners', [0, -0.9]]
  ].map(([color, name, [x, y]]) => {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    disc.position.set(x, y, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 8, 96), glow(color, 1.2));
    ring.position.copy(disc.position);
    const tag = label(name, { color, height: 0.36 });
    tag.position.set(x * 1.9, y * 1.9 + (y > 0 ? 0.6 : -0.35), 0.1);
    venn.add(disc, ring, tag);
    return { disc, ring, x, y };
  });
  const core = halo('#ffffff', 1.1, 0.9);
  core.position.set(0, 0.07, 0.05);
  venn.add(core);
  venn.position.set(-1.7, 0.4, 0);
  const claim = label('Some doctors are singers ✓', { color: '#6ee7b7', height: 0.34, pill: true });
  claim.position.set(-1.7, 3.2, 0);

  const die = new THREE.Group();
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 1.7, 1.7),
    new THREE.MeshStandardMaterial({ color: '#ecfdf5', roughness: 0.3, metalness: 0.05, emissive: '#064e3b', emissiveIntensity: 0.15 })
  );
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: '#34d399' }));
  die.add(cube, edges);
  const pip = new THREE.SphereGeometry(0.13, 12, 12);
  const pipMat = glow('#047857', 0.4);
  const layouts = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    5: [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
    6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
  };
  // Opposite faces add to 7: 1–6 on ±x, 2–5 on ±y, 3–4 on ±z.
  const faces = [
    [1, (a, b) => [0.86, a, b]],
    [6, (a, b) => [-0.86, a, b]],
    [2, (a, b) => [a, 0.86, b]],
    [5, (a, b) => [a, -0.86, b]],
    [3, (a, b) => [a, b, 0.86]],
    [4, (a, b) => [a, b, -0.86]]
  ];
  for (const [n, place] of faces) {
    for (const [a, b] of layouts[n]) {
      const dot = new THREE.Mesh(pip, pipMat);
      dot.position.set(...place(a * 0.45, b * 0.45));
      die.add(dot);
    }
  }
  die.position.set(3.2, 0.2, 0.4);
  const dieTag = label('opposite faces add to 7', { color: '#6ee7b7', height: 0.32, pill: true });
  dieTag.position.set(3.2, -1.9, 0.4);
  group.add(venn, claim, die, dieTag, halo('#34d399', 7, 0.18));

  return {
    group,
    update(t) {
      discs.forEach(({ disc, ring, x, y }, i) => {
        const breathe = 1 + 0.12 * Math.sin(t * 1.2 + i * 2.1);
        disc.position.set(x * breathe, y * breathe, 0);
        ring.position.copy(disc.position);
      });
      venn.rotation.y = Math.sin(t * 0.4) * 0.35;
      die.rotation.set(t * 0.7, t * 0.45, t * 0.2);
      die.position.y = 0.2 + Math.sin(t * 1.5) * 0.25;
    }
  };
}

function finaleStation() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.32, 24, 160), glow('#7c8cff', 0.9, { metalness: 0.6, roughness: 0.2 }));
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.6, 8, 16), glow('#7c8cff', 0.9, { metalness: 0.6, roughness: 0.2 }));
  tail.position.set(2.3, -2.4, 0);
  tail.rotation.z = Math.PI / 4;
  const q = new THREE.Group();
  q.add(ring, tail, halo('#7c8cff', 13, 0.45));
  group.add(q);
  const swirl = new THREE.Group();
  GLYPHS.forEach((g, i) => {
    const sprite = label(g, { color: PALETTE[i % PALETTE.length], height: 0.55 });
    const a = (i / GLYPHS.length) * Math.PI * 2;
    const r = 4.6 + (i % 3) * 0.7;
    sprite.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.55, Math.sin(a * 3) * 1.2);
    swirl.add(sprite);
  });
  group.add(swirl);
  return {
    group,
    update(t) {
      q.rotation.y = Math.sin(t * 0.4) * 0.5;
      q.rotation.x = Math.sin(t * 0.3) * 0.15;
      swirl.rotation.z = t * 0.12;
    }
  };
}

const BUILDERS = {
  hero: heroStation,
  motion: trainStation,
  work: tankStation,
  seating: seatingStation,
  data: dataStation,
  clock: clockStation,
  money: moneyStation,
  logic: logicStation,
  finale: finaleStation
};

/** Camera height above, and distance from, each station's model. */
const VIEWS = {
  hero: [1.7, 11.5],
  motion: [3.6, 12.5],
  work: [1.2, 11],
  seating: [5.2, 11.5],
  data: [1.8, 13.5],
  clock: [0.4, 10.5],
  money: [2.6, 11],
  logic: [0.8, 10.5],
  finale: [0.6, 16]
};

/** Where each station sits in the world. */
function stationPosition(index) {
  const { side } = STATIONS[index];
  const x = side === 'right' ? 4.2 : side === 'left' ? -4.2 : 0;
  return new THREE.Vector3(x, index % 2 ? -0.3 : 0.3, -index * SPACING);
}

/* ---------------- background ---------------- */

function starField(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 140;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = 30 - Math.random() * (STATIONS.length * SPACING + 80);
    c.set(PALETTE[i % PALETTE.length]).lerp(new THREE.Color('#ffffff'), 0.6);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
}

function glyphField(count) {
  const group = new THREE.Group();
  const items = [];
  const depth = STATIONS.length * SPACING + 40;
  for (let i = 0; i < count; i++) {
    const sprite = label(GLYPHS[i % GLYPHS.length], { color: PALETTE[(i * 7) % PALETTE.length], height: 0.5 + Math.random() * 0.9, weight: 600 });
    let x;
    let y;
    do {
      x = (Math.random() - 0.5) * 44;
      y = (Math.random() - 0.5) * 26;
    } while (Math.abs(x) < 7 && Math.abs(y) < 4.5);
    sprite.position.set(x, y, 20 - Math.random() * depth);
    sprite.material.opacity = 0.35 + Math.random() * 0.4;
    group.add(sprite);
    items.push({ sprite, base: y, speed: 0.2 + Math.random() * 0.5, phase: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.6 });
  }
  return {
    group,
    update(t) {
      for (const it of items) {
        it.sprite.position.y = it.base + Math.sin(t * it.speed + it.phase) * 0.6;
        it.sprite.material.rotation = Math.sin(t * 0.3 + it.phase) * it.spin;
      }
    }
  };
}

/* ---------------- the scene ---------------- */

/**
 * Start the scene on `canvas`. Call `setProgress(u)` with the journey position
 * (a fractional station index); the camera eases towards it.
 */
export function createLandingScene(canvas) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(FOG);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, 0.026);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight('#c7d2fe', '#1e1b4b', 1.1));
  const key = new THREE.DirectionalLight('#ffffff', 1.6);
  key.position.set(6, 10, 8);
  scene.add(key);

  scene.add(starField(small ? 900 : 1800));
  const glyphs = glyphField(small ? 70 : 150);
  scene.add(glyphs.group);

  const stations = STATIONS.map((station, i) => {
    const built = BUILDERS[station.id]();
    const position = stationPosition(i);
    built.group.position.copy(position);
    const light = new THREE.PointLight(station.color, 30, 18, 1.6);
    light.position.set(position.x, position.y + 3.5, position.z + 3);
    scene.add(built.group, light);
    return { ...built, position, light };
  });

  let target = 0;
  let current = 0;
  let narrow = false;
  const pointer = new THREE.Vector2();
  const pointerSmooth = new THREE.Vector2();
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  const LAST = stations.length - 1;
  /**
   * The camera's resting place and aim for station i. One step past the last
   * station the camera has flown through the ring of the Q and out the far side.
   */
  const rest = (i, outPos, outLook) => {
    if (i > LAST) {
      const p = stations[LAST].position;
      outPos.set(p.x, p.y, p.z - 7);
      outLook.set(p.x, p.y, p.z - 40);
      return;
    }
    const p = stations[i].position;
    const [height, distance] = VIEWS[STATIONS[i].id];
    if (narrow) {
      outPos.set(p.x, p.y + height * 0.6 + 0.4, p.z + distance + 4);
      outLook.set(p.x, p.y - 1.9, p.z);
    } else {
      const side = STATIONS[i].side;
      const shift = side === 'right' ? -3.6 : side === 'left' ? 3.6 : 0;
      outPos.set(p.x + shift, p.y + height, p.z + distance);
      outLook.set(p.x + shift, p.y + 0.2, p.z);
    }
  };

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    narrow = w / h < 0.9;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = narrow ? 55 : 45;
    camera.updateProjectionMatrix();
  };
  resize();

  const onPointer = (event) => {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, (event.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const clock = new THREE.Clock();
  let frame = 0;
  let running = true;
  const tick = () => {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    if (document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    current += (target - current) * Math.min(1, dt * 3.2);
    if (Math.abs(target - current) < 1e-4) current = target;

    const i = Math.min(Math.floor(current), LAST + 1);
    const j = Math.min(i + 1, LAST + 1);
    const f = ease(current - i);
    rest(i, camPos, look);
    rest(j, a, b);
    camPos.lerp(a, f);
    look.lerp(b, f);
    // Between stations the camera lifts, swings and banks a little, like a flight.
    const travel = Math.sin(Math.PI * (current - i));
    camPos.y += travel * 1.6;
    camPos.z += travel * 3;
    pointerSmooth.lerp(pointer, Math.min(1, dt * 2.5));
    camPos.x += pointerSmooth.x * 0.7;
    camPos.y -= pointerSmooth.y * 0.45;
    camera.position.copy(camPos);
    camera.lookAt(look);
    camera.rotateZ(travel * 0.07 * (STATIONS[Math.min(j, LAST)].side === 'left' ? 1 : -1));

    stations.forEach((s, k) => {
      const near = Math.abs(current - k) < 1.6;
      s.group.visible = near;
      s.light.visible = near;
      if (!near) return;
      const focus = focusOf(current, k);
      const scale = 0.55 + 0.45 * ease(focus * 1.25);
      s.group.scale.setScalar(scale);
      s.update(t, focus);
    });
    glyphs.update(t);
    renderer.render(scene, camera);
  };
  tick();

  return {
    setProgress(u) {
      target = Math.max(0, Math.min(LAST + 1, u));
    },
    jump(u) {
      target = current = Math.max(0, Math.min(LAST + 1, u));
    },
    resize,
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
        for (const material of materials) {
          if (material.map && material.map !== haloTexture) material.map.dispose();
          material.dispose();
        }
      });
      haloTexture?.dispose();
      haloTexture = null;
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
