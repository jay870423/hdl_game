
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

export type EntityType = 'player' | 'enemy' | 'boss' | 'bullet' | 'particle';

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
}

export interface Platform extends Rect {
  type: 'solid' | 'pass-through';
}

export interface Particle extends Rect {
  vx: number;
  vy: number;
  life: number;
  color: string;
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
