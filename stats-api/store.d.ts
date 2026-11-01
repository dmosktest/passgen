export const GEN_STATS_START: number;
export function makeStore(filePath: string): {
  read: () => number;
  bump: (by?: number) => number;
};
