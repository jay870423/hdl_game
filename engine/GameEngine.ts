
import { 
  Entity, 
  Platform, 
  InputState, 
  Rect, 
  Particle,
  LevelConfig
} from '../types';
import { 
  GRAVITY, 
  PLAYER_SPEED, 
  JUMP_FORCE, 
  BULLET_SPEED,
  ENEMY_SPEED,
  CANVAS_WIDTH, 
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  LEVELS,
  COLOR_PLAYER,
  COLOR_PLAYER_HEADBAND,
  COLOR_PLAYER_PANTS,
  COLOR_BULLET,
  COLOR_ENEMY,
  COLOR_POWERUP_SPREAD,
  COLOR_POWERUP_MACHINE,
  COLOR_SENSOR
} from '../constants';
import { audio } from '../services/audioService';

export class GameEngine {
  ctx: CanvasRenderingContext2D;
  input: InputState;
  
  levelConfig: LevelConfig;
  
  player: Entity;
  boss: Entity | null = null;
  bullets: Entity[] = [];
  enemies: Entity[] = [];
  platforms: Platform[] = [];
  particles: Particle[] = [];
  
  cameraX: number = 0;
  score: number = 0;
  isGameOver: boolean = false;
  isVictory: boolean = false;
  victoryTimer: number = 0;
  
  lastShotTime: number = 0;
  frameCount: number = 0;
  screenShake: number = 0;

  constructor(ctx: CanvasRenderingContext2D, input: InputState, levelIndex: number) {
    this.ctx = ctx;
    this.input = input;
    // Handle levels > 8 by looping
    const idx = (levelIndex - 1) % LEVELS.length;
    this.levelConfig = LEVELS[idx];
    
    this.player = {
      id: 'player',
      type: 'player',
      x: 100,
      y: 100,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      color: COLOR_PLAYER,
      direction: 1,
      isDead: false,
      hp: 3,
      maxHp: 3,
      frameTimer: 0,
      weapon: 'normal',
      invulnerableUntil: 0
    };

    this.initLevel();
    audio.startBGM(this.levelConfig.id);
  }

  stop() {
      audio.stopBGM();
  }

  initLevel() {
    // Floor
    this.createPlatform(0, CANVAS_HEIGHT - 40, this.levelConfig.length, 40);
    
    // Procedural platforms
    let currentX = 400;
    while (currentX < this.levelConfig.length - 600) {
      const isPit = Math.random() > 0.8;
      
      if (!isPit) {
          const y = CANVAS_HEIGHT - 40 - (Math.random() * 120 + 50);
          const w = Math.random() * 150 + 80;
          this.createPlatform(currentX, y, w, 20);
          
          // Add enemies
          if (Math.random() > 0.3) {
            this.spawnEnemy(currentX + w / 2, y - 48, 'enemy');
          }
          
          // Sometimes add a second tier
          if (Math.random() > 0.6) {
             this.createPlatform(currentX + 50, y - 100, w - 40, 20);
             this.spawnEnemy(currentX + w / 2, y - 148, 'enemy');
          }
      } else {
          // Add floating islands over pit
          this.createPlatform(currentX, CANVAS_HEIGHT - 150, 60, 20);
      }
      
      currentX += 200 + (Math.random() * 100);
    }
    
    // Boss Arena at the end
    // Ensure flat ground for the boss fight
    this.createPlatform(this.levelConfig.length - 800, CANVAS_HEIGHT - 150, 800, 20); // High platform
    this.spawnBoss(this.levelConfig.length - 250, CANVAS_HEIGHT - 250);
  }

  createPlatform(x: number, y: number, w: number, h: number) {
    this.platforms.push({ x, y, w, h, type: 'solid' });
  }

  spawnEnemy(x: number, y: number, type: 'enemy') {
    this.enemies.push({
      id: Math.random().toString(),
      type,
      x,
      y,
      w: 32,
      h: 48,
      vx: -ENEMY_SPEED * (1 + (this.levelConfig.id * 0.1)), 
      vy: 0,
      color: COLOR_ENEMY,
      direction: -1,
      isDead: false,
      hp: 1 + Math.floor(this.levelConfig.id / 3),
      maxHp: 1 + Math.floor(this.levelConfig.id / 3),
      frameTimer: 0
    });
  }

  spawnBoss(x: number, y: number) {
    this.boss = {
      id: 'boss',
      type: 'boss',
      x,
      y,
      w: 120, // Bigger bosses
      h: 140,
      vx: 0,
      vy: 0,
      color: '#ff00ff',
      direction: -1,
      isDead: false,
      hp: this.levelConfig.bossHp,
      maxHp: this.levelConfig.bossHp,
      frameTimer: 0
    };
    this.enemies.push(this.boss);
  }
  
  spawnFlyingSensor() {
      const y = Math.random() * (CANVAS_HEIGHT / 2) + 50;
      this.enemies.push({
          id: Math.random().toString(),
          type: 'sensor',
          x: this.cameraX + CANVAS_WIDTH + 50,
          y: y,
          w: 36,
          h: 36,
          vx: -3.5,
          vy: 0,
          color: COLOR_SENSOR,
          direction: -1,
          isDead: false,
          hp: 1,
          maxHp: 1,
          frameTimer: 0
      });
  }
  
  spawnPowerUp(x: number, y: number) {
      const type = Math.random() > 0.5 ? 'spread' : 'machine';
      this.enemies.push({
          id: Math.random().toString(),
          type: 'powerup',
          subType: type,
          x: x,
          y: y,
          w: 24,
          h: 24,
          vx: 0,
          vy: 0,
          color: type === 'spread' ? COLOR_POWERUP_SPREAD : COLOR_POWERUP_MACHINE,
          direction: 1,
          isDead: false,
          hp: 1,
          maxHp: 1
      });
  }

  shoot(shooter: Entity, speed: number, direction: number, isPlayer: boolean) {
    let bulletsToFire = [];
    
    if (isPlayer && this.player.weapon === 'spread') {
         if (this.input.up) {
             bulletsToFire.push({ vx: -speed * 0.3, vy: -speed });
             bulletsToFire.push({ vx: 0, vy: -speed });
             bulletsToFire.push({ vx: speed * 0.3, vy: -speed });
         } else {
             bulletsToFire.push({ vx: speed * direction, vy: -speed * 0.25 });
             bulletsToFire.push({ vx: speed * direction, vy: 0 });
             bulletsToFire.push({ vx: speed * direction, vy: speed * 0.25 });
         }
    } else {
        let vx = direction * speed;
        let vy = 0;
        
        if (isPlayer && this.input.up) {
            vy = -speed;
            if (this.input.right) vx = speed;
            else if (this.input.left) vx = -speed;
            else vx = 0;
        }
        bulletsToFire.push({ vx, vy });
    }

    bulletsToFire.forEach(b => {
        this.bullets.push({
          id: Math.random().toString(),
          type: 'bullet',
          x: shooter.x + shooter.w / 2,
          y: shooter.y + (isPlayer ? 10 : shooter.h / 2),
          w: isPlayer ? (this.player.weapon === 'spread' ? 10 : 6) : 10,
          h: isPlayer ? (this.player.weapon === 'spread' ? 10 : 6) : 10,
          vx: b.vx,
          vy: b.vy,
          color: isPlayer ? COLOR_BULLET : '#ff0000',
          direction: direction as 1 | -1,
          isDead: false,
          hp: 1,
          maxHp: 1
        });
    });
    
    if (isPlayer) audio.shoot();
  }

  spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, 
        y, 
        w: Math.random() * 5 + 2, 
        h: Math.random() * 5 + 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.8) * 12, // More up bias
        life: 1.0,
        color
      });
    }
  }

  checkCollision(rect1: Rect, rect2: Rect): boolean {
    return (
      rect1.x < rect2.x + rect2.w &&
      rect1.x + rect1.w > rect2.x &&
      rect1.y < rect2.y + rect2.h &&
      rect1.y + rect1.h > rect2.y
    );
  }

  triggerShake(amount: number) {
      this.screenShake = amount;
  }

  update() {
    if (this.isGameOver) return;
    if (this.isVictory) return;

    this.frameCount++;
    
    // Victory Timer Logic (Delay before switching to Victory Screen)
    if (this.victoryTimer > 0) {
        this.victoryTimer--;
        if (this.victoryTimer <= 0) {
            this.isVictory = true;
            return;
        }
    }

    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.5) this.screenShake = 0;

    // Randomly spawn sensor (Only if not in victory sequence)
    if (this.victoryTimer === 0 && this.frameCount % 500 === 0) { 
        this.spawnFlyingSensor();
    }

    // --- Player Logic ---
    if (this.input.right) {
      this.player.vx = PLAYER_SPEED;
      this.player.direction = 1;
    } else if (this.input.left) {
      this.player.vx = -PLAYER_SPEED;
      this.player.direction = -1;
    } else {
      this.player.vx = 0;
    }

    // Jumping
    if (this.input.jump && this.player.vy === 0) {
      const onGround = this.platforms.some(p => 
        this.player.x < p.x + p.w &&
        this.player.x + this.player.w > p.x &&
        Math.abs((this.player.y + this.player.h) - p.y) < 5
      );
      
      if (onGround) {
        this.player.vy = JUMP_FORCE;
        audio.jump();
      }
    }

    // Shooting
    if (this.input.fire) {
       const now = Date.now();
       const fireRate = this.player.weapon === 'machine' ? 90 : 180;
       
       if (now - this.lastShotTime > fireRate) {
         this.lastShotTime = now;
         this.shoot(this.player, BULLET_SPEED, this.player.direction, true);
       }
    }

    // Physics
    this.player.vy += GRAVITY;
    this.player.y += this.player.vy;
    this.player.x += this.player.vx;
    if (this.player.y > CANVAS_HEIGHT) {
        if (this.victoryTimer > 0) {
           // Prevent death during victory fall
           this.player.y = CANVAS_HEIGHT - 100;
           this.player.vy = 0;
        } else {
           this.player.isDead = true;
           this.isGameOver = true;
           this.stop();
           audio.explode();
        }
    }

    // Player Platform Collisions
    for (const plat of this.platforms) {
      if (this.checkCollision(this.player, plat)) {
        const overlapX = (this.player.w + plat.w) / 2 - Math.abs((this.player.x + this.player.w / 2) - (plat.x + plat.w / 2));
        const overlapY = (this.player.h + plat.h) / 2 - Math.abs((this.player.y + this.player.h / 2) - (plat.y + plat.h / 2));

        if (overlapX < overlapY) {
            if (this.player.x < plat.x) this.player.x = plat.x - this.player.w;
            else this.player.x = plat.x + plat.w;
            this.player.vx = 0;
        } else {
            if (this.player.vy > 0 && this.player.y < plat.y) { 
                this.player.y = plat.y - this.player.h;
                this.player.vy = 0;
            } else if (this.player.vy < 0 && this.player.y > plat.y) {
                this.player.y = plat.y + plat.h;
                this.player.vy = 0;
            }
        }
      }
    }

    // Camera
    const targetCamX = this.player.x - CANVAS_WIDTH / 3;
    const maxCamX = this.levelConfig.length - CANVAS_WIDTH;
    this.cameraX += (Math.max(0, Math.min(targetCamX, maxCamX)) - this.cameraX) * 0.1; // Smooth cam

    if (this.player.x < this.cameraX) this.player.x = this.cameraX;
    if (this.player.x > this.cameraX + CANVAS_WIDTH - this.player.w) this.player.x = this.cameraX + CANVAS_WIDTH - this.player.w;

    // --- Enemies ---
    this.enemies.forEach(e => {
      if (e.isDead) return;

      if (e.type === 'powerup') {
          if (this.checkCollision(this.player, e)) {
              e.isDead = true;
              this.player.weapon = e.subType;
              audio.powerup();
              this.score += 500;
          }
          return;
      }

      // Boss Logic
      if (e.type === 'boss') {
        const bossSpeed = 0.02 + (this.levelConfig.id * 0.005);
        e.y = (CANVAS_HEIGHT - 300) + Math.sin(this.frameCount * bossSpeed) * 100;
        
        // Boss shooting
        if (this.frameCount % Math.max(20, (70 - this.levelConfig.id * 8)) === 0) {
            const dx = (this.player.x + this.player.w/2) - (e.x + e.w/2);
            const dy = (this.player.y + this.player.h/2) - (e.y + e.h/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            const speed = 7;
            
            // Boss 3+ shoots spread
            if (this.levelConfig.id >= 3) {
                 this.bullets.push({
                    id: Math.random().toString(),
                    type: 'bullet', x: e.x, y: e.y + e.h/2, w: 16, h: 16,
                    vx: (dx/dist) * speed, vy: (dy/dist) * speed - 2,
                    color: '#ff0000', direction: -1, isDead: false, hp: 1, maxHp: 1
                });
            }

            this.bullets.push({
                id: Math.random().toString(),
                type: 'bullet',
                x: e.x,
                y: e.y + e.h/2,
                w: 20,
                h: 20,
                vx: (dx/dist) * speed,
                vy: (dy/dist) * speed,
                color: '#ff0000',
                direction: -1,
                isDead: false,
                hp: 1,
                maxHp: 1
            });
        }
      } else if (e.type === 'sensor') {
          e.x += e.vx;
          e.y += Math.sin(this.frameCount * 0.1) * 3;
          if (e.x < this.cameraX - 100) e.isDead = true;
      } else {
        // Normal Enemy Logic
        if (e.x > this.cameraX - 100 && e.x < this.cameraX + CANVAS_WIDTH + 100) {
            e.vy += GRAVITY;
            e.x += e.vx;
            e.y += e.vy;

            let onGround = false;
            for (const plat of this.platforms) {
                if (this.checkCollision(e, plat)) {
                   if (e.vy > 0 && e.y < plat.y + plat.h) {
                       e.y = plat.y - e.h;
                       e.vy = 0;
                       onGround = true;
                   }
                }
            }
            if (!onGround && e.y > CANVAS_HEIGHT) e.isDead = true;
        }
      }
    });

    // --- Bullets & Combat ---
    this.bullets.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
      
      if (b.x < this.cameraX || b.x > this.cameraX + CANVAS_WIDTH) b.isDead = true;
      if (this.platforms.some(p => this.checkCollision(b, p))) {
          b.isDead = true;
          this.spawnParticles(b.x, b.y, '#fff', 3);
      }

      if (b.color === COLOR_BULLET) { // Player Bullet
         this.enemies.forEach(e => {
            if (!e.isDead && e.type !== 'powerup' && this.checkCollision(b, e)) {
               b.isDead = true;
               e.hp--;
               this.spawnParticles(b.x, b.y, '#fff', 5); // Spark
               
               if (e.type === 'boss') {
                   audio.bossHit();
                   e.invulnerableUntil = Date.now() + 50; // Flash white
               }

               if (e.hp <= 0) {
                   e.isDead = true;
                   this.triggerShake(e.type === 'boss' ? 20 : 5);
                   audio.explode();
                   this.score += e.type === 'boss' ? 5000 : 100;
                   this.spawnParticles(e.x + e.w/2, e.y + e.h/2, e.type === 'boss' ? '#ff00ff' : COLOR_ENEMY, 30);
                   
                   if (e.type === 'sensor' || Math.random() < 0.1) {
                       this.spawnPowerUp(e.x, e.y);
                   }

                   if (e.type === 'boss') {
                       // START VICTORY SEQUENCE
                       this.victoryTimer = 180; // 3 seconds delay
                       this.stop(); // Stop BGM
                       audio.powerup(); // Play Fanfare
                       
                       // Make player invulnerable
                       this.player.invulnerableUntil = Date.now() + 10000;
                       
                       // Kill all other enemies and clear bullets
                       this.enemies.forEach(other => {
                           if (other.type !== 'boss' && other.type !== 'player') other.isDead = true;
                       });
                       this.bullets.forEach(b => b.isDead = true);
                   }
               }
            }
         });
      } else { // Enemy Bullet
         if (!this.player.isDead && this.checkCollision(b, this.player)) {
            if (Date.now() > (this.player.invulnerableUntil || 0)) {
                b.isDead = true;
                this.player.hp--;
                this.triggerShake(10);
                audio.explode();
                if (this.player.hp <= 0) {
                    this.player.isDead = true;
                    this.isGameOver = true;
                    this.stop(); // Stop audio on death
                    this.spawnParticles(this.player.x, this.player.y, COLOR_PLAYER, 50);
                } else {
                    this.player.invulnerableUntil = Date.now() + 2000;
                    this.spawnParticles(this.player.x, this.player.y, COLOR_PLAYER, 10);
                }
            }
         }
      }
    });
    
    // Player Body Collisions
    this.enemies.forEach(e => {
        if (!e.isDead && e.type !== 'powerup' && !this.player.isDead && this.checkCollision(this.player, e)) {
             if (Date.now() > (this.player.invulnerableUntil || 0)) {
                this.player.hp--;
                this.triggerShake(10);
                audio.explode();
                if (this.player.hp <= 0) {
                    this.player.isDead = true;
                    this.isGameOver = true;
                    this.stop();
                    this.spawnParticles(this.player.x, this.player.y, COLOR_PLAYER, 50);
                } else {
                    this.player.invulnerableUntil = Date.now() + 2000;
                    this.player.vx = -this.player.direction * 15;
                    this.player.vy = -8;
                }
             }
        }
    });

    this.bullets = this.bullets.filter(b => !b.isDead);
    this.enemies = this.enemies.filter(e => !e.isDead);

    // Particles physics
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5; // Gravity
      p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw() {
    this.ctx.save();
    
    // Screen Shake
    if (this.screenShake > 0) {
        this.ctx.translate(
            (Math.random() - 0.5) * this.screenShake, 
            (Math.random() - 0.5) * this.screenShake
        );
    }

    // 1. Draw Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, this.levelConfig.theme.bgTop);
    gradient.addColorStop(1, this.levelConfig.theme.bgBottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Simulated Starfield / Parallax
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for(let i=0; i<50; i++) {
        // Simple hash based on index to keep position static relative to camera
        const x = (i * 137 + this.cameraX * 0.5) % CANVAS_WIDTH; 
        const y = (i * 97) % CANVAS_HEIGHT;
        const size = (i % 3) + 1;
        this.ctx.fillRect(x, y, size, size);
    }
    
    this.ctx.translate(-Math.floor(this.cameraX), 0);

    // 2. Draw Platforms
    this.platforms.forEach(p => {
      // Main Body
      this.ctx.fillStyle = this.levelConfig.theme.platformBody;
      this.ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
      
      // Top Detail
      this.ctx.fillStyle = this.levelConfig.theme.platformTop;
      this.ctx.fillRect(p.x, p.y, p.w, 8);
      
      // Shadow/Depth
      this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
      this.ctx.fillRect(p.x, p.y + 8, p.w, 4);
    });

    // 3. Draw Entities
    this.enemies.forEach(e => {
      if (e.type === 'boss') this.drawBoss(e);
      else if (e.type === 'powerup') this.drawPowerUp(e);
      else if (e.type === 'sensor') this.drawSensor(e);
      else this.drawSoldier(e);
    });

    if (!this.player.isDead) {
      if (!this.player.invulnerableUntil || Date.now() > this.player.invulnerableUntil || Math.floor(Date.now() / 50) % 2 === 0) {
          this.drawPlayer();
      }
    }

    // 5. Draw Bullets with Glow
    this.bullets.forEach(b => {
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = b.color;
      this.ctx.fillStyle = '#fff'; // White core
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.w/2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0; // Reset
    });
    
    // 6. Draw Particles
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.w, p.h);
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();

    // 7. HUD
    if (this.victoryTimer === 0 || Math.floor(this.frameCount / 10) % 2 === 0) {
         this.drawHUD();
    }
    
    // 8. Fallback Game Over Text (In case UI Overlay fails)
    if (this.isGameOver) {
       this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
       this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
       this.ctx.fillStyle = '#ef4444';
       this.ctx.font = '40px "Press Start 2P"';
       this.ctx.textAlign = 'center';
       this.ctx.fillText("MISSION FAILED", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
    }
  }
  
  drawPowerUp(e: Entity) {
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = '#fff';
      
      // Metal Wing Container
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.beginPath();
      this.ctx.moveTo(e.x, e.y + e.h/2);
      this.ctx.lineTo(e.x + e.w, e.y + e.h/2);
      this.ctx.lineTo(e.x + e.w/2, e.y);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
      this.ctx.fillStyle = e.color;
      this.ctx.fillRect(e.x + 4, e.y + 4, e.w - 8, e.h - 8);
      
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '700 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(e.subType === 'spread' ? 'S' : 'M', e.x + e.w/2, e.y + e.h/2);
  }
  
  drawSensor(e: Entity) {
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.beginPath();
      this.ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2, 0, Math.PI*2);
      this.ctx.fill();
      
      // Blinking red light
      this.ctx.fillStyle = (Math.floor(this.frameCount / 10) % 2 === 0) ? '#ef4444' : '#7f1d1d';
      this.ctx.beginPath();
      this.ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/4, 0, Math.PI*2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#475569';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
  }

  drawPlayer() {
    const p = this.player;
    const isMoving = Math.abs(p.vx) > 0;
    const bob = isMoving ? Math.sin(this.frameCount * 0.4) * 3 : 0;
    const dir = p.direction;

    // Pants (Camo pattern logic skipped for performance, just solid detailed)
    this.ctx.fillStyle = COLOR_PLAYER_PANTS;
    // Left Leg
    this.ctx.fillRect(p.x + (dir === 1 ? 2 : 14), p.y + 28 + bob, 8, 20);
    // Right Leg
    this.ctx.fillRect(p.x + (dir === 1 ? 14 : 2), p.y + 28 - bob, 8, 20);
    
    // Boots
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(p.x + (dir === 1 ? 2 : 14), p.y + 44 + bob, 10, 4);
    this.ctx.fillRect(p.x + (dir === 1 ? 14 : 2), p.y + 44 - bob, 10, 4);

    // Torso (Vest)
    this.ctx.fillStyle = COLOR_PLAYER; // Skin
    this.ctx.fillRect(p.x + 4, p.y + 12 + bob, 16, 16);
    this.ctx.fillStyle = '#1e3a8a'; // Blue Vest
    this.ctx.fillRect(p.x + 4, p.y + 18 + bob, 16, 10);

    // Head
    this.ctx.fillStyle = COLOR_PLAYER;
    this.ctx.fillRect(p.x + 6, p.y + bob, 12, 12);
    
    // Headband (Red)
    this.ctx.fillStyle = COLOR_PLAYER_HEADBAND;
    this.ctx.fillRect(p.x + 5, p.y + 2 + bob, 14, 4);
    // Bandana Tail flowing
    if (isMoving) {
        this.ctx.fillRect(p.x + (dir === 1 ? -6 : 18), p.y + 4 + bob + Math.sin(this.frameCount) * 3, 8, 3);
    }

    // Gun (Rifle shape)
    this.ctx.fillStyle = '#1f2937'; // Gun Metal
    if (this.input.up) {
       this.ctx.fillRect(p.x + 8, p.y - 10 + bob, 4, 30); // Barrel Up
       this.ctx.fillRect(p.x + 6, p.y + 10 + bob, 8, 6); // Stock
    } else {
       this.ctx.fillRect(p.x + (dir === 1 ? 8 : -12), p.y + 16 + bob, 28, 6); // Barrel
       this.ctx.fillRect(p.x + (dir === 1 ? 4 : 16), p.y + 16 + bob, 4, 8); // Grip
    }
  }

  drawSoldier(e: Entity) {
      const isAlien = this.levelConfig.id >= 4;
      const bob = Math.sin(this.frameCount * 0.2) * 2;
      
      if (isAlien) {
          // Alien styling
          this.ctx.fillStyle = '#881337'; // Dark Red Body
          this.ctx.fillRect(e.x, e.y + bob, e.w, e.h);
          
          this.ctx.fillStyle = '#4ade80'; // Green Glowing Eyes
          this.ctx.fillRect(e.x + (e.vx < 0 ? 4 : 20), e.y + 10 + bob, 8, 4);
          
          // Spikes
          this.ctx.fillStyle = '#fca5a5';
          this.ctx.beginPath();
          this.ctx.moveTo(e.x + 10, e.y + bob);
          this.ctx.lineTo(e.x + 16, e.y - 8 + bob);
          this.ctx.lineTo(e.x + 22, e.y + bob);
          this.ctx.fill();
      } else {
          // Human Soldier
          this.ctx.fillStyle = '#3f6212'; // Green Camo
          this.ctx.fillRect(e.x, e.y, e.w, e.h);
          this.ctx.fillStyle = '#fbbf24'; // Visor
          this.ctx.fillRect(e.x + (e.vx < 0 ? 4 : 20), e.y + 8, 8, 4);
          this.ctx.fillStyle = '#111'; // Gun
          this.ctx.fillRect(e.x + (e.vx < 0 ? -4 : 24), e.y + 24, 16, 6);
      }
  }

  drawBoss(boss: Entity) {
      // Hit flash
      if (boss.invulnerableUntil && Date.now() < boss.invulnerableUntil) {
          this.ctx.globalCompositeOperation = 'source-atop';
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
          this.ctx.globalCompositeOperation = 'source-over';
          return;
      }

      const shake = Math.sin(this.frameCount * 0.5) * 2;
      
      // Theme based boss appearance
      if (this.levelConfig.id >= 5) {
          // Alien/Organic Boss
          this.ctx.fillStyle = '#4c0519'; // Deep gore color
          // Main blob
          this.ctx.beginPath();
          this.ctx.ellipse(boss.x + boss.w/2, boss.y + boss.h/2 + shake, boss.w/2, boss.h/2, 0, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Pulsing Core
          const pulse = Math.sin(this.frameCount * 0.1) * 10;
          this.ctx.shadowBlur = 20;
          this.ctx.shadowColor = '#ef4444';
          this.ctx.fillStyle = '#f87171';
          this.ctx.beginPath();
          this.ctx.arc(boss.x + boss.w/2, boss.y + boss.h/2 + shake, 20 + pulse, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
          
          // Eyes
          this.ctx.fillStyle = '#fbbf24';
          this.ctx.fillRect(boss.x + 20, boss.y + 40 + shake, 10, 10);
          this.ctx.fillRect(boss.x + boss.w - 30, boss.y + 40 + shake, 10, 10);
          
      } else {
          // Mecha Boss
          this.ctx.fillStyle = '#374151'; // Grey Metal
          this.ctx.fillRect(boss.x, boss.y + shake, boss.w, boss.h);
          
          // Rivets
          this.ctx.fillStyle = '#9ca3af';
          this.ctx.fillRect(boss.x + 10, boss.y + 10 + shake, 5, 5);
          this.ctx.fillRect(boss.x + boss.w - 15, boss.y + 10 + shake, 5, 5);
          
          // Glowing Core
          this.ctx.shadowBlur = 15;
          this.ctx.shadowColor = '#06b6d4';
          this.ctx.fillStyle = '#22d3ee';
          this.ctx.fillRect(boss.x + boss.w/2 - 20, boss.y + boss.h/2 - 20 + shake, 40, 40);
          this.ctx.shadowBlur = 0;
          
          // Legs
          this.ctx.fillStyle = '#1f2937';
          this.ctx.fillRect(boss.x - 10, boss.y + boss.h - 20, 20, 40);
          this.ctx.fillRect(boss.x + boss.w - 10, boss.y + boss.h - 20, 20, 40);
      }
  }

  drawHUD() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px "Press Start 2P"';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 20, 30);
    this.ctx.fillText(`LIVES: ${this.player.hp}`, 20, 55);
    
    // Draw Weapon Icon
    let weaponText = 'NORMAL';
    let weaponColor = '#94a3b8';
    if (this.player.weapon === 'spread') { weaponText = 'SPREAD'; weaponColor = COLOR_POWERUP_SPREAD; }
    if (this.player.weapon === 'machine') { weaponText = 'MACHINE'; weaponColor = COLOR_POWERUP_MACHINE; }
    
    this.ctx.fillStyle = weaponColor;
    this.ctx.fillText(`WPN: ${weaponText}`, 180, 55);
    
    // Boss Health Bar
    if (this.boss && !this.boss.isDead) {
        const barW = 300;
        const barH = 15;
        const barX = CANVAS_WIDTH / 2 - barW / 2;
        const barY = CANVAS_HEIGHT - 30;
        
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barW, barH);
        
        const hpPercent = Math.max(0, this.boss.hp / this.boss.maxHp);
        this.ctx.fillStyle = hpPercent < 0.3 ? '#ef4444' : '#eab308';
        this.ctx.fillRect(barX, barY, barW * hpPercent, barH);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText("WARNING: BOSS APPROACHING", CANVAS_WIDTH/2, barY - 10);
    }
  }
}
