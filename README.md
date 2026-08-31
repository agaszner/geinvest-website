# Geinvest website

An accessible, static marketing website for **Geinvest Kft.**, designed for GitHub Pages at `geinvestkft.com`. The form posts to a Firebase Cloud Function; it does not expose a Firebase API key, mailbox, or Firestore write permission in the browser.

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

- A fő témák külön, megosztható URL-t kaptak: `/markak/`, `/szerviz/`, `/referenciak/`, `/kapcsolat/`, `/metso/`, `/mj-recycling/`, `/mfl/` és `/outotec/`.
- Minden URL-hez magyar nyelvű title, description, canonical és Open Graph metaadat tartozik.
- A kezdőoldal LocalBusiness strukturált cégadatot tartalmaz a Geinvest névvel, ikladi címmel, telefonnal és kapcsolati e-maillel.
- A `public/robots.txt` engedélyezi a feltérképezést és a `public/sitemap.xml` fájlra mutat. Éles build után ezek itt érhetők el: `https://geinvestkft.com/robots.txt` és `https://geinvestkft.com/sitemap.xml`.

Élesítés után add hozzá a domaint a [Google Search Console](https://search.google.com/search-console) felületén, végezd el a DNS-es tulajdon-ellenőrzést, majd a **Sitemaps** résznél küldd be a `https://geinvestkft.com/sitemap.xml` címet. Az URL Inspection eszközzel külön is kérhetsz indexelést az új vagy módosított oldalakra. A sitemap és az indexelési kérés jelzés a Google felé; a helyezést nem garantálják, ezért a legnagyobb hatású további lépések a saját projektfotók, konkrét referenciák, hasznos magyar nyelvű szövegek és hiteles külső hivatkozások.

## Stack

- **React + TypeScript + Vite** — fast, small static site.
- **GitHub Pages + GitHub Actions** — hosting and automatic deployment on pushes to `main`.
- **Firebase Cloud Functions + Firestore** — validated contact submissions, stored privately.
- **Firebase Trigger Email extension** — securely emails each enquiry to Geinvest.
- **PostHog EU** — privacy-conscious analytics, loaded only after visitor consent.

## Run locally

Requires Node.js 22 (use the current LTS release).

```bash
npm install
cp .env.example .env
npm run dev
```

The contact form intentionally displays a configuration error until `VITE_CONTACT_ENDPOINT` is set. Never put `CONTACT_EMAIL` or other private credentials in `.env` for the frontend.

## 1. Create and configure Firebase

1. Create a Firebase project in the Firebase console. Choose the **Blaze** plan: Cloud Functions and the email extension require it. Use a project region in Europe; this project uses the `europe-west1` function region.
2. Install the Firebase CLI and authenticate:

   ```bash
   npm install -g firebase-tools
   firebase login
   cp .firebaserc.example .firebaserc
   # Edit .firebaserc and replace your-firebase-project-id.
   ```

3. Install the function dependencies and set the recipient inbox. This Firebase secret is only available to the Cloud Function at runtime.

   ```bash
   cd functions
   npm install
   cd ..
   firebase functions:secrets:set CONTACT_EMAIL
   ```

4. In Firebase Extensions, install **Trigger Email** (`firebase/firestore-send-email`). Use `mail` as the collection name. Configure its SMTP connection for an inbox you control (Google Workspace, Microsoft 365, Mailgun, etc.). The extension will send a message whenever the function writes a `mail` document.
5. Deploy the secure backend and Firestore rules:

   ```bash
   cd functions && npm run build && cd ..
   firebase deploy --only functions,firestore:rules
   ```

6. Copy the public HTTPS URL Firebase prints for the `contact` function. It has the form:

   ```text
   https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/contact
   ```

### Important Firebase security notes

- Firestore rules deny all browser access. Only the server-side Cloud Function can create `contacts` or `mail` documents.
- The function validates input, limits field size, requires privacy consent, only allows POSTs from `geinvestkft.com` / `www.geinvestkft.com`, and includes an invisible honeypot to reduce basic spam.
- After the domain is live, use Firebase App Check with reCAPTCHA Enterprise and add a rate-limiting service if the form receives abuse. This is an appropriate next layer once real traffic exists.

## 2. Configure PostHog

1. Create a PostHog project in the EU cloud and copy its project API key.
2. In the GitHub repository go to **Settings → Secrets and variables → Actions → Variables**.
3. Add these repository variables (variables are correct because the PostHog key and function URL are intentionally public browser configuration):

   | Variable | Value |
   | --- | --- |
   | `VITE_POSTHOG_KEY` | Your PostHog project API key |
   | `VITE_CONTACT_ENDPOINT` | Your deployed Firebase function URL |

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
- Submit a real form enquiry and verify it appears in Firestore and arrives in the configured inbox.
- Add the final legal company details, privacy contact, and data-retention period to the privacy copy after getting local legal guidance.
- Confirm the custom domain, HTTPS, PostHog consent behavior, and mobile layout.
- Set a budget alert in Google Cloud / Firebase and restrict who can deploy functions or edit GitHub Actions variables.

## Commands

```bash
npm run dev       # develop the website
npm run build     # production build
npm run lint      # lint website code
cd functions && npm run build  # compile the Firebase function
```
