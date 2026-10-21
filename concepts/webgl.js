/* Native WebGL art studies. No imports, network requests or dependencies. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas[data-scene]');
  if (!canvas) return;
  const scene = canvas.dataset.scene;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: !small, preserveDrawingBuffer: true, premultipliedAlpha: false, powerPreference: 'low-power' });
  const fallback = reason => { canvas.dataset.renderer = 'fallback'; document.body.classList.add('no-webgl'); console.warn('Scene fallback:', reason); };
  if (!gl) { fallback('WebGL unavailable'); return; }
  let stopped = false, visible = true, pointer = [0, 0], smooth = [0, 0];
  let active = 0, angle = 0, targetAngle = 0, morph = 0, targetMorph = 0;
  let program, buffers = {}, textures = [], count = 0, uniforms = {};
  const PI = Math.PI;
  const vsQuad = 'attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition;gl_Position=vec4(aPosition,0.,1.);}';
  const shaderPrelude = `precision highp float;
    varying vec2 vUv; uniform vec2 uResolution; uniform vec2 uPointer; uniform float uTime;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
  `;
  const horizon = shaderPrelude + `
    void main(){
      vec2 uv=vUv*vec2(uResolution.x/uResolution.y,1.);
      uv-=uPointer*.055; uv=rot(-.21)*uv;
      float d=length(uv), t=uTime*.028;
      vec3 col=vec3(.012,.014,.018);
      vec2 stars=uv*150.;vec2 cell=floor(stars);float star=pow(hash(cell),48.)*exp(-length(fract(stars)-.5)*12.);
      col+=star*vec3(.54,.58,.65)*(1.+.3*sin(t*15.+hash(cell)*10.));
      float r=length(vec2(uv.x,uv.y*3.8));float a=atan(uv.y*3.8,uv.x);
      float turbulence=noise(vec2(a*11.+t*8.,r*38.-t*30.));
      float band=exp(-pow((r-.96)*7.8,2.));
      float threads=.5+.5*sin(r*154.+noise(vec2(a*7.-t*9.,r*10.))*7.);
      float light=band*(.7+threads*.6+turbulence*.6);
      vec3 fire=mix(vec3(1.,.16,.025),vec3(1.,.77,.43),pow(turbulence,1.8));
      fire=mix(fire,vec3(1.,.97,.85),exp(-pow((r-.92)*36.,2.))*.7);
      float shadow=smoothstep(.48,.58,d);
      col+=fire*light*shadow;
      col+=vec3(.48,.075,.012)*exp(-pow((r-.96)*2.7,2.))*.36*shadow;
      float lens=exp(-pow((d-.558)*140.,2.));
      float arc=pow(max(0.,uv.y/d*.5+.5),1.8);
      col+=vec3(1.,.73,.44)*lens*(.18+arc*1.1);
      col+=vec3(1.,.34,.045)*exp(-pow((d-.57)*18.,2.))*.09;
      col*=mix(.02,1.,smoothstep(.50,.555,d));
      float flare=exp(-length((uv-vec2(-.86,.045))*vec2(22.,70.)));
      col+=vec3(1.,.71,.42)*flare*2.;
      col+=hash(gl_FragCoord.xy+fract(uTime)*14.)*.012;
      gl_FragColor=vec4(col,1.);
    }`;
  const pearl = shaderPrelude + `
    vec3 turn(vec3 p){p.xz=rot(.48+uPointer.x*.6+uTime*.045)*p.xz;p.yz=rot(-.4+uPointer.y*.25)*p.yz;p.xy=rot(-.65)*p.xy;return p;}
    float field(vec3 pos){vec3 p=turn(pos);float a=atan(p.y,p.x);float r=length(p.xy);
      vec2 q=vec2(r-(1.02+.18*cos(a*3.)),p.z-.24*sin(a*3.));
      float rib=.016*cos(a*64.+atan(q.y,q.x)*7.);
      return (length(q)-(.37+.095*cos(a-1.)) + rib)*.74;
    }
    vec3 normal(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(field(p+e.xyy)-field(p-e.xyy),field(p+e.yxy)-field(p-e.yxy),field(p+e.yyx)-field(p-e.yyx)));}
    vec3 environment(vec3 r){float studio=pow(max(0.,dot(r,normalize(vec3(-.5,1.,2.)))),12.);
      float strip=pow(max(0.,1.-abs(r.x*.7+r.y*.1-.1)),28.);
      return vec3(.36,.29,.29)+vec3(.65,.62,.50)*studio+vec3(.92,.88,.83)*strip;
    }
    void main(){vec2 uv=vUv*vec2(uResolution.x/uResolution.y,1.);vec3 ro=vec3(0,0,5.1),rd=normalize(vec3(uv*1.5,-3.6));
      float travel=0.;vec3 p;bool hit=false;
      for(int i=0;i<76;i++){p=ro+rd*travel;float d=field(p);if(d<.002){hit=true;break;}travel+=d;if(travel>9.)break;}
      if(!hit){gl_FragColor=vec4(0.);return;}
      vec3 n=normal(p),r=reflect(rd,n),l=normalize(vec3(-3,5,4));
      float diffuse=max(0.,dot(n,l));float fresnel=pow(1.-max(0.,dot(n,-rd)),3.);
      vec3 iridescent=.6+.4*cos(vec3(0.,2.1,4.2)+dot(n,normalize(vec3(1,1,1)))*5.+p.z*1.5);
      vec3 col=environment(r)*(.68+diffuse*.38);
      col=mix(col,col*iridescent*1.4,.42+.2*fresnel);
      col+=vec3(1.,.96,.87)*pow(max(0.,dot(reflect(-l,n),-rd)),48.)*.6;
      col=mix(col,vec3(.96,.87,.72),fresnel*.32);
      col*=.68+.32*smoothstep(-.5,.8,p.y);
      gl_FragColor=vec4(pow(col,vec3(.84)),1.);
    }`;
  const vsMesh = `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=mat3(uModel)*aNormal;vPosition=(uModel*vec4(aPosition,1.)).xyz;gl_Position=uMVP*vec4(aPosition,1.);}`;
  const fsMesh = `precision highp float;varying vec3 vNormal;varying vec3 vPosition;
    void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 eye=normalize(vec3(0,0,6)-vPosition),r=reflect(-eye,n);
      float stripe=pow(max(0.,1.-abs(r.x*.65+r.z*.35-.15)),22.);
      float strip2=pow(max(0.,1.-abs(r.y-.45)),38.);
      float f=pow(1.-max(0.,dot(n,eye)),3.);
      vec3 col=vec3(.032,.04,.055)+vec3(.84,.91,.94)*stripe+vec3(.99,.56,.37)*strip2*.6;
      col+=vec3(.12,.16,.19)*max(0.,dot(n,normalize(vec3(-3,4,5))));
      col+=vec3(.96,.87,.78)*f*.36;gl_FragColor=vec4(col,1.);
    }`;
  const vsCard = `attribute vec3 aPosition;attribute vec2 aUv;uniform mat4 uMVP;varying vec2 vTex;void main(){vTex=aUv;gl_Position=uMVP*vec4(aPosition,1.);}`;
  const fsCard = `precision mediump float;varying vec2 vTex;uniform sampler2D uTexture;uniform float uDim;uniform vec2 uCrop;
    void main(){vec2 uv=(vTex-.5)*uCrop+.5;vec3 color=texture2D(uTexture,uv).rgb;
      float border=step(.003,min(min(vTex.x,1.-vTex.x),min(vTex.y,1.-vTex.y)));
      gl_FragColor=vec4(mix(vec3(.22),color*uDim,border),1.);
    }`;
  const vsParticles = `attribute vec3 aSeed;uniform mat4 uMVP;uniform float uTime;uniform float uMorph;uniform float uDpr;varying float vShade;varying float vTint;
    void main(){float a=aSeed.x*6.2831853,y=aSeed.y*2.-1.,rad=sqrt(max(0.,1.-y*y));
      vec3 sphere=vec3(cos(a)*rad,y,sin(a)*rad)*1.75;
      float b=aSeed.y*6.2831853;vec3 torus=vec3((1.28+.52*cos(b))*cos(a),.52*sin(b),(1.28+.52*cos(b))*sin(a));
      vec3 p=mix(sphere,torus,uMorph);
      p+=normalize(p)*(.055*sin(a*9.+uTime*.5+y*12.)+.04*sin(a*18.-uTime*.4));
      gl_Position=uMVP*vec4(p,1.);gl_PointSize=(2.5+aSeed.z*.7)*uDpr;
      vShade=.3+.7*(p.z/2.+.5);vTint=aSeed.y;
    }`;
  const fsParticles = `precision mediump float;varying float vShade;varying float vTint;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
    vec3 color=mix(vec3(.27,.09,.69),vec3(1.,.27,.18),smoothstep(.45,.9,vTint));color=mix(vec3(.17,.075,.26),color,vShade);
    gl_FragColor=vec4(color,(1.-smoothstep(.3,.5,d))*.92);
  }`;
  function compile(type, source) {
    const s=gl.createShader(type); gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));return s;
  }
  function makeProgram(vs,fs){const p=gl.createProgram();const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  function buffer(name, data, size){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);buffers[name]={buffer:b,size};}
  function bind(){gl.useProgram(program);Object.entries(buffers).forEach(([name,b])=>{const loc=gl.getAttribLocation(program,name);if(loc<0)return;gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,b.size,gl.FLOAT,false,0,0);});}
  const location=name=>uniforms[name]||(uniforms[name]=gl.getUniformLocation(program,name));
  const f=(name,value)=>gl.uniform1f(location(name),value);
  const v2=(name,a,b)=>gl.uniform2f(location(name),a,b);
  const matrix=(name,m)=>gl.uniformMatrix4fv(location(name),false,new Float32Array(m));
  function identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  function multiply(a,b){const c=new Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c;}
  function translation(x,y,z){const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;}
  function scaling(x,y,z){return [x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1];}
  function rotateY(a){const c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1];}
  function rotateX(a){const c=Math.cos(a),s=Math.sin(a);return [1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1];}
  function rotateZ(a){const c=Math.cos(a),s=Math.sin(a);return [c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];}
  function perspective(aspect){const f=1/Math.tan(.68/2),n=.1,z=50;return [f/aspect,0,0,0,0,f,0,0,0,0,(z+n)/(n-z),-1,0,0,2*z*n/(n-z),0];}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function normalize(a){const len=Math.hypot(...a);return a.map(x=>x/len);}
  function curve(t){return [(.95+.28*Math.cos(t*3))*Math.cos(t*2),(.95+.28*Math.cos(t*3))*Math.sin(t*2),.5*Math.sin(t*3)];}
  function ribbonPoint(t,v){const c=curve(t),next=curve(t+.001),tangent=normalize(next.map((x,i)=>x-c[i]));const n=normalize(cross(tangent,[0,0,1])),b=cross(tangent,n);const a=t*1.5;const width=n.map((x,i)=>x*Math.cos(a)+b[i]*Math.sin(a));return {p:c.map((x,i)=>x+width[i]*v),n:normalize(cross(tangent,width))};}
  try {
    if(scene==='horizon'||scene==='pearl'){
      program=makeProgram(vsQuad,scene==='horizon'?horizon:pearl);buffer('aPosition',[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1],2);count=6;
    } else if(scene==='flux'){
      program=makeProgram(vsMesh,fsMesh);const positions=[],normals=[];const sections=440;
      for(let i=0;i<sections;i++)for(let j=0;j<5;j++){
        const t=i/sections*PI*2,tn=(i+1)/sections*PI*2,v=-.29+j/5*.58,vn=-.29+(j+1)/5*.58;
        for(const [a,b] of [[t,v],[tn,v],[t,vn],[t,vn],[tn,v],[tn,vn]]){const point=ribbonPoint(a,b);positions.push(...point.p);normals.push(...point.n);}
      }
      buffer('aPosition',positions,3);buffer('aNormal',normals,3);count=positions.length/3;gl.enable(gl.DEPTH_TEST);
    } else if(scene==='museum'){
      program=makeProgram(vsCard,fsCard);buffer('aPosition',[-.5,-.5,0,.5,-.5,0,-.5,.5,0,-.5,.5,0,.5,-.5,0,.5,.5,0],3);buffer('aUv',[0,0,1,0,0,1,0,1,1,0,1,1],2);count=6;gl.enable(gl.DEPTH_TEST);
      for(const item of window.SH_ARTWORK || []){
        const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([30,30,30,255]));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const entry={texture:tex,ratio:1.6,loaded:false};textures.push(entry);
        const img=new Image();img.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);entry.ratio=img.width/img.height;entry.loaded=true;canvas.dataset.textures=String(textures.filter(t=>t.loaded).length);requestRender();};img.src=item.data;
      }
    } else if(scene==='signal'){
      program=makeProgram(vsParticles,fsParticles);const seeds=[];const n=small?16000:32000;const golden=.61803398875;
      for(let i=0;i<n;i++)seeds.push((i*golden)%1,(i+.5)/n,Math.sin(i*17.33)*.5+.5);
      buffer('aSeed',seeds,3);count=n;gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    }
    if(!program)throw Error('Unknown scene');
    canvas.dataset.renderer='webgl';
  } catch(error){fallback(error.message);return;}
  function resize(){const rect=canvas.getBoundingClientRect();const pixelRatio=Math.min(devicePixelRatio||1,small?1.2:1.5);const quality=scene==='pearl'?(small?.7:.85):1;
    canvas.width=Math.max(1,Math.round(rect.width*pixelRatio*quality));canvas.height=Math.max(1,Math.round(rect.height*pixelRatio*quality));gl.viewport(0,0,canvas.width,canvas.height);requestRender();}
  let scheduled=false,last=0,frameCount=0;
  function requestRender(){if(!scheduled&&!stopped){scheduled=true;requestAnimationFrame(render);}}
  function render(now){scheduled=false;if(stopped||!visible||document.hidden)return;
    const interval=1000/(small?28:45);if(now-last<interval){requestRender();return;}last=now;
    const time=reduced?12:now/1000;
    smooth=smooth.map((x,i)=>x+(pointer[i]-x)*.065);
    angle+=(targetAngle-angle)*.095;morph+=(targetMorph-morph)*.055;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);bind();
    if(scene==='horizon'||scene==='pearl'){
      v2('uResolution',canvas.width,canvas.height);v2('uPointer',...smooth);f('uTime',time);gl.drawArrays(gl.TRIANGLES,0,count);
    } else {
      const proj=perspective(canvas.width/canvas.height),view=translation(0,0,scene==='museum'?-6.8:-5.7);
      if(scene==='flux'){
        let model=multiply(rotateY(time*.13+smooth[0]*.65),multiply(rotateX(.35+smooth[1]*.4),rotateZ(-.35+time*.075)));
        model=multiply(model,scaling(1.06,1.06,1.06));matrix('uModel',model);matrix('uMVP',multiply(proj,multiply(view,model)));gl.drawArrays(gl.TRIANGLES,0,count);
      } else if(scene==='signal'){
        const model=multiply(rotateY(time*.055+smooth[0]*.55),rotateX(-.25+smooth[1]*.35));matrix('uMVP',multiply(proj,multiply(view,model)));f('uMorph',morph);f('uTime',time);f('uDpr',Math.min(devicePixelRatio||1,1.5));gl.drawArrays(gl.POINTS,0,count);
      } else {
        gl.activeTexture(gl.TEXTURE0);gl.uniform1i(location('uTexture'),0);
        // Draw all faces with a depth buffer. Their source art is embedded for file:// previews.
        for(let i=0;i<textures.length;i++){
          let delta=i-angle;const n=textures.length;delta=((delta+n/2)%n+n)%n-n/2;
          const theta=delta*.62,x=Math.sin(theta)*4.3,z=Math.cos(theta)*2.2-1.2;
          const y=Math.sin(theta*2.+time*.35)*.07;
          let model=multiply(translation(x,y,z),multiply(rotateY(-theta*.6+smooth[0]*.03),multiply(rotateZ(Math.sin(theta)*.055),scaling(3.7,2.57,1))));
          matrix('uMVP',multiply(proj,multiply(view,model)));gl.bindTexture(gl.TEXTURE_2D,textures[i].texture);
          const cardRatio=3.7/2.57,ratio=textures[i].ratio;v2('uCrop',ratio>cardRatio?cardRatio/ratio:1,ratio<cardRatio?ratio/cardRatio:1);
          f('uDim',1.-Math.min(Math.abs(delta)*.13,.43));gl.drawArrays(gl.TRIANGLES,0,count);
        }
      }
    }
    frameCount++;canvas.dataset.frames=String(frameCount);
    if(!reduced||Math.abs(angle-targetAngle)>.005||Math.abs(morph-targetMorph)>.005||Math.abs(smooth[0]-pointer[0])>.001||Math.abs(smooth[1]-pointer[1])>.001)requestRender();
  }
  function select(index){const n=textures.length;if(!n)return;targetAngle=index;active=((Math.round(index)%n)+n)%n;canvas.dispatchEvent(new CustomEvent('selectionchange',{detail:{index:active}}));requestRender();}
  document.querySelectorAll('[data-gallery-next]').forEach(b=>b.addEventListener('click',()=>select(Math.round(targetAngle)+Number(b.dataset.galleryNext))));
  canvas.addEventListener('keydown',e=>{if(scene==='museum'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();select(Math.round(targetAngle)+(e.key==='ArrowRight'?1:-1));}});
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(scene==='museum'){drag={x:e.clientX,start:targetAngle};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');}});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointer=[(e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2];
    if(drag){targetAngle=drag.start+(drag.x-e.clientX)/210;requestRender();}else requestRender();});
  const endDrag=()=>{if(drag){select(Math.round(targetAngle));drag=null;canvas.classList.remove('dragging');}};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
  canvas.addEventListener('pointerleave',()=>{pointer=[0,0];requestRender();});
  document.querySelector('[data-morph]')?.addEventListener('click',e=>{targetMorph=targetMorph?0:1;e.currentTarget.setAttribute('aria-pressed',String(!!targetMorph));e.currentTarget.querySelector('span').textContent=targetMorph?'Restore the sphere':'Shift the shape';requestRender();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopped=true;fallback('Context lost');});
  canvas.addEventListener('webglcontextrestored',()=>location.reload());
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestRender();},{rootMargin:'100px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestRender();});
  resize();
})();
