---
name: image-processing
description: Local raster image work with ImageMagick, libvips or sharp, and Pillow - resizing, cropping and format conversion with EXIF orientation applied first, compressing for the web as AVIF, WebP or optimised JPEG and PNG with responsive srcset widths, sharpening and tidying screenshots, stripping EXIF and GPS metadata before publishing, batch jobs that never overwrite originals, and local background removal, each followed by a before-and-after check of size, dimensions and visible quality. Use when someone needs images shrunk or converted for a website, a folder of photos resized or renamed in bulk, screenshots cleaned up for docs, location data removed from photos, or a product photo cut out from its background without an online service.
license: MIT
compatibility: Any Agent Skills host. Needs at least one of ImageMagick 7 (magick), libvips (vips, vipsthumbnail) or Node with sharp, or Python with Pillow; exiftool for metadata; rembg (Python) for background removal.
metadata:
  kete-loom/version: "0.1.0"
  kete-loom/category: coding
  kete-loom/risk: runs-commands
  kete-loom/owner: "Kete-org"
---

# Image processing

Inspect, transform a copy, then compare with the original. Generating new images with a model is `ai-media-generation`; video frames are `ffmpeg-media-processing`.

## Ground rules

1. **Never overwrite originals.** Write to a new folder (`out/`) or a new suffix. Batch jobs especially: one wrong flag on `mogrify` in place destroys a folder.
2. **Apply orientation before anything else.** Phone photos are often stored sideways with an EXIF Orientation tag. Auto-orient first (`-auto-orient`, sharp `.rotate()` with no arguments, Pillow `ImageOps.exif_transpose`), or stripping metadata will leave them rotated.
3. **Downscale only.** Never enlarge a raster image to meet a size; ask for a bigger source.
4. **Stop and ask** before: deleting or replacing source files, lossy recompression of print or archival masters, and removing colour profiles from colour-critical work (product shots, photography portfolios).
5. Prefer the tool already in the project: sharp in a Node build, Pillow in Python, otherwise ImageMagick or libvips on the command line. libvips/sharp are much faster and lighter on memory for big batches.

## 1. Inspect

```bash
magick identify -format "%f %wx%h %m %[colorspace] %[orientation] %b\n" in/*   # or: vipsheader -a in.jpg
exiftool -Orientation -GPSPosition -Make -Model -ICC_Profile:ProfileDescription in.jpg
```

Record format, dimensions, file size, orientation, colour profile, transparency, and whether GPS data is present.

## 2. Common jobs

| Job | ImageMagick 7 | sharp (Node) |
|---|---|---|
| Fit inside 1600px, shrink only | `magick in.jpg -auto-orient -resize "1600x1600>" out.jpg` | `sharp(i).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })` |
| Exact crop to 1200x630 (social card) | `magick in.jpg -auto-orient -resize "1200x630^" -gravity center -extent 1200x630 out.jpg` | `.resize(1200, 630, { fit: "cover", position: "attention" })` |
| WebP | `magick in.png -quality 80 out.webp` (or `cwebp -q 80 in.png -o out.webp`) | `.webp({ quality: 80 })` |
| AVIF | `magick in.jpg -quality 50 out.avif` (needs a build with HEIF/AVIF support) | `.avif({ quality: 50 })` |
| JPEG for the web | `magick in.jpg -auto-orient -strip -sampling-factor 4:2:0 -interlace Plane -quality 82 out.jpg` | `.jpeg({ quality: 82, mozjpeg: true })` |
| Light sharpening after downscale | `-unsharp 0x0.75+0.75+0.008` | `.sharpen()` |

libvips: `vipsthumbnail in.jpg --size '1600x>' -o '/abs/path/out/%s.webp[Q=78]'` resizes (shrink only, from the `>`) and converts in one step; a relative `-o` path is resolved against each input file's folder, so give an absolute one. Pillow: `ImageOps.exif_transpose(im)`, then `im.thumbnail((1600, 1600), Image.Resampling.LANCZOS)`, then `im.save("out.webp", quality=80, method=6)`.

Quality numbers are starting points; check the result (section 4) and adjust.

## 3. Web delivery

1. Pick widths from the layout, not guesses: the largest rendered CSS width times 2 for high-density screens, plus 2-4 smaller steps (for example 480, 800, 1200, 1600, 2400).
2. Produce AVIF and WebP, and keep a JPEG (photos) or PNG (graphics with transparency or sharp edges) fallback.
3. Mark it up so the browser picks:

```html
<picture>
  <source type="image/avif" srcset="hero-800.avif 800w, hero-1600.avif 1600w" sizes="(max-width: 800px) 100vw, 800px">
  <source type="image/webp" srcset="hero-800.webp 800w, hero-1600.webp 1600w" sizes="(max-width: 800px) 100vw, 800px">
  <img src="hero-1600.jpg" width="1600" height="900" alt="..." loading="lazy" decoding="async">
</picture>
```

Always set `width` and `height` (stops layout shift) and real `alt` text. Do not lazy-load the main above-the-fold image. If the site has an image CDN or a framework image component (Next.js `Image`, Astro `Image`), use it instead of hand-made variants.

## 4. Screenshots and graphics

- Keep screenshots as PNG (or lossless WebP); JPEG blurs text. Crop to the relevant area, scale to the docs' display width times 2.
- Shrink PNGs with `pngquant --quality=65-85 --skip-if-larger --strip --output out.png in.png` (lossy palette, usually invisible on UI captures) and/or `oxipng -o 4 --strip safe out.png` (lossless).
- Blur or box out secrets, emails and customer data before anything else; do not rely on cropping a corner. Check the result by eye.

## 5. Metadata and privacy

- Remove everything for public images: `exiftool -all= -o out/ in/*.jpg` (writes copies). sharp strips metadata unless you call `keepMetadata()`/`withMetadata()`; ImageMagick uses `-strip`.
- Keep the ICC colour profile when colours matter: `exiftool -all= --icc_profile:all ...` keeps it, sharp `keepIccProfile()`.
- Confirm: `exiftool -gps:all -a out/*.jpg` shows no GPS tags (only the per-file headers).

## 6. Background removal (local)

`pip install "rembg[cpu,cli]"`, then `rembg i in.jpg out.png` or a folder with `rembg p in/ out/`. Output is PNG with transparency. Each model has its own licence; check it before commercial use. Inspect edges (hair, glass, shadows) at full size, and say when the cut-out needs manual touch-up.

## 7. Check before and after

For each output (or a sample of a batch): dimensions, file size and percentage saved, format, orientation correct, transparency kept where it existed, and a visual comparison at 100% for text, edges, gradients (banding) and skin tones. A numeric check helps for batches: `magick compare -metric PSNR in.png out.png null:` (same dimensions only; the score goes to stderr; higher is closer).

## Report

```
Inputs: <n> files, <formats>, <total size>
Operations: <resize/crop/convert/compress/strip/cut-out with key settings>
Outputs: <folder>, <n> files, <total size> (<x>% smaller)
Checks: orientation <ok>, metadata/GPS removed <yes/no>, visual check <files viewed, issues>
Originals: untouched at <path>
Markup: <srcset/picture snippet if web delivery>
```
