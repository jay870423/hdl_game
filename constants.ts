
import { LevelConfig } from "./types";

export const GRAVITY = 0.6;
export const PLAYER_SPEED = 4;
export const JUMP_FORCE = -12;
export const TERMINAL_VELOCITY = 15;
export const BULLET_SPEED = 10;
export const ENEMY_SPEED = 2;

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;

// Colors
export const COLOR_PLAYER = '#fca5a5'; // Skin tone base
export const COLOR_PLAYER_HEADBAND = '#ef4444'; // Red
export const COLOR_PLAYER_PANTS = '#3b82f6'; // Blue jeans
export const COLOR_ENEMY = '#ef4444'; // Red
export const COLOR_BULLET = '#fbbf24'; // Yellow

export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 48;

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "JUNGLE RAID",
    theme: {
      bgTop: '#1e293b', // Dark Slate
      bgBottom: '#064e3b', // Dark Green
      platformTop: '#22c55e', // Green Grass
      platformBody: '#78350f', // Dirt Brown
    },
    length: 4000,
    bossHp: 20
  },
  {
    id: 2,
    name: "ENEMY BASE",
    theme: {
      bgTop: '#0f172a', // Dark Blue
      bgBottom: '#334155', // Slate
      platformTop: '#94a3b8', // Steel
      platformBody: '#475569', // Dark Steel
    },
    length: 4500,
    bossHp: 30
  },
  {
    id: 3,
    name: "WATERFALL",
    theme: {
      bgTop: '#0c4a6e', // Deep Sky
      bgBottom: '#0ea5e9', // Sky Blue
      platformTop: '#67e8f9', // Cyan
      platformBody: '#1e3a8a', // Dark Blue Rock
    },
    length: 5000,
    bossHp: 40
  },
  {
    id: 4,
    name: "SNOW FIELD",
    theme: {
      bgTop: '#e2e8f0', // Light Grey
      bgBottom: '#ffffff', // White
      platformTop: '#ffffff', // Snow
      platformBody: '#cbd5e1', // Ice Rock
    },
    length: 5500,
    bossHp: 50
  },
  {
    id: 5,
    name: "ALIEN LAIR",
    theme: {
      bgTop: '#450a0a', // Dark Red
      bgBottom: '#7f1d1d', // Red
      platformTop: '#f87171', // Flesh
      platformBody: '#581c87', // Purple
    },
    length: 6000,
    bossHp: 80
  }
];
