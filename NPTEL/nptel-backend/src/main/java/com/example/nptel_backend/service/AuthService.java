package com.example.nptel_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AuthService {

    private final JdbcTemplate jdbc;

    @Autowired
    public AuthService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    // ─── LOGIN ────────────────────────────────────────────────
    public Map<String, Object> login(String email, String password) {
        List<Map<String, Object>> rows = jdbc.queryForList(
            "SELECT user_id, role, ref_id, password_hash FROM Users WHERE email = ?", email);
        if (rows.isEmpty()) return null;

        Map<String, Object> user = rows.get(0);
        String stored = (String) user.get("PASSWORD_HASH");
        if (!stored.equals(password)) return null;

        String role  = (String) user.get("ROLE");
        String refId = (String) user.get("REF_ID");

        Map<String, Object> resp = new HashMap<>();
        resp.put("role",  role);
        resp.put("refId", refId);
        resp.put("name",  fetchName(role, refId));
        return resp;
    }

    private String fetchName(String role, String refId) {
        if (refId == null) return "Admin";
        try {
            if ("STUDENT".equals(role))
                return jdbc.queryForObject(
                    "SELECT full_name FROM Learners WHERE learner_id = ?", String.class, refId);
            if ("PROFESSOR".equals(role))
                return jdbc.queryForObject(
                    "SELECT full_name FROM Instructors WHERE instructor_id = ?", String.class, refId);
        } catch (Exception ignored) {}
        return refId;
    }

    // ─── STUDENT DIRECT REGISTRATION ─────────────────────────
    // Students are created directly into Learners + Users tables.
    // No admin approval needed — they can log in immediately.
    public Map<String, Object> registerStudent(
            String fullName, String email, String phone, String password,
            String dob, String gender, String aadhaarNo, String category,
            String educationLevel, String stateOfResidence) {

        Map<String, Object> resp = new HashMap<>();
        try {
            // Check duplicate email in Users
            Integer dupUser = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Users WHERE email = ?", Integer.class, email);
            if (dupUser != null && dupUser > 0) {
                resp.put("success", false);
                resp.put("message", "Email is already registered. Please log in.");
                return resp;
            }

            // Check duplicate email in Learners
            Integer dupLearner = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Learners WHERE email = ?", Integer.class, email);
            if (dupLearner != null && dupLearner > 0) {
                resp.put("success", false);
                resp.put("message", "Email is already registered. Please log in.");
                return resp;
            }

            // Check duplicate phone
            Integer dupPhone = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Learners WHERE phone = ?", Integer.class, phone);
            if (dupPhone != null && dupPhone > 0) {
                resp.put("success", false);
                resp.put("message", "Phone number is already registered.");
                return resp;
            }

            // Generate IDs
            String ts        = String.valueOf(System.currentTimeMillis() % 100000);
            String learnerId = "L" + ts;
            String userId    = "USR_" + learnerId;

            // Insert into Learners
            jdbc.update(
                "INSERT INTO Learners " +
                "(learner_id, full_name, dob, gender, email, phone, aadhaar_no, " +
                " category, education_level, state_of_residence) " +
                "VALUES (?,?,TO_DATE(?,'YYYY-MM-DD'),?,?,?,?,?,?,?)",
                learnerId, fullName,
                (dob != null && !dob.isEmpty()) ? dob : "2000-01-01",
                gender, email, phone,
                (aadhaarNo != null && !aadhaarNo.isEmpty()) ? aadhaarNo : null,
                (category  != null && !category.isEmpty())  ? category  : "General",
                educationLevel, stateOfResidence);

            // Insert into Users
            jdbc.update(
                "INSERT INTO Users (user_id, email, password_hash, role, ref_id) " +
                "VALUES (?,?,?,?,?)",
                userId, email, password, "STUDENT", learnerId);

            resp.put("success", true);
            resp.put("learnerId", learnerId);
            resp.put("message",
                "Account created successfully! Your learner ID is " + learnerId +
                ". You can log in now.");

        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Registration error: " + e.getMessage());
        }
        return resp;
    }

    // ─── PROFESSOR REGISTRATION REQUEST ──────────────────────
    // Professors go into Registration_Requests → admin approves →
    // Instructor + User rows created by AdminService.approveRequest()
    public Map<String, Object> registerProfessor(
            String fullName, String email, String phone, String password,
            String institutionId, String designation) {

        Map<String, Object> resp = new HashMap<>();
        try {
            // Check duplicate in Registration_Requests
            Integer dupReq = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Registration_Requests WHERE email = ?",
                Integer.class, email);
            if (dupReq != null && dupReq > 0) {
                resp.put("success", false);
                resp.put("message", "A registration request with this email already exists.");
                return resp;
            }
            // Check duplicate in Users
            Integer dupUser = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Users WHERE email = ?", Integer.class, email);
            if (dupUser != null && dupUser > 0) {
                resp.put("success", false);
                resp.put("message", "Email is already registered.");
                return resp;
            }

            String reqId = "REQ_" + System.currentTimeMillis() % 1000000;
            jdbc.update(
                "INSERT INTO Registration_Requests " +
                "(request_id, full_name, email, phone, password_hash, role, " +
                " institution_id, designation) " +
                "VALUES (?,?,?,?,?,?,?,?)",
                reqId, fullName, email, phone, password,
                "PROFESSOR", institutionId, designation);

            resp.put("success", true);
            resp.put("message",
                "Professor registration request submitted! " +
                "Admin will review and approve your account. " +
                "You will be able to log in after approval.");

        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Registration error: " + e.getMessage());
        }
        return resp;
    }

    // ─── GET ALL INSTITUTIONS (for registration dropdown) ────
    public List<Map<String, Object>> getInstitutions() {
        return jdbc.queryForList(
            "SELECT institution_id, institution_name, city " +
            "FROM Institutions ORDER BY institution_name");
    }
}