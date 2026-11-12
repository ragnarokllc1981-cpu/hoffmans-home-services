import './style.css';
import { animate, stagger } from 'motion';
animate('.city-in', { opacity: [0, 1], y: [24, 0] }, { delay: stagger(0.1), duration: 0.7, ease: [0.16, 1, 0.3, 1] });
