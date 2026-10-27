const fs = require("node:fs");
const path = require("node:path");

const lockfilePath = path.resolve(__dirname, "../../package-lock.json");
const oldPrefix = "http://package-firewall.replit.internal/npm/";
const newPrefix = "https://registry.npmjs.org/";
const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));

let rewrittenCount = 0;
for (const entry of Object.values(lockfile.packages ?? {})) {
  if (typeof entry.resolved === "string" && entry.resolved.startsWith(oldPrefix)) {
    entry.resolved = `${newPrefix}${entry.resolved.slice(oldPrefix.length)}`;
    rewrittenCount += 1;
  }
}

if (rewrittenCount > 0) {
  fs.writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

console.log(`Normalized ${rewrittenCount} lockfile URL${rewrittenCount === 1 ? "" : "s"}.`);
