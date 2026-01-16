
import { LevelConfig } from "./types";

export const GRAVITY = 0.6;
export const PLAYER_SPEED = 4.5; 
export const JUMP_FORCE = -13; 
export const TERMINAL_VELOCITY = 15;
export const BULLET_SPEED = 12;
export const ENEMY_SPEED = 2;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Colors
export const COLOR_PLAYER = '#fca5a5'; // Skin tone base
export const COLOR_PLAYER_HEADBAND = '#ef4444'; // Red
export const COLOR_PLAYER_PANTS = '#3b82f6'; // Blue jeans

// --- NEW THEME COLORS ---
export const COLOR_CAPYBARA_FUR = '#8B4513'; // SaddleBrown
export const COLOR_CAPYBARA_NOSE = '#3e2723'; // Dark Brown
export const COLOR_CAPYBARA_EAR = '#2e1a12';
export const COLOR_VENOM_SKIN = '#09090b'; // Almost Black (Zinc 950)
export const COLOR_VENOM_EYES = '#ffffff'; // White
export const COLOR_VENOM_SLIME = '#84cc16'; // Lime Green
export const COLOR_CARNAGE_SKIN = '#7f1d1d'; // Dark Red
export const COLOR_CARNAGE_SLIME = '#ef4444'; // Bright Red

export const COLOR_BULLET = '#fbbf24'; // Player Yellow
export const COLOR_BULLET_ENEMY = '#a3e635'; // Toxic Slime Green

export const COLOR_POWERUP_SPREAD = '#ef4444'; 
export const COLOR_POWERUP_MACHINE = '#3b82f6';
export const COLOR_POWERUP_LASER = '#06b6d4'; // Cyan
export const COLOR_POWERUP_HEALTH = '#22c55e'; // Green for health
export const COLOR_SENSOR = '#6b21a8'; // Dark Purple Symbiote Spore

export const COLOR_BOMB = '#1f2937'; // Dark Grey
export const COLOR_EXPLOSION = '#f59e0b'; // Orange fire

export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 48;

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "CAPY ISLAND",
    theme: {
      bgTop: '#ecfccb', // Light lime sky
      bgBottom: '#3f6212', // Jungle green
      platformTop: '#65a30d', 
      platformBody: '#365314', 
    },
    length: 4000,
    bossHp: 20
  },
  {
    id: 2,
    name: "SYMBIOTE OUTPOST",
    theme: {
      bgTop: '#1e1b4b', 
      bgBottom: '#312e81', 
      platformTop: '#a5b4fc', 
      platformBody: '#1e1b4b', 
    },
    length: 4500,
    bossHp: 30
  },
  {
    id: 3,
    name: "SLIME RIVER",
    theme: {
      bgTop: '#022c22', 
      bgBottom: '#14532d', 
      platformTop: '#86efac', 
      platformBody: '#064e3b', 
    },
    length: 5000,
    bossHp: 40
  },
  {
    id: 4,
    name: "FROZEN HIVE",
    theme: {
      bgTop: '#f0f9ff', 
      bgBottom: '#e0f2fe', 
      platformTop: '#ffffff', 
      platformBody: '#475569', 
    },
    length: 5500,
    bossHp: 50
  },
  {
    id: 5,
    name: "INFECTED LAIR",
    theme: {
      bgTop: '#4a044e', 
      bgBottom: '#701a75', 
      platformTop: '#f0abfc', 
      platformBody: '#4a044e', 
    },
    length: 6000,
    bossHp: 70
  },
  {
    id: 6,
    name: "VENOM CORE",
    theme: {
      bgTop: '#000000',
      bgBottom: '#18181b',
      platformTop: '#713f12',
      platformBody: '#000000',
    },
    length: 6500,
    bossHp: 90
  },
  {
    id: 7,
    name: "SKY WEB",
    theme: {
      bgTop: '#18181b',
      bgBottom: '#52525b',
      platformTop: '#d4d4d8', 
      platformBody: '#27272a',
    },
    length: 7000,
    bossHp: 110
  },
  {
    id: 8,
    name: "KLYNTAR VOID",
    theme: {
      bgTop: '#000000',
      bgBottom: '#450a0a', 
      platformTop: '#fb7185', 
      platformBody: '#000000',
    },
    length: 8000,
    bossHp: 150
  }
];
