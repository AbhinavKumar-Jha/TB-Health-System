const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/pdf", express.static(__dirname));

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Dumra@847223", 
  database: "tb_health",
  waitForConnections: true,
  connectionLimit: 10
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  pool.query("SELECT * FROM users WHERE email=?", [email], async (err, rows) => {
    if (err || !rows.length) return res.json({ success: false });
    const ok = await bcrypt.compare(password, rows[0].password);
    res.json({ success: ok });
  });
});

// ... existing imports and pool setup ...

app.post("/api/diagnose", (req, res) => {
  const { name, symptoms, weeks } = req.body;
  let diagnosis = "General Illness";
  let advice = "Rest and monitor symptoms. If they persist for 1 week, see a doctor.";
  
  if (symptoms.includes("Blood in Sputum")) {
    diagnosis = "Pulmonary TB (High Risk)";
    advice = "URGENT: Immediate hospitalization and isolation required. Visit a specialist now.";
  } else if (symptoms.includes("Cough") && weeks >= 3) {
    diagnosis = "Pulmonary TB (Suspected)";
    advice = "WARNING: Visit a hospital for a chest X-ray and sputum test immediately.";
  }

  // Save to database (optional - won't fail if DB is down)
  pool.query(
    "INSERT INTO patients (name, symptoms, weeks, diagnosis) VALUES (?, ?, ?, ?)",
    [name, symptoms.join(", "), weeks, diagnosis],
    (err) => {
      if (err) {
        console.log("Database not available, continuing without saving:", err.message);
      }
    }
  );
  
  // Generate PDF regardless of database status
  const pdfFile = `report-${Date.now()}.pdf`;
  const doc = new PDFDocument();
  const stream = fs.createWriteStream(path.join(__dirname, pdfFile));
  doc.pipe(stream);
  doc.fontSize(22).text("TB DIAGNOSTIC REPORT", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(14).text(`Patient Name: ${name}`);
  doc.moveDown();
  doc.text(`Symptoms: ${symptoms.join(", ")}`);
  doc.text(`Cough Duration: ${weeks} weeks`);
  doc.moveDown();
  doc.fontSize(16).fillColor('red').text(`Diagnosis: ${diagnosis}`);
  doc.moveDown();
  doc.fontSize(12).fillColor('black').text(`Medical Advice: ${advice}`);
  doc.end();

  stream.on('finish', () => {
    console.log('PDF created:', pdfFile);
    console.log('Sending response...');
    // Send response immediately
    res.json({ success: true, diagnosis, advice, pdf: pdfFile });
  });
  
  stream.on('error', (err) => {
    console.error('PDF error:', err);
    res.status(500).json({ success: false, error: "PDF generation failed" });
  });
});

// Serve the folder so PDFs can be opened
app.use("/api/pdf", express.static(__dirname));


app.get("/api/records", (req, res) => {
  pool.query("SELECT * FROM patients ORDER BY created_at DESC", (err, rows) => res.json(rows));
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));