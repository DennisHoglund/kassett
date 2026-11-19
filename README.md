# Kassett

Spotify på en kassett – en PWA för iPhone som visar och styr det som spelas i Spotify-appen.

**App:** https://dennishoglund.github.io/kassett/
**Testrapport:** https://dennishoglund.github.io/kassett/rapport/

## Kom igång
1. Spotify Dashboard → din app → Edit Settings → lägg till Redirect URI `https://dennishoglund.github.io/kassett/`.
2. Öppna appen i Safari på iPhone → Dela → Lägg till på hemskärmen.
3. Öppna Kassett från hemskärmen, klistra in ditt Client ID och logga in.
4. Starta musik i Spotify-appen. Kassetten visar låten och tangenterna styr den.

## Utveckling
```
npm ci
npx playwright install webkit chromium
npx playwright test
```
