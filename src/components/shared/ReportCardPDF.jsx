// src/components/shared/ReportCardPDF.jsx
// Uses @react-pdf/renderer to generate printable A4 report cards
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font, pdf } from "@react-pdf/renderer";
import {
  SCHOOL_NAME, SCHOOL_TEL, SCHOOL_CIRCUIT, SCHOOL_POSTAL,
  GRADE_SCALE, calcWeightedTotal, calcSBATotal, calcGrade, ordinal,
} from "../../utils/constants";

// ── PDF Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:       { fontFamily: "Helvetica", fontSize: 9, padding: 28, color: "#1A2B22" },
  headerBar:  { backgroundColor: "#0A3D2B", padding: "8 12", marginBottom: 4 },
  headerTitle:{ color: "#fff", fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subBar:     { backgroundColor: "#1A6B45", padding: "4 12", marginBottom: 8 },
  subTitle:   { color: "#fff", fontSize: 9, textAlign: "center" },
  infoRow:    { flexDirection: "row", borderBottom: "0.5 solid #D0E8DC", paddingVertical: 3 },
  infoLabel:  { width: 100, color: "#5A7A68", fontSize: 8 },
  infoVal:    { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 8 },
  sectionHdr: { backgroundColor: "#0A3D2B", flexDirection: "row", padding: "5 8", marginTop: 6 },
  colHdr:     { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold" },
  row:        { flexDirection: "row", borderBottom: "0.5 solid #E8F5EE", padding: "3 8" },
  rowAlt:     { flexDirection: "row", borderBottom: "0.5 solid #E8F5EE", padding: "3 8", backgroundColor: "#F0FFF8" },
  cell:       { fontSize: 8 },
  gradeBadge: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  footer:     { marginTop: 10, borderTop: "1 solid #0A3D2B", paddingTop: 8 },
  footRow:    { flexDirection: "row", gap: 20, marginBottom: 6 },
  footLabel:  { fontSize: 8, color: "#5A7A68", flex: 1 },
  sigLine:    { borderBottom: "0.5 solid #D0E8DC", marginTop: 12, height: 1 },
  watermark:  { position: "absolute", top: "45%", left: "25%", opacity: 0.04, fontSize: 48, color: "#0A3D2B", transform: "rotate(-30deg)" },
});

// Column flex widths
const CW = { num: 0.3, subj: 2.2, sba: 0.7, exam: 0.7, total: 0.7, avg: 0.7, grade: 0.4, pos: 0.4, level: 2.0 };

function gradeColor(total) {
  const g = GRADE_SCALE.find(g => total >= g.min && total <= g.max);
  return g ? g.color : "#1A2B22";
}

// ── Memoized computations per report card ──
function useReportCardData(student, subjects, allMarks, studentList) {
  // Build marks map for this student
  const studentMarks = {};
  subjects.forEach(subj => {
    studentMarks[subj.code] = allMarks[subj.code]?.[student.id] || {};
  });

  // Compute overall average
  const totals = subjects
    .map(s => calcWeightedTotal(studentMarks[s.code]))
    .filter(t => t !== "");
  const overallAvg = totals.length
    ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length * 10) / 10
    : null;

  // Class position (by overall avg) — memoize the expensive sort
  const allAvgs = studentList.map(st => {
    const tots = subjects
      .map(s => calcWeightedTotal(allMarks[s.code]?.[st.id] || {}))
      .filter(t => t !== "");
    return tots.length ? tots.reduce((a, b) => a + b, 0) / tots.length : 0;
  }).sort((a, b) => b - a);

  const pos = overallAvg !== null ? allAvgs.indexOf(overallAvg) + 1 : null;

  return { studentMarks, overallAvg, pos, totals };
}

function ReportCardDocument({ student, classLabel, term, year, subjects, allMarks, studentList, vacDate, nextTermDate, schoolName }) {
  const { studentMarks, overallAvg, pos } = useReportCardData(student, subjects, allMarks, studentList);

  return (
    <Document title={`Report Card — ${student.name}`}>
      <Page size="A4" style={S.page}>
        {/* Watermark */}
        <Text style={S.watermark}>{schoolName || SCHOOL_NAME}</Text>

        {/* Header */}
        <View style={S.headerBar}>
          <Text style={S.headerTitle}>{schoolName || SCHOOL_NAME}</Text>
        </View>
        <View style={S.subBar}>
          <Text style={S.subTitle}>
            PUPILS' TERMINAL REPORT — {classLabel} — {term} {year}
          </Text>
        </View>

        {/* School info */}
        <View style={{ flexDirection: "row", marginBottom: 8, gap: 20 }}>
          <Text style={{ fontSize: 8, color: "#5A7A68" }}>Circuit: {SCHOOL_CIRCUIT}</Text>
          <Text style={{ fontSize: 8, color: "#5A7A68" }}>Tel: {SCHOOL_TEL}</Text>
          <Text style={{ fontSize: 8, color: "#5A7A68" }}>Address: {SCHOOL_POSTAL}</Text>
        </View>

        {/* Student info */}
        <View style={{ border: "0.5 solid #D0E8DC", borderRadius: 4, padding: 8, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", gap: 40, flexWrap: "wrap" }}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Student Name:</Text>
              <Text style={{ ...S.infoVal, textTransform: "uppercase", color: "#0A3D2B" }}>{student.name}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Class:</Text>
              <Text style={S.infoVal}>{classLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 40, marginTop: 4, flexWrap: "wrap" }}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Overall Average:</Text>
              <Text style={{ ...S.infoVal, color: "#0A3D2B", fontSize: 10 }}>
                {overallAvg !== null ? `${overallAvg} / 100` : "—"}
              </Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Position:</Text>
              <Text style={{ ...S.infoVal, color: "#1A6B45" }}>
                {pos ? `${ordinal(pos)} out of ${studentList.length}` : "—"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 40, marginTop: 4, flexWrap: "wrap" }}>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Vacation:</Text>
              <Text style={S.infoVal}>{vacDate}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={S.infoLabel}>Next Term:</Text>
              <Text style={S.infoVal}>{nextTermDate}</Text>
            </View>
          </View>
        </View>

        {/* Subject table header */}
        <View style={S.sectionHdr}>
          <Text style={{ ...S.colHdr, flex: CW.num }}>#</Text>
          <Text style={{ ...S.colHdr, flex: CW.subj }}>Subject</Text>
          <Text style={{ ...S.colHdr, flex: CW.sba, textAlign: "center" }}>SBA /50</Text>
          <Text style={{ ...S.colHdr, flex: CW.exam, textAlign: "center" }}>Exam /50</Text>
          <Text style={{ ...S.colHdr, flex: CW.total, textAlign: "center" }}>Total /100</Text>
          <Text style={{ ...S.colHdr, flex: CW.avg, textAlign: "center" }}>Cls Avg</Text>
          <Text style={{ ...S.colHdr, flex: CW.grade, textAlign: "center" }}>Grd</Text>
          <Text style={{ ...S.colHdr, flex: CW.pos, textAlign: "center" }}>Pos</Text>
          <Text style={{ ...S.colHdr, flex: CW.level }}>Level of Proficiency</Text>
        </View>

        {/* Subject rows */}
        {subjects.map((subj, idx) => {
          const m         = studentMarks[subj.code];
          const sba       = calcSBATotal(m);
          const tot       = calcWeightedTotal(m);
          const sbaPct    = sba !== "" ? Math.round(sba / 100 * 50 * 10) / 10 : "—";
          const examPct   = m.ex !== "" && m.ex !== undefined ? Math.round(Number(m.ex) / 100 * 50 * 10) / 10 : "—";
          const grade     = calcGrade(tot);

          // Class average for this subject — computed once per subject
          const subjTotals = studentList
            .map(st => calcWeightedTotal(allMarks[subj.code]?.[st.id] || {}))
            .filter(t => t !== "");
          const subjAvg = subjTotals.length
            ? Math.round(subjTotals.reduce((a, b) => a + b, 0) / subjTotals.length * 10) / 10
            : null;

          // Subject position
          const sorted = [...subjTotals].sort((a, b) => b - a);
          const subjPos = tot !== "" ? sorted.indexOf(Number(tot)) + 1 : null;

          const rowStyle = idx % 2 === 0 ? S.row : S.rowAlt;

          return (
            <View key={subj.code} style={rowStyle}>
              <Text style={{ ...S.cell, flex: CW.num }}>{idx + 1}</Text>
              <Text style={{ ...S.cell, flex: CW.subj }}>{subj.name}</Text>
              <Text style={{ ...S.cell, flex: CW.sba, textAlign: "center" }}>{sbaPct}</Text>
              <Text style={{ ...S.cell, flex: CW.exam, textAlign: "center" }}>{examPct}</Text>
              <Text style={{
                ...S.cell, flex: CW.total, textAlign: "center", fontFamily: "Helvetica-Bold",
                color: tot !== "" ? gradeColor(tot) : "#1A2B22"
              }}>
                {tot !== "" ? tot : "—"}
              </Text>
              <Text style={{ ...S.cell, flex: CW.avg, textAlign: "center", color: "#5A7A68" }}>
                {subjAvg !== null ? subjAvg : "—"}
              </Text>
              <Text style={{
                ...S.gradeBadge, flex: CW.grade, textAlign: "center",
                color: grade ? grade.color : "#1A2B22"
              }}>
                {grade ? grade.grade : "—"}
              </Text>
              <Text style={{ ...S.cell, flex: CW.pos, textAlign: "center", color: "#5A7A68" }}>
                {subjPos ? ordinal(subjPos) : "—"}
              </Text>
              <Text style={{
                ...S.cell, flex: CW.level,
                color: grade ? grade.color : "#5A7A68", fontSize: 7.5
              }}>
                {grade ? `${grade.level} (${grade.remark})` : "—"}
              </Text>
            </View>
          );
        })}

        {/* Conduct / Attendance */}
        <View style={{ marginTop: 10, border: "0.5 solid #D0E8DC", borderRadius: 4, padding: 8 }}>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68", marginBottom: 2 }}>Attendance</Text>
              <Text style={{ fontSize: 8 }}>______ days out of ______ days</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68", marginBottom: 2 }}>Conduct / Character</Text>
              <Text style={{ fontSize: 8 }}>__________________________________</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68", marginBottom: 2 }}>Talent / Interest</Text>
              <Text style={{ fontSize: 8 }}>__________________________________</Text>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 8, color: "#5A7A68", marginBottom: 2 }}>Class Teacher's Remark</Text>
            <Text style={{ fontSize: 8 }}>______________________________________________________________________________</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={S.footer}>
          <View style={{ flexDirection: "row", gap: 30 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68" }}>Class Teacher's Signature</Text>
              <View style={S.sigLine} />
              <Text style={{ fontSize: 7.5, color: "#5A7A68", marginTop: 3 }}>Date: {vacDate}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68" }}>Head Teacher's Signature</Text>
              <View style={S.sigLine} />
              <Text style={{ fontSize: 7.5, color: "#5A7A68", marginTop: 3 }}>Date: {vacDate}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 8, color: "#5A7A68" }}>Parent / Guardian's Signature</Text>
              <View style={S.sigLine} />
              <Text style={{ fontSize: 7.5, color: "#5A7A68", marginTop: 3 }}>Date: ___________</Text>
            </View>
          </View>
        </View>

        {/* Footer note */}
        <View style={{ marginTop: 8, backgroundColor: "#E8F5EE", padding: "4 8", borderRadius: 3 }}>
          <Text style={{ fontSize: 7, color: "#1A6B45", textAlign: "center" }}>
            Ghana Education Service · {schoolName || SCHOOL_NAME} · {SCHOOL_CIRCUIT} Circuit
          </Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Download button wrapper ────────────────────────────────────────────────────
export function ReportCardDownloadBtn({
  student, classLabel, term, year, subjects, allMarks,
  studentList, vacDate, nextTermDate, schoolName,
  onStart, onEnd,
}) {
  return (
    <PDFDownloadLink
      document={
        <ReportCardDocument
          student={student}
          classLabel={classLabel}
          term={term}
          year={year}
          subjects={subjects}
          allMarks={allMarks}
          studentList={studentList}
          vacDate={vacDate}
          nextTermDate={nextTermDate}
          schoolName={schoolName}
        />
      }
      fileName={`ReportCard_${student.name.replace(/\s+/g, "_")}_${classLabel.replace(/\s+/g, "_")}.pdf`}
    >
      {({ loading, error }) => {
        // Notify parent of loading state changes
        if (loading && onStart) onStart();
        if (!loading && onEnd) onEnd();

        return (
          <button className="btn btn-gold btn-sm" disabled={loading}>
            {loading ? "Preparing…" : error ? "⚠ Error" : "⬇ Download PDF"}
          </button>
        );
      }}
    </PDFDownloadLink>
  );
}

// ── Batch PDF generator (for "Download All") ─────────────────────────────────
export async function generateBatchPDFs({
  students, classLabel, term, year, subjects, allMarks,
  studentList, vacDate, nextTermDate, schoolName,
  onProgress,
}) {
  const results = [];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    try {
      const blob = await pdf(
        <ReportCardDocument
          student={student}
          classLabel={classLabel}
          term={term}
          year={year}
          subjects={subjects}
          allMarks={allMarks}
          studentList={studentList}
          vacDate={vacDate}
          nextTermDate={nextTermDate}
          schoolName={schoolName}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ReportCard_${student.name.replace(/\s+/g, "_")}_${classLabel.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      results.push({ student: student.name, success: true });
      onProgress?.(i + 1, students.length);

      // Small delay to prevent browser download blocking
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`Failed to generate PDF for ${student.name}:`, err);
      results.push({ student: student.name, success: false, error: err.message });
    }
  }

  return results;
}

export default ReportCardDocument;
