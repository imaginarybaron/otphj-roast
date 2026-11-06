// S-F tier list: teams bucketed by their 0-100 power score using fixed cutoffs,
// so tiers are stable week to week and easy to explain.
export const TIER_DEFS = [
  { tier: 'S', min: 90, label: 'Actually Scary' },
  { tier: 'A', min: 75, label: 'Legit' },
  { tier: 'B', min: 55, label: "Fine, I Guess" },
  { tier: 'C', min: 35, label: 'Mush' },
  { tier: 'D', min: 15, label: 'Frauds' },
  { tier: 'F', min: -Infinity, label: 'Draft Lottery' },
];

export function analyzeTiers({ power }) {
  const tiers = TIER_DEFS.map((d) => ({ ...d, min: Number.isFinite(d.min) ? d.min : null, teams: [] }));
  for (const t of power.rankings) {
    const idx = TIER_DEFS.findIndex((d) => t.power >= d.min);
    tiers[idx].teams.push({
      rosterId: t.rosterId, team: t.team, owner: t.owner, record: t.record,
      power: t.power, rank: t.rank, movement: t.movement, ppg: t.ppg,
    });
  }
  return { cutoffs: TIER_DEFS.filter((d) => Number.isFinite(d.min)).map((d) => ({ tier: d.tier, min: d.min })), tiers };
}
