
export enum GameState {
  MENU = 'MENU',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  GAME_COMPLETE = 'GAME_COMPLETE'
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type EntityType = 'player' | 'enemy' | 'boss' | 'bullet' | 'particle' | 'powerup' | 'sensor' | 'bomb' | 'explosion' | 'beam';
export type WeaponType = 'normal' | 'spread' | 'machine' | 'laser';
export type PowerUpType = 'spread' | 'machine' | 'laser' | 'health' | 'bomb_refill';

export interface Point {
  x: number;
  y: number;
}

export interface Entity extends Rect {
  id: string;
  type: EntityType;
  vx: number;
  vy: number;
  color: string;
  direction: 1 | -1; // 1 right, -1 left
  isDead: boolean;
  hp: number;
  maxHp: number;
  frameTimer?: number; // For animation
  
  // Player specific
  weapon?: WeaponType;
  invulnerableUntil?: number;
  bombs?: number; // Amount of bombs

  // Powerup specific
  subType?: PowerUpType; 
  baseY?: number; // For floating animation
  
  // Projectile specific
  penetratesWalls?: boolean; // Can it go through platforms?
  penetratesEnemies?: boolean; // Can it go through multiple enemies?
  hitEnemyIds?: string[]; // Track which enemies have been hit by this penetrating bullet
  
  // Bomb/Explosion specific
  radius?: number;

  // Boss specific
  attackState?: 'idle' | 'charging_beam' | 'firing_beam';
  attackTimer?: number;
  // Advanced Animation Props
  tentacles?: Point[][]; // Array of joint chains
  animScaleX?: number;   // Breathing animation width
  animScaleY?: number;   // Breathing animation height
  targetY?: number;      // For smooth movement
}

export interface Platform extends Rect {
  type: 'solid' | 'pass-through';
}

export interface Particle extends Rect {
  vx: number;
  vy: number;
  life: number;
  color: string;
  text?: string; // For floating text
}

export interface MissionData {
  title: string;
  briefing: string;
  bossName: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean; // Aim up
  down: boolean; // Crouch
  jump: boolean;
  fire: boolean;
  bomb: boolean; // New skill input
}

export interface LevelConfig {
  id: number;
  name: string;
  theme: {
    bgTop: string;
    bgBottom: string;
    platformTop: string;
    platformBody: string;
  };
  length: number;
  bossHp: number;
}
