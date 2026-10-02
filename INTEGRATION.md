# Integrasi dengan Astrova

Observatory berjalan mandiri dan menerima konteks lewat query string. Tidak ada Supabase atau autentikasi.

## Dari Astrova ke Observatory
```text
https://observatory.example.com/?selectedPlanet=earth&returnTo=/hub
https://observatory.example.com/?selectedPlanet=uranus&returnTo=https://astrova.example/hub&learningContext=ipas.tata-surya
```

| Parameter | Dipakai sekarang | Catatan |
|---|---|---|
| `selectedPlanet` | ya | `mercury`…`neptune`; nilai tak dikenal diabaikan |
| `returnTo` (alias `returnPath`) | ya | tombol "Kembali ke Astrova" |
| `studentId` | belum | di-parse dan divalidasi (karakter aman, maks 64) untuk masa depan |
| `learningContext` | belum | idem, maks 128 |
| `debug=1` | ya | panel diagnostik |

## Keamanan `returnTo`
Hanya path relatif satu situs (`/hub`) atau URL **https** yang host-nya terdaftar di `NEXT_PUBLIC_ALLOWED_RETURN_HOSTS`. Ditolak: `javascript:`, `data:`, `//host`, backslash, kredensial di URL, karakter kontrol, URL lebih dari 2048 karakter. Diuji di `tests/camera-and-integration.test.ts`.

Catatan: path relatif akan mengarah ke domain Observatory sendiri. Karena Observatory dan Astrova biasanya beda domain, untuk kembali ke Astrova set host Astrova di `NEXT_PUBLIC_ALLOWED_RETURN_HOSTS` dan kirim URL absolut.

## Titik integrasi masa depan
- Kirim `studentId`/`learningContext` ke API Astrova untuk mencatat waktu eksplorasi (belum ada endpoint).
- Embed lewat iframe atau tautan; tombol kembali sudah tersedia.
- Misi Astrova bisa membuka planet tertentu lewat `selectedPlanet`.
