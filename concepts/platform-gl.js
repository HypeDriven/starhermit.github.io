'use strict';
(() => {
 const canvas = document.querySelector('.platform-canvas');
 if(!canvas) return;
 const gl = canvas.getContext('webgl', { alpha:true, antialias:false, premultipliedAlpha:false, preserveDrawingBuffer:true, powerPreference:'low-power' });
 if(!gl) { canvas.dataset.renderer = 'css-fallback'; return; }
 const vertex = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
 const fragment = `precision highp float;
 uniform vec2 resolution;uniform float time;uniform vec2 pointer;uniform vec3 tint;uniform float mode;
 float line(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
 void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 p=uv-.5;float aspect=resolution.x/resolution.y;p.x*=aspect;
 p+=pointer*.013;float r=length(p);float glow=exp(-r*r*8.)*.32;
 float orbit=0.;float activity=0.;
 for(int i=0;i<3;i++){float fi=float(i);float radius=.25+fi*.105;float d=abs(length(vec2(p.x,p.y*1.09))-radius);orbit+=exp(-d*d*resolution.y*.7)*.023;}
 if(mode>2.5&&mode<3.5){
 vec2 center=vec2(0.,.026);
 for(int i=0;i<4;i++){
 float fi=float(i);vec2 endp;
 if(i==0)endp=vec2(-.30,.35);else if(i==1)endp=vec2(.35,.23);else if(i==2)endp=vec2(-.33,-.23);else endp=vec2(.31,-.35);
 float d=line(p,center,endp);orbit+=smoothstep(.0022,.0004,d)*.19;
 float phase=fract(time*.16+fi*.25);vec2 spark=mix(center,endp,phase);float sd=length(p-spark);
 activity+=exp(-sd*sd*8000.)*.75+exp(-sd*sd*650.)*.07;
 }
 }else{
 float angle=atan(p.y,p.x);float wav=.008*sin(angle*3.+time*.14);float rr=.38+wav;
 float d=abs(length(vec2(p.x,p.y*.92))-rr);orbit+=smoothstep(.0018,.0005,d)*.035;
 float a=time*.075;vec2 spark=vec2(cos(a)*.4,sin(a)*.44);activity=exp(-dot(p-spark,p-spark)*700.)*.10;
 }
 float alpha=clamp(glow+orbit+activity,0.,.9);gl_FragColor=vec4(tint,alpha);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 let program;
 try{
  program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 }catch(error){canvas.dataset.renderer='css-fallback';console.warn('WebGL fallback:',error.message);return;}
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const attribute=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
 const uniforms=Object.fromEntries(['resolution','time','pointer','tint','mode'].map(key=>[key,gl.getUniformLocation(program,key)]));
 const presets={platform:[0,.46,.52,1],playground:[1,.38,.23,.64],workshop:[2,.61,.51,.79],network:[3,.24,.72,.49],collective:[4,.92,.65,.34]};
 const [mode,...tint]=presets[canvas.dataset.scene];gl.uniform1f(uniforms.mode,mode);gl.uniform3fv(uniforms.tint,tint);
 let frames=0,raf=0,last=0,visible=true,lost=false;let mouse=[0,0];const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const started=performance.now();
 function draw(now){if(lost)return;gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);gl.uniform1f(uniforms.time,reduce.matches?0:(now-started)/1000);gl.uniform2fv(uniforms.pointer,mouse);gl.drawArrays(gl.TRIANGLES,0,6);canvas.dataset.frames=String(++frames);}
 function resize(){const rect=canvas.getBoundingClientRect();let ratio=window.devicePixelRatio||1;ratio=Math.min(ratio,Math.sqrt(10000000/(rect.width*rect.height)));canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));gl.viewport(0,0,canvas.width,canvas.height);canvas.dataset.pixelRatio=String(ratio);draw(performance.now());}
 function tick(now){raf=0;if(!visible||document.hidden||reduce.matches||lost)return;if(now-last>31){draw(now);last=now;}raf=requestAnimationFrame(tick);}
 function resume(){if(raf)cancelAnimationFrame(raf);raf=0;if(!document.hidden&&visible&&!reduce.matches&&!lost)raf=requestAnimationFrame(tick);else if(!lost)draw(performance.now());}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();},{rootMargin:'80px'});observer.observe(canvas);
 new ResizeObserver(resize).observe(canvas);document.addEventListener('visibilitychange',resume);reduce.addEventListener('change',resume);
 canvas.parentElement.addEventListener('pointermove',event=>{if(reduce.matches)return;const r=canvas.getBoundingClientRect();mouse=[(event.clientX-r.left)/r.width-.5,.5-(event.clientY-r.top)/r.height];});
 canvas.parentElement.addEventListener('pointerleave',()=>{mouse=[0,0];});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);canvas.dataset.renderer='css-fallback';});
 canvas.addEventListener('webglcontextrestored',()=>location.reload());
 canvas.dataset.renderer='webgl';resize();resume();
})();
