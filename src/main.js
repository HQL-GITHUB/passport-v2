import './styles/index.css';
import { createApp } from './app/create-app.js';

const app = createApp();
app.start().catch((error) => {
  console.error('Passport initialization failed', error);
  document.getElementById('app-main').textContent = '页面暂时未能打开，请刷新重试。';
});
if (import.meta.hot) import.meta.hot.dispose(() => app.destroy());
