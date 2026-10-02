import type { PlanetData, PlanetId } from "@/types/planet";

/**
 * Sumber angka: NASA Planetary Fact Sheet (radius, sumbu semi-mayor, periode rotasi/revolusi, kemiringan sumbu);
 * jumlah bulan: Sky & Telescope (November 2025). Jumlah bulan raksasa terus bertambah seiring penemuan baru.
 */
export const PLANETS: PlanetData[] = [
  {
    id: "mercury", name: "Merkurius", kind: "terestrial",
    radiusKm: 2439.7, semiMajorAxisAu: 0.387, rotationPeriodHours: 1407.6, revolutionPeriodDays: 87.97,
    axialTiltDeg: 0.03, startPhase: 0.6, moonCount: 0, surface: "rocky-grey",
    facts: ["Planet terkecil dan terdekat dengan Matahari.", "Hampir tanpa atmosfer, sehingga suhu siang dan malam sangat ekstrem.", "Satu hari Merkurius (matahari ke matahari) berlangsung sekitar 176 hari Bumi."],
    pois: [{ id: "craters", label: "Kawah", text: "Permukaannya dipenuhi kawah tumbukan karena tidak ada atmosfer tebal yang melindungi." }],
  },
  {
    id: "venus", name: "Venus", kind: "terestrial",
    radiusKm: 6051.8, semiMajorAxisAu: 0.723, rotationPeriodHours: 5832.5, revolutionPeriodDays: 224.7,
    axialTiltDeg: 177.4, startPhase: 2.1, moonCount: 0, surface: "venus",
    atmosphere: { color: "#e8c98a", intensity: 0.6 },
    facts: ["Berotasi berlawanan arah dengan kebanyakan planet (retrograde).", "Atmosfer tebal CO₂ menciptakan efek rumah kaca yang sangat kuat.", "Planet terpanas di Tata Surya."],
    pois: [{ id: "retrograde", label: "Rotasi retrograde", text: "Kemiringan sumbu sekitar 177° membuat Matahari terbit dari barat di Venus." }],
  },
  {
    id: "earth", name: "Bumi", kind: "terestrial",
    radiusKm: 6371, semiMajorAxisAu: 1, rotationPeriodHours: 23.934, revolutionPeriodDays: 365.256,
    axialTiltDeg: 23.44, startPhase: 4.0, moonCount: 1, surface: "earth",
    atmosphere: { color: "#5aa8ff", intensity: 0.9 },
    facts: ["Satu-satunya tempat yang diketahui memiliki kehidupan.", "Sekitar 71% permukaannya tertutup air.", "Kemiringan sumbu 23,4° menyebabkan pergantian musim."],
    pois: [
      { id: "atmosphere", label: "Atmosfer", text: "Lapisan gas yang melindungi kehidupan dan menyebarkan cahaya biru." },
      { id: "moon", label: "Bulan", text: "Bulan mengorbit Bumi kira-kira setiap 27,3 hari." },
      { id: "daynight", label: "Siang dan malam", text: "Sisi yang menghadap Matahari mengalami siang; sisi sebaliknya malam. Rotasi membuat keduanya bergantian." },
    ],
  },
  {
    id: "mars", name: "Mars", kind: "terestrial",
    radiusKm: 3389.5, semiMajorAxisAu: 1.524, rotationPeriodHours: 24.623, revolutionPeriodDays: 686.98,
    axialTiltDeg: 25.19, startPhase: 5.2, moonCount: 2, surface: "mars",
    atmosphere: { color: "#d9a07a", intensity: 0.25 },
    facts: ["Dijuluki Planet Merah karena debu kaya oksida besi.", "Memiliki dua bulan kecil: Phobos dan Deimos.", "Rumah bagi Olympus Mons, gunung berapi terbesar yang diketahui di Tata Surya."],
    pois: [{ id: "seasons", label: "Musim", text: "Kemiringan sumbu mirip Bumi memberi Mars musim, tetapi tiap musim hampir dua kali lebih lama." }],
  },
  {
    id: "jupiter", name: "Jupiter", kind: "raksasa gas",
    radiusKm: 69911, semiMajorAxisAu: 5.204, rotationPeriodHours: 9.925, revolutionPeriodDays: 4332.59,
    axialTiltDeg: 3.13, startPhase: 1.3, moonCount: 97, surface: "jupiter",
    atmosphere: { color: "#e6c9a0", intensity: 0.3 },
    facts: ["Planet terbesar; massanya lebih dari dua kali gabungan semua planet lain.", "Rotasi tercepat di antara planet, sekitar 10 jam.", "Bintik Merah Besar adalah badai raksasa yang telah diamati selama berabad-abad."],
    pois: [{ id: "storm", label: "Bintik Merah Besar", text: "Badai antisiklon yang ukurannya pernah lebih besar dari Bumi dan kini terus menyusut." }],
  },
  {
    id: "saturn", name: "Saturnus", kind: "raksasa gas",
    radiusKm: 58232, semiMajorAxisAu: 9.582, rotationPeriodHours: 10.656, revolutionPeriodDays: 10759.22,
    axialTiltDeg: 26.73, startPhase: 3.3, moonCount: 274, surface: "saturn",
    atmosphere: { color: "#eadcb0", intensity: 0.25 },
    rings: { innerRatio: 1.25, outerRatio: 2.3, color: "#cdbb98" },
    facts: ["Memiliki sistem cincin paling mencolok, tersusun dari es dan batuan.", "Kerapatan rata-rata lebih rendah dari air.", "Memiliki jumlah bulan terkonfirmasi terbanyak."],
    pois: [
      { id: "rings", label: "Cincin", text: "Cincin sangat lebar namun sangat tipis, sebagian besar berupa partikel es." },
      { id: "moons", label: "Bulan", text: "Titan, bulan terbesarnya, memiliki atmosfer tebal." },
    ],
  },
  {
    id: "uranus", name: "Uranus", kind: "raksasa es",
    radiusKm: 25362, semiMajorAxisAu: 19.201, rotationPeriodHours: 17.24, revolutionPeriodDays: 30688.5,
    axialTiltDeg: 97.77, startPhase: 0.2, moonCount: 29, surface: "ice-cyan",
    atmosphere: { color: "#9fe3e8", intensity: 0.5 },
    rings: { innerRatio: 1.6, outerRatio: 2.0, color: "#7a8f95" },
    facts: ["Berotasi hampir 'berbaring' dengan kemiringan sekitar 98°.", "Warna biru kehijauan berasal dari metana di atmosfer.", "Memiliki cincin tipis yang gelap."],
    pois: [{ id: "tilt", label: "Kemiringan sumbu", text: "Kutubnya bergantian menghadap Matahari selama sekitar 21 tahun Bumi, menghasilkan musim ekstrem." }],
  },
  {
    id: "neptune", name: "Neptunus", kind: "raksasa es",
    radiusKm: 24622, semiMajorAxisAu: 30.07, rotationPeriodHours: 16.11, revolutionPeriodDays: 60182,
    axialTiltDeg: 28.32, startPhase: 5.9, moonCount: 16, surface: "ice-blue",
    atmosphere: { color: "#4a6cff", intensity: 0.5 },
    facts: ["Planet terjauh dari Matahari.", "Angin di atmosfernya termasuk yang tercepat di Tata Surya.", "Triton, bulan terbesarnya, mengorbit berlawanan arah rotasi Neptunus."],
    pois: [{ id: "winds", label: "Angin supersonik", text: "Kecepatan angin dapat melampaui seribu kilometer per jam." }],
  },
];

export const PLANET_BY_ID: Record<PlanetId, PlanetData> = Object.fromEntries(
  PLANETS.map((p) => [p.id, p]),
) as Record<PlanetId, PlanetData>;

export const SUN = {
  name: "Matahari",
  radiusKm: 695700,
  facts: [
    "Bintang di pusat Tata Surya yang menyumbang sekitar 99,8% massa seluruhnya.",
    "Energinya berasal dari fusi hidrogen menjadi helium di inti.",
    "Cahayanya butuh sekitar 8 menit 20 detik untuk sampai ke Bumi.",
  ],
};

export function isPlanetId(value: string | null | undefined): value is PlanetId {
  return !!value && value in PLANET_BY_ID;
}
