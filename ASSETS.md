# ASSETS

Versi 1 **tidak membawa aset pihak ketiga**. Semua tampilan dihasilkan secara prosedural.

| Aset | Sumber | Lisensi |
|---|---|---|
| Tekstur permukaan planet & Matahari | Dihasilkan kode (`lib/rendering/textures.ts`, canvas 2D, PRNG deterministik) | Bagian dari proyek ini |
| Tekstur cincin Saturnus/Uranus | Dihasilkan kode (`createRingTexture`) | Bagian dari proyek ini |
| Corona Matahari, atmosfer | Gradien canvas dan shader Fresnel buatan sendiri | Bagian dari proyek ini |
| Starfield | Titik acak deterministik | Bagian dari proyek ini |
| `public/favicon.svg` | Dibuat untuk proyek ini | Bagian dari proyek ini |

## Data ilmiah
- Radius, sumbu semi-mayor, periode rotasi/revolusi, kemiringan sumbu: NASA Planetary Fact Sheet (angka fakta, bukan konten berhak cipta).
- Jumlah bulan: Sky & Telescope, "A guide to planetary satellites" (data November 2025). Angka ini bertambah seiring penemuan baru; perbarui `moonCount` di `data/planets.ts`.

## Mengganti dengan tekstur nyata
Tekstur prosedural bukan foto planet. Untuk tampilan lebih realistis, letakkan tekstur berlisensi jelas di `public/textures/` (misalnya NASA/JPL domain publik atau Solar System Scope CC BY 4.0, dengan atribusi), lalu muat dengan `THREE.TextureLoader` di `components/observatory/Planet.tsx` dan catat sumber serta lisensinya di sini. Tekstur tidak disertakan karena sandbox pembuatan proyek ini tidak dapat mengunduhnya dan lisensi tiap berkas harus diperiksa lebih dulu.
