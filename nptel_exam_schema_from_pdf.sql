-- ============================================================
--  NPTEL COMPLETE FINAL SQL  ─  FULLY CORRECTED
--  Run in Oracle SQL*Plus / SQL Developer
--
--  FIXES APPLIED vs previous version:
--  1. Registration_Requests: removed student fields & DEFAULT bug
--     Oracle does NOT allow DEFAULT in a column that also has NOT NULL
--     without the DEFAULT coming first.  Moved DEFAULT before NOT NULL.
--  2. Registration_Requests CHECK constraint now allows BOTH 'STUDENT'
--     and 'PROFESSOR' (students also self-register via this table).
--  3. compute_assignment_score procedure: FETCH FIRST n ROWS ONLY is
--     only valid in SQL (SELECT), not inside a cursor FOR loop combined
--     with ORDER BY in older Oracle versions without explicit ROWNUM.
--     Fixed by using ROWNUM <= 8 subquery approach.
--  4. generate_results: same cursor issue fixed.
--  5. Registration_Requests: added student-specific columns
--     (dob, gender, aadhaar_no, category, education_level,
--      state_of_residence) so students can also self-register.
--  6. All procedures recompiled cleanly.
-- ============================================================

SET DEFINE OFF;
SET ECHO ON;
SET FEEDBACK ON;

-- ── STEP 0: DROP EVERYTHING (safe re-run) ───────────────────

DROP TRIGGER trg_chk_wa_sub_marks;
DROP TRIGGER trg_chk_payment_for_hall;
DROP TRIGGER trg_calc_final_nptel_score;
DROP TRIGGER trg_calc_exam_fee;
DROP TRIGGER trg_update_reg_status;

DROP TABLE Registration_Requests  CASCADE CONSTRAINTS PURGE;
DROP TABLE Users                   CASCADE CONSTRAINTS PURGE;
DROP TABLE Certificates            CASCADE CONSTRAINTS PURGE;
DROP TABLE Results                 CASCADE CONSTRAINTS PURGE;
DROP TABLE Grievances              CASCADE CONSTRAINTS PURGE;
DROP TABLE Answer_Sheets           CASCADE CONSTRAINTS PURGE;
DROP TABLE Evaluators              CASCADE CONSTRAINTS PURGE;
DROP TABLE Hall_Allocations        CASCADE CONSTRAINTS PURGE;
DROP TABLE Payments                CASCADE CONSTRAINTS PURGE;
DROP TABLE Exam_Registrations      CASCADE CONSTRAINTS PURGE;
DROP TABLE Halls                   CASCADE CONSTRAINTS PURGE;
DROP TABLE Test_Centres            CASCADE CONSTRAINTS PURGE;
DROP TABLE Assignment_Submissions  CASCADE CONSTRAINTS PURGE;
DROP TABLE Weekly_Assignments      CASCADE CONSTRAINTS PURGE;
DROP TABLE Enrollments             CASCADE CONSTRAINTS PURGE;
DROP TABLE Course_Instructors      CASCADE CONSTRAINTS PURGE;
DROP TABLE Courses                 CASCADE CONSTRAINTS PURGE;
DROP TABLE Instructors             CASCADE CONSTRAINTS PURGE;
DROP TABLE Learners                CASCADE CONSTRAINTS PURGE;
DROP TABLE Institutions            CASCADE CONSTRAINTS PURGE;
DROP TABLE Disciplines             CASCADE CONSTRAINTS PURGE;

DROP PROCEDURE compute_assignment_score;
DROP PROCEDURE generate_results;

COMMIT;

-- ── STEP 1: BASE TABLES ──────────────────────────────────────

-- 1. Disciplines
CREATE TABLE Disciplines (
    discipline_id   VARCHAR2(20) PRIMARY KEY,
    discipline_name VARCHAR2(100) UNIQUE NOT NULL
);

-- 2. Institutions
CREATE TABLE Institutions (
    institution_id   VARCHAR2(20) PRIMARY KEY,
    institution_name VARCHAR2(150) UNIQUE NOT NULL,
    city             VARCHAR2(100),
    state            VARCHAR2(100)
);

-- 3. Learners
CREATE TABLE Learners (
    learner_id         VARCHAR2(20)  PRIMARY KEY,
    full_name          VARCHAR2(100) NOT NULL,
    dob                DATE,
    gender             VARCHAR2(10),
    email              VARCHAR2(150) UNIQUE NOT NULL,
    phone              VARCHAR2(15)  UNIQUE NOT NULL,
    aadhaar_no         VARCHAR2(12)  UNIQUE,
    category           VARCHAR2(20)  DEFAULT 'General',
    education_level    VARCHAR2(50),
    state_of_residence VARCHAR2(100),
    registration_date  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_lrn_gender   CHECK (gender   IN ('Male','Female','Other')),
    CONSTRAINT chk_lrn_category CHECK (category IN ('General','OBC','SC','ST','EWS'))
);

-- 4. Instructors
CREATE TABLE Instructors (
    instructor_id  VARCHAR2(20) PRIMARY KEY,
    full_name      VARCHAR2(100) NOT NULL,
    email          VARCHAR2(150) UNIQUE NOT NULL,
    institution_id VARCHAR2(20),
    designation    VARCHAR2(100),
    CONSTRAINT fk_ins_inst FOREIGN KEY (institution_id) REFERENCES Institutions(institution_id)
);

-- 5. Courses
CREATE TABLE Courses (
    course_id      VARCHAR2(20)  PRIMARY KEY,
    course_name    VARCHAR2(150) NOT NULL,
    discipline_id  VARCHAR2(20),
    duration_weeks NUMBER(2),
    credits        NUMBER(2),
    exam_date      DATE,
    CONSTRAINT fk_crs_disc  FOREIGN KEY (discipline_id) REFERENCES Disciplines(discipline_id),
    CONSTRAINT chk_duration CHECK (duration_weeks IN (4, 8, 12))
);

-- 6. Course_Instructors (M:N)
CREATE TABLE Course_Instructors (
    course_id     VARCHAR2(20),
    instructor_id VARCHAR2(20),
    PRIMARY KEY (course_id, instructor_id),
    CONSTRAINT fk_ci_crs FOREIGN KEY (course_id)     REFERENCES Courses(course_id),
    CONSTRAINT fk_ci_ins FOREIGN KEY (instructor_id) REFERENCES Instructors(instructor_id)
);

-- 7. Enrollments
CREATE TABLE Enrollments (
    enrollment_id   VARCHAR2(20) PRIMARY KEY,
    learner_id      VARCHAR2(20),
    course_id       VARCHAR2(20),
    enrollment_date DATE DEFAULT SYSDATE,
    status          VARCHAR2(20) DEFAULT 'Active',
    CONSTRAINT fk_enr_lrn    FOREIGN KEY (learner_id) REFERENCES Learners(learner_id),
    CONSTRAINT fk_enr_crs    FOREIGN KEY (course_id)  REFERENCES Courses(course_id),
    CONSTRAINT chk_enr_status CHECK (status IN ('Active','Dropped','Completed')),
    CONSTRAINT uq_enr         UNIQUE (learner_id, course_id)
);

-- 8. Weekly_Assignments
CREATE TABLE Weekly_Assignments (
    assignment_id VARCHAR2(20) PRIMARY KEY,
    course_id     VARCHAR2(20),
    week_number   NUMBER(2),
    max_marks     NUMBER(3) DEFAULT 100,
    deadline      TIMESTAMP,
    CONSTRAINT fk_wa_crs FOREIGN KEY (course_id) REFERENCES Courses(course_id),
    CONSTRAINT uq_wa     UNIQUE (course_id, week_number)
);

-- 9. Assignment_Submissions
CREATE TABLE Assignment_Submissions (
    submission_id   VARCHAR2(20) PRIMARY KEY,
    learner_id      VARCHAR2(20),
    assignment_id   VARCHAR2(20),
    marks_obtained  NUMBER(3),
    submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_as_lrn FOREIGN KEY (learner_id)    REFERENCES Learners(learner_id),
    CONSTRAINT fk_as_wa  FOREIGN KEY (assignment_id) REFERENCES Weekly_Assignments(assignment_id),
    CONSTRAINT uq_sub    UNIQUE (learner_id, assignment_id)
);

-- 10. Test_Centres
CREATE TABLE Test_Centres (
    centre_id   VARCHAR2(20) PRIMARY KEY,
    centre_name VARCHAR2(150),
    city        VARCHAR2(100),
    address     VARCHAR2(255)
);

-- 11. Halls
CREATE TABLE Halls (
    hall_id   VARCHAR2(20) PRIMARY KEY,
    centre_id VARCHAR2(20),
    hall_name VARCHAR2(50),
    capacity  NUMBER(4),
    CONSTRAINT fk_hall_centre FOREIGN KEY (centre_id) REFERENCES Test_Centres(centre_id)
);

-- 12. Exam_Registrations
CREATE TABLE Exam_Registrations (
    registration_id  VARCHAR2(20) PRIMARY KEY,
    enrollment_id    VARCHAR2(20) UNIQUE NOT NULL,
    exam_city_pref_1 VARCHAR2(100),
    exam_city_pref_2 VARCHAR2(100),
    fee_amount       NUMBER(6,2),
    status           VARCHAR2(20) DEFAULT 'PENDING',
    CONSTRAINT fk_ereg_enr     FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id),
    CONSTRAINT chk_ereg_status CHECK (status IN ('PENDING','SUCCESSFUL','CANCELLED'))
);

-- 13. Payments
CREATE TABLE Payments (
    transaction_id  VARCHAR2(50) PRIMARY KEY,
    registration_id VARCHAR2(20) UNIQUE NOT NULL,
    amount_paid     NUMBER(6,2),
    payment_status  VARCHAR2(20) DEFAULT 'PENDING',
    payment_date    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pay_ereg   FOREIGN KEY (registration_id) REFERENCES Exam_Registrations(registration_id),
    CONSTRAINT chk_pay_status CHECK (payment_status IN ('SUCCESS','FAILED','PENDING'))
);

-- 14. Hall_Allocations
CREATE TABLE Hall_Allocations (
    allocation_id   VARCHAR2(20) PRIMARY KEY,
    registration_id VARCHAR2(20) UNIQUE,
    hall_id         VARCHAR2(20),
    seat_number     VARCHAR2(10),
    CONSTRAINT fk_ha_reg  FOREIGN KEY (registration_id) REFERENCES Exam_Registrations(registration_id),
    CONSTRAINT fk_ha_hall FOREIGN KEY (hall_id)         REFERENCES Halls(hall_id)
);

-- 15. Evaluators
CREATE TABLE Evaluators (
    evaluator_id  VARCHAR2(20) PRIMARY KEY,
    full_name     VARCHAR2(100),
    email         VARCHAR2(150) UNIQUE,
    discipline_id VARCHAR2(20),
    CONSTRAINT fk_evl_disc FOREIGN KEY (discipline_id) REFERENCES Disciplines(discipline_id)
);

-- 16. Answer_Sheets
CREATE TABLE Answer_Sheets (
    sheet_id        VARCHAR2(20) PRIMARY KEY,
    registration_id VARCHAR2(20) UNIQUE,
    evaluator_id    VARCHAR2(20),
    marks_awarded   NUMBER(5,2),
    evaluation_date DATE,
    CONSTRAINT fk_ans_reg FOREIGN KEY (registration_id) REFERENCES Exam_Registrations(registration_id),
    CONSTRAINT fk_ans_evl FOREIGN KEY (evaluator_id)    REFERENCES Evaluators(evaluator_id)
);

-- 17. Grievances
CREATE TABLE Grievances (
    grievance_id VARCHAR2(20) PRIMARY KEY,
    learner_id   VARCHAR2(20),
    course_id    VARCHAR2(20),
    issue_type   VARCHAR2(50),
    description  VARCHAR2(1000),
    status       VARCHAR2(20) DEFAULT 'Open',
    filed_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_grv_lrn FOREIGN KEY (learner_id) REFERENCES Learners(learner_id),
    CONSTRAINT fk_grv_crs FOREIGN KEY (course_id)  REFERENCES Courses(course_id)
);

-- 18. Results
CREATE TABLE Results (
    result_id            VARCHAR2(20) PRIMARY KEY,
    enrollment_id        VARCHAR2(20) UNIQUE NOT NULL,
    assignment_score     NUMBER(5,2) DEFAULT 0,
    proctored_exam_score NUMBER(5,2) DEFAULT 0,
    final_score          NUMBER(5,2) DEFAULT 0,
    grade                VARCHAR2(5),
    CONSTRAINT fk_res_enr     FOREIGN KEY (enrollment_id) REFERENCES Enrollments(enrollment_id),
    CONSTRAINT chk_res_assign CHECK (assignment_score     BETWEEN 0 AND 25),
    CONSTRAINT chk_res_exam   CHECK (proctored_exam_score BETWEEN 0 AND 100)
);

-- 19. Certificates
CREATE TABLE Certificates (
    certificate_id   VARCHAR2(50) PRIMARY KEY,
    result_id        VARCHAR2(20) UNIQUE NOT NULL,
    certificate_type VARCHAR2(50),
    issue_date       DATE DEFAULT SYSDATE,
    learner_name     VARCHAR2(100),
    course_name      VARCHAR2(150),
    download_url     VARCHAR2(500),
    CONSTRAINT fk_cert_res FOREIGN KEY (result_id) REFERENCES Results(result_id)
);

-- 20. Users
CREATE TABLE Users (
    user_id       VARCHAR2(30)  PRIMARY KEY,
    email         VARCHAR2(150) UNIQUE NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role          VARCHAR2(20)  NOT NULL,
    ref_id        VARCHAR2(20),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_usr_role CHECK (role IN ('ADMIN','STUDENT','PROFESSOR'))
);

-- 21. Registration_Requests
-- FIX 1: DEFAULT must come before NOT NULL in Oracle DDL
-- FIX 2: CHECK allows BOTH 'STUDENT' and 'PROFESSOR'
-- FIX 3: Added student-specific columns so students can self-register
-- FIX 4: Removed missing closing parenthesis bug on FK
CREATE TABLE Registration_Requests (
    request_id         VARCHAR2(30)  PRIMARY KEY,
    full_name          VARCHAR2(100) NOT NULL,
    email              VARCHAR2(150) UNIQUE NOT NULL,
    phone              VARCHAR2(15),
    password_hash      VARCHAR2(255) NOT NULL,
    role               VARCHAR2(20)  DEFAULT 'STUDENT' NOT NULL,
    -- Professor fields
    institution_id     VARCHAR2(20),
    designation        VARCHAR2(100),
    -- Student-specific fields
    dob                DATE,
    gender             VARCHAR2(10),
    aadhaar_no         VARCHAR2(12),
    category           VARCHAR2(20)  DEFAULT 'General',
    education_level    VARCHAR2(50),
    state_of_residence VARCHAR2(100),
    -- Status tracking
    status             VARCHAR2(20)  DEFAULT 'PENDING',
    requested_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at        TIMESTAMP,
    CONSTRAINT chk_req_role   CHECK (role   IN ('STUDENT','PROFESSOR')),
    CONSTRAINT chk_req_status CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    CONSTRAINT fk_req_inst    FOREIGN KEY (institution_id)
                              REFERENCES Institutions(institution_id)
);

COMMIT;

-- ── STEP 2: TRIGGERS ─────────────────────────────────────────

-- TRIGGER 1: Calculate exam fee (SC/ST = 500, others = 1000)
CREATE OR REPLACE TRIGGER trg_calc_exam_fee
BEFORE INSERT ON Exam_Registrations
FOR EACH ROW
DECLARE
    v_category VARCHAR2(20);
BEGIN
    SELECT l.category INTO v_category
    FROM   Learners l
    JOIN   Enrollments e ON l.learner_id = e.learner_id
    WHERE  e.enrollment_id = :NEW.enrollment_id;

    IF v_category IN ('SC','ST') THEN
        :NEW.fee_amount := 500;
    ELSE
        :NEW.fee_amount := 1000;
    END IF;
END;
/

-- TRIGGER 2: Update exam registration status on payment
CREATE OR REPLACE TRIGGER trg_update_reg_status
AFTER INSERT OR UPDATE ON Payments
FOR EACH ROW
BEGIN
    IF :NEW.payment_status = 'SUCCESS' THEN
        UPDATE Exam_Registrations
        SET    status = 'SUCCESSFUL'
        WHERE  registration_id = :NEW.registration_id;
    ELSIF :NEW.payment_status = 'FAILED' THEN
        UPDATE Exam_Registrations
        SET    status = 'CANCELLED'
        WHERE  registration_id = :NEW.registration_id;
    END IF;
END;
/

-- TRIGGER 3: Validate assignment submission marks
CREATE OR REPLACE TRIGGER trg_chk_wa_sub_marks
BEFORE INSERT OR UPDATE ON Assignment_Submissions
FOR EACH ROW
DECLARE
    v_max_marks NUMBER;
BEGIN
    SELECT max_marks INTO v_max_marks
    FROM   Weekly_Assignments
    WHERE  assignment_id = :NEW.assignment_id;

    IF :NEW.marks_obtained > v_max_marks OR :NEW.marks_obtained < 0 THEN
        RAISE_APPLICATION_ERROR(-20001,
            'Marks must be between 0 and ' || v_max_marks || '.');
    END IF;
END;
/

-- TRIGGER 4: Block hall allocation if payment not SUCCESS
CREATE OR REPLACE TRIGGER trg_chk_payment_for_hall
BEFORE INSERT ON Hall_Allocations
FOR EACH ROW
DECLARE
    v_pay_status VARCHAR2(20);
BEGIN
    SELECT payment_status INTO v_pay_status
    FROM   Payments
    WHERE  registration_id = :NEW.registration_id;

    IF v_pay_status <> 'SUCCESS' THEN
        RAISE_APPLICATION_ERROR(-20002,
            'Hall cannot be allocated. Payment not successful.');
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20003,
            'Payment record not found for this registration.');
END;
/

-- TRIGGER 5: Auto-compute final_score, grade, certificate on Results INSERT/UPDATE
CREATE OR REPLACE TRIGGER trg_calc_final_nptel_score
BEFORE INSERT OR UPDATE ON Results
FOR EACH ROW
DECLARE
    v_cert_type VARCHAR2(50);
    v_grade     VARCHAR2(5);
    v_lname     VARCHAR2(100);
    v_cname     VARCHAR2(150);
    v_cert_id   VARCHAR2(50);
    v_exists    NUMBER;
BEGIN
    -- 1. Compute final score
    :NEW.final_score := :NEW.assignment_score + (:NEW.proctored_exam_score * 0.75);

    -- 2. Assign grade
    IF    :NEW.final_score >= 90 THEN v_grade := 'O';
    ELSIF :NEW.final_score >= 80 THEN v_grade := 'A';
    ELSIF :NEW.final_score >= 55 THEN v_grade := 'B';
    ELSIF :NEW.final_score >= 40 THEN v_grade := 'C';
    ELSE                               v_grade := 'U';
    END IF;
    :NEW.grade := v_grade;

    -- 3. Certificate type
    IF    :NEW.final_score >= 90 THEN v_cert_type := 'Elite + Gold';
    ELSIF :NEW.final_score >= 75 THEN v_cert_type := 'Elite + Silver';
    ELSIF :NEW.final_score >= 60 THEN v_cert_type := 'Elite';
    ELSIF :NEW.final_score >= 40 THEN v_cert_type := 'Successfully Completed';
    ELSE                               v_cert_type := 'No Certificate';
    END IF;

    -- 4. Fetch learner + course name
    BEGIN
        SELECT l.full_name, c.course_name
        INTO   v_lname, v_cname
        FROM   Enrollments e
        JOIN   Learners l ON e.learner_id = l.learner_id
        JOIN   Courses  c ON e.course_id  = c.course_id
        WHERE  e.enrollment_id = :NEW.enrollment_id;
    EXCEPTION
        WHEN OTHERS THEN
            v_lname := 'Learner';
            v_cname := 'Course';
    END;

    v_cert_id := 'CERT_' || :NEW.result_id;

    -- 5. Upsert certificate
    IF v_cert_type <> 'No Certificate' THEN
        SELECT COUNT(*) INTO v_exists
        FROM   Certificates
        WHERE  certificate_id = v_cert_id;

        IF v_exists = 0 THEN
            INSERT INTO Certificates
                (certificate_id, result_id, certificate_type, issue_date,
                 learner_name, course_name, download_url)
            VALUES
                (v_cert_id, :NEW.result_id, v_cert_type, SYSDATE,
                 v_lname, v_cname,
                 '/api/student/certificate/data?certId=' || v_cert_id);
        ELSE
            UPDATE Certificates
            SET    certificate_type = v_cert_type,
                   learner_name     = v_lname,
                   course_name      = v_cname,
                   download_url     = '/api/student/certificate/data?certId=' || v_cert_id
            WHERE  certificate_id   = v_cert_id;
        END IF;
    ELSE
        -- Grade U: remove certificate if it existed
        DELETE FROM Certificates WHERE certificate_id = v_cert_id;
    END IF;
END;
/

-- ── STEP 3: PROCEDURES ───────────────────────────────────────

-- FIX: FETCH FIRST n ROWS ONLY inside a cursor body is not supported
-- in all Oracle versions when combined with FOR EACH LOOP.
-- Use a nested SELECT with ROWNUM instead.

CREATE OR REPLACE PROCEDURE compute_assignment_score(p_enrollment_id IN VARCHAR2)
IS
    v_learner_id   VARCHAR2(20);
    v_course_id    VARCHAR2(20);
    v_best8_total  NUMBER := 0;
    v_count        NUMBER := 0;
    v_assign_score NUMBER := 0;
    v_result_id    VARCHAR2(20);
    v_exists       NUMBER;
    v_marks        NUMBER;

    -- FIX: Use ROWNUM subquery instead of FETCH FIRST n ROWS ONLY
    CURSOR c_marks IS
        SELECT marks_obtained
        FROM (
            SELECT s.marks_obtained
            FROM   Assignment_Submissions s
            JOIN   Weekly_Assignments wa ON s.assignment_id = wa.assignment_id
            WHERE  wa.course_id = v_course_id
              AND  s.learner_id = v_learner_id
            ORDER BY s.marks_obtained DESC
        )
        WHERE ROWNUM <= 8;
BEGIN
    SELECT learner_id, course_id
    INTO   v_learner_id, v_course_id
    FROM   Enrollments
    WHERE  enrollment_id = p_enrollment_id;

    FOR r IN c_marks LOOP
        v_best8_total := v_best8_total + r.marks_obtained;
        v_count       := v_count + 1;
    END LOOP;

    IF v_count > 0 THEN
        -- Scale to 0–25: best8_sum / (count * 100) * 25
        v_assign_score := ROUND((v_best8_total / (v_count * 100)) * 25, 2);
    ELSE
        v_assign_score := 0;
    END IF;

    v_result_id := 'RES_' || p_enrollment_id;

    SELECT COUNT(*) INTO v_exists
    FROM   Results
    WHERE  enrollment_id = p_enrollment_id;

    IF v_exists = 0 THEN
        INSERT INTO Results
            (result_id, enrollment_id, assignment_score, proctored_exam_score)
        VALUES
            (v_result_id, p_enrollment_id, v_assign_score, 0);
    ELSE
        UPDATE Results
        SET    assignment_score = v_assign_score
        WHERE  enrollment_id   = p_enrollment_id;
    END IF;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/

-- PROCEDURE B: Run compute_assignment_score for all Active enrollments
CREATE OR REPLACE PROCEDURE generate_results
IS
    CURSOR c_enr IS
        SELECT e.enrollment_id
        FROM   Enrollments e
        LEFT JOIN Results r ON r.enrollment_id = e.enrollment_id
        WHERE  e.status   = 'Active'
          AND  r.result_id IS NULL;
BEGIN
    FOR rec IN c_enr LOOP
        compute_assignment_score(rec.enrollment_id);
    END LOOP;
    COMMIT;
END;
/

-- ── STEP 4: SEED DATA ─────────────────────────────────────────

-- Disciplines
INSERT INTO Disciplines VALUES ('DISC01', 'Computer Science');
INSERT INTO Disciplines VALUES ('DISC02', 'Electrical Engineering');
INSERT INTO Disciplines VALUES ('DISC03', 'Mechanical Engineering');
INSERT INTO Disciplines VALUES ('DISC04', 'Mathematics');
INSERT INTO Disciplines VALUES ('DISC05', 'Management');

-- Institutions
INSERT INTO Institutions VALUES ('INST01', 'IIT Madras',     'Chennai',    'Tamil Nadu');
INSERT INTO Institutions VALUES ('INST02', 'IIT Bombay',     'Mumbai',     'Maharashtra');
INSERT INTO Institutions VALUES ('INST03', 'IIT Delhi',      'New Delhi',  'Delhi');
INSERT INTO Institutions VALUES ('INST04', 'IIT Kharagpur',  'Kharagpur',  'West Bengal');
INSERT INTO Institutions VALUES ('INST05', 'IISc Bangalore', 'Bangalore',  'Karnataka');

-- Instructors (admin-approved, inserted directly)
INSERT INTO Instructors VALUES ('INS01', 'Prof. Ramesh Kumar',  'ramesh@iitm.ac.in',   'INST01', 'Professor');
INSERT INTO Instructors VALUES ('INS02', 'Dr. Sunita Verma',    'sunita.v@iitb.ac.in', 'INST02', 'Associate Professor');
INSERT INTO Instructors VALUES ('INS03', 'Prof. Arjun Nair',    'arjun@iitd.ac.in',    'INST03', 'Professor');

-- Learners (students create accounts directly; admin approves via Registration_Requests)
INSERT INTO Learners (learner_id, full_name, dob, gender, email, phone, aadhaar_no,
                      category, education_level, state_of_residence)
VALUES ('L001', 'Amit Kumar',
        TO_DATE('2000-05-15','YYYY-MM-DD'), 'Male',
        'amit@example.com', '9876543210', '123412341234',
        'General', 'B.Tech', 'Delhi');

INSERT INTO Learners (learner_id, full_name, dob, gender, email, phone, aadhaar_no,
                      category, education_level, state_of_residence)
VALUES ('L002', 'Priya Sharma',
        TO_DATE('2001-08-22','YYYY-MM-DD'), 'Female',
        'priya@example.com', '9876543211', '432143214321',
        'General', 'M.Tech', 'Maharashtra');

INSERT INTO Learners (learner_id, full_name, dob, gender, email, phone, aadhaar_no,
                      category, education_level, state_of_residence)
VALUES ('L003', 'Rajesh K',
        TO_DATE('1999-10-10','YYYY-MM-DD'), 'Male',
        'rajesh@example.com', '9876543212', '111122223333',
        'SC', 'B.Tech', 'Tamil Nadu');

-- Courses
INSERT INTO Courses VALUES ('CRS01', 'Programming in Java',            'DISC01', 12, 3, TO_DATE('2026-06-15','YYYY-MM-DD'));
INSERT INTO Courses VALUES ('CRS02', 'Data Structures and Algorithms',  'DISC01', 12, 4, TO_DATE('2026-06-22','YYYY-MM-DD'));
INSERT INTO Courses VALUES ('CRS03', 'Digital Signal Processing',       'DISC02',  8, 3, TO_DATE('2026-05-10','YYYY-MM-DD'));
INSERT INTO Courses VALUES ('CRS04', 'Engineering Mathematics',         'DISC04', 12, 4, TO_DATE('2026-07-01','YYYY-MM-DD'));

-- Course-Instructor assignments
INSERT INTO Course_Instructors VALUES ('CRS01', 'INS01');
INSERT INTO Course_Instructors VALUES ('CRS02', 'INS01');
INSERT INTO Course_Instructors VALUES ('CRS03', 'INS02');
INSERT INTO Course_Instructors VALUES ('CRS04', 'INS03');

-- Weekly Assignments for CRS01 (12 weeks)
INSERT INTO Weekly_Assignments VALUES ('WA01', 'CRS01',  1, 100, CURRENT_TIMESTAMP + INTERVAL  '7' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA02', 'CRS01',  2, 100, CURRENT_TIMESTAMP + INTERVAL '14' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA03', 'CRS01',  3, 100, CURRENT_TIMESTAMP + INTERVAL '21' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA04', 'CRS01',  4, 100, CURRENT_TIMESTAMP + INTERVAL '28' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA05', 'CRS01',  5, 100, CURRENT_TIMESTAMP + INTERVAL '35' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA06', 'CRS01',  6, 100, CURRENT_TIMESTAMP + INTERVAL '42' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA07', 'CRS01',  7, 100, CURRENT_TIMESTAMP + INTERVAL '49' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA08', 'CRS01',  8, 100, CURRENT_TIMESTAMP + INTERVAL '56' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA09', 'CRS01',  9, 100, CURRENT_TIMESTAMP + INTERVAL '63' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA10', 'CRS01', 10, 100, CURRENT_TIMESTAMP + INTERVAL '70' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA11', 'CRS01', 11, 100, CURRENT_TIMESTAMP + INTERVAL '77' DAY);
INSERT INTO Weekly_Assignments VALUES ('WA12', 'CRS01', 12, 100, CURRENT_TIMESTAMP + INTERVAL '84' DAY);

-- Weekly Assignments for CRS02 (12 weeks)
INSERT INTO Weekly_Assignments VALUES ('WB01', 'CRS02',  1, 100, CURRENT_TIMESTAMP + INTERVAL  '7' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB02', 'CRS02',  2, 100, CURRENT_TIMESTAMP + INTERVAL '14' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB03', 'CRS02',  3, 100, CURRENT_TIMESTAMP + INTERVAL '21' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB04', 'CRS02',  4, 100, CURRENT_TIMESTAMP + INTERVAL '28' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB05', 'CRS02',  5, 100, CURRENT_TIMESTAMP + INTERVAL '35' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB06', 'CRS02',  6, 100, CURRENT_TIMESTAMP + INTERVAL '42' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB07', 'CRS02',  7, 100, CURRENT_TIMESTAMP + INTERVAL '49' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB08', 'CRS02',  8, 100, CURRENT_TIMESTAMP + INTERVAL '56' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB09', 'CRS02',  9, 100, CURRENT_TIMESTAMP + INTERVAL '63' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB10', 'CRS02', 10, 100, CURRENT_TIMESTAMP + INTERVAL '70' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB11', 'CRS02', 11, 100, CURRENT_TIMESTAMP + INTERVAL '77' DAY);
INSERT INTO Weekly_Assignments VALUES ('WB12', 'CRS02', 12, 100, CURRENT_TIMESTAMP + INTERVAL '84' DAY);

COMMIT;

-- Enrollments
INSERT INTO Enrollments (enrollment_id, learner_id, course_id) VALUES ('ENR01', 'L001', 'CRS01');
INSERT INTO Enrollments (enrollment_id, learner_id, course_id) VALUES ('ENR02', 'L002', 'CRS01');
INSERT INTO Enrollments (enrollment_id, learner_id, course_id) VALUES ('ENR03', 'L003', 'CRS01');
INSERT INTO Enrollments (enrollment_id, learner_id, course_id) VALUES ('ENR04', 'L001', 'CRS02');

-- Assignment submissions for L001 — all 12 weeks of CRS01
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB01', 'L001', 'WA01',  85);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB02', 'L001', 'WA02',  90);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB03', 'L001', 'WA03',  78);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB04', 'L001', 'WA04',  92);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB05', 'L001', 'WA05',  88);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB06', 'L001', 'WA06',  76);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB07', 'L001', 'WA07',  95);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB08', 'L001', 'WA08',  83);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB09', 'L001', 'WA09',  70);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB10', 'L001', 'WA10',  91);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB11', 'L001', 'WA11',  87);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB12', 'L001', 'WA12',  94);

-- Assignment submissions for L002 — 8 weeks of CRS01
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB13', 'L002', 'WA01',  72);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB14', 'L002', 'WA02',  68);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB15', 'L002', 'WA03',  80);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB16', 'L002', 'WA04',  65);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB17', 'L002', 'WA05',  74);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB18', 'L002', 'WA06',  77);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB19', 'L002', 'WA07',  82);
INSERT INTO Assignment_Submissions (submission_id, learner_id, assignment_id, marks_obtained) VALUES ('SUB20', 'L002', 'WA08',  70);

COMMIT;

-- Test infrastructure
INSERT INTO Test_Centres VALUES ('TC01', 'TCS iON Digital Zone', 'Chennai', 'OMR Road, Sholinganallur');
INSERT INTO Test_Centres VALUES ('TC02', 'TCS iON Digital Zone', 'Mumbai',  'BKC, Bandra East');
INSERT INTO Halls VALUES ('H01', 'TC01', 'Hall A', 100);
INSERT INTO Halls VALUES ('H02', 'TC01', 'Hall B', 80);
INSERT INTO Halls VALUES ('H03', 'TC02', 'Hall A', 120);

-- Exam registrations (trigger sets fee automatically)
INSERT INTO Exam_Registrations (registration_id, enrollment_id, exam_city_pref_1, exam_city_pref_2)
VALUES ('EREG01', 'ENR01', 'Chennai', 'Mumbai');
INSERT INTO Exam_Registrations (registration_id, enrollment_id, exam_city_pref_1, exam_city_pref_2)
VALUES ('EREG02', 'ENR02', 'Mumbai',  'Chennai');
INSERT INTO Exam_Registrations (registration_id, enrollment_id, exam_city_pref_1, exam_city_pref_2)
VALUES ('EREG03', 'ENR03', 'Chennai', 'Bangalore');

-- Payments (trigger updates Exam_Registrations.status automatically)
INSERT INTO Payments (transaction_id, registration_id, amount_paid, payment_status)
VALUES ('TXN001', 'EREG01', 1000, 'SUCCESS');
INSERT INTO Payments (transaction_id, registration_id, amount_paid, payment_status)
VALUES ('TXN002', 'EREG02', 1000, 'SUCCESS');
INSERT INTO Payments (transaction_id, registration_id, amount_paid, payment_status)
VALUES ('TXN003', 'EREG03',  500, 'FAILED');

COMMIT;

-- Hall allocations (EREG03 blocked by trigger — payment FAILED)
INSERT INTO Hall_Allocations VALUES ('HA01', 'EREG01', 'H01', 'A15');
INSERT INTO Hall_Allocations VALUES ('HA02', 'EREG02', 'H03', 'B22');

-- Evaluators
INSERT INTO Evaluators VALUES ('EVL01', 'Dr. Suresh Iyer',  'suresh@eval.com', 'DISC01');
INSERT INTO Evaluators VALUES ('EVL02', 'Dr. Meena Pillai', 'meena@eval.com',  'DISC01');

-- Answer sheets
INSERT INTO Answer_Sheets VALUES ('ANS01', 'EREG01', 'EVL01', 87, TO_DATE('2026-05-25','YYYY-MM-DD'));
INSERT INTO Answer_Sheets VALUES ('ANS02', 'EREG02', 'EVL02', 62, TO_DATE('2026-05-25','YYYY-MM-DD'));

COMMIT;

-- ── STEP 5: COMPUTE RESULTS ──────────────────────────────────

BEGIN compute_assignment_score('ENR01'); END;
/
BEGIN compute_assignment_score('ENR02'); END;
/
BEGIN compute_assignment_score('ENR03'); END;
/
BEGIN compute_assignment_score('ENR04'); END;
/

COMMIT;

-- Set proctored exam scores (trigger recomputes final_score, grade, certificate)
UPDATE Results SET proctored_exam_score = 87 WHERE enrollment_id = 'ENR01';
UPDATE Results SET proctored_exam_score = 62 WHERE enrollment_id = 'ENR02';
-- ENR03: SC category, no exam taken — stays 0

COMMIT;

-- ── STEP 6: USERS (login accounts) ──────────────────────────

-- Admin
INSERT INTO Users (user_id, email, password_hash, role)
VALUES ('USR_ADM01', 'admin@nptel.in', 'password123', 'ADMIN');

-- Students
INSERT INTO Users (user_id, email, password_hash, role, ref_id)
VALUES ('USR_L001', 'amit@example.com',   'password123', 'STUDENT', 'L001');
INSERT INTO Users (user_id, email, password_hash, role, ref_id)
VALUES ('USR_L002', 'priya@example.com',  'password123', 'STUDENT', 'L002');
INSERT INTO Users (user_id, email, password_hash, role, ref_id)
VALUES ('USR_L003', 'rajesh@example.com', 'password123', 'STUDENT', 'L003');

-- Professors (accounts created after admin approval)
INSERT INTO Users (user_id, email, password_hash, role, ref_id)
VALUES ('USR_INS01', 'ramesh@iitm.ac.in',   'password123', 'PROFESSOR', 'INS01');
INSERT INTO Users (user_id, email, password_hash, role, ref_id)
VALUES ('USR_INS02', 'sunita.v@iitb.ac.in', 'password123', 'PROFESSOR', 'INS02');

-- Sample pending PROFESSOR registration request
INSERT INTO Registration_Requests
    (request_id, full_name, email, phone, password_hash, role, institution_id, designation)
VALUES
    ('REQ001', 'Dr. Kavitha S', 'kavitha@iitb.ac.in', '9911223344',
     'password123', 'PROFESSOR', 'INST02', 'Associate Professor');

COMMIT;

-- ── STEP 7: VERIFICATION QUERIES ─────────────────────────────

-- Results with grade
SELECT r.result_id, l.full_name AS learner_name, c.course_name,
       r.assignment_score, r.proctored_exam_score, r.final_score, r.grade
FROM   Results r
JOIN   Enrollments e ON r.enrollment_id = e.enrollment_id
JOIN   Learners    l ON e.learner_id    = l.learner_id
JOIN   Courses     c ON e.course_id     = c.course_id
ORDER BY r.final_score DESC;

-- Certificates
SELECT cert.certificate_id, cert.learner_name, cert.course_name,
       cert.certificate_type, cert.issue_date, r.grade, r.final_score
FROM   Certificates cert
JOIN   Results r ON cert.result_id = r.result_id
ORDER BY r.final_score DESC;

-- Exam fee verification
SELECT er.registration_id, l.full_name, l.category, er.fee_amount, er.status
FROM   Exam_Registrations er
JOIN   Enrollments e ON er.enrollment_id = e.enrollment_id
JOIN   Learners    l ON e.learner_id     = l.learner_id
ORDER BY er.registration_id;

-- Payment status
SELECT p.transaction_id, p.registration_id, p.amount_paid,
       p.payment_status, er.status AS exam_reg_status
FROM   Payments p
JOIN   Exam_Registrations er ON p.registration_id = er.registration_id
ORDER BY p.transaction_id;

-- Hall allocations
SELECT ha.allocation_id, ha.registration_id, h.hall_name, tc.city, ha.seat_number
FROM   Hall_Allocations ha
JOIN   Halls        h  ON ha.hall_id   = h.hall_id
JOIN   Test_Centres tc ON h.centre_id  = tc.centre_id
ORDER BY ha.allocation_id;

-- Registration requests
SELECT request_id, full_name, role, email, status, requested_at
FROM   Registration_Requests
ORDER BY requested_at;

-- ============================================================
-- END OF COMPLETE FINAL SQL
-- ============================================================