package com.example.nptel_backend.controller;

import com.example.nptel_backend.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    @Autowired
    public AdminController(AdminService adminService) { this.adminService = adminService; }

    // ─── EXISTING ENDPOINTS (unchanged) ──────────────────────

    @GetMapping("/learners")
    public ResponseEntity<List<Map<String, Object>>> getLearners() {
        return ResponseEntity.ok(adminService.getAllLearners());
    }

    @GetMapping("/courses")
    public ResponseEntity<List<Map<String, Object>>> getCourses() {
        return ResponseEntity.ok(adminService.getAllCourses());
    }

    @GetMapping("/instructors")
    public ResponseEntity<List<Map<String, Object>>> getInstructors() {
        return ResponseEntity.ok(adminService.getAllInstructors());
    }

    @GetMapping("/enrollments")
    public ResponseEntity<List<Map<String, Object>>> getEnrollments() {
        return ResponseEntity.ok(adminService.getAllEnrollments());
    }

    @GetMapping("/results")
    public ResponseEntity<List<Map<String, Object>>> getResults() {
        return ResponseEntity.ok(adminService.getAllResults());
    }

    @GetMapping("/certificates")
    public ResponseEntity<List<Map<String, Object>>> getCertificates() {
        return ResponseEntity.ok(adminService.getAllCertificates());
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Map<String, Object>>> getPayments() {
        return ResponseEntity.ok(adminService.getAllPayments());
    }

    @GetMapping("/grievances")
    public ResponseEntity<List<Map<String, Object>>> getGrievances() {
        return ResponseEntity.ok(adminService.getAllGrievances());
    }

    // ─── NEW: REGISTRATION REQUESTS  ─────────────────────────

    /** GET /api/admin/requests — pending registration requests */
    @GetMapping("/requests")
    public ResponseEntity<List<Map<String, Object>>> getPendingRequests() {
        return ResponseEntity.ok(adminService.getPendingRequests());
    }

    /** POST /api/admin/requests/approve  Body: { "requestId": "REQ001" } */
    @PostMapping("/requests/approve")
    public ResponseEntity<Map<String, Object>> approveRequest(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.approveRequest(body.get("requestId")));
    }

    /** POST /api/admin/requests/reject  Body: { "requestId": "REQ001" } */
    @PostMapping("/requests/reject")
    public ResponseEntity<Map<String, Object>> rejectRequest(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.rejectRequest(body.get("requestId")));
    }

    // ─── NEW: COURSE MANAGEMENT  ──────────────────────────────

    /** POST /api/admin/courses/create
     *  Body: { "courseName":"...", "disciplineId":"DISC01",
     *          "durationWeeks":12, "credits":3, "examDate":"2026-11-20" } */
    @PostMapping("/courses/create")
    public ResponseEntity<Map<String, Object>> createCourse(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(adminService.createCourse(
            (String) body.get("courseName"),
            (String) body.get("disciplineId"),
            Integer.parseInt(body.get("durationWeeks").toString()),
            Integer.parseInt(body.get("credits").toString()),
            (String) body.get("examDate")));
    }

    /** POST /api/admin/courses/assign-instructor
     *  Body: { "courseId":"CRS01", "instructorId":"INS01" } */
    @PostMapping("/courses/assign-instructor")
    public ResponseEntity<Map<String, Object>> assignInstructor(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.assignInstructor(
            body.get("courseId"), body.get("instructorId")));
    }

    /** GET /api/admin/disciplines */
    @GetMapping("/disciplines")
    public ResponseEntity<List<Map<String, Object>>> getDisciplines() {
        return ResponseEntity.ok(adminService.getDisciplines());
    }

    /** POST /api/admin/compute-results — triggers best-8-of-12 grading */
    @PostMapping("/compute-results")
    public ResponseEntity<Map<String, Object>> computeResults() {
        return ResponseEntity.ok(adminService.computeResults());
    }
}