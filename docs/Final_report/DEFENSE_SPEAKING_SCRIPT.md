# Defense Speaking Script (12-15 Minutes)

Use this as speaker notes aligned to `DEFENSE_SLIDES_OUTLINE.md`.

## Slide 1 - Title (30s)
"Good [morning/afternoon]. I am [Your Name], and this is my Master's final year project: University Blockchain Voting System. This work focuses on secure, transparent, and auditable digital elections for university settings."

## Slide 2 - Problem and Motivation (60s)
"Current online voting systems often face trust concerns: duplicate-vote risk, limited transparency, and weak forensic traceability. In a university context, we need practical security without making the system unusable. This project targets that balance by combining standard web architecture with permissioned blockchain-backed evidence."

## Slide 3 - Objectives (60s)
"I defined four core objectives: first, build complete voter and admin workflows; second, enforce one-voter-one-vote; third, record verifiable vote evidence; and fourth, deploy the platform in a reproducible way using Docker. These objectives kept implementation scope practical and measurable."

## Slide 4 - Literature and Positioning (75s)
"From literature, key e-voting requirements include confidentiality, integrity, authenticity, and auditability. Permissioned blockchain is better suited than public blockchain for institutional control and predictable operation. A common gap in prior student-scale systems is operational incompleteness. My project addresses that by implementing and validating full workflows, not only a concept demo."

## Slide 5 - System Architecture (75s)
"The architecture has six core services: voter frontend, admin panel, backend API, MySQL, phpMyAdmin, and blockchain node. I also prepared multi-node and monitoring compose profiles for extended testing. This separation improves maintainability and allows independent scaling and debugging."

## Slide 6 - Security Design (90s)
"Security controls are layered. Authentication and authorization protect access. Input validation and rate limiting reduce abuse. CORS is restricted to known origins. For vote integrity, duplicate voting is blocked by registration-state checks and nullifier uniqueness checks. Admin-sensitive actions are tracked through audit logs with integrity verification."

## Slide 7 - Data and Blockchain Flow (90s)
"The voter registers for an election, receives eligibility state, and submits a protected vote package. The backend validates election state, voter registration, and nullifier uniqueness before accepting. The blockchain service generates a deterministic transaction hash from vote payload data and returns a receipt. This gives traceability without exposing ballot content."

## Slide 8 - Implementation Highlights (75s)
"Implementation includes robust route coverage across user, election, and admin operations. Election lifecycle controls prevent unsafe update or delete behavior in critical states. The schema contains 13 tables, including operational data, audit records, and governance-oriented structures for future cryptographic expansion."

## Slide 9 - Testing and Results (90s)
"Results were strong across milestone sessions. On November 13, 2025, security and final session suites passed 11 out of 11 and 13 out of 13 tests. On December 3, 2025, admin/system validation passed 48 out of 48 tests. Project records on December 30, 2025 show the platform in a launch-complete operational state."

## Slide 10 - Challenges and Fixes (75s)
"Late-stage issues included admin API endpoint mismatches, CORS method gaps, and an election edit flow problem. I resolved these by aligning endpoint paths, adding PATCH to allowed methods, implementing a correct PUT update route, and tightening lifecycle guards. These fixes directly improved reliability and safety."

## Slide 11 - Limitations and Future Work (75s)
"Current limitations include the need for a fresh full regression run after all updates, limited high-concurrency benchmark evidence, and development-mode compatibility paths that should be hardened before wider deployment. Future work includes load testing, stronger key custody options, expanded monitoring, and institutional SSO/compliance integration."

## Slide 12 - Conclusion and Q&A (45s)
"In conclusion, the project achieved its intended scope: a practical and secure university voting platform with auditable operations and deployable architecture. It moves beyond prototype-level design and provides a strong foundation for production-grade extension. Thank you, and I welcome your questions."

## Fast Answers for Common Viva Questions
- Why permissioned blockchain?
"Governance control, predictable performance, and controlled trust boundaries."
- How do you prevent double voting?
"Layered checks: voter status plus nullifier uniqueness before commit."
- What proves integrity?
"Deterministic transaction hash receipts plus audit logs and test records."
- What would you improve first?
"Comprehensive regression and load testing, then stronger key management."
