package com.example.nptel_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class StudentService {

    private final JdbcTemplate jdbc;

    @Autowired
    public StudentService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ── Available courses (not already enrolled) ──────────────
    public List<Map<String, Object>> getAvailableCourses(String learnerId) {
        return jdbc.queryForList(
            "SELECT c.course_id, c.course_name, d.discipline_name, " +
            "       c.duration_weeks, c.credits, c.exam_date " +
            "FROM Courses c " +
            "JOIN Disciplines d ON c.discipline_id = d.discipline_id " +
            "WHERE c.course_id NOT IN ( " +
            "    SELECT course_id FROM Enrollments WHERE learner_id = ? " +
            ") ORDER BY c.course_id",
            learnerId);
    }

    // ── Enroll in course (free enrollment; exam fee paid separately) ──
    public Map<String, Object> enroll(String learnerId, String courseId) {
        Map<String, Object> resp = new HashMap<>();
        try {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Enrollments WHERE learner_id=? AND course_id=?",
                Integer.class, learnerId, courseId);
            if (count != null && count > 0) {
                resp.put("success", false);
                resp.put("message", "Already enrolled in this course.");
                return resp;
            }
            String newId = "ENR_" + System.currentTimeMillis() % 100000;
            jdbc.update(
                "INSERT INTO Enrollments (enrollment_id, learner_id, course_id) VALUES (?,?,?)",
                newId, learnerId, courseId);
            resp.put("success", true);
            resp.put("message", "Enrolled successfully! Register for exam to appear in proctored exam.");
            resp.put("enrollmentId", newId);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    // ── My enrolled courses ───────────────────────────────────
    public List<Map<String, Object>> getMyCourses(String learnerId) {
        return jdbc.queryForList(
            "SELECT e.enrollment_id, c.course_id, c.course_name, d.discipline_name, " +
            "       e.status, e.enrollment_date, c.exam_date " +
            "FROM Enrollments e " +
            "JOIN Courses c     ON e.course_id    = c.course_id " +
            "JOIN Disciplines d ON c.discipline_id = d.discipline_id " +
            "WHERE e.learner_id = ? ORDER BY e.enrollment_date DESC",
            learnerId);
    }

    // ── Assignments for an enrollment ─────────────────────────
    public List<Map<String, Object>> getAssignments(String enrollmentId) {
        return jdbc.queryForList(
            "SELECT wa.assignment_id, wa.week_number, wa.max_marks, wa.deadline, " +
            "       s.submission_id, s.marks_obtained " +
            "FROM Enrollments e " +
            "JOIN Weekly_Assignments wa ON wa.course_id = e.course_id " +
            "LEFT JOIN Assignment_Submissions s " +
            "       ON s.assignment_id = wa.assignment_id " +
            "      AND s.learner_id    = e.learner_id " +
            "WHERE e.enrollment_id = ? " +
            "ORDER BY wa.week_number",
            enrollmentId);
    }

    // ── Submit assignment ─────────────────────────────────────
    public Map<String, Object> submitAssignment(String learnerId, String assignmentId, int marks) {
        Map<String, Object> resp = new HashMap<>();
        try {
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Assignment_Submissions " +
                "WHERE learner_id=? AND assignment_id=?",
                Integer.class, learnerId, assignmentId);
            if (count != null && count > 0) {
                resp.put("success", false);
                resp.put("message", "Assignment already submitted.");
                return resp;
            }
            Integer maxMarks = jdbc.queryForObject(
                "SELECT max_marks FROM Weekly_Assignments WHERE assignment_id=?",
                Integer.class, assignmentId);
            if (maxMarks != null && marks > maxMarks) {
                resp.put("success", false);
                resp.put("message", "Marks exceed maximum (" + maxMarks + ").");
                return resp;
            }
            String subId = "SUB_" + System.currentTimeMillis() % 100000;
            jdbc.update(
                "INSERT INTO Assignment_Submissions " +
                "(submission_id, learner_id, assignment_id, marks_obtained) VALUES (?,?,?,?)",
                subId, learnerId, assignmentId, marks);
            resp.put("success", true);
            resp.put("message", "Submitted! Marks: " + marks);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    // ── My results ────────────────────────────────────────────
    public List<Map<String, Object>> getMyResults(String learnerId) {
        return jdbc.queryForList(
            "SELECT r.result_id, c.course_name, " +
            "       r.assignment_score, r.proctored_exam_score, r.final_score, " +
            "       NVL(r.grade,'—') AS grade " +
            "FROM Results r " +
            "JOIN Enrollments e ON r.enrollment_id = e.enrollment_id " +
            "JOIN Courses c     ON e.course_id      = c.course_id " +
            "WHERE e.learner_id = ? ORDER BY r.result_id",
            learnerId);
    }

    // ── My certificates ───────────────────────────────────────
    public List<Map<String, Object>> getMyCertificates(String learnerId) {
        return jdbc.queryForList(
            "SELECT cert.certificate_id, c.course_name, " +
            "       cert.certificate_type, cert.issue_date, " +
            "       r.final_score, NVL(r.grade,'—') AS grade " +
            "FROM Certificates cert " +
            "JOIN Results r     ON cert.result_id    = r.result_id " +
            "JOIN Enrollments e ON r.enrollment_id   = e.enrollment_id " +
            "JOIN Courses c     ON e.course_id        = c.course_id " +
            "WHERE e.learner_id = ? ORDER BY cert.issue_date DESC",
            learnerId);
    }

    // ── Certificate data for download ─────────────────────────
    public Map<String, Object> getCertificateData(String certId) {
        Map<String, Object> resp = new HashMap<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT cert.certificate_id, cert.certificate_type, cert.issue_date, " +
                "       l.full_name AS learner_name, c.course_name, " +
                "       d.discipline_name, r.final_score, NVL(r.grade,'—') AS grade, " +
                "       i.institution_name AS instructor_institution " +
                "FROM Certificates cert " +
                "JOIN Results r      ON cert.result_id    = r.result_id " +
                "JOIN Enrollments e  ON r.enrollment_id   = e.enrollment_id " +
                "JOIN Learners l     ON e.learner_id       = l.learner_id " +
                "JOIN Courses c      ON e.course_id        = c.course_id " +
                "JOIN Disciplines d  ON c.discipline_id    = d.discipline_id " +
                "LEFT JOIN Course_Instructors ci ON ci.course_id = c.course_id " +
                "LEFT JOIN Instructors ins ON ci.instructor_id = ins.instructor_id " +
                "LEFT JOIN Institutions i  ON ins.institution_id = i.institution_id " +
                "WHERE cert.certificate_id = ? AND ROWNUM = 1",
                certId);
            if (rows.isEmpty()) {
                resp.put("success", false);
                resp.put("message", "Certificate not found.");
            } else {
                resp.put("success", true);
                resp.putAll(rows.get(0));
            }
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    // ── File grievance ────────────────────────────────────────
    public Map<String, Object> fileGrievance(String learnerId, String courseId,
                                              String issueType, String description) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String gId = "GRV_" + System.currentTimeMillis() % 100000;
            jdbc.update(
                "INSERT INTO Grievances (grievance_id, learner_id, course_id, " +
                "issue_type, description) VALUES (?,?,?,?,?)",
                gId, learnerId, courseId, issueType, description);
            resp.put("success", true);
            resp.put("message", "Grievance filed. ID: " + gId);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    // ── My grievances ─────────────────────────────────────────
    public List<Map<String, Object>> getMyGrievances(String learnerId) {
        return jdbc.queryForList(
            "SELECT g.grievance_id, c.course_name, g.issue_type, " +
            "       g.description, g.status, g.filed_date " +
            "FROM Grievances g " +
            "JOIN Courses c ON g.course_id = c.course_id " +
            "WHERE g.learner_id = ? ORDER BY g.filed_date DESC",
            learnerId);
    }

    // ═══════════════════════════════════════════════════════════
    //  EXAM REGISTRATION & PAYMENT FLOW
    // ═══════════════════════════════════════════════════════════

    /**
     * GET /api/student/exam-registrations?learnerId=L001
     * Returns exam registration status for each enrollment.
     */
    public List<Map<String, Object>> getExamRegistrations(String learnerId) {
        return jdbc.queryForList(
            "SELECT e.enrollment_id, c.course_name, " +
            "       er.registration_id, er.fee_amount, er.status AS reg_status, " +
            "       er.exam_city_pref_1, er.exam_city_pref_2, " +
            "       p.transaction_id, p.amount_paid, p.payment_status " +
            "FROM Enrollments e " +
            "JOIN Courses c ON e.course_id = c.course_id " +
            "LEFT JOIN Exam_Registrations er ON er.enrollment_id = e.enrollment_id " +
            "LEFT JOIN Payments p ON p.registration_id = er.registration_id " +
            "WHERE e.learner_id = ? " +
            "ORDER BY e.enrollment_date DESC",
            learnerId);
    }

    /**
     * POST /api/student/register-exam
     * Body: { learnerId, enrollmentId, cityPref1, cityPref2 }
     * Creates Exam_Registration; trigger sets fee (SC/ST=500, others=1000).
     */
    public Map<String, Object> registerForExam(String learnerId, String enrollmentId,
                                                String cityPref1, String cityPref2) {
        Map<String, Object> resp = new HashMap<>();
        try {
            // Verify enrollment belongs to this learner
            Integer valid = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Enrollments WHERE enrollment_id=? AND learner_id=?",
                Integer.class, enrollmentId, learnerId);
            if (valid == null || valid == 0) {
                resp.put("success", false);
                resp.put("message", "Invalid enrollment.");
                return resp;
            }
            // Check not already registered
            Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Exam_Registrations WHERE enrollment_id=?",
                Integer.class, enrollmentId);
            if (dup != null && dup > 0) {
                resp.put("success", false);
                resp.put("message", "Already registered for exam for this course.");
                return resp;
            }
            String regId = "EREG_" + System.currentTimeMillis() % 100000;
            // Insert — trigger trg_calc_exam_fee will set fee_amount automatically
            jdbc.update(
                "INSERT INTO Exam_Registrations " +
                "(registration_id, enrollment_id, exam_city_pref_1, exam_city_pref_2) " +
                "VALUES (?,?,?,?)",
                regId, enrollmentId, cityPref1, cityPref2);

            // Fetch the fee set by trigger
            Double fee = jdbc.queryForObject(
                "SELECT fee_amount FROM Exam_Registrations WHERE registration_id=?",
                Double.class, regId);

            resp.put("success", true);
            resp.put("registrationId", regId);
            resp.put("feeAmount", fee);
            resp.put("message", "Exam registered. Fee: ₹" + (fee != null ? fee.intValue() : 1000) +
                                 ". Please complete payment to confirm your seat.");
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    /**
     * POST /api/student/pay-exam-fee
     * Body: { registrationId, amountPaid }
     * Creates Payment record; trigger trg_update_reg_status sets reg status to SUCCESSFUL.
     */
    public Map<String, Object> payExamFee(String registrationId, double amountPaid) {
        Map<String, Object> resp = new HashMap<>();
        try {
            // Verify registration exists and is PENDING
            List<Map<String, Object>> regs = jdbc.queryForList(
                "SELECT fee_amount, status FROM Exam_Registrations WHERE registration_id=?",
                registrationId);
            if (regs.isEmpty()) {
                resp.put("success", false);
                resp.put("message", "Registration not found.");
                return resp;
            }
            String status = (String) regs.get(0).get("STATUS");
            if ("SUCCESSFUL".equals(status)) {
                resp.put("success", false);
                resp.put("message", "Payment already completed for this registration.");
                return resp;
            }
            // Check existing payment
            Integer paid = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Payments WHERE registration_id=?",
                Integer.class, registrationId);
            if (paid != null && paid > 0) {
                resp.put("success", false);
                resp.put("message", "Payment record already exists.");
                return resp;
            }

            String txnId = "TXN_" + System.currentTimeMillis() % 1000000;
            // Determine payment status: success if amount matches fee
            Object feeObj = regs.get(0).get("FEE_AMOUNT");
            double fee = feeObj != null ? ((Number) feeObj).doubleValue() : 1000.0;
            String payStatus = (amountPaid >= fee) ? "SUCCESS" : "FAILED";

            jdbc.update(
                "INSERT INTO Payments (transaction_id, registration_id, amount_paid, payment_status) " +
                "VALUES (?,?,?,?)",
                txnId, registrationId, amountPaid, payStatus);

            resp.put("success", "SUCCESS".equals(payStatus));
            resp.put("transactionId", txnId);
            resp.put("paymentStatus", payStatus);
            resp.put("message", "SUCCESS".equals(payStatus)
                ? "Payment successful! Transaction ID: " + txnId + ". Your exam seat is confirmed."
                : "Payment failed. Amount paid (₹" + (int) amountPaid + ") is less than required fee (₹" + (int) fee + ").");
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }
}