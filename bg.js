/* StarHermit — WebGL deep-space background.
   Single fullscreen shader pass: Hubble-palette nebula, parallax starfields,
   a spiral galaxy, and a black hole with accretion disk + gravitational
   lensing. The camera pans through the scene as the page scrolls. */
(function () {
  "use strict";

  var canvas = document.getElementById("bg");
  if (!canvas) return;

  // Low-intensity mode for phones/tablets: cheaper shader, smaller render
  // target, capped frame rate that drops further when idle. Desktop gets
  // the full shader.
  var LITE = window.matchMedia("(pointer: coarse)").matches
          || Math.min(window.screen.width, window.screen.height) < 768;

  var gl = canvas.getContext("webgl", {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: LITE ? "low-power" : "high-performance"
  }) || canvas.getContext("experimental-webgl");

  if (!gl) {
    document.body.classList.add("no-webgl");
    return;
  }

  var VERT = [
    "attribute vec2 aPos;",
    "void main() { gl_Position = vec4(aPos, 0.0, 1.0); }"
  ].join("\n");

  var FRAG_SRC = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uScroll;",
    "uniform vec2 uMouse;",
    "",
    "float hash21(vec2 p) {",
    "    p = fract(p * vec2(123.34, 456.21));",
    "    p += dot(p, p + 45.32);",
    "    return fract(p.x * p.y);",
    "}",
    "",
    "float vnoise(vec2 p) {",
    "    vec2 i = floor(p);",
    "    vec2 f = fract(p);",
    "    f = f * f * (3.0 - 2.0 * f);",
    "    float a = hash21(i);",
    "    float b = hash21(i + vec2(1.0, 0.0));",
    "    float c = hash21(i + vec2(0.0, 1.0));",
    "    float d = hash21(i + vec2(1.0, 1.0));",
    "    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
    "}",
    "",
    "float fbm(vec2 p) {",
    "    float v = 0.0;",
    "    float a = 0.5;",
    "    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);",
    "#ifdef LITE",
    "    for (int i = 0; i < 2; i++) {",
    "#else",
    "    for (int i = 0; i < 5; i++) {",
    "#endif",
    "        v += a * vnoise(p);",
    "        p = m * p;",
    "        a *= 0.5;",
    "    }",
    "    return v;",
    "}",
    "",
    "vec3 starLayer(vec2 uv, float scale, float density, float bright, float t) {",
    "    vec2 p = uv * scale;",
    "    vec2 id = floor(p);",
    "    vec2 f = fract(p);",
    "    vec3 col = vec3(0.0);",
    "    float h = hash21(id);",
    "    if (h > 1.0 - density) {",
    "        vec2 sp = vec2(hash21(id + 11.1), hash21(id + 27.7));",
    "        float d = length(f - sp);",
    "        float tw = 0.7 + 0.3 * sin(t * (0.5 + h * 2.5) + h * 40.0);",
    "        float s = 1.0 - smoothstep(0.0, 0.10, d);",
    "        vec3 tint = mix(vec3(0.65, 0.78, 1.0), vec3(1.0, 0.85, 0.65), hash21(id + 5.5));",
    "        col = s * tw * bright * tint;",
    "    }",
    "    return col;",
    "}",
    "",
    "vec3 spiralGalaxy(vec2 uv, vec2 c, float t) {",
    "    vec2 p = (uv - c) * 1.35;",
    "    float ca = cos(-0.5);",
    "    float sa = sin(-0.5);",
    "    p = mat2(ca, -sa, sa, ca) * p;",
    "    p.y /= 0.62;",
    "    float r = length(p) + 0.0001;",
    "    float ang = atan(p.y, p.x);",
    "    float spiral = cos(ang * 2.0 - r * 16.0 + t * 0.015);",
    "    spiral = smoothstep(-0.2, 1.0, spiral);",
    "#ifdef LITE",
    "    float clump = vnoise(vec2(ang * 1.5, r * 9.0));",
    "#else",
    "    float clump = fbm(vec2(ang * 1.5, r * 9.0));",
    "#endif",
    "    float arms = spiral * (0.35 + 0.65 * clump) * exp(-r * 4.2);",
    "    float core = exp(-r * 13.0);",
    "    vec3 col = vec3(0.0);",
    "    col += vec3(1.0, 0.85, 0.6) * core * 1.5;",
    "    col += mix(vec3(0.35, 0.5, 1.0), vec3(0.9, 0.45, 0.75), clump) * arms * 0.8;",
    "    col += vec3(0.8, 0.85, 1.0) * exp(-r * 2.6) * 0.045;",
    "    return col;",
    "}",
    "",
    "void main() {",
    "    vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;",
    "    float s = uScroll;",
    "    vec2 cam = vec2(s * 2.0, -s * 2.6)",
    "             + uMouse * 0.03",
    "             + vec2(uTime * 0.004, uTime * 0.0015);",
    "",
    "    // Black hole screen position (world pos minus parallaxed camera)",
    "    vec2 bh = vec2(1.326, -1.774) - 0.85 * cam;",
    "    vec2 toBH = bh - uv;",
    "    float dBH = length(toBH) + 0.0001;",
    "",
    "    // Gravitational lensing: bend background sample coords near the hole",
    "    float bend = 0.006 / (dBH * dBH + 0.0035);",
    "    bend = min(bend, 0.35) * (1.0 - smoothstep(0.12, 0.85, dBH));",
    "    vec2 wuv = uv - (toBH / dBH) * bend;",
    "",
    "    vec3 col = vec3(0.008, 0.010, 0.020);",
    "",
    "    // Nebula — Hubble palette (teal / amber / violet)",
    "    float n1 = fbm(wuv * 1.5 + cam * 0.35 + vec2(0.0, uTime * 0.006));",
    "    float n2 = fbm(wuv * 3.0 - cam * 0.25 + 13.7);",
    "    float n3 = fbm(wuv * 0.9 + cam * 0.20 + 47.1);",
    "    vec3 neb = vec3(0.0);",
    "    neb += vec3(0.05, 0.22, 0.30) * smoothstep(0.35, 0.90, n1);",
    "    neb += vec3(0.42, 0.16, 0.04) * smoothstep(0.55, 0.95, n2) * 0.80;",
    "    neb += vec3(0.20, 0.06, 0.30) * smoothstep(0.50, 0.95, n3) * 0.70;",
    "    col += neb * 0.55;",
    "",
    "    // Parallax starfields",
    "    col += starLayer(wuv + cam * 0.15, 60.0, 0.10, 0.35, uTime);",
    "    col += starLayer(wuv + cam * 0.45, 34.0, 0.07, 0.60, uTime);",
    "    col += starLayer(wuv + cam * 0.80, 18.0, 0.05, 1.00, uTime);",
    "#ifndef LITE",
    "    col += starLayer(wuv + cam * 0.60, 7.0, 0.35, 0.45, uTime);",
    "#endif",
    "",
    "    // One bright hero star with a cross flare",
    "    vec2 bs = vec2(-0.52, 0.26) - 0.35 * cam;",
    "    vec2 bd = wuv - bs;",
    "    float bglow = 0.0006 / (dot(bd, bd) + 0.0004);",
    "    float flare = (exp(-abs(bd.x) * 90.0) + exp(-abs(bd.y) * 90.0)) * exp(-length(bd) * 8.0);",
    "    col += vec3(0.9, 0.95, 1.0) * (bglow * 0.8 + flare * 0.45);",
    "",
    "    // Spiral galaxy, lens-warped like everything behind the hole",
    "    vec2 gx = vec2(0.66, -0.62) - 0.60 * cam;",
    "    col += spiralGalaxy(wuv, gx, uTime) * 0.9;",
    "",
    "    // Occasional shooting star (skipped in LITE mode)",
    "#ifndef LITE",
    "    float tseg = floor(uTime / 7.0);",
    "    float ft = fract(uTime / 7.0);",
    "    if (hash21(vec2(tseg, 9.3)) > 0.35) {",
    "        vec2 sp0 = vec2(hash21(vec2(tseg, 1.7)) * 2.0 - 0.5, hash21(vec2(tseg, 3.1)) - 0.2);",
    "        vec2 dir = normalize(vec2(hash21(vec2(tseg, 5.7)) - 0.5, -0.4));",
    "        vec2 head = sp0 + dir * ft * 1.5;",
    "        vec2 rel = uv - head;",
    "        float along = clamp(dot(rel, dir), 0.0, 0.25);",
    "        float off = length(rel - dir * along);",
    "        float streak = (1.0 - smoothstep(0.0, 0.004, off))",
    "                     * (1.0 - smoothstep(0.0, 0.25, along))",
    "                     * smoothstep(0.0, 0.05, ft)",
    "                     * (1.0 - smoothstep(0.15, 0.35, ft));",
    "        col += vec3(0.8, 0.9, 1.0) * streak * 1.5;",
    "    }",
    "#endif",
    "",
    "    // ---- Black hole ----",
    "    vec2 dp = uv - bh;",
    "    float rBH = length(dp);",
    "",
    "    // Event horizon: occlude the background",
    "    float horizon = 1.0 - smoothstep(0.088, 0.100, rBH);",
    "    col *= 1.0 - horizon;",
    "",
    "    // Photon ring",
    "    float ring = 0.0045 / (abs(rBH - 0.104) + 0.0008);",
    "    col += vec3(1.0, 0.92, 0.75) * min(ring, 2.5) * 0.55;",
    "",
    "    // Ambient glow pulled toward the hole",
    "    col += vec3(1.0, 0.6, 0.25) * 0.012 / (dBH + 0.02)",
    "         * (1.0 - smoothstep(0.10, 0.50, dBH)) * 0.35;",
    "",
    "    // Accretion disk (tilted ellipse, doppler-brightened on one side)",
    "    vec2 dq = vec2(dp.x, dp.y / 0.30);",
    "    float rr = length(dq);",
    "    float diskMask = smoothstep(0.105, 0.135, rr) * (1.0 - smoothstep(0.22, 0.46, rr));",
    "#ifdef LITE",
    "    float sw = vnoise(vec2(atan(dq.y, dq.x) * 2.0 - rr * 10.0 + uTime * 0.5, rr * 14.0 - uTime * 0.9));",
    "#else",
    "    float sw = fbm(vec2(atan(dq.y, dq.x) * 2.0 - rr * 10.0 + uTime * 0.5, rr * 14.0 - uTime * 0.9));",
    "#endif",
    "    vec3 diskCol = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.42, 0.10), smoothstep(0.12, 0.42, rr));",
    "    float dop = clamp(1.0 - dp.x * 2.2, 0.35, 2.4);",
    "    col += diskCol * diskMask * (0.3 + 0.7 * sw) * dop * 1.1;",
    "",
    "    // Vignette, grain, gentle gamma",
    "    vec2 q = gl_FragCoord.xy / uRes;",
    "    col *= 1.0 - 0.5 * pow(length(q - 0.5) * 1.25, 2.0);",
    "    col += (hash21(gl_FragCoord.xy + fract(uTime) * 61.7) - 0.5) * 0.028;",
    "    col = pow(max(col, vec3(0.0)), vec3(0.9));",
    "",
    "    gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var FRAG = (LITE ? "#define LITE 1\n" : "") + FRAG_SRC;

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error("StarHermit bg shader error:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    document.body.classList.add("no-webgl");
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("StarHermit bg link error:", gl.getProgramInfoLog(prog));
    document.body.classList.add("no-webgl");
    return;
  }
  gl.useProgram(prog);

  // Fullscreen triangle
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var locPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uScroll = gl.getUniformLocation(prog, "uScroll");
  var uMouse = gl.getUniformLocation(prog, "uMouse");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize() {
    var scale = Math.min(window.devicePixelRatio || 1, LITE ? 1.2 : 1.75) * (LITE ? 0.5 : 0.8);
    var w = Math.max(1, Math.round(window.innerWidth * scale));
    var h = Math.max(1, Math.round(window.innerHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }
  window.addEventListener("resize", resize);
  resize();

  function scrollTarget() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  }

  var scroll = scrollTarget();
  var mouse = [0, 0];
  var mouseTarget = [0, 0];
  // Treat page load as activity; used to drop the mobile frame rate when idle.
  var lastActive = performance.now();

  window.addEventListener("mousemove", function (e) {
    lastActive = performance.now();
    mouseTarget[0] = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget[1] = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  var start = performance.now();

  // Render one frame. Scheduling is owned by the callers below — frame()
  // must never schedule itself, or it would spawn a second, uncapped
  // requestAnimationFrame chain that ignores the mobile frame-rate cap and
  // the hidden-tab pause.
  function frame(now) {
    // Ease scroll and mouse for buttery parallax
    var t = scrollTarget();
    scroll += (t - scroll) * 0.06;
    mouse[0] += (mouseTarget[0] - mouse[0]) * 0.05;
    mouse[1] += (mouseTarget[1] - mouse[1]) * 0.05;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reduceMotion ? 12.0 : (now - start) / 1000);
    gl.uniform1f(uScroll, scroll);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (reduceMotion) {
    // Static frame; re-render only when the view changes
    var renderOnce = function () { requestAnimationFrame(frame); };
    window.addEventListener("scroll", renderOnce, { passive: true });
    window.addEventListener("resize", renderOnce);
    renderOnce();
  } else {
    var rafId = null;
    var lastFrame = 0;
    if (LITE) {
      var bump = function () { lastActive = performance.now(); };
      window.addEventListener("scroll", bump, { passive: true });
      window.addEventListener("touchmove", bump, { passive: true });
    }
    var loop = function (now) {
      rafId = requestAnimationFrame(loop);
      if (LITE) {
        // ~30fps while the user is interacting, ~15fps when idle. The scene
        // drifts slowly on its own, so the idle rate is barely visible but
        // roughly halves sustained GPU load (heat, battery, scroll jank).
        var budget = now - lastActive < 1200 ? 33 : 66;
        if (now - lastFrame < budget) return;
        lastFrame = now;
      }
      frame(now);
    };
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      } else if (rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    });
    rafId = requestAnimationFrame(loop);
  }
})();
