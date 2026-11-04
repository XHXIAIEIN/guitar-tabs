// Time signatures in ticks. A quarter note is 48 ticks, divisible by 3 and 4, so triplets and sixteenths stay whole.

/** Bar length, click unit and beam grouping for a time signature. */
export function meter([num, den]) {
  const beatTicks = 192 / den;
  const compound = den === 8 && num % 3 === 0;
  return {
    barTicks: num * beatTicks,
    beatTicks,
    beats: num,
    compound,
    groupTicks: compound ? 72 : den === 2 ? 96 : 48,
  };
}

/** Click strength of beat `i`: 2 bar start, 1 compound-meter group start, 0 other beats. */
export const beatAccent = (i, m) => (i === 0 ? 2 : m.compound && i % 3 === 0 ? 1 : 0);
