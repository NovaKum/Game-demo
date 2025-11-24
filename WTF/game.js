const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width, H = canvas.height;

// UI
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const messageEl = document.getElementById('message');

// Game state
let keys = {};
let bullets = [];
let enemies = [];
let particles = [];
let score = 0;
let lives = 3;
let lastShot = 0;
let gameRunning = false;
let spawnTimer = 0;
let levelSpeed = 1;

// Player
const player = {
  x: W/2,
  y: H - 70,
  w: 36,
  h: 40,
  speed: 6,
  cooldown: 220,
};

function rand(min,max){return Math.random()*(max-min)+min}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rectIntersect(a,b){return !(a.x+a.w<b.x||a.x>b.x+b.w||a.y+a.h<b.y||a.y>b.y+b.h)}

window.addEventListener('keydown', e=>{
  keys[e.code]=true;
  if(e.code==='Space') e.preventDefault();
  if(e.code==='KeyP') togglePause();
});
window.addEventListener('keyup', e=>{keys[e.code]=false});

canvas.addEventListener('click', ()=>{
  if(!gameRunning) startGame();
});

function togglePause(){
  gameRunning = !gameRunning;
  messageEl.style.display = gameRunning ? 'none' : 'block';
  if(!gameRunning) messageEl.textContent = 'Paused — press P to resume';
}

function startGame(){
  bullets=[]; enemies=[]; particles=[];
  score=0; lives=3; spawnTimer=0; levelSpeed=1;
  player.x = W/2;
  gameRunning=true;
  messageEl.style.display='none';
  updateUI();
}

function gameOver(){
  gameRunning=false;
  messageEl.style.display='block';
  messageEl.textContent = `Game Over — Score ${score}\nClick to play again`;
}

function shoot(){
  const now = performance.now();
  if(now - lastShot < player.cooldown) return;
  lastShot = now;
  bullets.push({x:player.x, y:player.y-20, vy:-9, w:4, h:10});
}

function spawnEnemy(){
  const ex = rand(30, W-60);
  const size = rand(22,44);
  enemies.push({
    x:ex, y:-size, w:size, h:size,
    vy: rand(1.2,2.6)*levelSpeed,
    hp: Math.ceil(size/15)
  });
}

function hitEnemy(enemy, bullet){
  enemy.hp--;
  createExplosion(bullet.x, bullet.y, 6);

  if(enemy.hp<=0){
    score += Math.round(10 * (enemy.w/30));
    createExplosion(enemy.x+enemy.w/2, enemy.y+enemy.h/2, 24);
    enemies.splice(enemies.indexOf(enemy),1);
  }
}

function createExplosion(x,y,count){
  for(let i=0;i<count;i++){
    particles.push({
      x,y,
      vx:rand(-3,3), vy:rand(-3,3),
      life:rand(30,70), r:rand(1,3)
    });
  }
}

function updateUI(){
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
}

function loop(){
  requestAnimationFrame(loop);
  ctx.fillStyle = '#02020b';
  ctx.fillRect(0,0,W,H);
  drawStarfield();

  if(!gameRunning){
    drawPlayer();
    drawEntities();
    return;
  }

  if(keys['ArrowLeft']||keys['KeyA']) player.x -= player.speed;
  if(keys['ArrowRight']||keys['KeyD']) player.x += player.speed;
  if(keys['Space']) shoot();
  player.x = clamp(player.x, 18, W-18);

  spawnTimer += 1/60;
  if(spawnTimer > Math.max(0.6, 1.8 - levelSpeed*0.2)){
    spawnEnemy();
    spawnTimer = 0;
    levelSpeed += 0.01;
  }

  // bullets
  for(let i=bullets.length-1;i>=0;i--){
    let b = bullets[i];
    b.y += b.vy;
    if(b.y < -20) bullets.splice(i,1);

    for(let j=enemies.length-1;j>=0;j--){
      let e = enemies[j];
      if(rectIntersect({x:b.x-2,y:b.y-8,w:4,h:10}, e)){
        hitEnemy(e,b);
        bullets.splice(i,1);
        break;
      }
    }
  }

  // enemies
  for(let i=enemies.length-1;i>=0;i--){
    let e = enemies[i];
    e.y += e.vy;

    if(e.y > H+50){
      enemies.splice(i,1);
      lives--; updateUI();
      if(lives<=0) gameOver();
    }

    if(rectIntersect({x:player.x-16,y:player.y-24,w:32,h:36}, e)){
      enemies.splice(i,1);
      lives--; updateUI();
      if(lives<=0) gameOver();
    }
  }

  // particles
  for(let i=particles.length-1;i>=0;i--){
    let p = particles[i];
    p.x+=p.vx; p.y+=p.vy; p.life--;
    if(p.life<=0) particles.splice(i,1);
  }

  drawPlayer();
  drawEntities();
  updateUI();
}

function drawPlayer(){
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.beginPath();
  ctx.moveTo(-16,14); ctx.lineTo(0,-18); ctx.lineTo(16,14);
  ctx.fillStyle = '#bde0ff';
  ctx.fill();
  ctx.restore();
}

function drawEntities(){
  ctx.fillStyle='#fff';
  bullets.forEach(b=>ctx.fillRect(b.x-2,b.y-8,b.w,b.h));

  enemies.forEach(e=>{
    ctx.beginPath();
    ctx.arc(e.x+e.w/2,e.y+e.h/2, e.w/2,0,Math.PI*2);
    ctx.fillStyle='#ff8fb1';
    ctx.fill();
  });

  particles.forEach(p=>{
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='#ffd59e';
    ctx.fill();
  });
}

// star background
const stars = Array.from({length:120}, ()=>({
  x:rand(0,W),y:rand(0,H),r:rand(0.3,1.6),vy:rand(0.1,0.6)
}));

function drawStarfield(){
  stars.forEach(s=>{
    s.y+=s.vy;
    if(s.y>H){ s.y=-2; s.x=rand(0,W); }
    ctx.beginPath();
    ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    ctx.fillStyle='white';
    ctx.fill();
  });
}

loop();
