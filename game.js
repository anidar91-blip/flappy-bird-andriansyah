const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
let W=440,H=820,dpr=1,state="menu",paused=false,raf=0,last=0,time=0;
let score=0,best=Number(localStorage.getItem("flappyBest")||0);
let player={x:0,y:0,vy:0,r:18,rot:0,wing:0};
let pipes=[],particles=[],clouds=[],stars=[];
let name="Pemain",audio=null,muted=false;

const CFG={gravity:1450,flap:-470,pipeSpeed:175,gap:170,ground:88,spawn:1.38};

function resize(){
  const box=document.getElementById("app"); W=box.clientWidth; H=box.clientHeight;
  dpr=Math.min(devicePixelRatio||1,2); canvas.width=W*dpr;canvas.height=H*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize);resize();

function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function saveBest(){localStorage.setItem("flappyBest",best)}
function leaderboard(){return JSON.parse(localStorage.getItem("flappyBoard")||"[]")}
function saveScore(){
  let b=leaderboard();b.push({name,score,date:Date.now()});b.sort((a,b)=>b.score-a.score);
  localStorage.setItem("flappyBoard",JSON.stringify(b.slice(0,10)));
}
function show(id){$(id).classList.remove("hidden")} function hide(id){$(id).classList.add("hidden")}
function toast(t){$("toast").textContent=t;show("toast");setTimeout(()=>hide("toast"),1500)}

function sound(type){
  if(muted)return;
  try{
    audio=audio||new (window.AudioContext||window.webkitAudioContext)();
    const o=audio.createOscillator(),g=audio.createGain();
    o.connect(g);g.connect(audio.destination);
    let f=type==="flap"?520:type==="score"?820:180;
    o.frequency.value=f;o.type=type==="hit"?"sawtooth":"sine";
    g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.07,audio.currentTime+.01);
    g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.11);o.start();o.stop(audio.currentTime+.12);
  }catch(e){}
}

function reset(){
  score=0; pipes=[];particles=[];time=0;
  player={x:W*.28,y:H*.44,vy:0,r:18,rot:0,wing:0};
  CFG.pipeSpeed=175;CFG.gap=170;
  for(let i=0;i<4;i++)clouds.push({x:rand(0,W),y:rand(70,H*.45),s:rand(.55,1.1),v:rand(5,12)});
}
function start(){
  name=($("playerName").value.trim()||"Pemain").slice(0,18);
  hide("home");hide("gameOver");hide("pause");show("hud");
  reset();state="playing";paused=false;sound("flap");
}
function end(){
  state="gameover";sound("hit");
  if(score>best){best=score;saveBest();toast("🏆 REKOR BARU!")}
  saveScore();$("score").textContent=score;$("finalScore").textContent=score;$("bestScore").textContent=best;
  $("resultName").textContent="🐤 "+name;
  $("medal").textContent=score>=50?"👑 LEGENDA":score>=30?"🏆 MASTER":score>=15?"🥇 HEBAT":score>=5?"🥉 LUMAYAN":"💪 COBA LAGI";
  hide("hud");show("gameOver");
}
function flap(){
  if(state==="menu")return;
  if(state==="gameover"){start();return}
  if(paused)return;
  player.vy=CFG.flap;player.wing=1;sound("flap");
}
function togglePause(){
  if(state!=="playing")return;
  paused=!paused; $("pauseBtn").textContent=paused?"▶":"Ⅱ";
  paused?show("pause"):hide("pause");
}
function makePipe(){
  const gap=CFG.gap, min=105,max=H-CFG.ground-gap-105;
  pipes.push({x:W+35,w:64,top:rand(min,max),gap,passed:false});
}
function burst(x,y,n=10){
  for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-90,90),vy:rand(-130,40),life:rand(.3,.7),r:rand(2,5)});
}
function circleRect(cx,cy,r,rx,ry,rw,rh){
  const x=clamp(cx,rx,rx+rw),y=clamp(cy,ry,ry+rh);
  return (cx-x)**2+(cy-y)**2<r*r;
}
function update(dt){
  if(state!=="playing"||paused)return;
  time+=dt;
  player.vy+=CFG.gravity*dt;player.y+=player.vy*dt;
  player.rot=clamp(player.vy/700,-.45,1.0);player.wing=Math.max(0,player.wing-dt*5);
  if(!pipes.length||pipes[pipes.length-1].x<W-CFG.spawn*CFG.pipeSpeed)makePipe();
  for(const p of pipes){
    p.x-=CFG.pipeSpeed*dt;
    if(!p.passed&&p.x+p.w<player.x){p.passed=true;score++;$("score").textContent=score;sound("score");burst(player.x,player.y,5);
      if(score%5===0){CFG.pipeSpeed+=9;if(CFG.gap>125)CFG.gap-=4}
    }
    if(circleRect(player.x,player.y,player.r,p.x,0,p.w,p.top)||circleRect(player.x,player.y,player.r,p.x,p.top+p.gap,p.w,H-CFG.ground-(p.top+p.gap)))return end();
  }
  pipes=pipes.filter(p=>p.x+p.w>-20);
  if(player.y-player.r<0||player.y+player.r>H-CFG.ground)return end();
  for(const c of clouds){c.x-=c.v*dt;if(c.x<-80)c.x=W+60}
  for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=300*dt;q.life-=dt}
  particles=particles.filter(q=>q.life>0);
}
function cloud(x,y,s){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle="#ffffffc9";
  for(const a of [[0,10,18],[22,0,25],[48,11,19]]){ctx.beginPath();ctx.arc(a[0],a[1],a[2],0,Math.PI*2);ctx.fill()}
  ctx.fillRect(0,10,48,20);ctx.restore();
}
function background(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#16b9f1");g.addColorStop(.7,"#9beeff");g.addColorStop(1,"#d5f8ff");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff19b";ctx.beginPath();ctx.arc(W-62,82,34,0,7);ctx.fill();
  for(const c of clouds)cloud(c.x,c.y,c.s);
  const base=H-CFG.ground-42;ctx.fillStyle="#6bafc488";
  for(let x=0;x<W;x+=37){let h=45+((x*29)%90);ctx.fillRect(x,base-h,29,h)}
  ctx.fillStyle="#58d5e4";ctx.fillRect(0,H-CFG.ground-42,W,42);
}
function pipe(p){
  const grad=ctx.createLinearGradient(p.x,0,p.x+p.w,0);grad.addColorStop(0,"#087d2c");grad.addColorStop(.3,"#4de64d");grad.addColorStop(.65,"#20bb39");grad.addColorStop(1,"#075c20");
  ctx.fillStyle=grad;ctx.strokeStyle="#07551d";ctx.lineWidth=3;
  ctx.fillRect(p.x,0,p.w,p.top);ctx.strokeRect(p.x,0,p.w,p.top);
  ctx.fillRect(p.x,p.top+p.gap,p.w,H-CFG.ground-(p.top+p.gap));ctx.strokeRect(p.x,p.top+p.gap,p.w,H-CFG.ground-(p.top+p.gap));
  cap(p.x-6,p.top-24,p.w+12,24);cap(p.x-6,p.top+p.gap,p.w+12,24);
  ctx.fillStyle="#ffffff35";ctx.fillRect(p.x+10,0,7,p.top);ctx.fillRect(p.x+10,p.top+p.gap,7,H-CFG.ground-(p.top+p.gap));
}
function cap(x,y,w,h){ctx.fillStyle="#31d345";ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h)}
function bird(){
  ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.rot);
  const wing=-.15+player.wing*.65;
  const g=ctx.createRadialGradient(-5,-8,2,0,0,25);g.addColorStop(0,"#fff86b");g.addColorStop(.7,"#ffc72d");g.addColorStop(1,"#ed8500");
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,20,0,7);ctx.fill();
  ctx.save();ctx.rotate(wing);ctx.fillStyle="#e99a00";ctx.beginPath();ctx.ellipse(-7,7,12,7,-.25,0,7);ctx.fill();ctx.restore();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(8,-8,8,0,7);ctx.fill();ctx.fillStyle="#111";ctx.beginPath();ctx.arc(10,-8,3,0,7);ctx.fill();
  ctx.fillStyle="#ff5a17";ctx.beginPath();ctx.moveTo(17,-2);ctx.lineTo(31,4);ctx.lineTo(17,10);ctx.closePath();ctx.fill();
  ctx.restore();
}
function ground(){
  const y=H-CFG.ground;ctx.fillStyle="#51d440";ctx.fillRect(0,y,W,18);ctx.fillStyle="#168e30";
  for(let x=0;x<W;x+=14)ctx.fillRect(x,y+12,8,6);
  ctx.fillStyle="#a86738";ctx.fillRect(0,y+18,W,CFG.ground-18);ctx.fillStyle="#7e4a29";
  for(let x=10;x<W;x+=38)for(let yy=y+35;yy<H;yy+=27){ctx.beginPath();ctx.arc(x+((yy*3)%15),yy,4,0,7);ctx.fill()}
}
function draw(){
  ctx.clearRect(0,0,W,H);background();for(const p of pipes)pipe(p);
  for(const q of particles){ctx.globalAlpha=Math.max(0,q.life);ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill()}ctx.globalAlpha=1;
  bird();ground();
  if(state==="gameover"){ctx.fillStyle="#061b3390";ctx.fillRect(0,0,W,H)}
}
function loop(now){const dt=Math.min((now-last)/1000||0,.032);last=now;update(dt);draw();raf=requestAnimationFrame(loop)}
requestAnimationFrame(loop);

function renderBoard(){
  const b=leaderboard();const el=$("leaderList");
  if(!b.length){el.innerHTML='<div class="muted" style="padding:20px">Belum ada skor. Jadilah yang pertama!</div>';return}
  el.innerHTML=b.map((r,i)=>`<div class="row"><div class="rank">${i===0?"👑":i+1}</div><div>${escapeHtml(r.name)}</div><div class="points">${r.score}</div></div>`).join("");
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function home(){
  state="menu";paused=false;hide("hud");hide("gameOver");hide("pause");hide("leaderboard");hide("how");show("home");
}
$("playBtn").onclick=start;$("pauseBtn").onclick=togglePause;$("resumeBtn").onclick=togglePause;
$("pauseHomeBtn").onclick=home;$("againBtn").onclick=start;$("overHomeBtn").onclick=home;
$("howBtn").onclick=()=>show("how");$("howCloseBtn").onclick=()=>hide("how");
$("leaderBtn").onclick=()=>{renderBoard();show("leaderboard")};$("leaderHomeBtn").onclick=home;
$("clearScoresBtn").onclick=()=>{if(confirm("Hapus semua skor?")){localStorage.removeItem("flappyBoard");renderBoard();toast("Skor direset")}};
addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="ArrowUp"){e.preventDefault();flap()}if(e.code==="Escape")togglePause()});
canvas.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button===0)flap()});
$("playerName").addEventListener("keydown",e=>{if(e.key==="Enter")start()});
reset();
