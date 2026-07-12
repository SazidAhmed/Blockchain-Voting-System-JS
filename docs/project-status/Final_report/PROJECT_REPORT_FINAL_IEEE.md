# University Blockchain Voting System
## Master's Final Year Project Report (Final IEEE Draft)

Author: `[Your Name]`  
Student ID: `[Your ID]`  
Program: `[Program Name]`  
Department: `[Department Name]`  
University: `[University Name]`  
Supervisor: `[Supervisor Name]`  
Submission Date: `[Date]`

## Approval
Supervisor Signature: `________________`  
Date: `________________`

## Declaration
I declare that this report and the work described in it are my own, except where explicitly acknowledged by citation.

## Acknowledgement
I would like to thank my supervisor, faculty members, peers, and family for their guidance and support throughout this project.

---

## Abstract
This report presents the design, implementation, and validation of a University Blockchain Voting System developed as a Master's final year project. The system was built to provide secure, transparent, and auditable digital elections for university stakeholders. The implemented platform uses a multi-service architecture with a Vue.js voter frontend, a separate Vue.js admin panel, a Node.js/Express backend, MySQL for application data, and a permissioned blockchain node layer for vote transaction integrity.

Key security mechanisms include role-based authentication, double-vote prevention through registration-state and nullifier checks, transaction hash generation for vote traceability, and audit logging of critical events. Project records indicate full pass rates for key milestone tests: 11/11 and 13/13 in security-focused sessions on November 13, 2025, and 48/48 in admin/system validation on December 3, 2025. The latest status (December 30, 2025) documents the platform as fully operational with refined election-protection rules in the admin workflow.

The final outcome is a practical and deployable secure voting system for academic and controlled institutional contexts, with identified future improvements in scalability, monitoring depth, and extended governance tooling.

Keywords: e-voting, permissioned blockchain, election security, nullifier, audit logging, academic voting system.

---

## Table of Contents
1. Introduction  
2. Literature Review  
3. Requirement Analysis and System Design  
4. Implementation  
5. Testing and Evaluation  
6. Discussion  
7. Conclusion and Future Work  
References  
Appendices

## List of Figures
Figure 1: Overall System Architecture (to insert)  
Figure 2: Vote Submission and Validation Flow (to insert)  
Figure 3: Admin Panel Election Lifecycle Flow (to insert)  
Figure 4: Security Event Logging Flow (to insert)

## List of Tables
Table 1: Functional Requirement Mapping  
Table 2: Technology Stack  
Table 3: API and Security Enhancements (December 2025)  
Table 4: Test Result Summary  
Table 5: Limitations and Future Work Mapping

## Abbreviations
API: Application Programming Interface  
CORS: Cross-Origin Resource Sharing  
JWT: JSON Web Token  
PoW: Proof of Work  
PII: Personally Identifiable Information

---

## Chapter 1: Introduction

### 1.1 Background
The increasing digitalization of academic processes has created demand for secure and transparent online election systems. Traditional online voting models often raise concerns about trust, traceability, and election integrity. Blockchain-backed systems are frequently explored because they improve tamper evidence and provide stronger auditability [1], [3].

### 1.2 Problem Statement
Typical centralized web voting platforms can face concerns in the following areas:
- duplicate voting prevention,
- weak transparency and verifiable evidence,
- admin-side operational mistakes affecting election integrity,
- insufficient audit depth for forensic verification.

### 1.3 Aim
To design and implement a practical university voting platform with security-focused controls and auditable election workflows.

### 1.4 Objectives
- Build end-to-end voter and admin workflows.
- Enforce one-voter-one-vote controls.
- Record verifiable vote transaction evidence.
- Improve election lifecycle integrity through admin-side policy checks.
- Deploy the system in a repeatable Docker-based environment.

### 1.5 Scope
Included scope:
- Voter frontend and dedicated admin panel.
- Backend API and database layer.
- Permissioned blockchain node integration.
- Functional and security-focused testing.

Out-of-scope for this phase:
- full institutional SSO rollout,
- full legal and regulatory certification for public elections,
- very high-scale stress validation beyond project timeline.

### 1.6 Significance
This project contributes an implementation-level artifact, not only a conceptual model. It demonstrates how security controls can be integrated into real university election workflows with practical controls aligned to current API security guidance [6].

### 1.7 Chapter Summary
This chapter introduced the motivation, problem, objectives, and scope of the project.

---

## Chapter 2: Literature Review

### 2.1 Security Requirements for E-Voting
Secure e-voting systems generally require confidentiality, integrity, availability, authenticity, and auditability. In university contexts, ease of use is also critical to adoption [3], [5].

### 2.2 Blockchain in Institutional Voting
Permissioned blockchain models are often preferred over public chains for controlled governance, lower operational uncertainty, and institution-level policy enforcement [2], [4].

### 2.3 Threat Landscape
Common attack surfaces and operational risks include:
- duplicate vote attempts,
- unauthorized or misconfigured admin actions,
- endpoint abuse,
- incomplete activity logging,
- weak election lifecycle policy enforcement.
These risks map directly to modern API threat classes such as broken authorization, unrestricted resource usage, and security misconfiguration [6].

### 2.4 Identified Gap and Project Positioning
Many prototypes stop at early proof-of-concept phases. This project addresses that gap by integrating:
- operational admin UI and API alignment,
- duplicate-vote controls,
- audit and transaction evidence handling,
- containerized deployment with documented status milestones.
The implementation and milestone evidence are documented across project status records and source artifacts [7]-[11].

### 2.5 Chapter Summary
This chapter positions the project in relation to practical e-voting security requirements and current implementation gaps seen in many prototypes.

---

## Chapter 3: Requirement Analysis and System Design

### 3.1 Functional Requirements
Table 1 maps core requirements to delivered implementation.

| Requirement | Description | Implementation Status |
|---|---|---|
| FR-1 | User/admin authentication and authorization | Implemented |
| FR-2 | Election and candidate management | Implemented |
| FR-3 | Vote submission validation | Implemented |
| FR-4 | Duplicate voting prevention | Implemented |
| FR-5 | Audit visibility for admin/security events | Implemented |
| FR-6 | Election lifecycle protection rules | Implemented |

### 3.2 Non-Functional Requirements
- Security: endpoint protection, integrity checks, audit evidence.
- Reliability: multi-service operational health in Docker setup.
- Maintainability: separated admin panel and modular service boundaries.

### 3.3 System Architecture
The implemented architecture contains:
- Voter frontend (`:5173`)
- Admin panel (`:5174`)
- Backend API (`:3000`)
- MySQL (`:3306`)
- phpMyAdmin (`:8080`)
- Blockchain nodes (`3001-3005`)

Figure 1: Overall architecture diagram to insert.

Deployment profiles identified from implementation files:
- `docker-compose.yml`: 6 core services (`mysql`, `phpmyadmin`, `blockchain-node`, `backend`, `frontend`, `admin-panel`)
- `docker-compose.multi-node.yml`: 6 services for distributed blockchain testing (`mysql` + 5 blockchain nodes)
- `docker-compose.monitoring.yml`: 7 monitoring/logging services (`prometheus`, `grafana`, `cadvisor`, `node-exporter`, `mysql-exporter`, `loki`, `promtail`)
These service profiles are defined directly in project deployment files [11]-[13].

### 3.4 Security Design Decisions
- Layered duplicate-vote prevention.
- Transaction hash capture for traceability.
- Admin operation audit logging.
- Lifecycle policy checks on update, delete, and vote endpoints.
These controls are implemented in backend middleware/routes and blockchain service logic [14]-[17].

### 3.5 Process Design
Figure 2: Vote submission and validation flow to insert.  
Figure 3: Admin election lifecycle policy flow to insert.

### 3.6 Chapter Summary
This chapter translated project requirements into a concrete architecture and process design.

---

## Chapter 4: Implementation

### 4.1 Technology Stack
Table 2 summarizes the implementation stack.

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Vite |
| Admin panel | Vue 3, Pinia |
| Backend | Node.js, Express |
| Database | MySQL 8 |
| Deployment | Docker Compose |
| Supporting | phpMyAdmin, blockchain node services |

### 4.2 Core Modules
- Authentication and role-aware access control.
- Election and candidate CRUD.
- Vote validation and metadata handling.
- Admin audit log integration.
- Election lifecycle protection logic.

Code-level endpoint inventory (implemented in route files):
- Total route definitions across `users.js` and `elections.js`: 21
- User routes: register, login, current user profile (`/me`)
- Election routes: listing, detail, registration, vote casting, status updates, election update/delete
- Admin routes: aggregated election view, audit logs, security logs, audit integrity verification
Endpoint and control behavior is traceable in backend and admin store source files [14]-[18].

### 4.3 Late-Phase Engineering Changes
Table 3 captures key December 2025 improvements.

| Item | Change | Effect |
|---|---|---|
| Audit endpoints | Fixed endpoint paths in admin panel | Restored audit features |
| CORS policy | Added `PATCH` to allowed methods | Enabled status toggles |
| Election update | Added `PUT /api/elections/:id` flow | Prevented duplicate-create behavior on edit |
| Protection rules | Added/refined start/end-date and status checks | Improved data integrity and safety |

### 4.4 Key Endpoints (Implemented/Enhanced)
- `PUT /api/elections/:id`
- `DELETE /api/elections/:id`
- `POST /api/elections/:id/vote`

### 4.5 Deployment Configuration
Runtime setup used Dockerized services, with documented local URLs and service-level health checks.

Database implementation details:
- Migration runner executes SQL migrations in sequence (`backend/migrate.js`)
- Initial schema defines 13 tables in `001_initial_schema.sql`
- Core operational tables include: `users`, `elections`, `candidates`, `voter_registrations`, `votes_meta`, `vote_receipts`, `audit_logs`, `nodes`
- Extended/security-governance tables include: `blind_tokens`, `threshold_key_shares`, `tally_partial_decryptions`, `system_config`, `schema_migrations`
Schema and migration details are captured in the backend migration system [19].

### 4.6 Chapter Summary
This chapter described the implemented modules and key engineering changes that stabilized the final operational state.

---

## Chapter 5: Testing and Evaluation

### 5.1 Testing Strategy
Testing followed milestone sessions:
- security-critical workflow validation,
- admin panel functional validation,
- integration and service health verification.

### 5.2 Test Result Consolidation
Table 4 summarizes documented results.

| Date | Focus | Result |
|---|---|---|
| 2025-11-13 | Security test summary | 11/11 passed |
| 2025-11-13 | Final session suite | 13/13 passed |
| 2025-12-03 | Admin/system test coverage | 48/48 passed |
These results are consolidated from dated project test and launch documentation [8]-[10].

### 5.3 Key Verified Behaviors
- Double-vote attempts were rejected.
- Transaction hash generation and format were validated.
- Audit events were recorded for security-relevant operations.
- Admin panel election management workflows were functional.

Implementation evidence from source:
- Vote endpoint enforces registration-state checks and nullifier uniqueness checks before commit.
- Blockchain node vote endpoint generates deterministic SHA-256 transaction hash from vote payload fields.
- Admin panel stores use authenticated API calls for CRUD, status update, and audit operations.
Implementation evidence is available in source files for route logic, audit utilities, crypto helpers, and admin stores [14]-[18], [20].

### 5.4 Operational Status Evidence
Latest project status (2025-12-30) reports:
- all core services running,
- admin panel fully operational,
- no unresolved critical blocker documented.
This final status aligns with the source-of-truth and late-phase status files [7], [10].

### 5.5 Threat-to-Control Mapping
- Duplicate vote attempt -> voter status + nullifier checks.
- Admin misuse risk -> lifecycle protection rules.
- Missing forensic trail -> audit logging and endpoint support.
- API integration mismatch -> endpoint and CORS corrections.

### 5.6 Chapter Summary
Testing records show high confidence in the implemented scope, with repeated pass outcomes across security and admin domains.

---

## Chapter 6: Discussion

### 6.1 Major Achievements
- Delivered a working multi-service voting platform.
- Added layered anti-duplicate controls.
- Improved admin reliability with explicit policy gates.
- Produced traceable evidence through logs and transaction metadata.

### 6.2 Limitations
- Some roadmap items remain enhancement-stage.
- Evidence is based on recorded project sessions; a fresh full regression run is still recommended before final defense demonstration.
- Source code still contains explicit development-mode/legacy compatibility paths:
  - fallback cryptographic helpers in backend utility functions for legacy flows,
  - simplified signature-verification fallback path marked as development mode,
  - localStorage-based key persistence labeled as demo-only in frontend crypto service.
These limitations are directly visible in current source modules [16], [20].

### 6.3 Practical Contribution
The project demonstrates a transition from prototype-grade design to an operational system suitable for academic and controlled institutional contexts.

### 6.4 Chapter Summary
The project is strong in practical implementation and integrity controls, while still open to scaling and governance extensions.

### 6.5 Limitations and Future Work Mapping
Table 5 links major current limitations to planned improvements.

| Current Limitation | Impact | Future Work Direction |
|---|---|---|
| No fresh full regression run after all updates | Defense/demo risk | Run final end-to-end regression checklist before submission/demo |
| Limited high-concurrency benchmark evidence | Scalability uncertainty | Execute structured load testing and publish benchmark results |
| Institutional integration not fully expanded | Deployment dependency on local auth setup | Add full IdP/compliance integration plan and phased rollout |
| Advanced observability not fully expanded | Reduced operational insight at scale | Extend monitoring dashboards and alerting rules |

---

## Chapter 7: Conclusion and Future Work

### 7.1 Conclusion
The University Blockchain Voting System achieved the project's implemented objectives: secure workflow integration, election lifecycle safeguards, auditable operations, and stable deployment architecture. Based on consolidated status documents, the system reached an operational, launch-complete state by December 2025.

### 7.2 Future Work
- End-to-end high-concurrency performance benchmarking.
- Expanded observability and analytics dashboards.
- Extended governance and policy automation.
- Broader identity/compliance integration.
- Independent security review and penetration retesting.

---

## References (IEEE Style)
[1] S. Nakamoto, "Bitcoin: A Peer-to-Peer Electronic Cash System," 2008.  
[2] M. Castro and B. Liskov, "Practical Byzantine Fault Tolerance," in *Proc. 3rd Symp. Operating Systems Design and Implementation (OSDI)*, 1999.  
[3] B. Adida, "Helios: Web-based Open-Audit Voting," in *Proc. 17th USENIX Security Symp.*, 2008.  
[4] E. Androulaki *et al*., "Hyperledger Fabric: A Distributed Operating System for Permissioned Blockchains," in *Proc. 13th EuroSys Conf.*, 2018.  
[5] NIST, *Digital Signature Standard (DSS)*, FIPS PUB 186-5, Feb. 2023.  
[6] OWASP Foundation, *OWASP API Security Top 10 - 2023*, 2023.  
[7] Voting Project Team, "SOURCE_OF_TRUTH.md," `Project_Status/SOURCE_OF_TRUTH.md`, Dec. 2025.  
[8] Voting Project Team, "13_11_25_FINAL.md," `Project_Status/13_11_25_FINAL.md`, Nov. 2025.  
[9] Voting Project Team, "03_12_25_LAUNCH_COMPLETE.md," `Project_Status/03_12_25_LAUNCH_COMPLETE.md`, Dec. 2025.  
[10] Voting Project Team, "30_12_25.md," `Project_Status/30_12_25.md`, Dec. 2025.  
[11] Voting Project Team, "docker-compose.yml," source code, Dec. 2025.  
[12] Voting Project Team, "docker-compose.multi-node.yml," source code, Dec. 2025.  
[13] Voting Project Team, "docker-compose.monitoring.yml," source code, Dec. 2025.  
[14] Voting Project Team, "backend/routes/elections.js," source code, Dec. 2025.  
[15] Voting Project Team, "backend/routes/users.js," source code, Dec. 2025.  
[16] Voting Project Team, "backend/utils/crypto.js," source code, Dec. 2025.  
[17] Voting Project Team, "blockchain-node/index.js," source code, Dec. 2025.  
[18] Voting Project Team, "admin-panel/src/store/elections.js," source code, Dec. 2025.  
[19] Voting Project Team, "backend/migrations/001_initial_schema.sql," source code, Dec. 2025.  
[20] Voting Project Team, "frontend/src/services/crypto.js," source code, Dec. 2025.

---

## Appendices

### Appendix A: Deployment Commands
```bash
docker-compose up -d
docker ps
```

### Appendix B: Suggested Figure List for Final Submission
- Architecture screenshot/diagram
- Admin dashboard and election management views
- Vote flow and duplicate-vote rejection evidence
- Audit log verification interface

### Appendix C: Viva Preparation (Likely Questions)
Q1: Why use a permissioned blockchain instead of a public chain?  
Suggested answer: governance control, predictable performance, and institutional trust boundaries.

Q2: How is duplicate voting prevented?  
Suggested answer: layered checks using voter status and nullifier uniqueness.

Q3: What evidence proves vote integrity?  
Suggested answer: transaction hash records, audit logs, and documented test pass results.

Q4: What were your major late-stage fixes?  
Suggested answer: admin API endpoint corrections, CORS method update, election update endpoint, and lifecycle protection rules.

Q5: What remains before broad production rollout?  
Suggested answer: full-scale load testing, independent security audit, and extended compliance integration.

### Appendix D: Implementation Evidence Files Used
- `docker-compose.yml`
- `docker-compose.multi-node.yml`
- `docker-compose.monitoring.yml`
- `backend/index.js`
- `backend/routes/users.js`
- `backend/routes/elections.js`
- `backend/middleware/auth.js`
- `backend/middleware/rateLimiter.js`
- `backend/middleware/validation.js`
- `backend/migrations/001_initial_schema.sql`
- `backend/utils/auditLogger.js`
- `backend/utils/crypto.js`
- `frontend/src/services/crypto.js`
- `frontend/src/services/keyManager.js`
- `admin-panel/src/store/auth.js`
- `admin-panel/src/store/elections.js`
- `admin-panel/src/store/audit.js`
- `blockchain-node/index.js`
