import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/browse", "/download", "/about", "/stats"];

  return routes.map((route) => ({
    url: `https://dyna-mo-ptm.org${route}`,
    lastModified: new Date(),
  }));
}
