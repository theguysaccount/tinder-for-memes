// Fixed swipe patterns for the end-to-end self-test and tests/fixtures/links.json.
export const PEOPLE = {
  A: { name: "Alex", like: (i) => i % 3 !== 0 },
  B: { name: "Sam", like: (i) => i % 2 === 0 },
};
export const likesFor = (who, n) => Array.from({ length: n }, (_, i) => PEOPLE[who].like(i));
