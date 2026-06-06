// Reusable water-distortion text effect.
// Adapted from Codrops "Creating a Water-like Distortion Effect with Three.js"
// (Jesper Landberg, 2019). Reimplemented in raw WebGL — no Three.js dep.

// ─── easings ──────────────────────────────────────────────
const easeOutSine = (t: number, b: number, c: number, d: number) =>
  c * Math.sin((t / d) * (Math.PI / 2)) + b;

const easeOutQuad = (t: number, b: number, c: number, d: number) => {
  t /= d;
  return -c * t * (t - 2) + b;
};

// ─── WaterTexture: 2D canvas trail driven by mouse ────────
type WaterPoint = {
  x: number;
  y: number;
  age: number;
  force: number;
  vx: number;
  vy: number;
};

class WaterTexture {
  size = 128;
  maxAge = 50;
  radius: number;
  points: WaterPoint[] = [];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  last: { x: number; y: number } | null = null;

  constructor() {
    this.radius = this.size * 0.1;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d')!;
    this.clear();
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.size, this.size);
  }

  addPoint(point: { x: number; y: number }) {
    let force = 0;
    let vx = 0;
    let vy = 0;
    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(d2);
      if (d > 0) {
        vx = dx / d;
        vy = dy / d;
      }
      force = Math.min(d2 * 6000, 1);
    }
    this.last = { x: point.x, y: point.y };
    this.points.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  update() {
    this.clear();
    const agePart = 1 / this.maxAge;
    this.points = this.points.filter((p) => {
      const slow = 1 - p.age / this.maxAge;
      const f = p.force * agePart * slow;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.age += 1;
      return p.age <= this.maxAge;
    });
    this.points.forEach((p) => this.drawPoint(p));
  }

  drawPoint(p: WaterPoint) {
    const pos = { x: p.x * this.size, y: p.y * this.size };
    const radius = this.radius;
    const ctx = this.ctx;

    let intensity = 1;
    if (p.age < this.maxAge * 0.3) {
      intensity = easeOutSine(p.age / (this.maxAge * 0.3), 0, 1, 1);
    } else {
      intensity = easeOutQuad(
        1 - (p.age - this.maxAge * 0.3) / (this.maxAge * 0.7),
        0,
        1,
        1
      );
    }
    intensity *= p.force;

    // RG: encoded velocity vector. B: intensity.
    const red = ((p.vx + 1) / 2) * 255;
    const green = ((p.vy + 1) / 2) * 255;
    const blue = intensity * 255;

    // Shadow offset trick: draws circle far off-canvas, its shadow lands on-canvas
    // giving a soft falloff in the encoded RG/B channels.
    const offset = this.size * 5;
    ctx.shadowOffsetX = offset;
    ctx.shadowOffsetY = offset;
    ctx.shadowBlur = radius;
    ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, ${0.2 * intensity})`;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 0, 0, 1)';
    ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Shaders ─────────────────────────────────────────────
const VERTEX_SHADER = /* glsl */ `
  attribute vec2 a_position;
  varying vec2 vUv;
  void main() {
    vUv = (a_position + 1.0) * 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform sampler2D uText;
  uniform sampler2D uWater;
  varying vec2 vUv;

  void main() {
    vec4 water = texture2D(uWater, vUv);
    float vx = -(water.r * 2.0 - 1.0);
    float vy = -(water.g * 2.0 - 1.0);
    float intensity = water.b;
    float maxAmp = 0.06;

    vec2 uv = vUv;
    uv.x += vx * intensity * maxAmp;
    uv.y += vy * intensity * maxAmp;

    gl_FragColor = texture2D(uText, uv);
  }
`;

// ─── GL helpers ──────────────────────────────────────────
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function linkProgram(
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  return program;
}

function createGlTexture(gl: WebGLRenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// ─── TextDistortion: glues it all together ──────────────
export class TextDistortion {
  // protected: subclasses (e.g. hero kinetic variant) need to read/replace these
  protected container: HTMLElement;
  protected canvas: HTMLCanvasElement;
  protected lines: string[];
  protected dpr: number;

  protected textCanvas: HTMLCanvasElement;
  // Dirty-flag wrapper preserves the THREE.Texture-shaped API that
  // subclasses use (`this.textTexture.needsUpdate = true`).
  protected textTexture: { needsUpdate: boolean };
  protected waterTexture: WaterTexture;

  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private positionBuffer: WebGLBuffer;
  private positionLoc: number;
  private uTextLoc: WebGLUniformLocation;
  private uWaterLoc: WebGLUniformLocation;
  private glTextTex: WebGLTexture;
  private glWaterTex: WebGLTexture;

  private rafId: number | null = null;
  protected isVisible = false;
  private resizeObserver: ResizeObserver;
  private themeObserver: MutationObserver;
  private intersectionObserver: IntersectionObserver;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement, lines: string[]) {
    this.container = container;
    this.canvas = canvas;
    this.lines = lines;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.textCanvas = document.createElement('canvas');
    this.textTexture = { needsUpdate: true };
    this.waterTexture = new WaterTexture();

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    this.program = linkProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.positionLoc = gl.getAttribLocation(this.program, 'a_position');
    this.uTextLoc = gl.getUniformLocation(this.program, 'uText')!;
    this.uWaterLoc = gl.getUniformLocation(this.program, 'uWater')!;

    // Fullscreen quad as TRIANGLE_STRIP.
    this.positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    this.glTextTex = createGlTexture(gl);
    this.glWaterTex = createGlTexture(gl);

    // Premultiplied alpha blending — text canvas has transparent BG with
    // opaque text strokes, blend over the page background cleanly.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.tick = this.tick.bind(this);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.themeObserver = new MutationObserver(() => this.renderText());
    this.intersectionObserver = new IntersectionObserver(
      (entries) => this.onIntersect(entries),
      { threshold: 0 }
    );
  }

  async start() {
    try {
      const textEl = this.container.querySelector<HTMLElement>('[data-text-distortion-text]');
      if (textEl) {
        const cs = getComputedStyle(textEl);
        await document.fonts.load(`${cs.fontWeight} 100px ${cs.fontFamily}`);
      } else {
        const fw = this._weightAttr();
        const ff = this._fontAttr();
        await document.fonts.load(`${fw} 100px ${ff}`);
      }
    } catch {
      /* system font fallback */
    }
    this.resize();
    this.renderText();
    // Signal to CSS that the WebGL effect is live — the global rule keys
    // off this to make the underlying DOM text transparent.
    this.container.classList.add('is-distortion-ready');
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    this.resizeObserver.observe(this.container);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    this.intersectionObserver.observe(this.container);
  }

  stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.resizeObserver.disconnect();
    this.themeObserver.disconnect();
    this.intersectionObserver.disconnect();
  }

  private onIntersect(entries: IntersectionObserverEntry[]) {
    const wasVisible = this.isVisible;
    this.isVisible = entries[0].isIntersecting;
    if (this.isVisible && !wasVisible && this.rafId === null) {
      this.rafId = requestAnimationFrame(this.tick);
    }
  }

  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    const dpr = this.dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.renderText();
  }

  // Hook called from the tick loop before the GL render.
  // Subclasses can use it to refresh the text texture (e.g. on scroll).
  protected beforeRender(): void {}

  protected renderText() {
    const { width, height } = this.container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const dpr = this.dpr;
    this.textCanvas.width = Math.round(width * dpr);
    this.textCanvas.height = Math.round(height * dpr);
    const ctx = this.textCanvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const textEl = this.container.querySelector<HTMLElement>('[data-text-distortion-text]');
    let fontSize: number;
    let textAlign: CanvasTextAlign = 'center';
    if (textEl) {
      const cs = getComputedStyle(textEl);
      fontSize = parseFloat(cs.fontSize);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ls = parseFloat(cs.letterSpacing);
      if (!isNaN(ls) && 'letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${ls}px`;
      }
      textAlign = (cs.textAlign as CanvasTextAlign) || 'center';
    } else {
      fontSize = (height / this.lines.length) / 0.85;
      ctx.font = `${this._weightAttr()} ${fontSize}px ${this._fontAttr()}`;
      const ls = this._spacingAttr();
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${ls * fontSize}px`;
      }
    }

    const longest = this.lines.reduce((a, b) => (a.length > b.length ? a : b));
    const measured = ctx.measureText(longest).width;
    if (measured > width * 1.01) {
      const ratio = width / measured;
      fontSize *= ratio;
      ctx.font = textEl
        ? `${getComputedStyle(textEl).fontWeight} ${fontSize}px ${getComputedStyle(textEl).fontFamily}`
        : `${this._weightAttr()} ${fontSize}px ${this._fontAttr()}`;
      if ('letterSpacing' in ctx) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${(textEl ? parseFloat(getComputedStyle(textEl).letterSpacing) : this._spacingAttr()) * fontSize}px`;
      }
    }

    ctx.fillStyle = readTextColor();
    ctx.textAlign = textAlign;
    ctx.textBaseline = 'alphabetic';

    const lineMetrics = this.lines.map((l) => ctx.measureText(l));
    const ascents = lineMetrics.map(
      (m) => m.actualBoundingBoxAscent || fontSize * 0.78
    );
    const descents = lineMetrics.map(
      (m) => m.actualBoundingBoxDescent || fontSize * 0.05
    );

    const lineSpacing = fontSize * 0.85;
    const firstAscent = ascents[0];
    const lastDescent = descents[descents.length - 1];
    const stackHeight = firstAscent + (this.lines.length - 1) * lineSpacing + lastDescent;
    const stackTop = (height - stackHeight) / 2;
    const xPos = textAlign === 'center' ? width / 2 : 0;

    this.lines.forEach((line, i) => {
      const baselineY = stackTop + i * lineSpacing + ascents[i];
      ctx.fillText(line, xPos, baselineY);
    });

    this.textTexture.needsUpdate = true;
  }

  private _fontAttr(): string {
    return this.container.getAttribute('data-text-distortion-font') || '"Bebas Neue", Impact, sans-serif';
  }
  private _weightAttr(): string {
    return this.container.getAttribute('data-text-distortion-weight') || '400';
  }
  private _spacingAttr(): number {
    const v = this.container.getAttribute('data-text-distortion-spacing');
    return v !== null ? parseFloat(v) : -0.02;
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isVisible) return;
    const rect = this.container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) return;
    this.waterTexture.addPoint({ x, y });
  }

  private uploadTexture(tex: WebGLTexture, source: HTMLCanvasElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  private tick() {
    this.beforeRender();
    this.waterTexture.update();

    const gl = this.gl;
    if (this.textTexture.needsUpdate && this.textCanvas.width > 0) {
      this.uploadTexture(this.glTextTex, this.textCanvas);
      this.textTexture.needsUpdate = false;
    }
    // Water canvas changes every frame — always upload.
    this.uploadTexture(this.glWaterTex, this.waterTexture.canvas);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glTextTex);
    gl.uniform1i(this.uTextLoc, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glWaterTex);
    gl.uniform1i(this.uWaterLoc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (this.isVisible) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = null;
    }
  }
}

export function readTextColor() {
  // Read the body's computed color rather than the raw --c-text custom
  // property: the property may hold a `light-dark()` value as its literal
  // unresolved string, but `color` is always returned as a resolved rgb()
  // so we get the real theme-aware ink colour.
  const value = getComputedStyle(document.body).color.trim();
  return value || '#1F1C1D';
}

// ─── Auto-init: scan DOM for [data-text-distortion] ──────
//
// Markup contract:
//   <wrapper data-text-distortion>
//     <text-element data-text-distortion-text>Some text</text-element>
//     <canvas aria-hidden="true"></canvas>
//   </wrapper>
//
// Multi-line text uses <br/> inside the text element.
export function initTextDistortions(root: ParentNode = document) {
  // The water effect depends on a fine pointer to feel right and adds GPU
  // weight that we don't want on phones. Skip on coarse pointers and narrow
  // viewports — CSS keeps the underlying text visible in those cases.
  const isMobileLike = window.matchMedia(
    '(hover: none), (pointer: coarse), (max-width: 768px)'
  ).matches;
  if (isMobileLike) return [];

  const wrappers = root.querySelectorAll<HTMLElement>(
    '[data-text-distortion]:not([data-text-distortion-skip])'
  );
  const instances: TextDistortion[] = [];
  wrappers.forEach((wrapper) => {
    const textEl = wrapper.querySelector<HTMLElement>('[data-text-distortion-text]');
    const canvas = wrapper.querySelector<HTMLCanvasElement>('canvas');
    if (!textEl || !canvas) return;
    const lines = extractLines(textEl);
    if (lines.length === 0) return;
    const d = new TextDistortion(wrapper, canvas, lines);
    d.start();
    instances.push(d);
  });
  return instances;
}

function extractLines(el: HTMLElement): string[] {
  // Match <br>, <br/>, <br /> AND <br data-foo="...">
  // (Astro injects scope attributes onto <br> tags in scoped components)
  const BR_RE = /<br\b[^>]*>/gi;
  const html = el.innerHTML;
  if (BR_RE.test(html)) {
    return html
      .split(BR_RE)
      .map((s) => stripHtml(s).trim())
      .filter(Boolean);
  }
  return [(el.textContent || '').trim()].filter(Boolean);
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || '';
}
