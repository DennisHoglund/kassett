# Kassett – instruktioner för AI-assistenter

Läs `SPEC.md` för hela specifikationen. Det här är reglerna som gäller vid varje ändring.

## Projektet
- PWA för iPhone Pro Max (stående): en kassettspelare som visar och styr det som spelas i Spotify-appen.
- Ljudet spelas alltid i Spotify-appen. Web Playback SDK fungerar inte pålitligt i iOS Safari och används inte.
- Ren HTML/CSS/JS **utan byggsteg**. Inga ramverk. Ingen backend. GitHub Pages via Actions.

## Språk och ton
- All UI-text, felmeddelanden, kommentarer, commit-meddelanden och testnamn på **svenska**.

## Får aldrig brytas
- **Inga hemligheter eller personuppgifter i repot.** Client ID skrivs in i appen och sparas i `localStorage`.
- `localStorage` alltid i try/catch. Nycklar börjar med `kassett-`.
- Text från Spotify sätts med `textContent`, aldrig `innerHTML`.
- Ett fel från Spotify får aldrig stoppa klockan eller kassetten. Visa en rad i nivåpanelen.

## Vid varje ändring
1. Höj `CACHE` i `sw.js` (`kassett-vN`) och `VERSION` i `app.js`. Nya filer läggs i `SHELL`.
2. Kör testerna: `npx playwright test` (lokalt räcker `--project="Telefon (Chromium)"`).
3. Lägg till eller uppdatera tester i `tests/`. All extern trafik mockas i `tests/mock.js`.
4. Uppdatera `SPEC.md`.
5. Committa med svenskt meddelande och pusha till `main`. CI testar och publicerar.

## Design
- Retro kassettdäck: träpanel med röd LED-klocka, kassett med handskriven etikett (Kalam), tangenter, LED-nivåmätare.
- Storlekar i `rem`; 1 rem = 16 px på 430 px bredd. Testa i 430×932.
- Tryckytor ≥ 44 px. Inga emojis.
