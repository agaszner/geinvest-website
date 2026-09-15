# Geinvest website

An accessible, static marketing website for **Geinvest Kft.**, hosted as a static-assets Cloudflare Worker at `geinvestkft.com`. The contact form posts directly to [Web3Forms](https://web3forms.com), which emails each enquiry to the Geinvest inbox. There is no backend to deploy or maintain, and the recipient address is never exposed in the browser bundle.

## Materials ported from `geinvest-web.zip`

The supplied Hungarian source material has been incorporated into the React application rather than published as separate static HTML files:

- Home messaging, company description, service list, M&J hardfacing section, retrofit section, CTA, contact details, VAT number, and footer copy.
- React views for Márkák, Szerviz & Retrofit, Referenciák, Kapcsolat, Metso, M&J Recycling, MFL, and Outotec.
- Original images from `assets/img/home`, `assets/img/metso`, `assets/img/mj`, and `assets/img/service`, copied to `public/assets`.
- The source document’s manufacturer links and publication-review notes are retained on the relevant pages.

Before publishing, confirm reuse permission for the supplied Metso, M&J, and ifm images with the relevant partner/manufacturer terms. Also verify the exact contractual scope of the M&J and Outotec representation claims, and only publish an MFL product list when you have a primary MFL catalogue or equivalent documentation.

The added missing-brand visuals are real downloaded images, not generated placeholders: the Outotec image is from [Metso’s particle ore sorting page](https://www.metso.com/portfolio/sensor-based-ore-sorting/), and the MFL supporting crusher image is [“Mine rock crusher” on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mine_rock_crusher.jpg). Every image's source and licence is tracked in [`docs/image-credits.md`](docs/image-credits.md); images that require attribution are credited in the site footer.

The root `index.html` and the per-section entry files (for example `markak/index.html` and `szerviz/index.html`) provide real URLs. At build time every page is prerendered: its SEO head tags are injected from `src/content.ts` and the React components in `src/App.tsx` are rendered to full HTML, which the browser then hydrates.

## SEO és keresőbarát oldalak

- A fő témák külön, megosztható magyar URL-t kaptak: `/markak/`, `/szerviz/`, `/referenciak/`, `/kapcsolat/`, `/metso/`, `/mj-recycling/`, `/mfl/` és `/outotec/`.
- A teljes angol változat az `/en/` alatt érhető el, például `/en/brands/`, `/en/service-retrofit/` és `/en/contact/` címen. A fejléc és a lábléc nyelvváltója mindig az adott oldal magyar vagy angol megfelelőjére mutat.
- Minden URL-hez saját title, description, canonical, Open Graph és magyar–angol `hreflang` metaadat tartozik.
- A kezdőoldal LocalBusiness strukturált cégadatot tartalmaz a Geinvest névvel, ikladi címmel, telefonnal és kapcsolati e-maillel.
- Minden oldal build közben teljes HTML-ként előre renderelődik, így a Google JavaScript nélkül is látja a teljes tartalmat.
- A még helykitöltő tartalmú oldalak (jelenleg a Referenciák) a `src/content.ts` `unpublishedRoutes` listájában vannak: elérhetők, de `noindex` jelölést kapnak, és kimaradnak a menüből és a sitemapből. Ha valódi tartalom kerül rájuk, töröld őket a listából.
- A `public/robots.txt` engedélyezi a feltérképezést és a sitemapre mutat, amelyet a build generál a `dist/sitemap.xml` fájlba. Éles build után ezek itt érhetők el: `https://geinvestkft.com/robots.txt` és `https://geinvestkft.com/sitemap.xml`.

Élesítés után add hozzá a domaint a [Google Search Console](https://search.google.com/search-console) felületén, végezd el a DNS-es tulajdon-ellenőrzést, majd a **Sitemaps** résznél küldd be a `https://geinvestkft.com/sitemap.xml` címet. Az URL Inspection eszközzel külön is kérhetsz indexelést az új vagy módosított oldalakra. A sitemap és az indexelési kérés jelzés a Google felé; a helyezést nem garantálják, ezért a legnagyobb hatású további lépések a saját projektfotók, konkrét referenciák, hasznos magyar nyelvű szövegek és hiteles külső hivatkozások.

## Stack

- **React + TypeScript + Vite** — fast, small static site.
- **Cloudflare Workers (static assets) + Workers Builds** — hosting; builds and deploys automatically on every push to GitHub.
- **Web3Forms** — contact form submissions delivered straight to email, no server required.
- **PostHog EU** — privacy-conscious analytics, downloaded and started only after visitor consent.
- **sharp** — generates responsive WebP image variants at build time.

## Run locally

Requires Node.js 22 (use the current LTS release).

```bash
npm install
cp .env.example .env
npm run dev
```

Drop new JPG or PNG images into `public/assets/img/` and reference them with `<Img src="assets/img/..." />`; `npm run dev` and `npm run build` generate resized WebP variants automatically.

The contact form intentionally displays a configuration error until `VITE_WEB3FORMS_KEY` is set. Because the site is fully static, the form works identically on `localhost` and in production, so you can test it end to end before deploying.

## 1. Set up the contact form

1. Go to [web3forms.com](https://web3forms.com) and enter the inbox that should receive enquiries (for example `info@geinvestkft.com`).
2. Confirm the verification email Web3Forms sends to that address. Enquiries only ever go to this verified inbox.
3. Copy the access key you receive and put it in `.env`:

   ```text
   VITE_WEB3FORMS_KEY=your-access-key
   ```

4. Run `npm run dev`, submit the form, and check the inbox. Replies go straight back to the visitor because their address is set as the reply-to.

No account dashboard, billing, or deployment step is involved. To change the recipient later, register the new address and swap the key.

### Contact form notes

- The access key is public by design and safe to ship in the browser bundle. It only permits delivery to the verified inbox, so it cannot be used to send mail elsewhere or to read past submissions.
- The form keeps an invisible honeypot field (`website`) plus the Web3Forms `botcheck` field to filter basic spam bots.
- The free tier covers 250 submissions per month, which is far above expected volume for this site. Web3Forms emails you as the limit approaches.
- Submissions are not stored in your own database any more. Email is the record. Keep enquiries archived in the inbox, or add a Web3Forms webhook later if you want a copy elsewhere.

## 2. Configure PostHog

Create a PostHog project in the EU cloud and copy its project API key into `VITE_POSTHOG_KEY` (locally in `.env`, in production in Cloudflare, see below).

PostHog does not load unless a visitor chooses “Accept analytics”. The site does not identify visitors or record form fields. With consent, it records page views plus `call_click`, `email_click` and `form_submit` events tagged with the page, so you can see which pages produce enquiries. Configure the PostHog project’s data region and retention policy to fit Geinvest’s privacy requirements.

Each form email also names the page it was sent from (`page` and `page_url` fields, and in the subject line).

## 3. Cloudflare deployment

The site is a static-assets-only Cloudflare Worker (`geinvest-website`) connected to the GitHub repository through Workers Builds, so every push deploys.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node version | from `.node-version` (22) |

`wrangler.jsonc` tells wrangler to upload `dist/` as static assets. Keep it committed: without it, `wrangler deploy` auto-configures the project, injects `@cloudflare/vite-plugin` and rebuilds, which breaks the prerender step.

The `VITE_*` values are read at **build** time, so set them under the Worker's **Settings → Build → Variables and secrets** (plain variables; they are public browser configuration by design):

| Variable | Value |
| --- | --- |
| `VITE_WEB3FORMS_KEY` | Your Web3Forms access key |
| `VITE_POSTHOG_KEY` | Your PostHog project API key |
| `VITE_POSTHOG_HOST` | `https://eu.i.posthog.com` |

`public/_headers` caches the hashed bundles in `/_app/` and the generated images in `/assets/img/_opt/` for a year; HTML is always revalidated, so deploys show up immediately. Unknown URLs return a real 404.

After a deploy that changes URLs, resubmit `https://geinvestkft.com/sitemap.xml` in Google Search Console.

## Before launch checklist

- Replace the placeholder company claims, service descriptions, working hours, and location with Geinvest’s confirmed details.
- Submit a real form enquiry on the live domain and verify it arrives in the configured inbox, including checking the spam folder on the first send.
- Add the final legal company details, privacy contact, and data-retention period to the privacy copy after getting local legal guidance.
- Confirm the custom domain, HTTPS, PostHog consent behavior, and mobile layout.
- Confirm `VITE_WEB3FORMS_KEY` is set in the Worker's build variables so production builds include it.

## Commands

```bash
npm run dev       # develop the website (generates image variants first)
npm run build     # type-check, build, prerender every page into dist/
npm run check     # after a build: verify prerendering, images, SEO rules and caching
npm run images    # regenerate WebP variants and src/generated/images.json
npm run lint      # lint website code
```
