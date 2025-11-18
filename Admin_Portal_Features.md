# Admin Portal Features

## Overview

The Admin Portal is a comprehensive management interface for administrators to create, manage, and monitor elections. It provides full control over the voting system with real-time statistics and analytics.

**Access:** `/admin/dashboard` (Admin role required)

---

## Features

### 1. Elections Management

#### View All Elections
- **Table Display** showing:
  - Election Title
  - Current Status (Active/Pending/Completed)
  - Start & End Dates
  - Number of Candidates
  - Total Votes Received
  - Action Buttons

#### Election Actions
- **Edit Election** - Modify election details
- **Activate/Deactivate** - Control election voting status
- **Delete Election** - Remove election and all related data

#### Status Management
- **Pending** - Not yet open for voting
- **Active** - Open for voting (voters can participate)
- **Completed** - Voting has ended

---

### 2. Create New Election

#### Election Form Fields
- **Title** (required) - Election name
- **Description** - Election details and context
- **Start Date & Time** (required) - When voting begins
- **End Date & Time** (required) - When voting ends
- **Candidates** (required) - Add multiple candidates

#### Candidate Management While Creating
- Add candidate name and description
- Dynamically add/remove candidates
- Minimum 1 candidate required
- No maximum limit

#### Election Creation
- Generates unique cryptographic keys for vote encryption
- Auto-sets status to "pending" (requires activation)
- Real-time validation of dates and fields
- Success confirmation with election details

---

### 3. Manage Candidates

#### Select Election
- Dropdown to choose an election
- View all candidates for selected election

#### Candidate Details
- Candidate name and description
- Vote count for each candidate
- Delete individual candidates

#### Add Candidates to Existing Elections
- Quick form to add new candidates
- Candidate name and description fields
- Add candidate without recreating election

#### Candidate Removal
- Remove candidates from any election
- Cascading deletion of associated data

---

### 4. Results & Statistics

#### Election Selection
- Dropdown showing all elections
- Display vote count in selection

#### Vote Overview Cards
- **Total Votes** - Total votes cast in election
- **Registered Voters** - Total eligible voters
- **Participation Rate** - Percentage of registered voters who voted

#### Vote Distribution Chart
- **Candidate Rankings** - Numbered by votes received
- **Vote Count** - Exact number of votes per candidate
- **Visual Bar Charts** - Proportional vote distribution
- **Percentage Display** - Vote percentage per candidate

#### Real-Time Statistics
- Auto-updating vote counts
- Live participation calculations
- Instant ranking changes as votes come in

---

## User Interface

### Navigation
- **Sidebar Navigation** - Access different sections
- **Tab-Based Layout** - Switch between management tasks
- **Color-Coded Status** - Visual status indicators

### Status Badge Colors
- 🟢 **Active** - Green (election is open)
- 🟡 **Pending** - Yellow (waiting to start)
- 🔵 **Completed** - Blue (voting ended)

### Buttons & Actions
- **Primary Actions** - Create, Update (Blue)
- **Warning Actions** - Activate/Deactivate (Orange)
- **Danger Actions** - Delete (Red)
- **Secondary Actions** - Cancel, Reset (Gray)

### Responsiveness
- Desktop-optimized layout
- Tablet-friendly interface
- Mobile adaptable design

---

## Security & Access Control

### Authentication
- **Admin-Only Access** - Requires admin role
- **JWT Token Verification** - Validates authorization
- **Auto-Redirect** - Non-admins redirected to home page
- **Session Protection** - Logout option available

### Data Protection
- Election data isolated by admin
- Vote integrity maintained
- Cryptographic keys generated securely
- All changes logged for audit

---

## Backend Integration

### API Endpoints

#### Get Elections (Admin)
```
GET /api/elections/admin/all
Authorization: Bearer <admin_token>
```
Returns all elections with statistics and candidates

#### Create Election
```
POST /api/elections
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "Election Title",
  "description": "Description",
  "startDate": "2025-11-20T00:00:00Z",
  "endDate": "2025-11-27T23:59:59Z",
  "candidates": [
    { "name": "Candidate 1", "description": "..." },
    { "name": "Candidate 2", "description": "..." }
  ]
}
```

#### Update Election Status
```
PATCH /api/elections/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "status": "active" }
```

#### Delete Election
```
DELETE /api/elections/:id
Authorization: Bearer <admin_token>
```

#### Add Candidate
```
POST /api/elections/:id/candidates
Authorization: Bearer <admin_token>
Content-Type: application/json

{ "name": "Candidate Name", "description": "..." }
```

#### Delete Candidate
```
DELETE /api/candidates/:id
Authorization: Bearer <admin_token>
```

---

## Workflow Examples

### Creating an Election

1. **Navigate** to Admin Dashboard → Create Election tab
2. **Fill Form:**
   - Title: "Student Council President 2025"
   - Description: "Vote for next student council president"
   - Start Date: Nov 20, 2025 at 10:00 AM
   - End Date: Nov 27, 2025 at 5:00 PM
3. **Add Candidates:**
   - Alice Johnson (Computer Science major)
   - Bob Smith (Business major)
   - Charlie Brown (Engineering student)
4. **Submit** - Election created in "Pending" status
5. **Activate** - Go to Elections tab, click "Activate"
6. **Voting Opens** - Students can now vote

### Managing an Active Election

1. **View Results** - Go to Results & Statistics tab
2. **Monitor Votes** - See real-time vote counts
3. **Check Participation** - View participation percentage
4. **Add Candidates** (if needed) - Use Manage Candidates tab
5. **Deactivate** - Stop voting by deactivating election

### After Election Ends

1. **View Final Results** - See complete vote distribution
2. **Export Data** - Final vote counts and statistics
3. **Archive Election** - Election status shows "Completed"
4. **Create Report** - Use vote percentages for documentation

---

## Key Features Summary

| Feature | Description | Status |
|---------|-------------|--------|
| Create Elections | Full election creation with candidates | ✅ |
| Edit Elections | Modify election details | ✅ |
| Manage Candidates | Add/remove candidates dynamically | ✅ |
| Activate Elections | Control voting availability | ✅ |
| Real-Time Results | Live vote counting and statistics | ✅ |
| Vote Analytics | Participation rates and distributions | ✅ |
| Status Management | Pending/Active/Completed states | ✅ |
| Security | Admin-only access control | ✅ |
| Data Integrity | Cascading deletions and validation | ✅ |
| UI/UX | Responsive and intuitive interface | ✅ |

---

## Technical Details

### Frontend Components
- **AdminDashboard.vue** - Main admin interface
- Vue 3 with Composition API ready
- Axios for API communication
- Responsive CSS Grid layout

### Backend Routes
- `elections.js` - All election management routes
- Admin authentication middleware
- Role-based access control
- Database transaction support

### Database Tables Used
- `elections` - Election master data
- `candidates` - Candidate information
- `votes_meta` - Vote records
- `voter_registrations` - Voter eligibility

---

## Future Enhancements

- 📊 Advanced analytics dashboard
- 📥 CSV/Excel export functionality
- 🔔 Email notifications for election events
- 📋 Bulk candidate import
- 🔍 Advanced search and filtering
- 📝 Election templates for recurring events
- 🎯 Custom result rules (majority, plurality, etc.)
- 📱 Mobile admin app

---

## Support

For admin portal issues or questions:
- Check browser console for errors
- Verify admin role assignment
- Ensure API endpoints are accessible
- Check authentication token validity

