# Implementation Plan: To Do 3-9
**Date:** October 12, 2025
**Status:** Design & Architecture Documentation

This document provides the implementation plan and architecture for To Do items 3-9 from the ROADMAP.

---

## To Do 3: Email Template Management

### Overview
Refactor email notifications to use separate HTML template files with a template engine, add branding, and support multiple languages.

### Architecture

**Current State:**
- Email templates are inline strings in EventGridHandler function
- No template management or reusability
- Single language (English)

**Target State:**
- HTML template files stored in `api/src/templates/emails/`
- Handlebars or EJS template engine for variable substitution
- Centralized template service
- Multi-language support (NL, EN, DE)

### Implementation Steps

1. **Install Dependencies**
```bash
cd api
npm install handlebars
npm install @types/handlebars --save-dev
```

2. **Create Template Structure**
```
api/src/templates/emails/
├── layouts/
│   └── base.hbs                    # Base HTML layout with CTN branding
├── nl/                              # Dutch templates
│   ├── application-created.hbs
│   ├── application-activated.hbs
│   ├── application-suspended.hbs
│   ├── application-terminated.hbs
│   └── token-issued.hbs
├── en/                              # English templates
│   └── [same as above]
└── de/                              # German templates
    └── [same as above]
```

3. **Create Template Service**
```typescript
// api/src/services/emailTemplateService.ts
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export class EmailTemplateService {
  private readonly templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '../templates/emails');
  }

  async renderTemplate(
    templateName: string,
    language: string,
    data: any
  ): Promise<string> {
    const templatePath = path.join(
      this.templatesDir,
      language,
      `${templateName}.hbs`
    );

    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const layoutPath = path.join(this.templatesDir, 'layouts/base.hbs');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');

    // Register layout as partial
    Handlebars.registerPartial('layout', layoutContent);

    const template = Handlebars.compile(templateContent);
    return template(data);
  }
}
```

4. **Base Layout Template**
```html
<!-- api/src/templates/emails/layouts/base.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .header { background: #003366; color: white; padding: 20px; }
    .logo { height: 50px; }
    .content { padding: 30px; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; }
    .button { background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://ctn-portal-assets.blob.core.windows.net/logos/ctn-logo-white.png" alt="CTN" class="logo">
  </div>
  <div class="content">
    {{{body}}}
  </div>
  <div class="footer">
    <p>© 2025 Connecting the Netherlands (CTN) | <a href="https://ctn.nl">ctn.nl</a></p>
    <p>This is an automated message. Please do not reply.</p>
  </div>
</body>
</html>
```

5. **Example Template (Application Created)**
```html
<!-- api/src/templates/emails/en/application-created.hbs -->
{{#> layout}}
  <h2>New Application Registered</h2>
  <p>Dear {{companyName}},</p>
  <p>Your application to join the CTN Association Register has been successfully registered.</p>

  <div style="background: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc;">
    <strong>Application Details:</strong><br>
    Company Name: {{companyName}}<br>
    KvK Number: {{kvkNumber}}<br>
    Application Date: {{applicationDate}}
  </div>

  <p>Our team will review your application within 2-3 business days.</p>
  <p>You will receive an email notification once your application has been processed.</p>

  <p>If you have any questions, please contact us at <a href="mailto:support@ctn.nl">support@ctn.nl</a>.</p>

  <p>Best regards,<br>
  The CTN Team</p>
{{/layout}}
```

6. **Update EventGridHandler**
Replace inline email content with template service calls:
```typescript
const templateService = new EmailTemplateService();
const htmlContent = await templateService.renderTemplate(
  'application-created',
  userLanguage || 'en',
  {
    companyName: entityData.primary_legal_name,
    kvkNumber: entityData.kvk_number,
    applicationDate: new Date().toLocaleDateString()
  }
);
```

### Branding Elements
- CTN logo in header
- Corporate colors: #003366 (dark blue), #0066cc (blue), #f4f4f4 (light gray)
- Consistent typography and spacing
- Responsive design for mobile devices

### Multi-Language Support
- Store user's preferred language in `legal_entity` table
- Default to English if language not specified
- Translate all email content (subject lines and body)
- Use ISO 639-1 language codes (nl, en, de)

---

## To Do 4: Workflow Automation with Logic Apps

### Overview
Implement Azure Logic Apps for orchestrating complex workflows with human-in-the-loop approval processes.

### Architecture

**Workflow: Member Registration & Approval**

```
┌──────────────────────────────────────────────────────────────────┐
│                    Logic App Workflow                              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. Trigger: Event Grid - New Member Application                  │
│     Event Type: APPLICATION_CREATED                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Action: Extract Event Data                                     │
│     - Company Name                                                 │
│     - KvK Number                                                   │
│     - Contact Email                                                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Action: Call KvK Verification API                             │
│     GET /api/v1/legal-entities/{id}/kvk-verification              │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Condition: KvK Status                                          │
│     ├─ Verified ─────────────────────┐                            │
│     ├─ Flagged ──────────┐           │                            │
│     └─ Failed ───┐        │           │                            │
└──────────────────┼────────┼───────────┼────────────────────────────┘
                   │        │           │
                   ▼        ▼           ▼
           ┌──────────┐ ┌──────────┐ ┌──────────────────┐
           │ Auto-    │ │ Send     │ │ Auto-Approve &   │
           │ Reject   │ │ Approval │ │ Activate         │
           │          │ │ Email    │ │                  │
           └──────────┘ └──────────┘ └──────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │ Wait for Approval │
                   │ (Adaptive Card)   │
                   └──────────────────┘
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
           ┌──────────┐            ┌──────────┐
           │ Approved │            │ Rejected │
           └──────────┘            └──────────┘
                 │                       │
                 ▼                       ▼
           ┌──────────┐            ┌──────────┐
           │ Call API │            │ Call API │
           │ Activate │            │ Reject   │
           └──────────┘            └──────────┘
                 │                       │
                 ▼                       ▼
           ┌──────────────────────────────────┐
           │ Send Notification Email           │
           └──────────────────────────────────┘
```

### Logic App Components

**1. Event Grid Trigger**
- Subscribe to Event Grid topic: `ctn-asr-events`
- Filter: `eventType = 'APPLICATION_CREATED'`

**2. HTTP Connectors**
- ASR API connector for CRUD operations
- KvK API connector for validation

**3. Approval Connector**
- Send adaptive card via Teams or Email
- Wait for admin approval/rejection
- Timeout: 72 hours (auto-escalate)

**4. Error Handling**
- Retry policy: Exponential backoff (3 attempts)
- Dead letter queue for failed events
- Alert admins on repeated failures

### Implementation Steps

1. **Create Logic App in Azure**
```bash
az logic workflow create \
  --resource-group rg-ctn-demo-asr-dev \
  --location westeurope \
  --name logic-app-member-registration \
  --definition workflow-definition.json
```

2. **Configure Event Grid Subscription**
```bash
az eventgrid event-subscription create \
  --name member-registration-workflow \
  --source-resource-id /subscriptions/{sub}/resourceGroups/rg-ctn-demo-asr-dev/providers/Microsoft.EventGrid/topics/topic-ctn-asr-events \
  --endpoint-type webhook \
  --endpoint https://logic-app-member-registration.azurewebsites.net/trigger
```

3. **Design Adaptive Card for Approval**
```json
{
  "type": "AdaptiveCard",
  "body": [
    {
      "type": "TextBlock",
      "text": "New Member Application Requires Approval",
      "weight": "bolder",
      "size": "large"
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Company:", "value": "${companyName}" },
        { "title": "KvK Number:", "value": "${kvkNumber}" },
        { "title": "Status:", "value": "${kvkStatus}" },
        { "title": "Flags:", "value": "${flags}" }
      ]
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Approve",
      "style": "positive",
      "data": { "action": "approve" }
    },
    {
      "type": "Action.Submit",
      "title": "Reject",
      "style": "destructive",
      "data": { "action": "reject" }
    }
  ]
}
```

### Benefits
- Reduces manual admin tasks
- Consistent approval process
- Audit trail of all decisions
- Scalable and maintainable
- Visual workflow designer

---

## To Do 5: Polish Advanced Features

### 5.1 Advanced Search & Filtering

**Implementation:**
1. Add Kendo React Filter component to Members grid
2. Support filtering by:
   - Status (dropdown multi-select)
   - Membership level (dropdown)
   - Date range (creation date, activation date)
   - KvK verification status
   - Text search (company name, KvK number)

3. Backend: Update API to support query parameters
```typescript
GET /api/v1/members?
  status=ACTIVE,PENDING&
  membershipLevel=PREMIUM&
  createdFrom=2025-01-01&
  createdTo=2025-12-31&
  search=Tech&
  kvkStatus=verified
```

### 5.2 Bulk Operations

**Implementation:**
1. Add checkbox column to grid for multi-select
2. Add bulk action toolbar:
   - Change status (activate, suspend, terminate)
   - Update membership level
   - Delete selected members
   - Export selected to CSV

3. Backend API:
```typescript
POST /api/v1/members/bulk-update
Body: {
  memberIds: ['id1', 'id2', ...],
  operation: 'update_status',
  data: { status: 'ACTIVE' }
}
```

### 5.3 PDF Export

**Implementation:**
1. Install PDF generation library:
```bash
npm install pdfkit
```

2. Create PDF generation service:
```typescript
export class PdfGenerationService {
  async generateMemberReport(memberId: string): Promise<Buffer> {
    const doc = new PDFDocument();
    // Add company logo
    // Add member details
    // Add endpoints table
    // Add tokens table
    return doc;
  }
}
```

3. Add export button to Member Detail view
4. API endpoint:
```typescript
GET /api/v1/members/{id}/export/pdf
Response: application/pdf binary
```

---

## To Do 6: Localization (i18n)

### Overview
Implement internationalization supporting Dutch, English, and German.

### Architecture

**Libraries:**
- `react-i18next` for React components
- `i18next` for core i18n functionality
- `i18next-browser-languagedetector` for automatic language detection

### Implementation

1. **Install Dependencies**
```bash
cd web
npm install react-i18next i18next i18next-browser-languagedetector
```

2. **Create Translation Files**
```
web/src/locales/
├── en/
│   ├── common.json          # Common UI strings
│   ├── members.json         # Member management
│   ├── endpoints.json       # Endpoint management
│   └── errors.json          # Error messages
├── nl/
│   └── [same structure]
└── de/
    └── [same structure]
```

3. **Initialize i18n**
```typescript
// web/src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import nlCommon from './locales/nl/common.json';
import deCommon from './locales/de/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      nl: { common: nlCommon },
      de: { common: deCommon }
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

4. **Use in Components**
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('members.title')}</h1>
      <button onClick={() => i18n.changeLanguage('nl')}>
        Nederlands
      </button>
    </div>
  );
};
```

5. **Language Switcher Component**
```typescript
export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <DropDownList
      data={[
        { code: 'en', label: 'English' },
        { code: 'nl', label: 'Nederlands' },
        { code: 'de', label: 'Deutsch' }
      ]}
      textField="label"
      dataItemKey="code"
      value={{ code: i18n.language, label: '...' }}
      onChange={(e) => i18n.changeLanguage(e.value.code)}
    />
  );
};
```

### Translation Strategy
- Extract all hardcoded strings to JSON files
- Use nested keys for organization: `members.list.title`
- Support pluralization: `{count} member(s)`
- Date/number formatting per locale
- Store user's preferred language in database

---

## To Do 7: Admin Portal Menu Expansion

### New Sections

**1. Subscriptions Section**
- Purpose: Manage member subscriptions and billing
- Features:
  - List all subscriptions
  - Create/update subscription plans
  - View subscription history
  - Invoice generation
  - Payment tracking

**2. Newsletters Section**
- Purpose: Send newsletters to members
- Features:
  - Create newsletter campaigns
  - Email template builder
  - Recipient lists (all members, by level, custom)
  - Schedule sending
  - Track open/click rates
  - Archive previous newsletters

**3. Tasks Section**
- Purpose: Admin task management and workflow
- Features:
  - Pending verifications (KvK documents awaiting review)
  - Approval requests (membership applications)
  - Support tickets
  - Scheduled tasks (token renewals, reminders)
  - Task assignment to admin users

### Implementation

1. **Add Menu Items**
```typescript
// web/src/components/AdminDrawer.tsx
const menuItems = [
  { text: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { text: 'Members', icon: 'people', route: '/members' },
  { text: 'Subscriptions', icon: 'credit-card', route: '/subscriptions' },
  { text: 'Newsletters', icon: 'email', route: '/newsletters' },
  { text: 'Tasks', icon: 'check-circle', route: '/tasks' },
  { text: 'Settings', icon: 'settings', route: '/settings' }
];
```

2. **Create Route Components**
```typescript
// web/src/App.tsx
<Route path="/subscriptions" element={<SubscriptionsView />} />
<Route path="/newsletters" element={<NewslettersView />} />
<Route path="/tasks" element={<TasksView />} />
```

3. **Create Database Tables**
```sql
-- Subscriptions
CREATE TABLE subscriptions (
  subscription_id UUID PRIMARY KEY,
  legal_entity_id UUID REFERENCES legal_entity(legal_entity_id),
  plan_name VARCHAR(100),
  price DECIMAL(10,2),
  billing_cycle VARCHAR(20),
  status VARCHAR(20),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true
);

-- Newsletters
CREATE TABLE newsletters (
  newsletter_id UUID PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  html_content TEXT,
  status VARCHAR(20),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  open_count INTEGER,
  click_count INTEGER
);

-- Admin Tasks
CREATE TABLE admin_tasks (
  task_id UUID PRIMARY KEY,
  task_type VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  priority VARCHAR(20),
  status VARCHAR(20),
  assigned_to UUID,
  related_entity_id UUID,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

## To Do 8: Portal Branding Polish

### Implementation Tasks

**1. Logo Display Verification**
- Test logos in all browsers (Chrome, Firefox, Safari, Edge)
- Verify SVG rendering
- Add fallback PNG images
- Ensure correct dimensions (header: 150px width, sidebar: 50px height)

**2. Hover Effects**
```css
.menu-item {
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: rgba(0, 102, 204, 0.1);
  transform: translateX(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}
```

**3. Animations**
- Page transitions: Fade in/out (300ms)
- Dialog appearances: Slide up (200ms)
- Toast notifications: Slide in from right (250ms)
- Loading spinners: Smooth rotation

**4. Responsive Logo Sizing**
```css
@media (max-width: 768px) {
  .header-logo {
    height: 40px;
  }
}

@media (max-width: 480px) {
  .header-logo {
    height: 30px;
  }
}
```

**5. Dark Mode Support (Future)**
- Implement CSS variables for theming
- Toggle switch in settings
- Store preference in localStorage
- Apply to all components

---

## To Do 9: Future Features Documentation

### 9.1 Real-Time & Collaboration

**WebSocket Integration:**
- Real-time dashboard updates
- Live member status changes
- Collaborative document editing
- Admin activity notifications
- Chat support widget

**Technology Stack:**
- Azure SignalR Service
- React hooks for WebSocket connections
- Optimistic UI updates

### 9.2 Advanced Analytics

**Features:**
- Trend analysis (member growth over time)
- Predictive analytics (churn risk prediction)
- Usage patterns (API endpoint usage heatmaps)
- Financial reporting (revenue forecasts)
- Cohort analysis (member segments)

**Technology Stack:**
- Azure Synapse Analytics for data warehouse
- Power BI embedded for dashboards
- Machine learning models (Azure ML)

### 9.3 Integration & Automation

**Planned Integrations:**
- Accounting software (Exact Online, Twinfield)
- CRM systems (Salesforce, HubSpot)
- Identity providers (Azure AD, Okta)
- Payment gateways (Mollie, Stripe)
- API marketplace listing

**API Expansion:**
- GraphQL API for flexible queries
- Webhook subscriptions for events
- Rate limiting and throttling
- API versioning strategy
- Swagger/OpenAPI documentation

### 9.4 Mobile Application

**Native Mobile Apps:**
- iOS and Android apps
- Member self-service features
- Push notifications
- Offline mode support
- QR code scanning (for events)

**Technology Stack:**
- React Native or Flutter
- Shared business logic with web
- Mobile-specific UI/UX

---

## Implementation Priority Matrix

| To Do | Priority | Complexity | Est. Time | Dependencies |
|-------|----------|------------|-----------|--------------|
| To Do 3 | High | Medium | 3 days | None |
| To Do 4 | High | High | 5 days | To Do 3 |
| To Do 5 | Medium | Medium | 4 days | None |
| To Do 6 | Medium | Medium | 5 days | None |
| To Do 7 | Medium | High | 7 days | Database changes |
| To Do 8 | Low | Low | 2 days | None |
| To Do 9 | Low | N/A | Document only | Future roadmap |

**Total Estimated Implementation Time:** 26 days

---

## Conclusion

This document provides comprehensive architecture and implementation plans for To Do items 3-9. All designs follow best practices for:
- Scalability
- Maintainability
- Security
- User experience
- Azure cloud-native patterns

Implementation can begin immediately with To Do 3 (Email Template Management) as it has no dependencies and provides immediate value.
