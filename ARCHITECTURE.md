# Arsitektur

```
app/                    layout, metadata, halaman tunggal
components/observatory/ adegan 3D (R3F) dan shell aplikasi
components/ui/          HUD: kartu info, navigasi, kontrol waktu, kualitas, fallback
data/planets.ts         data planet (terpisah dari rendering)
types/planet.ts         model data
lib/simulation/         jam simulasi dan sudut orbit/rotasi (fungsi murni)
lib/camera/             mesin keadaan tampilan (reducer murni)
lib/rendering/          skala visualisasi dan tekstur prosedural
lib/performance/        preset kualitas dan deteksi kemampuan perangkat
lib/integration/        parsing parameter URL dan returnTo yang aman
tests/                  vitest
```

## Alur
`ObservatoryApp` (client) memegang state UI: tampilan (`viewReducer`), kecepatan, kualitas, rotasi. Adegan dimuat dengan `dynamic(..., { ssr: false })` dan menerima `ObservatoryScene` lewat context. Jam simulasi (`sim`) dan registri objek (`bodies`) adalah ref, sehingga perubahan per frame tidak memicu render ulang React.

## Simulasi
`SimDriver` memajukan jam dengan `tickClock` setiap frame (delta dibatasi 0,1 dtk). 1× = 1 jam simulasi per detik nyata. Orbit melingkar: sudut = fase awal + 2π · t / periode. Rotasi memakai jam terpisah agar bisa dijeda sendiri.

## Skala visualisasi (tidak sesuai skala)
Radius = 0,5 · √(R / R_bumi); jarak orbit = 9 + 8 · √(AU); Matahari radius 5. Dikompresi agar semua benda muat di layar. Orbit dibuat lingkaran, bukan elips.

## Kamera
`CameraController` mentransisi target dan posisi dengan peredaman eksponensial, lalu mengikuti benda yang bergerak. `POV_PLANET` menempatkan kamera di samping planet pada arah tangen orbit (sudut pandang ruang angkasa, bukan permukaan). Batas zoom per mode mencegah masuk ke dalam planet.

## Pencahayaan
Satu `pointLight` di Matahari tanpa peluruhan jarak (`decay=0`) agar planet jauh tetap terbaca, ditambah cahaya ambient lemah. Sisi siang/malam muncul dari shading standar. Keputusan ini mengorbankan realisme intensitas demi keterbacaan.

## Pemuatan bertahap
Tekstur 256 px dibuat sinkron, lalu ditingkatkan ke ukuran preset bertahap per planet (planet terpilih diprioritaskan). Indikator progres tampil di pojok.

## Integrasi
Parameter URL: `selectedPlanet`, `returnTo`/`returnPath`, `studentId`, `learningContext`. Hanya `selectedPlanet` dan `returnTo` yang dipakai UI saat ini; `studentId` dan `learningContext` di-parse dan divalidasi untuk integrasi mendatang.
