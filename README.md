# Geinvest website

An accessible, static marketing website for **Geinvest Kft.**, designed for GitHub Pages at `geinvestkft.com`. The contact form posts directly to [Web3Forms](https://web3forms.com), which emails each enquiry to the Geinvest inbox. There is no backend to deploy or maintain, and the recipient address is never exposed in the browser bundle.

## Materials ported from `geinvest-web.zip`

The supplied Hungarian source material has been incorporated into the React application rather than published as separate static HTML files:

- Home messaging, company description, service list, M&J hardfacing section, retrofit section, CTA, contact details, VAT number, and footer copy.
- React views for Márkák, Szerviz & Retrofit, Referenciák, Kapcsolat, Metso, M&J Recycling, MFL, and Outotec.
- Original images from `assets/img/home`, `assets/img/metso`, `assets/img/mj`, and `assets/img/service`, copied to `public/assets`.
- The source document’s manufacturer links and publication-review notes are retained on the relevant pages.

Before publishing, confirm reuse permission for the supplied Metso, M&J, and ifm images with the relevant partner/manufacturer terms. Also verify the exact contractual scope of the M&J and Outotec representation claims, and only publish an MFL product list when you have a primary MFL catalogue or equivalent documentation.

The added missing-brand visuals are real downloaded images, not generated placeholders: the Outotec image is from [Metso’s particle ore sorting page](https://www.metso.com/portfolio/sensor-based-ore-sorting/), and the MFL supporting crusher image is [“Mine rock crusher” on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mine_rock_crusher.jpg). Confirm current reuse terms and retain the corresponding attribution before launch.

The root `index.html` and the per-section entry files (for example `markak/index.html` and `szerviz/index.html`) provide crawlable metadata and real URLs. The visible page content and navigation are rendered by React components in `src/App.tsx`.

## SEO és keresőbarát oldalak

- A fő témák külön, megosztható magyar URL-t kaptak: `/markak/`, `/szerviz/`, `/referenciak/`, `/kapcsolat/`, `/metso/`, `/mj-recycling/`, `/mfl/` és `/outotec/`.
- A teljes angol változat az `/en/` alatt érhető el, például `/en/brands/`, `/en/service-retrofit/` és `/en/contact/` címen. A fejléc és a lábléc nyelvváltója mindig az adott oldal magyar vagy angol megfelelőjére mutat.
- Minden URL-hez saját title, description, canonical, Open Graph és magyar–angol `hreflang` metaadat tartozik.
- A kezdőoldal LocalBusiness strukturált cégadatot tartalmaz a Geinvest névvel, ikladi címmel, telefonnal és kapcsolati e-maillel.
- A `public/robots.txt` engedélyezi a feltérképezést és a `public/sitemap.xml` fájlra mutat. Éles build után ezek itt érhetők el: `https://geinvestkft.com/robots.txt` és `https://geinvestkft.com/sitemap.xml`.

Élesítés után add hozzá a domaint a [Google Search Console](https://search.google.com/search-console) felületén, végezd el a DNS-es tulajdon-ellenőrzést, majd a **Sitemaps** résznél küldd be a `https://geinvestkft.com/sitemap.xml` címet. Az URL Inspection eszközzel külön is kérhetsz indexelést az új vagy módosított oldalakra. A sitemap és az indexelési kérés jelzés a Google felé; a helyezést nem garantálják, ezért a legnagyobb hatású további lépések a saját projektfotók, konkrét referenciák, hasznos magyar nyelvű szövegek és hiteles külső hivatkozások.

## Stack

- **React + TypeScript + Vite** — fast, small static site.
- **GitHub Pages + GitHub Actions** — hosting and automatic deployment on pushes to `main`.
- **Web3Forms** — contact form submissions delivered straight to email, no server required.
- **PostHog EU** — privacy-conscious analytics, loaded only after visitor consent.

## Run locally

Requires Node.js 22 (use the current LTS release).

```bash
npm install
cp .env.example .env
npm run dev
```

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

1. Create a PostHog project in the EU cloud and copy its project API key.
2. In the GitHub repository go to **Settings → Secrets and variables → Actions → Variables**.
3. Add these repository variables (variables rather than secrets is correct, because the PostHog key and the Web3Forms access key are intentionally public browser configuration):

   | Variable | Value |
   | --- | --- |
   | `VITE_POSTHOG_KEY` | Your PostHog project API key |
   | `VITE_WEB3FORMS_KEY` | Your Web3Forms access key |

PostHog does not load unless a visitor chooses “Accept analytics”. The site does not identify visitors or record form fields. Configure the PostHog project’s data region and retention policy to fit Geinvest’s privacy requirements.

## 3. Publish with GitHub Pages

1. Create a new GitHub repository and push this folder. The deploy workflow runs for pushes to `main` and `master`.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**. Push to `master` (your current branch) or `main`; the workflow builds and deploys the website.
3. In **Settings → Pages → Custom domain**, enter `geinvestkft.com` and enable **Enforce HTTPS** once it is available. The `public/CNAME` file ensures deployment keeps the custom domain.
4. At the domain registrar, point the apex domain and `www` at GitHub Pages. GitHub shows the current IP/record values for your repository; follow its displayed instructions exactly, since these can change. Add the GitHub-provided verification TXT record if requested.
5. Wait for DNS propagation, then test both `https://geinvestkft.com` and `https://www.geinvestkft.com`. Choose one as the canonical address in GitHub Pages; GitHub redirects the other.

### If the page is blank

Open `https://github.com/agaszner/geinvest-website/settings/pages` while signed in and check **Build and deployment → Source**. It must be **GitHub Actions**, not **Deploy from a branch**. The workflow builds `dist/`; publishing the repository branch directly serves the uncompiled React source and results in a blank page. After changing the source, rerun **Deploy website to GitHub Pages** from the Actions tab and open `https://agaszner.github.io/geinvest-website/` (including `/geinvest-website/`). The account root `https://agaszner.github.io/` is a different user-site address and will not serve this repository unless you create a repository named `agaszner.github.io`.

## Before launch checklist

- Replace the placeholder company claims, service descriptions, working hours, and location with Geinvest’s confirmed details.
- Submit a real form enquiry on the live domain and verify it arrives in the configured inbox, including checking the spam folder on the first send.
- Add the final legal company details, privacy contact, and data-retention period to the privacy copy after getting local legal guidance.
- Confirm the custom domain, HTTPS, PostHog consent behavior, and mobile layout.
- Restrict who can edit GitHub Actions variables, and confirm `VITE_WEB3FORMS_KEY` is set in the repository variables so production builds include it.

## Commands

```bash
npm run dev       # develop the website
npm run build     # production build
npm run lint      # lint website code
```
