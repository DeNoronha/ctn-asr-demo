# Phase 4.1 Installation Commands

## Install Required Dependencies

```bash
cd /Users/ramondenoronha/Desktop/Projects/Data\ in\ Logistics/repo/ASR/web

# Install MSAL (Microsoft Authentication Library)
npm install @azure/msal-browser @azure/msal-react

# Install React Router for routing
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

## Setup Environment Variables

```bash
# Copy template
cp .env.template .env.local

# Edit .env.local with your Azure AD values
# (See AUTHENTICATION_SETUP.md for how to get these values)
```

## Run the Application

```bash
npm start
```

## What's Been Created

### Authentication Infrastructure:
- ✅ `/src/auth/authConfig.ts` - Azure AD configuration
- ✅ `/src/auth/AuthContext.tsx` - Auth context & hooks
- ✅ `/src/auth/ProtectedRoute.tsx` - Route protection

### Auth UI Components:
- ✅ `/src/components/auth/LoginPage.tsx` - Login page
- ✅ `/src/components/auth/MFARequired.tsx` - MFA warning
- ✅ `/src/components/auth/Unauthorized.tsx` - Access denied page

### Updated Components:
- ✅ `/src/App.tsx` - Integrated auth routing
- ✅ `/src/components/AdminPortal.tsx` - Protected admin interface

### Documentation:
- ✅ `/docs/AUTHENTICATION_SETUP.md` - Complete Azure AD setup guide

## User Hierarchy Configured

1. **System Admin** - Creates/manages Association Admins
2. **Association Admin** - Manages association via Admin Portal  
3. **Member** - Self-service via Member Portal

## MFA Enforcement

All users MUST:
- Register via Member Portal first
- Enable MFA in Azure AD
- Have proper role assigned

## Next Steps

1. Complete Azure AD setup (see AUTHENTICATION_SETUP.md)
2. Install dependencies (commands above)
3. Configure .env.local
4. Test authentication flow
5. Proceed to Phase 4.2 (RBAC UI enhancements)
6. Proceed to Phase 4.3 (Audit logging)
