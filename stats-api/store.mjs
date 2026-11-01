import fs from "node:fs";
import path from "node:path";

export const GEN_STATS_START = 33_000;

function parseTotal(raw) {
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return GEN_STATS_START;
  return n;
}

export function makeStore(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const read = () => {
    try {
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `${GEN_STATS_START}\n`, "utf8");
        return GEN_STATS_START;
      }
      return parseTotal(fs.readFileSync(filePath, "utf8"));
    } catch {
      return GEN_STATS_START;
    }
  };

  const write = (n) => {
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${n}\n`, "utf8");
    fs.renameSync(tmp, filePath);
  };

  return {
    read,
    bump(by = 1) {
      const next = read() + Math.max(0, Math.floor(Number(by) || 0));
      write(next);
      return next;
    },
  };
}
