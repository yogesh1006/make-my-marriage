# Make My Marriage — Product Requirements Document (PRD)

**Release:** MVP / V1  
**Status:** Approved product baseline  
**Product:** Make My Marriage

---

## 1. Product Overview

Make My Marriage is a collaborative wedding-management web application designed primarily for the **bride and groom** to plan and manage an Indian wedding from one centralized platform.

Indian weddings typically involve multiple events, hundreds of guests, several family members, vendors, expenses, invitations, schedules, photos, and continuous coordination. Today, much of this planning happens across disconnected tools such as WhatsApp groups, Excel or Google Sheets, notes, phone calls, email, Google Drive, and individual vendor conversations.

Make My Marriage brings the major wedding-planning activities into one shared digital workspace. The couple owns the wedding workspace and can invite trusted people as **Managers** to help coordinate the wedding. Guests do not need accounts; they interact through invitation links, the wedding website, RSVP forms, livestreams, and photo-upload pages.

## 2. Product Vision

> **Make My Marriage should become the central digital workspace from which a couple and their trusted wedding managers can organize, coordinate, communicate, and preserve their wedding experience.**

The V1 product lifecycle is:

**Create → Organize → Manage → Invite → RSVP → Celebrate → Capture → Remember**

## 3. Problem Statement

Wedding planning, particularly for Indian weddings, involves many simultaneous activities:

- Multiple ceremonies and venues
- Hundreds of guests
- Numerous vendors
- Large numbers of tasks
- Family coordination
- Expense tracking
- Invitations and RSVP management
- Wedding website information
- Photography
- Livestreaming

Information frequently becomes fragmented across spreadsheets, WhatsApp chats, notes, phone calls, and multiple devices. Make My Marriage addresses this by creating **one shared wedding workspace**.

## 4. Product Goals

The V1 product should allow a couple to:

1. Create their wedding workspace.
2. Invite trusted people to help manage the wedding.
3. Create and manage multiple wedding events.
4. Track wedding-related tasks.
5. Maintain the wedding guest list.
6. Organize guests into families or households.
7. Send digital invitations.
8. Share invitations through email, links, or WhatsApp sharing.
9. Collect guest RSVPs without requiring guest accounts.
10. Track wedding expenses.
11. Maintain basic vendor information.
12. Discover nearby wedding vendors.
13. Publish a wedding website.
14. Select from predefined wedding website themes.
15. Configure a wedding livestream.
16. Upload and organize wedding photographs.
17. Allow guests to contribute photographs without logging in.
18. Provide QR codes for convenient guest interactions.

## 5. Non-Goals for V1

Make My Marriage V1 will **not** include:

- Complex role-based access control
- Individual permissions for each Manager
- Feature-level privacy configuration
- Budget forecasting or fixed wedding budget allocation
- Budget-versus-actual reporting
- Payment processing or payment gateways
- WhatsApp Business API integration
- Automated WhatsApp messaging
- SMS integration
- Vendor booking, payments, or marketplace transactions
- Vendor accounts
- Professional wedding-planner SaaS
- Multiple-client planner dashboards
- Accommodation management
- Transportation management
- Seating planner
- Gift registry
- Honeymoon planning
- AI wedding assistant
- AI photo recognition / face recognition
- Native video streaming
- Native mobile applications

These may be considered in future versions.

## 6. Target Users

### 6.1 Primary Users

- Bride
- Groom

They usually create and administer the wedding.

### 6.2 Secondary Users

Trusted people helping the couple manage the wedding, such as:

- Parents
- Siblings
- Cousins
- Close friends
- Wedding coordinators
- Trusted family members

Within the application, these users are called **Managers**.

### 6.3 Guests

Guests are not registered application users. They should not need to sign up, create passwords, maintain profiles, or enter the management dashboard.

Guests may:

- View the wedding website
- View invitation and event information
- View venue information
- RSVP
- Watch the configured livestream
- View approved wedding photos
- Upload wedding photos

## 7. User Roles

Make My Marriage V1 has only two authenticated roles.

### 7.1 Admin

Admins have complete control over the wedding workspace. Usually the bride, groom, or primary wedding creator will be an Admin. Multiple Admins are allowed.

Admins can manage wedding details, events, tasks, guests, households, invitations, RSVPs, expenses, vendors, website themes, gallery, guest-photo moderation, livestreams, and the Wedding Team.

Admins can also:

- Invite Managers
- Remove Managers
- Promote Manager → Admin
- Demote Admin → Manager

### 7.2 Manager

Managers receive almost complete operational access to the wedding.

Managers can manage:

- Wedding details
- Events
- Tasks
- Guests and households
- Invitations and RSVPs
- Expenses
- Vendors
- Wedding website and themes
- Photos and albums
- Guest-photo moderation
- Livestream configuration

Managers cannot:

- Invite or remove Managers
- Promote Managers
- Demote Admins
- Manage wedding membership

## 8. Authorization Model

| Capability | Admin | Manager |
|---|---:|---:|
| Dashboard | Yes | Yes |
| Wedding details | Yes | Yes |
| Events | Yes | Yes |
| Tasks | Yes | Yes |
| Guests / households | Yes | Yes |
| Invitations | Yes | Yes |
| RSVP | Yes | Yes |
| Expenses | Yes | Yes |
| Vendors | Yes | Yes |
| Wedding website / themes | Yes | Yes |
| Photos / albums | Yes | Yes |
| Livestream | Yes | Yes |
| Invite Manager | Yes | No |
| Remove Manager | Yes | No |
| Promote Manager | Yes | No |
| Demote Admin | Yes | No |
| Manage Wedding Team | Yes | No |

**Required safeguard:** every wedding must always have at least one Admin. The system must prevent actions that would leave a wedding without an Admin.

## 9. Core Product Model

```text
User
  │
  ▼
WeddingMembership
  │
  ├── ADMIN
  └── MANAGER
  │
  ▼
Wedding
  ├── Events
  ├── Tasks
  ├── Guests
  ├── Guest Families
  ├── Invitations
  ├── RSVPs
  ├── Expenses
  ├── Vendors
  ├── Wedding Website
  ├── Livestream
  ├── Photo Albums
  └── Photos
```

Guest-facing functionality sits outside the authenticated workspace:

```text
Guest
  ├── Invitation
  ├── Wedding Website
  ├── RSVP
  ├── Events
  ├── Location
  ├── Livestream
  ├── Gallery
  └── Photo Upload
```

## 10. Functional Requirements

### 10.1 Authentication

Registered users must be able to:

- Create an account
- Verify their email
- Log in and log out
- Reset a forgotten password
- Change their password
- Manage basic profile details
- Maintain secure authenticated sessions

Guests do not require authentication.

### 10.2 Wedding Creation & Setup

An Admin can create a wedding with:

- Bride name
- Groom name
- Wedding title
- Wedding date
- Wedding location
- Wedding description
- Couple image
- Cover image
- Expected guest count
- Wedding website slug

A newly registered user who creates a wedding becomes its first Admin automatically.

### 10.3 Wedding Team Management

The application provides a **Wedding Team** section. Admins can:

- View Admins and Managers
- Invite a Manager by email
- Remove a Manager
- Promote Manager → Admin
- Demote Admin → Manager

Rules:

- Managers cannot manage the Wedding Team.
- The final Admin cannot be removed or demoted.
- Duplicate membership should not be created.

### 10.4 Wedding Dashboard

The dashboard acts as the wedding command center.

Possible summary cards:

- Days remaining
- Number of events
- Number of guests
- RSVP responses / pending RSVP
- Total / pending / overdue / completed tasks
- Total recorded expenses
- Number of vendors
- Photo count

The dashboard should surface upcoming events, tasks due soon, overdue tasks, and quick actions such as Add Event, Add Task, Add Guest, Add Expense, and Add Vendor.

### 10.5 Event Management

A wedding may contain multiple events such as Engagement, Haldi, Mehendi, Sangeet, Wedding, and Reception.

Users can create, edit, delete, view, and list events.

Event properties:

- Event name
- Description
- Date
- Start/end time
- Venue name
- Address
- Map/location link
- Dress code
- Cover image
- Notes

Events should be reusable references across tasks, guests, expenses, vendors, livestreams, and photos.

### 10.6 Task Planner

Task properties:

- Title
- Description
- Associated event
- Assigned Admin/Manager
- Due date
- Priority
- Status
- Notes

Statuses:

- To Do
- In Progress
- Completed

Priorities:

- Low
- Medium
- High
- Urgent

Views include All Tasks, My Tasks, Upcoming, Overdue, Completed, and Tasks by Event. Task dependencies and workflow automation are excluded from V1.

### 10.7 Guest Management

Admins and Managers can:

- Add, edit, delete, search, and filter guests
- Assign guests to events
- Assign guests to a household/family
- View RSVP state

Guest data includes:

- Full name
- Email
- Phone
- Relationship
- Bride/Groom side
- City
- Household
- Invited events
- Notes

### 10.8 Guest Families / Households

Multiple guests can be grouped into one household, for example a Sharma Family with several members. Household grouping supports invitation management, RSVP, and family-level communication.

### 10.9 Invitations

V1 sharing channels:

1. Email
2. Copy invitation link
3. WhatsApp Share

Email invitations can be sent to selected guests or households and include wedding website and RSVP links.

Each invitation has a secure shareable URL.

WhatsApp Share opens WhatsApp / WhatsApp Web with a prefilled message and invitation URL. V1 does not integrate the WhatsApp Business API and does not track WhatsApp delivery.

### 10.10 RSVP

Guests can RSVP without creating an account. RSVP is **event-specific** rather than one generic wedding status.

Possible fields:

- Attending status
- Number attending
- Plus-one information
- Food preference
- Guest message

Admins and Managers can view invited, attending, not attending, pending, and event-wise RSVP information.

### 10.11 Expense Tracker

V1 includes an **Expense Tracker**, not a full budgeting platform. Users do not define a mandatory total wedding budget.

Users can:

- Add, edit, and delete expenses
- Associate an expense with an event and/or vendor
- Track total amount, amount paid, remaining amount, payment status, payment date, paid by, category, and notes
- Filter expenses

V1 does not provide budget limits, forecasting, allocation, variance reports, or optimization.

### 10.12 Vendor Management

**My Vendors** is intentionally lightweight.

Vendor properties:

- Vendor name
- Category
- Contact person
- Phone
- Email
- Location
- Associated events
- Notes

Expenses may reference vendors.

### 10.13 Nearby Vendor Discovery

A third-party places/maps service may help discover nearby photographers, caterers, venues, makeup artists, decorators, DJs, etc.

Users may add a discovered business to **My Vendors**.

V1 does not provide booking, quotation management, vendor payments, internal reviews, or vendor accounts.

### 10.14 Wedding Website

Each wedding receives a guest-facing website, for example `/w/yogesh-priya`.

Possible sections:

- Home
- Couple information
- Our story
- Events
- Venue / maps
- Schedule
- RSVP
- Gallery
- Livestream

The guest experience should be responsive and mobile-first.

### 10.15 Wedding Website Themes

Initial V1 themes:

1. Classical Indian
2. Minimal Elegant
3. Modern Celebration

Themes share the same wedding content model. Changing a theme changes presentation, not the underlying data.

Users can preview, apply, and switch themes.

### 10.16 Livestream

Make My Marriage will not host video. Admins and Managers configure an external YouTube livestream with:

- Title
- Event
- Streaming URL
- Date/time
- Description

The wedding website exposes the stream through an embed or Watch Live link.

### 10.17 Photo Gallery

Admins and Managers can:

- Upload photos
- View gallery
- Delete photos
- Download photos
- Create/manage albums
- Associate photos with events
- Approve/reject guest uploads

### 10.18 Event-Based Albums

Albums should preferably correspond to wedding events such as Engagement, Haldi, Mehendi, Sangeet, Wedding, and Reception.

### 10.19 Guest Photo Upload

Guests can contribute photos without login.

Flow:

```text
Wedding Website / QR
        ↓
Share Your Photos
        ↓
Select Event
        ↓
Select Photos
        ↓
Upload
        ↓
Pending Approval
        ↓
Approved / Rejected
```

Guest uploads are not automatically public.

### 10.20 QR Code Sharing

The application should generate QR codes for:

- Wedding website
- RSVP
- Guest photo upload

## 11. Privacy Model

V1 intentionally avoids complex privacy configuration.

### Internal Planning Workspace

Accessible only to authenticated Admins and Managers. It contains dashboard, tasks, guests, expenses, vendors, and Wedding Team information.

### Guest Experience

Accessible through guest-facing links and contains intended guest content such as website, events, venue, RSVP, gallery, livestream, and photo upload.

No per-field or per-section visibility permissions are included in V1.

## 12. Primary User Journey

```text
Sign Up
  ↓
Create Wedding
  ↓
Complete Wedding Setup
  ↓
Invite Manager(s)
  ↓
Create Events
  ↓
Create Tasks
  ↓
Add Guests / Families
  ↓
Add Vendors
  ↓
Track Expenses
  ↓
Configure Wedding Website + Theme
  ↓
Send Invitations
  ↓
Receive RSVP
  ↓
Track Wedding Progress
  ↓
Configure Livestream
  ↓
Upload / Moderate Photos
  ↓
Wedding Gallery
```

## 13. Manager Journey

```text
Receive Manager Invitation
        ↓
Sign Up / Login
        ↓
Join Wedding
        ↓
Dashboard
        ↓
Manage Events, Tasks, Guests, Invitations,
Expenses, Vendors, Website, Photos, Livestream
```

Managers do not see Wedding Team management controls.

## 14. Guest Journey

```text
Receive Invitation
        ↓
Open Invitation Link
        ↓
Wedding Website
        ↓
View Events / Venue
        ↓
RSVP
        ↓
Attend Wedding / Watch Livestream
        ↓
Scan QR / Open Gallery
        ↓
Upload Photos
        ↓
View Approved Gallery
```

No account creation is required.

## 15. Proposed Application Navigation

Authenticated navigation:

- Dashboard
- Wedding
- Events
- Tasks
- Guests
- Invitations
- Expenses
- Vendors
- Website
- Photos
- Livestream

Admin-only:

- Wedding Team

General:

- Profile
- Settings
- Logout

## 16. Proposed Major Screens

### Authentication

- Sign Up
- Login
- Email Verification
- Forgot Password
- Reset Password

### Wedding Setup

- Create Wedding
- Wedding Setup
- Edit Wedding

### Dashboard

- Wedding Dashboard

### Wedding Team

- Team Members
- Invite Manager
- Change Role

### Events

- Event List
- Create Event
- Event Details
- Edit Event

### Tasks

- Task List
- Create Task
- Edit Task
- My Tasks

### Guests

- Guest List
- Add/Edit Guest
- Family/Household
- Guest Details

### Invitations / RSVP

- Invitation Management
- Email Invitation
- Share Invitation
- Invitation Preview
- RSVP Dashboard
- Guest RSVP Page

### Expenses / Vendors

- Expense List / Add / Edit
- My Vendors / Add Vendor / Vendor Details
- Nearby Vendors

### Wedding Website

- Website Editor
- Theme Selection
- Website Preview
- Public Wedding Website

### Photos / Livestream

- Gallery
- Event Album
- Upload Photos
- Pending Guest Photos
- Guest Upload Page
- Livestream Configuration
- Guest Livestream Page

## 17. Core Data Entities

- User
- Wedding
- WeddingMembership (`ADMIN | MANAGER`)
- Event
- Task
- Guest
- GuestFamily
- Invitation
- RSVP
- Expense
- Vendor
- WeddingWebsite
- Livestream
- PhotoAlbum
- Photo

## 18. Important Entity Relationships

```text
Wedding
  ├── WeddingMembership
  │     └── User
  ├── Events
  ├── Tasks
  │     ├── Event
  │     └── Assigned User
  ├── Guests
  │     └── GuestFamily
  ├── Invitations
  ├── RSVPs
  │     ├── Guest
  │     └── Event
  ├── Expenses
  │     ├── Event
  │     └── Vendor
  ├── Vendors
  ├── WeddingWebsite
  ├── Livestream
  │     └── Event
  ├── PhotoAlbums
  │     └── Event
  └── Photos
        └── PhotoAlbum
```

## 19. Important Business Rules

1. Every wedding must have at least one Admin.
2. Only Admins can manage wedding membership.
3. Managers cannot invite or remove other Managers.
4. Guests do not receive management accounts automatically.
5. Guest-facing actions work without login.
6. Expenses do not require a predefined total wedding budget.
7. Vendor discovery does not equal vendor booking.
8. WhatsApp sharing is not WhatsApp API integration.
9. Livestreaming uses an external provider.
10. Guest photos require moderation before becoming public.
11. Events are reusable references across tasks, guests, expenses, livestreams, and albums.
12. Website themes share one content structure.

## 20. Non-Functional Requirements

### Responsive Design

Support desktop, tablet, and mobile. Guest-facing experiences should be mobile-first.

### Performance

Particular attention should be given to dashboard, guest list, wedding website, photo gallery, and uploads. Images must be optimized rather than always serving full-resolution originals.

### Security

- Secure authentication and sessions
- Protect internal wedding data
- Server-side authorization
- Validate uploaded files
- Restrict unauthorized wedding access
- Use non-guessable guest/invitation identifiers
- Secure photo uploads
- Prevent last-Admin removal

Frontend permission checks never replace backend authorization.

### Reliability

Provide clear failure states for invitation email failures, photo uploads, vendor API failures, livestream URL issues, and network failures.

### Accessibility

Aim for accessible labels, keyboard navigation, semantic HTML, color contrast, buttons/links, and error messages.

## 21. Search & Filtering Expectations

### Guests

- Name
- Family
- RSVP status

### Tasks

- Status
- Priority
- Event
- Assignee
- Due date

### Expenses

- Category
- Event
- Vendor
- Payment status

### Photos

- Event album
- Approval status

## 22. Notifications for V1

Email may be used for:

- Manager invitations
- Wedding invitations
- RSVP reminders
- Password reset
- Email verification

A sophisticated notification center is not required.

## 23. Success Metrics

Potential metrics include:

- Wedding creation and setup completion
- Managers invited per wedding
- Events/tasks created and completed
- Guests added and invitations sent
- RSVP response rate
- Wedding website/theme usage
- Photos uploaded and guest contributions
- Weekly returning Admin/Manager users during active planning

## 24. MVP Success Definition

The couple should be able to say:

> **“We can manage our wedding events, tasks, guests, invitations, expenses, vendors, website, livestream, and photos from one shared application instead of maintaining separate spreadsheets, notes, and tools.”**

A guest should be able to say:

> **“I can receive the invitation, view wedding information, RSVP, watch the livestream, and upload photos without installing an app or creating an account.”**

## 25. V2 Candidate Features

- WhatsApp Business integration
- SMS reminders
- Scheduled guest reminders
- RSVP follow-up automation
- Accommodation / hotel room allocation
- Transportation and pickup planning
- Detailed wedding-day timeline
- More invitation templates / animated invitations
- Regional-language invitations
- Advanced gallery controls / high-resolution options
- Advanced email communication
- Improved vendor discovery
- Advanced expense reporting
- Optional overall wedding budget

## 26. V3 Candidate Features

### AI Wedding Assistant

Possible questions/actions:

- What tasks are overdue?
- Which guests have not RSVP'd?
- Which expenses remain unpaid?
- What should we focus on this week?
- Create a Haldi checklist.
- Draft an invitation reminder.

### AI Photo Intelligence

- Find photos of me
- Face recognition
- Automatic albums
- Duplicate detection
- Similar-photo grouping
- Best-photo suggestions
- Automatic event classification

### Vendor Marketplace

- Vendor profiles
- Reviews
- Availability
- Pricing
- Shortlisting
- Quotation requests
- Booking
- Marketplace payments

### Professional Wedding Planner Platform

Future B2B capability for planners managing multiple weddings.

## 27. Product Principles

1. **Keep collaboration simple:** only Admin and Manager authenticated roles.
2. **Guests should experience zero friction:** links/QRs, no accounts.
3. **Events are central:** many domains reference Event.
4. **Avoid building specialized platforms unnecessarily:** Make My Marriage is not accounting software, a payment gateway, a streaming provider, a full vendor marketplace, or a WhatsApp provider.
5. **Build one connected wedding experience:** modules should work together rather than behave like isolated tools.

## 28. Final MVP Scope

1. Authentication
2. Wedding Setup
3. Wedding Dashboard
4. Wedding Team (Admin + Manager)
5. Event Management
6. Task Planner
7. Guest Management
8. Guest Family / Household Management
9. Digital Invitations
10. Email Invitations
11. Shareable Invitation Links
12. WhatsApp Share
13. RSVP Management
14. Expense Tracker
15. My Vendors
16. Nearby Vendor Discovery
17. Wedding Website
18. Wedding Website Themes
19. Livestream Configuration
20. Photo Gallery
21. Event Albums
22. Guest Photo Upload
23. Photo Moderation
24. QR Sharing

## 29. Final Core Product Statement

> **Make My Marriage allows a bride and groom, together with trusted Wedding Managers, to collaboratively manage the operational side of an Indian wedding while providing guests with a simple, no-login digital experience for invitations, RSVP, wedding information, livestreams, and shared memories.**

Core philosophy:

> **The couple and their trusted Managers manage everything together. Guests simply experience the wedding.**

## 30. MVP Product Flow

```text
CREATE
Wedding
  ↓
ORGANIZE
Events + Tasks + Managers
  ↓
MANAGE
Guests + Expenses + Vendors
  ↓
INVITE
Email + Link + WhatsApp Sharing
  ↓
ENGAGE
Wedding Website + RSVP
  ↓
CELEBRATE
Livestream
  ↓
CAPTURE
Couple + Managers + Guests
  ↓
REMEMBER
Wedding Gallery
```

## 31. Feature Implementation Planning — MVP V1

The phases below are **development phases within V1**, not separate product versions.

### Phase 1 — Project Foundation & Authentication

**Objective:** establish the technical foundation and secure user access.

Features:

- Frontend/backend/database setup
- Environment configuration
- Basic layout
- Sign up / login / logout
- Email verification
- Forgot/reset password
- User profile
- Protected routes

Key entity: `User`.

### Phase 2 — Wedding Creation & Wedding Team

**Objective:** create the wedding workspace and collaboration model.

Features:

- Create/edit wedding
- `WeddingMembership`
- Admin / Manager roles
- Wedding Team screen
- Invite/accept Manager
- Remove Manager
- Promote/demote roles
- Last-Admin protection

Key entities: `Wedding`, `WeddingMembership`, `User`, `TeamInvitation`.

### Phase 3 — Events & Core Dashboard

**Objective:** establish Events as the central wedding structure.

Features:

- Event CRUD
- Dates/times/venue/dress code/images/notes
- Initial dashboard
- Countdown / event count / upcoming events / quick actions

### Phase 4 — Task Planner

Features:

- Task CRUD
- Assignment
- Event link
- Due dates
- Status / priority
- My Tasks / upcoming / overdue / completed / filters
- Dashboard task metrics

### Phase 5 — Guest & Household Management

Features:

- Guest CRUD/search/filter
- Bride/Groom side / relationship / city / notes
- Event assignment
- Household CRUD and members
- Guest-count dashboard metrics

### Phase 6 — Expense Tracker & My Vendors

Features:

- Expense CRUD/categories/event/vendor/payment fields/filters
- My Vendors CRUD/category/contact/event links/notes
- Dashboard total-expense and vendor metrics

### Phase 7 — Wedding Website & Themes

Features:

- Public wedding URL
- Couple story / events / venue / maps / schedule
- Responsive guest experience
- Classical Indian / Minimal Elegant / Modern Celebration themes
- Preview / apply / switch theme

### Phase 8 — Invitations & RSVP

Features:

- Invitations and personalized secure links
- Email invitation
- Copy link
- WhatsApp Share
- Guest RSVP without login
- Event-specific RSVP / plus-one / food preference / message
- RSVP dashboard and reminder emails

### Phase 9 — Livestream & QR Sharing

Features:

- YouTube livestream configuration
- Event association / title / description / schedule
- Wedding website display
- QR codes for website, RSVP, and photo upload

### Phase 10 — Photo Gallery & Guest Photo Upload

Features:

- Photo upload/view/download/delete
- Event albums
- Guest no-login upload
- Moderation: `PENDING → APPROVED | REJECTED`
- Gallery and dashboard counts

### Phase 11 — Nearby Vendor Discovery

Features:

- Location/category search using a places/maps API
- Photographers / caterers / venues / makeup / decorators / DJs
- Basic location/rating information where available
- Add discovered business to My Vendors

Explicitly excludes booking, payment, quotations, vendor accounts, internal reviews, and marketplace behavior.

## 32. Phase Dependency Overview

```text
Phase 1  Foundation + Authentication
   ↓
Phase 2  Wedding + Team
   ↓
Phase 3  Events + Dashboard
   ↓
Phase 4  Tasks
   ↓
Phase 5  Guests + Families
   ├───────────────┐
   ↓               ↓
Phase 6         Phase 7
Expenses        Wedding Website
+ Vendors          ↓
               Phase 8
               Invitations + RSVP
                  ↓
               Phase 9
               Livestream + QR
                  ↓
               Phase 10
               Photo Gallery
                  ↓
               Phase 11
               Vendor Discovery
```

## 33. Recommended MVP Milestones

### Milestone 1 — Wedding Planning Core

Phases 1–4: Authentication, Wedding/Team, Events/Dashboard, Tasks.

### Milestone 2 — Wedding Operations

Phases 5–6: Guests/Households, Expenses/Vendors.

### Milestone 3 — Guest Experience

Phases 7–9: Wedding Website, Invitations/RSVP, Livestream/QR.

### Milestone 4 — Wedding Memories

Phase 10: Photo Gallery and Guest Upload.

### Milestone 5 — MVP Enhancement

Phase 11 plus performance, accessibility, security review, responsive refinement, error states, end-to-end testing, and production deployment preparation.

## 34. Implementation Planning Principle

The implementation phases define **development priority, not separate product versions**. All phases belong to Make My Marriage MVP V1.

The implementation philosophy is:

> **Build the wedding-management foundation first, then operational features, then the guest experience, and finally the wedding-day and memory-sharing experience.**
