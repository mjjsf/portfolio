// Topographic contours for the homepage background: soft-focus isolines of a
// slowly drifting noise field, tinted by a drifting four-stop colour gradient
// (--flow-c0..3) over --bg.
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
    'uniform vec2 r;uniform float t;uniform vec3 bg;uniform float amt;uniform float soft;uniform float wash;',
    'uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    ' for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}',
    'float field(vec2 p,float t){',
    ' vec2 q=vec2(fbm(p+vec2(0.,.05*t)),fbm(p+vec2(5.2,1.3)-.04*t));',
    ' return fbm(p+1.8*q+vec2(.02*t,0.))*22.;}',
    // Soft colour fields: two broad, slowly wandering noise blobs blend the
    // four stops, like out-of-focus light behind frosted glass.
    'vec3 hue(vec2 p,float t){',
    ' float a=smoothstep(.3,.7,n(p*.9+vec2(.013*t,-.009*t)));',
    ' float b=smoothstep(.25,.75,n(p*.6+vec2(7.1,3.4)-vec2(.008*t,.011*t)));',
    ' return mix(mix(c0,c1,a),mix(c2,c3,a),b);}',
    'void main(){',
    ' vec2 p=gl_FragCoord.xy/r.y*1.1;',
    ' float v=field(p,t);',
    ' float d=abs(fract(v-.5)-.5);',
    // Distance to the nearest isoline in device pixels, then a gaussian falloff
    // of radius soft: a defocused glow around a faint core instead of a hairline.
    ' float px=d/max(fwidth(v),1e-4);',
    ' float glow=exp(-px*px/(2.*soft*soft));',
    ' float core=exp(-px*px*.5);',
    ' float line=glow*.9+core*.1;',
    // Every fourth isoline is a heavier index line.
    ' float major=step(mod(floor(v+.5),4.),.5);',
    ' vec3 col=hue(p,t);',
    ' vec3 ground=mix(bg,hue(p*.7+3.,t),wash);',
    ' gl_FragColor=vec4(mix(ground,col,clamp(line*amt*mix(1.,1.6,major),0.,1.)),1.);',
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
  ['r', 't', 'bg', 'amt', 'soft', 'wash', 'c0', 'c1', 'c2', 'c3'].forEach(function (k) { u[k] = gl.getUniformLocation(prog, k); });

  function rgb(hex) {
    hex = hex.trim().replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; });
  }
  function readColors() {
    var cs = getComputedStyle(host);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.uniform3fv(u.bg, rgb(cs.getPropertyValue('--bg')));
    // --flow-lift mixes each stop toward white for paler, quieter lines.
    var lift = num(cs, '--flow-lift', 0);
    ['c0', 'c1', 'c2', 'c3'].forEach(function (k, i) {
      gl.uniform3fv(u[k], rgb(cs.getPropertyValue('--flow-c' + i)).map(function (c) {
        return c + (1 - c) * lift;
      }));
    });
    gl.uniform1f(u.amt, num(cs, '--flow-amount', 0.5));
    gl.uniform1f(u.soft, num(cs, '--flow-blur', 3) * dpr);
    gl.uniform1f(u.wash, num(cs, '--flow-wash', 0.12));
  }
  function num(cs, name, fallback) {
    var x = parseFloat(cs.getPropertyValue(name));
    return isNaN(x) ? fallback : x;
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
  addEventListener('resize', function () {
    if (resize()) { readColors(); draw(performance.now()); }
  });
  [reduce, dark].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', run);
  });
  run();
})();
