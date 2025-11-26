
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
  TERMINAL_VELOCITY, 
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
  COLOR_ENEMY
} from '../constants';

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
  
  lastShotTime: number = 0;
  frameCount: number = 0;

  constructor(ctx: CanvasRenderingContext2D, input: InputState, levelIndex: number) {
    this.ctx = ctx;
    this.input = input;
    this.levelConfig = LEVELS[levelIndex - 1] || LEVELS[0];
    
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
      frameTimer: 0
    };

    this.initLevel();
  }

  initLevel() {
    // Floor
    this.createPlatform(0, CANVAS_HEIGHT - 40, this.levelConfig.length, 40);
    
    // Procedural platforms
    let currentX = 400;
    while (currentX < this.levelConfig.length - 600) {
      const y = CANVAS_HEIGHT - 40 - (Math.random() * 120 + 50);
      const w = Math.random() * 150 + 80;
      this.createPlatform(currentX, y, w, 20);
      
      // Add enemies
      if (Math.random() > 0.4) {
        this.spawnEnemy(currentX + w / 2, y - 48, 'enemy');
      }
      
      // Sometimes add a second tier
      if (Math.random() > 0.6) {
         this.createPlatform(currentX + 50, y - 100, w - 40, 20);
         this.spawnEnemy(currentX + w / 2, y - 148, 'enemy');
      }
      
      currentX += w + (Math.random() * 150 + 50);
    }
    
    // Boss Arena at the end
    // Ensure flat ground for the boss fight
    this.createPlatform(this.levelConfig.length - 800, CANVAS_HEIGHT - 150, 800, 20); // High platform
    this.spawnBoss(this.levelConfig.length - 200, CANVAS_HEIGHT - 250);
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
      vx: -ENEMY_SPEED * (1 + (this.levelConfig.id * 0.2)), // Faster per level
      vy: 0,
      color: COLOR_ENEMY,
      direction: -1,
      isDead: false,
      hp: 1 + Math.floor(this.levelConfig.id / 2),
      maxHp: 1 + Math.floor(this.levelConfig.id / 2),
      frameTimer: 0
    });
  }

  spawnBoss(x: number, y: number) {
    this.boss = {
      id: 'boss',
      type: 'boss',
      x,
      y,
      w: 80,
      h: 120,
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

  shoot(shooter: Entity, speed: number, direction: number, isPlayer: boolean) {
    let vx = direction * speed;
    let vy = 0;
    
    if (isPlayer && this.input.up) {
      vy = -speed;
      if (this.input.right) vx = speed;
      else if (this.input.left) vx = -speed;
      else vx = 0;
    }

    this.bullets.push({
      id: Math.random().toString(),
      type: 'bullet',
      x: shooter.x + shooter.w / 2,
      y: shooter.y + (isPlayer ? 10 : shooter.h / 2),
      w: isPlayer ? 8 : 12,
      h: isPlayer ? 8 : 12,
      vx,
      vy,
      color: isPlayer ? COLOR_BULLET : '#ff0000',
      direction: direction as 1 | -1,
      isDead: false,
      hp: 1,
      maxHp: 1
    });
  }

  spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, 
        y, 
        w: Math.random() * 6 + 2, 
        h: Math.random() * 6 + 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
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

  update() {
    if (this.isGameOver || this.isVictory) return;
    this.frameCount++;

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
      }
    }

    // Shooting
    if (this.input.fire) {
       const now = Date.now();
       if (now - this.lastShotTime > 150) { // Fast fire rate
         this.lastShotTime = now;
         this.shoot(this.player, BULLET_SPEED, this.player.direction, true);
       }
    }

    // Physics
    this.player.vy += GRAVITY;
    this.player.y += this.player.vy;
    this.player.x += this.player.vx;
    if (this.player.y > CANVAS_HEIGHT) this.isGameOver = true;

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
    // Lock camera at end of level
    const maxCamX = this.levelConfig.length - CANVAS_WIDTH;
    this.cameraX = Math.max(0, Math.min(targetCamX, maxCamX));

    // Lock player to screen bounds
    if (this.player.x < this.cameraX) this.player.x = this.cameraX;
    if (this.player.x > this.cameraX + CANVAS_WIDTH - this.player.w) this.player.x = this.cameraX + CANVAS_WIDTH - this.player.w;

    // --- Enemies ---
    this.enemies.forEach(e => {
      if (e.isDead) return;

      // Boss Logic
      if (e.type === 'boss') {
        // Boss moves up and down or stays put
        if (this.levelConfig.id % 2 === 0) {
           e.y += Math.sin(this.frameCount * 0.05) * 2;
        }
        
        // Boss shooting
        if (this.frameCount % (60 - this.levelConfig.id * 5) === 0) {
            // Aim at player
            const dx = (this.player.x + this.player.w/2) - (e.x + e.w/2);
            const dy = (this.player.y + this.player.h/2) - (e.y + e.h/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            this.bullets.push({
                id: Math.random().toString(),
                type: 'bullet',
                x: e.x,
                y: e.y + e.h/2,
                w: 16,
                h: 16,
                vx: (dx/dist) * 6,
                vy: (dy/dist) * 6,
                color: '#ff0000',
                direction: -1,
                isDead: false,
                hp: 1,
                maxHp: 1
            });
        }
      } else {
        // Normal Enemy Logic
        if (e.x > this.cameraX - 100 && e.x < this.cameraX + CANVAS_WIDTH + 100) {
            e.vy += GRAVITY;
            e.x += e.vx;
            e.y += e.vy;

            // Simple platform collision
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
      
      // Cleanup
      if (b.x < this.cameraX || b.x > this.cameraX + CANVAS_WIDTH) b.isDead = true;
      if (this.platforms.some(p => this.checkCollision(b, p))) {
          b.isDead = true;
          this.spawnParticles(b.x, b.y, '#fff', 2);
      }

      // Hit Entities
      if (b.color === COLOR_BULLET) { // Player Bullet
         this.enemies.forEach(e => {
            if (!e.isDead && this.checkCollision(b, e)) {
               b.isDead = true;
               e.hp--;
               this.spawnParticles(b.x, b.y, '#fff', 3);
               if (e.hp <= 0) {
                   e.isDead = true;
                   this.score += e.type === 'boss' ? 5000 : 100;
                   this.spawnParticles(e.x + e.w/2, e.y + e.h/2, e.type === 'boss' ? '#ff00ff' : COLOR_ENEMY, 20);
                   
                   if (e.type === 'boss') {
                       this.isVictory = true; // Boss dead = level complete
                   }
               }
            }
         });
      } else { // Enemy Bullet
         if (!this.player.isDead && this.checkCollision(b, this.player)) {
            b.isDead = true;
            this.player.isDead = true;
            this.isGameOver = true;
            this.spawnParticles(this.player.x, this.player.y, COLOR_PLAYER, 30);
         }
      }
    });
    
    // Player Body Collisions
    this.enemies.forEach(e => {
        if (!e.isDead && !this.player.isDead && this.checkCollision(this.player, e)) {
            this.player.isDead = true;
            this.isGameOver = true;
            this.spawnParticles(this.player.x, this.player.y, COLOR_PLAYER, 30);
        }
    });

    this.bullets = this.bullets.filter(b => !b.isDead);
    this.enemies = this.enemies.filter(e => !e.isDead);

    // Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw() {
    // 1. Draw Background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, this.levelConfig.theme.bgTop);
    gradient.addColorStop(1, this.levelConfig.theme.bgBottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    this.ctx.save();
    this.ctx.translate(-Math.floor(this.cameraX), 0);

    // 2. Draw Platforms
    this.platforms.forEach(p => {
      this.ctx.fillStyle = this.levelConfig.theme.platformTop;
      this.ctx.fillRect(p.x, p.y, p.w, 10);
      this.ctx.fillStyle = this.levelConfig.theme.platformBody;
      this.ctx.fillRect(p.x, p.y + 10, p.w, p.h - 10);
      
      // Detail lines
      this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
      this.ctx.fillRect(p.x, p.y + 10, p.w, 2);
    });

    // 3. Draw Enemies
    this.enemies.forEach(e => {
      if (e.type === 'boss') {
          this.drawBoss(e);
      } else {
          this.drawSoldier(e);
      }
    });

    // 4. Draw Player
    if (!this.player.isDead) {
      this.drawPlayer();
    }

    // 5. Draw Bullets
    this.bullets.forEach(b => {
      this.ctx.fillStyle = b.color;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.w/2, 0, Math.PI * 2);
      this.ctx.fill();
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
    this.drawHUD();
  }

  drawPlayer() {
    const p = this.player;
    const isMoving = Math.abs(p.vx) > 0;
    const bob = isMoving ? Math.sin(this.frameCount * 0.5) * 2 : 0;
    
    // Direction multiplier
    const dir = p.direction;

    // Legs (Camo Pants)
    this.ctx.fillStyle = COLOR_PLAYER_PANTS;
    // Back leg
    this.ctx.fillRect(p.x + (dir === 1 ? 4 : 12), p.y + 24 + bob, 8, 24);
    // Front leg
    this.ctx.fillRect(p.x + (dir === 1 ? 12 : 4), p.y + 24 - bob, 8, 24);
    
    // Torso (Skin/Muscle)
    this.ctx.fillStyle = COLOR_PLAYER; 
    this.ctx.fillRect(p.x + 4, p.y + 12 + bob, 16, 16);
    // Vest (Green)
    this.ctx.fillStyle = '#166534'; 
    this.ctx.fillRect(p.x + 4, p.y + 12 + bob, 16, 8);

    // Head
    this.ctx.fillStyle = COLOR_PLAYER;
    this.ctx.fillRect(p.x + 6, p.y + bob, 12, 12);
    
    // Headband
    this.ctx.fillStyle = COLOR_PLAYER_HEADBAND;
    this.ctx.fillRect(p.x + 5, p.y + 2 + bob, 14, 4);
    // Bandana Tail
    if (isMoving) {
        this.ctx.fillRect(p.x + (dir === 1 ? -4 : 16), p.y + 2 + bob + Math.sin(this.frameCount) * 2, 6, 2);
    }

    // Gun (Rifle)
    this.ctx.fillStyle = '#1f2937'; // Dark Gray
    if (this.input.up) {
       // Aiming Up
       this.ctx.fillRect(p.x + 8, p.y - 4 + bob, 4, 24);
    } else {
       // Aiming Forward
       this.ctx.fillRect(p.x + (dir === 1 ? 8 : -8), p.y + 16 + bob, 24, 6);
       // Stock
       this.ctx.fillRect(p.x + (dir === 1 ? 4 : 16), p.y + 16 + bob, 4, 6);
    }
  }

  drawSoldier(e: Entity) {
      // Alien or Soldier based on level
      const isAlien = this.levelConfig.id >= 4;
      
      this.ctx.fillStyle = isAlien ? '#be123c' : '#3f6212'; // Red Alien or Green Soldier
      this.ctx.fillRect(e.x, e.y, e.w, e.h);
      
      // Eye/Visor
      this.ctx.fillStyle = isAlien ? '#fbbf24' : '#000';
      this.ctx.fillRect(e.x + (e.vx < 0 ? 4 : 20), e.y + 8, 8, 4);
      
      // Gun
      this.ctx.fillStyle = '#444';
      this.ctx.fillRect(e.x + (e.vx < 0 ? -4 : 24), e.y + 24, 12, 6);
  }

  drawBoss(boss: Entity) {
      // Boss Style depends on level logic generally, but here is a procedural "Mech"
      const shake = boss.hp < boss.maxHp * 0.3 ? Math.random() * 4 - 2 : 0;
      const x = boss.x + shake;
      const y = boss.y + shake;
      
      // Main Body
      this.ctx.fillStyle = this.levelConfig.id === 5 ? '#581c87' : '#374151'; // Purple for Alien boss, Grey for machines
      this.ctx.fillRect(x, y, boss.w, boss.h);
      
      // Core (Weak point)
      const flash = this.frameCount % 10 < 5 ? '#ef4444' : '#7f1d1d';
      this.ctx.fillStyle = flash;
      this.ctx.fillRect(x + boss.w/2 - 10, y + boss.h/2 - 10, 20, 20);
      
      // Guns/Arms
      this.ctx.fillStyle = '#9ca3af';
      this.ctx.fillRect(x - 10, y + 20, 10, 40);
      this.ctx.fillRect(x + boss.w, y + 20, 10, 40);
  }

  drawHUD() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px "Press Start 2P"';
    this.ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 20, 30);
    this.ctx.fillText(`LIVES: ${this.player.hp}`, 20, 55);
    
    // Boss Health Bar
    if (this.boss && !this.boss.isDead) {
        const barW = 300;
        const barH = 20;
        const barX = CANVAS_WIDTH / 2 - barW / 2;
        const barY = CANVAS_HEIGHT - 40;
        
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(barX, barY, barW, barH);
        
        const hpPercent = Math.max(0, this.boss.hp / this.boss.maxHp);
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpPercent, barH - 4);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.fillText("WARNING: BOSS APPROACHING", barX, barY - 10);
    }
  }
}
