import './style.css';
import gsap from 'gsap';
import { animate, stagger } from 'motion';
gsap.to('#flash-banner', { backgroundColor: '#ff6a1a', duration: 0.6, repeat: -1, yoyo: true, ease: 'steps(1)' });
animate('.city-in', { opacity: [0, 1], y: [24, 0] }, { delay: stagger(0.1), duration: 0.7, ease: [0.16, 1, 0.3, 1] });
