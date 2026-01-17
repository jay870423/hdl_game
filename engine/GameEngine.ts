
import { 
  Entity, 
  Platform, 
  InputState, 
  Rect, 
  Particle,
  LevelConfig,
  PowerUpType,
  Point
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
  COLOR_BULLET_ENEMY,
  COLOR_CAPYBARA_FUR,
  COLOR_CAPYBARA_NOSE,
  COLOR_CAPYBARA_EAR,
  COLOR_VENOM_SKIN,
  COLOR_VENOM_EYES,
  COLOR_VENOM_SLIME,
  COLOR_CARNAGE_SKIN,
  COLOR_CARNAGE_SLIME,
  COLOR_POWERUP_SPREAD,
  COLOR_POWERUP_MACHINE,
  COLOR_POWERUP_LASER,
  COLOR_POWERUP_HEALTH,
  COLOR_SENSOR,
  COLOR_BOMB,
  COLOR_EXPLOSION
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
  lastBombTime: number = 0;
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
      bombs: 3, // Start with 3 bombs
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
          
          // Add enemies (Capybaras)
          if (Math.random() > 0.3) {
            // Capybaras are shorter and wider
            this.spawnEnemy(currentX + w / 2, y - 40, 'enemy');
          }
          
          if (Math.random() > 0.6) {
             this.createPlatform(currentX + 50, y - 100, w - 40, 20);
             this.spawnEnemy(currentX + w / 2, y - 140, 'enemy');
          }
      } else {
          // Add floating islands over pit
          this.createPlatform(currentX, CANVAS_HEIGHT - 150, 60, 20);
      }
      
      currentX += 200 + (Math.random() * 100);
    }
    
    // Boss Arena at the end
    this.createPlatform(this.levelConfig.length - 800, CANVAS_HEIGHT - 150, 800, 20); 
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
      w: 40, // Wider for Capybara body
      h: 30, // Shorter for quadruped
      vx: -ENEMY_SPEED * (1 + (this.levelConfig.id * 0.1)), 
      vy: 0,
      color: COLOR_CAPYBARA_FUR,
      direction: -1,
      isDead: false,
      hp: 1 + Math.floor(this.levelConfig.id / 3),
      maxHp: 1 + Math.floor(this.levelConfig.id / 3),
      frameTimer: 0
    });
  }

  spawnBoss(x: number, y: number) {
    // Tentacle config varies by boss type
    const levelId = this.levelConfig.id;
    let numTentacles = 4;
    let segsPerTentacle = 6;
    
    // High level chaos bosses have more chaotic limbs
    if (levelId >= 6) { numTentacles = 8; segsPerTentacle = 5; }
    else if (levelId >= 3) { numTentacles = 6; }

    const tentacles: Point[][] = [];
    for(let i=0; i<numTentacles; i++) {
        const segs: Point[] = [];
        for(let j=0; j<segsPerTentacle; j++) {
            segs.push({x: x, y: y});
        }
        tentacles.push(segs);
    }

    this.boss = {
      id: 'boss',
      type: 'boss',
      x,
      y,
      w: 160, 
      h: 180,
      vx: 0,
      vy: 0,
      color: COLOR_VENOM_SKIN,
      direction: -1,
      isDead: false,
      hp: this.levelConfig.bossHp,
      maxHp: this.levelConfig.bossHp,
      frameTimer: 0,
      attackState: 'idle',
      attackTimer: 100,
      // Animation Props
      tentacles,
      animScaleX: 1,
      animScaleY: 1,
      targetY: y
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
      const rand = Math.random();
      let type: PowerUpType;
      
      // Adjusted weights for better weapon variety
      if (rand < 0.1) type = 'health'; 
      else if (rand < 0.2) type = 'bomb_refill';
      else if (rand < 0.5) type = 'spread';
      else if (rand < 0.8) type = 'machine';
      else type = 'laser';

      let color = COLOR_POWERUP_MACHINE;
      if (type === 'spread') color = COLOR_POWERUP_SPREAD;
      if (type === 'health') color = COLOR_POWERUP_HEALTH;
      if (type === 'bomb_refill') color = COLOR_BOMB;
      if (type === 'laser') color = COLOR_POWERUP_LASER;

      this.enemies.push({
          id: Math.random().toString(),
          type: 'powerup',
          subType: type,
          x: x,
          y: y,
          baseY: y, // Center for floating animation
          w: 24,
          h: 24,
          vx: 0,
          vy: 0,
          color: color,
          direction: 1,
          isDead: false,
          hp: 1,
          maxHp: 1
      });
  }

  shoot(shooter: Entity, speed: number, direction: number, isPlayer: boolean) {
    // Determine spawn height. If player is crouching, spawn lower.
    const isCrouching = isPlayer && this.input.down;
    const spawnYOffset = isPlayer 
        ? (isCrouching ? 34 : 10) 
        : shooter.h / 2;

    const startX = shooter.x + shooter.w / 2;
    const startY = shooter.y + spawnYOffset;

    if (isPlayer && this.player.weapon === 'spread') {
         // Spread Gun: 3 shots
         const angles = this.input.up 
            ? [-0.3, 0, 0.3] // Aiming up spread
            : [-0.2, 0, 0.2]; // Horizontal spread
         
         angles.forEach(angle => {
             let vx, vy;
             if (this.input.up) {
                 vx = Math.sin(angle) * speed;
                 vy = -Math.cos(angle) * speed;
             } else {
                 vx = direction * speed;
                 vy = Math.sin(angle) * speed;
             }
             
             this.bullets.push(this.createBullet(startX, startY, vx, vy, isPlayer, false));
         });
    } else if (isPlayer && this.player.weapon === 'laser') {
        // Laser Gun: Fast, penetrates enemies
        let vx = direction * (speed * 1.5); // Laser is faster
        let vy = 0;
        
        if (this.input.up) {
            vx = 0;
            vy = -(speed * 1.5);
            if (this.input.right) vx = (speed * 1.5);
            else if (this.input.left) vx = -(speed * 1.5);
        }
        
        const b = this.createBullet(startX, startY, vx, vy, isPlayer, false);
        b.penetratesEnemies = true;
        b.hitEnemyIds = [];
        b.w = 20; // Longer bullet
        b.color = COLOR_POWERUP_LASER;
        this.bullets.push(b);

    } else {
        // Normal & Machine Gun
        let vx = direction * speed;
        let vy = 0;
        
        if (isPlayer && this.input.up) {
            vy = -speed;
            if (this.input.right) vx = speed;
            else if (this.input.left) vx = -speed;
            else vx = 0;
        }
        this.bullets.push(this.createBullet(startX, startY, vx, vy, isPlayer, false));
    }
    
    if (isPlayer) audio.shoot();
  }

  createBullet(x: number, y: number, vx: number, vy: number, isPlayer: boolean, penetratesWalls: boolean): Entity {
      return {
          id: Math.random().toString(),
          type: 'bullet',
          x,
          y,
          w: isPlayer ? 10 : 10,
          h: isPlayer ? 10 : 10,
          vx,
          vy,
          color: isPlayer ? COLOR_BULLET : COLOR_BULLET_ENEMY,
          direction: 1, // Not used for drawing usually
          isDead: false,
          hp: 1,
          maxHp: 1,
          penetratesWalls,
          penetratesEnemies: false
      };
  }

  throwBomb() {
     const p = this.player;
     // Throw arc: move in facing direction, but arc up slightly
     const vx = p.direction * 6 + p.vx; 
     const vy = -10; 

     this.bullets.push({
         id: Math.random().toString(),
         type: 'bomb',
         x: p.x + p.w / 2,
         y: p.y,
         w: 12,
         h: 12,
         vx,
         vy,
         color: COLOR_BOMB,
         direction: p.direction,
         isDead: false,
         hp: 1,
         maxHp: 1
     });
     
     // Cheap sound for throw (pitch drop)
     audio.shoot();
  }

  spawnExplosion(x: number, y: number) {
      const radius = 100; // Explosion radius
      
      // Visual explosion entity
      this.bullets.push({
          id: Math.random().toString(),
          type: 'explosion',
          x: x - radius/2,
          y: y - radius/2,
          w: radius,
          h: radius,
          vx: 0,
          vy: 0,
          color: COLOR_EXPLOSION,
          direction: 1,
          isDead: false,
          hp: 10, // Life counter (frames)
          maxHp: 10
      });

      this.triggerShake(15);
      audio.explode();
      this.spawnParticles(x, y, COLOR_EXPLOSION, 20);

      // Area Damage Logic
      this.enemies.forEach(e => {
          if (e.isDead || e.type === 'powerup') return;
          
          const centerX = e.x + e.w/2;
          const centerY = e.y + e.h/2;
          const dist = Math.sqrt((centerX - x)**2 + (centerY - y)**2);
          
          if (dist < radius) {
              e.hp -= 20; // Massive damage
              if (e.type === 'boss') audio.bossHit();
              
              if (e.hp <= 0) {
                  e.isDead = true;
                  this.score += e.type === 'boss' ? 5000 : 100;
                  this.spawnParticles(e.x + e.w/2, e.y + e.h/2, e.type === 'boss' ? COLOR_VENOM_SLIME : COLOR_CAPYBARA_FUR, 20);
                  
                  if (e.type === 'boss') {
                      this.victoryTimer = 180;
                      this.stop();
                      audio.powerup();
                      this.player.invulnerableUntil = Date.now() + 10000;
                  }
              }
          }
      });
  }

  spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, 
        y, 
        w: Math.random() * 5 + 2, 
        h: Math.random() * 5 + 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.8) * 12,
        life: 1.0,
        color
      });
    }
  }

  spawnFloatingText(x: number, y: number, text: string) {
      this.particles.push({
          x, y, w: 0, h: 0,
          vx: 0, vy: -1.5,
          life: 2.0, // Lasts longer
          color: '#fff',
          text
      });
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
    
    // Victory Timer
    if (this.victoryTimer > 0) {
        this.victoryTimer--;
        if (this.victoryTimer <= 0) {
            this.isVictory = true;
            return;
        }
    }

    if (this.screenShake > 0) this.screenShake *= 0.9;
    if (this.screenShake < 0.5) this.screenShake = 0;

    // Randomly spawn sensor (More frequent to allow weapon farming)
    if (this.victoryTimer === 0 && this.frameCount % 400 === 0) { 
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
        if (!this.input.down) {
             this.player.vy = JUMP_FORCE;
             audio.jump();
        }
      }
    }

    // Shooting
    if (this.input.fire) {
       const now = Date.now();
       // Enhanced Fire Rates
       let fireRate = 200; // Normal
       if (this.player.weapon === 'machine') fireRate = 80; // Fast!
       if (this.player.weapon === 'laser') fireRate = 250; 
       
       if (now - this.lastShotTime > fireRate) {
         this.lastShotTime = now;
         this.shoot(this.player, BULLET_SPEED, this.player.direction, true);
       }
    }
    
    // Bombing (Skill)
    if (this.input.bomb) {
        const now = Date.now();
        if (now - this.lastBombTime > 500) { // 0.5s cooldown
            if ((this.player.bombs || 0) > 0) {
                this.lastBombTime = now;
                this.throwBomb();
                if (this.player.bombs) this.player.bombs--;
            }
        }
    }

    // Physics
    this.player.vy += GRAVITY;
    this.player.y += this.player.vy;
    this.player.x += this.player.vx;
    if (this.player.y > CANVAS_HEIGHT) {
        if (this.victoryTimer > 0) {
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
          // Floating animation
          if (e.baseY) {
              e.y = e.baseY + Math.sin(this.frameCount * 0.1) * 10;
          }

          if (this.checkCollision(this.player, e)) {
              e.isDead = true;
              audio.powerup();
              
              if (e.subType === 'health') {
                  this.player.hp = Math.min(this.player.hp + 1, this.player.maxHp);
                  this.score += 200;
                  this.spawnFloatingText(e.x, e.y, "HEALTH UP!");
              } else if (e.subType === 'bomb_refill') {
                  this.player.bombs = (this.player.bombs || 0) + 3;
                  this.score += 200;
                  this.spawnFloatingText(e.x, e.y, "BOMBS!");
              } else {
                  // WEAPON PICKUP
                  this.player.weapon = e.subType as any;
                  this.score += 500;
                  
                  let text = "WEAPON!";
                  if (e.subType === 'machine') text = "MACHINE GUN!";
                  if (e.subType === 'spread') text = "SPREAD GUN!";
                  if (e.subType === 'laser') text = "LASER BEAM!";
                  this.spawnFloatingText(e.x, e.y, text);
              }
          }
          return;
      }

      // Boss Logic Overhaul
      if (e.type === 'boss') {
        this.updateBoss(e);
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
      if (b.type === 'beam') {
          b.hp--;
          if (b.hp <= 0) b.isDead = true;
          
          // Beam Collision with Player
          if (this.checkCollision(b, this.player) && !this.player.isDead) {
             if (Date.now() > (this.player.invulnerableUntil || 0)) {
                this.player.hp--;
                this.triggerShake(5);
                audio.explode();
                if (this.player.hp <= 0) {
                    this.player.isDead = true;
                    this.isGameOver = true;
                    this.stop();
                } else {
                    this.player.invulnerableUntil = Date.now() + 2000;
                }
             }
          }
          return; 
      }
      
      // Explosion / Bomb Logic
      if (b.type === 'explosion') {
          b.hp--;
          if (b.hp <= 0) b.isDead = true;
          return;
      }
      if (b.type === 'bomb') {
          b.vy += GRAVITY * 0.5;
          let hit = false;
          if (b.y > CANVAS_HEIGHT) hit = true;
          for(const p of this.platforms) {
              if (this.checkCollision(b, p)) hit = true;
          }
          if (hit) {
              b.isDead = true;
              this.spawnExplosion(b.x + b.w/2, b.y + b.h/2);
              return;
          }
      }
      
      // Normal Bullet Movement
      if (b.type === 'bullet') {
          b.x += b.vx;
          b.y += b.vy;
      }

      // Cleanup off-screen
      if (b.x < this.cameraX - 100 || b.x > this.cameraX + CANVAS_WIDTH + 100) b.isDead = true;
      
      // Wall Collision (Only if NOT penetrating walls)
      if (b.type === 'bullet' && !b.penetratesWalls && this.platforms.some(p => this.checkCollision(b, p))) {
          b.isDead = true;
          this.spawnParticles(b.x, b.y, b.color, 3);
      }

      // Player Bullet Hits Enemy
      if (b.color === COLOR_BULLET || b.color === COLOR_POWERUP_LASER) { 
         this.enemies.forEach(e => {
            if (!e.isDead && e.type !== 'powerup' && this.checkCollision(b, e)) {
               // Logic for penetrating enemies (Laser)
               const alreadyHit = b.hitEnemyIds?.includes(e.id);
               
               if (!alreadyHit) {
                   if (b.penetratesEnemies) {
                       if (!b.hitEnemyIds) b.hitEnemyIds = [];
                       b.hitEnemyIds.push(e.id);
                       // Don't kill bullet
                   } else {
                       b.isDead = true;
                   }

                   e.hp--;
                   this.spawnParticles(b.x, b.y, '#fff', 5);
                   
                   if (e.type === 'boss') {
                       audio.bossHit();
                       // Boss Flash Logic
                       e.invulnerableUntil = Date.now() + 50; 
                       // Boss Phys Recoil
                       e.x += 2; 
                   }

                   if (e.hp <= 0) {
                       e.isDead = true;
                       this.triggerShake(e.type === 'boss' ? 20 : 5);
                       audio.explode();
                       this.score += e.type === 'boss' ? 5000 : 100;
                       this.spawnParticles(e.x + e.w/2, e.y + e.h/2, e.type === 'boss' ? COLOR_VENOM_SLIME : COLOR_CAPYBARA_FUR, 30);
                       
                       if (e.type === 'sensor' || Math.random() < 0.15) {
                           this.spawnPowerUp(e.x, e.y);
                       }

                       if (e.type === 'boss') {
                           this.victoryTimer = 180; 
                           this.stop(); 
                           audio.powerup(); 
                           
                           this.player.invulnerableUntil = Date.now() + 10000;
                           
                           this.enemies.forEach(other => {
                               if (other.type !== 'boss' && other.type !== 'player') other.isDead = true;
                           });
                           this.bullets.forEach(b => b.isDead = true);
                       }
                   }
               }
            }
         });
      } else if (b.type === 'bullet') { // Enemy Bullet Hits Player
         const playerHitbox = { ...this.player };
         if (this.input.down) {
             playerHitbox.y += 24; 
             playerHitbox.h = 24;
         }

         if (!this.player.isDead && this.checkCollision(b, playerHitbox)) {
            if (Date.now() > (this.player.invulnerableUntil || 0)) {
                b.isDead = true;
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

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5; // Gravity for normal particles
      p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updateBoss(boss: Entity) {
      const levelId = this.levelConfig.id;
      
      // MOVEMENT PATTERNS VARY BY BOSS TYPE
      
      let bossHoverSpeed = 0.03 + (levelId * 0.005);
      
      // Default Target Position
      let targetY = (CANVAS_HEIGHT - 320) + Math.sin(this.frameCount * bossHoverSpeed) * 60;
      let targetX = boss.x; // Stay put horizontally by default (scrolling is managed by cameraX usually)

      // Aggressive swooping for higher levels
      if (levelId >= 3 && boss.attackState === 'idle') {
           // Occasionally swoop towards player Y
           targetY += Math.sin(this.frameCount * 0.05) * 40;
           targetX += Math.cos(this.frameCount * 0.04) * 2;
      }
      
      if (boss.targetY !== undefined) {
          // Smooth Lerp
          boss.y += (targetY - boss.y) * 0.05;
          // Add organic noise to X
          boss.x += (Math.sin(this.frameCount * 0.1) * 0.5);
      } else {
          boss.targetY = targetY;
      }
      
      // Safety Bounds
      if (boss.y < 0) boss.y = 0;
      if (boss.y > CANVAS_HEIGHT - 100) boss.y = CANVAS_HEIGHT - 100;

      // 2. Breathing Animation (Squash & Stretch)
      let breatheSpeed = 0.1;
      let breatheIntensity = 0.03;
      
      // 3. State Machine & Coordination
      if (boss.attackState === 'charging_beam') {
          breatheSpeed = 0.4; // Rapid breathing
          breatheIntensity = 0.1;
          boss.x += (Math.random() - 0.5) * 6; // Violent Shaking
          
          // Suck in effect
          boss.animScaleX = 0.9;
          boss.animScaleY = 1.1;
          
      } else if (boss.attackState === 'firing_beam') {
          // Recoil 
          boss.x += 2; 
          boss.animScaleX = 1.2; 
          boss.animScaleY = 0.8;
      } else {
          // Idle Breathing
          boss.animScaleX = 1.0 + Math.sin(this.frameCount * breatheSpeed) * breatheIntensity;
          boss.animScaleY = 1.0 + Math.cos(this.frameCount * breatheSpeed) * breatheIntensity;
      }
      
      // 4. Tentacle Inverse Kinematics / Physics
      if (boss.tentacles) {
          boss.tentacles.forEach((tentacle, tIndex) => {
             // Calculate target for the tip of the tentacle
             let targetX = boss.x - 100;
             let targetY = boss.y + 100;

             // Dynamic Tentacle Logic based on Boss Type
             if (boss.attackState === 'charging_beam') {
                 // Curl in defensively
                 targetX = boss.x + 40;
                 targetY = boss.y + boss.h/2 + (tIndex % 2 === 0 ? -40 : 40);
             } else if (boss.attackState === 'firing_beam') {
                 // Flair out backwards dramatically
                 targetX = boss.x + 200;
                 targetY = boss.y + boss.h/2 + (tIndex - 1.5) * 120;
             } else {
                 // Idle / Hunting
                 // Reach towards player slightly
                 const reachFactor = 0.3;
                 const px = this.player.x;
                 const py = this.player.y;
                 
                 // Sine wave float
                 const waveX = Math.sin(this.frameCount * 0.05 + tIndex) * 50;
                 const waveY = Math.cos(this.frameCount * 0.07 + tIndex) * 50;
                 
                 targetX = boss.x - 60 + waveX + (px - boss.x) * reachFactor;
                 targetY = boss.y + boss.h/2 + waveY + (py - boss.y) * reachFactor;
             }

             // Attach first segment to body
             const attachX = boss.x + 40;
             const attachY = boss.y + 60 + (tIndex * 20) - (boss.tentacles!.length * 10);
             tentacle[0].x = attachX;
             tentacle[0].y = attachY;

             // Move other segments
             for (let i = 1; i < tentacle.length; i++) {
                 let destX, destY;
                 
                 if (i === tentacle.length - 1 && boss.attackState !== 'firing_beam') {
                     destX = targetX;
                     destY = targetY;
                 } else {
                     destX = tentacle[i-1].x;
                     destY = tentacle[i-1].y;
                 }
                 
                 // Lerp for organic lag
                 const drag = 0.15 + (i * 0.02); 
                 tentacle[i].x += (destX - tentacle[i].x) * drag;
                 tentacle[i].y += (destY - tentacle[i].y) * drag;
                 
                 // Constraints (Distance)
                 const dx = tentacle[i].x - tentacle[i-1].x;
                 const dy = tentacle[i].y - tentacle[i-1].y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 const maxLen = 25;
                 if (dist > maxLen) {
                     const angle = Math.atan2(dy, dx);
                     tentacle[i].x = tentacle[i-1].x + Math.cos(angle) * maxLen;
                     tentacle[i].y = tentacle[i-1].y + Math.sin(angle) * maxLen;
                 }
             }
          });
      }

      // Attack Timers
      if (boss.attackTimer && boss.attackTimer > 0) {
          boss.attackTimer--;
      }

      // Beam Attack Execution
      if (boss.attackState === 'charging_beam') {
          if (boss.attackTimer === 0) {
              boss.attackState = 'firing_beam';
              boss.attackTimer = 60; 
              this.triggerShake(15);
              audio.explode(); 
              
              // Beam visual width varies by level
              const beamHeight = 50 + (levelId * 5);

              this.bullets.push({
                 id: Math.random().toString(),
                 type: 'beam',
                 x: 0, 
                 y: boss.y + boss.h / 2 - beamHeight/2, 
                 w: boss.x + 40, // Originates from boss mouth
                 h: beamHeight,
                 vx: 0,
                 vy: 0,
                 color: levelId % 2 === 0 ? '#ff0000' : '#ff00ff', // Red or Purple beam
                 direction: -1,
                 isDead: false,
                 hp: 60, 
                 maxHp: 60,
                 penetratesWalls: true,
                 penetratesEnemies: true
              });
              
              // Recoil Impulse
              boss.vx = 8; 
          }
      } else if (boss.attackState === 'firing_beam') {
          if (boss.attackTimer === 0) {
              boss.attackState = 'idle';
              boss.attackTimer = Math.max(100, 200 - levelId * 10); 
          }
      } else if (boss.attackState === 'idle') {
          if (boss.attackTimer === 0) {
              const rand = Math.random();
              const canBeam = true; // All bosses can beam now
              const canSpore = levelId >= 2; 
              
              if (canBeam && rand < 0.35) {
                   boss.attackState = 'charging_beam';
                   boss.attackTimer = 90; 
              } else if (canSpore && rand < 0.7) {
                   this.performSporeRain(boss);
                   boss.attackTimer = Math.max(80, 140 - levelId * 10);
                   // Visual bump up
                   boss.y -= 30; 
              } else {
                   this.performStandardShot(boss);
                   boss.attackTimer = Math.max(50, 100 - levelId * 10);
              }
          }
      }
  }

  // --- Boss Attack Helpers ---
  performStandardShot(boss: Entity) {
      const dx = (this.player.x + this.player.w/2) - (boss.x + boss.w/2);
      const dy = (this.player.y + this.player.h/2) - (boss.y + boss.h/2);
      const dist = Math.sqrt(dx*dx + dy*dy);
      const speed = 8;
      
      const levelId = this.levelConfig.id;
      const bulletColor = levelId % 2 === 0 ? COLOR_CARNAGE_SLIME : COLOR_VENOM_SLIME;

      // Primary Aimed Shot
      this.bullets.push({
          id: Math.random().toString(),
          type: 'bullet', x: boss.x + 20, y: boss.y + boss.h/2, w: 24, h: 24,
          vx: (dx/dist) * speed, vy: (dy/dist) * speed,
          color: bulletColor, direction: -1, isDead: false, hp: 1, maxHp: 1,
          penetratesWalls: levelId >= 3,
          penetratesEnemies: false
      });

      // Spread Shot (Level 3+)
      if (levelId >= 3) {
           this.bullets.push({
              id: Math.random().toString(),
              type: 'bullet', x: boss.x + 20, y: boss.y + boss.h/2 - 20, w: 16, h: 16,
              vx: (dx/dist) * speed, vy: (dy/dist) * speed - 2,
              color: bulletColor, direction: -1, isDead: false, hp: 1, maxHp: 1,
              penetratesWalls: false,
              penetratesEnemies: false
          });
          this.bullets.push({
              id: Math.random().toString(),
              type: 'bullet', x: boss.x + 20, y: boss.y + boss.h/2 + 20, w: 16, h: 16,
              vx: (dx/dist) * speed, vy: (dy/dist) * speed + 2,
              color: bulletColor, direction: -1, isDead: false, hp: 1, maxHp: 1,
              penetratesWalls: false,
              penetratesEnemies: false
          });
      }
  }

  performSporeRain(boss: Entity) {
      const bulletColor = this.levelConfig.id % 2 === 0 ? COLOR_CARNAGE_SKIN : COLOR_SENSOR;
      // Shoots projectiles upwards that fall down
      for(let i=0; i<4; i++) {
          this.bullets.push({
              id: Math.random().toString(),
              type: 'bullet',
              x: boss.x + boss.w/2 + (Math.random() * 40 - 20),
              y: boss.y + 20,
              w: 16,
              h: 16,
              vx: -Math.random() * 8 - 4, // Leftward random arc
              vy: -Math.random() * 6 - 8, // Upward
              color: bulletColor, 
              direction: -1,
              isDead: false,
              hp: 1,
              maxHp: 1,
              penetratesWalls: false,
              penetratesEnemies: false
          });
      }
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
    
    // Starfield/Spores
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for(let i=0; i<50; i++) {
        const x = (i * 137 + this.cameraX * 0.5) % CANVAS_WIDTH; 
        const y = (i * 97) % CANVAS_HEIGHT;
        const size = (i % 3) + 1;
        this.ctx.fillRect(x, y, size, size);
    }
    
    this.ctx.translate(-Math.floor(this.cameraX), 0);

    // 2. Draw Platforms
    this.platforms.forEach(p => {
      this.ctx.fillStyle = this.levelConfig.theme.platformBody;
      this.ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
      this.ctx.fillStyle = this.levelConfig.theme.platformTop;
      this.ctx.fillRect(p.x, p.y, p.w, 8);
      // Extra details (dripping slime for some levels)
      if (this.levelConfig.id >= 2) {
         this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
         this.ctx.fillRect(p.x, p.y + p.h, p.w, 5); 
      }
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

    // 5. Draw Bullets & Bombs & Beams
    this.bullets.forEach(b => {
      if (b.type === 'beam') {
          // Draw Hyper Beam
          this.ctx.save();
          // Warning flicker or Full Beam
          
          if (b.hp > 0) {
               // Core Beam
               this.ctx.fillStyle = b.color;
               this.ctx.globalAlpha = 0.6 + Math.sin(this.frameCount) * 0.2;
               this.ctx.fillRect(this.cameraX, b.y + 10, CANVAS_WIDTH, b.h - 20);
               
               // Inner White Core
               this.ctx.fillStyle = '#fff';
               this.ctx.globalAlpha = 0.9;
               this.ctx.fillRect(this.cameraX, b.y + 25, CANVAS_WIDTH, 10);
               
               // Outer Glow
               this.ctx.shadowBlur = 20;
               this.ctx.shadowColor = b.color;
          }
          this.ctx.restore();
          
      } else if (b.type === 'explosion') {
          // Draw Explosion
          this.ctx.fillStyle = b.color;
          this.ctx.beginPath();
          this.ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2 * (b.hp / 10), 0, Math.PI*2);
          this.ctx.fill();
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/4 * (b.hp / 10), 0, Math.PI*2);
          this.ctx.fill();
      } else if (b.type === 'bomb') {
          // Draw Bomb
          this.ctx.fillStyle = b.color;
          this.ctx.beginPath();
          this.ctx.arc(b.x, b.y, 6, 0, Math.PI*2);
          this.ctx.fill();
          // Flashing red light
          this.ctx.fillStyle = (Math.floor(this.frameCount / 5) % 2 === 0) ? '#ef4444' : '#000';
          this.ctx.beginPath();
          this.ctx.arc(b.x + 2, b.y - 2, 2, 0, Math.PI*2);
          this.ctx.fill();
      } else {
          // Regular Bullets
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = b.color;
          this.ctx.fillStyle = '#fff'; // White core
          
          this.ctx.beginPath();
          if (b.color === COLOR_BULLET || b.color === COLOR_POWERUP_LASER) {
              if (b.color === COLOR_POWERUP_LASER) {
                   // Laser Shape
                   this.ctx.shadowBlur = 15;
                   this.ctx.fillStyle = COLOR_POWERUP_LASER;
                   this.ctx.fillRect(b.x, b.y + 2, b.w, 6);
                   this.ctx.fillStyle = '#fff';
                   this.ctx.fillRect(b.x + 2, b.y + 3, b.w - 4, 4);
              } else {
                  // Player Bullet (Round)
                  this.ctx.arc(b.x, b.y, b.w/2, 0, Math.PI * 2);
              }
          } else {
              // Enemy Slime Bullet (Wobbly)
              const r = b.w/2;
              const wobble = Math.sin(this.frameCount * 0.5) * 2;
              this.ctx.arc(b.x, b.y, r + wobble, 0, Math.PI * 2);
              this.ctx.fillStyle = b.color; // Slime color full fill
          }
          this.ctx.fill();
          this.ctx.shadowBlur = 0;
      }
    });
    
    // 6. Draw Particles
    this.particles.forEach(p => {
      this.ctx.globalAlpha = Math.max(0, p.life);
      
      if (p.text) {
          // Floating Text
          this.ctx.fillStyle = '#fff';
          this.ctx.shadowColor = '#000';
          this.ctx.shadowOffsetX = 2;
          this.ctx.shadowOffsetY = 2;
          this.ctx.font = '10px "Press Start 2P"';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(p.text, p.x, p.y);
          this.ctx.shadowOffsetX = 0;
          this.ctx.shadowOffsetY = 0;
      } else {
          // Standard Rect Particle
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();

    // 7. HUD
    if (this.victoryTimer === 0 || Math.floor(this.frameCount / 10) % 2 === 0) {
         this.drawHUD();
    }
    
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
      // FALCON CAPSULE STYLE
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = e.color;
      
      const centerX = e.x + e.w / 2;
      const centerY = e.y + e.h / 2;
      
      // Wings
      this.ctx.fillStyle = '#e2e8f0'; // Silver wings
      this.ctx.beginPath();
      const wingSpread = Math.sin(this.frameCount * 0.2) * 2; // Flapping
      this.ctx.moveTo(centerX, centerY + 10);
      this.ctx.lineTo(centerX - 24, centerY - 8 + wingSpread);
      this.ctx.lineTo(centerX - 16, centerY + 6 + wingSpread);
      this.ctx.lineTo(centerX, centerY + 10);
      this.ctx.lineTo(centerX + 16, centerY + 6 + wingSpread);
      this.ctx.lineTo(centerX + 24, centerY - 8 + wingSpread);
      this.ctx.fill();

      // Capsule Body (Silver/Grey Container)
      this.ctx.fillStyle = '#cbd5e1';
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, 14, 18, 0, 0, Math.PI*2);
      this.ctx.fill();
      
      // Inner Color (Weapon Type)
      this.ctx.fillStyle = e.color;
      this.ctx.beginPath();
      this.ctx.ellipse(centerX, centerY, 10, 14, 0, 0, Math.PI*2);
      this.ctx.fill();
      
      // Letter
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '700 14px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      let symbol = 'S';
      if (e.subType === 'machine') symbol = 'M';
      if (e.subType === 'health') symbol = '+';
      if (e.subType === 'bomb_refill') symbol = 'B';
      if (e.subType === 'laser') symbol = 'L';
      
      this.ctx.fillText(symbol, centerX, centerY + 1);
  }
  
  drawSensor(e: Entity) {
      // Symbiote Spore Sensor
      this.ctx.fillStyle = COLOR_SENSOR;
      this.ctx.beginPath();
      this.ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2, 0, Math.PI*2);
      this.ctx.fill();
      
      // Veins
      this.ctx.strokeStyle = '#a855f7';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(e.x + 5, e.y + 5);
      this.ctx.lineTo(e.x + e.w - 5, e.y + e.h - 5);
      this.ctx.stroke();

      // Blinking eye
      this.ctx.fillStyle = (Math.floor(this.frameCount / 10) % 2 === 0) ? '#ef4444' : '#000';
      this.ctx.beginPath();
      this.ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/4, 0, Math.PI*2);
      this.ctx.fill();
  }

  drawPlayer() {
    const p = this.player;
    const isMoving = Math.abs(p.vx) > 0;
    const isCrouching = this.input.down;
    const bob = isMoving ? Math.sin(this.frameCount * 0.4) * 3 : 0;
    const dir = p.direction;

    // Adjust drawing Y base based on crouch
    // If crouching, we essentially ignore the top half of the bounding box
    const drawY = isCrouching ? p.y + 24 : p.y; 
    
    // Pants
    this.ctx.fillStyle = COLOR_PLAYER_PANTS;
    if (isCrouching) {
        // Squatting legs (wide base)
        this.ctx.fillRect(p.x + 2, drawY + 20, 20, 4);
        this.ctx.fillRect(p.x + 2, drawY + 14, 6, 6); // Left knee
        this.ctx.fillRect(p.x + 16, drawY + 14, 6, 6); // Right knee
    } else {
        // Standing legs
        this.ctx.fillRect(p.x + (dir === 1 ? 2 : 14), drawY + 28 + bob, 8, 20);
        this.ctx.fillRect(p.x + (dir === 1 ? 14 : 2), drawY + 28 - bob, 8, 20);
        // Boots
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(p.x + (dir === 1 ? 2 : 14), drawY + 44 + bob, 10, 4);
        this.ctx.fillRect(p.x + (dir === 1 ? 14 : 2), drawY + 44 - bob, 10, 4);
    }

    // Torso (Vest)
    this.ctx.fillStyle = COLOR_PLAYER; 
    this.ctx.fillRect(p.x + 4, drawY + 12 + (isCrouching ? 0 : bob), 16, 16);
    this.ctx.fillStyle = '#1e3a8a'; 
    this.ctx.fillRect(p.x + 4, drawY + 18 + (isCrouching ? 0 : bob), 16, 10);

    // Head
    this.ctx.fillStyle = COLOR_PLAYER;
    this.ctx.fillRect(p.x + 6, drawY + (isCrouching ? 2 : bob), 12, 12);
    
    // Headband
    this.ctx.fillStyle = COLOR_PLAYER_HEADBAND;
    this.ctx.fillRect(p.x + 5, drawY + 2 + (isCrouching ? 2 : bob), 14, 4);
    if (isMoving && !isCrouching) {
        this.ctx.fillRect(p.x + (dir === 1 ? -6 : 18), drawY + 4 + bob + Math.sin(this.frameCount) * 3, 8, 3);
    }

    // Gun
    this.ctx.fillStyle = '#1f2937';
    if (this.input.up) {
       this.ctx.fillRect(p.x + 8, drawY - 10 + bob, 4, 30);
       this.ctx.fillRect(p.x + 6, drawY + 10 + bob, 8, 6);
    } else {
       // Crouch gun position
       const gunY = drawY + 16 + (isCrouching ? 0 : bob);
       this.ctx.fillRect(p.x + (dir === 1 ? 8 : -12), gunY, 28, 6);
       this.ctx.fillRect(p.x + (dir === 1 ? 4 : 16), gunY, 4, 8);
    }
  }

  drawSoldier(e: Entity) {
      // CAPYBARA DRAWING LOGIC (Realistic Pixel Art Style)
      const bob = Math.sin(this.frameCount * 0.2) * 2;
      const dir = e.vx > 0 ? 1 : -1;
      const flip = dir === -1;
      
      // Colors
      const furColor = COLOR_CAPYBARA_FUR; // #8B4513
      const noseColor = COLOR_CAPYBARA_NOSE; // Dark Nose
      const legColor = '#5D4037'; // Darker limbs
      
      // 1. Draw Legs (Background/Far side)
      // Animated slightly opposite to body bob
      const legAnim = Math.sin(this.frameCount * 0.4) * 4;
      
      this.ctx.fillStyle = legColor;
      // Back Leg (Far)
      this.ctx.fillRect(e.x + (flip ? e.w - 14 : 10) - legAnim, e.y + e.h - 8, 5, 8);
      // Front Leg (Far)
      this.ctx.fillRect(e.x + (flip ? 10 : e.w - 14) + legAnim, e.y + e.h - 8, 5, 8);

      // 2. Draw Main Body (The "Loaf")
      this.ctx.fillStyle = furColor;
      // Main block (rounded top and bottom by omitting corners)
      this.ctx.fillRect(e.x + 2, e.y + 8 + bob, e.w - 4, e.h - 12);
      // Top roundness
      this.ctx.fillRect(e.x + 4, e.y + 6 + bob, e.w - 8, 2);
      // Bottom roundness
      this.ctx.fillRect(e.x + 4, e.y + e.h - 4 + bob, e.w - 8, 2);
      
      // 3. Draw Head
      // Capybaras have a very rectangular, boxy head
      const headW = 18;
      const headH = 16;
      // Head position depends on direction
      const headX = flip ? e.x - 2 : e.x + e.w - headW + 2;
      const headY = e.y + 4 + bob;

      this.ctx.fillStyle = furColor;
      this.ctx.fillRect(headX, headY, headW, headH);
      
      // Snout shading (darker bridge)
      this.ctx.fillStyle = '#793e11'; 
      const snoutX = flip ? headX : headX + 8;
      this.ctx.fillRect(snoutX, headY, 10, 6);

      // Nose (Nostrils)
      this.ctx.fillStyle = noseColor;
      const noseX = flip ? headX : headX + headW - 4;
      this.ctx.fillRect(noseX, headY + 4, 4, 5);

      // Ear (Small rounded flap on top)
      this.ctx.fillStyle = COLOR_CAPYBARA_EAR;
      const earX = flip ? headX + 12 : headX + 2;
      this.ctx.fillRect(earX, headY - 2, 4, 4);

      // Eye (Chill expression - Half closed)
      this.ctx.fillStyle = '#000';
      const eyeX = flip ? headX + 8 : headX + 6;
      const eyeY = headY + 5;
      this.ctx.fillRect(eyeX, eyeY, 3, 3); // Pupil
      // Heavy Eyelid
      this.ctx.fillStyle = '#5D4037';
      this.ctx.fillRect(eyeX, headY + 4, 4, 2);

      // 4. Draw Legs (Foreground/Near side)
      this.ctx.fillStyle = furColor;
      // Back Leg (Near)
      this.ctx.fillRect(e.x + (flip ? e.w - 14 : 10) + legAnim, e.y + e.h - 10 + bob, 5, 10);
      // Front Leg (Near)
      this.ctx.fillRect(e.x + (flip ? 10 : e.w - 14) - legAnim, e.y + e.h - 10 + bob, 5, 10);

      // 5. Weapon (Strap and Gun)
      this.ctx.fillStyle = '#222';
      const gunX = e.x + e.w/2 - 6;
      const gunY = e.y + 10 + bob;
      
      // Gun body (Receiver)
      this.ctx.fillRect(gunX, gunY, 12, 12);
      
      // Barrel
      this.ctx.fillStyle = '#111';
      if (flip) {
          this.ctx.fillRect(e.x - 5, gunY + 4, 15, 4);
      } else {
          this.ctx.fillRect(e.x + e.w - 10, gunY + 4, 15, 4);
      }
      
      // Strap
      this.ctx.fillStyle = '#3e2723';
      this.ctx.fillRect(gunX + 4, gunY - 2, 4, 14);
  }

  drawBoss(boss: Entity) {
      this.ctx.save();
      
      // BOSS HIT FLASH
      if (boss.invulnerableUntil && Date.now() < boss.invulnerableUntil) {
          this.ctx.globalCompositeOperation = 'source-atop';
          this.ctx.fillStyle = '#ffffff';
          // Draw rect slightly larger to cover wobbles
          this.ctx.fillRect(boss.x - 20, boss.y - 20, boss.w + 40, boss.h + 40);
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.restore();
          return;
      }

      const t = this.frameCount;
      const levelId = this.levelConfig.id;
      const isCarnage = levelId % 2 === 0; 
      
      const mainColor = isCarnage ? COLOR_CARNAGE_SKIN : COLOR_VENOM_SKIN;
      const slimeColor = isCarnage ? COLOR_CARNAGE_SLIME : COLOR_VENOM_SLIME;

      // Determine Boss Type Visuals
      const isTypeA = levelId <= 2;
      const isTypeB = levelId >= 3 && levelId <= 5;
      const isTypeC = levelId >= 6;

      // Center pivot for scaling
      const cx = boss.x + boss.w/2;
      const cy = boss.y + boss.h/2;
      
      this.ctx.translate(cx, cy);
      
      // Robust Scale (prevent NaN or zero)
      const sx = Math.max(0.1, boss.animScaleX || 1);
      const sy = Math.max(0.1, boss.animScaleY || 1);
      this.ctx.scale(sx, sy);
      
      // FORCE VISIBILITY: Glow/Shadow
      // Ensure boss is visible even on dark backgrounds
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#ffffff';

      // --- 1. IK TENTACLES (Back Layer) ---
      if (boss.tentacles && boss.tentacles.length > 0) {
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          
          boss.tentacles.forEach((tentacle, i) => {
              if (!tentacle || tentacle.length < 2) return;

              // Tentacles are relative to center after translate
              const startX = tentacle[0].x - cx;
              const startY = tentacle[0].y - cy;
              
              // Draw Main Tentacle Path
              this.ctx.beginPath();
              this.ctx.strokeStyle = '#000'; // Outline
              this.ctx.lineWidth = 14;
              this.ctx.moveTo(startX, startY);
              
              for(let j=1; j<tentacle.length; j++) {
                   const p0 = tentacle[j-1];
                   const p1 = tentacle[j];
                   if (!p0 || !p1) continue;

                   const midX = (p0.x + p1.x) / 2 - cx;
                   const midY = (p0.y + p1.y) / 2 - cy;
                   this.ctx.quadraticCurveTo(p0.x - cx, p0.y - cy, midX, midY);
              }
              this.ctx.stroke();

              // Inner Color
              this.ctx.strokeStyle = mainColor;
              this.ctx.lineWidth = 10;
              this.ctx.stroke();
          });
      }

      // --- 2. MAIN BODY ---
      
      // Core Body Base
      this.ctx.fillStyle = '#000'; 
      const baseR = boss.w / 2;
      
      if (isTypeA) {
          // BLOB SHAPE - Draw a reliable circle instead of ellipse for robustness
          this.ctx.beginPath();
          // Fallback: ellipse replacement using arc and scale
          this.ctx.save();
          this.ctx.scale(1, 0.9);
          this.ctx.arc(0, 10, baseR, 0, Math.PI*2);
          this.ctx.restore();
          this.ctx.fill();
          
          this.ctx.fillStyle = mainColor;
          this.ctx.beginPath();
          this.ctx.save();
          this.ctx.scale(1, 0.9);
          this.ctx.arc(0, 10, baseR - 4, 0, Math.PI*2);
          this.ctx.restore();
          this.ctx.fill();

      } else if (isTypeB) {
          // SPIKY CARAPACE
          this.ctx.beginPath();
          this.ctx.moveTo(-50, -60);
          this.ctx.lineTo(0, -80); 
          this.ctx.lineTo(50, -60);
          this.ctx.lineTo(70, 0);
          this.ctx.lineTo(0, 70); 
          this.ctx.lineTo(-70, 0);
          this.ctx.fill(); // Black BG
          
          this.ctx.fillStyle = mainColor;
          this.ctx.beginPath();
          this.ctx.moveTo(-45, -55);
          this.ctx.lineTo(0, -75); 
          this.ctx.lineTo(45, -55);
          this.ctx.lineTo(65, 0);
          this.ctx.lineTo(0, 65);
          this.ctx.lineTo(-65, 0);
          this.ctx.fill(); 

      } else {
          // CHAOS CLOUD
          this.ctx.fillStyle = '#000';
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 50, 0, Math.PI*2);
          this.ctx.fill();
          this.ctx.fillStyle = mainColor;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 40, 0, Math.PI*2);
          this.ctx.fill();
      }

      // --- 3. EYES & FACE (Simple Tracking) ---
      
      const px = this.player.x + this.player.w/2;
      const py = this.player.y + this.player.h/2;
      const dx = px - (boss.x + boss.w/2);
      const dy = py - (boss.y + boss.h/2);
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      
      const trackX = (dx / dist) * 10;
      const trackY = (dy / dist) * 10;

      // Always draw big eyes for visibility
      this.ctx.fillStyle = '#fff';
      
      // Left Eye
      this.ctx.beginPath();
      this.ctx.arc(-30, -20, 12, 0, Math.PI*2);
      this.ctx.fill();
      
      // Right Eye
      this.ctx.beginPath();
      this.ctx.arc(30, -20, 12, 0, Math.PI*2);
      this.ctx.fill();
      
      // Pupils
      this.ctx.fillStyle = '#000';
      this.ctx.beginPath(); 
      this.ctx.arc(-30 + trackX, -20 + trackY, 4, 0, Math.PI*2); 
      this.ctx.fill();
      this.ctx.beginPath(); 
      this.ctx.arc(30 + trackX, -20 + trackY, 4, 0, Math.PI*2); 
      this.ctx.fill();

      // DEBUG / FALLBACK RING
      // If for some reason the boss is invisible, this red ring will show
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, boss.w/2 + 20, 0, Math.PI*2);
      this.ctx.stroke();

      this.ctx.restore();
  }

  drawHUD() {
      this.ctx.save();
      
      // HUD Font
      this.ctx.font = 'bold 16px monospace';
      this.ctx.shadowColor = '#000';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;

      // Score
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);

      // HP
      this.ctx.fillStyle = '#ef4444';
      let hpString = '';
      for(let i=0; i<Math.max(0, this.player.hp); i++) {
          hpString += '♥ ';
      }
      this.ctx.fillText(`HP: ${hpString}`, 20, 55);
      
      // Bombs
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.fillText(`BOMBS: ${this.player.bombs || 0}`, 20, 80);

      // Weapon
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#60a5fa'; 
      this.ctx.fillText(`WEAPON: ${(this.player.weapon || 'NORMAL').toUpperCase()}`, CANVAS_WIDTH - 20, 30);

      // Boss Health
      if (this.boss && !this.boss.isDead) {
          const barW = 300;
          const barH = 14;
          const barX = (CANVAS_WIDTH - barW) / 2;
          const barY = CANVAS_HEIGHT - 30;
          
          // Bg
          this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
          this.ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
          
          // Health
          const ratio = this.boss.hp / this.boss.maxHp;
          this.ctx.fillStyle = '#ef4444';
          this.ctx.fillRect(barX, barY, barW * Math.max(0, ratio), barH);
          
          // Text
          this.ctx.fillStyle = '#ffffff';
          this.ctx.textAlign = 'center';
          this.ctx.font = 'bold 10px monospace';
          this.ctx.fillText("BOSS DETECTED", CANVAS_WIDTH / 2, barY - 8);
      }

      this.ctx.restore();
  }
}
