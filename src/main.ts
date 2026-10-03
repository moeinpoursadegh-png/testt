import './styles.css';
import { App } from './app/App';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const app = new App(canvas, document.getElementById('hud')!, document.getElementById('controls')!);

if (import.meta.hot) import.meta.hot.dispose(() => app.dispose());
