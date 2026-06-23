import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.cwd(), "dist");
const publicDir = path.resolve(process.cwd(), "public");
const index = path.join(dist, "index.html");
const fallback = path.join(dist, "404.html");
const topLevelRoutes = ["browse", "stats", "download", "about"];

if (fs.existsSync(index)) {
  fs.copyFileSync(index, fallback);
  for (const route of topLevelRoutes) {
    writeRouteFallback(route, index);
  }

  for (const systemId of readSystemIds()) {
    writeRouteFallback(
      path.join("system", encodeURIComponent(systemId)),
      index,
    );
  }
}

fs.writeFileSync(path.join(dist, ".nojekyll"), "", "utf8");

function writeRouteFallback(route: string, sourceIndex: string) {
  const routeDir = path.join(dist, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(sourceIndex, path.join(routeDir, "index.html"));
}

function readSystemIds() {
  const dataPath = path.join(publicDir, "data", "master_table.json");
  if (!fs.existsSync(dataPath)) {
    return [];
  }

  const payload = JSON.parse(fs.readFileSync(dataPath, "utf8")) as {
    systems?: Array<{ id?: string }>;
  };
  return (payload.systems ?? [])
    .map((system) => system.id)
    .filter((id): id is string => Boolean(id));
}
