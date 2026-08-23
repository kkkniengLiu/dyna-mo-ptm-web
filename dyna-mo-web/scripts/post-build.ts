import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.cwd(), "dist");
const index = path.join(dist, "index.html");
const fallback = path.join(dist, "404.html");

if (fs.existsSync(index)) {
  fs.copyFileSync(index, fallback);

  const html = fs.readFileSync(index, "utf8");
  const routes = [
    "browse",
    "statistics",
    "descriptors",
    "docs",
    "downloads",
    "about",
  ];
  const systemsPath = path.resolve(
    process.cwd(),
    "public",
    "api",
    "systems.json",
  );
  if (fs.existsSync(systemsPath)) {
    const payload = JSON.parse(fs.readFileSync(systemsPath, "utf8")) as {
      systems?: Array<{ id?: string }>;
    };
    for (const system of payload.systems ?? []) {
      if (system.id) routes.push(`system/${encodeURIComponent(system.id)}`);
    }
  }

  for (const route of routes) {
    const routeDirectory = path.join(dist, ...route.split("/"));
    fs.mkdirSync(routeDirectory, { recursive: true });
    fs.writeFileSync(path.join(routeDirectory, "index.html"), html, "utf8");
  }
}

fs.writeFileSync(path.join(dist, ".nojekyll"), "", "utf8");
