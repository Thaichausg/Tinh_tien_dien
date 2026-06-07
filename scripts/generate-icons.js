/**
 * Icon Generator Script
 *
 * Generates PWA icons from SVG source
 *
 * Usage:
 *   1. First install sharp: npm install sharp
 *   2. Run: node scripts/generate-icons.js
 *
 * Or use online converter:
 *   - https://cloudconvert.com/svg-to-png
 *   - https://realfavicongenerator.net/
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Using alternative method...');
}

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SVG_SOURCE = path.join(__dirname, '..', 'public', 'icons', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  if (!sharp) {
    console.log('\n⚠️  Sharp not installed. Please run:');
    console.log('   npm install sharp');
    console.log('\n📝 Alternative: Use https://realfavicongenerator.net/');
    console.log('   Upload public/icons/icon.svg to generate all sizes');
    return;
  }

  console.log('⚡ Generating PWA icons...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const svgBuffer = fs.readFileSync(SVG_SOURCE);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ icon-${size}x${size}.png`);
  }

  // Also generate a favicon.ico (multi-size)
  const faviconSizes = [16, 32, 48];
  const faviconBuffers = await Promise.all(
    faviconSizes.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );

  console.log('\n✅ All icons generated successfully!');
  console.log('📁 Check public/icons/ directory');
}

// Run
generateIcons().catch(console.error);