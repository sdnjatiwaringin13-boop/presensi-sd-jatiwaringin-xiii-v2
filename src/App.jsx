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
  Timestamp,
} from "firebase/firestore";

import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";

import {
  auth,
  db,
  secondaryAuth,
} from "./firebase";

import Presensi from "./pages/Presensi";

import {
  Camera,
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
  AlertCircle,
  CalendarDays,
  BarChart3,
  Upload,
  FileSpreadsheet,
    UserRoundCheck,
  UserRoundX,
  Stethoscope,
  Eye,
  EyeOff
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
            <Presensi
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
  const [date, setDate] = useState(todayKey());
  const [recent, setRecent] = useState([]);
  const [result, setResult] = useState(null);

  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const scannerRef = useRef(null);
  const startingCameraRef = useRef(false);
  const mountedRef = useRef(true);

  const isAdmin = profile?.role === "admin";
  const classId = isAdmin ? "" : profile?.classId || "";
  const readerId = `reader-${profile?.id || "attendance"}`;

  /*
   * ============================================================
   * CLEANUP
   * ============================================================
   */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const scanner = scannerRef.current;

      if (scanner) {
        scannerRef.current = null;

        try {
          scanner
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scanner.clear();
              } catch (_) {}
            });
        } catch (_) {
          try {
            scanner.clear();
          } catch (_) {}
        }
      }
    };
  }, []);

  /*
   * ============================================================
   * SUARA
   * ============================================================
   */


  /*
   * ============================================================
   * LOAD PRESENSI TERBARU
   *
   * Sengaja TIDAK menggunakan orderBy().
   * Dengan begitu kita tidak membutuhkan composite index.
   * ============================================================
   */

  async function loadRecent() {
    if (!mountedRef.current) return;

    try {
      let q;

      if (isAdmin) {
        q = query(
          collection(db, "attendance"),
          where("date", "==", date)
        );
      } else {
        if (!classId) {
          setRecent([]);
          return;
        }

        q = query(
          collection(db, "attendance"),
          where("classId", "==", classId),
          where("date", "==", date)
        );
      }

      const snap = await getDocs(q);

      let rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      /*
       * Urutkan di browser, bukan Firestore.
       * Jadi tidak perlu composite index.
       */
      rows.sort((a, b) => {
        const timeA = a.time || "";
        const timeB = b.time || "";

        return timeB.localeCompare(timeA);
      });

      rows = rows.slice(0, 12);

      if (mountedRef.current) {
        setRecent(rows);
      }
    } catch (error) {
      console.error("Gagal memuat presensi terbaru:", error);

      if (mountedRef.current) {
        setRecent([]);
      }
    }
  }

  useEffect(() => {
    loadRecent();
  }, [date, classId, isAdmin]);

  /*
   * ============================================================
   * STOP CAMERA
   * ============================================================
   */

  async function stopCamera() {
    const scanner = scannerRef.current;

    if (!scanner) {
      if (mountedRef.current) {
        setRunning(false);
      }
      return;
    }

    scannerRef.current = null;

    try {
      await scanner.stop();
    } catch (error) {
      console.warn("Kamera sudah berhenti:", error);
    }

    /*
     * Jangan memaksa clear terlalu agresif.
     * Ini membantu mencegah error:
     *
     * NotFoundError:
     * Failed to execute 'removeChild'
     */
    try {
      scanner.clear();
    } catch (error) {
      console.warn("Camera clear warning:", error);
    }

    if (mountedRef.current) {
      setRunning(false);
    }
  }

  /*
   * ============================================================
   * START CAMERA
   * ============================================================
   */

  async function startCamera() {
    if (startingCameraRef.current) return;
    if (running) return;

    startingCameraRef.current = true;

    setCameraError("");

    try {
      /*
       * Bersihkan scanner lama kalau masih ada.
       */
      if (scannerRef.current) {
        await stopCamera();
      }

      /*
       * Pastikan element reader tersedia.
       */
      const readerElement = document.getElementById(readerId);

      if (!readerElement) {
        throw new Error("Area kamera belum siap.");
      }

      /*
       * Pastikan tidak ada sisa DOM dari scanner sebelumnya.
       */
      readerElement.innerHTML = "";

      const scanner = new Html5Qrcode(readerId);

      scannerRef.current = scanner;

      /*
       * Jangan menggunakan:
       *
       * { facingMode: { exact: "environment" } }
       *
       * karena itu yang menyebabkan:
       * OverconstrainedError
       */

      const cameraConfig = {
        facingMode: "environment",
      };

      await scanner.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 160,
          },
          aspectRatio: 1.777778,
        },
        async (decodedText) => {
          await processCode(decodedText);
        },
        () => {
          /*
           * Scan frame gagal tidak perlu ditampilkan.
           * Barcode scanner memang normal menghasilkan error
           * di frame-frame yang belum berisi barcode.
           */
        }
      );

      if (mountedRef.current) {
        setRunning(true);
      }
    } catch (error) {
      console.error("Gagal membuka kamera:", error);

      /*
       * Jika environment gagal, coba kamera default.
       */
      try {
        const oldScanner = scannerRef.current;

        if (oldScanner) {
          try {
            await oldScanner.stop();
          } catch (_) {}

          try {
            oldScanner.clear();
          } catch (_) {}
        }

        scannerRef.current = null;

        const readerElement = document.getElementById(readerId);

        if (!readerElement) {
          throw error;
        }

        readerElement.innerHTML = "";

        const fallbackScanner = new Html5Qrcode(readerId);

        scannerRef.current = fallbackScanner;

        await fallbackScanner.start(
          {
            facingMode: "user",
          },
          {
            fps: 10,
            qrbox: {
              width: 280,
              height: 160,
            },
            aspectRatio: 1.777778,
          },
          async (decodedText) => {
            await processCode(decodedText);
          },
          () => {}
        );

        if (mountedRef.current) {
          setRunning(true);
          setCameraError(
            "Kamera belakang tidak tersedia. Kamera depan digunakan."
          );
        }
      } catch (fallbackError) {
        console.error("Gagal membuka kamera fallback:", fallbackError);

        if (mountedRef.current) {
          setRunning(false);
          setCameraError(
            "Kamera tidak dapat dibuka. Pastikan browser memiliki izin kamera."
          );
        }

        try {
          scannerRef.current?.clear();
        } catch (_) {}

        scannerRef.current = null;
      }
    } finally {
      startingCameraRef.current = false;
    }
  }

  function restartCameraAfterResult() {
  setTimeout(async () => {
    if (!mountedRef.current) return;

    try {
      console.log("Membuka kamera kembali setelah hasil scan...");

      await startCamera();
    } catch (error) {
      console.error(
        "Gagal membuka kamera kembali:",
        error
      );
    }
  }, 2000);
}

  /*
   * ============================================================
   * PROCESS BARCODE
   * ============================================================
   */

  function restartCameraAfterResult() {
  setTimeout(async () => {
    if (!mountedRef.current) return;

    try {
      console.log("Membuka kamera kembali setelah hasil scan...");
      await startCamera();
    } catch (error) {
      console.error("Gagal membuka kamera kembali:", error);
    }
  }, 2000);
}
  
  
  async function processCode(decodedText) {
    /*
     * Cegah satu barcode diproses berkali-kali
     * ketika kamera membaca barcode beberapa frame.
     */
    if (processing) return;

    setProcessing(true);

    const clean = String(decodedText || "").trim();

    console.log("=================================");
    console.log("SCAN BARCODE");
    console.log("Barcode:", clean);
    console.log("Role:", profile?.role);
    console.log("Class ID:", profile?.classId);
    console.log("=================================");

    if (!clean) {
      setProcessing(false);
      return;
    }

    /*
     * Hentikan kamera sementara ketika barcode berhasil dibaca.
     */
    await stopCamera();

    try {
      /*
       * ========================================================
       * 1. CARI SISWA
       *
       * Kita hanya menggunakan query classId untuk guru.
       * Barcode dicari di JavaScript.
       *
       * Keuntungannya:
       * - tidak membutuhkan composite index
       * - lebih mudah dikontrol oleh Firestore Rules
       * ========================================================
       */

      let studentQuery;

      if (isAdmin) {
        studentQuery = query(
          collection(db, "students")
        );
      } else {
        if (!classId) {
          throw new Error(
            "Akun guru belum memiliki kelas."
          );
        }

        studentQuery = query(
          collection(db, "students"),
          where("classId", "==", classId)
        );
      }

      const studentSnap = await getDocs(studentQuery);

      console.log(
        "Jumlah siswa yang dapat dibaca:",
        studentSnap.size
      );

      let student = null;

      studentSnap.forEach((docSnap) => {
        const data = docSnap.data();

        const studentBarcode =
          data.barcode === undefined ||
          data.barcode === null
            ? ""
            : String(data.barcode).trim();

        if (studentBarcode === clean) {
          student = {
            id: docSnap.id,
            ...data,
          };
        }
      });

      /*
       * ========================================================
       * 2. BARCODE TIDAK DITEMUKAN
       * ========================================================
       */

      if (!student) {
        console.warn(
          "Barcode tidak ditemukan:",
          clean
        );

        if (mountedRef.current) {
          setResult({
            type: "error",
            title: "ABSEN GAGAL",
            message: isAdmin
              ? "Barcode siswa tidak terdaftar."
              : "Barcode tidak terdaftar pada kelas Anda.",
          });
        }

        speak("Absen gagal", false);

        restartCameraAfterResult();

        return;
      }

      console.log("Siswa ditemukan:", student);

      /*
       * ========================================================
       * 3. VALIDASI KELAS GURU
       * ========================================================
       */

      if (!isAdmin) {
        if (student.classId !== classId) {
          if (mountedRef.current) {
            setResult({
              type: "error",
              title: "ABSEN GAGAL",
              message: "Siswa bukan bagian dari kelas Anda.",
            });
          }

          speak("Absen gagal", false);

          restartCameraAfterResult();
          
          return;
        }
      }

      /*
       * ========================================================
       * 4. ID PRESENSI
       *
       * Satu siswa hanya boleh punya satu presensi per hari.
       * ========================================================
       */

      const attendanceId =
        `${date}_${student.id}`;

      const attendanceRef = doc(
        db,
        "attendance",
        attendanceId
      );

      /*
       * ========================================================
       * 5. CEK SUDAH ABSEN ATAU BELUM
       * ========================================================
       */

      const existingAttendance =
        await getDoc(attendanceRef);

      if (existingAttendance.exists()) {
        if (mountedRef.current) {
          setResult({
            type: "warning",
            title: "SUDAH ABSEN",
            message:
              `${student.name} sudah melakukan presensi hari ini.`,
            student,
          });
        }

        speak("Siswa sudah absen", false);

        restartCameraAfterResult();

        return;
      }

      /*
       * ========================================================
       * 6. SIMPAN PRESENSI
       * ========================================================
       */

      const attendanceData = {
        studentId: student.id,
        studentName: student.name || "",
        nis: student.nis || "",
        classId: student.classId || "",
        className: student.className || "",
        date,
        time: new Date().toLocaleTimeString(
          "id-ID",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        ),
        timestamp: serverTimestamp(),
        status: "Hadir",
        barcode: clean,
      };

      console.log(
        "Menyimpan attendance:",
        attendanceData
      );

      await setDoc(
        attendanceRef,
        attendanceData
      );

      /*
       * ========================================================
       * 7. BERHASIL
       * ========================================================
       */

      if (mountedRef.current) {
        setResult({
          type: "success",
          title: "ABSEN BERHASIL",
          message:
            `${student.name} berhasil melakukan presensi.`,
          student,
        });
      }

      speak("Absen berhasil", true);

      /*
       * Muat ulang daftar presensi.
       */
      await loadRecent();

      /*
 * Buka kembali kamera secara otomatis
 * setelah jeda 2 detik.
 */
      restartCameraAfterResult();

    } catch (error) {
      console.error(
        "Gagal memproses presensi:",
        error
      );

      let message =
        "Terjadi kesalahan saat menyimpan presensi.";

      if (
        error?.code ===
        "permission-denied"
      ) {
        message =
          "Akses Firestore ditolak. Periksa akun guru, kelas, dan Firestore Rules.";
      } else if (
        error?.code ===
        "unavailable"
      ) {
        message =
          "Firebase tidak dapat dihubungi. Periksa koneksi internet.";
      }

      if (mountedRef.current) {
        setResult({
          type: "error",
          title: "ABSEN GAGAL",
          message,
        });
      }

      speak("Absen gagal", false);

      restartCameraAfterResult();

    } finally {
      if (mountedRef.current) {
        setProcessing(false);
      }
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Presensi</h1>

          <p className="muted">
            {isAdmin
              ? "Scan barcode siswa"
              : `Scan barcode siswa kelas ${profile?.className || "-"}`}
          </p>
        </div>

        <div className="form-row">
          <label>
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setResult(null);
              }}
            />
          </label>
        </div>
      </div>

      <div className="attendance-grid">

        {/* =====================================================
            KAMERA
        ====================================================== */}

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Scan Barcode</h2>

              <p className="muted">
                Arahkan barcode siswa ke kamera.
              </p>
            </div>

            <ScanLine size={22} />
          </div>

          <div className="camera-wrapper">
            <div
              id={readerId}
              className="qr-reader"
            />
          </div>

          {cameraError && (
            <div className="alert alert-warning">
              <AlertCircle size={18} />

              <span>
                {cameraError}
              </span>
            </div>
          )}

          <div className="camera-actions">

            {!running ? (
              <button
                className="btn btn-primary"
                onClick={startCamera}
                disabled={processing}
              >
                <Camera size={18} />

                {processing
                  ? "Memproses..."
                  : "Buka Kamera & Mulai Absen"}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={stopCamera}
                disabled={processing}
              >
                <X size={18} />
                Tutup Kamera
              </button>
            )}

          </div>

          {processing && (
            <div className="scan-processing">
              <RefreshCw
                size={18}
                className="spin"
              />

              <span>
                Memproses barcode...
              </span>
            </div>
          )}
        </div>

        {/* =====================================================
            HASIL SCAN
        ====================================================== */}

        <div className="card">
          <div className="card-header">
            <div>
              <h2>Hasil Scan</h2>

              <p className="muted">
                Status presensi siswa
              </p>
            </div>

            <CheckCircle2 size={22} />
          </div>

          {!result && (
            <div className="empty-state">
              <ScanLine size={42} />

              <h3>
                Belum ada scan
              </h3>

              <p className="muted">
                Silakan buka kamera dan scan
                barcode siswa.
              </p>
            </div>
          )}

          {result?.type === "success" && (
            <div className="scan-result success">
              <CheckCircle2 size={54} />

              <h2>
                {result.title}
              </h2>

              <h3>
                {result.student?.name}
              </h3>

              <p>
                {result.student?.className}
              </p>

              <p className="muted">
                {result.student?.nis
                  ? `NIS: ${result.student.nis}`
                  : ""}
              </p>

              <div className="result-message">
                {result.message}
              </div>
            </div>
          )}

          {result?.type === "warning" && (
            <div className="scan-result warning">
              <AlertCircle size={54} />

              <h2>
                {result.title}
              </h2>

              <h3>
                {result.student?.name}
              </h3>

              <p>
                {result.message}
              </p>
            </div>
          )}

          {result?.type === "error" && (
            <div className="scan-result error">
              <XCircle size={54} />

              <h2>
                {result.title}
              </h2>

              <p>
                {result.message}
              </p>
            </div>
          )}

          {result && (
            <button
              className="btn btn-secondary full-width"
              onClick={() => {
                setResult(null);

                /*
                 * Kamera baru dibuka setelah
                 * pengguna siap scan berikutnya.
                 */
              }}
            >
              <ScanLine size={18} />
              Scan Lagi
            </button>
          )}
        </div>
      </div>

      {/* =======================================================
          PRESENSI TERBARU
      ======================================================== */}

      <div className="card recent-card">
        <div className="card-header">
          <div>
            <h2>
              Presensi Hari Ini
            </h2>

            <p className="muted">
              {isAdmin
                ? "Semua kelas"
                : `Kelas ${profile?.className || "-"}`}
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={loadRecent}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="empty-state">
            <Clock3 size={40} />

            <p>
              Belum ada presensi hari ini.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>NIS</th>

                  {isAdmin && (
                    <th>Kelas</th>
                  )}

                  <th>Jam</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recent.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {item.studentName || "-"}
                      </strong>
                    </td>

                    <td>
                      {item.nis || "-"}
                    </td>

                    {isAdmin && (
                      <td>
                        {item.className || "-"}
                      </td>
                    )}

                    <td>
                      {item.time || "-"}
                    </td>

                    <td>
                      <span className="status-badge hadir">
                        {item.status || "Hadir"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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