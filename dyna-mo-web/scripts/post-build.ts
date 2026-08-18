import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.cwd(), "dist");
const index = path.join(dist, "index.html");
const fallback = path.join(dist, "404.html");

if (fs.existsSync(index)) {
  fs.copyFileSync(index, fallback);
}

fs.writeFileSync(path.join(dist, ".nojekyll"), "", "utf8");
