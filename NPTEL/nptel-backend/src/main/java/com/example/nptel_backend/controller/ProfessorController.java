package com.example.nptel_backend.controller;

import com.example.nptel_backend.service.ProfessorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/professor")
public class ProfessorController {

    private final ProfessorService professorService;

    @Autowired
    public ProfessorController(ProfessorService professorService) {
        this.professorService = professorService;
    }

    /** GET /api/professor/my-courses?instructorId=INS01 */
    @GetMapping("/my-courses")
    public ResponseEntity<List<Map<String, Object>>> getMyCourses(
            @RequestParam String instructorId) {
        return ResponseEntity.ok(professorService.getMyCourses(instructorId));
    }

    /** GET /api/professor/students?courseId=CRS01 */
    @GetMapping("/students")
    public ResponseEntity<List<Map<String, Object>>> getStudents(
            @RequestParam String courseId) {
        return ResponseEntity.ok(professorService.getStudents(courseId));
    }

    /** GET /api/professor/assignments?courseId=CRS01 */
    @GetMapping("/assignments")
    public ResponseEntity<List<Map<String, Object>>> getAssignments(
            @RequestParam String courseId) {
        return ResponseEntity.ok(professorService.getAssignments(courseId));
    }

    /** GET /api/professor/results?courseId=CRS01 */
    @GetMapping("/results")
    public ResponseEntity<List<Map<String, Object>>> getCourseResults(
            @RequestParam String courseId) {
        return ResponseEntity.ok(professorService.getCourseResults(courseId));
    }

    /**
     * POST /api/professor/enter-score
     * Body: { "submissionId": "SUB01", "marks": 90 }
     */
    @PostMapping("/enter-score")
    public ResponseEntity<Map<String, Object>> enterScore(
            @RequestBody Map<String, Object> body) {
        String submissionId = (String) body.get("submissionId");
        int marks = Integer.parseInt(body.get("marks").toString());
        return ResponseEntity.ok(professorService.enterScore(submissionId, marks));
    }

    /**
     * POST /api/professor/post-assignment
     * Body: { "courseId":"CRS01", "weekNumber":1, "maxMarks":100, "deadline":"2026-08-15" }
     */
    @PostMapping("/post-assignment")
    public ResponseEntity<Map<String, Object>> postAssignment(
            @RequestBody Map<String, Object> body) {
        String courseId = (String) body.get("courseId");
        int weekNumber = Integer.parseInt(body.get("weekNumber").toString());
        int maxMarks   = Integer.parseInt(body.get("maxMarks").toString());
        String deadline = (String) body.get("deadline");
        return ResponseEntity.ok(professorService.postAssignment(courseId, weekNumber, maxMarks, deadline));
    }

    /**
     * GET /api/professor/posted-weeks?courseId=CRS01
     * Returns list of weeks that already have assignments posted.
     */
    @GetMapping("/posted-weeks")
    public ResponseEntity<List<Map<String, Object>>> getPostedWeeks(
            @RequestParam String courseId) {
        return ResponseEntity.ok(professorService.getPostedWeeks(courseId));
    }
}