import { readFileSync, writeFileSync } from "node:fs";

// Fonte: malha simplificada do IBGE. Execute com o GeoJSON local como argumento.
const geo = JSON.parse(readFileSync(process.argv[2], "utf8"));
const project = ([lon, lat]) => [35 + (lon + 74.5) * 13, (6 - lat) * 13];
const labels = {
  11: [-63.4,-10.8], 12: [-70.3,-9.3], 13: [-64,-4.2], 14: [-61.4,1.9],
  15: [-53.5,-4], 16: [-51.7,1.1], 17: [-48.3,-9.8], 21: [-45.2,-5],
  22: [-42.8,-7.9], 23: [-39.6,-5], 24: [-36.6,-5.6], 25: [-36.5,-7.1],
  26: [-38.5,-8.6], 27: [-36,-9.8], 28: [-37.3,-11.1], 29: [-41.8,-12.5],
  31: [-44.7,-18.5], 32: [-40.5,-19.7], 33: [-42.6,-22.2], 35: [-48.6,-22],
  41: [-51,-24.7], 42: [-50,-27.2], 43: [-53,-30], 50: [-54.7,-20.6],
  51: [-56,-13.2], 52: [-49.8,-16], 53: [-47.9,-15.8],
};
const paths = geo.features.map((feature) => {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const d = polygons.flatMap(polygon => polygon.map(ring => ring.map((point,i) => `${i ? "L" : "M"}${project(point).map(v => v.toFixed(1)).join(",")}`).join("") + "Z")).join("");
  const code = feature.properties.codarea;
  const [x, y] = project(labels[code]);
  return { code, d, x: +x.toFixed(1), y: +y.toFixed(1) };
});
writeFileSync("src/lib/brazil-paths.json", JSON.stringify(paths));
console.log(`Gerados ${paths.length} estados a partir da malha do IBGE.`);
