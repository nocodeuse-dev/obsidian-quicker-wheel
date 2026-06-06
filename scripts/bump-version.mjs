import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const packagePath = join(root, "package.json");
const lockPath = join(root, "package-lock.json");
const manifestPath = join(root, "manifest.json");

function bumpPatch(version) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Unsupported semver version: ${version}`);
  }

  parts[2] += 1;
  return parts.join(".");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const packageJson = await readJson(packagePath);
const manifestJson = await readJson(manifestPath);
const nextVersion = bumpPatch(packageJson.version);

packageJson.version = nextVersion;
manifestJson.version = nextVersion;

await writeJson(packagePath, packageJson);
await writeJson(manifestPath, manifestJson);

try {
  const lockJson = await readJson(lockPath);
  lockJson.version = nextVersion;
  if (lockJson.packages?.[""]) {
    lockJson.packages[""].version = nextVersion;
  }
  await writeJson(lockPath, lockJson);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    // package-lock.json is optional for local plugin development.
  } else {
    throw error;
  }
}

console.log(`Bumped version to ${nextVersion}`);
