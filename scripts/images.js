import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import sharp from 'sharp'

/** Generates hashed, resized WebP variants of every public image plus a size manifest for <Img>. Runs before dev and build. */
const root = 'public/assets/img'
const outDir = path.join(root, '_opt')
const manifestFile = 'src/generated/images.json'
const widths = [480, 960, 1440, 1920]
const quality = 70

const files = (await readdir(root, { recursive: true })).filter((file) => /\.(jpe?g|png)$/i.test(file) && !file.startsWith('_opt')).sort()
await mkdir(outDir, { recursive: true })
await mkdir(path.dirname(manifestFile), { recursive: true })
const manifest = {}
const keep = new Set()
for (const file of files) {
  const source = await readFile(path.join(root, file))
  // The hash covers the encoder settings too, so changing quality regenerates instead of reusing stale files.
  const hash = createHash('sha256').update(source).update(`q${quality}`).digest('hex').slice(0, 10)
  const meta = await sharp(source).metadata()
  // Phone photos store rotation in EXIF; orientations 5-8 swap the visible width and height.
  const [width, height] = (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height]
  const base = file.replace(/\.[^.]+$/, '').split(path.sep).join('-')
  const variants = []
  for (const target of [...new Set(widths.map((value) => Math.min(value, width)))]) {
    const name = `${base}-${target}-${hash}.webp`
    keep.add(name)
    const out = path.join(outDir, name)
    if (!(await stat(out).catch(() => null))) await sharp(source).rotate().resize({ width: target }).webp({ quality }).toFile(out)
    variants.push({ width: target, src: `/assets/img/_opt/${name}` })
  }
  manifest[`assets/img/${file.split(path.sep).join('/')}`] = { width, height, variants }
}
for (const name of await readdir(outDir)) if (!keep.has(name)) await rm(path.join(outDir, name))
await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`[images] ${files.length} images, ${keep.size} variants`)
