# Defense Slides Outline

Target duration: 12-15 minutes, ~12 slides.

## Slide 1: Title
- University Blockchain Voting System
- Your name, student ID, department, supervisor
- Date

## Slide 2: Problem and Motivation
- Trust and integrity issues in conventional online voting
- Need for auditability and duplicate-vote prevention
- University-focused scope

## Slide 3: Objectives
- Build end-to-end voter + admin workflow
- Enforce one-voter-one-vote
- Provide traceable vote evidence
- Deploy in reproducible Docker environment

## Slide 4: Literature and Positioning
- E-voting security requirements
- Permissioned blockchain suitability
- Gap: many prototypes are not operationally complete
- Your contribution: implementation-driven system

## Slide 5: System Architecture
- Frontend, Admin panel, Backend, MySQL, Blockchain node(s)
- Ports and interaction flow
- Mention compose profiles (core, multi-node, monitoring)

## Slide 6: Security Design
- Authentication + authorization
- Layered duplicate-vote prevention
- Audit logging with integrity checks
- API hardening (CORS, rate limiting, validation)

## Slide 7: Data and Blockchain Flow
- Registration to vote
- Vote package submission
- Nullifier uniqueness check
- Transaction hash generation and receipt

## Slide 8: Implementation Highlights
- Route coverage (users + elections)
- Election lifecycle protections (update/delete/status checks)
- Database schema breadth (13 tables)

## Slide 9: Testing and Results
- 11/11 passed (security session, Nov 13, 2025)
- 13/13 passed (final session, Nov 13, 2025)
- 48/48 passed (admin/system, Dec 3, 2025)
- Operational status confirmed Dec 30, 2025

## Slide 10: Challenges and Fixes
- Admin endpoint path mismatches
- CORS method update for PATCH
- Election update flow fix (PUT)
- Policy guard refinements

## Slide 11: Limitations and Future Work
- Fresh full regression recommended
- Load/performance benchmark expansion
- Stronger key management and security hardening
- Compliance/SSO integration roadmap

## Slide 12: Conclusion and Q&A
- Objectives achieved within project scope
- Practical deployable academic voting platform
- Invite questions

## Optional Backup Slides
- API endpoint summary
- Security threat-to-control mapping
- Demo screenshots
- Viva Q&A quick answers
