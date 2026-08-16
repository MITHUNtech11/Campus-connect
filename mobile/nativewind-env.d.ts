/// <reference types="nativewind/types" />

/**
 * `import './global.css'` is consumed by NativeWind's Metro transformer, not by
 * TypeScript — without this the compiler rejects the side-effect import.
 */
declare module '*.css';
