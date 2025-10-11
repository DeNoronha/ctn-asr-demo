# Member Portal - Complete Implementation Plan

## Status: API Endpoints Created ✅

All backend API endpoints have been created and registered:

### Member Self-Service API Endpoints
1. ✅ `GET /api/v1/member` - Get authenticated member profile
2. ✅ `PUT /api/v1/member/profile` - Update organization profile
3. ✅ `GET /api/v1/member/contacts` - Get all contacts
4. ✅ `POST /api/v1/member/contacts` - Create new contact
5. ✅ `PUT /api/v1/member/contacts/{id}` - Update contact
6. ✅ `GET /api/v1/member/endpoints` - Get all endpoints
7. ✅ `POST /api/v1/member/endpoints` - Create new endpoint  
8. ✅ `GET /api/v1/member/tokens` - Get token history

### Audit Logging
All update operations log to `audit_logs` table with:
- event_type
- actor_org_id
- resource_type
- resource_id
- action
- result
- metadata (includes user email and changes)

## Frontend Components Needed

The portal needs to be rebuilt completely with these features:

### 1. Organization Profile (/profile)
**Features:**
- View organization details (legal_name, org_id, domain, status, LEI, KVK)
- Edit mode with form validation
- Update address (legal_entity table)
- Update domain and metadata
- Save button triggers PUT /api/v1/member/profile
- Success/error notifications
- Audit trail display (recent changes)

**UI Components:**
```
ProfileView.tsx
- OrganizationInfo (read-only display)
- OrganizationEditForm (edit mode)
- AddressEditor
- AuditTrail component
```

### 2. Contacts Management (/contacts)
**Features:**
- Table listing all contacts
- Add new contact button → modal/form
- Edit contact → modal/form
- Delete contact (soft delete)
- Mark as primary contact
- Filter by contact_type (PRIMARY, TECHNICAL, BILLING, etc.)
- Columns: Name, Email, Phone, Job Title, Type, Primary, Actions

**UI Components:**
```
ContactsView.tsx
- ContactsTable
- ContactForm (for add/edit)
- ContactDeleteConfirm
```

### 3. Endpoints/Systems Management (/endpoints)
**Features:**
- Card grid or table of endpoints
- Add new endpoint button → modal/form
- Edit endpoint
- Test connection button
- Activate/deactivate endpoint
- View authentication tokens for endpoint
- Columns: Name, URL, Type, Category, Status, Last Test, Actions

**UI Components:**
```
EndpointsView.tsx
- EndpointCard (card view)
- EndpointTable (table view)
- EndpointForm (add/edit)
- ConnectionTest component
- TokenGenerator (for endpoint authentication)
```

### 4. API Tokens (/tokens)
**Features:**
- Generate new BVAD token button
- Token displays ONCE after generation (copy to clipboard)
- Table of previous tokens (jti, type, issued, expires, revoked)
- Token history limited to last 50
- Columns: Token ID (first 8 chars), Type, Issued, Expires, Status

**UI Components:**
```
TokensView.tsx
- TokenGenerator
- TokenDisplay (for newly generated token)
- TokenHistory table
```

### 5. Dashboard (/dashboard)
**Features:**
- Organization status card
- Quick stats (# contacts, # endpoints, # active tokens)
- Recent activity feed
- Quick actions (Add Contact, Add Endpoint, Generate Token)
- Membership level display
- Status indicators

**UI Components:**
```
Dashboard.tsx
- StatsGrid
- QuickActions
- RecentActivity
- StatusOverview
```

### 6. Support (/support)
**Features:**
- Contact support card (email, phone)
- FAQ section
- Documentation links
- System status indicator
- Community resources

**UI Components:**
```
Support.tsx
- ContactCard
- FAQList
- DocumentationLinks
- SystemStatus
```

## Design Requirements

### Color Scheme (Match Admin Portal)
```css
--ctn-dark-blue: #1a4d6d;    /* Header, titles */
--ctn-orange: #ff8c00;        /* Primary actions, accents */
--ctn-light-blue: #00a3e0;    /* Secondary actions */
--ctn-bg: #f8fafc;            /* Page background */
--ctn-text: #1e293b;          /* Primary text */
--ctn-text-light: #64748b;    /* Secondary text */
```

### Layout
- Sticky header with CTN logo
- Horizontal tab navigation (Dashboard, Profile, Contacts, Endpoints, Tokens, Support)
- Active tab indicated by orange bottom border
- Main content area with max-width 1400px
- Footer with partner logos and links

### Footer Content
```
[CTN Logo] [Partner Logo 1] [Partner Logo 2] [Partner Logo 3]

ABOUT               RESOURCES           SUPPORT
- About CTN         - Documentation     - Contact
- Members          - API Reference      - Help Center
- News             - Guides             - Status

© 2025 CTN Network. All rights reserved.
```

## Implementation Steps

### Step 1: Deploy API ✅
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
npm run build
func azure functionapp publish func-ctn-demo-asr-dev --typescript
```

### Step 2: Create React Components
Create all component files listed above in `/portal/src/components/`

### Step 3: Update Main App.tsx
- Import all view components
- Setup React Router (if using routes) or tab-based navigation
- Implement authentication check
- Handle loading states
- Error boundaries

### Step 4: Implement Each View
Start with Dashboard → Profile → Contacts → Endpoints → Tokens → Support

### Step 5: Add Form Validation
Use React Hook Form or similar for:
- Contact forms
- Endpoint forms
- Profile edit forms

### Step 6: Add Notifications
Toast/notification system for:
- Success messages
- Error handling
- Confirmation dialogs

### Step 7: Test & Deploy
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/portal
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token [TOKEN] \
  --env production
```

## Data Flow Examples

### Update Organization Profile
```
User clicks "Edit" → Form shows → User changes address → 
Click "Save" → PUT /api/v1/member/profile → 
API validates user → Updates legal_entity table → 
Logs audit event → Returns success → 
UI shows notification → Refreshes data
```

### Add New Contact
```
User clicks "Add Contact" → Modal opens → 
User fills form → Click "Save" → 
POST /api/v1/member/contacts → 
API validates → Inserts to legal_entity_contact → 
Logs audit → Returns contact_id → 
UI closes modal → Refreshes contacts list
```

### Generate Token
```
User clicks "Generate Token" → 
POST /api/v1/oauth/token → 
API creates token → Saves to issued_tokens → 
Returns access_token → 
UI displays token ONCE → 
User copies token → 
Refreshes token history
```

## Next Steps for You

Since you're having lunch, when you return:

1. **Quick test**: Deploy the API and test the new endpoints
2. **Choose approach**: 
   - Build portal from scratch with all features (2-3 hours)
   - OR use a UI framework like Material-UI/Ant Design (faster)
   - OR I can generate all component files for you to review

3. **Logo assets**: Add CTN and partner logos to `/portal/public/assets/logos/`

4. **Test with real data**: Make sure your test user can:
   - View their organization
   - Add/edit contacts
   - Create endpoints
   - Generate tokens

Let me know which approach you prefer when you're back!
