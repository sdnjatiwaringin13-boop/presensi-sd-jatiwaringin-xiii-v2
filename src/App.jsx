import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";

import { Html5Qrcode } from "html5-qrcode";
import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";

import {
  auth,
  db,
  secondaryAuth,
} from "./firebase";

import {
  Camera,
  CheckCircle2,
  XCircle,
  LogOut,
  Users,
  GraduationCap,
  Settings,
  FileText,
  ScanLine,
  Plus,
  Pencil,
  Trash2,
  Printer,
  Download,
  RefreshCw,
  Menu,
  X,
  Search,
  School,
  ShieldCheck,
  Volume2,
  AlertCircle,
  CalendarDays,
  BarChart3,
  Upload,
  FileSpreadsheet,
  Check,
  Clock3,
  UserRoundCheck,
  UserRoundX,
  Stethoscope,
  EyeOff,
} from "lucide-react";


/* =========================================================
   HELPER
========================================================= */

const todayKey = () =>
  new Date().toISOString().slice(0, 10);

const monthKey = () =>
  new Date().toISOString().slice(0, 7);

const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );

const uid = () =>
  crypto.randomUUID();

const STATUS = {
  Hadir: "H",
  Izin: "I",
  Sakit: "S",
  Alpa: "A",
  "Belum Absen": "-",
};

const monthDays = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

const monthDate = (ym, day) =>
  `${ym}-${String(day).padStart(2, "0")}`;

const downloadBlob = (blob, name) => {
  const a = document.createElement("a");

  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);
};

function speak(text, good = true) {
  try {
    window.speechSynthesis.cancel();

    const u =
      new SpeechSynthesisUtterance(text);

    u.lang = "id-ID";
    u.rate = 0.95;
    u.pitch = good ? 1.05 : 0.9;

    window.speechSynthesis.speak(u);
  } catch {}
}


/* =========================================================
   DEFAULT SCHOOL
========================================================= */

const emptySchool = {
  name: "SD Negeri Jatiwaringin XIII",
  npsn: "",
  address: "",
  phone: "",
  email: "",
  principalName: "",
  principalNip: "",
  headerLine1: "",
  headerLine2: "",
};


/* =========================================================
   APP
========================================================= */

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (u) => {
          try {
            setUser(u);

            if (u) {
              const snap =
                await getDoc(
                  doc(db, "users", u.uid)
                );

              if (snap.exists()) {
                setProfile({
                  id: snap.id,
                  ...snap.data(),
                });
              } else {
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
          } catch (error) {
            console.error(
              "Gagal membaca profile:",
              error
            );

            setProfile(null);
          } finally {
            setLoading(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  if (loading) {
    return <Splash />;
  }

  if (!user || !profile) {
    return <Login />;
  }

  return (
    <Dashboard
      user={user}
      profile={profile}
    />
  );
}


/* =========================================================
   SPLASH
========================================================= */

function Splash() {
  return (
    <div className="splash">
      <div className="spinner" />
      <b>Memuat Presensi...</b>
    </div>
  );
}


/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [err, setErr] =
    useState("");

  async function submit(e) {
    e.preventDefault();

    setBusy(true);
    setErr("");

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
    } catch (e) {
      console.error(e);

      setErr(
        "Email atau kata sandi salah, atau akun belum aktif."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="brand-mark">
          <School size={30} />
        </div>

        <h1>Presensi Sekolah</h1>

        <p className="muted">
          SD Negeri Jatiwaringin XIII
        </p>

        <form
          onSubmit={submit}
          className="stack"
        >

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="admin@guru.sch.id"
              required
            />
          </label>

          <label>
            Kata sandi

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="••••••••"
              required
            />
          </label>

          {err && (
            <div className="alert error">
              <AlertCircle size={18} />
              {err}
            </div>
          )}

          <button
            className="btn primary full"
            disabled={busy}
          >
            {busy
              ? "Masuk..."
              : "Masuk"}
          </button>

        </form>

        <small className="muted">
          Gunakan akun Admin atau Guru
          Kelas yang dibuat di Firebase.
        </small>

      </div>
    </div>
  );
}


/* =========================================================
   DASHBOARD LAYOUT
========================================================= */

function Dashboard({
  user,
  profile,
}) {
  const isAdmin =
    profile.role === "admin";

  const [page, setPage] =
    useState("dashboard");

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [school, setSchool] =
    useState(emptySchool);

  useEffect(() => {
    getDoc(
      doc(db, "settings", "school")
    )
      .then((s) => {
        if (s.exists()) {
          setSchool({
            ...emptySchool,
            ...s.data(),
          });
        }
      })
      .catch(console.error);
  }, []);

  /*
   * MENU UTAMA
   */
  const nav = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3
  },

  {
    id: "siswa",
    label: "Data Siswa",
    icon: Users
  },

  {
    id: "absen",
    label: "Presensi",
    icon: ScanLine
  },

  {
    id: "laporan",
    label: "Laporan Bulanan",
    icon: FileText
  },

  ...(isAdmin
    ? [
        {
          id: "struktur",
          label: "Struktur Sekolah",
          icon: School
        }
      ]
    : [])
];

  async function logout() {
    await signOut(auth);
  }

  return (
    <div className="app-shell">

      {/* SIDEBAR */}

      <aside
        className={
          "sidebar " +
          (mobileOpen ? "open" : "")
        }
      >

        <div className="side-head">

          <div className="logo">
            <School size={22} />
          </div>

          <div>
            <b>Presensi SD</b>
            <small>
              Jatiwaringin XIII
            </small>
          </div>

          <button
            className="icon-btn mobile-close"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <X />
          </button>

        </div>

        <div className="role-chip">
          {isAdmin ? (
            <ShieldCheck size={15} />
          ) : (
            <GraduationCap size={15} />
          )}

          {isAdmin
            ? "ADMIN"
            : `GURU • ${
                profile.className || "-"
              }`}
        </div>

        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={
                page === n.id
                  ? "active"
                  : ""
              }
              onClick={() => {
                setPage(n.id);
                setMobileOpen(false);
              }}
            >
              <n.icon size={19} />
              {n.label}
            </button>
          ))}
        </nav>

        <button
          className="logout"
          onClick={logout}
        >
          <LogOut size={18} />
          Keluar
        </button>

      </aside>


      {/* MAIN */}

      <main className="main">

        <header className="topbar">

          <button
            className="icon-btn mobile-menu"
            onClick={() =>
              setMobileOpen(true)
            }
          >
            <Menu />
          </button>

          <div>
            <b>
              {school.name}
            </b>

            <span>
              {profile.role === "admin"
                ? "Panel Administrator"
                : `Wali Kelas ${
                    profile.className || ""
                  }`}
            </span>
          </div>

          <div className="top-user">
            {user.email}
          </div>

        </header>


        
        <div className="content">

          {page === "dashboard" && (
            <DashboardHome
              profile={profile}
              school={school}
            />
          )}


          {page === "siswa" && (
  <Students
    profile={profile}
    school={school}
  />
)}

          {page === "absen" && (
            <Attendance
              profile={profile}
              school={school}
            />
          )}

          {page === "laporan" && (
            <Reports
              profile={profile}
              school={school}
            />
          )}

          {page === "struktur" &&
            isAdmin && (
              <SchoolStructure
                profile={profile}
                school={school}
              />
            )}


          {page === "guru" &&
            isAdmin && (
              <TeacherAccounts />
            )}

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   FETCH CLASSES
========================================================= */

async function fetchClasses() {
  const snap =
    await getDocs(
      query(
        collection(db, "classes"),
        orderBy("name")
      )
    );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}


/* =========================================================
   ATTENDANCE
========================================================= */

function Attendance({ profile }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [date, setDate] = useState(todayKey());
  const [processing, setProcessing] = useState(false);

  const classId =
    profile.role === "admin"
      ? ""
      : profile.classId || "";

  // ==========================================
  // LOAD PRESENSI TERBARU
  // ==========================================

  async function loadRecent() {
    try {
      if (!classId && profile.role !== "admin") {
        setRecent([]);
        return;
      }

      let q;

      if (classId) {
        q = query(
          collection(db, "attendance"),
          where("classId", "==", classId),
          where("date", "==", date),
          orderBy("time", "desc"),
          limit(12)
        );
      } else {
        q = query(
          collection(db, "attendance"),
          where("date", "==", date),
          orderBy("time", "desc"),
          limit(12)
        );
      }

      const snap = await getDocs(q);

      setRecent(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (error) {
      console.error(
        "Gagal memuat presensi terbaru:",
        error
      );

      // Jangan membuat halaman rusak hanya karena
      // daftar presensi gagal dimuat.
      setRecent([]);
    }
  }

  useEffect(() => {
    loadRecent();
  }, [classId, date, profile.role]);

  // ==========================================
  // START CAMERA
  // ==========================================

  useEffect(() => {
    let scanner = null;
    let cancelled = false;

    async function startScanner() {
      if (!running) return;

      setCameraError("");

      try {
        // Pastikan elemen reader sudah ada
        const reader = document.getElementById("reader");

        if (!reader) {
          throw new Error(
            "Area kamera tidak ditemukan."
          );
        }

        scanner = new Html5Qrcode("reader");

        // ======================================
        // COBA KAMERA BELAKANG
        // ======================================

        try {
          await scanner.start(
            {
              facingMode: {
                exact: "environment",
              },
            },
            {
              fps: 10,
              qrbox: {
                width: 280,
                height: 160,
              },
              aspectRatio: 1.777,
            },
            async (decodedText) => {
              if (cancelled || processing) return;

              await processCode(
                decodedText,
                scanner
              );
            },
            () => {}
          );
        } catch (environmentError) {
          console.warn(
            "Kamera environment gagal:",
            environmentError
          );

          // ====================================
          // FALLBACK KAMERA
          // ====================================

          await scanner.start(
            {
              facingMode: "environment",
            },
            {
              fps: 10,
              qrbox: 250,
            },
            async (decodedText) => {
              if (cancelled || processing) return;

              await processCode(
                decodedText,
                scanner
              );
            },
            () => {}
          );
        }
      } catch (error) {
        console.error(
          "Kamera gagal dibuka:",
          error
        );

        if (!cancelled) {
          setCameraError(
            "Kamera tidak dapat dibuka. Pastikan izin kamera diberikan dan aplikasi dijalankan melalui HTTPS atau localhost."
          );

          setRunning(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scanner.clear();
            } catch {}
          });
      }
    };
  }, [running, date]);

  // ==========================================
  // PROSES BARCODE
  // ==========================================

  async function processCode(code, scanner) {
    if (processing) return;

    setProcessing(true);
    setRunning(false);

    const clean = String(code || "").trim();

    if (!clean) {
      setProcessing(false);
      return;
    }

    try {
      // ======================================
      // CARI SISWA
      // ======================================

      let studentQuery;

      if (classId) {
        studentQuery = query(
          collection(db, "students"),
          where("classId", "==", classId),
          where("barcode", "==", clean),
          limit(1)
        );
      } else {
        studentQuery = query(
          collection(db, "students"),
          where("barcode", "==", clean),
          limit(1)
        );
      }

      const studentSnap =
        await getDocs(studentQuery);

      // ======================================
      // BARCODE TIDAK DITEMUKAN
      // ======================================

      if (studentSnap.empty) {
        setResult({
          ok: false,
          type: "not-found",
          title: "ABSEN GAGAL",
          message:
            classId
              ? "Barcode tidak terdaftar pada kelas Anda."
              : "Barcode siswa tidak terdaftar.",
          code: clean,
        });

        speak(
          "Absen gagal",
          false
        );

        setTimeout(() => {
          setProcessing(false);
          setRunning(true);
        }, 1200);

        return;
      }

      // ======================================
      // DATA SISWA
      // ======================================

      const student = {
        id: studentSnap.docs[0].id,
        ...studentSnap.docs[0].data(),
      };

      // ======================================
      // VALIDASI KELAS GURU
      // ======================================

      if (
        profile.role === "teacher" &&
        student.classId !== profile.classId
      ) {
        setResult({
          ok: false,
          type: "wrong-class",
          title: "KELAS TIDAK SESUAI",
          message:
            `${student.name} bukan siswa kelas ${profile.className || "-"}.`,
          student,
        });

        speak(
          "Kelas tidak sesuai",
          false
        );

        setTimeout(() => {
          setProcessing(false);
          setRunning(true);
        }, 1200);

        return;
      }

      // ======================================
      // ID PRESENSI
      // ======================================

      const attendanceId =
        `${date}_${student.id}`;

      const attendanceRef =
        doc(
          db,
          "attendance",
          attendanceId
        );

      // ======================================
      // CEK SUDAH ABSEN
      // ======================================

      const existing =
        await getDoc(attendanceRef);

      if (existing.exists()) {
        const oldData =
          existing.data();

        setResult({
          ok: false,
          type: "duplicate",
          title: "SUDAH ABSEN",
          message:
            `${student.name} sudah melakukan presensi hari ini.`,
          student,
          attendance: oldData,
        });

        speak(
          "Siswa sudah absen",
          false
        );

        setTimeout(() => {
          setProcessing(false);
          setRunning(true);
        }, 1200);

        return;
      }

      // ======================================
      // SIMPAN PRESENSI
      // ======================================

      const currentTime =
        new Date().toLocaleTimeString(
          "id-ID",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        );

      await setDoc(
        attendanceRef,
        {
          studentId: student.id,

          studentName:
            student.name || "",

          nis:
            student.nis || "",

          classId:
            student.classId || "",

          className:
            student.className || "",

          date,

          time: currentTime,

          timestamp:
            serverTimestamp(),

          status: "Hadir",

          barcode: clean,

          createdBy:
            profile.id || null,

          createdByRole:
            profile.role || "",

          createdAt:
            serverTimestamp(),
        }
      );

      // ======================================
      // BERHASIL
      // ======================================

      setResult({
        ok: true,
        type: "success",
        title: "ABSEN BERHASIL",
        message:
          `Selamat datang, ${student.name}!`,
        student,
        attendance: {
          date,
          time: currentTime,
        },
      });

      speak(
        "Absen berhasil",
        true
      );

      // ======================================
      // LOAD RECENT
      //
      // KALAU GAGAL TIDAK BOLEH MEMBUAT
      // HASIL SCAN BERUBAH MENJADI GAGAL.
      // ======================================

      try {
        await loadRecent();
      } catch (recentError) {
        console.error(
          "Gagal memuat presensi terbaru:",
          recentError
        );
      }

      // ======================================
      // BUKA KAMERA KEMBALI
      // ======================================

      setTimeout(() => {
        setProcessing(false);
        setRunning(true);
      }, 1200);

    } catch (error) {
      console.error(
        "Gagal memproses presensi:",
        error
      );

      let message =
        "Terjadi kesalahan saat menyimpan presensi.";

      // ======================================
      // FIRESTORE PERMISSION ERROR
      // ======================================

      if (
        error?.code ===
        "permission-denied"
      ) {
        message =
          "Tidak memiliki izin untuk menyimpan presensi. Periksa Firestore Rules.";
      }

      // ======================================
      // NETWORK ERROR
      // ======================================

      else if (
        error?.code ===
        "unavailable"
      ) {
        message =
          "Koneksi ke server tidak tersedia.";
      }

      setResult({
        ok: false,
        type: "error",
        title: "ABSEN GAGAL",
        message,
        code: clean,
      });

      speak(
        "Absen gagal",
        false
      );

      setTimeout(() => {
        setProcessing(false);
        setRunning(true);
      }, 1500);
    }
  }

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="page">

      {/* ====================================
          HEADER
      ==================================== */}

      <div className="page-title">

        <div>
          <h2>
            Presensi Barcode
          </h2>

          <p>
            Scan barcode siswa.
            Kamera akan aktif kembali
            secara otomatis setelah proses.
          </p>
        </div>

        <div className="date-actions">

          <label className="date-input">
            Tanggal

            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(
                  e.target.value
                );

                setResult(null);
              }}
            />
          </label>

          <button
            className="btn"
            onClick={() => {
              setDate(todayKey());
              setResult(null);
            }}
          >
            <CalendarDays size={16} />
            Hari Ini
          </button>

        </div>

      </div>

      {/* ====================================
          GRID
      ==================================== */}

      <div className="attendance-grid">

        {/* ==================================
            SCANNER
        ================================== */}

        <section className="card scanner-card">

          <div className="scanner-head">

            <div>
              <b>
                Scanner Kamera
              </b>

              <span>
                Gunakan kamera belakang perangkat
              </span>
            </div>

            <div
              className={
                "status-dot " +
                (running
                  ? "on"
                  : "off")
              }
            >
              {running
                ? "AKTIF"
                : "SIAP"}
            </div>

          </div>

          <div
            id="reader"
            className="reader"
          >

            {!running && (
              <div className="reader-placeholder">

                <Camera size={42} />

                <span>
                  Kamera belum aktif
                </span>

              </div>
            )}

            {running && (
              <div className="reader-placeholder">
                <Camera size={42} />

                <span>
                  Membuka kamera...
                </span>
              </div>
            )}

          </div>

          {/* ERROR */}

          {cameraError && (
            <div className="alert error">

              <AlertCircle
                size={18}
              />

              <span>
                {cameraError}
              </span>

            </div>
          )}

          {/* BUTTON */}

          <button
            className={
              "btn full " +
              (running
                ? "danger"
                : "primary")
            }
            disabled={processing}
            onClick={() => {

              setCameraError("");

              setRunning(
                (value) => !value
              );

            }}
          >

            {running ? (
              <>
                <XCircle size={18} />

                Hentikan Kamera
              </>
            ) : (
              <>
                <Camera size={18} />

                Buka Kamera &
                Mulai Absen
              </>
            )}

          </button>

          <div className="scan-help">

            <Volume2 size={16} />

            <span>
              Suara otomatis:
              “Absen berhasil”
              atau “Absen gagal”.
            </span>

          </div>

        </section>

        {/* ==================================
            RESULT
        ================================== */}

        <section className="card result-card">

          <div className="section-title">

            <b>
              Hasil Scan
            </b>

            <span>
              {date === todayKey()
                ? "Hari ini"
                : fmtDate(date)}
            </span>

          </div>

          {!result ? (

            <div className="empty">

              <ScanLine
                size={44}
              />

              <b>
                Belum ada scan
              </b>

              <span>
                Hasil scan akan
                tampil di sini.
              </span>

            </div>

          ) : (

            <div
              className={
                "result " +
                (result.ok
                  ? "success"
                  : "failed")
              }
            >

              {result.ok ? (
                <CheckCircle2
                  size={60}
                />
              ) : (
                <XCircle
                  size={60}
                />
              )}

              <h3>
                {result.title}
              </h3>

              {result.student && (
                <>
                  <b>
                    {result.student.name}
                  </b>

                  <small>
                    {result.student.className ||
                      ""}
                    {result.student.nis
                      ? ` • NIS ${result.student.nis}`
                      : ""}
                  </small>
                </>
              )}

              <span>
                {result.message}
              </span>

              {result.attendance?.time && (
                <small>
                  Waktu:{" "}
                  {result.attendance.time}
                </small>
              )}

            </div>

          )}

          {/* =================================
              RECENT
          ================================= */}

          <div
            className={
              "section-title recent-title"
            }
          >

            <b>
              Presensi Terakhir
            </b>

            <button
              className="icon-btn"
              onClick={() =>
                loadRecent()
              }
              title="Refresh"
            >
              <RefreshCw
                size={16}
              />
            </button>

          </div>

          <div className="mini-list">

            {recent.length > 0 ? (

              recent.map((item) => (

                <div
                  key={item.id}
                >

                  <div>

                    <b>
                      {item.studentName}
                    </b>

                    <small>
                      {item.className ||
                        "-"}
                      {" • "}
                      {item.status ||
                        "-"}
                    </small>

                  </div>

                  <time>
                    {item.time ||
                      "-"}
                  </time>

                </div>

              ))

            ) : (

              <span className="muted">
                Belum ada presensi.
              </span>

            )}

          </div>

        </section>

      </div>

    </div>
  );
}


/* =========================================================
   TEACHER ACCOUNTS
========================================================= */

function TeacherAccounts() {
  const [items, setItems] =
    useState([]);

  const [classes, setClasses] =
    useState([]);

  const [modal, setModal] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  async function load() {
    setLoading(true);
    setError("");

    try {

      /*
       * Jangan memakai:
       *
       * where("role","==","teacher")
       * + orderBy("email")
       *
       * karena dapat membutuhkan
       * composite index.
       *
       * Kita urutkan di JavaScript.
       */

      const teacherQuery =
        query(
          collection(db, "users"),
          where(
            "role",
            "==",
            "teacher"
          )
        );

      const teacherSnap =
        await getDocs(
          teacherQuery
        );

      const teacherData =
        teacherSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .sort((a, b) =>
            String(
              a.name ||
              a.email ||
              ""
            ).localeCompare(
              String(
                b.name ||
                b.email ||
                ""
              ),
              "id"
            )
          );

      setItems(
        teacherData
      );


      const classData =
        await fetchClasses();

      setClasses(
        classData
      );

    } catch (e) {

      console.error(
        "Gagal memuat akun guru:",
        e
      );

      setError(
        e.message ||
        "Gagal memuat akun guru."
      );

    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    load();
  }, []);


  return (
    <div className="page">

      <div className="page-title">

        <div>
          <h2>
            Manajemen Guru
          </h2>

          <p>
            Buat akun login guru
            dan batasi akses
            berdasarkan kelas.
          </p>
        </div>

        <button
          className="btn primary"
          onClick={() =>
            setModal(true)
          }
        >
          <Plus size={18} />
          Buat Akun Guru
        </button>

      </div>


      {error && (
        <div className="alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}


      <div className="card table-wrap">

        {loading ? (
          <div className="empty">
            <RefreshCw size={30} />
            <b>
              Memuat akun guru...
            </b>
          </div>
        ) : items.length === 0 ? (
          <div className="empty">
            <Users size={40} />
            <b>
              Belum ada akun guru
            </b>

            <span>
              Klik “Buat Akun Guru”
              untuk membuat akun pertama.
            </span>
          </div>
        ) : (
          <table>

            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Kelas</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {items.map((x) => (
                <tr key={x.id}>

                  <td>
                    <b>
                      {x.name ||
                        "-"}
                    </b>
                  </td>

                  <td>
                    {x.email ||
                      "-"}
                  </td>

                  <td>
                    {x.className ||
                      "-"}
                  </td>

                  <td>
                    <span className="badge green">
                      Guru
                    </span>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        )}

      </div>


      {modal && (
        <CreateTeacherAccount
          classes={classes}
          onClose={() =>
            setModal(false)
          }
          onSaved={() => {
            setModal(false);
            load();
          }}
        />
      )}

    </div>
  );
}


/* =========================================================
   CREATE TEACHER ACCOUNT
========================================================= */

function CreateTeacherAccount({
  classes,
  onClose,
  onSaved,
}) {

  const firstClass =
    classes[0] || null;

  const [f, setF] =
    useState({
      name: "",
      email: "",
      password: "",
      classId:
        firstClass?.id || "",
      className:
        firstClass?.name || "",
      schoolId:
        firstClass?.schoolId ||
        "",
    });

  const [err, setErr] =
    useState("");

  const [busy, setBusy] =
    useState(false);


  /* ==========================================
     UPDATE KELAS
  ========================================== */

  useEffect(() => {

    const selectedClass =
      classes.find(
        (item) =>
          item.id === f.classId
      );

    if (selectedClass) {

      setF((current) => ({
        ...current,

        className:
          selectedClass.name ||
          "",

        schoolId:
          selectedClass.schoolId ||
          "",
      }));

    }

  }, [f.classId, classes]);


  /* ==========================================
     SIMPAN
  ========================================== */

  async function save(e) {
    e.preventDefault();

    setBusy(true);
    setErr("");

    try {

      /* VALIDASI */

      if (!f.name.trim()) {
        throw new Error(
          "Nama Guru wajib diisi."
        );
      }

      if (!f.email.trim()) {
        throw new Error(
          "Email Guru wajib diisi."
        );
      }

      if (
        !f.password ||
        f.password.length < 6
      ) {
        throw new Error(
          "Password awal minimal 6 karakter."
        );
      }

      if (!f.classId) {
        throw new Error(
          "Silakan pilih kelas Guru."
        );
      }

      if (!f.schoolId) {
        throw new Error(
          "School ID tidak ditemukan dari data kelas."
        );
      }


      /* ======================================
         BUAT FIREBASE AUTH
      ====================================== */

      const cred =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          f.email.trim(),
          f.password
        );


      /* ======================================
         SIMPAN PROFILE USER
      ====================================== */

      await setDoc(
        doc(
          db,
          "users",
          cred.user.uid
        ),
        {
          name:
            f.name.trim(),

          email:
            f.email.trim(),

          role:
            "teacher",

          schoolId:
            f.schoolId,

          classId:
            f.classId,

          className:
            f.className,

          createdAt:
            serverTimestamp(),
        }
      );


      /* ======================================
         BERHASIL
      ====================================== */

      onSaved();

    } catch (e) {

      console.error(
        "Gagal membuat akun Guru:",
        e
      );

      if (
        e.code ===
        "auth/email-already-in-use"
      ) {
        setErr(
          "Email tersebut sudah digunakan."
        );

      } else if (
        e.code ===
        "auth/invalid-email"
      ) {
        setErr(
          "Format email tidak valid."
        );

      } else if (
        e.code ===
        "auth/weak-password"
      ) {
        setErr(
          "Password terlalu lemah. Gunakan minimal 6 karakter."
        );

      } else if (
        e.code ===
        "permission-denied"
      ) {
        setErr(
          "Tidak memiliki izin untuk menyimpan data Guru."
        );

      } else {
        setErr(
          e.message ||
          "Gagal membuat akun Guru."
        );
      }

    } finally {

      /*
       * Logout secondary auth.
       *
       * Admin tetap login melalui
       * auth utama.
       */

      try {
        await signOut(
          secondaryAuth
        );
      } catch (logoutError) {
        console.error(
          "Gagal logout secondaryAuth:",
          logoutError
        );
      }

      setBusy(false);
    }
  }


  /* ==========================================
     FORM
  ========================================== */

  return (
    <Modal
      title="Buat Akun Guru"
      onClose={onClose}
    >

      <form
        className="stack"
        onSubmit={save}
      >

        <label>
          Nama Guru

          <input
            type="text"
            value={f.name}
            onChange={(e) =>
              setF({
                ...f,
                name:
                  e.target.value,
              })
            }
            placeholder="Contoh: Budi Santoso"
            required
          />
        </label>


        <label>
          Email

          <input
            type="email"
            value={f.email}
            onChange={(e) =>
              setF({
                ...f,
                email:
                  e.target.value,
              })
            }
            placeholder="guru@email.com"
            required
          />
        </label>


        <label>
          Password Awal

          <input
            type="password"
            minLength="6"
            value={f.password}
            onChange={(e) =>
              setF({
                ...f,
                password:
                  e.target.value,
              })
            }
            placeholder="Minimal 6 karakter"
            required
          />
        </label>


        <label>
          Kelas

          <select
            value={f.classId}
            onChange={(e) =>
              setF({
                ...f,
                classId:
                  e.target.value,
              })
            }
            required
          >

            {classes.length === 0 ? (
              <option value="">
                Belum ada kelas
              </option>
            ) : (
              classes.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              ))
            )}

          </select>

        </label>


        {err && (
          <div className="alert error">
            <AlertCircle size={18} />
            {err}
          </div>
        )}


        <small className="muted">
          Guru akan dapat login
          menggunakan email dan
          password awal yang
          dibuat oleh Admin.
        </small>


        <div className="modal-actions">

          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>

          <button
            type="submit"
            className="btn primary"
            disabled={
              busy ||
              classes.length === 0
            }
          >
            {busy
              ? "Membuat..."
              : "Buat Akun Guru"}
          </button>

        </div>

      </form>

    </Modal>
  );
}


/* =========================================================
   DASHBOARD HOME
========================================================= */

function DashboardHome({
  profile,
}) {

  const [date, setDate] =
    useState(todayKey());

  const [stats, setStats] =
    useState({
      students: 0,
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      belum: 0,
    });

  const [recent, setRecent] =
    useState([]);


  useEffect(() => {
    load();
  }, [
    date,
    profile.classId,
  ]);


  async function load() {

    try {

      const classId =
        profile.role === "teacher"
          ? profile.classId
          : "";


      const studentsQ =
        classId
          ? query(
              collection(
                db,
                "students"
              ),
              where(
                "classId",
                "==",
                classId
              )
            )
          : query(
              collection(
                db,
                "students"
              )
            );


      const attendanceQ =
        classId
          ? query(
              collection(
                db,
                "attendance"
              ),
              where(
                "classId",
                "==",
                classId
              ),
              where(
                "date",
                "==",
                date
              )
            )
          : query(
              collection(
                db,
                "attendance"
              ),
              where(
                "date",
                "==",
                date
              ),
              orderBy(
                "time",
                "desc"
              ),
              limit(100)
            );


      const students =
        (
          await getDocs(
            studentsQ
          )
        ).docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));


      const att =
        (
          await getDocs(
            attendanceQ
          )
        ).docs.map(
          (d) => d.data()
        );


      const counts = {
        students:
          students.length,

        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        belum: 0,
      };


      const map =
        new Map(
          att.map((a) => [
            a.studentId,
            a,
          ])
        );


      students.forEach(
        (s) => {

          const a =
            map.get(s.id);

          if (!a) {
            counts.belum++;
            return;
          }

          if (
            a.status ===
            "Hadir"
          ) {
            counts.hadir++;
          } else if (
            a.status ===
            "Sakit"
          ) {
            counts.sakit++;
          } else if (
            a.status ===
            "Izin"
          ) {
            counts.izin++;
          } else if (
            a.status ===
            "Alpa"
          ) {
            counts.alpa++;
          }

        }
      );


      setStats(counts);

      setRecent(
        att.slice(0, 8)
      );

    } catch (e) {
      console.error(
        "Dashboard error:",
        e
      );
    }
  }


  const percent =
    stats.students
      ? Math.round(
          (stats.hadir /
            stats.students) *
            100
        )
      : 0;


  return (
    <div className="page">

      <div className="page-title">

        <div>

          <h2>
            Dashboard
          </h2>

          <p>
            Ringkasan presensi{" "}
            {profile.role ===
            "teacher"
              ? `kelas ${
                  profile.className ||
                  ""
                }`
              : "sekolah"}
            .
          </p>

        </div>


        <div className="date-actions">

          <label className="date-input">
            Tanggal

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
            />

          </label>


          <button
            className="btn"
            onClick={() =>
              setDate(todayKey())
            }
          >
            <CalendarDays size={16} />
            Hari Ini
          </button>

        </div>

      </div>


      <div className="stat-grid">

        <StatCard
          icon={Users}
          label="Total Siswa"
          value={
            stats.students
          }
        />

        <StatCard
          icon={UserRoundCheck}
          label="Hadir"
          value={stats.hadir}
          tone="green"
        />

        <StatCard
          icon={Stethoscope}
          label="Sakit"
          value={stats.sakit}
          tone="blue"
        />

        <StatCard
          icon={Clock3}
          label="Izin"
          value={stats.izin}
          tone="amber"
        />

        <StatCard
          icon={UserRoundX}
          label="Alpa"
          value={stats.alpa}
          tone="red"
        />

        <StatCard
          icon={EyeOff}
          label="Belum Absen"
          value={stats.belum}
          tone="gray"
        />

      </div>


      <div className="dashboard-grid">

        <div className="card">

          <div className="section-title">
            <b>
              Persentase Kehadiran
            </b>

            <span>
              {percent}%
            </span>
          </div>


          <div className="progress">
            <div
              style={{
                width:
                  `${percent}%`,
              }}
            />
          </div>


          <div className="dashboard-note">
            {stats.hadir} dari{" "}
            {stats.students} siswa
            tercatat hadir pada{" "}
            {fmtDate(date)}.
          </div>

        </div>


        <div className="card">

          <div className="section-title">

            <b>
              Presensi Terbaru
            </b>

            <button
              className="icon-btn"
              onClick={load}
            >
              <RefreshCw size={16} />
            </button>

          </div>


          <div className="mini-list">

            {recent.length ? (
              recent.map(
                (x, i) => (
                  <div key={i}>

                    <div>
                      <b>
                        {x.studentName}
                      </b>

                      <small>
                        {x.className}
                        {" • "}
                        {x.status}
                      </small>
                    </div>

                    <time>
                      {x.time}
                    </time>

                  </div>
                )
              )
            ) : (
              <span className="muted">
                Belum ada data.
              </span>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}


function StatCard({
  icon: Icon,
  label,
  value,
  tone = "",
}) {
  return (
    <div
      className={
        "stat-card " + tone
      }
    >

      <div className="stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>
          {label}
        </span>

        <b>
          {value}
        </b>
      </div>

    </div>
  );
}


/* =========================================================
   REPORTS
========================================================= */

function Reports({
  profile,
  school,
}) {

  const [month, setMonth] =
    useState(monthKey());

  const [classId, setClassId] =
    useState(
      profile.role === "teacher"
        ? profile.classId
        : ""
    );

  const [classes, setClasses] =
    useState([]);

  const [rows, setRows] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [summary, setSummary] =
    useState({
      H: 0,
      I: 0,
      S: 0,
      A: 0,
    });


  useEffect(() => {

    if (
      profile.role ===
      "admin"
    ) {
      fetchClasses()
        .then(setClasses)
        .catch(console.error);
    }

  }, []);


  useEffect(() => {
    load();
  }, [
    month,
    classId,
  ]);


  async function load() {

    setLoading(true);

    try {

      const studentsQ =
        classId
          ? query(
              collection(
                db,
                "students"
              ),
              where(
                "classId",
                "==",
                classId
              ),
              orderBy(
                "name"
              )
            )
          : query(
              collection(
                db,
                "students"
              ),
              orderBy(
                "className"
              ),
              orderBy(
                "name"
              )
            );


      const students =
        (
          await getDocs(
            studentsQ
          )
        ).docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));


      const start =
        month + "-01";

      const [y, m] =
        month
          .split("-")
          .map(Number);

      const end =
        new Date(
          y,
          m,
          1
        )
          .toISOString()
          .slice(0, 10);


      const attendanceQ =
        classId
          ? query(
              collection(
                db,
                "attendance"
              ),
              where(
                "classId",
                "==",
                classId
              ),
              where(
                "date",
                ">=",
                start
              ),
              where(
                "date",
                "<",
                end
              ),
              orderBy(
                "date"
              )
            )
          : query(
              collection(
                db,
                "attendance"
              ),
              where(
                "date",
                ">=",
                start
              ),
              where(
                "date",
                "<",
                end
              ),
              orderBy(
                "date"
              )
            );


      const aa =
        (
          await getDocs(
            attendanceQ
          )
        ).docs.map(
          (d) => d.data()
        );


      const map =
        new Map(
          aa.map((a) => [
            `${a.studentId}_${a.date}`,
            a,
          ])
        );


      const days =
        monthDays(month);

      const sums = {
        H: 0,
        I: 0,
        S: 0,
        A: 0,
      };


      const result =
        students.map(
          (s) => ({
            student: s,

            days:
              Array.from(
                {
                  length: days,
                },
                (_, i) => {

                  const a =
                    map.get(
                      `${s.id}_${monthDate(
                        month,
                        i + 1
                      )}`
                    );

                  if (a) {
                    const k =
                      STATUS[
                        a.status
                      ] || "-";

                    if (
                      sums[k] !==
                      undefined
                    ) {
                      sums[k]++;
                    }
                  }

                  return (
                    a || null
                  );
                }
              ),
          })
        );


      setRows(result);
      setSummary(sums);

    } catch (e) {

      console.error(
        "Laporan error:",
        e
      );

    } finally {

      setLoading(false);

    }
  }


  function exportExcel() {

    const data =
      rows.map(
        (r, i) => {

          const o = {
            No: i + 1,
            Nama:
              r.student.name,
            NIS:
              r.student.nis ||
              "",
            Kelas:
              r.student.className ||
              "",
          };


          r.days.forEach(
            (a, j) => {
              o[j + 1] =
                a
                  ? STATUS[
                      a.status
                    ] || "H"
                  : "-";
            }
          );


          o.Hadir =
            r.days.filter(
              (a) =>
                a?.status ===
                "Hadir"
            ).length;

          o.Izin =
            r.days.filter(
              (a) =>
                a?.status ===
                "Izin"
            ).length;

          o.Sakit =
            r.days.filter(
              (a) =>
                a?.status ===
                "Sakit"
            ).length;

          o.Alpa =
            r.days.filter(
              (a) =>
                a?.status ===
                "Alpa"
            ).length;

          return o;
        }
      );


    const ws =
      XLSX.utils.json_to_sheet(
        data
      );

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Presensi"
    );

    XLSX.writeFile(
      wb,
      `Laporan-Presensi-${month}.xlsx`
    );
  }


  function print() {
    window.print();
  }


  const className =
    profile.role === "teacher"
      ? profile.className
      : (
          classes.find(
            (c) =>
              c.id ===
              classId
          )?.name ||
          "Semua Kelas"
        );


  return (
    <div className="page">

      <div className="page-title">

        <div>

          <h2>
            Laporan Bulanan
          </h2>

          <p>
            Rekap kehadiran dan
            ketidakhadiran siswa.
          </p>

        </div>


        <div className="report-actions">

          <input
            type="month"
            value={month}
            onChange={(e) =>
              setMonth(
                e.target.value
              )
            }
          />

          <button
            className="btn"
            onClick={
              exportExcel
            }
          >
            <FileSpreadsheet
              size={17}
            />
            Excel
          </button>

          <button
            className="btn"
            onClick={print}
          >
            <Printer size={17} />
            Cetak
          </button>

        </div>

      </div>


      {profile.role ===
        "admin" && (
        <div className="card filterbar">

          <label>
            Kelas

            <select
              value={classId}
              onChange={(e) =>
                setClassId(
                  e.target.value
                )
              }
            >

              <option value="">
                Semua Kelas
              </option>

              {classes.map(
                (c) => (
                  <option
                    key={c.id}
                    value={c.id}
                  >
                    {c.name}
                  </option>
                )
              )}

            </select>

          </label>

        </div>
      )}


      <div className="report-summary">

        <div>
          <b>
            {summary.H}
          </b>
          <span>Hadir</span>
        </div>

        <div>
          <b>
            {summary.I}
          </b>
          <span>Izin</span>
        </div>

        <div>
          <b>
            {summary.S}
          </b>
          <span>Sakit</span>
        </div>

        <div>
          <b>
            {summary.A}
          </b>
          <span>Alpa</span>
        </div>

      </div>


      <div className="card report-card">

        <div className="report-header">

          <div>
            <b>
              {school.headerLine1 ||
                school.name}
            </b>

            <div>
              {school.headerLine2 ||
                school.address}
            </div>

            <small>
              {school.address}
            </small>
          </div>


          <div>

            <b>
              LAPORAN PRESENSI BULANAN
            </b>

            <div>
              {className}
            </div>

            <div>
              {new Date(
                month + "-01"
              ).toLocaleDateString(
                "id-ID",
                {
                  month: "long",
                  year: "numeric",
                }
              )}
            </div>

          </div>

        </div>


        {loading ? (
          <div className="empty">
            Memuat laporan...
          </div>
        ) : (
          <div className="table-wrap report-table">

            <table>

              <thead>

                <tr>

                  <th>No</th>

                  <th>
                    Nama
                  </th>

                  {rows[0]?.days.map(
                    (_, i) => (
                      <th key={i}>
                        {i + 1}
                      </th>
                    )
                  )}

                  <th>H</th>
                  <th>I</th>
                  <th>S</th>
                  <th>A</th>

                </tr>

              </thead>


              <tbody>

                {rows.map(
                  (r, i) => {

                    const c = {
                      H: 0,
                      I: 0,
                      S: 0,
                      A: 0,
                    };


                    r.days.forEach(
                      (a) => {

                        if (a) {
                          const k =
                            STATUS[
                              a.status
                            ];

                          if (
                            c[k] !==
                            undefined
                          ) {
                            c[k]++;
                          }
                        }

                      }
                    );


                    return (
                      <tr
                        key={
                          r.student.id
                        }
                      >

                        <td>
                          {i + 1}
                        </td>

                        <td className="sticky-name">
                          <b>
                            {
                              r.student
                                .name
                            }
                          </b>
                        </td>


                        {r.days.map(
                          (a, j) => (
                            <td
                              key={j}
                              className={
                                a
                                  ? `status-${
                                      STATUS[
                                        a.status
                                      ] ||
                                      "H"
                                    }`
                                  : ""
                              }
                            >
                              {a
                                ? STATUS[
                                    a.status
                                  ] || "H"
                                : "-"}
                            </td>
                          )
                        )}


                        <td>
                          <b>
                            {c.H}
                          </b>
                        </td>

                        <td>
                          {c.I}
                        </td>

                        <td>
                          {c.S}
                        </td>

                        <td>
                          {c.A}
                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}


        <div className="legend">
          H = Hadir • I = Izin •
          S = Sakit • A = Alpa •
          - = Tidak ada presensi.
        </div>


        <div className="signature">

          <div>
            Mengetahui,
            <br />
            Kepala Sekolah
            <br />
            <br />
            <br />

            <b>
              {school.principalName ||
                "................................"}
            </b>

            <br />

            NIP.{" "}
            {school.principalNip ||
              "................................"}
          </div>


          <div>

            {school.address ||
              "Jatiwaringin"}
            ,{" "}
            {fmtDate(
              todayKey()
            )}

            <br />

            Wali Kelas

            <br />
            <br />
            <br />

            <b>
              {profile.role ===
              "teacher"
                ? "(Guru Kelas)"
                : "____________________"}
            </b>

          </div>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   SCHOOL STRUCTURE
========================================================= */

function SchoolStructure({
  profile,
  school,
}) {

  /*
   * IMPORTANT:
   *
   * settings/school belum tentu
   * mempunyai field id.
   *
   * Karena profile admin kita
   * sudah mempunyai:
   *
   * schoolId = school-001
   *
   * maka profile.schoolId
   * menjadi fallback utama.
   */

  const schoolId =
    school?.id ||
    school?.schoolId ||
    profile?.schoolId ||
    "school-001";


  const [year, setYear] =
    useState(null);

  const [classes, setClasses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  async function loadStructure() {

    setLoading(true);
    setError("");

    try {

      /* ==============================
         TAHUN AJARAN
      ============================== */

      const yearQuery =
        query(
          collection(
            db,
            "academicYears"
          ),
          where(
            "schoolId",
            "==",
            schoolId
          ),
          where(
            "isActive",
            "==",
            true
          ),
          limit(1)
        );


      const yearSnap =
        await getDocs(
          yearQuery
        );


      if (yearSnap.empty) {

        setYear(null);
        setClasses([]);

        return;
      }


      const yearDoc =
        yearSnap.docs[0];


      const yearData = {
        id: yearDoc.id,
        ...yearDoc.data(),
      };


      setYear(
        yearData
      );


      /* ==============================
         KELAS
      ============================== */

      const classQuery =
        query(
          collection(
            db,
            "classes"
          ),
          where(
            "schoolId",
            "==",
            schoolId
          ),
          where(
            "academicYearId",
            "==",
            yearData.id
          ),
          where(
            "isActive",
            "==",
            true
          )
        );


      const classSnap =
        await getDocs(
          classQuery
        );


      const classData =
        classSnap.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          }))
          .sort(
            (a, b) =>
              String(
                a.name || ""
              ).localeCompare(
                String(
                  b.name || ""
                ),
                "id",
                {
                  numeric: true,
                }
              )
          );


      setClasses(
        classData
      );

    } catch (error) {

      console.error(
        "Gagal memuat struktur sekolah:",
        error
      );

      setError(
        error?.message ||
        "Gagal memuat struktur sekolah."
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {
    loadStructure();
  }, []);


  if (loading) {
    return (
      <div className="page">

        <div className="card">

          <h2>
            Struktur Sekolah
          </h2>

          <p>
            Memuat struktur sekolah...
          </p>

        </div>

      </div>
    );
  }


  if (error) {
    return (
      <div className="page">

        <div className="card">

          <h2>
            Struktur Sekolah
          </h2>


          <div
            style={{
              padding: "16px",
              borderRadius: "10px",
              background:
                "#fee2e2",
              color:
                "#991b1b",
              marginTop:
                "16px",
            }}
          >

            <strong>
              Gagal memuat data
            </strong>

            <div
              style={{
                marginTop:
                  "8px",
              }}
            >
              {error}
            </div>

          </div>


          <button
            className="btn"
            onClick={
              loadStructure
            }
            style={{
              marginTop:
                "16px",
            }}
          >
            Coba Lagi
          </button>

        </div>

      </div>
    );
  }


  return (
    <div className="page">

      <div className="page-title">

        <div>

          <h2>
            Struktur Sekolah
          </h2>

          <p>
            Informasi sekolah,
            tahun ajaran, dan
            daftar kelas.
          </p>

        </div>

      </div>


      {/* IDENTITAS */}

      <div className="card">

        <h2>
          Identitas Sekolah
        </h2>


        <div
          style={{
            marginTop:
              "16px",
            display:
              "grid",
            gap:
              "12px",
          }}
        >

          <div>

            <strong>
              Nama Sekolah
            </strong>

            <div>
              {school?.name ||
                "-"}
            </div>

          </div>


          <div>

            <strong>
              Alamat
            </strong>

            <div>
              {school?.address ||
                "-"}
            </div>

          </div>


          <div>

            <strong>
              School ID
            </strong>

            <div>
              {schoolId ||
                "-"}
            </div>

          </div>

        </div>

      </div>


      {/* TAHUN AJARAN */}

      <div className="card">

        <h2>
          Tahun Ajaran Aktif
        </h2>


        {!year ? (

          <div
            style={{
              marginTop:
                "16px",
            }}
          >
            Belum ada tahun
            ajaran aktif.
          </div>

        ) : (

          <div
            style={{
              marginTop:
                "16px",
              padding:
                "16px",
              borderRadius:
                "10px",
              background:
                "#f0fdf4",
            }}
          >

            <div
              style={{
                fontSize:
                  "22px",
                fontWeight:
                  "700",
              }}
            >
              {year.name}
            </div>

            <div
              style={{
                marginTop:
                  "6px",
              }}
            >
              Status:{" "}
              <strong>
                Aktif
              </strong>
            </div>

          </div>

        )}

      </div>


      {/* KELAS */}

      <div className="card">

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "center",
            gap:
              "16px",
          }}
        >

          <div>

            <h2>
              Daftar Kelas
            </h2>

            {year && (
              <p
                style={{
                  marginTop:
                    "4px",
                }}
              >
                Tahun ajaran{" "}
                {year.name}
              </p>
            )}

          </div>


          <div>
            <strong>
              {classes.length}{" "}
              kelas
            </strong>
          </div>

        </div>


        {classes.length ===
        0 ? (

          <div
            style={{
              marginTop:
                "20px",
            }}
          >
            Belum ada kelas
            untuk tahun ajaran
            ini.
          </div>

        ) : (

          <div
            style={{
              marginTop:
                "20px",
              display:
                "grid",
              gap:
                "12px",
            }}
          >

            {classes.map(
              (item) => (

                <div
                  key={item.id}
                  style={{
                    border:
                      "1px solid #e5e7eb",
                    borderRadius:
                      "12px",
                    padding:
                      "16px",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontSize:
                          "20px",
                        fontWeight:
                          "700",
                      }}
                    >
                      {item.name}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "4px",
                      }}
                    >
                      Kelas{" "}
                      {item.grade}
                    </div>

                  </div>


                  <div>
                    {item.isActive
                      ? "Aktif"
                      : "Tidak Aktif"}
                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}


function BarcodeImage({
  value,
  width = 1.5,
  height = 55,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    svgRef.current.innerHTML = "";

    if (!value) return;

    try {
      JsBarcode(
        svgRef.current,
        String(value),
        {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize: 12,
          margin: 4,
          textMargin: 4,
        }
      );
    } catch (error) {
      console.error(
        "Gagal membuat barcode:",
        error
      );
    }
  }, [
    value,
    width,
    height,
  ]);

  if (!value) {
    return (
      <span className="muted">
        -
      </span>
    );
  }

  return (
    <div className="barcode-image">
      <svg ref={svgRef} />
    </div>
  );
}


/* =========================================================
   STUDENTS
========================================================= */

function Students({ profile, school }) {
  const isAdmin = profile.role === "admin";

  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      let studentQuery;

      if (isAdmin) {
        // Admin boleh melihat semua siswa
        studentQuery = query(collection(db, "students"));
      } else {
        // Guru hanya boleh melihat siswa di kelasnya
        if (!profile.classId) {
          throw new Error("Akun guru belum memiliki kelas.");
        }

        studentQuery = query(
          collection(db, "students"),
          where("classId", "==", profile.classId)
        );
      }

      const snap = await getDocs(studentQuery);

      const data = snap.docs
        .map((d) => ({
          id: d.id,
          ...d.data()
        }))
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            "id"
          )
        );

      setItems(data);

      if (isAdmin) {
        setClasses(await fetchClasses());
      } else {
        setClasses([
          {
            id: profile.classId,
            name: profile.className || "-",
            schoolId: profile.schoolId || "",
          }
        ]);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Gagal memuat data siswa.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [profile]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return items;

    return items.filter((x) =>
      [
        x.name,
        x.nis,
        x.barcode,
        x.className
      ]
        .filter(Boolean)
        .some((v) =>
          String(v).toLowerCase().includes(q)
        )
    );
  }, [items, search]);

  function openAdd() {
    setEdit(null);
    setModal(true);
  }

  function openEdit(student) {
    setEdit(student);
    setModal(true);
  }

  async function removeStudent(student) {
    if (!isAdmin) return;

    const ok = window.confirm(
      `Hapus siswa "${student.name}"?`
    );

    if (!ok) return;

    try {
      setBusy(true);

      await deleteDoc(
        doc(db, "students", student.id)
      );

      await load();
    } catch (e) {
      console.error(e);
      alert(
        e.message || "Gagal menghapus siswa."
      );
    } finally {
      setBusy(false);
    }
  }

  function exportExcel() {
    const rows = filtered.map((x, index) => ({
      No: index + 1,
      Nama: x.name || "",
      NIS: x.nis || "",
      Kelas: x.className || "",
      Barcode: x.barcode || ""
    }));

    if (!rows.length) {
      alert("Tidak ada data siswa untuk diekspor.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Data Siswa"
    );

    XLSX.writeFile(
      wb,
      `Data-Siswa-${profile.className || "Sekolah"}.xlsx`
    );
  }

  async function importExcel(e) {
    if (!isAdmin) return;

    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setBusy(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, {
        type: "array"
      });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet);

      if (!rows.length) {
        throw new Error(
          "File Excel tidak memiliki data."
        );
      }

      if (!classes.length) {
        throw new Error(
          "Belum ada data kelas."
        );
      }

      let success = 0;

      for (const row of rows) {
        const name = String(
          row.Nama ||
          row.nama ||
          row["Nama Siswa"] ||
          ""
        ).trim();

        const nis = String(
          row.NIS ||
          row.nis ||
          ""
        ).trim();

        const barcode = String(
          row.Barcode ||
          row.barcode ||
          ""
        ).trim();

        const className = String(
          row.Kelas ||
          row.kelas ||
          row["Nama Kelas"] ||
          ""
        ).trim();

        if (!name || !className) {
          continue;
        }

        const selectedClass = classes.find(
          (c) =>
            String(c.name).toLowerCase() ===
            className.toLowerCase()
        );

        if (!selectedClass) {
          console.warn(
            `Kelas tidak ditemukan: ${className}`
          );
          continue;
        }

        await setDoc(
          doc(db, "students", uid()),
          {
            name,
            nis,
            barcode,
            classId: selectedClass.id,
            className: selectedClass.name,
            schoolId:
              selectedClass.schoolId ||
              profile.schoolId ||
              "",
            academicYearId:
              selectedClass.academicYearId ||
              "",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        );

        success++;
      }

      alert(
        `Import selesai.\n${success} siswa berhasil dimasukkan.`
      );

      await load();
    } catch (e) {
      console.error(e);
      alert(
        e.message || "Gagal mengimpor Excel."
      );
    } finally {
      e.target.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="page">

      <div className="page-title">
        <div>
          <h2>Data Siswa</h2>
          <p>
            {isAdmin
              ? "Kelola data siswa sekolah."
              : `Data siswa kelas ${profile.className || "-"}.`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          <button
            className="btn"
            onClick={exportExcel}
            disabled={loading || !filtered.length}
          >
            <Download size={17} />
            Export Excel
          </button>

          {isAdmin && (
            <>
              <label className="btn">
                <Upload size={17} />
                Import Excel

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={importExcel}
                  disabled={busy}
                />
              </label>

              <button
                className="btn primary"
                onClick={openAdd}
              >
                <Plus size={18} />
                Tambah Siswa
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              position: "relative",
              flex: 1,
              minWidth: 240
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.5
              }}
            />

            <input
              className="input"
              style={{
                paddingLeft: 40,
                width: "100%"
              }}
              placeholder="Cari nama, NIS, barcode, atau kelas..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <div className="badge green">
            {filtered.length} siswa
          </div>
        </div>

        {error && (
          <div
            className="alert error"
            style={{ marginBottom: 16 }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center"
            }}
          >
            Memuat data siswa...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              opacity: 0.65
            }}
          >
            {search
              ? "Siswa tidak ditemukan."
              : "Belum ada data siswa."}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>NIS</th>
                  <th>Kelas</th>
                  <th>Barcode</th>

                  {isAdmin && (
                    <th style={{ width: 120 }}>
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {filtered.map((student, index) => (
                  <tr key={student.id}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>
                        {student.name || "-"}
                      </strong>
                    </td>

                    <td>
                      {student.nis || "-"}
                    </td>

                    <td>
                      <span className="badge">
                        {student.className || "-"}
                      </span>
                    </td>

                    <td>
                      <code>
                        {student.barcode || "-"}
                      </code>
                    </td>

                    {isAdmin && (
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: 6
                          }}
                        >
                          <button
                            className="icon-btn"
                            title="Edit"
                            onClick={() =>
                              openEdit(student)
                            }
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            className="icon-btn danger"
                            title="Hapus"
                            onClick={() =>
                              removeStudent(student)
                            }
                            disabled={busy}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {modal && (
        <StudentModal
          initial={edit}
          classes={classes}
          profile={profile}
          school={school}
          onClose={() => setModal(false)}
          onSaved={() => {
            setModal(false);
            load();
          }}
        />
      )}

    </div>
  );
}


/* =========================================================
   STUDENT MODAL
========================================================= */

function StudentModal({
  initial,
  classes,
  onClose,
  onSaved,
}) {
  const firstClass =
    classes[0] || null;

  const [f, setF] = useState(
    initial || {
      name: "",
      nis: "",
      barcode: "",
      classId:
        firstClass?.id || "",
      className:
        firstClass?.name || "",
    }
  );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {

    const selected =
      classes.find(
        (item) =>
          item.id === f.classId
      );

    if (!selected) return;

    setF((current) => ({
      ...current,

      className:
        selected.name || "",
    }));

  }, [
    f.classId,
    classes,
  ]);

  async function save(e) {

    e.preventDefault();

    setBusy(true);
    setError("");

    try {

      if (!f.name.trim()) {
        throw new Error(
          "Nama siswa wajib diisi."
        );
      }

      if (!f.classId) {
        throw new Error(
          "Kelas wajib dipilih."
        );
      }

      if (!f.barcode.trim()) {
        throw new Error(
          "Barcode wajib diisi."
        );
      }

      // ================================
      // CEK BARCODE DUPLIKAT
      // ================================

      const duplicateQuery =
        query(
          collection(
            db,
            "students"
          ),
          where(
            "barcode",
            "==",
            f.barcode.trim()
          ),
          limit(1)
        );

      const duplicateSnap =
        await getDocs(
          duplicateQuery
        );

      if (
        !duplicateSnap.empty &&
        duplicateSnap.docs[0].id !==
          initial?.id
      ) {
        throw new Error(
          "Barcode tersebut sudah digunakan siswa lain."
        );
      }

      const data = {
        name: f.name.trim(),

        nis:
          f.nis?.trim() || "",

        barcode:
          f.barcode.trim(),

        classId:
          f.classId,

        className:
          f.className || "",

        updatedAt:
          serverTimestamp(),
      };

      // ================================
      // UPDATE
      // ================================

      if (initial) {

        await updateDoc(
          doc(
            db,
            "students",
            initial.id
          ),
          data
        );

      }

      // ================================
      // CREATE
      // ================================

      else {

        await setDoc(
          doc(
            db,
            "students",
            uid()
          ),
          {
            ...data,

            createdAt:
              serverTimestamp(),
          }
        );

      }

      onSaved();

    } catch (error) {

      console.error(
        "Gagal menyimpan siswa:",
        error
      );

      setError(
        error?.message ||
        "Gagal menyimpan data siswa."
      );

    } finally {

      setBusy(false);

    }
  }

  return (

    <Modal
      title={
        initial
          ? "Edit Siswa"
          : "Tambah Siswa"
      }
      onClose={onClose}
    >

      <form
        className="stack"
        onSubmit={save}
      >

        {/* NAMA */}

        <label>
          Nama Lengkap

          <input
            value={f.name}
            onChange={(e) =>
              setF({
                ...f,
                name:
                  e.target.value,
              })
            }
            placeholder="Nama lengkap siswa"
            required
          />

        </label>

        {/* NIS */}

        <label>
          NIS

          <input
            value={f.nis}
            onChange={(e) =>
              setF({
                ...f,
                nis:
                  e.target.value,
              })
            }
            placeholder="Nomor Induk Siswa"
          />

        </label>

        {/* KELAS */}

        <label>
          Kelas

          <select
            value={f.classId}
            onChange={(e) =>
              setF({
                ...f,
                classId:
                  e.target.value,
              })
            }
            required
          >

            {classes.length === 0 ? (

              <option value="">
                Belum ada kelas
              </option>

            ) : (

              classes.map((item) => (

                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>

              ))

            )}

          </select>

        </label>

        {/* BARCODE */}

        <label>
          Barcode / ID Siswa

          <input
            value={f.barcode}
            onChange={(e) =>
              setF({
                ...f,
                barcode:
                  e.target.value,
              })
            }
            placeholder="Contoh: 20260001"
            required
          />

        </label>

        {/* PREVIEW */}

        {f.barcode && (

          <div className="barcode-preview">

            <div className="barcode-preview-title">
              Preview Barcode
            </div>

            <BarcodeImage
              value={f.barcode}
              width={2}
              height={70}
            />

            <small className="muted">
              Barcode ini dapat dipindai
              menggunakan kamera.
            </small>

          </div>

        )}

        {/* ERROR */}

        {error && (

          <div className="alert error">

            <AlertCircle
              size={18}
            />

            <span>
              {error}
            </span>

          </div>

        )}

        {/* ACTION */}

        <div className="modal-actions">

          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={busy}
          >
            Batal
          </button>

          <button
            type="submit"
            className="btn primary"
            disabled={busy}
          >

            {busy
              ? "Menyimpan..."
              : "Simpan"}

          </button>

        </div>

      </form>

    </Modal>
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   TEACHERS DATA
========================================================= */

function Teachers() {

  const [items, setItems] =
    useState([]);

  const [classes, setClasses] =
    useState([]);

  const [modal, setModal] =
    useState(false);

  const [edit, setEdit] =
    useState(null);


  async function load() {

    const snap =
      await getDocs(
        query(
          collection(
            db,
            "teachers"
          ),
          orderBy(
            "name"
          )
        )
      );


    setItems(
      snap.docs.map(
        (d) => ({
          id: d.id,
          ...d.data(),
        })
      )
    );


    setClasses(
      await fetchClasses()
    );
  }


  useEffect(() => {
    load().catch(console.error);
  }, []);


  return (
    <div className="page">

      <div className="page-title">

        <div>

          <h2>
            Data Guru
          </h2>

          <p>
            Data identitas guru
            dan wali kelas.
          </p>

        </div>


        <button
          className="btn primary"
          onClick={() => {
            setEdit(null);
            setModal(true);
          }}
        >
          <Plus size={18} />
          Tambah Guru
        </button>

      </div>


      <div className="card table-wrap">

        <table>

          <thead>

            <tr>
              <th>Nama</th>
              <th>NIP</th>
              <th>Kelas</th>
              <th>Kontak</th>
              <th>Aksi</th>
            </tr>

          </thead>


          <tbody>

            {items.map(
              (x) => (

                <tr key={x.id}>

                  <td>
                    <b>
                      {x.name}
                    </b>
                  </td>

                  <td>
                    {x.nip || "-"}
                  </td>

                  <td>
                    {x.className ||
                      "-"}
                  </td>

                  <td>
                    {x.phone || "-"}
                  </td>

                  <td>

                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEdit(x);
                        setModal(true);
                      }}
                    >
                      <Pencil size={16} />
                    </button>


                    <button
                      className="icon-btn danger-icon"
                      onClick={async () => {

                        if (
                          confirm(
                            "Hapus guru?"
                          )
                        ) {

                          await deleteDoc(
                            doc(
                              db,
                              "teachers",
                              x.id
                            )
                          );

                          load();
                        }

                      }}
                    >
                      <Trash2 size={16} />
                    </button>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>


      {modal && (
        <TeacherModal
          initial={edit}
          classes={classes}
          onClose={() =>
            setModal(false)
          }
          onSaved={() => {
            setModal(false);
            load();
          }}
        />
      )}

    </div>
  );
}


/* =========================================================
   TEACHER MODAL
========================================================= */

function TeacherModal({
  initial,
  classes,
  onClose,
  onSaved,
}) {

  const [f, setF] =
    useState(
      initial || {
        name: "",
        nip: "",
        phone: "",
        classId:
          classes[0]?.id ||
          "",
        className:
          classes[0]?.name ||
          "",
      }
    );


  useEffect(() => {

    const c =
      classes.find(
        (c) =>
          c.id ===
          f.classId
      );

    if (c) {
      setF((x) => ({
        ...x,
        className:
          c.name,
      }));
    }

  }, [
    f.classId,
    classes,
  ]);


  async function save(e) {

    e.preventDefault();


    if (initial) {

      await updateDoc(
        doc(
          db,
          "teachers",
          initial.id
        ),
        {
          ...f,
          updatedAt:
            serverTimestamp(),
        }
      );

    } else {

      await setDoc(
        doc(
          db,
          "teachers",
          uid()
        ),
        {
          ...f,
          createdAt:
            serverTimestamp(),
        }
      );

    }


    onSaved();
  }


  return (
    <Modal
      title={
        initial
          ? "Edit Guru"
          : "Tambah Guru"
      }
      onClose={onClose}
    >

      <form
        className="stack"
        onSubmit={save}
      >

        <label>
          Nama

          <input
            value={f.name}
            onChange={(e) =>
              setF({
                ...f,
                name:
                  e.target.value,
              })
            }
            required
          />
        </label>


        <label>
          NIP

          <input
            value={f.nip}
            onChange={(e) =>
              setF({
                ...f,
                nip:
                  e.target.value,
              })
            }
          />
        </label>


        <label>
          No. HP

          <input
            value={f.phone}
            onChange={(e) =>
              setF({
                ...f,
                phone:
                  e.target.value,
              })
            }
          />
        </label>


        <label>
          Wali Kelas

          <select
            value={f.classId}
            onChange={(e) =>
              setF({
                ...f,
                classId:
                  e.target.value,
              })
            }
          >

            {classes.map(
              (c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.name}
                </option>
              )
            )}

          </select>

        </label>


        <div className="modal-actions">

          <button
            type="button"
            className="btn"
            onClick={onClose}
          >
            Batal
          </button>

          <button
            className="btn primary"
          >
            Simpan
          </button>

        </div>

      </form>

    </Modal>
  );
}


/* =========================================================
   SETTINGS
========================================================= */

function SettingsPage({
  initial,
  onSaved,
}) {

  const [f, setF] =
    useState(initial);

  const [classes, setClasses] =
    useState([]);

  const [newClass, setNewClass] =
    useState("");


  useEffect(() => {

    fetchClasses()
      .then(setClasses)
      .catch(console.error);

  }, []);


  async function save(e) {

    e.preventDefault();

    await setDoc(
      doc(
        db,
        "settings",
        "school"
      ),
      f,
      {
        merge: true,
      }
    );

    onSaved(f);

    alert(
      "Pengaturan tersimpan."
    );
  }


  async function addClass() {

    if (!newClass.trim())
      return;

    const ref =
      doc(
        db,
        "classes",
        uid()
      );


    await setDoc(ref, {
      name:
        newClass.trim(),

      createdAt:
        serverTimestamp(),
    });


    setClasses(
      await fetchClasses()
    );

    setNewClass("");
  }


  async function delClass(c) {

    if (
      confirm(
        `Hapus kelas ${c.name}?`
      )
    ) {

      await deleteDoc(
        doc(
          db,
          "classes",
          c.id
        )
      );

      setClasses(
        await fetchClasses()
      );
    }
  }


  return (
    <div className="page">

      <div className="page-title">

        <div>

          <h2>
            Pengaturan
          </h2>

          <p>
            Identitas sekolah,
            kop surat dan kelas.
          </p>

        </div>

      </div>


      <form
        className="card settings-form"
        onSubmit={save}
      >

        <div className="form-grid">

          <label>
            Nama sekolah

            <input
              value={
                f.name || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  name:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            NPSN

            <input
              value={
                f.npsn || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  npsn:
                    e.target.value,
                })
              }
            />
          </label>


          <label className="span2">
            Alamat

            <input
              value={
                f.address || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  address:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            No. Telepon

            <input
              value={
                f.phone || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  phone:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            Email sekolah

            <input
              value={
                f.email || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  email:
                    e.target.value,
                })
              }
            />
          </label>


          <label className="span2">
            Kop baris 1

            <input
              value={
                f.headerLine1 || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  headerLine1:
                    e.target.value,
                })
              }
              placeholder="PEMERINTAH KABUPATEN ..."
            />
          </label>


          <label className="span2">
            Kop baris 2

            <input
              value={
                f.headerLine2 || ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  headerLine2:
                    e.target.value,
                })
              }
              placeholder="DINAS PENDIDIKAN ..."
            />
          </label>


          <label>
            Nama Kepala Sekolah

            <input
              value={
                f.principalName ||
                ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  principalName:
                    e.target.value,
                })
              }
            />
          </label>


          <label>
            NIP Kepala Sekolah

            <input
              value={
                f.principalNip ||
                ""
              }
              onChange={(e) =>
                setF({
                  ...f,
                  principalNip:
                    e.target.value,
                })
              }
            />
          </label>

        </div>


        <button className="btn primary">

          <CheckCircle2 size={17} />

          Simpan Pengaturan

        </button>

      </form>


      <div className="card">

        <div className="section-title">

          <b>
            Daftar Kelas
          </b>

        </div>


        <div className="inline-add">

          <input
            value={newClass}
            onChange={(e) =>
              setNewClass(
                e.target.value
              )
            }
            placeholder="Contoh: 1A / Kelas I"
          />


          <button
            type="button"
            className="btn primary"
            onClick={addClass}
          >
            <Plus size={17} />
            Tambah
          </button>

        </div>


        <div className="class-list">

          {classes.map(
            (c) => (

              <div key={c.id}>

                <span>
                  {c.name}
                </span>

                <button
                  className="icon-btn danger-icon"
                  onClick={() =>
                    delClass(c)
                  }
                >
                  <Trash2
                    size={16}
                  />
                </button>

              </div>

            )
          )}

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  onClose,
  children,
}) {

  return (
    <div className="modal-backdrop">

      <div className="modal">

        <div className="modal-head">

          <b>
            {title}
          </b>

          <button
            className="icon-btn"
            onClick={onClose}
          >
            <X />
          </button>

        </div>

        {children}

      </div>

    </div>
  );
}


/* =========================================================
   EXPORT
========================================================= */

export default App;