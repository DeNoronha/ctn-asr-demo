# MCP Server Mapping for Agents

**Last Updated:** October 16, 2025
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

---

## Agent → MCP Server Mapping

### Test Engineer (TE)
**Primary MCP Servers:**
- ✅ **playwright** - For creating and running E2E tests in `web/e2e/`
- ✅ **chrome-devtools** - For debugging test failures, capturing console errors, analyzing network requests
- ✅ **browser** - For web automation tasks during test setup

**Use Cases:**
- Create Playwright test files for new features
- Debug failing tests by inspecting console logs
- Capture network traffic to diagnose API call issues
- Automate browser interactions for test coverage
- Investigate visual regression issues

**When NOT to use MCP servers:**
- API testing with curl (use Bash tool directly)
- Creating bash test scripts in `api/tests/`

---

### Design Analyst (DA)
**Primary MCP Servers:**
- ✅ **browser** - For testing responsive design, accessibility, visual consistency
- ✅ **chrome-devtools** - For inspecting DOM, analyzing CSS, checking accessibility violations

**Use Cases:**
- Test UI responsiveness across different viewport sizes
- Inspect accessibility attributes (ARIA labels, roles, etc.)
- Analyze CSS and layout issues
- Validate color contrast ratios
- Check keyboard navigation and focus management

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

### Technical Writer (TW)
**Primary MCP Servers:**
- ✅ **icepanel** - For generating architecture diagrams to document system design

**Use Cases:**
- Create architecture diagrams for `docs/architecture/`
- Visualize data flow between frontend, API, and database
- Document system components and their relationships
- Generate ERD diagrams for database schema documentation

---

### Database Expert (DE)
**MCP Servers:** ❌ None required
- DE uses direct database connections via psql or API queries
- Focuses on schema analysis, query optimization, and DDL management
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

