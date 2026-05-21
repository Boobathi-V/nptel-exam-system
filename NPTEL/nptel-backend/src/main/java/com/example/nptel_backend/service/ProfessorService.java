package com.example.nptel_backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ProfessorService {

    private final JdbcTemplate jdbc;

    @Autowired
    public ProfessorService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Courses this instructor is assigned to teach */
    public List<Map<String, Object>> getMyCourses(String instructorId) {
        return jdbc.queryForList(
            "SELECT c.course_id, c.course_name, d.discipline_name, " +
            "       c.duration_weeks, c.credits, c.exam_date " +
            "FROM Course_Instructors ci " +
            "JOIN Courses c     ON ci.course_id    = c.course_id " +
            "JOIN Disciplines d ON c.discipline_id = d.discipline_id " +
            "WHERE ci.instructor_id = ? ORDER BY c.course_id",
            instructorId);
    }

    /** All students enrolled in a given course */
    public List<Map<String, Object>> getStudents(String courseId) {
        return jdbc.queryForList(
            "SELECT e.enrollment_id, l.learner_id, l.full_name, l.email, " +
            "       l.education_level, e.status, e.enrollment_date " +
            "FROM Enrollments e " +
            "JOIN Learners l ON e.learner_id = l.learner_id " +
            "WHERE e.course_id = ? ORDER BY l.full_name",
            courseId);
    }

    /**
     * Weekly assignments for a course, with every student's submission alongside.
     */
    public List<Map<String, Object>> getAssignments(String courseId) {
        return jdbc.queryForList(
            "SELECT wa.assignment_id, wa.week_number, wa.max_marks, wa.deadline, " +
            "       l.full_name AS learner_name, l.learner_id, " +
            "       s.submission_id, s.marks_obtained, s.submission_time " +
            "FROM Weekly_Assignments wa " +
            "CROSS JOIN Learners l " +
            "LEFT JOIN Assignment_Submissions s " +
            "       ON s.assignment_id = wa.assignment_id " +
            "      AND s.learner_id    = l.learner_id " +
            "WHERE wa.course_id = ? " +
            "  AND l.learner_id IN ( " +
            "      SELECT learner_id FROM Enrollments WHERE course_id = ? " +
            "  ) " +
            "ORDER BY wa.week_number, l.full_name",
            courseId, courseId);
    }

    /** Update/override marks for an existing submission */
    public Map<String, Object> enterScore(String submissionId, int marks) {
        Map<String, Object> resp = new HashMap<>();
        try {
            int updated = jdbc.update(
                "UPDATE Assignment_Submissions SET marks_obtained = ? " +
                "WHERE submission_id = ?",
                marks, submissionId);
            if (updated == 0) {
                resp.put("success", false);
                resp.put("message", "Submission not found: " + submissionId);
            } else {
                resp.put("success", true);
                resp.put("message", "Score updated to " + marks + ".");
            }
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    /** All results for a course */
    public List<Map<String, Object>> getCourseResults(String courseId) {
        return jdbc.queryForList(
            "SELECT l.full_name AS learner_name, " +
            "       r.assignment_score, r.proctored_exam_score, r.final_score, " +
            "       cert.certificate_type " +
            "FROM Results r " +
            "JOIN Enrollments e  ON r.enrollment_id   = e.enrollment_id " +
            "JOIN Learners l     ON e.learner_id       = l.learner_id " +
            "LEFT JOIN Certificates cert ON cert.result_id = r.result_id " +
            "WHERE e.course_id = ? ORDER BY r.final_score DESC",
            courseId);
    }

    /**
     * Post a new weekly assignment for a course.
     * Professor creates assignment for a given week; students then submit answers.
     */
    public Map<String, Object> postAssignment(String courseId, int weekNumber,
                                               int maxMarks, String deadline) {
        Map<String, Object> resp = new HashMap<>();
        try {
            // Check if assignment for this week already exists
            Integer dup = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Weekly_Assignments WHERE course_id=? AND week_number=?",
                Integer.class, courseId, weekNumber);
            if (dup != null && dup > 0) {
                resp.put("success", false);
                resp.put("message", "Assignment for Week " + weekNumber + " already posted.");
                return resp;
            }
            String asgId = "WA_" + courseId + "_W" + weekNumber;
            jdbc.update(
                "INSERT INTO Weekly_Assignments " +
                "(assignment_id, course_id, week_number, max_marks, deadline) " +
                "VALUES (?,?,?,?,TO_TIMESTAMP(?,'YYYY-MM-DD'))",
                asgId, courseId, weekNumber, maxMarks, deadline);
            resp.put("success", true);
            resp.put("message", "Week " + weekNumber + " assignment posted successfully!");
            resp.put("assignmentId", asgId);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Error: " + e.getMessage());
        }
        return resp;
    }

    /**
     * Get list of weeks that already have assignments posted for a course,
     * including how many submissions each has.
     */
    public List<Map<String, Object>> getPostedWeeks(String courseId) {
        return jdbc.queryForList(
            "SELECT wa.week_number, wa.assignment_id, wa.max_marks, wa.deadline, " +
            "       COUNT(s.submission_id) AS submissions_count " +
            "FROM Weekly_Assignments wa " +
            "LEFT JOIN Assignment_Submissions s ON s.assignment_id = wa.assignment_id " +
            "WHERE wa.course_id = ? " +
            "GROUP BY wa.week_number, wa.assignment_id, wa.max_marks, wa.deadline " +
            "ORDER BY wa.week_number",
            courseId);
    }
}