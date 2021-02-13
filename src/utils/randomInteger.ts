export default function randomInteger (min:number, max:number):number {
  max = max - min + 1;
  const r = Math.floor(Math.random() * max) + min;
  return r;
}
