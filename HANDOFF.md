# HANDOFF.md — MotoHub Egypt

> **Read this file fully before taking any action.** It describes the project's actual, verified state and the rules a future agent must follow.
> Last written: 2026-10-26, by an agent inspection session; updated same day after committing `6cc4dbd` (staged-change resolution). All "VERIFIED" items below were checked against the current files, Git history, and live site during that session.

---

## A. Project Identity

| Item | Value |
|---|---|
| Project name | MotoHub Egypt (`motohub-egypt-portfolio`) |
| Purpose | Arabic RTL dark-theme motorcycle showroom **portfolio/demo site** — not a real commercial service. Disclaimers are shown on-site; never present it as a real dealership |
| Absolute path | `C:\Users\Dell\Desktop\MotoHub-Egypt-Portfolio` |
| Repository | https://github.com/AhmeddSamii21/motohub-egypt (public) |
| Live site | https://ahmeddsamii21.github.io/motohub-egypt/ |
| Branch | `main`, in sync with `origin/main` (as of this inspection) |
| Latest commit | `e3f470b` — `feat(brands): add live model count and interactive stats badge to brand strip`. Pushed to `origin/main` and verified equal via `git ls-remote` |
| Working tree | Clean. Untracked by decision: `AGENTS.md` (project instructions) + `HANDOFF.md` (this file). Nothing staged or modified. See §G |
| One-paragraph summary | A React 19 + Vite 8 single-page app with a custom hash-based multi-view router (home / catalog / calculator / booking). All motorcycle data is a verified static catalog (82 models, 19 brands) extracted from a local Excel price list into `src/data/catalog.js`. Features: dynamic hero stats, featured models, full catalog with search/sort/filters, 3-model comparison modal, installment calculator, and a booking form that saves to a Google Sheet via Google Apps Script (`no-cors`). Dark theme, RTL, fully responsive. |

## B. Current State

**Architecture (VERIFIED from source):**
- Frontend-only SPA. **No backend server, no database, no auth.** Persistence = one Google Sheet.
- React 19 (`react`, `react-dom` only — **no router library, no state library**), Vite 8.3, plain CSS files per component (design tokens in `src/index.css` `:root`), linting via `oxlint`.
- **Routing**: custom hash router in `src/App.jsx`. `HASH_TO_VIEW` maps hashes to 4 views: `home`, `catalog`, `calc`, `book` (`#book`, `#home`, `#calc`, `#catalog`, `#installments`, plus legacy anchors `#models`, `#brands`, `#features`, `#cta`). All views stay **mounted**; inactive views get `display:none` via `view-panel` classes — this preserves filter/compare/calculator state across navigation. The view-change scroll reset uses `useLayoutEffect`, committed at `6cc4dbd`.
- **Deploy**: GitHub Pages via `.github/workflows/deploy.yml` (push to `main` → `npm ci && npm run build` → deploy `dist/`). Base path `/motohub-egypt/` set automatically when `GITHUB_ACTIONS=true` (see `vite.config.js`). Local dev uses `/`.

**External integration (VERIFIED from source, kept intentionally minimal):**
- Booking form posts `URLSearchParams` to a Google Apps Script Web App (constant `WEB_APP_URL` in `src/components/BookingForm.jsx` — value lives in the source file; do not copy it into docs/chat, do not change it) with `mode: "no-cors"`.

## C. Feature Status Matrix

| Feature | Status | Evidence | Relevant Files | Remaining Work |
|---|---|---|---|---|
| Static catalog: 82 models / 19 brands | Implemented, Tested | File verified: 82 `price:` entries; historical parse from `docs/Vehicle_Price_List_2026.xlsx` (headers note in file) | `src/data/catalog.js` | **DO NOT edit without user approval** (see §H) |
| Hero stats dynamic from catalog (82/19/2026) | Implemented | Derives from `CATALOG` | `src/components/Hero.jsx` | — |
| Featured models (top-2 priced per SYM/ZONTES/KEEWAY) | Implemented, Tested | Deterministic price-based derivation | `src/components/FeaturedModels.jsx` | — |
| Brands strip with per-brand stats (count + starting price, derived from `CATALOG`) | Implemented, Committed (`e3f470b`) | Derived in `Brands.jsx` `buildBrandStats()`; minimums cross-checked by an independent parse of `catalog.js`: SYM 55,000 (WOLF), KEEWAY 29,000 (F25), BENELLI 58,000 (VLR 150), ZONTES 102,000; lint 0 warnings + build 41 modules green | `src/components/Brands.jsx`, `src/components/Brands.css` | Verify the `e3f470b` Pages deployment; visual check of `#brands` |
| Catalog view: search, brand filter, price ranges, sort | Implemented, Tested | Browser tests (session history); live verified at `bea6ec5` | `src/components/Catalog.jsx`/`.css` | — |
| Model comparison (max 3, floating bar + modal, Escape close, CTA pre-fill) | Implemented, Tested | Browser tests (session history) | `src/components/Catalog.jsx`, `src/components/ModelCompare.jsx` | — |
| "عرض كل الموديلات" button + smooth view-in transitions | Implemented, Tested | Verified `9cfc763`; animation ends `transform:none` (no fixed-position side effects) | `src/components/FeaturedModels.jsx`, `src/App.css`, `src/App.jsx` | — |
| Installment calculator (1.5%/mo simple interest placeholder, documented on-screen) | Implemented, Tested | Math hand-checked in browser tests | `src/components/InstallmentCalculator.jsx` | Rate is a clearly labeled placeholder — real rates need a source before any change |
| Multi-view hash router + persistent view state | Implemented, Tested | Verified `024ea32`; `useLayoutEffect` scroll upgrade committed `6cc4dbd` (lint + build green) | `src/App.jsx` | — |
| Catalog scroll reset (0,0) + Brands at top of catalog view | Implemented, Tested | `6cc4dbd` — synchronous `useLayoutEffect` reset verified in browser on dev server; Brands-first committed in `bea6ec5` | `src/App.jsx`, `src/components/Catalog.jsx` | Verify the `6cc4dbd` Pages deployment |
| Booking form → Google Sheets | Implemented | Source verified; **manually tested historically by user** (submission reached the sheet) | `src/components/BookingForm.jsx` | Sheet-side structure NOT inspected — see §F/J |
| Session pre-selection (`sessionStorage` + custom event) | Implemented, Tested | Module + listeners verified in source | `src/data/requestedModel.js`, `src/components/BookingForm.jsx` | — |
| Dark scrollbars, RTL, responsive, `prefers-reduced-motion` | Implemented, Verified visually partially | CSS verified; full visual pass on real devices NOT done | `src/index.css`, `src/App.css` | Optional polish |
| Spare-parts catalog / inventory / reservation status / payments | **Not Implemented** | Nothing in code | — | Roadmap only (§I) |

## D. Important Files

| File | Responsibility / why it matters |
|---|---|
| `src/data/catalog.js` | **Single source of truth for all motorcycle data.** Shape: `CATALOG = [{ brand: "SYM", models: [{ name, price }] …}]`. Prices are **verbatim strings** (e.g. `"69,700"` and `"229000"`); strip commas only for math. 82 models / 19 brands. **Freeze: edits need explicit user approval.** |
| `src/components/BookingForm.jsx` | Booking form + the Apps Script integration (`WEB_APP_URL` const, `no-cors` POST). Fields: `fullName`, `phone`, `motorcycleModel`, `preferredDate`, `notes`; syncs the session pre-selected model. **Frozen integration — see §H.** |
| `src/data/requestedModel.js` | Session pre-selection: `motohub.requestedModel` session key, `motohub:model-requested` custom event, store/read/clear helpers. Every "احجز معاينة" CTA writes here. |
| `src/App.jsx` | Hash router, view panels (mounted-but-hidden), synchronous `useLayoutEffect` scroll reset (committed `6cc4dbd`). |
| `src/components/Catalog.jsx` | Catalog view composition: Brands section first, then search/filter/sort tools, groups grid, compare bar/modal. |
| `src/components/ModelCompare.jsx` | Compare modal (max 3, `MAX_COMPARE = 3` in Catalog.jsx), Escape close + scroll lock; CTA pre-fills booking. |
| `src/components/InstallmentCalculator.jsx` | Calculator; `MONTHLY_RATE = 0.015` documented as illustrative; CTA "احجز معاينة بتمويل". |
| `src/components/Header.jsx` | Nav tabs (الرئيسية/الكتالوج/حاسبة الأقساط) + booking CTA; `view` prop drives `aria-current`. Mobile menu logic unchanged since original design. |
| `src/data/content.js` | `BRANDS` derived from `CATALOG`; `FEATURES` display copy (labeled non-binding). No product data. |
| `src/index.css` | Design tokens (`--panel`, `--accent`, `--line`, `--radius…`) + global dark scrollbars (`color-scheme: dark` matters for native dropdowns). |
| `.github/workflows/deploy.yml` | Pages deploy on push to `main`. Node 20, `npm ci`, `npm run build`. |
| `docs/Vehicle_Price_List_2026.xlsx` | **Local-only** (`.gitignore` has `*.xlsx`), referenced by `catalog.js` header. The published data lives in `catalog.js`. 167 rows with "X" prices and 24 brand headers exist in the workbook but only eligible rows were exported. |

## E. Development Environment

- **Software**: Node.js verified locally at **v24.20.0** (npm 11.19.0); GitHub Actions pins **Node 20**. No other tooling required.
- **Install**: `npm ci` (or `npm install`).
- **Commands (VERIFIED in `package.json`)**
  - Dev server: `npm run dev` (Vite, `http://localhost:5173/`)
  - Lint: `npm run lint` (oxlint) — expect **0 warnings / 0 errors**; it is the acceptance bar for every change
  - Build: `npm run build` — expect ✓ 41 modules
  - Preview: `npm run preview`
- **No test framework/runner exists.** Verification method used historically: `npm run lint` + `npm run build` + manual browser checks (dev server and/or live site).
- **Environment variables**: only `GITHUB_ACTIONS` (set by Actions, read by `vite.config.js` for the base path). No `.env` needed; none contains secrets.
- **Git on this machine**: use `C:\Program Files\Git\cmd\git.exe`. PowerShell quirk: `git push ... 2>&1` prints a false `Exited with code 1` — **confirm pushes via the `main -> main` ref-update line**, not the exit code.

## F. Verified Tests and Known Issues

**Historical passing evidence (each later committed; commit verified via GitHub Actions runs returning `success`, e.g. run `40199532530` for `bea6ec5`):**
- `f4a83e3` real-data purge + featured models + sorting/filters (browser-verified incl. live production)
- `b1fbf12` comparison tool (browser-verified incl. live production)
- `8884f65` installment calculator (browser-verified incl. live production)
- `024ea32` multi-view router (browser-verified incl. live production)
- `dbcc8d7` dark scrollbars (live CSS fetched and verified)
- `9cfc763` view-more button + view-in transitions (live JS fetch verified)
- `bea6ec5` scroll reset v1 + Brands-top (live verified: Pages workflow success; live site serves `index-D4syzpMp.js` / `index-wi6VrVsC.css` — matching HEAD artifacts; re-fetched during THIS inspection: HTTP 200 ✓)
- `6cc4dbd` `useLayoutEffect` scroll-upgrade commit (verified THIS session: lint 0 warnings/errors, build ✓ 41 modules `index-CbIa7mN2.js`; push verified via `git ls-remote origin main` → `6cc4dbd...`; **Pages deployment for this commit NOT verified**)

**Booking integration:** user reported the full submission flow reaching the Google Sheet manually in an earlier phase. Recorded as **historical, user-reported**. During this handoff nothing was submitted and the sheet was not touched.

**Known issues / limitations (VERIFIED during this inspection):**
1. **Google Sheet structure is uninspected**: response tab name, columns, and any Apps Script-side logic were **never verified from this repo**. Apps Script is edited in Google's editor, not stored here. Any catalog/reservation expansion that touches the sheet needs this information first.
2. **No unit/API tests exist.** All functional evidence is manual-browser-based; nothing is automated.
3. Model cards expose only brand/name/price. No specs, years, images, stock, or availability — **none of that may be invented** (see §H).
4. Browser environment artifact discovered during testing: occluded windows suspend compositor CSS animations (opacity/transform) — affects testing methodology only, not the app.

## G. Git and Data Safety

- `git status -sb`: `## main...origin/main` in sync at HEAD `e3f470b`; clean tree, untracked `AGENTS.md` (project instructions, HANDOFF.md maintenance policy) and `HANDOFF.md` (kept untracked by user decision).
- **Resolved (2026-10-26)**: the previously staged `src/App.jsx` change (`rAF` → `useLayoutEffect`; a stray UTF-8 BOM was stripped immediately before committing) is committed and pushed as `6cc4dbd`. Remote equality verified via `git ls-remote origin main`.
- Tracked docs images: `docs/images/motohub-booking.png`, `docs/images/motohub-sales.png` (README assets).
- Ignored locally: `*.xlsx` (the price-list workbook), `~$*`, `Thumbs.db`, `node_modules`, `dist`, `.env*`. The workbook is the **raw master reference** — never commit it (it contains 167 "X"-priced rows the site deliberately excludes).
- No databases or secrets stored in the repo.

## H. Decisions and Constraints (binding rules)

1. **No invented data.** Model names/prices/domains are verbatim from the workbook (`"229000"` stays un-comma'd in display). Never add specs, years, images, stock, or availability that don't exist in a verified source. Never represent demo copy as a real commercial offering.
2. **`src/data/catalog.js` is frozen** — modification requires explicit user approval, and any catalog expansion must come from the price-list workbook or another user-approved source, with a documented extraction method.
3. **Booking integration is frozen**: endpoint constant, `no-cors` mode, payload keys (`fullName`, `phone`, `motorcycleModel`, `preferredDate`, `notes`), and response handling must not change without an explicitly approved task. `no-cors` means the response is opaque — the UI treats "no exception" as success; this limitation is known and accepted.
4. **No new dependencies, no React Router, no state library** — the hash router and small-module architecture are deliberate.
5. **Compare selection keys use `brand|name`** (names are globally unique across the 82 models); max 3 comparisons (`MAX_COMPARE`).
6. Arabic **RTL** + dark theme + responsive must be preserved for every change; acceptance = `npm run lint` (0 warnings) + `npm run build` (all green).
7. **Commit/push/deploy only on explicit user instruction**, with the user's stated commit message. Staging by itself is fine when the user asks for it.
8. CSS view animation must keep ending at `transform: none` / no persistent styles — fixed-position children (compare bar) would otherwise re-anchor to the panel.
9. Session pre-selection (`storeRequestedModel` + `motohub:model-requested` dispatch) must keep working from every view; `#book` hashes are both a view route and the booking target.

## I. Remaining Work and Priorities

- **P0** — ✅ RESOLVED 2026-10-26: the previously staged `src/App.jsx` change was committed (BOM stripped first) and pushed as `6cc4dbd`; lint 0 warnings + build 41 modules verified. Outstanding: verify the `6cc4dbd` Pages workflow run concluded `success`.
- **P1** — **Inspect the connected Google Sheet + Apps Script structure** (tab names, response columns, existing formulas/views) *before* designing any catalog/pricing/reservation/spare-parts expansion. This is the user-stated next priority and is currently BLOCKED without user-provided access/export. Also consolidate catalog metadata needs (types/specs/images) against the workbook.
  - Sub-milestone DONE (2026-10-26): dealership workbook `IRIDE Stock.xlsx` (git-ignored via `*.xlsx`) delivered and inspected; phase 1 of the price/stock update feature: `scripts/sync-stock.js` created (Node built-ins, ESM) reading the `Stock` tab only, validating `Brand/Model/Color/Comment/Price/Branch` header labels in BOTH side blocks (B–G, I–N) and failing loudly on unexpected structure. Single test run: **209 unit rows, 59 distinct model keys, 201 valid prices, 8 invalid (empty/zero-price cells)** — identical to the independently derived inspection figures (workbook unchanged: same size/mtime). Not yet implemented: `iRide Price List 2026` fallback parsing, generated data file, UI display.
  - Sub-milestone DONE (2026-10-26): phase 3 generator complete (note: listed before the phase-2 entry below, but chronology is phase 1 → 2 → 3) — `scripts/sync-stock.js` now parses Stock + the price-list A/B pairs and writes `src/data/generatedStock.js` (not yet consumed by any UI). Fail-loud rules verified in practice: tab-order check, block-header labels, unknown B-column texts, same-model conflicting prices, and >1 catalog brand with the same name all abort with clear messages. Final deterministic run (2026-10-26): **82 site models → 50 stock-priced (209 units recorded), 28 price-list-only, 4 catalog+needsReview (`KEEWAY C Light 150`, `KEEWAY C Light 150 S`, `COSWHEEL CosWheel`, `ARIIC Ariic 318 GT`)**; 59 stock keys, 8 unpublished workbook-only keys (incl. `KEEWAY | Zahara 200 CC` kept separate from `Vieste 200 CC`); 1 unused priced pair (`coswheel|coswheelbicylce=49000`, kept separate pending manual confirm); L panel fully excluded. Generated file verified UTF-8-intact (Arabic preserved). (Phase 4 – UI rendering – now done, see next entry.)
  - Sub-milestone DONE (2026-10-26): phase 4 — generated data connected to the catalog display (NOT deployed). `src/components/Catalog.jsx` imports `src/data/generatedStock.js` via the existing `brand|name` key (same as compare keys) with a safe fallback to the old display when a key is absent; stock/price-list numeral prices render with the site's existing thousands-separator + `ج.م` style; recorded-stock units > 0 show exactly `متوفر حسب آخر سجل، يُرجى تأكيد الكمية مع الفرع` (`AVAILABILITY_NOTE` import); price-list-only models show price only; `needsReview` models keep their price with a restrained `*` indicator (tooltip explains it comes from the older list). `Catalog.css` gained two small muted classes (availability 0.72rem, review asterisk) — RTL-safe, no layout redesign; compare modal/calculator/booking untouched; CosWheel remains excluded/unpublished. Checks: `npm run lint` 0 warnings/errors ✓, `npm run build` ✓ **42 modules** (was 41; +1 = generatedStock.js; CSS/artifacts unchanged in size class). Files: Catalog.jsx (+19/−1), Catalog.css (+13). Nothing committed/pushed/deployed.
  - Sub-milestone DONE (2026-10-26): phase 5 — minimal visual acceptance check on the local Vite dev server (`#catalog`), browser-verified (NOT deployed). Three cases inspected via live DOM/text + computed styles + screenshots: (1) Stock-priced with availability — `SYM WOLF` 55,000 ج.م with the exact availability wording rendering RTL and readable (also checked DOM case `Orbit 3 150 CC` 69,700); (2) price-list-only — `SYM Jet 4 150 CC` 75,000 ج.م, price only, no availability line; (3) needsReview — `KEEWAY C Light 150` 41,000 ج.م with `*` + tooltip «سعر مصدره قائمة قديمة — قيد المراجعة مع المصدر» (DOM-verified exact strings; screenshot of case 3 not captured because the desktop window lost visibility mid-check). Card `dir=rtl` ✓; availability 0.72rem ✓ responsive. One NON-blocking note (left unfixed, no visual defect): `.catalog-card-review` font-size 0.95rem is overridden to 0.8rem by the sibling rule `.catalog-card-price span { font-size: 0.8rem }` (specificity) — the `*` renders slightly smaller than authored but legible and correctly placed. No code changes made; no new lint/build run needed. Nothing committed/pushed/deployed.
  - Sub-milestone DONE (2026-10-26): phase 6 — availability wording reworked to the owner's clarified business rules (minimal diff, same architecture). (1) Stock-matched models with recorded units now show the concise indicator `متاح` (no warning) — `AVAILABILITY_NOTE` repurposed; (2) precedence unchanged (price-list first, then catalog fallback); (3/4) every model WITHOUT a matched Stock record shows the fixed warning `ده آخر سعر مسجل، يُرجى التواصل مع الفرع للتأكد من التوفر والسعر الحالي` under its price (`LAST_RECORDED_PRICE_NOTE` new export; model is never described as unavailable); (5) `needsReview` catalog-fallback prices keep the `*` + tooltip and are not treated as stock status. Generator (`scripts/sync-stock.js`) + artifact (`generatedStock.js`) updated consistently: field emission now `stockUnits+availabilityNote` for stock-matched entries vs `lastPriceNote` otherwise (same counts as the deterministic prior run: 82 = 50+28+4, 209 units, CosWheel 49000 still excluded, `KEEWAY C Light 150 S` keeps its matched-unit `متاح` alongside needsReview `*`). `Catalog.jsx`: +one import, availability resolved to one of the two notes in one ternary (no null), one JSX line unconditioned. `Catalog.css` unchanged. Checks: `npm run lint` 0 warnings ✓, `npm run build` ✓ 42 modules (256ms). Files: sync-stock.js (+20/−4 outline), Catalog.jsx (+9/−3), generatedStock.js regenerated. Nothing committed/pushed/deployed.
  - Sub-milestone DONE (2026-10-26): phase 7 — individual model pages with shareable `#/m/<brand>/<model>` URLs, built on the existing no-dependency hash router (deeper view of P2's catalog expansion without spec/image data). New `src/data/modelSlug.js` (deterministic slugify + collision-safe per-brand suffix; **exact-match resolution only**, no fuzzy matching — unknown/malformed `#/m/...` hashes redirect to `#catalog` via `location.replace`, never a blank page); new `src/components/ModelPage.jsx` + `ModelPage.css` (thin page: brand, name, price with the catalog's thousands-separator style, `متاح` vs last-recorded-price warning via the shared logic, needsReview `*`+tooltip intact, booking CTA using the untouched `storeRequestedModel`/`REQUESTED_MODEL_EVENT` path, back link, honest "المواصفات والصور غير منشورة بعد" note — **no invented specs/photos/warranty/financing**); new `src/data/modelDisplay.js` (shared `GENERATED_BY_KEY` + `formatDisplayPrice` extracted from `Catalog.jsx` to fix the fast-refresh lint rule — single source, no duplication). `src/App.jsx` adds only the `model` view + `#/m/` prefix mapping (all existing hashes/mounted-view state preservation intact); catalog cards + featured cards gained a small `التفاصيل` link ($href from `modelHref`, 82/82 unique incl. Arabic/emoji names like `#/m/sym/jet-14-evo-150cc`). browser-verified on dev server: valid URL (Orbit 3: 69,700 + `متاح`; JET 14 EVO Arabic/emoji name resolves; price-list-only Jet 4 shows the exact warning), malformed `#/m/nope/nada` → catalog ✓, booking CTA from model page preselects `Jet 4 150 CC` in the booking form ✓, catalog brand-filter state survives model→catalog round trip ✓, legacy `#calc` hash ✓. Checks: `npm run lint` 0 warnings ✓, `npm run build` ✓ 46 modules. Files: App.jsx +15, Catalog.jsx +36/−19 net (incl. helper relocation), Catalog.css/FeaturedModels.css small link styles, FeaturedModels.jsx +4, 4 new files. Nothing committed/pushed/deployed. Uses a new tiny data module `modelDisplay.js` beyond the originally proposed file list (needed for the 0-warnings gate). 
  - Sub-milestone DONE (2026-10-26): phase 2 validation of the `iRide Price List 2026` fallback tab (structure-only probe; no production data generated; no repo file changed except this entry). VERIFIED layout: column A = model list with interleaved brand-title rows (B = `سعر البيع`/`Price` variants), column B = the A-list's prices (`X` = unpriced, numeric-only), column L = a **second model panel with brand titles but NO price column anywhere in this tab**. Extraction cross-check vs frozen catalog: **278 A/B entries → 25 brand headers, 79 priced pairs, 171 `X` unpriced, 3 A-only rows; 77/79 pairs match a catalog (brand|name) key; 67 of those agree on price, ≥5 disagree (workbook NEWER prices, e.g. row 46 `X150` 103000 vs catalog 102,000; rows 51–53 Benelli VLR trio each +2,000) — confirming the catalog edition is older and this tab is the intended newer-price fallback source; 2 pairs' (brand|name) keys not found in catalog (to enumerate in phase 3 before use)**. Spot-verified examples with cell refs incl. row refs A4/B4 (`Orbit 3 150 CC` 69700 catalog `69,700` ✓), A5/B5 (`Jet 4 150 CC` 75000 ✓), A7/B7 (`WOLF` 55000 ✓), A8/B8 (`SR 150 CC New 2026` 90000 ✓), A9/B9 (`ST 200 CC old` 92000 ✓).
- **P2** — Roadmap areas when data exists: expanded catalog (types/specs/images), inventory & availability, richer reservation workflow (status/payment), spare-parts catalog, deeper Sheets integration.
- **P3** — Optional polish: automated smoke tests (Playwright or similar — would need dependency install = user approval), Lighthouse/visual QA on real devices.

## J. Exact Next-Step Instructions

<details>
<summary><b>Recommended next task for the next agent</b></summary>

**Objective:** Gather the facts needed to plan catalog/pricing/reservation/spare-parts work against the real data sources — without changing anything.

**Why:** All current features are built and tested; every expansion depends on the real workbook/Sheet structure, which is uninspected. Per user instruction this inspection comes before any design.

**Steps:**
1. Verify state: `git status -sb` (expect HEAD `6cc4dbd` pushed to `origin/main`, clean tree apart from untracked `HANDOFF.md`; optionally confirm the Pages workflow run for `6cc4dbd` concluded `success` via the GitHub Actions API).
2. Decide with the user: commit `HANDOFF.md` (currently untracked) when they want the handoff recorded in the repo.
3. Request from the user: (a) the local workbook `docs/Vehicle_Price_List_2026.xlsx` is available on disk — inspect it locally (e.g. parse `xl/worksheets/sheet1.xml` + `styles.xml` like the original extraction), (b) export/credentials for the connected Google Sheet so tab names, columns, and formulas can be read, and (c) the current Apps Script source (Google editor export) if they agree to document it.
4. Record findings (tab names, column headers, row counts, which columns are used by the booking endpoint today) in `HANDOFF.md` §F/§I — **do not implement anything yet**.

**Must not change:** `src/data/catalog.js`, `src/components/BookingForm.jsx`, payload/endpoint behavior, no `npm install`, no commits.

**Completion checklist:** the `6cc4dbd` deployment verified or explicitly left unverified; workbook structure summarized (brands/headers/price-eligible row rules); Sheets tab/column structure summarized or explicitly marked BLOCKED-with-what's-needed; no source files modified; lint+build still green.

</details>

## K. Instructions for the Next AI Agent

1. Read `HANDOFF.md` first; re-check §A (commit/status) against live `git status -sb` — do not trust a memory of it.
2. Treat current source code as the source of truth; re-read files before judging them.
3. Verify claims by inspection; label anything unverifiable (e.g. Sheet internals) as REPORTED/BLOCKED.
4. Never repeat completed work; check §C and the git log first.
5. Preserve: the committed `useLayoutEffect` scroll-reset behavior (`6cc4dbd`), catalog.js, booking integration, Arabic RTL/dark styling, session pre-selection flows.
6. Keep changes small and focused; no unrelated refactors; no dependency installs without explicit approval.
7. After changes: `npm run lint` + `npm run build` (0 warnings / 0 errors), test only the relevant behavior, report actual results honestly.
8. `git push` prints a false PowerShell exit-code 1 — verify via the `main -> main` ref line.
9. Never commit/push/deploy without the user's explicit instruction, and never expose credential/endpoint values from `BookingForm.jsx` in reports.
10. When a business rule or data fact cannot be established (prices, availability, finance terms), stop and ask.
