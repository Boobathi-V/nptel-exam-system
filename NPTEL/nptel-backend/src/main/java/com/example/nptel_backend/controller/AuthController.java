package com.example.nptel_backend.controller;

import com.example.nptel_backend.model.LoginRequest;
import com.example.nptel_backend.model.RegisterRequest;
import com.example.nptel_backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Autowired
    public AuthController(AuthService authService) { this.authService = authService; }

    /** POST /api/auth/login */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest req) {
        Map<String, Object> result = authService.login(req.getEmail(), req.getPassword());
        if (result == null)
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        return ResponseEntity.ok(result);
    }

    /** POST /api/auth/register/student */
    @PostMapping("/register/student")
    public ResponseEntity<Map<String, Object>> registerStudent(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.registerStudent(
            req.getFullName(), req.getEmail(), req.getPhone(), req.getPassword(),
            req.getDob(), req.getGender(), req.getAadhaarNo(), req.getCategory(),
            req.getEducationLevel(), req.getStateOfResidence()));
    }

    /** POST /api/auth/register/professor */
    @PostMapping("/register/professor")
    public ResponseEntity<Map<String, Object>> registerProfessor(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.registerProfessor(
            req.getFullName(), req.getEmail(), req.getPhone(), req.getPassword(),
            req.getInstitutionId(), req.getDesignation()));
    }

    /** GET /api/auth/institutions — for registration dropdown */
    @GetMapping("/institutions")
    public ResponseEntity<List<Map<String, Object>>> getInstitutions() {
        return ResponseEntity.ok(authService.getInstitutions());
    }
}