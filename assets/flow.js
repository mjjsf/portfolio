// Topographic contours for the homepage background: hairline isolines of a
// slowly drifting noise field, drawn in --flow-ink (else --fg) over --bg.
(function () {
  var host = document.querySelector('.ambient');
  if (!host) return;
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) return;
  // Size inline so a stale cached stylesheet can't leave it at intrinsic size.
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.prepend(canvas);
  host.classList.add('has-flow');

  var vert = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var frag = [
    '#extension GL_OES_standard_derivatives : enable',
    'precision highp float;',
    'uniform vec2 r;uniform float t;uniform vec3 bg;uniform vec3 ink;uniform float amt;uniform float sh;',
    'uniform float th;uniform float gap;uniform float nm;uniform vec3 sw[8];uniform float sn[8];',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    // Value noise with its analytic gradient: vec3(value, d/dx, d/dy).
    'vec3 nd(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f),du=6.*f*(1.-f);',
    ' float a=h(i),b=h(i+vec2(1,0)),c=h(i+vec2(0,1)),d=h(i+vec2(1,1));',
    ' return vec3(a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y,',
    '  du*vec2(b-a+(a-b-c+d)*u.y,c-a+(a-b-c+d)*u.x));}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    ' for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}',
    'float field(vec2 p,float t){',
    ' vec2 q=vec2(fbm(p+vec2(0.,.05*t)),fbm(p+vec2(5.2,1.3)-.04*t));',
    ' return fbm(p+1.8*q+vec2(.02*t,0.))*22.;}',
    // Motion blur: over a shutter of sh seconds the pixel's value sweeps
    // v1..v0, so the share of the exposure an isoline spends on it is the
    // overlap of that sweep with the line's ~1px footprint a. Fast-moving lines
    // smear wider and fainter with the same total ink; still ones stay crisp.
    'float cov(float v0,float v1,float a){',
    ' float m=max(min(abs(v0-v1),.5),a);',
    ' float d=abs(fract((v0+v1)*.5-.5)-.5);',
    ' return max(0.,min(d+m*.5,a*.5)-max(d-m*.5,-a*.5))/m;}',
    'void main(){',
    // Glass: slowly drifting domes of glass H, up to th px thick, hang a gap of
    // gap px above the contour plane. A thin wedge of slope grad(H) bends a ray
    // by (n - 1) * grad(H) (Snell's law, paraxial), so each pixel sees the
    // plane displaced by gap * (n - 1) * grad(H). H is a smoothstep of value
    // noise, so grad(H) per device px comes analytically. We trace the ray
    // exactly at the mean index of refraction.
    ' float k=1.98/r.y;',
    ' vec3 N=nd(gl_FragCoord.xy*k+vec2(.03*t,-.02*t));',
    ' float s=clamp((N.x-.55)/.25,0.,1.);',
    ' vec2 gH=th*6.*s*(1.-s)/.25*N.yz*k;',
    ' vec2 p=(gl_FragCoord.xy+gap*(nm-1.)*gH)/r.y*1.1;',
    ' float v0=field(p,t),v1=sh>0.?field(p,t-sh):v0;',
    ' float v=(v0+v1)*.5,a=fwidth(v)*1.1;',
    // Dispersion: the index varies with wavelength, so each wavelength lands
    // gap * (n_l - n_mean) * grad(H) px further along. Over that pixel-scale
    // offset the field is linear, shifting its value by grad(v) . offset.
    // Eight wavelengths from 400 to 700 nm are weighed into RGB by the CIE
    // 1931 observer (sw, normalised so an even spectrum stays white). Away
    // from the glass every offset is zero and the line keeps its ink.
    ' vec2 gv=vec2(dFdx(v),dFdy(v));',
    ' vec3 line=vec3(0.);',
    ' for(int i=0;i<8;i++){',
    '  float dv=dot(gv,gap*sn[i]*gH);',
    '  line+=sw[i]*cov(v0+dv,v1+dv,a);',
    ' }',
    // Every fourth isoline is a heavier index line.
    ' float major=step(mod(floor(v+.5),4.),.5);',
    // Line 33 (x.,x.,major) first x is three line grouping, second x is index line
    ' gl_FragColor=vec4(mix(bg,ink,clamp(line*amt*mix(1.,1.4,major),0.,1.)),1.);',
    '}'
  ].join('\n');

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    host.classList.remove('has-flow');
    return;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var u = {};
  ['r', 't', 'bg', 'ink', 'amt', 'sh', 'th', 'gap', 'nm', 'sw', 'sn'].forEach(function (k) { u[k] = gl.getUniformLocation(prog, k); });

  // Dense flint glass (SF11): Cauchy's n = A + B / l^2, l in micrometres,
  // gives n = 1.785 at 400 nm down to 1.728 at 700 nm.
  function ior(l) { return 1.7 + 0.0136 / (l * l); }
  // CIE 1931 2-degree colour matching functions, multi-lobe Gaussian fit
  // (Wyman, Sloan & Shirley 2013), nm in, XYZ out.
  function cmf(nm) {
    function g(x, mu, s1, s2) { var t = (x - mu) * (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); }
    return [
      0.362 * g(nm, 442.0, 0.0624, 0.0374) + 1.056 * g(nm, 599.8, 0.0264, 0.0323) - 0.065 * g(nm, 501.1, 0.0490, 0.0382),
      0.821 * g(nm, 568.8, 0.0213, 0.0247) + 0.286 * g(nm, 530.9, 0.0613, 0.0322),
      1.217 * g(nm, 437.0, 0.0845, 0.0278) + 0.681 * g(nm, 459.0, 0.0385, 0.0725)
    ];
  }
  // Per wavelength: its weight in linear sRGB (XYZ -> sRGB, then normalised
  // per channel so the eight sum to white) and its index less the mean's.
  (function () {
    var sw = [], sn = [], sum = [0, 0, 0], N = 8, nMean = ior(0.55);
    for (var i = 0; i < N; i++) {
      var l = 0.4 + 0.3 * (i + 0.5) / N, c = cmf(l * 1000);
      var w = [
        3.2406 * c[0] - 1.5372 * c[1] - 0.4986 * c[2],
        -0.9689 * c[0] + 1.8758 * c[1] + 0.0415 * c[2],
        0.0557 * c[0] - 0.2040 * c[1] + 1.0570 * c[2]
      ];
      sw.push(w);
      sn.push(ior(l) - nMean);
      for (var k = 0; k < 3; k++) sum[k] += w[k];
    }
    gl.uniform3fv(u.sw, [].concat.apply([], sw.map(function (w) {
      return w.map(function (x, k) { return x / sum[k]; });
    })));
    gl.uniform1fv(u.sn, sn);
    gl.uniform1f(u.nm, nMean);
  })();

  function rgb(hex) {
    hex = hex.trim().replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; });
  }
  function readColors() {
    var cs = getComputedStyle(host);
    gl.uniform3fv(u.bg, rgb(cs.getPropertyValue('--bg')));
    gl.uniform3fv(u.ink, rgb(cs.getPropertyValue('--flow-ink') || cs.getPropertyValue('--fg')));
    gl.uniform1f(u.amt, parseFloat(cs.getPropertyValue('--flow-amount')) || 0.07);
    // A still frame has no motion to blur.
    var shutter = parseFloat(cs.getPropertyValue('--blur-shutter'));
    gl.uniform1f(u.sh, reduce.matches ? 0 : (isNaN(shutter) ? 0.2 : shutter));
    // Glass thickness and its height above the contours, in device px.
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var glass = parseFloat(cs.getPropertyValue('--flow-glass'));
    gl.uniform1f(u.th, (isNaN(glass) ? 0 : glass) * dpr);
    gl.uniform1f(u.gap, 400 * dpr);
  }

  // Full device resolution (capped) so the hairlines stay crisp. Returns true
  // when the backing store changed, which clears it (to black, as alpha is off).
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(innerWidth * dpr));
    var h = Math.max(1, Math.round(innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.r, w, h);
      return true;
    }
    return false;
  }

  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var dark = matchMedia('(prefers-color-scheme: dark)');
  var start = performance.now() - 20000; // skip the calm opening seconds
  var last = 0;
  var raf = 0;

  function draw(now) {
    gl.uniform1f(u.t, (now - start) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return; // ~30fps is plenty for slow drift
    last = now;
    draw(now);
  }
  function run() {
    cancelAnimationFrame(raf);
    resize();
    readColors();
    if (reduce.matches) draw(performance.now());
    else raf = requestAnimationFrame(loop);
  }

  // Redraw in the same frame as the resize; waiting for the throttled loop
  // lets the cleared buffer show as a black flash while dragging the window.
  addEventListener('resize', function () { if (resize()) draw(performance.now()); });
  [reduce, dark].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', run);
  });
  run();
})();
