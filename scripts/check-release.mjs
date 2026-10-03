import { readFile, readdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import { join } from "node:path";

const failures = [];
const secrets = new Set();
for (const filename of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  try {
    const env = parseEnv(await readFile(filename, "utf8"));
    for (const [name, value] of Object.entries(env)) {
      if (/RAWG.*KEY/i.test(name) && value.trim() && !/^(your_|ваш_)/.test(value)) secrets.add(value.trim());
      if (/^VITE_.*(KEY|SECRET|TOKEN|PASSWORD)/i.test(name) && value.trim()) failures.push(`${filename}: remove client-visible secret variable ${name}`);
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}
if (process.env.RAWG_API_KEY) secrets.add(process.env.RAWG_API_KEY.trim());
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
for (const filename of tracked) {
  if (/^\.env(?:\.|$)/.test(filename) && filename !== ".env.example") failures.push(`${filename}: secret environment file is tracked by Git`);
  if (filename.startsWith("dist/")) failures.push(`${filename}: compiled assets must not be tracked`);
  if (/\.(png|jpe?g|webp|ico|woff2?)$/.test(filename)) continue;
  const text = await readFile(filename, "utf8").catch(() => "");
  if ([...secrets].some((secret) => text.includes(secret))) failures.push(`${filename}: contains a configured secret (value hidden)`);
}
async function inspect(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const filename = join(dir, item.name);
    if (item.isDirectory()) await inspect(filename);
    else if (/\.(html|js|css|json|map|webmanifest|txt|env)$/.test(filename) || item.name.startsWith(".env")) {
      const text = await readFile(filename, "utf8");
      if ([...secrets].some((secret) => text.includes(secret))) failures.push(`${filename}: secret found in public build (value hidden)`);
      if (text.includes("VITE_RAWG_API_KEY")) failures.push(`${filename}: legacy public RAWG variable remains`);
      if (item.name.startsWith(".env")) failures.push(`${filename}: environment file must never be public`);
    }
  }
}
try {
  await inspect("dist");
  const manifest = JSON.parse(await readFile("dist/manifest.webmanifest", "utf8"));
  for (const icon of manifest.icons) await stat(join("dist", icon.src));
  await stat("dist/sw.js");
  await stat("dist/index.html");
} catch (error) { failures.push(`Build incomplete: ${error.code ?? error.message}. Run pnpm build.`); }
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log("Release checks passed: configured secrets are absent from Git files and public assets; PWA files exist.");
