# Phase 4.1: Azure Entra ID Authentication - Step-by-Step Guide

> **Important**: Authentication uses **Azure Entra ID** (cloud-based), not local files. All user data is stored and managed in Azure.

---

## Step 1: Register Application in Azure Portal

### 1.1 Create App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. **Microsoft Entra ID** → **App registrations** → **New registration**
3. Configure:
   - **Name**: `CTN Association Register`
   - **Account types**: `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI**: 
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:3000`
4. Click **Register**
5. **Copy these values** (you'll need them later):
   ```
   Application (client) ID: ________________________________
   Directory (tenant) ID:   ________________________________
   ```

### 1.2 Configure Authentication
1. In your app, go to **Authentication**
2. Under **Implicit grant and hybrid flows**:
   - ✅ Access tokens
   - ✅ ID tokens
3. Under **Advanced settings**:
   - **Allow public client flows**: `Yes`
4. Click **Save**

### 1.3 Configure API Permissions
1. Go to **API permissions** → **Add a permission**
2. Select **Microsoft Graph** → **Delegated permissions**
3. Add these permissions:
   - ✅ `User.Read`
   - ✅ `openid`
   - ✅ `profile`
   - ✅ `email`
4. Click **Add permissions**
5. Click **Grant admin consent for [your tenant]** ⚠️ Important!

---

## Step 2: Configure App Roles in Azure Entra ID

App roles define what users can do. Create 3 roles:

### 2.1 Go to App Roles
1. In your app registration, click **App roles**
2. Create each role below:

### 2.2 Create System Admin Role
- **Display name**: `System Admin`
- **Allowed member types**: `Users/Groups`
- **Value**: `SystemAdmin`
- **Description**: `Can create and manage Association Admins`
- ✅ Enable this app role
- Click **Apply**

### 2.3 Create Association Admin Role
- **Display name**: `Association Admin`
- **Allowed member types**: `Users/Groups`
- **Value**: `AssociationAdmin`
- **Description**: `Can manage association data via Admin Portal`
- ✅ Enable this app role
- Click **Apply**

### 2.4 Create Member Role
- **Display name**: `Member`
- **Allowed member types**: `Users/Groups`
- **Value**: `Member`
- **Description**: `Can access Member Portal for self-service`
- ✅ Enable this app role
- Click **Apply**

---

## Step 3: Assign Roles to Users in Azure Entra ID

Now assign yourself a role for testing:

1. Go to **Microsoft Entra ID** → **Enterprise applications**
2. Search for and select `CTN Association Register`
3. Click **Users and groups** → **Add user/group**
4. Click **Users** → Select your account
5. Click **Select a role** → Choose `SystemAdmin` (for testing)
6. Click **Assign**

**Note**: Users are managed in Azure Entra ID, not locally. This is cloud-based authentication.

---

## Step 4: Enable MFA Policy in Azure Entra ID

Enforce Multi-Factor Authentication for all users:

### 4.1 Create Conditional Access Policy
1. Go to **Microsoft Entra ID** → **Security** → **Conditional Access**
2. Click **New policy**
3. Configure:
   - **Name**: `CTN - Require MFA`
   - **Users**: Click **Select users and groups** → Choose `All users`
   - **Target resources**: Click **Cloud apps** → **Select apps** → Choose `CTN Association Register`
   - **Grant**: Click **Grant** → ✅ `Require multifactor authentication`
   - **Enable policy**: `On`
4. Click **Create**

### 4.2 Setup Your MFA
1. Go to [Microsoft Security Info](https://mysignins.microsoft.com/security-info)
2. Click **Add sign-in method**
3. Choose **Authenticator app** (recommended) or **Phone**
4. Follow the setup wizard

---

## Step 5: Configure Local Development Environment

Now configure your local React app to connect to Azure Entra ID:

### 5.1 Install Dependencies
```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/web

npm install @azure/msal-browser @azure/msal-react react-router-dom
npm install --save-dev @types/react-router-dom
```

### 5.2 Configure Environment Variables
```bash
cp .env.template .env.local
```

Edit `.env.local` with **your Azure values from Step 1.1**:
```env
REACT_APP_AZURE_CLIENT_ID=<paste-your-application-client-id>
REACT_APP_AZURE_TENANT_ID=<paste-your-directory-tenant-id>
REACT_APP_REDIRECT_URI=http://localhost:3000
REACT_APP_API_BASE_URL=http://localhost:8000
```

---

## Step 6: Test Authentication Flow

### 6.1 Start the Application
```bash
npm start
```

### 6.2 Test Login
1. Visit `http://localhost:3000`
2. Should redirect to **Login page**
3. Click **"Sign in with Microsoft"**
4. **Azure Entra ID login popup** will appear
5. Enter your credentials
6. Complete **MFA challenge** (authenticator code)
7. Should redirect to **Admin Portal Dashboard**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MFA Required" page shows | Complete Step 4.2 - setup your MFA |
| "Unauthorized" page shows | Verify role assignment in Step 3 |
| Login popup blocked | Allow popups for localhost in browser |
| "Client ID not found" | Check `.env.local` values match Step 1.1 |
| "AADSTS50105" error | Admin consent not granted - see Step 1.3 |

---

## Understanding the Architecture

**Important Concepts:**

1. **Azure Entra ID** (cloud) stores:
   - User accounts
   - User roles (SystemAdmin, AssociationAdmin, Member)
   - MFA settings
   - Passwords (never stored locally)

2. **Local React app** only:
   - Redirects to Azure Entra ID for login
   - Receives authentication tokens
   - Stores session in browser sessionStorage
   - Never stores passwords

3. **Authentication Flow**:
   ```
   User → React App → Azure Entra ID (login) → MFA Challenge → 
   Token → React App (authenticated)
   ```

---

## What Happens When User Logs In?

1. User clicks "Sign in with Microsoft"
2. **React app redirects to Azure Entra ID** (Microsoft login page)
3. User enters credentials in **Azure** (not your app)
4. Azure validates credentials and prompts for **MFA**
5. Azure issues authentication **token** with user roles
6. Token sent back to React app
7. React app reads roles from token
8. User sees appropriate portal (Admin or Member)

**No user data is stored locally. Everything is in Azure Entra ID.**

---

## Next Steps

✅ Once authentication works, proceed to:
- **Phase 4.2**: User Management UI (create/manage Association Admins)
- **Phase 4.3**: Audit Logging (track who did what)

---

## Quick Reference: User Roles

| Role | Access | Created By |
|------|--------|------------|
| System Admin | Both portals, can create Admins | You (manually in Azure) |
| Association Admin | Admin portal only | System Admin |
| Member | Member portal only | Self-registration |

All role assignments happen in **Azure Entra ID**, not in your database.
