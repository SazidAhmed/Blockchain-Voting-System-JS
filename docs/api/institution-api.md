# Institution API

Express 4 · Port 4000 · MySQL 8.0

Mock directory service for voter registration. Provides the institutional member database that the backend queries during user registration.

## Base URL

```text
http://localhost:4000
```

## Error Response Shape

```json
{ "message": "error description" }
```

Unhandled errors return 500 via `middleware/errorHandler.js`.

---

## Health

### `GET /api/health`

**Auth:** none

**Response 200:**

```json
{ "status": "ok", "members": 500 }
```

---

## Members

### `GET /api/members`

List members with pagination and optional filtering.

**Auth:** none

**Query Parameters:**

| Param   | Type    | Default | Description                        |
| ------- | ------- | ------- | ---------------------------------- |
| `page`  | int     | 1       | Page number                        |
| `limit` | int     | 50      | Items per page (max 200)           |
| `role`  | string  | —       | Filter: student, teacher, staff    |
| `voter` | boolean | —       | Filter: true (voters), false (non) |

**Response 200:**

```json
{
  "members": [
    {
      "id": 1,
      "institution_id": "STU00001",
      "full_name": "John Smith",
      "email": "john.smith1@university.edu",
      "role": "student",
      "department": "Computer Science",
      "year_level": "1st Year",
      "is_voter": 0
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 500, "pages": 10 },
  "stats": { "total": 500, "voters": 120, "available": 380 }
}
```

### `POST /api/members`

Create a new member record.

**Auth:** none

**Body:**

```json
{
  "institution_id": "STU00001",
  "full_name": "John Smith",
  "email": "john.smith1@university.edu",
  "role": "student",
  "department": "Computer Science",
  "year_level": "1st Year"
}
```

`role` must be one of: `student`, `teacher`, `staff`.

**Response 201:** Full member record.

### `PUT /api/members/:institutionId`

Update a member's details. Same body as POST.

**Auth:** none

**Response 200:** Updated member record.

### `PATCH /api/members/:institutionId/voter`

Mark or unmark a member as a registered voter. Called by backend during registration.

**Auth:** none

**Body:** `{ "is_voter": true }`

**Response 200:** `{ "institutionId": "STU00001", "is_voter": true }`

### `DELETE /api/members/:institutionId`

Delete a member. Fails with 409 if the member is already marked as a voter.

**Auth:** none

---

## Lookup & Search

### `GET /api/lookup/:institutionId`

Look up a single member by institution ID. Used by backend during OTP and registration flows.

**Auth:** none

**Response 200:**

```json
{
  "institutionId": "STU00001",
  "fullName": "John Smith",
  "email": "john.smith1@university.edu",
  "role": "student",
  "department": "Computer Science",
  "year": "1st Year",
  "isVoter": false
}
```

### `GET /api/search`

Search members by institution ID or full name.

**Auth:** none

**Query:** `?q=John` (minimum 2 characters)

**Response 200:**

```json
{
  "results": [
    {
      "institution_id": "STU00001",
      "full_name": "John Smith",
      "email": "...",
      "role": "student",
      "department": "...",
      "year_level": "1st Year",
      "is_voter": 0
    }
  ]
}
```

---

## Voter Picker Tool

### `GET /voter-picker`

Returns an HTML page that renders a browser-based member browser with filtering, search, and pagination. Provides a developer-friendly way to pick an unused member ID for registration testing.

**Auth:** none

**Response 200:** `text/html`

The page auto-refreshes every 10 seconds and includes direct links to the frontend registration page and admin panel.

---

## Seed Data

`config/seed.js` generates 500 members:

| Role    | Count | ID Pattern          | Domain                  |
| ------- | ----- | ------------------- | ----------------------- |
| Student | 350   | STU00001–STU00350   | @university.edu         |
| Teacher | 100   | TEACH0001–TEACH0100 | @faculty.university.edu |
| Staff   | 50    | STAFF0001–STAFF0050 | @staff.university.edu   |

Seeded in batches of 50 rows per insert. Departments and names are randomly selected from predefined lists.

## Database

`config/database.js` initializes the `institution_members` table (with retry logic — up to 15 attempts, 3s apart, exits on failure). Table schema:

| Column           | Type         | Notes                     |
| ---------------- | ------------ | ------------------------- |
| `id`             | INT PK       | AUTO_INCREMENT            |
| `institution_id` | VARCHAR(50)  | UNIQUE, upper-cased       |
| `full_name`      | VARCHAR(255) |                           |
| `email`          | VARCHAR(255) | UNIQUE                    |
| `role`           | ENUM         | student, teacher, staff   |
| `department`     | VARCHAR(255) |                           |
| `year_level`     | VARCHAR(50)  | Nullable (teachers/staff) |
| `is_voter`       | BOOLEAN      | Default 0                 |
