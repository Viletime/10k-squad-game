import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Suppress "Cannot redefine property: ethereum"
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function (obj: any, prop: any, descriptor: any) {
  if (obj === window && prop === 'ethereum') {
    try {
      return originalDefineProperty(obj, prop, descriptor);
    } catch (e) {
      console.warn("Caught attempt to redefine window.ethereum:", e);
      return obj;
    }
  }
  return originalDefineProperty(obj, prop, descriptor);
};

const originalReflectDefineProperty = Reflect.defineProperty;
Reflect.defineProperty = function (target: any, propertyKey: any, attributes: any) {
  if (target === window && propertyKey === 'ethereum') {
    try {
      return originalReflectDefineProperty(target, propertyKey, attributes);
    } catch (e) {
      console.warn("Caught attempt to redefine window.ethereum via Reflect:", e);
      return false; // Reflect.defineProperty returns boolean
    }
  }
  return originalReflectDefineProperty(target, propertyKey, attributes);
};

import './lib/reown';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
