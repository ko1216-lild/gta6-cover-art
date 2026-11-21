// Delivery program for Neon Coast Cover Maker, the entry to
// make.fun's gta6-cover-art-01 bounty.
//
// The app being delivered is a bundle of static files in app/.
// This program is the courier, not the app: it looks the entry
// over, refuses early when something is off, copies app/ and
// screenshots/ into the output directory, and then asks the
// vendored dossier library (vendor/makefun-app.ts, included
// exactly as the kit shipped it) to describe the copied tree.
// That description is stored as dossier.json in the output
// directory.
//
// Where the output goes: the MAKEFUN_OUTPUT_DIR environment
// variable when it is set, otherwise /output.
//
// Plain Node 22, standard library only, no build step:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The bounty's gate limits, passed on to buildDossier as they
// are. Checking the entry against them here first costs little
// and turns a refusal by the scorer into a message that says
// what is actually wrong.
const BOUNTY_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const IMAGE_SUFFIX = /\.(?:png|jpg|jpeg)$/i;
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47];
const JPEG_HEAD = [0xff, 0xd8, 0xff];

/** Aborts the delivery with a plain-language reason. */
function bail(reason: string): never {
  throw new Error(`delivery refused: ${reason}`);
}

interface AppSurvey {
  entries: number;
  payloadBytes: number;
}

/**
 * Walks app/ once, counting entries (files and folders together,
 * the way the gate counts them) and adding up the file bytes, and
 * checking every relative path against the path-length cap. The
 * entry page is verified on the way out.
 */
function surveyApp(appDir: string): AppSurvey {
  if (!existsSync(appDir)) bail('the app/ folder is not there');
  let entries = 0;
  let payloadBytes = 0;
  const stack: string[] = [''];
  while (stack.length > 0) {
    const rel = stack.pop() as string;
    const dir = rel === '' ? appDir : join(appDir, rel);
    for (const name of readdirSync(dir)) {
      const childRel = rel === '' ? name : `${rel}/${name}`;
      if (Buffer.byteLength(childRel, 'utf8') > BOUNTY_CAPS.app_path_max_bytes) {
        bail(`app/${childRel} has a path over ${BOUNTY_CAPS.app_path_max_bytes} bytes`);
      }
      entries += 1;
      if (entries > BOUNTY_CAPS.app_max_files) {
        bail(`app/ holds more than ${BOUNTY_CAPS.app_max_files} entries`);
      }
      const childPath = join(appDir, childRel);
      if (statSync(childPath).isDirectory()) {
        stack.push(childRel);
      } else {
        payloadBytes += statSync(childPath).size;
      }
    }
  }
  if (payloadBytes > BOUNTY_CAPS.app_max_bytes) {
    bail(`app/ comes to ${payloadBytes} bytes, over the ${BOUNTY_CAPS.app_max_bytes} allowed`);
  }
  if (!existsSync(join(appDir, 'index.html'))) {
    bail('app/index.html is missing, so the app has no front page');
  }
  return { entries, payloadBytes };
}

/**
 * Names the screenshots that may be handed in: image files in
 * name order, each one confirmed as a real PNG or JPEG by its
 * opening bytes rather than by its name alone, each within the
 * size cap, and no more of them than the gate accepts.
 */
function surveyShots(shotsDir: string): string[] {
  if (!existsSync(shotsDir)) bail('the screenshots/ folder is not there');
  const names = readdirSync(shotsDir)
    .filter((name) => IMAGE_SUFFIX.test(name))
    .sort();
  if (names.length === 0) bail('screenshots/ holds no PNG or JPEG image');
  if (names.length > BOUNTY_CAPS.screenshots.max) {
    bail(`screenshots/ holds ${names.length} images, over the ${BOUNTY_CAPS.screenshots.max} allowed`);
  }
  for (const name of names) {
    const path = join(shotsDir, name);
    const size = statSync(path).size;
    if (size > BOUNTY_CAPS.screenshots.max_bytes) {
      bail(`screenshots/${name} is ${size} bytes, over the ${BOUNTY_CAPS.screenshots.max_bytes} allowed`);
    }
    const head = readFileSync(path).subarray(0, PNG_HEAD.length);
    const isPng = PNG_HEAD.every((b, i) => head[i] === b);
    const isJpeg = JPEG_HEAD.every((b, i) => head[i] === b);
    if (!isPng && !isJpeg) bail(`screenshots/${name} is neither a PNG nor a JPEG inside`);
  }
  return names;
}

function deliver(): void {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const appDir = join(root, 'app');
  const shotsDir = join(root, 'screenshots');

  const app = surveyApp(appDir);
  const shots = surveyShots(shotsDir);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  cpSync(appDir, join(outDir, 'app'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, BOUNTY_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  console.log('Neon Coast Cover Maker: entry handed in');
  console.log(`  output directory : ${outDir}`);
  console.log(`  app/             : ${app.entries} entries, ${app.payloadBytes} bytes of files`);
  console.log(`  screenshots/     : ${shots.length} images (${shots.join(', ')})`);
  console.log(`  dossier.json     : ${dossier.length} bytes`);
}

deliver();
