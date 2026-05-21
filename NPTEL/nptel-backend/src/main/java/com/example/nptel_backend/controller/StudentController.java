package com.example.nptel_backend.controller;

import com.example.nptel_backend.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/student")
public class StudentController {

    private final StudentService studentService;

    @Autowired
    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    // ── Browse & Enroll ──────────────────────────────────────

    @GetMapping("/courses/available")
    public ResponseEntity<List<Map<String, Object>>> getAvailableCourses(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getAvailableCourses(learnerId));
    }

    @PostMapping("/enroll")
    public ResponseEntity<Map<String, Object>> enroll(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            studentService.enroll(body.get("learnerId"), body.get("courseId")));
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<Map<String, Object>>> getMyCourses(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getMyCourses(learnerId));
    }

    // ── Assignments ──────────────────────────────────────────

    @GetMapping("/assignments")
    public ResponseEntity<List<Map<String, Object>>> getAssignments(
            @RequestParam String enrollmentId) {
        return ResponseEntity.ok(studentService.getAssignments(enrollmentId));
    }

    @PostMapping("/submit-assignment")
    public ResponseEntity<Map<String, Object>> submitAssignment(
            @RequestBody Map<String, Object> body) {
        String learnerId    = (String) body.get("learnerId");
        String assignmentId = (String) body.get("assignmentId");
        int    marks        = Integer.parseInt(body.get("marksObtained").toString());
        return ResponseEntity.ok(studentService.submitAssignment(learnerId, assignmentId, marks));
    }

    // ── Results & Certificates ───────────────────────────────

    @GetMapping("/results")
    public ResponseEntity<List<Map<String, Object>>> getMyResults(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getMyResults(learnerId));
    }

    @GetMapping("/certificate")
    public ResponseEntity<List<Map<String, Object>>> getMyCertificates(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getMyCertificates(learnerId));
    }

    @GetMapping("/certificate/data")
    public ResponseEntity<Map<String, Object>> getCertificateData(@RequestParam String certId) {
        return ResponseEntity.ok(studentService.getCertificateData(certId));
    }

    // ── Grievances ───────────────────────────────────────────

    @PostMapping("/grievance")
    public ResponseEntity<Map<String, Object>> fileGrievance(
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(studentService.fileGrievance(
            body.get("learnerId"), body.get("courseId"),
            body.get("issueType"),  body.get("description")));
    }

    @GetMapping("/grievances")
    public ResponseEntity<List<Map<String, Object>>> getMyGrievances(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getMyGrievances(learnerId));
    }

    // ── Exam Registration & Payment ──────────────────────────

    /**
     * GET /api/student/exam-registrations?learnerId=L001
     * Returns exam registration + payment status per enrollment.
     */
    @GetMapping("/exam-registrations")
    public ResponseEntity<List<Map<String, Object>>> getExamRegistrations(
            @RequestParam String learnerId) {
        return ResponseEntity.ok(studentService.getExamRegistrations(learnerId));
    }

    /**
     * POST /api/student/register-exam
     * Body: { "learnerId":"L001", "enrollmentId":"ENR01",
     *         "cityPref1":"Chennai", "cityPref2":"Mumbai" }
     */
    @PostMapping("/register-exam")
    public ResponseEntity<Map<String, Object>> registerForExam(
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(studentService.registerForExam(
            body.get("learnerId"),
            body.get("enrollmentId"),
            body.get("cityPref1"),
            body.get("cityPref2")));
    }

    /**
     * POST /api/student/pay-exam-fee
     * Body: { "registrationId":"EREG_001", "amountPaid": 1000 }
     */
    @PostMapping("/pay-exam-fee")
    public ResponseEntity<Map<String, Object>> payExamFee(
            @RequestBody Map<String, Object> body) {
        String regId = (String) body.get("registrationId");
        double amount = Double.parseDouble(body.get("amountPaid").toString());
        return ResponseEntity.ok(studentService.payExamFee(regId, amount));
    }
}