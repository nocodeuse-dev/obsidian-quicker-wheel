import { copyFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const pluginId = "obsidian-quicker-wheel";
const targetDir =
  process.env.OBSIDIAN_QUICKER_TARGET ??
  "/Users/yangjiahao/Documents/Steamboy/.obsidian/plugins/obsidian-quicker-wheel";
const files = ["main.js", "manifest.json", "styles.css"];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe"
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim()
  };
}

function printStep(label, result) {
  if (result.output) {
    console.log(result.output);
    return;
  }

  console.log(label);
}

function mentionsPluginNotFound(result) {
  return /Plugin "obsidian-quicker-wheel" not found|Plugin .* not found/i.test(result.output);
}

function alreadyEnabled(result) {
  return /already enabled/i.test(result.output);
}

async function main() {
  const hadManifest = existsSync(join(targetDir, "manifest.json"));

  await mkdir(targetDir, { recursive: true });
  for (const file of files) {
    await mkdir(dirname(join(targetDir, file)), { recursive: true });
    await copyFile(join(root, file), join(targetDir, file));
  }

  const sourceManifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
  const targetManifest = JSON.parse(await readFile(join(targetDir, "manifest.json"), "utf8"));
  if (sourceManifest.id !== targetManifest.id || sourceManifest.version !== targetManifest.version) {
    throw new Error("Target manifest does not match source manifest after sync.");
  }

  console.log(`Copied ${files.join(", ")} to ${targetDir}`);
  console.log(`Verified ${targetManifest.id}@${targetManifest.version}`);

  const obsidian = run("obsidian", ["--version"]);
  if (!obsidian.ok) {
    console.log("Obsidian CLI not available; skipped plugin reload.");
    return;
  }

  if (!hadManifest) {
    const reloadVault = run("obsidian", ["reload", "vault=Steamboy"]);
    printStep("Requested vault reload.", reloadVault);
  }

  let enable = run("obsidian", ["plugin:enable", "vault=Steamboy", `id=${pluginId}`]);
  if (mentionsPluginNotFound(enable)) {
    printStep("Plugin not discovered yet; requested vault reload.", run("obsidian", ["reload", "vault=Steamboy"]));
    enable = run("obsidian", ["plugin:enable", "vault=Steamboy", `id=${pluginId}`]);
  }
  if (alreadyEnabled(enable)) {
    console.log(`Already enabled: ${pluginId}`);
  } else {
    printStep("Requested plugin enable.", enable);
  }

  let reloadPlugin = run("obsidian", ["plugin:reload", "vault=Steamboy", `id=${pluginId}`]);
  if (mentionsPluginNotFound(reloadPlugin)) {
    printStep("Plugin not reloadable yet; requested vault reload.", run("obsidian", ["reload", "vault=Steamboy"]));
    reloadPlugin = run("obsidian", ["plugin:reload", "vault=Steamboy", `id=${pluginId}`]);
  }
  printStep("Requested plugin reload.", reloadPlugin);

  if (!reloadPlugin.ok) {
    console.log("Plugin reload command did not complete; files are synced and verified.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
