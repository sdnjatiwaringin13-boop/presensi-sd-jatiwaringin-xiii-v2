# Presensi SD Negeri Jatiwaringin XIII — Versi 2

Versi 2 menambahkan fitur yang lebih siap untuk operasional sekolah:

## Fitur V2

- Login Admin dan Guru Kelas.
- Pembatasan akses guru berdasarkan kelas.
- Scanner barcode kamera.
- Kamera otomatis aktif kembali setelah scan berhasil/gagal/sudah absen.
- Suara hasil scan.
- Anti double-presensi per siswa per tanggal.
- Dashboard harian:
  - total siswa
  - hadir
  - sakit
  - izin
  - alpa
  - belum absen
  - persentase kehadiran
  - presensi terbaru
- Data siswa:
  - tambah/edit/hapus
  - pencarian
  - barcode Code128
  - import Excel
  - export Excel
  - cetak
- Data guru.
- Pembuatan akun guru.
- Pengaturan sekolah/kop surat/kepala sekolah/NIP.
- Daftar kelas.
- Laporan bulanan:
  - H/I/S/A per hari
  - rekap Hadir/Izin/Sakit/Alpa
  - filter kelas untuk admin
  - export Excel
  - cetak
- Firestore Security Rules untuk role dan kelas.

## Format Import Excel Siswa

Kolom minimal:

| Nama | NIS | Kelas | Barcode |
|---|---|---|---|
| Budi Santoso | 1001 | 1A | 1001 |
| Siti Aminah | 1002 | 1A | 1002 |

Nama kelas di Excel harus sama dengan kelas yang dibuat pada menu Pengaturan.

Barcode harus unik.

## Setup Firebase

1. Buat project di Firebase Console.
2. Aktifkan Authentication → Email/Password.
3. Buat Firestore.
4. Salin konfigurasi Web App ke `src/firebase.js`.
5. Buat user Admin di Authentication.
6. Buat document `users/{UID_ADMIN}`:

```json
{
  "email": "admin@sekolah.sch.id",
  "role": "admin"
}
```

7. Deploy rules:

```bash
firebase login
firebase deploy --only firestore:rules
```

## Menjalankan

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Deploy Hosting:

```bash
firebase deploy
```

## Struktur data

- `users/{uid}`
- `classes/{classId}`
- `students/{studentId}`
- `teachers/{teacherId}`
- `attendance/{date_studentId}`
- `settings/school`

## Catatan

Aplikasi menggunakan kamera browser sehingga deployment produksi harus menggunakan HTTPS. Pada Android/iPhone, berikan izin kamera ketika diminta.

Firebase Web API key tidak dianggap sebagai secret. Perlindungan data dilakukan melalui Firebase Authentication dan Firestore Security Rules. Jangan pernah memasukkan service-account JSON Firebase ke frontend.
