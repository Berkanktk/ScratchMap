import type { RegionMode, ColorStyles } from "./types";

export const modeColors: Record<RegionMode, string> = {
  visited: '#c78f57',
  planned: '#e5cab0',
  banned: '#2a2a2a',
  none: '#ffffff'
};

export const listColors: Record<RegionMode, ColorStyles> = {
  visited: { text: 'black', background: '#c78f57' },
  planned: { text: 'black', background: '#e5cab0' },
  banned: { text: '#777777', background: '#1c1c1c' },
  none: { text: 'antiquewhite', background: '#2a2a2a' }
};
