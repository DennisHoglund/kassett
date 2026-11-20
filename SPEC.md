# Kassett – specifikation

## Syfte
En egen spelare för iPhone som ser ut som ett kassettdäck från 80-talet och visar och styr det som spelas på Spotify.

## Begränsningar
- Spotify Web Playback SDK fungerar inte pålitligt i iOS Safari (autoplay och bakgrund). Därför spelas ljudet i Spotify-appen och Kassett styr den via Web API.
- Kräver Spotify Premium för styrning. Appen ligger i Development Mode: ett Client ID per utvecklare och högst 5 användare.

## Inloggning
- PKCE utan hemlighet. Client ID skrivs in i appen. Redirect URI = appens adress (`https://dennishoglund.github.io/kassett/`).
- Behörigheter: `user-read-playback-state user-read-currently-playing user-modify-playback-state`.
- Nycklar sparas i `localStorage` under `kassett-spotify`. Utgången inloggning öppnar inloggningsrutan igen.

## Skärmen (uppifrån)
1. **Träpanel**: klocka (röd LED), veckodag och datum, enhet som spelar med lampa.
2. **Kassett**: handskriven titel och artist (mindre text för långa titlar), omslag som polaroid, spolar som snurrar när musiken spelar, bandpackar som flyttas från vänster till höger under låten.
3. **Sida B**: remsa under kassetten med nästa låt i Spotifys kö (titel, artist, litet omslag). Kön hämtas bara när låten byts. Tom kö visar "Inget i kön".
4. **Räkneverk**: tid, förloppsrad (tryck för att spola) och längd.
5. **Tangenter**: föregående, spela/paus, nästa.
6. **Nivåmätare** med fyra skal: analoga VU-mätare (förval), grafisk equalizer (10 band), spektrumanalysator (fluorescent display, 16 staplar) och däckets toppmätare (L/R, −30 till +8 dB). Byts med ett tryck på mätaren eller i inställningarna och sparas i `kassett-matare`. Rörelserna är animationer (Spotify ger ingen ljudnivå) och står still vid paus. Panelen har också statusrad och eject-knapp för inställningar.

## Låtbyte
- När Spotify byter låt (knapp eller själv) matas kassetten ut uppåt under träpanelen, en ny med ny etikett glider in och studsar på plats (cirka 1 s). Spolarna står still under bytet och Sida B tonar om. Med "minska rörelse" byts innehållet utan animation.

## Uppdatering
- `GET /me/player` var 3:e sekund när appen syns, var 15:e i bakgrunden. Förloppet räknas lokalt mellan anropen.
- Spela utan aktiv enhet: appen väcker telefonen (eller första enheten) via `device_id`.

## Fel
| Läge | Text |
|---|---|
| Ingen Premium | Styrning kräver Spotify Premium. |
| Ingen aktiv enhet | Öppna Spotify-appen och starta en låt först. |
| Nätverksfel | Ingen kontakt med Spotify, försöker igen |

## Kommande steg
- Steg 3: väder i träpanelen.
