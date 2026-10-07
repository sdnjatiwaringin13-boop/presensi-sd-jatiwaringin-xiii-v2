import React, { useEffect, useRef, useState } from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { Html5Qrcode } from "html5-qrcode";

import {
  Camera,
  CheckCircle2,
  XCircle,
  ScanLine,
  RefreshCw,
  X,
  AlertCircle,
  Clock3,
} from "lucide-react";

import { db } from "../firebase";


export default function Presensi({ profile }) {
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

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
   * ==========================================================
   * CLEANUP
   * ==========================================================
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
   * ==========================================================
   * SUARA
   * ==========================================================
   */

  function speak(text, good = true) {
    try {
      if (!("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.lang = "id-ID";
      utterance.rate = 0.95;
      utterance.pitch = good ? 1.05 : 0.9;

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn("Speech error:", error);
    }
  }


  /*
   * ==========================================================
   * LOAD PRESENSI TERBARU
   * ==========================================================
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
      console.error(
        "Gagal memuat presensi terbaru:",
        error
      );

      if (mountedRef.current) {
        setRecent([]);
      }
    }
  }


  useEffect(() => {
    loadRecent();
  }, [date, classId, isAdmin]);


  /*
   * ==========================================================
   * STOP CAMERA
   * ==========================================================
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
      console.warn(
        "Kamera sudah berhenti:",
        error
      );
    }

    try {
      scanner.clear();
    } catch (error) {
      console.warn(
        "Camera clear warning:",
        error
      );
    }

    if (mountedRef.current) {
      setRunning(false);
    }
  }


  /*
   * ==========================================================
   * START CAMERA
   * ==========================================================
   */

  async function startCamera() {
    if (startingCameraRef.current) return;
    if (running) return;

    startingCameraRef.current = true;

    setCameraError("");

    try {
      if (scannerRef.current) {
        await stopCamera();
      }

      const readerElement =
        document.getElementById(readerId);

      if (!readerElement) {
        throw new Error(
          "Area kamera belum siap."
        );
      }

      readerElement.innerHTML = "";

      const scanner =
        new Html5Qrcode(readerId);

      scannerRef.current = scanner;

      /*
       * Prioritas kamera belakang
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
        () => {}
      );

      if (mountedRef.current) {
        setRunning(true);
      }

    } catch (error) {
      console.error(
        "Gagal membuka kamera:",
        error
      );

      /*
       * ======================================================
       * FALLBACK KAMERA DEPAN
       * ======================================================
       */

      try {
        const oldScanner =
          scannerRef.current;

        if (oldScanner) {
          try {
            await oldScanner.stop();
          } catch (_) {}

          try {
            oldScanner.clear();
          } catch (_) {}
        }

        scannerRef.current = null;

        const readerElement =
          document.getElementById(readerId);

        if (!readerElement) {
          throw error;
        }

        readerElement.innerHTML = "";

        const fallbackScanner =
          new Html5Qrcode(readerId);

        scannerRef.current =
          fallbackScanner;

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
        console.error(
          "Gagal membuka kamera fallback:",
          fallbackError
        );

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


  /*
   * ==========================================================
   * BUKA KAMERA OTOMATIS SETELAH HASIL SCAN
   * ==========================================================
   */

  function restartCameraAfterResult() {
    setTimeout(async () => {
      if (!mountedRef.current) return;

      try {
        console.log(
          "Membuka kamera kembali setelah hasil scan..."
        );

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
   * ==========================================================
   * PROSES BARCODE
   * ==========================================================
   */

  async function processCode(decodedText) {
    if (processing) return;

    setProcessing(true);

    const clean =
      String(decodedText || "").trim();

    console.log(
      "================================="
    );

    console.log("SCAN BARCODE");
    console.log("Barcode:", clean);
    console.log("Role:", profile?.role);
    console.log("Class ID:", profile?.classId);

    console.log(
      "================================="
    );

    if (!clean) {
      setProcessing(false);
      return;
    }

    /*
     * Kamera dihentikan saat barcode mulai diproses.
     */
    await stopCamera();

    try {
      let studentQuery;

      /*
       * ======================================================
       * ADMIN
       * ======================================================
       */

      if (isAdmin) {
        studentQuery = query(
          collection(db, "students")
        );

      } else {

        /*
         * ====================================================
         * GURU
         * ====================================================
         */

        if (!classId) {
          throw new Error(
            "Akun guru belum memiliki kelas."
          );
        }

        studentQuery = query(
          collection(db, "students"),
          where(
            "classId",
            "==",
            classId
          )
        );
      }

      const studentSnap =
        await getDocs(studentQuery);

      console.log(
        "Jumlah siswa yang dapat dibaca:",
        studentSnap.size
      );

      let student = null;

      studentSnap.forEach((docSnap) => {
        const data =
          docSnap.data();

        const studentBarcode =
          data.barcode === undefined ||
          data.barcode === null
            ? ""
            : String(
                data.barcode
              ).trim();

        if (
          studentBarcode === clean
        ) {
          student = {
            id: docSnap.id,
            ...data,
          };
        }
      });


      /*
       * ======================================================
       * BARCODE TIDAK DITEMUKAN
       * ======================================================
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

        speak(
          "Absen gagal",
          false
        );

        restartCameraAfterResult();

        return;
      }


      console.log(
        "Siswa ditemukan:",
        student
      );


      /*
       * ======================================================
       * VALIDASI KELAS GURU
       * ======================================================
       */

      if (!isAdmin) {
        if (
          student.classId !== classId
        ) {
          if (mountedRef.current) {
            setResult({
              type: "error",
              title: "ABSEN GAGAL",
              message:
                "Siswa bukan bagian dari kelas Anda.",
            });
          }

          speak(
            "Absen gagal",
            false
          );

          restartCameraAfterResult();

          return;
        }
      }


      /*
       * ======================================================
       * ID PRESENSI
       * ======================================================
       *
       * Satu siswa hanya boleh memiliki
       * satu presensi per tanggal.
       */

      const attendanceId =
        `${date}_${student.id}`;

      const attendanceRef =
        doc(
          db,
          "attendance",
          attendanceId
        );


      /*
       * ======================================================
       * CEK SUDAH ABSEN
       * ======================================================
       */

      const existingAttendance =
        await getDoc(
          attendanceRef
        );

      if (
        existingAttendance.exists()
      ) {
        if (mountedRef.current) {
          setResult({
            type: "warning",
            title: "SUDAH ABSEN",
            message:
              `${student.name} sudah melakukan presensi hari ini.`,
            student,
          });
        }

        speak(
          "Siswa sudah absen",
          false
        );

        restartCameraAfterResult();

        return;
      }


      /*
       * ======================================================
       * DATA PRESENSI
       * ======================================================
       */

      const attendanceData = {
        studentId:
          student.id,

        studentName:
          student.name || "",

        nis:
          student.nis || "",

        classId:
          student.classId || "",

        className:
          student.className || "",

        date,

        time:
          new Date().toLocaleTimeString(
            "id-ID",
            {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          ),

        timestamp:
          serverTimestamp(),

        status:
          "Hadir",

        barcode:
          clean,
      };


      console.log(
        "Menyimpan attendance:",
        attendanceData
      );


      /*
       * ======================================================
       * SIMPAN KE FIRESTORE
       * ======================================================
       */

      await setDoc(
        attendanceRef,
        attendanceData
      );


      /*
       * ======================================================
       * HASIL BERHASIL
       * ======================================================
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

      speak(
        "Absen berhasil",
        true
      );


      /*
       * Refresh tabel presensi
       */

      await loadRecent();


      /*
       * Kamera otomatis dibuka kembali
       * setelah 2 detik.
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


      speak(
        "Absen gagal",
        false
      );

      restartCameraAfterResult();

    } finally {

      if (mountedRef.current) {
        setProcessing(false);
      }
    }
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="page">

      <div className="page-header">

        <div>

          <h1>
            Presensi
          </h1>

          <p className="muted">
            {isAdmin
              ? "Scan barcode siswa"
              : `Scan barcode siswa kelas ${
                  profile?.className || "-"
                }`}
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


        {/* =================================================
            KAMERA
        ================================================== */}

        <div className="card">

          <div className="card-header">

            <div>

              <h2>
                Scan Barcode
              </h2>

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


        {/* =================================================
            HASIL SCAN
        ================================================== */}

        <div className="card">

          <div className="card-header">

            <div>

              <h2>
                Hasil Scan
              </h2>

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
              }}
            >

              <ScanLine size={18} />

              Scan Lagi

            </button>

          )}

        </div>

      </div>


      {/* ===================================================
          PRESENSI TERBARU
      ==================================================== */}

      <div className="card recent-card">

        <div className="card-header">

          <div>

            <h2>
              Presensi Hari Ini
            </h2>

            <p className="muted">

              {isAdmin
                ? "Semua kelas"
                : `Kelas ${
                    profile?.className || "-"
                  }`}

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

                  <th>
                    No
                  </th>

                  <th>
                    Nama
                  </th>

                  <th>
                    NIS
                  </th>

                  {isAdmin && (
                    <th>
                      Kelas
                    </th>
                  )}

                  <th>
                    Jam
                  </th>

                  <th>
                    Status
                  </th>

                </tr>

              </thead>


              <tbody>

                {recent.map(
                  (item, index) => (

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

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}