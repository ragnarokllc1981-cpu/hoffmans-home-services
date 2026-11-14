// Lucide icons, tree-shaken: only the ones the site uses. Replaces <i data-lucide="..."> with inline SVG.
import { createIcons, House, Layers, Hammer, AppWindow, Zap, Droplets, Fan, BrickWall, ShieldCheck, UserCheck, MapPin, SearchCheck } from 'lucide';
export const icons = { House, Layers, Hammer, AppWindow, Zap, Droplets, Fan, BrickWall, ShieldCheck, UserCheck, MapPin, SearchCheck };
export const renderIcons = root => createIcons({ icons, attrs: { 'aria-hidden': 'true' }, ...(root ? { root } : {}) });
