package com.example.nptel_backend.model;

public class RegisterRequest {
    private String fullName;
    private String email;
    private String phone;
    private String password;
    private String role;          // STUDENT | PROFESSOR
    // Professor fields
    private String institutionId;
    private String designation;
    // Student fields
    private String dob;
    private String gender;
    private String aadhaarNo;
    private String category;
    private String educationLevel;
    private String stateOfResidence;

    public String getFullName()         { return fullName; }
    public void setFullName(String v)   { fullName = v; }
    public String getEmail()            { return email; }
    public void setEmail(String v)      { email = v; }
    public String getPhone()            { return phone; }
    public void setPhone(String v)      { phone = v; }
    public String getPassword()         { return password; }
    public void setPassword(String v)   { password = v; }
    public String getRole()             { return role; }
    public void setRole(String v)       { role = v; }
    public String getInstitutionId()    { return institutionId; }
    public void setInstitutionId(String v) { institutionId = v; }
    public String getDesignation()      { return designation; }
    public void setDesignation(String v){ designation = v; }
    public String getDob()              { return dob; }
    public void setDob(String v)        { dob = v; }
    public String getGender()           { return gender; }
    public void setGender(String v)     { gender = v; }
    public String getAadhaarNo()        { return aadhaarNo; }
    public void setAadhaarNo(String v)  { aadhaarNo = v; }
    public String getCategory()         { return category; }
    public void setCategory(String v)   { category = v; }
    public String getEducationLevel()   { return educationLevel; }
    public void setEducationLevel(String v){ educationLevel = v; }
    public String getStateOfResidence() { return stateOfResidence; }
    public void setStateOfResidence(String v){ stateOfResidence = v; }
}