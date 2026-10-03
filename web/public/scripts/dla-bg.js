
  (function () {
    const cv = document.getElementById("dla-bg");
    if (!cv) return;

    /* ── Props ────────────────────────────────────────────────────── */
    const CELL = parseFloat(cv.dataset.cellSize) || 7;
    const NSEED = parseInt(cv.dataset.seeds) || 9;
    const BASE = parseFloat(cv.dataset.baseOpacity) || 0.4;
    const SPOT = parseFloat(cv.dataset.spotRadius) || 0.22;
    const BPX = parseFloat(cv.dataset.borderPx) || 1.0;

    /* Base fill + edge colours */
    const FR = parseFloat(cv.dataset.fr) || 0.78;
    const FG = parseFloat(cv.dataset.fg) || 0.82;
    const FB = parseFloat(cv.dataset.fb) || 0.85;
    const ER = parseFloat(cv.dataset.er) || 0.49;
    const EG = parseFloat(cv.dataset.eg) || 0.5;
    const EB = parseFloat(cv.dataset.eb) || 0.52;

    /* Cursor-hover colours — fall back to a darkened version of base */
    const DARK = 0.65; // default darkening factor if hi colours not supplied
    const HFR = !isNaN(parseFloat(cv.dataset.hfr)) ? parseFloat(cv.dataset.hfr) : FR * DARK;
    const HFG = !isNaN(parseFloat(cv.dataset.hfg)) ? parseFloat(cv.dataset.hfg) : FG * DARK;
    const HFB = !isNaN(parseFloat(cv.dataset.hfb)) ? parseFloat(cv.dataset.hfb) : FB * DARK;
    const HER = !isNaN(parseFloat(cv.dataset.her)) ? parseFloat(cv.dataset.her) : ER * DARK;
    const HEG = !isNaN(parseFloat(cv.dataset.heg)) ? parseFloat(cv.dataset.heg) : EG * DARK;
    const HEB = !isNaN(parseFloat(cv.dataset.heb)) ? parseFloat(cv.dataset.heb) : EB * DARK;

    /* ── Grid ─────────────────────────────────────────────────────── */
    const GW = Math.max(40, Math.floor(window.innerWidth / CELL));
    const GH = Math.max(25, Math.floor(window.innerHeight / CELL));
    const MAX_SEEDS = Math.min(NSEED, 20);
    const KR_EXTRA = Math.min(GW, GH) * 0.25;

    /* ── WebGL ─────────────────────────────────────────────────────── */
    // Safari composites premultipliedAlpha:false as premultiplied → washed-out white.
    // Use default premultiplied output and multiply RGB by alpha in the shader.
    const gl =
      cv.getContext("webgl", { alpha: true, premultipliedAlpha: true }) ||
      cv.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    const VS = `
    attribute vec2 a_pos;
    varying   vec2 v_uv;
    void main() {
      v_uv        = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

    /*
     * The spotlight factor (spot, 0→1) drives two independent effects:
     *   1. Colour  — fill and edge each mix from their base to their hi value.
     *   2. Opacity — blends from u_base up to 1.0.
     *
     * Set hiFill / hiEdge to whatever colour you want near the cursor.
     * The transition radius is u_spot (same as before).
     */
    const FS = `
    precision mediump float;
    uniform sampler2D u_tex;
    uniform vec2      u_cursor;
    uniform float     u_aspect;
    uniform float     u_base;
    uniform float     u_spot;
    uniform vec3      u_fill;
    uniform vec3      u_fill_hi;
    uniform vec3      u_edge;
    uniform vec3      u_edge_hi;
    uniform vec2      u_texel;
    uniform vec2      u_screen;
    uniform float     u_bpx;
    varying vec2 v_uv;

    void main() {
      float cell = step(0.5, texture2D(u_tex, v_uv).a);

      /* ── 1px border detection ──────────────────────────────────── */
      vec2  cellPos = fract(v_uv / u_texel);
      vec2  pixFrac = (vec2(u_bpx) / u_screen) / u_texel;

      float nearL = step(cellPos.x,       pixFrac.x);
      float nearR = step(1.0 - cellPos.x, pixFrac.x);
      float nearT = step(cellPos.y,       pixFrac.y);
      float nearB = step(1.0 - cellPos.y, pixFrac.y);

      float emptyL = 1.0 - step(0.5, texture2D(u_tex, v_uv + vec2(-u_texel.x, 0.0)).a);
      float emptyR = 1.0 - step(0.5, texture2D(u_tex, v_uv + vec2( u_texel.x, 0.0)).a);
      float emptyT = 1.0 - step(0.5, texture2D(u_tex, v_uv + vec2(0.0, -u_texel.y)).a);
      float emptyB = 1.0 - step(0.5, texture2D(u_tex, v_uv + vec2(0.0,  u_texel.y)).a);

      float isEdge = cell * max(
        max(nearL * emptyL, nearR * emptyR),
        max(nearT * emptyT, nearB * emptyB)
      );

      /* ── Spotlight factor (0 away from cursor, 1 at centre) ────── */
      vec2  d    = (v_uv - u_cursor) * vec2(u_aspect, 1.0);
      float spot = 1.0 - smoothstep(0.0, u_spot, length(d));

      /* ── Colour: mix base → hi based on spotlight ───────────────── */
      vec3 activeFill = mix(u_fill, u_fill_hi, spot);
      vec3 activeEdge = mix(u_edge, u_edge_hi, spot);
      vec3 color      = mix(activeFill, activeEdge, isEdge);

      /* ── Opacity: mix base → 1.0 based on spotlight ─────────────── */
      float alpha = cell * mix(u_base, 1.0, spot);

      /* Premultiplied for Safari/WebKit canvas compositing */
      gl_FragColor = vec4(color * alpha, alpha);
    }
  `;

    function mkShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn("[DLA]", gl.getShaderInfoLog(s));
      return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTex = gl.getUniformLocation(prog, "u_tex");
    const uCursor = gl.getUniformLocation(prog, "u_cursor");
    const uAspect = gl.getUniformLocation(prog, "u_aspect");
    const uBase = gl.getUniformLocation(prog, "u_base");
    const uSpot = gl.getUniformLocation(prog, "u_spot");
    const uFill = gl.getUniformLocation(prog, "u_fill");
    const uFillHi = gl.getUniformLocation(prog, "u_fill_hi");
    const uEdge = gl.getUniformLocation(prog, "u_edge");
    const uEdgeHi = gl.getUniformLocation(prog, "u_edge_hi");
    const uTexel = gl.getUniformLocation(prog, "u_texel");
    const uScreen = gl.getUniformLocation(prog, "u_screen");
    const uBpx = gl.getUniformLocation(prog, "u_bpx");

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    function resize() {
      // Prefer large viewport so the drawing buffer matches 100lvh CSS
      const vv = window.visualViewport;
      const w = Math.max(1, Math.ceil(window.innerWidth));
      const h = Math.max(1, Math.ceil(Math.max(window.innerHeight, vv?.height ?? 0)));
      if (cv.width === w && cv.height === h) return;
      cv.width = w;
      cv.height = h;
      gl.viewport(0, 0, w, h);
    }
    window.addEventListener("resize", resize);
    window.visualViewport?.addEventListener("resize", resize);
    resize();

    /* ── Simulation ───────────────────────────────────────────────── */
    const cells = new Uint8Array(GW * GH);
    // RGBA — LUMINANCE is flaky / empty on some iOS Safari GPUs
    const texData = new Uint8Array(GW * GH * 4);
    const seedMaxR = new Float32Array(MAX_SEEDS);
    let seeds = [];
    let particles = [];
    let generating = true;
    let cursorUV = [-1, -1];

    function idx(x, y) {
      return y * GW + x;
    }

    function setCellLit(i) {
      const o = i * 4;
      texData[o] = 255;
      texData[o + 1] = 255;
      texData[o + 2] = 255;
      texData[o + 3] = 255;
    }

    function nbrCI(x, y) {
      let v;
      if (x > 0 && (v = cells[idx(x - 1, y)])) return v;
      if (x < GW - 1 && (v = cells[idx(x + 1, y)])) return v;
      if (y > 0 && (v = cells[idx(x, y - 1)])) return v;
      if (y < GH - 1 && (v = cells[idx(x, y + 1)])) return v;
      return 0;
    }

    function placeSeed(gx, gy) {
      if (seeds.length >= MAX_SEEDS || cells[idx(gx, gy)]) return;
      const ci = seeds.length + 1;
      seeds.push({ x: gx, y: gy, ci });
      seedMaxR[ci - 1] = 1;
      cells[idx(gx, gy)] = ci;
      setCellLit(idx(gx, gy));
    }

    function spawnParticle() {
      if (!seeds.length) return null;
      const si = (Math.random() * seeds.length) | 0;
      const s = seeds[si];
      const r = (seedMaxR[si] || 1) + 5;
      const a = Math.random() * Math.PI * 2;
      const kr = r + KR_EXTRA;
      return {
        x: Math.round(s.x + r * Math.cos(a)),
        y: Math.round(s.y + r * Math.sin(a)),
        ox: s.x,
        oy: s.y,
        kr2: kr * kr,
      };
    }

    function scatter() {
      const placed = [];
      const minD = Math.min(GW, GH) * 0.17;
      const mx = Math.round(GW * 0.07);
      const my = Math.round(GH * 0.1);
      let att = 0;
      while (placed.length < MAX_SEEDS && att < 3000) {
        att++;
        const x = mx + ((Math.random() * (GW - 2 * mx)) | 0);
        const y = my + ((Math.random() * (GH - 2 * my)) | 0);
        if (placed.every((p) => Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2) >= minD)) {
          placed.push({ x, y });
          placeSeed(x, y);
        }
      }
      particles = Array.from({ length: 300 }, () => spawnParticle());
    }

    function step(n) {
      for (let iter = 0; iter < n; iter++) {
        for (let i = 0; i < particles.length; i++) {
          let p = particles[i];
          if (!p) {
            particles[i] = spawnParticle();
            continue;
          }

          const d = (Math.random() * 4) | 0;
          if (d === 0) p.x++;
          else if (d === 1) p.x--;
          else if (d === 2) p.y++;
          else p.y--;

          const pdx = p.x - p.ox,
            pdy = p.y - p.oy;
          // Allow sticking on edge cells so the pattern reaches the viewport
          if (p.x < 0 || p.x >= GW || p.y < 0 || p.y >= GH || pdx * pdx + pdy * pdy > p.kr2) {
            particles[i] = spawnParticle();
            continue;
          }

          const ci = nbrCI(p.x, p.y);
          if (ci > 0) {
            cells[idx(p.x, p.y)] = ci;
            setCellLit(idx(p.x, p.y));
            const s = seeds[ci - 1];
            if (s) {
              const r = Math.sqrt((p.x - s.x) ** 2 + (p.y - s.y) ** 2);
              if (r > seedMaxR[ci - 1]) seedMaxR[ci - 1] = r;
            }
            particles[i] = spawnParticle();
          }
        }
      }
      const limit = Math.min(GW, GH) / 2 + 2;
      if (seeds.every((_, i) => seedMaxR[i] >= limit)) generating = false;
    }

    function uploadTex() {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GW, GH, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);
    }

    /* ── Cursor / touch spotlight ─────────────────────────────────── */
    function setCursor(clientX, clientY) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      cursorUV = [clientX / w, clientY / h];
    }
    window.addEventListener("mousemove", (e) => setCursor(e.clientX, e.clientY));
    window.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        if (t) setCursor(t.clientX, t.clientY);
      },
      { passive: true },
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (t) setCursor(t.clientX, t.clientY);
      },
      { passive: true },
    );

    /* ── Render loop ──────────────────────────────────────────────── */
    function frame() {
      if (generating) {
        step(4);
        uploadTex();
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1i(uTex, 0);
      gl.uniform2fv(uCursor, cursorUV);
      gl.uniform1f(uAspect, cv.width / cv.height);
      gl.uniform1f(uBase, BASE);
      gl.uniform1f(uSpot, SPOT);
      gl.uniform3f(uFill, FR, FG, FB);
      gl.uniform3f(uFillHi, HFR, HFG, HFB);
      gl.uniform3f(uEdge, ER, EG, EB);
      gl.uniform3f(uEdgeHi, HER, HEG, HEB);
      gl.uniform2f(uTexel, 1.0 / GW, 1.0 / GH);
      gl.uniform2f(uScreen, cv.width, cv.height);
      gl.uniform1f(uBpx, BPX);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }

    /* ── Boot ─────────────────────────────────────────────────────── */
    scatter();
    frame();
  })();
