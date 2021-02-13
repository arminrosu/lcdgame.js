export default function isTouchDevice ():boolean {
  return !!('ontouchstart' in document.documentElement || (window.navigator.maxTouchPoints && window.navigator.maxTouchPoints >= 1));
}
