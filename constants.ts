
import { LevelConfig } from "./types";

export const GRAVITY = 0.6;
export const PLAYER_SPEED = 4.5; // Slightly faster for better control
export const JUMP_FORCE = -13; // Higher jump
export const TERMINAL_VELOCITY = 15;
export const BULLET_SPEED = 12;
export const ENEMY_SPEED = 2;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Colors
export const COLOR_PLAYER = '#fca5a5'; // Skin tone base
export const COLOR_PLAYER_HEADBAND = '#ef4444'; // Red
export const COLOR_PLAYER_PANTS = '#3b82f6'; // Blue jeans
export const COLOR_ENEMY = '#ef4444'; // Red
export const COLOR_BULLET = '#fbbf24'; // Yellow
export const COLOR_POWERUP_SPREAD = '#ef4444'; // Red S
export const COLOR_POWERUP_MACHINE = '#3b82f6'; // Blue M
export const COLOR_SENSOR = '#94a3b8'; // Flying sensor

export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 48;

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "JUNGLE RAID",
    theme: {
      bgTop: '#1e293b', 
      bgBottom: '#064e3b', 
      platformTop: '#22c55e', 
      platformBody: '#78350f', 
    },
    length: 4000,
    bossHp: 20
  },
  {
    id: 2,
    name: "ENEMY BASE",
    theme: {
      bgTop: '#0f172a', 
      bgBottom: '#334155', 
      platformTop: '#94a3b8', 
      platformBody: '#475569', 
    },
    length: 4500,
    bossHp: 30
  },
  {
    id: 3,
    name: "WATERFALL",
    theme: {
      bgTop: '#0c4a6e', 
      bgBottom: '#0ea5e9', 
      platformTop: '#67e8f9', 
      platformBody: '#1e3a8a', 
    },
    length: 5000,
    bossHp: 40
  },
  {
    id: 4,
    name: "SNOW FIELD",
    theme: {
      bgTop: '#e2e8f0', 
      bgBottom: '#ffffff', 
      platformTop: '#ffffff', 
      platformBody: '#cbd5e1', 
    },
    length: 5500,
    bossHp: 50
  },
  {
    id: 5,
    name: "ALIEN LAIR",
    theme: {
      bgTop: '#450a0a', 
      bgBottom: '#7f1d1d', 
      platformTop: '#f87171', 
      platformBody: '#581c87', 
    },
    length: 6000,
    bossHp: 70
  },
  {
    id: 6,
    name: "VOLCANIC CORE",
    theme: {
      bgTop: '#2b0606',
      bgBottom: '#7f1d1d',
      platformTop: '#7c2d12', // Dark orange/brown
      platformBody: '#450a0a',
    },
    length: 6500,
    bossHp: 90
  },
  {
    id: 7,
    name: "SKY FORTRESS",
    theme: {
      bgTop: '#0f172a',
      bgBottom: '#60a5fa',
      platformTop: '#e2e8f0', // Steel
      platformBody: '#1e293b', // Dark Steel
    },
    length: 7000,
    bossHp: 110
  },
  {
    id: 8,
    name: "NEURAL VOID",
    theme: {
      bgTop: '#000000',
      bgBottom: '#2e1065', // Deep Purple
      platformTop: '#d8b4fe', // Neon Purple
      platformBody: '#000000',
    },
    length: 8000,
    bossHp: 150
  }
];
