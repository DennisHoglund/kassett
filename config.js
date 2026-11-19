// Grundinställningar för Kassett. Inga hemligheter: Client ID skrivs in i appen och sparas bara på enheten.
window.KASSETT_CONFIG = {
  // Hur ofta Spotify frågas om vad som spelas (sekunder). Glesare när appen ligger i bakgrunden.
  intervall: { spelar: 3, vilar: 15 },

  api: {
    spotifyKonto: 'https://accounts.spotify.com',
    spotify: 'https://api.spotify.com/v1'
  }
};
