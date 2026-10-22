// Browser renderer for scripts/build_brand_assets.mjs. Sources remain private.
import {drawHalftone,DEFAULT_RECIPE} from '/assets/personal-style/halftone.js';
import {areaResize} from '/assets/personal-style/image-rendering.js';
let selection, platforms, BANNER_SPEC, fixed;
export function getBannerLayout(id) {
 const format=platforms.find(p=>p.id===id);if(!format)throw Error('Unknown banner format');
 const frame=format.frame,scale=frame.width/BANNER_SPEC.referenceWidth;
 const inset=Math.round(BANNER_SPEC.inset*scale),arm=Math.round(BANNER_SPEC.arm*scale),stroke=Math.round(BANNER_SPEC.stroke*scale);
 return {...format,frame,inset,arm,stroke,topLeft:{x:frame.x+inset,y:frame.y+inset},bottomRight:{x:frame.x+frame.width-inset,y:frame.y+frame.height-inset}};
}
function drawFixedCorners(ctx,layout){
 const {topLeft:a,bottomRight:b,arm,stroke}=layout;
 corner(ctx,a.x,a.y,arm,1,1,BANNER_SPEC.color,stroke);
 corner(ctx,b.x,b.y,arm,-1,-1,BANNER_SPEC.color,stroke);
}
const canvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
const proposals=[{id:'after-hours',motif:'corners'}];
const accentColor=()=>BANNER_SPEC.color;
const treatmentCache=new Map(),assetCache=new Map();
let mountains,chosen,shaderCanvas;
const rect=(ctx,x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
function cover(ctx,image,x,y,w,h,position=.5){const scale=Math.max(w/image.width,h/image.height),sw=w/scale,sh=h/scale;ctx.drawImage(image,(image.width-sw)/2,(image.height-sh)*position,sw,sh,x,y,w,h)}
function corner(ctx,x,y,size,dx,dy,color,width=8){rect(ctx,dx<0?x-size:x,dy<0?y-width:y,size,width,color);rect(ctx,dx<0?x-width:x,dy<0?y-size:y,width,size,color)}
const noise=(x,y,seed=0)=>{const n=Math.sin(x*127.1+y*311.7+seed*67.13)*43758.5453;return n-Math.floor(n)};
const falloff=(distance,scale)=>Math.exp(-Math.pow(distance/scale,2));
function field(kind,x,y,U,V,inset=48){
 const right=U-inset-x,top=y-inset,bottom=V-inset-y;
 if(right<0||top<0||bottom<0)return 0;
 return falloff(right,130)*falloff(top,90)*(kind==='corners'?.24:.68);
}

function drawAccent(ctx,kind,U,V,color,weight=80,grid=6,inset=48){
 // Equal logical insets at top/right. The tint follows the original shader pixels.
 const density=weight/100,transform=ctx.getTransform(),ox=Math.round(transform.e),oy=Math.round(transform.f);
 const image=ctx.getImageData(ox,oy,U,V),data=image.data;
 const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 const startX=U*.56,originX=ctx.canvas.width/2+grid/2-ox,originY=ctx.canvas.height/2+grid/2-oy;
 for(let gy=Math.ceil((inset-originY)/grid);originY+gy*grid<V-inset;gy++){
  const cy=originY+gy*grid;
  for(let gx=Math.ceil((startX-originX)/grid);originX+gx*grid<U-inset;gx++){
   const cx=originX+gx*grid,amount=field(kind,cx,cy,U,V,inset)*density;
   if(noise(gx,gy,2)>amount)continue;
   const alpha=.66+.28*noise(gx,gy,8);
   // Tint the ink already present within this cell; paper and dot geometry stay intact.
   for(let y=Math.max(inset,Math.ceil(cy-grid/2));y<Math.min(V-inset,Math.ceil(cy+grid/2));y++)for(let x=Math.max(inset,Math.ceil(cx-grid/2));x<Math.min(U-inset,Math.ceil(cx+grid/2));x++){
    const i=(y*U+x)*4,luma=(data[i]+data[i+1]+data[i+2])/3;
    const mix=Math.max(0,1-luma/238)*alpha;
    for(let channel=0;channel<3;channel++)data[i+channel]=data[i+channel]*(1-mix)+rgb[channel]*mix;
   }
  }
 }
 ctx.putImageData(image,ox,oy);

}

function landscape(w,h,s,light=false){
 w=Math.round(w);h=Math.round(h);const key=JSON.stringify([w,h,s.cell,s.horizon,s.treatment,s.smooth,light]);
 if(treatmentCache.has(key))return treatmentCache.get(key);
 const source=canvas(w,h),ctx=source.getContext('2d');cover(ctx,mountains,0,0,w,h,s.horizon/100);
 let out=canvas(w,h),o=out.getContext('2d');
 if(s.treatment==='halftone'){
  const scale=s.smooth?2:1;
  const large=canvas(w*scale,h*scale);large.getContext('2d').drawImage(source,0,0,large.width,large.height);
  shaderCanvas??=canvas(large.width,large.height);shaderCanvas.width=large.width;shaderCanvas.height=large.height;
  drawHalftone(shaderCanvas,large,{...DEFAULT_RECIPE,cell:s.cell,grain:0,ink:'#090909',paper:'#eeeeee'},scale);
  // Copy from WebGL before exact-area filtering. Reuse one GPU context.
  const raster=canvas(large.width,large.height);raster.getContext('2d').drawImage(shaderCanvas,0,0);
  out=scale===2?areaResize(raster,w,h):raster;
 }else{o.filter=s.treatment==='mono'?'grayscale(1)':'none';o.drawImage(source,0,0);o.filter='none'}
 if(treatmentCache.size>12)treatmentCache.clear();treatmentCache.set(key,out);return out;
}

export function renderBanner(platformId,variant="current"){
 const id='after-hours';
 if(platformId==='x'&&variant==='current'){const c=canvas(chosen.naturalWidth,chosen.naturalHeight);c.getContext('2d').drawImage(chosen,0,0);return c;}
 const p=proposals.find(p=>p.id===id),s=fixed;
 const f=platforms.find(f=>f.id===platformId);if(!f)throw Error('Unknown banner format');
 const key=JSON.stringify(['banner',variant,id,platformId,s.cell,s.horizon,s.treatment,s.smooth,s.accent,s.photoTone,s.photoShare,s.accentScale]);if(assetCache.has(key))return assetCache.get(key);
 const {width:W,height:H}=f,c=canvas(W,H),ctx=c.getContext('2d'),light=false;
 const layout=getBannerLayout(platformId),{width:U,height:V,x:ox,y:oy}=layout.frame;
 rect(ctx,0,0,W,H,'#000000');
 let photo=landscape(W,H,{...s,treatment:s.photoTone==='original'?'original':'mono'},light);
 if(variant==='colour-fade'){
  photo=canvas(W,H);const pc=photo.getContext('2d');
  pc.drawImage(landscape(W,H,{...s,treatment:'original'},light),0,0);
  const monochrome=canvas(W,H),mc=monochrome.getContext('2d');
  mc.drawImage(landscape(W,H,{...s,treatment:'mono'},light),0,0);
  mc.globalCompositeOperation='destination-in';
  const fade=mc.createLinearGradient(ox+U*selection.selectedBanner.variants.find(v=>v.id===variant).colourEnd,0,ox+U*selection.selectedBanner.variants.find(v=>v.id===variant).monochromeStart,0);
  fade.addColorStop(0,'#00000000');fade.addColorStop(1,'#000000');
  mc.fillStyle=fade;mc.fillRect(0,0,W,H);pc.drawImage(monochrome,0,0);
 }
 if(s.treatment==='blend'){
  ctx.drawImage(photo,0,0);
  const digital=canvas(W,H),d=digital.getContext('2d');d.drawImage(landscape(W,H,{...s,treatment:'halftone'},light),0,0);
  if(variant==='colour-fade'){
   // Carry the fading photograph's chroma through the shader while preserving its luminance and dot grid.
   d.globalCompositeOperation='color';d.drawImage(photo,0,0);d.globalCompositeOperation='source-over';
  }
  d.globalCompositeOperation='destination-in';
  const share=s.photoShare/100,g=d.createLinearGradient(ox+U*(share-.12),0,ox+U*(share+.12),0);
  g.addColorStop(0,'#00000000');g.addColorStop(1,'#000000');d.fillStyle=g;d.fillRect(0,0,W,H);ctx.drawImage(digital,0,0);
 }else ctx.drawImage(landscape(W,H,s,light),0,0);
 ctx.save();ctx.translate(ox,oy);drawAccent(ctx,p.motif,U,V,accentColor(s,false),s.accentScale,s.cell,layout.inset);ctx.restore();drawFixedCorners(ctx,layout);
 if(assetCache.size>24)assetCache.clear();assetCache.set(key,c);return c;
}


function orangeColor(brightness=100){return '#'+[255,133,97].map(value=>Math.round(value*brightness/100).toString(16).padStart(2,'0')).join('')}
function background(ctx,p,s){
 const intensity=s.contrast/100,base=Math.round(p.paper*intensity);
 rect(ctx,0,0,1024,1024,`rgb(${base},${base},${base})`);
 for(let row=0;row*p.pitch<1024;row++)for(let column=0;column*p.pitch<1024;column++){
  const x=p.pitch/2+column*p.pitch,y=p.pitch/2+row*p.pitch;
  const rise=Math.max(0,Math.min(1,(y-p.start)/(1024-p.start)));
  const strength=rise**p.power,sideWeight=p.sides?.4+.6*Math.abs(x-512)/512:1;
  if(noise(column,row,4)>strength*p.density*sideWeight)continue;
  const size=p.size+p.range*rise,tone=Math.round(base+p.shade*(.45+.55*rise)*intensity);
  const insideCircle=Math.hypot(x-512,y-512)<470;
  const orange=s.orange&&insideCircle&&noise(column,row,29)<p.orangeRate;
  ctx.fillStyle=orange?orangeColor(s.orangeBrightness):`rgb(${tone},${tone},${tone})`;
  ctx.globalAlpha=orange?.82:1;ctx.fillRect(x-size/2,y-size/2,size,size);
 }ctx.globalAlpha=1;
}

export async function initialize(config) {
 selection=config;platforms=config.selectedBanner.formats;BANNER_SPEC=config.selectedBanner.reference;
 fixed=config.selectedBanner.rendering;
 [mountains,chosen]=await Promise.all(['mountains.jpg','website-banner.png'].map(loadSource));
}
async function loadSource(name) {
 const image=new Image();image.src='/__sources/'+name;await image.decode();return image;
}
export async function renderPortrait() {
 const p=selection.selectedProfile.background,s=selection.selectedProfile.settings;
 const portrait=await loadSource('headshot.png');
 const image=canvas(1024,1024),ctx=image.getContext('2d');background(ctx,p,s);
 const scale=s.framing/100,w=1024*scale,h=848*scale,x=(1024-w)/2,y=176-(h-848)*.8-s.raise;
 const crop=selection.portrait.sourceCrop;
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.filter=s.tone==='mono'?'grayscale(1)':'none';
 ctx.drawImage(portrait,crop.x,crop.y,crop.width,crop.height,x,y,w,crop.height*w/crop.width);
 return image;
}
export async function renderLogo() {
 const image=new Image();image.src='/assets/personal-style/mark.svg';await image.decode();
 const output=canvas(1024,1024);output.getContext('2d').drawImage(image,0,0,1024,1024);return output;
}
