# Performa

## Strategi rendering
- Renderer: WebGL melalui React Three Fiber.
- DPR adaptif dibatasi per preset; antialias mati pada Performa.
- Satu light, tanpa bayangan, tanpa post-processing.
- Geometri bola dan segmen mengikuti preset; resource three.js (geometri, material, tekstur) dibuang saat unmount.
- Tidak ada state React per frame: jam, posisi, dan statistik debug diperbarui lewat ref/DOM langsung.
- Tekstur dibuat bertahap (256 px dulu, lalu ukuran preset).

## WebGL / WebGPU
WebGL adalah satu-satunya jalur render. Dukungan WebGPU **hanya dideteksi** (`navigator.gpu`, di `lib/performance/capabilities.ts`) dan belum dipakai untuk merender. Alasannya: jalur WebGPU pada stack R3F belum stabil untuk dijadikan default, dan prompt mengutamakan stabilitas. Tidak ada klaim WebGPU berfungsi.

## Aset
Semua tekstur prosedural, jadi tidak ada GLB/KTX2/Draco di V1. Itu berarti ukuran unduhan kecil, tetapi tampilan kurang realistis dibanding foto planet.

## Diagnostik
`?debug=1` atau `Shift+D` menampilkan FPS, jumlah draw call, segitiga, tekstur, geometri, dan preset aktif.

## Known limitations (jujur)
- **Belum diuji di browser/GPU nyata.** Yang terverifikasi: lint, TypeScript, 28 tes unit, build produksi, dan server produksi menyajikan halaman, metadata, dan chunk JS dengan kode 200. Tampilan 3D, kenyamanan kamera, sentuhan seluler, dan keterbacaan pencahayaan belum dilihat langsung.
- Tidak ada angka FPS terukur; heuristik kualitas Otomatis belum divalidasi.
- Belum ada: LOD, render-on-demand saat jeda, bayangan, bayangan cincin, awan/lampu kota Bumi, bloom (diganti sprite corona), peta normal, POI interaktif di permukaan, instancing.
- Orbit melingkar, bukan elips; posisi bukan efemeris nyata.
- Cincin Uranus disederhanakan; planet lain tidak punya cincin tipis seperti Jupiter/Neptunus.
- Jumlah bulan raksasa gas berubah seiring penemuan.
