# Section 3.7: Service Accounts Specification

> **Project Name:** First 1,000 Days (F1KD) Maternal & Child Health and Nutrition Monitoring System  
> **Security Model:** Role-Based Access Control (RBAC) with Scoped Multi-Tenant School/Community Assignments  
> **Document Reference:** Section 3.7 - Service Accounts  
> **Generation Date:** 2026-09-14  

---

## 1. System Service Accounts Matrix

### 1.1 For the System (Primary Administrative Accounts)

| Environment | Production | UAT (User Acceptance Testing) | Test / Development |
| :--- | :--- | :--- | :--- |
| **Service Account Email** | `admin@f1kd-system.org` | `uat-admin@f1kd-system.org` | `Superadmin@gmail.com` |
| **Account Designation** | Production System Administrator | Staging Lead QA / Evaluator | Default Developer Superadmin |
| **Access Scope** | Global System Access (All Clusters) | Global Staging Access | Localhost Full Admin Access |
| **Credential Storage** | High-entropy Bcrypt hash (`cost=10`) | Encrypted Bcrypt hash (`cost=10`) | Pre-seeded development hash |
| **MFA / 2FA** | Required (Production Policy) | Recommended | Disabled for local automation |

---

## 2. Seeded Role Accounts Reference

The F1KD application includes canonical system service accounts corresponding to each functional role within the maternal and child health intervention program:

| Role Name | System Role Key | Pre-Seeded Email | Assigned Scope | Functional Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | `super_admin` | `Superadmin@gmail.com` | Global (All Schools & Communities) | System configuration, database migrations, full user management, global analytics |
| **Administrator** | `admin` | `Admin@gmail.com` | Global / Municipal Level | Program creation, batch scheduling, report generation, supervisor-level audit |
| **Partner** | `partner` | `Partner@gmail.com` | Implementing Agency / NGO | Program monitoring, attendance verification, supply allocation review |
| **Controller** | `controller` | `Controller@gmail.com` | Audit & Quality Control | Compliance checking, commodity disbursement audit, clinical log verification |
| **Community Organizer** | `partner` (scoped) | `CommunityOrganizer@gmail.com` | Assigned School / Barangay Cluster | Mother group organization, cohort batch registration, community meetings |
| **Health Worker** | `partner` (scoped) | `Healthworker@gmail.com` | Assigned Health Station / School | Trimester checkup logging, vital sign recording, immunization entry, child growth monitoring |

---

## 3. Security, Authentication & Credential Policies

### 3.1 Password Hashing & Storage
* All user and service account passwords are encrypted using **Bcrypt** with a minimum salt rounds / work factor of `10`.
* Plaintext passwords are never stored in the database or logged in application server outputs.

### 3.2 Token-Based Authentication (JWT)
* **Access Tokens:** Stateless JSON Web Tokens (JWT) signed using HMAC-SHA256 (`JWT_SECRET`).
  * Default lifespan: `8 hours` (`JWT_EXPIRES=8h`).
  * Token payload contains user ID, normalized role, email, and assigned `school_id`.
* **Refresh Tokens:** Long-lived tokens stored in secure, `httpOnly`, `sameSite=strict` cookies with a 7-day TTL (`REFRESH_TOKEN_TTL=7d`).

### 3.3 Access Control & Scoping
* **Route Authorization:** Enforced via Express middleware (`verifyToken`, `authorize`, and `authorizeOperational`).
* **School Scoping:** Non-superadmin operational roles (`admin`, `partner`, `health worker`) are strictly bound to their assigned `school_id`. Requests attempting to access or modify records from outside their assigned school are rejected with HTTP `403 Forbidden` (`PERMISSION_DENIED`).
