const PDFDocument = require("pdfkit");
const fs = require("fs");

function generatePDF(patient) {
  const fileName = `report-${patient.name}.pdf`;
  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(fileName));

  doc.fontSize(20).text("TB Clinical Diagnosis Report", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Patient Name: ${patient.name}`);
  doc.text(`Diagnosis: ${patient.diagnosis}`);
  doc.text(`Symptoms: ${patient.symptoms}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);

  doc.end();
}

module.exports = generatePDF;
