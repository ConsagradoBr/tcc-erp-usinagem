import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const desktopExe = resolve(projectRoot, "dist", "AMP Usinagem Industrial.exe");

if (existsSync(desktopExe)) {
  rmSync(desktopExe, { force: true });
}

execSync("npm run build", {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
});

execSync(
  'backend\\venv\\Scripts\\python.exe -m PyInstaller --clean --noconfirm "AMP Usinagem Industrial.spec"',
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  }
);
