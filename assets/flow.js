// Topographic contours for the homepage background: hairline isolines of a
// continuously evolving noise field, drawn in --fg over --bg. Time is the
// noise's third axis, so blobs swell, merge, split and fade in place; --flow-drift
// can still slide the whole landscape as before. Each visit starts from a
// random point in the field, so the landscape never repeats.
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
    'uniform vec2 r;uniform float t;uniform vec3 bg;uniform vec3 ink;uniform float amt;uniform float sh;uniform float sc;uniform float rd;uniform float mo;uniform float dr;uniform float sd;',
    // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT): x and y are the
    // page, z is time. Its skewed lattice means no two regions cross a cell
    // boundary together, so the field changes at an even pace with no
    // screen-wide pulse; the old value noise stalled everywhere at once.
    'vec4 pm(vec4 x){x=mod(x,289.);return mod((x*34.+1.)*x,289.);}',
    'float sn(vec3 v){const vec2 C=vec2(1./6.,1./3.);',
    ' vec3 i=floor(v+dot(v,C.yyy)),x0=v-i+dot(i,C.xxx);',
    ' vec3 g=step(x0.yzx,x0.xyz),l=1.-g,i1=min(g,l.zxy),i2=max(g,l.zxy);',
    ' vec3 x1=x0-i1+C.xxx,x2=x0-i2+C.yyy,x3=x0-.5;',
    ' i=mod(i,289.);',
    ' vec4 p=pm(pm(pm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));',
    ' vec4 j=p-49.*floor(p/49.),xf=floor(j/7.),yf=floor(j-7.*xf);',
    ' vec4 x=(xf*2.+.5)/7.-1.,y=(yf*2.+.5)/7.-1.,hh=1.-abs(x)-abs(y);',
    ' vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw),s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.,k=-step(hh,vec4(0.));',
    ' vec4 a0=b0.xzyw+s0.xzyw*k.xxyy,a1=b1.xzyw+s1.xzyw*k.zzww;',
    ' vec3 g0=normalize(vec3(a0.xy,hh.x)),g1=normalize(vec3(a0.zw,hh.y)),g2=normalize(vec3(a1.xy,hh.z)),g3=normalize(vec3(a1.zw,hh.w));',
    ' vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m*=m;',
    ' return 42.*dot(m*m,vec4(dot(g0,x0),dot(g1,x1),dot(g2,x2),dot(g3,x3)));}',
    // Stretched and scaled to match the feature size and contour density of
    // the value noise it replaced, centred on .5 as that was.
    'float n(vec3 p){return .5+.38*sn(p*.55);}',
    // Finer octaves evolve faster, as small features would.
    'float fbm(vec2 p,float z){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);',
    ' for(int i=0;i<4;i++){v+=a*n(vec3(p,z));p=m*p;z*=1.5;a*=mix(.5,.2,rd);}return v;}',
    // z advances at mo, so a blob reforms over ~30s at 1; dr slides the
    // landscape at the old drift speed when 1.
    'float field(vec2 p,float t){',
    ' float z=.03*mo*t+sd;',
    ' vec2 q=vec2(fbm(p+vec2(0.,.05*t*dr),z),fbm(p+vec2(5.2,1.3)-.04*t*dr,z+7.3));',
    ' return fbm(p+1.8*(1.-.85*rd)*q+vec2(.02*t*dr,0.),z+13.1)*22.*(1.+rd);}',
    'void main(){',
    ' vec2 p=gl_FragCoord.xy/r.y*1.1/sc;',
    // Motion blur: sample the field at the start and end of a shutter of sh
    // seconds. Over that window the pixel's value sweeps v1..v0, so the share
    // of the exposure an isoline spends on it is the overlap of that sweep with
    // the line's ~1px footprint a. Fast-moving lines smear wider and fainter
    // with the same total ink; still ones (and sh=0) stay crisp.
    ' float v0=field(p,t),v1=sh>0.?field(p,t-sh):v0;',
    ' float v=(v0+v1)*.5,a=fwidth(v)*1.1;',
    ' float m=max(min(abs(v0-v1),.5),a);',
    ' float d=abs(fract(v-.5)-.5);',
    ' float line=max(0.,min(d+m*.5,a*.5)-max(d-m*.5,-a*.5))/m;',
    // Every fourth isoline is a heavier index line.
    ' float major=step(mod(floor(v+.5),4.),.5);',
    // Line 33 (x.,x.,major) first x is three line grouping, second x is index line
    ' gl_FragColor=vec4(mix(bg,ink,line*amt*mix(1.,1.4,major)),1.);',
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
  ['r', 't', 'bg', 'ink', 'amt', 'sh', 'sc', 'rd', 'mo', 'dr', 'sd'].forEach(function (k) { u[k] = gl.getUniformLocation(prog, k); });

  function rgb(hex) {
    hex = hex.trim().replace('#', '');
    return [0, 2, 4].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; });
  }
  function readColors() {
    var cs = getComputedStyle(host);
    gl.uniform3fv(u.bg, rgb(cs.getPropertyValue('--bg')));
    gl.uniform3fv(u.ink, rgb(cs.getPropertyValue('--fg')));
    gl.uniform1f(u.amt, parseFloat(cs.getPropertyValue('--flow-amount')) || 0.07);
    // A still frame has no motion to blur.
    var shutter = parseFloat(cs.getPropertyValue('--blur-shutter'));
    gl.uniform1f(u.sh, reduce.matches ? 0 : (isNaN(shutter) ? 0.2 : shutter));
    // Contour feature size: 2 draws blobs twice as large with arcs twice as wide.
    var scale = parseFloat(cs.getPropertyValue('--flow-scale'));
    gl.uniform1f(u.sc, scale > 0 ? scale : 1);
    // Roundness: 0 keeps the swirling, crinkled field; 1 calms the domain warp
    // and fades the fine octaves so isolines close into smooth, rounded pools.
    var round = parseFloat(cs.getPropertyValue('--flow-round'));
    gl.uniform1f(u.rd, isNaN(round) ? 0 : Math.min(1, Math.max(0, round)));
    // Morph: how fast blobs form and dissolve in place. Drift: how fast the
    // landscape slides across the page (1 is the original drift).
    var morph = parseFloat(cs.getPropertyValue('--flow-morph'));
    gl.uniform1f(u.mo, isNaN(morph) ? 1 : Math.max(0, morph));
    var drift = parseFloat(cs.getPropertyValue('--flow-drift'));
    gl.uniform1f(u.dr, isNaN(drift) ? 0 : drift);
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

  gl.uniform1f(u.sd, Math.random() * 100);

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
