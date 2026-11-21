// Neon Coast Cover Maker — the hand-in program for make.fun's
// gta6-cover-art-01 bounty.
//
// The deliverable itself is the offline web app in app/ (plain static
// files, no libraries, nothing fetched). This program is the courier
// that hands it in, and it works in four steps:
//
//   1. inspect the entry on disk and refuse early if a piece is missing;
//   2. publish app/ and screenshots/ into the output directory
//      (MAKEFUN_OUTPUT_DIR when set, /output when it is not);
//   3. describe the published tree with the vendored dossier library
//      and store the result as dossier.json next to the copies;
//   4. print a one-screen summary of what was handed in.
//
// Node 22, standard library only, no build step:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The caps this bounty scores under. Of these, only the text cap shapes
// the dossier's bytes; the remaining ones exist so that this program
// fails on the same entries the scorer would turn away: too many
// screenshots or one too heavy, an app tree with too many entries or
// too many bytes in total, or a single app path that runs too long.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const IMAGE_NAME = /\.(?:png|jpe?g)$/i;

interface TreeMeasure {
  files: number;
  bytes: number;
}

/** Counts the regular files below a directory and adds up their sizes. */
function measureTree(root: string): TreeMeasure {
  const total: TreeMeasure = { files: 0, bytes: 0 };
  const pending: string[] = [root];
  while (pending.length > 0) {
    const dir = pending.pop() as string;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else if (entry.isFile()) {
        total.files += 1;
        total.bytes += lstatSync(path).size;
      }
    }
  }
  return total;
}

/** Stops the run with a clear message when a required folder is absent. */
function requireFolder(path: string, label: string): void {
  if (!existsSync(path) || !lstatSync(path).isDirectory()) {
    throw new Error(`${label} is missing: expected a directory at ${path}`);
  }
}

/**
 * Pre-flight inspection of the entry before anything is copied: the app
 * folder must hold its entry page, and the screenshots folder must hold
 * at least one image and no more than the scorer accepts. Returns the
 * screenshot file names in sorted order.
 */
function inspectEntry(appDir: string, shotsDir: string): string[] {
  requireFolder(appDir, 'app/');
  const page = join(appDir, 'index.html');
  if (!existsSync(page) || !lstatSync(page).isFile()) {
    throw new Error('app/index.html is missing: the app has no entry page');
  }
  requireFolder(shotsDir, 'screenshots/');
  const shots = readdirSync(shotsDir)
    .filter((name) => IMAGE_NAME.test(name))
    .sort();
  if (shots.length === 0) {
    throw new Error('screenshots/ holds no PNG or JPEG image to hand in');
  }
  if (shots.length > LIMITS.screenshots.max) {
    throw new Error(
      `screenshots/ holds ${shots.length} images, over the ${LIMITS.screenshots.max} allowed`,
    );
  }
  return shots;
}

/** Copies one folder of the entry into the output directory. */
function publishFolder(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function handIn(): void {
  const entryRoot = fileURLToPath(new URL('.', import.meta.url));
  const appDir = join(entryRoot, 'app');
  const shotsDir = join(entryRoot, 'screenshots');

  const shots = inspectEntry(appDir, shotsDir);

  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outputDir, { recursive: true });
  publishFolder(appDir, join(outputDir, 'app'));
  publishFolder(shotsDir, join(outputDir, 'screenshots'));

  const dossier = buildDossier(outputDir, LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  const appMeasure = measureTree(join(outputDir, 'app'));
  console.log('Neon Coast Cover Maker — handed in');
  console.log(`  app:         ${appMeasure.files} files, ${appMeasure.bytes} bytes`);
  console.log(`  screenshots: ${shots.length} (${shots.join(', ')})`);
  console.log(`  dossier:     ${dossier.length} bytes -> ${join(outputDir, 'dossier.json')}`);
}

handIn();
