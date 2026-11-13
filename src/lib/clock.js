/**
 * The day the application takes for today, as YYYY-MM-DD. The demonstration holds it still, so
 * that its invented records keep their distance from it; without a fixed day it is the device's.
 */
export function createClock(fixedDay) {
  return {
    today() {
      if (fixedDay) return fixedDay;
      const now = new Date(),
        pad = (n) => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    },
  };
}
