# ⚠️ CLAUDE: READ THIS FIRST IN EVERY NEW CONVERSATION ⚠️

## 📍 Repository Location
`/Users/ramondenoronha/Dev/DIL/ASR-full`

## 🎯 Ramon's Preferences

### Communication Style
- **Brief and concise** - no lengthy explanations
- **No summaries or MD files** unless explicitly requested
- **Action-oriented** - provide next steps, not all possibilities
- Ramon is **not a programmer** - developing via Claude (not Claude Code)

### Tools to Use
- ✅ **ONLY use Filesystem tools:** `Filesystem:read_file`, `Filesystem:write_file`, `Filesystem:edit_file`
- ❌ **NEVER use:** `bash_tool`, `str_replace`, `create_file`, `view`
- ✅ Provide bash commands for Ramon to execute
- ✅ Monitor Chrome Dev Console during testing

## 🚀 Standard Deployment Workflow

### 1. Commit and Push
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full
git add .
git commit -m "Your changes"
git push
```

### 2. Deploy API
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/api
func azure functionapp publish func-ctn-demo-asr-dev --typescript --build remote
```
**⚠️ CRITICAL:** Always use `--build remote` flag

### 3. Deploy Frontend
```bash
cd /Users/ramondenoronha/Dev/DIL/ASR-full/web
mv .env.local .env.local.backup
npm run build
npx @azure/static-web-apps-cli deploy ./build \
  --deployment-token d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03 \
  --env production
mv .env.local.backup .env.local
```

## 🔑 Azure Resources

### URLs
- **Admin Portal:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Member Portal:** https://calm-pebble-043b2db03.1.azurestaticapps.net
- **API:** https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1
- **Azure DevOps:** https://dev.azure.com/ctn-demo/ASR

### Key Services
- **Function App:** func-ctn-demo-asr-dev
- **Static Web App (Admin):** calm-tree-03352ba03
  - Deployment Token: d1ec51feb9c93a061372a5fa151c2aa371b799b058087937c62d031bdd1457af01-15d4bfd4-f72a-4eb0-82cc-051069db9ab1003172603352ba03
- **Static Web App (Member Portal):** ctn-member-portal
  - Deployment Token: e597cda7728ed30e397d3301a18abcc4d89ab6a67b6ac6477835faf3261b183f01-4dec1d69-71a6-4c4d-9091-bae5673f9ab60031717043b2db03
- **Database:** psql-ctn-demo-asr-dev.postgres.database.azure.com
- **Storage:** stctnasrdev96858 (KvK documents)
- **Document Intelligence:** doc-intel-ctn-asr-dev

### Database Credentials
```bash
Host: psql-ctn-demo-asr-dev.postgres.database.azure.com
Port: 5432
Database: asr_dev
User: asradmin
Password: [REDACTED]
```

### Azure Entra ID
- **Client ID:** d3037c11-a541-4f21-8862-8079137a0cde
- **Tenant ID:** 598664e7-725c-4daa-bd1f-89c4ada717ff
- **Redirect (Prod):** https://calm-tree-03352ba03.1.azurestaticapps.net
- **Redirect (Local):** http://localhost:3000

## ⚠️ Critical Issues & Solutions

### Multipart Form Data Parsing
```typescript
// CORRECT import
import * as multipart from 'parse-multipart-data';

// Check multiple header variations
let contentType = request.headers.get('content-type');
if (!contentType) contentType = request.headers.get('Content-Type');
```

### Azure Blob Storage
```typescript
// CORRECT - no public access
await containerClient.createIfNotExists();

// TODO: Implement SAS tokens for viewing
async getDocumentSasUrl(blobUrl: string, expiryMinutes: number = 60)
```

### Environment Files
- `.env.local` - local dev only (NOT in git)
- `.env.production` - production config (IN git)
- **MUST hide .env.local before building** or it overrides production config

### Static Web App Routing
**MUST have:** `web/public/staticwebapp.config.json` for React Router to work

### New Azure Functions
1. Create function in `api/src/functions/`
2. **MUST import in `api/src/index.ts`**
3. Use `methods: ['GET']` NOT `['GET', 'OPTIONS']`
4. Handle OPTIONS inside function code

## 📊 Current Status

**See:** `docs/ROADMAP.md` for detailed status

**KvK Verification (85% complete):**
- ✅ File upload working
- ⏳ Awaiting: KvK API key (website maintenance until Monday)
- ⏳ TODO: SAS token generation for document viewing

## 🗂️ Project Structure

```
ASR-full/
├── api/src/
│   ├── functions/          # API endpoints
│   ├── services/           # Business logic
│   └── index.ts           # ⚠️ Import all functions here
├── web/
│   ├── public/
│   │   └── staticwebapp.config.json  # ⚠️ Required for routing
│   ├── .env.local         # ⚠️ NOT in git
│   └── .env.production    # ✅ In git
├── database/migrations/   # SQL scripts
└── docs/                  # Documentation
    ├── ROADMAP.md         # Current status
    ├── ARCHITECTURE.md    # System design
    ├── DEPLOYMENT_GUIDE.md
    └── TESTING_GUIDE.md
```

## 📝 Notes

- Azure Pipelines NOT yet active (awaiting Microsoft approval)
- Manual deployment workflow until pipelines enabled
- Build ONLY on Azure (use `--build remote`)
- Source control: Azure DevOps (NOT GitHub)
