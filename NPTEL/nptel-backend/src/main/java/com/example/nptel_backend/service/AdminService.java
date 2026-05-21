package com.example.nptel_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AdminService {

    private final JdbcTemplate jdbc;

    @Autowired
    public AdminService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ─── VIEW DATA ────────────────────────────────────────────

    public List<Map<String, Object>> getAllLearners() {
        return jdbc.queryForList(
            "SELECT learner_id, full_name, email, phone, " +
            "       category, education_level, registration_date " +
            "FROM Learners ORDER BY learner_id");
    }

    public List<Map<String, Object>> getAllCourses() {
        return jdbc.queryForList(
            "SELECT c.course_id, c.course_name, d.discipline_name, " +
            "       c.duration_weeks, c.credits, c.exam_date " +
            "FROM Courses c " +
            "JOIN Disciplines d ON c.discipline_id = d.discipline_id " +
            "ORDER BY c.course_id");
    }

    public List<Map<String, Object>> getAllInstructors() {
        return jdbc.queryForList(
            "SELECT i.instructor_id, i.full_name, i.email, i.designation, " +
            "       inst.institution_name, inst.city " +
            "FROM Instructors i " +
            "JOIN Institutions inst ON i.institution_id = inst.institution_id " +
            "ORDER BY i.instructor_id");
    }

    public List<Map<String, Object>> getAllEnrollments() {
        return jdbc.queryForList(
            "SELECT e.enrollment_id, l.full_name AS learner_name, " +
            "       c.course_name, e.status, e.enrollment_date " +
            "FROM Enrollments e " +
            "JOIN Learners l ON e.learner_id = l.learner_id " +
            "JOIN Courses  c ON e.course_id  = c.course_id " +
            "ORDER BY e.enrollment_id");
    }

    public List<Map<String, Object>> getAllResults() {
        return jdbc.queryForList(
            "SELECT r.result_id, l.full_name AS learner_name, c.course_name, " +
            "       r.assignment_score, r.proctored_exam_score, r.final_score, r.grade " +
            "FROM Results r " +
            "JOIN Enrollments e ON r.enrollment_id = e.enrollment_id " +
            "JOIN Learners l    ON e.learner_id     = l.learner_id " +
            "JOIN Courses  c    ON e.course_id      = c.course_id " +
            "ORDER BY r.final_score DESC");
    }

    public List<Map<String, Object>> getAllCertificates() {
        return jdbc.queryForList(
            "SELECT cert.certificate_id, l.full_name AS learner_name, " +
            "       c.course_name, cert.certificate_type, cert.issue_date " +
            "FROM Certificates cert " +
            "JOIN Results r     ON cert.result_id    = r.result_id " +
            "JOIN Enrollments e ON r.enrollment_id   = e.enrollment_id " +
            "JOIN Learners l    ON e.learner_id       = l.learner_id " +
            "JOIN Courses  c    ON e.course_id        = c.course_id " +
            "ORDER BY cert.issue_date DESC");
    }

    public List<Map<String, Object>> getAllPayments() {
        return jdbc.queryForList(
            "SELECT p.transaction_id, l.full_name AS learner_name, " +
            "       c.course_name, p.amount_paid, p.payment_status, p.payment_date " +
            "FROM Payments p " +
            "JOIN Exam_Registrations er ON p.registration_id = er.registration_id " +
            "JOIN Enrollments e          ON er.enrollment_id  = e.enrollment_id " +
            "JOIN Learners l             ON e.learner_id       = l.learner_id " +
            "JOIN Courses  c             ON e.course_id        = c.course_id " +
            "ORDER BY p.payment_date DESC");
    }

    public List<Map<String, Object>> getAllGrievances() {
        return jdbc.queryForList(
            "SELECT g.grievance_id, l.full_name AS learner_name, c.course_name, " +
            "       g.issue_type, g.status, g.filed_date " +
            "FROM Grievances g " +
            "JOIN Learners l ON g.learner_id = l.learner_id " +
            "JOIN Courses  c ON g.course_id  = c.course_id " +
            "ORDER BY g.filed_date DESC");
    }

    // ─── PROFESSOR REGISTRATION REQUESTS ─────────────────────
    // Students now register directly — only professors go through approval.

    public List<Map<String, Object>> getPendingRequests() {
        return jdbc.queryForList(
            "SELECT request_id, full_name, email, phone, role, " +
            "       institution_id, designation, requested_at " +
            "FROM Registration_Requests WHERE status = 'PENDING' " +
            "ORDER BY requested_at");
    }

    /**
     * Approve a PROFESSOR registration request.
     * Creates Instructors row + Users row, then marks request APPROVED.
     */
    public Map<String, Object> approveRequest(String requestId) {
        Map<String, Object> resp = new HashMap<>();
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT * FROM Registration_Requests WHERE request_id = ?", requestId);
            if (rows.isEmpty()) {
                resp.put("success", false);
                resp.put("message", "Request not found.");
                return resp;
            }

            Map<String, Object> req = rows.get(0);
            String role  = (String) req.get("ROLE");
            String email = (String) req.get("EMAIL");
            String name  = (String) req.get("FULL_NAME");
            String phone = (String) req.get("PHONE");
            String pwd   = (String) req.get("PASSWORD_HASH");
            String ts    = String.valueOf(System.currentTimeMillis() % 100000);

            if ("PROFESSOR".equals(role)) {
                String insId  = "INS" + ts;
                String instId = (String) req.get("INSTITUTION_ID");
                String desig  = (String) req.get("DESIGNATION");

                jdbc.update(
                    "INSERT INTO Instructors " +
                    "(instructor_id, full_name, email, institution_id, designation) " +
                    "VALUES (?,?,?,?,?)",
                    insId, name, email, instId, desig);

                String userId = "USR_" + insId;
                jdbc.update(
                    "INSERT INTO Users (user_id, email, password_hash, role, ref_id) " +
                    "VALUES (?,?,?,?,?)",
                    userId, email, pwd, "PROFESSOR", insId);

                resp.put("refId", insId);
                resp.put("message", "Professor account created for " + name +
                                    ". Instructor ID: " + insId);
            } else {
                // Safeguard — students no longer go through this flow
                resp.put("success", false);
                resp.put("message", "Only professor requests are approved here. " +
                                    "Students register directly.");
                return resp;
            }

            jdbc.update(
                "UPDATE Registration_Requests " +
                "SET status='APPROVED', reviewed_at=CURRENT_TIMESTAMP " +
                "WHERE request_id = ?", requestId);

            resp.put("success", true);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    public Map<String, Object> rejectRequest(String requestId) {
        Map<String, Object> resp = new HashMap<>();
        try {
            jdbc.update(
                "UPDATE Registration_Requests " +
                "SET status='REJECTED', reviewed_at=CURRENT_TIMESTAMP " +
                "WHERE request_id = ?", requestId);
            resp.put("success", true);
            resp.put("message", "Request rejected.");
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    // ─── COURSE MANAGEMENT ────────────────────────────────────

    public Map<String, Object> createCourse(String courseName, String disciplineId,
            int durationWeeks, int credits, String examDate) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String courseId = "CRS_" + System.currentTimeMillis() % 100000;
            jdbc.update(
                "INSERT INTO Courses (course_id, course_name, discipline_id, " +
                "duration_weeks, credits, exam_date) " +
                "VALUES (?,?,?,?,?,TO_DATE(?,'YYYY-MM-DD'))",
                courseId, courseName, disciplineId, durationWeeks, credits, examDate);
            resp.put("success", true);
            resp.put("message", "Course created: " + courseName);
            resp.put("courseId", courseId);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    public Map<String, Object> assignInstructor(String courseId, String instructorId) {
        Map<String, Object> resp = new HashMap<>();
        try {
            Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Course_Instructors " +
                "WHERE course_id=? AND instructor_id=?",
                Integer.class, courseId, instructorId);
            if (dup != null && dup > 0) {
                resp.put("success", false);
                resp.put("message", "Instructor already assigned to this course.");
                return resp;
            }
            jdbc.update(
                "INSERT INTO Course_Instructors (course_id, instructor_id) VALUES (?,?)",
                courseId, instructorId);
            resp.put("success", true);
            resp.put("message", "Instructor assigned successfully.");
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    public List<Map<String, Object>> getDisciplines() {
        return jdbc.queryForList(
            "SELECT discipline_id, discipline_name " +
            "FROM Disciplines ORDER BY discipline_name");
    }

    // ─── COMPUTE RESULTS ──────────────────────────────────────

    public Map<String, Object> computeResults() {
        Map<String, Object> resp = new HashMap<>();
        try {
            List<Map<String, Object>> enrollments = jdbc.queryForList(
                "SELECT enrollment_id FROM Enrollments WHERE status = 'Active'");
            int count = 0;
            for (Map<String, Object> e : enrollments) {
                String eid = (String) e.get("ENROLLMENT_ID");
                try {
                    jdbc.execute("BEGIN compute_assignment_score('" + eid + "'); END;");
                    count++;
                } catch (Exception inner) {
                    // log but continue for other enrollments
                }
            }
            resp.put("success", true);
            resp.put("message", "Results computed for " + count + " enrollments.");
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }
}