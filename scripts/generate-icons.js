/*
  Generates Android adaptive icon assets (foreground/background/monochrome)
  and a new iOS app icon with a non-white background from assets/images/icon.png

  Outputs:
  - assets/images/android-icon-foreground.png (432x432, transparent BG, padded)
  - assets/images/android-icon-background.png (432x432, filled color)
  - assets/images/android-icon-monochrome.png (432x432, single-color silhouette)
  - assets/images/app-icon.png (1024x1024, solid background) — used for iOS and general icon
*/

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const IMAGES_DIR = path.join(ROOT, "assets", "images");

// Inputs
const ICON_INPUT = path.join(IMAGES_DIR, "icon.png");
const SVG_LOGO_INPUT = path.join(IMAGES_DIR, "logo.svg");

// Outputs (match app.json paths to avoid extra edits)
const ANDROID_FOREGROUND_OUT = path.join(
  IMAGES_DIR,
  "android-icon-foreground.png",
);
const ANDROID_BACKGROUND_OUT = path.join(
  IMAGES_DIR,
  "android-icon-background.png",
);
const ANDROID_MONOCHROME_OUT = path.join(
  IMAGES_DIR,
  "android-icon-monochrome.png",
);
const APP_ICON_OUT = path.join(IMAGES_DIR, "app-icon.png");

// Sizes (Android adaptive icons use 432px for 4x density assets)
const ANDROID_SIZE = 432; // full size
// Safe padding around artwork (pixels). Can be overridden with env var ANDROID_PADDING.
// Example: ANDROID_PADDING=64 node ./scripts/generate-icons.js
const ANDROID_PADDING = parseInt(process.env.ANDROID_PADDING || "48", 10); // safe padding around artwork
const CONTENT_SIZE = ANDROID_SIZE - ANDROID_PADDING * 2; // content box

const IOS_ICON_SIZE = 1024; // Expo recommends 1024x1024 source icon

// Brand/background color that keeps the white key visible
const BRAND_BG = "#E6F4FE"; // matches app.json android.adaptiveIcon.backgroundColor

async function ensureImagesDir() {
  await fs.promises.mkdir(IMAGES_DIR, { recursive: true });
}

async function pickInput() {
  // Prefer PNG icon; fall back to SVG if needed
  const hasPng = fs.existsSync(ICON_INPUT);
  const hasSvg = fs.existsSync(SVG_LOGO_INPUT);
  if (hasPng) return { inputPath: ICON_INPUT, type: "png" };
  if (hasSvg) return { inputPath: SVG_LOGO_INPUT, type: "svg" };
  throw new Error(
    `No input icon found. Place icon.png or logo.svg in ${IMAGES_DIR}`,
  );
}

async function generateAndroidForeground(inputPath) {
  // Resize into content box, keep transparency, then center on a transparent 432x432 canvas
  const contentBuf = await sharp(inputPath)
    .resize({
      width: CONTENT_SIZE,
      height: CONTENT_SIZE,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: ANDROID_SIZE,
      height: ANDROID_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: contentBuf, left: ANDROID_PADDING, top: ANDROID_PADDING },
    ])
    .png();

  await canvas.toFile(ANDROID_FOREGROUND_OUT);
}

async function generateAndroidBackground() {
  await sharp({
    create: {
      width: ANDROID_SIZE,
      height: ANDROID_SIZE,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .png()
    .toFile(ANDROID_BACKGROUND_OUT);
}

async function generateAndroidMonochrome(inputPath) {
  // Build a solid black silhouette using the input's alpha as the new alpha channel
  // 1) Resize to content box
  const resized = sharp(inputPath).resize({
    width: CONTENT_SIZE,
    height: CONTENT_SIZE,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  // 2) Extract alpha channel (PNG) from resized; then inspect its real dimensions
  const alphaPng = await resized
    .ensureAlpha()
    .extractChannel("alpha")
    .toBuffer();

  const { width: w = CONTENT_SIZE, height: h = CONTENT_SIZE } =
    await sharp(alphaPng).metadata();

  // 3) Create a 3-channel black image and join alpha as the 4th channel
  const blackRGB = sharp({
    create: { width: w, height: h, channels: 3, background: "#000000" },
  });
  const blackWithAlpha = await blackRGB.joinChannel(alphaPng).png().toBuffer();

  // 4) Place silhouette into 432x432 transparent canvas with padding
  const canvas = sharp({
    create: {
      width: ANDROID_SIZE,
      height: ANDROID_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: blackWithAlpha, left: ANDROID_PADDING, top: ANDROID_PADDING },
    ])
    .png();

  await canvas.toFile(ANDROID_MONOCHROME_OUT);
}

async function generateIosIcon(inputPath) {
  // Create 1024x1024 canvas filled with brand background, then center the icon
  const contentTarget = Math.round(IOS_ICON_SIZE * 0.76);
  const content = await sharp(inputPath)
    .resize({
      width: contentTarget,
      height: contentTarget,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Centering offsets
  const pad = Math.round((IOS_ICON_SIZE - contentTarget) / 2);

  await sharp({
    create: {
      width: IOS_ICON_SIZE,
      height: IOS_ICON_SIZE,
      channels: 4,
      background: BRAND_BG,
    },
  })
    .composite([{ input: content, left: pad, top: pad }])
    .png()
    .toFile(APP_ICON_OUT);
}

async function main() {
  await ensureImagesDir();
  const { inputPath } = await pickInput();
  console.log(
    `Using ANDROID_PADDING = ${ANDROID_PADDING}px (content box ${CONTENT_SIZE}×${CONTENT_SIZE})`,
  );

  console.log(
    "• Generating Android foreground icon →",
    path.relative(ROOT, ANDROID_FOREGROUND_OUT),
  );
  await generateAndroidForeground(inputPath);

  console.log(
    "• Generating Android background icon →",
    path.relative(ROOT, ANDROID_BACKGROUND_OUT),
  );
  await generateAndroidBackground();

  console.log(
    "• Generating Android monochrome icon →",
    path.relative(ROOT, ANDROID_MONOCHROME_OUT),
  );
  await generateAndroidMonochrome(inputPath);

  console.log(
    "• Generating iOS/general app icon with background →",
    path.relative(ROOT, APP_ICON_OUT),
  );
  await generateIosIcon(inputPath);

  console.log("✓ Icons generated.");
  console.log(
    "\nNext steps:\n- Ensure app.json uses 'app-icon.png' for 'icon' (this script expects that).\n- Android adaptiveIcon already points to the generated files if paths match app.json.\n",
  );
}

main().catch((err) => {
  console.error("Icon generation failed:\n", err);
  process.exit(1);
});
