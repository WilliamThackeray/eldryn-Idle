export default function dice(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}
