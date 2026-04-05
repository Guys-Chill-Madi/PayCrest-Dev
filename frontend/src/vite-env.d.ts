/// <reference types="vite/client" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Image modules
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';

