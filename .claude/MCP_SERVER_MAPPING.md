# MCP Server Mapping for Agents

**Last Updated:** November 14, 2025
**Global MCP Config:** `/Users/ramondenoronha/.config/claude-code/mcp.json`

This document defines which MCP servers each specialized agent should use. These MCP servers are configured globally and available to all agents across all projects.

---

## Available MCP Servers (Global)

### 1. **playwright** - `@playwright/mcp`
**Purpose:** Playwright browser automation and testing
**Command:** `npx -y @playwright/mcp`
**Capabilities:**
- Browser automation (Chromium, Firefox, WebKit)
- Page navigation and interaction
- Element selection and manipulation
- Screenshot and video capture
- Network request interception
- Console log capture
- Test execution and debugging

### 2. **browser** - `@agentdeskai/browser-tools-mcp`
**Purpose:** General browser tools and web automation
**Command:** `npx -y @agentdeskai/browser-tools-mcp`
**Capabilities:**
- Web scraping
- Page content extraction
- Form filling and submission
- Cookie management
- JavaScript execution in browser context

### 3. **chrome-devtools** - `chrome-devtools-mcp@latest`
**Purpose:** Chrome DevTools integration for debugging
**Command:** `npx chrome-devtools-mcp@latest`
**Capabilities:**
- Inspect network traffic
- Debug JavaScript execution
- Analyze performance metrics
- View console logs and errors
- Inspect DOM elements
- Profile memory and CPU usage

### 4. **icepanel** - `@icepanel/mcp-server@latest`
**Purpose:** Architecture diagram generation and visualization
**Command:** `npx -y @icepanel/mcp-server@latest`
**Credentials:** API_KEY and ORGANIZATION_ID configured
**Capabilities:**
- Generate architecture diagrams
- Visualize system components
- Create data flow diagrams
- Document system architecture

### 5. **Mantine Documentation (Local Files)**
**Purpose:** Mantine UI component documentation
**Location:** `docs/MANTINE_LLMS.txt` (79,408 lines from https://mantine.dev/llms.txt)
**Additional:** `docs/MANTINE_DATATABLE_REFERENCE.md` for mantine-datatable component reference
**Note:** Previously used `@hakxel/mantine-ui-server` MCP server, but now using local documentation files for faster access and reliability

---

## Agent → MCP Server Mapping

### Test Engineer (TE)
**Primary MCP Servers:**
- ✅ **playwright** - For creating and running E2E tests in `admin-portal/e2e/` and `member-portal/e2e/`
- ✅ **chrome-devtools** - For debugging test failures, capturing console errors, analyzing network requests
- ✅ **browser** - For web automation tasks during test setup

**Use Cases:**
- Create Playwright test files for new features in admin or member portal
- Debug failing tests by inspecting console logs
- Capture network traffic to diagnose API call issues
- Automate browser interactions for test coverage
- Investigate visual regression issues
- Test both portals independently with separate test suites

**When NOT to use MCP servers:**
- API testing with curl (use Bash tool directly)
- Creating bash test scripts in `api/tests/`

---

### Design Analyst (DA)
**Primary MCP Servers:**
- ✅ **browser** - For testing responsive design, accessibility, visual consistency
- ✅ **chrome-devtools** - For inspecting DOM, analyzing CSS, checking accessibility violations

**Local Documentation:**
- 📄 **docs/MANTINE_LLMS.txt** - Complete Mantine UI component documentation
- 📄 **docs/MANTINE_DATATABLE_REFERENCE.md** - mantine-datatable reference

**Use Cases:**
- Test UI responsiveness across different viewport sizes
- Inspect accessibility attributes (ARIA labels, roles, etc.)
- Analyze CSS and layout issues
- Validate color contrast ratios
- Check keyboard navigation and focus management
- Verify Mantine components are used according to best practices (reference local docs)
- Review theme configurations for consistency
- Validate proper implementation of Mantine design patterns

---

### Security Analyst (SA)
**Primary MCP Servers:**
- ✅ **chrome-devtools** - For analyzing network traffic, inspecting security headers, checking for XSS vulnerabilities
- ✅ **browser** - For testing authentication flows, session management, CORS policies

**Use Cases:**
- Inspect HTTP security headers (CSP, HSTS, X-Frame-Options)
- Test for XSS vulnerabilities by injecting payloads
- Verify authentication token handling in network requests
- Check for sensitive data exposure in browser storage
- Analyze CORS configurations

---

### Code Reviewer (CR)
**MCP Servers:** ❌ None required
- CR focuses on static code analysis using file reading tools
- No browser or automation tools needed

---

### Coding Assistant (CA)
**MCP Servers:** ❌ None required

**Local Documentation:**
- 📄 **docs/MANTINE_LLMS.txt** - Complete Mantine UI component documentation
- 📄 **docs/MANTINE_DATATABLE_REFERENCE.md** - mantine-datatable reference

**Use Cases:**
- Reference Mantine component documentation while coding (use local docs)
- Implement Mantine components based on requirements
- Search for appropriate Mantine components for specific use cases (grep local docs)
- Create theme configurations for consistent UI styling
- Get implementation examples for Mantine components (from local docs)

---

### Technical Writer (TW)
**Primary MCP Servers:**
- ✅ **icepanel** - For generating architecture diagrams to document system design

**Local Documentation:**
- 📄 **docs/MANTINE_LLMS.txt** - Complete Mantine UI component documentation
- 📄 **docs/MANTINE_DATATABLE_REFERENCE.md** - mantine-datatable reference

**Use Cases:**
- Create architecture diagrams for `docs/architecture/`
- Visualize data flow between frontend, API, and database
- Document system components and their relationships
- Generate ERD diagrams for database schema documentation
- Document Mantine component patterns and custom implementations (reference local docs)
- Create UI component documentation with proper Mantine examples

---

### Database Expert (DE)
**MCP Servers:** ❌ None required
- DE uses direct database connections via psql or API queries
- Focuses on schema analysis, query optimization, and DDL management
- No browser or automation tools needed

---

### Architecture Reviewer (AR)
**Primary MCP Servers:**
- ✅ **icepanel** - For querying architecture diagrams and system landscape

**Primary Tools:**
- 📁 **Glob/Grep** - For searching Arc42 documentation in `docs/` and external repository
- 📄 **Read** - For reviewing infrastructure Bicep templates and configuration files

**Arc42 Documentation Location:**
- **Separate Repository:** [DEV-CTN-Documentation](https://github.com/ramondenoronha/DEV-CTN-Documentation)
- **Key Documents:**
  - Three-Tier Authentication: `docs/arc42/05-building-blocks/ctn-three-tier-authentication.md`
  - Deployment Procedures: `docs/arc42/07-deployment/ctn-asr-deployment-procedures.md`
  - Coding Standards: `docs/arc42/08-crosscutting/ctn-coding-standards.md`
  - Security Hardening: `docs/arc42/08-crosscutting/ctn-security-hardening.md`
  - WCAG Compliance: `docs/arc42/10-quality/ctn-accessibility-wcag-compliance.md`

**Use Cases:**
- Query IcePanel for documented system architecture and components
- Reference Arc42 documentation for architectural decisions and patterns (external repository)
- Compare documented architecture vs actual implementation
- Validate Azure services are documented, declared, and actually used
- Check authentication patterns match Arc42 security concepts
- Verify multi-tenant data isolation implementation
- Create architecture discrepancy reports

**When NOT to use MCP servers:**
- Arc42 documentation reference (external GitHub repository, use URLs from CLAUDE.md)
- Reading Bicep templates (use Read tool)
- Checking .credentials file (use Read tool)

---

### DevOps Guardian (DG)
**MCP Servers:** ❌ None required
- DG focuses on Git operations, Azure DevOps pipelines, and monorepo management
- Uses Bash for Git commands and Azure CLI operations
- No browser or automation tools needed

---

## How Agents Should Use MCP Servers

### Persistent Knowledge Rule
Each agent MUST be aware of their designated MCP servers. When invoked, agents should:

1. **Check Available MCP Servers**
   ```bash
   # Agents can verify MCP server availability with:
   npx -y @playwright/mcp --help
   ```

2. **Prefer MCP Servers Over Alternative Tools**
   - If an MCP server is available for a task, use it
   - Example: TE should use `playwright` MCP for browser testing, not manual Playwright commands

3. **Document MCP Server Usage**
   - When creating reports, mention which MCP servers were used
   - Example: "Used `chrome-devtools` MCP to capture console errors"

4. **Fallback Strategy**
   - If MCP server fails, fall back to traditional tools (npx playwright, curl, etc.)
   - Document the fallback in agent reports

---

## Adding New MCP Servers

To add a new MCP server globally:

1. **Edit global config:**
   ```bash
   vi /Users/ramondenoronha/.config/claude-code/mcp.json
   ```

2. **Add server configuration:**
   ```json
   {
     "mcpServers": {
       "new-server-name": {
         "command": "npx",
         "args": ["-y", "package-name"]
       }
     }
   }
   ```

3. **Update this mapping document** with the new server and which agents should use it

4. **Update relevant agent definitions** to include the new MCP server in their capabilities

---

## Testing MCP Server Availability

To verify MCP servers are working:

```bash
# Test Playwright MCP
npx -y @playwright/mcp --help

# Test Browser Tools MCP
npx -y @agentdeskai/browser-tools-mcp --help

# Test Chrome DevTools MCP
npx chrome-devtools-mcp@latest --help

# Test IcePanel MCP (requires API key)
npx -y @icepanel/mcp-server@latest --help
```

---

## Notes

- MCP servers are **globally configured** in `~/.config/claude-code/mcp.json`
- All agents across all projects have access to these servers
- Agent definitions in `.claude/agents/*.md` should reference this document
- Keep this mapping document updated when adding/removing MCP servers
- Agents should prefer MCP servers over traditional CLI tools when available

