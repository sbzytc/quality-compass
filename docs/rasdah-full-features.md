# Rasdah - Quality Management System
## Complete Features Document

---

## Overview

Rasdah is a comprehensive quality management platform designed for multi-branch organizations. It provides complete tools for evaluation, monitoring, and continuous improvement with intelligent dashboards and advanced analytical reports.

---

## 1. User & Role Management

### Available Roles:
| Role | Description |
|------|-------------|
| Admin | Full system administration access |
| Executive (GM) | Overview of all branch performance and executive reports |
| Branch Manager | Manage a specific branch, track findings and corrective actions |
| Quality Auditor | Conduct evaluations and record findings |
| Operations Staff | Execute assigned operational tasks |
| Branch Employee | Limited access for submitting support requests |
| Support Agent | Manage technical support tickets |

### User Management Features:
- ✅ Create and invite users via email
- ✅ Flexible role-based permission management
- ✅ Profile change requests with admin approval workflow
- ✅ Activate/deactivate user accounts
- ✅ Password reset functionality
- ✅ Link users to specific branches and regions

---

## 2. Branch & Region Management

- ✅ Add and edit branches with detailed info (address, city, region)
- ✅ Assign a manager to each branch
- ✅ Classify branches by geographic regions
- ✅ Activate/deactivate branches
- ✅ View branch details with full evaluation history
- ✅ Bilingual name support (Arabic & English)

---

## 3. Comprehensive Evaluation System

### Evaluation Templates:
- ✅ Create fully customizable evaluation templates
- ✅ Define evaluation periods (yearly, monthly, weekly)
- ✅ Organize evaluations into customizable categories
- ✅ Evaluation criteria per category with weights and scores
- ✅ Mark critical criteria that significantly impact results
- ✅ Template versioning with active version control

### Evaluation Process:
- ✅ Create new evaluations by selecting branch and template
- ✅ Save evaluations as drafts and return later to complete
- ✅ Score each criterion (0-5 or per template configuration)
- ✅ Add text notes for each criterion
- ✅ Attach photos and documents as evidence
- ✅ Automatic percentage calculation per category and overall
- ✅ Submit evaluations for review and approval
- ✅ Edit within 24 hours after submission
- ✅ Automatic archival of old evaluations

### Evaluation History:
- ✅ View all previous evaluations
- ✅ Filter by branch, period, and status
- ✅ Export evaluations
- ✅ Archive for completed evaluations

---

## 4. Findings & Non-Conformities Management

### Finding Lifecycle:
```
Open → In Progress → Pending Review → Resolved / Rejected
```

### Features:
- ✅ Automatic finding creation when low scores are recorded
- ✅ Assign findings to the responsible branch manager
- ✅ Set due dates for resolution
- ✅ Upload resolution notes with attachments
- ✅ Auditor review of submitted resolutions
- ✅ Reject resolutions with detailed reason
- ✅ Complete audit trail of all actions and changes
- ✅ Automatic notifications on every status change

---

## 5. Corrective Actions

- ✅ Link corrective actions to findings
- ✅ Assign responsible person for execution
- ✅ Set priority levels (low, medium, high)
- ✅ Track execution status
- ✅ Attach evidence of completion
- ✅ Due date and completion date tracking

---

## 6. Intelligent Dashboards

### CEO Dashboard:
- ✅ Comprehensive overview of all branch performance
- ✅ Key Performance Indicators (KPIs)
- ✅ Trend charts and analytics
- ✅ Branch performance comparison
- ✅ Alerts for underperforming branches

### Branch Manager Dashboard:
- ✅ Detailed branch performance view
- ✅ Open and pending findings
- ✅ Required corrective actions
- ✅ Latest evaluations and results

### Operations Dashboard:
- ✅ Assigned and pending tasks
- ✅ Daily completion tracking
- ✅ Operational reports

### Support Dashboard (Kanban):
- ✅ Kanban board view for all tickets
- ✅ Columns by status (Open, In Progress, Pending Close, Resolved, Closed)
- ✅ Drag-and-drop or quick-move buttons
- ✅ Live statistics (critical tickets, resolution rate, average resolution time)
- ✅ Advanced filters

---

## 7. Support Ticketing System

### Ticket Creation:
- ✅ Comprehensive ticket submission form
- ✅ Smart dropdown for screen selection (shows only screens accessible to the user's role)
- ✅ "Other" option with additional text input field
- ✅ Priority levels (Low, Medium, High, Critical)
- ✅ Attach images and files
- ✅ Team assignment (for support agents): Frontend, Backend, Database, IT, Security, Performance, UI/UX

### Ticket Management:
- ✅ Assign tickets to support agents
- ✅ Track status and updates
- ✅ Comments and reply system
- ✅ File attachments in comments
- ✅ Auto-archive closed tickets (after one week)

---

## 8. Reports & Analytics

- ✅ Branch performance reports
- ✅ Score analysis by category and criterion
- ✅ Performance comparison over time
- ✅ Findings and corrective actions reports
- ✅ Support ticket statistics
- ✅ Export reports

---

## 9. Notifications System

- ✅ Real-time in-app notifications
- ✅ Notifications triggered by:
  - New evaluation submission
  - New finding created
  - Finding status change
  - Approaching due dates
  - New comments on tickets
- ✅ Notification categorization (info, warning, alert)
- ✅ Mark notifications as read

---

## 10. Bilingual Support

- ✅ Full interface in both Arabic and English
- ✅ RTL support for Arabic
- ✅ Language switching capability
- ✅ All fields support bilingual input

---

## 11. Security & Privacy

- ✅ Secure authentication system
- ✅ Data encryption
- ✅ Row Level Security (RLS) for granular access control
- ✅ Audit trail for all actions
- ✅ Secure sessions with automatic renewal

---

## 12. Attachments & File Management

- ✅ Upload images and documents
- ✅ Secure cloud storage
- ✅ In-app attachment preview
- ✅ Multiple file format support

---

## 13. Operations Task Management

- ✅ Create tasks and assign to staff
- ✅ Link tasks to branches
- ✅ Set priority and due dates
- ✅ Track completion status
- ✅ Custom filters and views

---

## Technical Specifications

| Specification | Details |
|--------------|---------|
| Platform | Cloud-based Web Application |
| Tech Stack | React, TypeScript, Tailwind CSS |
| Database | PostgreSQL |
| Security | Row Level Security, JWT Authentication |
| Compatibility | All modern browsers, fully responsive |
| Languages | Arabic & English |

---

**Prepared by the Rasdah Team**
