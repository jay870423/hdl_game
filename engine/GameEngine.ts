
import { 
  Entity, 
  Platform, 
  InputState, 
  Rect, 
  Particle,
  LevelConfig,
  PowerUpType,
  Point,
  EnemyClass
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
  COLOR_ENEMY_VEST,
  COLOR_ENEMY_VISOR,
  COLOR_BOSS_ARMOR,
  COLOR_BOSS_CORE,
  COLOR_VENOM_SKIN,
  COLOR_VENOM_SLIME,
  COLOR_CARNAGE_SKIN,
  COLOR_CARNAGE_SLIME,
  COLOR_POWERUP_SPREAD,
  COLOR_POWERUP_MACHINE,
  COLOR_POWERUP_LASER,
  COLOR_POWERUP_HEALTH,
  COLOR_SENSOR,
  COLOR_BOMB,
  COLOR_EXPLOSION,
  BILLBOARD_BRANDS
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
  decorations: Entity[] = []; // Billboards and background props
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
          
          // ADD BILLBOARDS (Ads Opportunity) - Randomly place them on platforms
          if (Math.random() > 0.6) {
              const brand = BILLBOARD_BRANDS[Math.floor(Math.random() * BILLBOARD_BRANDS.length)];
              this.decorations.push({
                  id: `billboard-${currentX}`,
                  type: 'decoration',
                  x: currentX + w/2 - 40,
                  y: y - 50, // Sit on platform
                  w: 80,
                  h: 40,
                  vx: 0, vy: 0,
                  color: brand.bg,
                  secondaryColor: brand.color,
                  text: brand.text,
                  isDead: false,
                  hp: 1, maxHp: 1, direction: 1
              });
          }

          // Add Enemies: Now with variety!
          if (Math.random() > 0.2) {
            // Determine enemy type based on position/randomness
            let type: EnemyClass = 'runner';
            const r = Math.random();
            
            if (r > 0.7) type = 'sniper';
            else if (r > 0.9) type = 'drone';
            
            // Drones spawn higher
            const spawnY = type === 'drone' ? y - 100 - Math.random()*50 : y - 40;
            
            this.spawnEnemy(currentX + w / 2, spawnY, type);
          }
          
          if (Math.random() > 0.6) {
             this.createPlatform(currentX + 50, y - 100, w - 40, 20);
             // High platforms get snipers
             this.spawnEnemy(currentX + w / 2, y - 140, 'sniper');
          }
      } else {
          // Add floating islands over pit
          this.createPlatform(currentX, CANVAS_HEIGHT - 150, 60, 20);
          // Pits might have drones hovering
          if (Math.random() > 0.5) {
              this.spawnEnemy(currentX + 30, CANVAS_HEIGHT - 200, 'drone');
          }
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

  spawnEnemy(x: number, y: number, enemyClass: EnemyClass) {
    const isDrone = enemyClass === 'drone';
    // const isSniper = enemyClass === 'sniper';
    
    // Drones float, others use gravity
    const vy = isDrone ? 0 : 0;
    // Snipers don't move X usually
    const vx = enemyClass === 'sniper' ? 0 : (isDrone ? -ENEMY_SPEED * 1.5 : -ENEMY_SPEED);

    this.enemies.push({
      id: Math.random().toString(),
      type: 'enemy',
      enemyClass,
      x,
      y,
      w: 40, 
      h: isDrone ? 30 : 36, // Soldiers are slightly taller
      vx, 
      vy,
      color: COLOR_CAPYBARA_FUR,
      direction: -1,
      isDead: false,
      hp: isDrone ? 1 : 2, // Soldiers are tougher
      maxHp: isDrone ? 1 : 2,
      frameTimer: Math.floor(Math.random() * 100) // Desync animations
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

    const startX = shooter.x + (direction > 0 ? shooter.w : 0);
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
        // Normal & Machine Gun & Enemy Fire
        let vx = direction * speed;
        let vy = 0;
        
        if (isPlayer && this.input.up) {
            vy = -speed;
            if (this.input.right) vx = speed;
            else if (this.input.left) vx = -speed;
            else vx = 0;
        } else if (!isPlayer) {
            // Enemy aiming logic (simple prediction)
            if (shooter.enemyClass === 'sniper' || shooter.enemyClass === 'drone') {
                const dx = (this.player.x + this.player.w/2) - startX;
                const dy = (this.player.y + this.player.h/2) - startY;
                const mag = Math.sqrt(dx*dx + dy*dy);
                vx = (dx/mag) * speed;
                vy = (dy/mag) * speed;
            }
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
          w: isPlayer ? 10 : 8,
          h: isPlayer ? 10 : 8,
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
      } else if (e.type === 'decoration') {
          // Decorations are passive background objects
      } else {
        // ENEMY COMBAT LOGIC
        if (e.x > this.cameraX - 100 && e.x < this.cameraX + CANVAS_WIDTH + 100) {
            
            // Movement Logic
            if (e.enemyClass === 'drone') {
                e.y += Math.sin(this.frameCount * 0.1 + parseFloat(e.id)) * 2;
                e.x += e.vx;
            } else if (e.enemyClass === 'sniper') {
                // Snipers don't move X, they camp
                // Look at player
                e.direction = this.player.x < e.x ? -1 : 1;
            } else {
                // Runners (Standard)
                e.vy += GRAVITY;
                e.x += e.vx;
                e.y += e.vy;
            }

            // Platform Collision for walking enemies
            if (e.enemyClass !== 'drone') {
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

            // SHOOTING LOGIC
            // Check if on screen and not dead
            if (e.x > this.cameraX && e.x < this.cameraX + CANVAS_WIDTH) {
                // Fire rate differs by class
                let fireRate = 200; // default frames
                if (e.enemyClass === 'sniper') fireRate = 180;
                if (e.enemyClass === 'drone') fireRate = 220;
                if (e.enemyClass === 'runner') fireRate = 300;

                // Add randomness to fire rate
                const fireTick = (this.frameCount + parseInt(e.id.slice(-3))) % fireRate;
                
                if (fireTick === 0) {
                    // Shoot towards player
                    const speed = 4;
                    this.shoot(e, speed, e.direction, false);
                }
            }
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
            if (!e.isDead && e.type !== 'powerup' && e.type !== 'decoration' && this.checkCollision(b, e)) {
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
        if (!e.isDead && e.type !== 'powerup' && e.type !== 'decoration' && !this.player.isDead && this.checkCollision(this.player, e)) {
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
    
    // Clean up decorations
    this.decorations = this.decorations.filter(d => d.x > this.cameraX - 100);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.5; // Gravity for normal particles
      p.life -= 0.05;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updateBoss(boss: Entity) {
      if (boss.isDead) return;
      
      const t = this.frameCount;

      // 1. Movement & Hovering
      // Boss attempts to stay on screen right
      const targetX = this.cameraX + CANVAS_WIDTH - 200 - (boss.w / 2);
      const targetY = (boss.targetY || 100) + Math.sin(t * 0.04) * 50;

      boss.x += (targetX - boss.x) * 0.02;
      boss.y += (targetY - boss.y) * 0.05;

      // 2. Tentacles / Appendages IK
      if (boss.tentacles) {
          const cx = boss.x + boss.w / 2;
          const cy = boss.y + boss.h / 2;
          
          boss.tentacles.forEach((tentacle, i) => {
               // Anchor point on body (rotating)
               const offsetAngle = (i / boss.tentacles!.length) * Math.PI * 2 + (t * 0.02);
               const anchorX = cx + Math.cos(offsetAngle) * 40;
               const anchorY = cy + Math.sin(offsetAngle) * 40;
               
               // First segment attached to anchor
               tentacle[0].x = anchorX;
               tentacle[0].y = anchorY;

               // Follow logic for subsequent segments
               for (let j = 1; j < tentacle.length; j++) {
                   const lead = tentacle[j - 1];
                   const follow = tentacle[j];
                   
                   const dx = lead.x - follow.x;
                   const dy = lead.y - follow.y;
                   const angle = Math.atan2(dy, dx);
                   const segLen = 20;

                   follow.x = lead.x - Math.cos(angle) * segLen;
                   follow.y = lead.y - Math.sin(angle) * segLen;
                   
                   // Add some organic waviness
                   follow.x += Math.sin(t * 0.1 + j) * 2; 
               }
          });
      }

      // 3. Attack State Machine
      if (boss.attackTimer && boss.attackTimer > 0) {
          boss.attackTimer--;
      } else {
          // Transition Logic
          if (boss.attackState === 'idle') {
              // 30% chance to beam, 70% chance to shoot projectiles
              if (Math.random() < 0.3) {
                  boss.attackState = 'charging_beam';
                  boss.attackTimer = 60; // 1 second charge
                  boss.animScaleX = 0.9;
                  boss.animScaleY = 1.1; // Squeeze
                  audio.playTone(150, 'sawtooth', 0.5); // Charge sound
              } else {
                  // Projectile Burst
                  // We'll just fire one burst per state change for simplicity, or use a burst counter
                  for(let k = 0; k < 5; k++) {
                      const angle = Math.PI * 0.7 + (k / 4) * Math.PI * 0.6; // Fan out towards left
                      const speed = 5;
                      this.bullets.push(this.createBullet(
                          boss.x + boss.w/2, 
                          boss.y + boss.h/2, 
                          Math.cos(angle) * speed, 
                          Math.sin(angle) * speed, 
                          false, 
                          false
                      ));
                  }
                  boss.attackTimer = 90; // Cooldown
                  audio.shoot();
              }
          } else if (boss.attackState === 'charging_beam') {
              boss.attackState = 'firing_beam';
              boss.attackTimer = 40; // Beam lasts 40 frames
              
              // Create Beam Entity
              // A beam is a large bullet that pierces
              this.bullets.push({
                  id: Math.random().toString(),
                  type: 'beam',
                  x: this.cameraX, // Starts from left of screen (or from boss to left)
                  y: boss.y + boss.h / 2 - 40,
                  w: boss.x - this.cameraX + 50, // Length
                  h: 80,
                  vx: 0, vy: 0,
                  color: COLOR_VENOM_SLIME,
                  direction: -1,
                  isDead: false,
                  hp: 40, // Dies when timer is done
                  maxHp: 40
              });
              
              this.triggerShake(15);
              audio.explode(); // Boom
              
              boss.animScaleX = 1.2; 
              boss.animScaleY = 0.8; // Stretch
          } else if (boss.attackState === 'firing_beam') {
              boss.attackState = 'idle';
              boss.attackTimer = 120; // Recovery
              boss.animScaleX = 1;
              boss.animScaleY = 1;
          }
      }

      // Animation Elasticity
      if (boss.animScaleX) boss.animScaleX += (1 - boss.animScaleX) * 0.1;
      if (boss.animScaleY) boss.animScaleY += (1 - boss.animScaleY) * 0.1;
  }

  drawSoldier(e: Entity) {
      // CAPYBARA DRAWING LOGIC (Realistic Pixel Art Style)
      const bob = Math.sin(this.frameCount * 0.2 + parseFloat(e.id)) * 2;
      const dir = e.direction;
      const flip = dir === -1;
      
      // Colors
      const furColor = COLOR_CAPYBARA_FUR; // #8B4513
      const legColor = '#5D4037'; // Darker limbs
      const vestColor = COLOR_ENEMY_VEST;
      
      const isDrone = e.enemyClass === 'drone';
      
      if (isDrone) {
          // DRONE DRAWING
          const droneY = e.y + bob;
          // Body
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(e.x + 4, droneY, 32, 20);
          // Rotor
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.fillRect(e.x - 4, droneY - 4, 48, 4);
          // Red Eye
          this.ctx.fillStyle = '#ef4444';
          this.ctx.beginPath();
          this.ctx.arc(e.x + e.w/2, droneY + 10, 6, 0, Math.PI*2);
          this.ctx.fill();
          return;
      }

      // SOLDIER DRAWING
      
      // 1. Draw Legs (Background/Far side)
      const legAnim = Math.sin(this.frameCount * 0.4 + parseFloat(e.id)) * 4;
      const standing = e.vx === 0;
      
      this.ctx.fillStyle = legColor;
      // Back Leg (Far)
      this.ctx.fillRect(e.x + (flip ? e.w - 14 : 10) - (standing ? 0 : legAnim), e.y + e.h - 8, 5, 8);
      // Front Leg (Far)
      this.ctx.fillRect(e.x + (flip ? 10 : e.w - 14) + (standing ? 0 : legAnim), e.y + e.h - 8, 5, 8);

      // 2. Draw Main Body (The "Loaf")
      this.ctx.fillStyle = furColor;
      // Main block (rounded top and bottom by omitting corners)
      this.ctx.fillRect(e.x + 2, e.y + 8 + bob, e.w - 4, e.h - 12);
      
      // TACTICAL VEST
      this.ctx.fillStyle = vestColor;
      this.ctx.fillRect(e.x + 4, e.y + 12 + bob, e.w - 8, 12);

      // 3. Draw Head
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
      this.ctx.fillStyle = '#3e2723'; // Dark brown hardcoded
      const noseX = flip ? headX : headX + headW - 4;
      this.ctx.fillRect(noseX, headY + 4, 4, 5);

      // VISOR / GOGGLES (Red Eye)
      this.ctx.fillStyle = COLOR_ENEMY_VISOR;
      const eyeX = flip ? headX + 8 : headX + 6;
      this.ctx.fillRect(eyeX, headY + 4, 8, 3);

      // 4. Draw Legs (Foreground/Near side)
      this.ctx.fillStyle = furColor;
      // Back Leg (Near)
      this.ctx.fillRect(e.x + (flip ? e.w - 14 : 10) + (standing ? 0 : legAnim), e.y + e.h - 10 + bob, 5, 10);
      // Front Leg (Near)
      this.ctx.fillRect(e.x + (flip ? 10 : e.w - 14) - (standing ? 0 : legAnim), e.y + e.h - 10 + bob, 5, 10);

      // 5. Weapon (Strap and Gun)
      this.ctx.fillStyle = '#222';
      const gunX = e.x + e.w/2 - 6;
      const gunY = e.y + 16 + bob;
      
      // Gun body (Receiver)
      this.ctx.fillRect(gunX, gunY, 12, 6);
      
      // Barrel
      this.ctx.fillStyle = '#111';
      if (flip) {
          this.ctx.fillRect(e.x - 8, gunY + 2, 18, 4);
      } else {
          this.ctx.fillRect(e.x + e.w - 10, gunY + 2, 18, 4);
      }
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
      
      // Boss Archetypes
      const isTank = levelId <= 2; 
      const isFlyer = levelId >= 3 && levelId <= 5;
      // const isChaos = levelId >= 6; // Implicit else

      // Center pivot for scaling
      const cx = boss.x + boss.w/2;
      const cy = boss.y + boss.h/2;
      
      this.ctx.translate(cx, cy);
      const sx = Math.max(0.1, boss.animScaleX || 1);
      const sy = Math.max(0.1, boss.animScaleY || 1);
      this.ctx.scale(sx, sy);
      
      // FORCE VISIBILITY: Glow/Shadow
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#ffffff';

      // --- 1. IK TENTACLES (Back Layer for Chaos/Flyer) ---
      // We rely on else logic for Chaos, so check levelId for Tentacles
      if ((levelId >= 3) && boss.tentacles && boss.tentacles.length > 0) {
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          
          boss.tentacles.forEach((tentacle) => {
              if (!tentacle || tentacle.length < 2) return;
              const startX = tentacle[0].x - cx;
              const startY = tentacle[0].y - cy;
              
              this.ctx.beginPath();
              this.ctx.strokeStyle = '#000'; 
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
              
              this.ctx.strokeStyle = COLOR_VENOM_SKIN;
              this.ctx.lineWidth = 10;
              this.ctx.stroke();
          });
      }

      // --- 2. MAIN BODY DRAWING ---
      
      if (isTank) {
          // THE BEHEMOTH (Tank Style)
          this.ctx.fillStyle = COLOR_BOSS_ARMOR;
          // Main hull
          this.ctx.fillRect(-80, -40, 160, 80);
          // Treads
          this.ctx.fillStyle = '#000';
          this.ctx.fillRect(-90, 20, 180, 40);
          // Tread details
          const treadAnim = (t % 20) * 4;
          this.ctx.fillStyle = '#555';
          for(let i=0; i<5; i++) {
              this.ctx.fillRect(-80 + i*35 - treadAnim + (treadAnim > 35 ? 175 : 0), 30, 20, 20);
          }
          // Turret
          this.ctx.fillStyle = COLOR_BOSS_ARMOR;
          this.ctx.beginPath();
          this.ctx.arc(0, -40, 50, Math.PI, 0);
          this.ctx.fill();
          // Cannon
          this.ctx.fillStyle = '#111';
          this.ctx.fillRect(-60, -60, 40, 20); // Gun barrel left
          
          // Eye / Core
          this.ctx.fillStyle = COLOR_BOSS_CORE;
          this.ctx.beginPath();
          this.ctx.arc(-20, -30, 15, 0, Math.PI*2);
          this.ctx.fill();

      } else if (isFlyer) {
          // THE HIVE MIND (Brain Style)
          this.ctx.fillStyle = '#000';
          // Brain dome
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, 70, 50, 0, 0, Math.PI*2);
          this.ctx.fill();
          
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; // Glass shine
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI*2);
          this.ctx.fill();
          
          // Brain folds
          // Use dynamic color based on level variant (red vs green) for visual flair
          const isCarnage = levelId % 2 === 0;
          this.ctx.strokeStyle = isCarnage ? COLOR_CARNAGE_SLIME : COLOR_VENOM_SLIME;
          this.ctx.lineWidth = 4;
          this.ctx.beginPath();
          this.ctx.moveTo(-40, 0);
          this.ctx.bezierCurveTo(-20, -30, 20, -30, 40, 0);
          this.ctx.bezierCurveTo(20, 30, -20, 30, -40, 0);
          this.ctx.stroke();
          
          // Tech bits
          this.ctx.fillStyle = COLOR_BOSS_ARMOR;
          this.ctx.fillRect(-80, -10, 20, 20);
          this.ctx.fillRect(60, -10, 20, 20);

      } else {
          // THE ABOMINATION (Chaos Style)
          this.ctx.fillStyle = '#000';
          this.ctx.beginPath();
          const spikes = 12;
          const outerRadius = 70;
          const innerRadius = 40;
          
          // Rotating Spikey ball
          this.ctx.save();
          this.ctx.rotate(t * 0.05);
          for (let i = 0; i < spikes; i++) {
              let angle = (i / spikes) * Math.PI * 2;
              let x = Math.cos(angle) * outerRadius;
              let y = Math.sin(angle) * outerRadius;
              this.ctx.lineTo(x, y);
              angle += (Math.PI / spikes);
              x = Math.cos(angle) * innerRadius;
              y = Math.sin(angle) * innerRadius;
              this.ctx.lineTo(x, y);
          }
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.restore();
          
          // Core
          this.ctx.fillStyle = COLOR_CARNAGE_SKIN;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 30, 0, Math.PI*2);
          this.ctx.fill();
          
          // Crazy Eyes
          this.ctx.fillStyle = '#fff';
          this.ctx.beginPath();
          this.ctx.arc(-10 + Math.sin(t*0.2)*5, -10, 8, 0, Math.PI*2);
          this.ctx.fill();
          this.ctx.beginPath();
          this.ctx.arc(15 + Math.cos(t*0.3)*5, 5, 12, 0, Math.PI*2);
          this.ctx.fill();
      }

      // DEBUG / FALLBACK RING
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.1)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, boss.w/2 + 10, 0, Math.PI*2);
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
  
  draw() {
    // Clear
    this.ctx.fillStyle = '#111827'; // Dark fallback
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background (Parallax)
    const { bgTop, bgBottom } = this.levelConfig.theme;
    
    // Gradient Sky
    const grad = this.ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, bgTop);
    grad.addColorStop(1, bgBottom);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Distant Mountains (Parallax 0.5)
    this.ctx.save();
    this.ctx.translate(-this.cameraX * 0.2, 0);
    this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, CANVAS_HEIGHT);
    for(let i=0; i<20; i++) {
        const x = i * 200;
        const h = 100 + Math.sin(i)*50;
        this.ctx.lineTo(x, CANVAS_HEIGHT - h);
    }
    this.ctx.lineTo(4000, CANVAS_HEIGHT);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(-Math.floor(this.cameraX), 0); // Snap to pixel

    // Platforms
    this.platforms.forEach(p => {
        // Only draw visible
        if (p.x + p.w < this.cameraX || p.x > this.cameraX + CANVAS_WIDTH) return;
        
        // Body
        this.ctx.fillStyle = this.levelConfig.theme.platformBody;
        this.ctx.fillRect(p.x, p.y + 10, p.w, p.h - 10);
        // Top
        this.ctx.fillStyle = this.levelConfig.theme.platformTop;
        this.ctx.fillRect(p.x, p.y, p.w, 10);
        
        // Detail / Texture
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for(let i=0; i<p.w; i+=20) {
            this.ctx.fillRect(p.x + i, p.y + 4, 4, 4);
        }
    });
    
    // Billboards & Decorations
    this.decorations.forEach(d => {
         if (d.x + d.w < this.cameraX || d.x > this.cameraX + CANVAS_WIDTH) return;
         this.ctx.fillStyle = '#222'; // Pole
         this.ctx.fillRect(d.x + d.w/2 - 2, d.y + d.h, 4, 100);
         
         this.ctx.fillStyle = d.color;
         this.ctx.fillRect(d.x, d.y, d.w, d.h);
         
         if (d.text) {
             this.ctx.fillStyle = d.secondaryColor || '#000';
             this.ctx.font = 'bold 10px Arial';
             this.ctx.textAlign = 'center';
             this.ctx.fillText(d.text.split(' ')[0], d.x + d.w/2, d.y + 16);
             if (d.text.split(' ')[1])
                 this.ctx.fillText(d.text.split(' ')[1], d.x + d.w/2, d.y + 30);
         }
    });

    // Enemies
    this.enemies.forEach(e => {
        if (e.x + e.w < this.cameraX || e.x > this.cameraX + CANVAS_WIDTH) return;
        
        if (e.type === 'enemy') {
            this.drawSoldier(e);
        } else if (e.type === 'boss') {
            this.drawBoss(e);
        } else if (e.type === 'sensor') {
            const bob = Math.sin(this.frameCount * 0.1) * 5;
            this.ctx.fillStyle = e.color;
            // Central Eye
            this.ctx.beginPath();
            this.ctx.arc(e.x + e.w/2, e.y + e.h/2 + bob, e.w/2, 0, Math.PI*2);
            this.ctx.fill();
            // Ring
            this.ctx.strokeStyle = '#a855f7';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(e.x + e.w/2, e.y + e.h/2 + bob, e.w/2 + 4, 0, Math.PI*2);
            this.ctx.stroke();
            
        } else if (e.type === 'powerup') {
            const bob = Math.sin(this.frameCount * 0.1) * 5;
            this.ctx.fillStyle = e.color;
            this.ctx.fillRect(e.x, e.y + bob, e.w, e.h);
            this.ctx.fillStyle = '#fff';
            this.ctx.textAlign = 'center';
            this.ctx.font = 'bold 12px monospace';
            
            let label = '?';
            if (e.subType === 'machine') label = 'M';
            if (e.subType === 'spread') label = 'S';
            if (e.subType === 'laser') label = 'L';
            if (e.subType === 'health') label = '♥';
            if (e.subType === 'bomb_refill') label = 'B';
            
            this.ctx.fillText(label, e.x + e.w/2, e.y + bob + 16);
        }
    });

    // Player
    if (!this.player.isDead) {
        // Flash if invulnerable
        if (!this.player.invulnerableUntil || Date.now() > this.player.invulnerableUntil || this.frameCount % 4 < 2) {
             const p = this.player;
             
             // Check crouch
             let h = p.h;
             let y = p.y;
             if (this.input.down) {
                 h = p.h / 2;
                 y = p.y + p.h / 2;
             }
             
             // Legs Animation
             const runAnim = Math.sin(this.frameCount * 0.5) * 5;
             const moving = Math.abs(p.vx) > 0.1;
             
             // Back Leg
             this.ctx.fillStyle = '#1e3a8a'; // Darker jeans
             this.ctx.fillRect(p.x + 8 + (moving ? -runAnim : 0), y + h - 10, 8, 10);
             
             // Body
             this.ctx.fillStyle = COLOR_PLAYER; // Skin
             this.ctx.fillRect(p.x, y, p.w, h - 10);
             
             // Pants
             this.ctx.fillStyle = COLOR_PLAYER_PANTS;
             this.ctx.fillRect(p.x, y + h - 20, p.w, 10);
             
             // Vest / Shirt
             this.ctx.fillStyle = '#ffffff';
             this.ctx.fillRect(p.x, y + 10, p.w, 20);

             // Headband
             this.ctx.fillStyle = COLOR_PLAYER_HEADBAND;
             this.ctx.fillRect(p.x, y + 4, p.w, 6);
             // Bandana tail
             if (moving) {
                 this.ctx.fillRect(p.x - (p.direction * 10), y + 4 + Math.sin(this.frameCount*0.5)*2, 10, 4);
             }

             // Front Leg
             this.ctx.fillStyle = COLOR_PLAYER_PANTS; 
             this.ctx.fillRect(p.x + 8 + (moving ? runAnim : 0), y + h - 10, 8, 10);

             // Gun
             this.ctx.fillStyle = '#000';
             let gunY = y + 20;
             let gunX = p.x + (p.direction === 1 ? 16 : -10);
             if (this.input.up) {
                 gunY -= 10;
                 gunX = p.x + 4;
                 this.ctx.fillRect(gunX, gunY, 6, 20); // Up
             } else {
                 this.ctx.fillRect(gunX, gunY, 24, 6); // Forward
             }
        }
    }

    // Bullets / Particles
    this.bullets.forEach(b => {
        if (b.type === 'beam') {
            this.ctx.fillStyle = b.color;
            // Pulsing Beam
            const thickness = b.h + Math.sin(this.frameCount * 0.8) * 10;
            const yOffset = (b.h - thickness) / 2;
            this.ctx.fillRect(b.x, b.y + yOffset, b.w, thickness);
            // Core
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(b.x, b.y + b.h/2 - 5, b.w, 10);
            return;
        }
        
        if (b.type === 'explosion') {
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath();
            this.ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2 * (Math.random()*0.5 + 0.5), 0, Math.PI*2);
            this.ctx.fill();
            return;
        }

        if (b.type === 'bomb') {
            this.ctx.fillStyle = b.color;
            this.ctx.beginPath();
            this.ctx.arc(b.x + b.w/2, b.y + b.h/2, 6, 0, Math.PI*2);
            this.ctx.fill();
            // Fuse
            this.ctx.fillStyle = '#ef4444'; // Red spark
            this.ctx.fillRect(b.x + b.w/2 - 1, b.y - 4, 2, 4);
            return;
        }

        // Standard bullet
        this.ctx.fillStyle = b.color;
        this.ctx.fillRect(b.x, b.y, b.w, b.h);
    });

    this.particles.forEach(p => {
       if (p.text) {
           this.ctx.fillStyle = p.color;
           this.ctx.font = 'bold 10px monospace';
           this.ctx.fillText(p.text, p.x, p.y);
           return;
       }
       this.ctx.fillStyle = p.color;
       this.ctx.globalAlpha = p.life;
       this.ctx.fillRect(p.x, p.y, p.w, p.h);
       this.ctx.globalAlpha = 1.0;
    });

    this.ctx.restore();
    
    // HUD (Screen Space)
    this.drawHUD();
    
    // Scanlines (if retro mode was handled in React, handled via CSS actually, but let's add subtle vignette here)
    const gradV = this.ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/3, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,0.3)');
    this.ctx.fillStyle = gradV;
    this.ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
