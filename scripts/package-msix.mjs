import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw new Error(`Could not run ${command}: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function toMsixVersion(version) {
  const parts = version.split("-")[0].split(".");
  while (parts.length < 4) parts.push("0");
  if (parts.length !== 4 || parts.some(part => !/^\\d+$/.test(part) || Number(part) > 65535)) {
    throw new Error(`Invalid MSIX version derived from package.json: ${version}`);
  }
  return parts.join(".");
}

const version = toMsixVersion(packageJson.version);
const tauriExe = path.join(root, "src-tauri", "target", "release", "memomaster.exe");
const icon = path.join(root, "src-tauri", "icons", "128x128@2x.png");
const manifestTemplate = path.join(root, "src-tauri", "msix", "Package.appxmanifest");
const staging = path.join(root, "src-tauri", "target", "msix-staging");
const assets = path.join(staging, "Assets");
const outputDir = path.join(root, "src-tauri", "target", "msix");
const output = path.join(outputDir, `MemoMaster_${version}_x64.msix`);

console.log("Building MemoMaster without an MSI/NSIS installer...");
run("npm", ["run", "tauri", "--", "build", "--no-bundle"]);

rmSync(staging, { recursive: true, force: true });
mkdirSync(assets, { recursive: true });
mkdirSync(outputDir, { recursive: true });
copyFileSync(tauriExe, path.join(staging, "MemoMaster.exe"));

for (const assetName of ["StoreLogo.png", "Square44x44Logo.png", "Square150x150Logo.png"]) {
  copyFileSync(icon, path.join(assets, assetName));
}

const manifest = readFileSync(manifestTemplate, "utf8")
  .replace('Version="0.1.0.0"', `Version="${version}"`);
writeFileSync(path.join(staging, "Package.appxmanifest"), manifest, "utf8");

console.log("Creating an unsigned MSIX for Microsoft Store submission...");
run("winapp", [
  "pack", staging,
  "--manifest", path.join(staging, "Package.appxmanifest"),
  "--no-sign",
  "--output", output,
]);

console.log(`\\nMSIX created: ${path.relative(root, output)}`);
console.log("This package is intentionally unsigned. Submit it through Partner Center; Microsoft signs Store packages after certification.");
