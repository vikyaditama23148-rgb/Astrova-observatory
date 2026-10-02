# Astrova Observatory

Observatorium 3D Tata Surya yang berdiri sendiri, bagian kedua dari ekosistem Astrova. Aplikasi Astrova utama (Next.js + Supabase) tetap menangani materi, misi, tes, dan progres siswa; Observatory khusus untuk eksplorasi 3D.

## Fitur
- Matahari, 8 planet, orbit, rotasi, revolusi, kemiringan sumbu, cincin Saturnus dan Uranus, Bulan untuk Bumi
- Klik planet atau pilih lewat daftar: kamera bergerak halus, kartu informasi ringkas
- Mode kamera: `SOLAR_SYSTEM`, `PLANET_FOCUS`, `PLANET_ORBIT` (Jelajahi), `POV_PLANET` (Tampilan POV), `FREE_SPACE`
- Waktu simulasi: jeda, 1×, 10×, 100×, 1000×; rotasi planet bisa dijeda sendiri
- Kualitas: Otomatis, Performa, Seimbang, Tinggi, Ultra (tersimpan di localStorage)
- Label bahwa visualisasi **tidak sesuai skala**
- Aksesibilitas: HTML semantik, navigasi keyboard, fokus terlihat, `prefers-reduced-motion`, informasi non-3D sebagai cadangan
- Diagnostik developer: `?debug=1` atau `Shift+D` (FPS, draw call, segitiga, tekstur)

## Teknologi
Next.js 16, React 19, TypeScript, Three.js, React Three Fiber, `@react-three/drei` (OrbitControls, Html). Tanpa Supabase, autentikasi, atau database.

## Instalasi dan pengembangan
```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm test
npm run build && npm start
```

## Deploy ke Vercel
1. Dorong proyek ke repositori Git, impor di Vercel (preset Next.js terdeteksi).
2. Opsional: set `NEXT_PUBLIC_ALLOWED_RETURN_HOSTS` (lihat `.env.example`).
3. Deploy. Tidak ada rahasia dan tidak ada ketergantungan pada filesystem lokal.

## Kualitas
| Preset | Tekstur | Segmen bola | Bintang | DPR maks | Atmosfer | Corona |
|---|---|---|---|---|---|---|
| Performa | 512 | 32 | 1.200 | 1 | tidak | tidak |
| Seimbang | 1024 | 48 | 3.000 | 1,5 | ya | ya |
| Tinggi | 2048 | 64 | 5.000 | 2 | ya | ya |
| Ultra | 4096 | 96 | 8.000 | 2,5 | ya | ya |

Mode Otomatis memakai heuristik (perangkat seluler, jumlah core, memori, ukuran tekstur maksimum). Heuristik ini belum divalidasi pada perangkat nyata.

## Persyaratan peramban
WebGL 1/2. Jika WebGL tidak ada atau adegan gagal dimuat, ringkasan planet non-3D ditampilkan.

## Integrasi dengan Astrova
Lihat `INTEGRATION.md`. Contoh: `https://observatory.example.com/?selectedPlanet=earth&returnTo=/hub`.

## Pemecahan masalah
- **Layar hitam / tampilan 3D tidak tersedia**: aktifkan akselerasi perangkat keras di peramban.
- **Berat di perangkat lama**: pilih kualitas Performa.
- **Tombol "Kembali ke Astrova" tidak muncul**: `returnTo` harus berupa path relatif (`/hub`) atau URL https dengan host di `NEXT_PUBLIC_ALLOWED_RETURN_HOSTS`.

## Status dan batasan jujur
Lihat bagian "Known limitations" di `PERFORMANCE.md`. Ringkasnya: tampilan 3D belum diuji di browser nyata pada saat proyek ini dibuat, WebGPU hanya terdeteksi (renderer tetap WebGL), dan tekstur masih prosedural.
