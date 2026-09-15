import images from './generated/images.json'

type Manifest = Record<string, { width: number; height: number; variants: { width: number; src: string }[] }>
const manifest: Manifest = images

/** Responsive WebP <picture> with intrinsic size; `priority` is for the above-the-fold image that drives LCP. */
export function Img({ src, alt, className, priority = false, sizes = '100vw' }: { src: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  const image = manifest[src]
  if (!image) throw new Error(`[Img] ${src} is not in src/generated/images.json; run npm run images`)
  // React 18 has no typed fetchPriority prop, so pass the lowercase DOM attribute through.
  const fetchPriority = priority ? { fetchpriority: 'high' } : {}
  return <picture><source type="image/webp" srcSet={image.variants.map((variant) => `${variant.src} ${variant.width}w`).join(', ')} sizes={sizes} /><img className={className} src={`/${src}`} alt={alt} width={image.width} height={image.height} loading={priority ? 'eager' : 'lazy'} decoding={priority ? 'auto' : 'async'} {...fetchPriority} /></picture>
}
