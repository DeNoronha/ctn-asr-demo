# How to Configure the CTN MCP Server in Claude Desktop

> **Important**: The Model Context Protocol (MCP) is currently primarily supported by **Claude Desktop**. While MCP is an open protocol designed for interoperability, it is not yet widely adopted by other AI tools like ChatGPT or GitHub Copilot. **For CTN project work, we advise using Claude Desktop** to access the CTN documentation through the MCP server.

## Overview

The CTN MCP Server enables Claude Desktop to access up-to-date CTN documentation directly, allowing Claude to provide accurate answers about CTN systems, architecture, and procedures. This guide will walk you through configuring your Claude Desktop to connect to the MCP server.

### What You'll Get

Once configured, you can ask Claude questions about CTN directly, such as:
- "What are the authentication requirements for the CTN API?"
- "How do I deploy the booking portal?"
- "Show me the database schema for legal entities"
- "What are the HowTo guides available?"

Claude will search the live documentation and provide accurate, contextual answers.

## Prerequisites

Before you begin, ensure you have:

1. **Claude Desktop** installed on your computer
   - Download from: [https://claude.ai/download](https://claude.ai/download)
   - Supported platforms: macOS, Windows, Linux

2. **MCP Server URL** (provided by your DevOps team)
   - Format: `https://ca-ctn-mcp-server.XXXXX.azurecontainerapps.io`

## Configuration Steps

### Step 1: Locate Your Claude Desktop Configuration File

The configuration file location depends on your operating system:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Open the Configuration File

1. Open your file explorer or terminal
2. Navigate to the configuration directory (see Step 1)
3. If the file doesn't exist, create it with an empty JSON object: `{}`
4. Open the file in your preferred text editor (e.g., VS Code, Notepad++, TextEdit)

### Step 3: Add the CTN MCP Server Configuration

Add the following configuration to your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "ctn-documentation": {
      "url": "https://ca-ctn-mcp-server.XXXXX.azurecontainerapps.io/mcp/sse",
      "transport": "sse"
    }
  }
}
```

**Important**: Replace `ca-ctn-mcp-server.XXXXX.azurecontainerapps.io` with the actual URL provided by your DevOps team.

#### If You Already Have Other MCP Servers

If your configuration file already has other MCP servers configured, simply add the CTN server to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "some-command"
    },
    "ctn-documentation": {
      "url": "https://ca-ctn-mcp-server.XXXXX.azurecontainerapps.io/mcp/sse",
      "transport": "sse"
    }
  }
}
```

### Step 4: Save and Restart Claude Desktop

1. Save the configuration file
2. **Completely quit Claude Desktop** (not just close the window)
   - macOS: Cmd+Q or Claude → Quit Claude
   - Windows: File → Exit
   - Linux: File → Quit
3. Restart Claude Desktop

### Step 5: Verify the Connection

1. Open a new conversation in Claude Desktop
2. Look for a small plug or connection icon in the interface (usually in the toolbar or status bar)
3. The first time you connect, you may experience a **5-10 second delay** - this is normal! The MCP server scales to zero when not in use (to save costs) and needs to "wake up" when you connect.
4. After the initial connection, responses should be fast (<1 second)

Test the connection by asking Claude:

```
Can you search the CTN documentation for authentication?
```

or

```
List all CTN documentation topics available.
```

If the connection is working, Claude will respond with information from the CTN documentation.

## Available Commands

Once connected, you can use the following types of queries with Claude:

### Search Documentation
```
Search the CTN documentation for [topic]
```
Example: "Search the CTN documentation for database migrations"

### Get Specific Page
```
Get the CTN documentation page about [topic]
```
Example: "Get the CTN documentation page about deployment procedures"

### List All Topics
```
List all available CTN documentation topics
```

### Ask Questions
You can also ask natural questions, and Claude will automatically search the documentation:

```
How do I deploy the admin portal?
What are the coding standards for CTN?
Show me the database schema
What are the security requirements?
```

## Troubleshooting

### Issue: "Server not responding" or Connection Timeout

**Solution**: The server may be scaling from zero (cold start). This is normal and expected for the first connection after being idle. Wait 10-15 seconds and try again.

### Issue: "MCP server not found" or No Results

**Possible causes and solutions:**

1. **Check URL**: Verify the URL in your config file is correct
   - It should end with `/mcp/sse`
   - Ask your DevOps team for the correct URL

2. **Restart Claude**: Ensure you completely quit and restarted Claude Desktop after changing the config

3. **JSON Syntax**: Verify your JSON is valid
   - Use a JSON validator: https://jsonlint.com/
   - Check for missing commas, brackets, or quotes

4. **File Location**: Ensure you edited the correct config file for your OS

### Issue: Slow Responses on First Query

**Cause**: Cold start - the server scales to zero when idle to save costs.

**Solution**: This is expected behavior and not a problem. The first query after idle may take 5-10 seconds. Subsequent queries will be fast.

### Issue: Outdated Documentation

**Solution**: The documentation is automatically refreshed daily at 2 AM UTC, and also after each documentation deployment. If you notice outdated information:

1. Wait a few hours (the next deployment may fix it)
2. Contact your DevOps team to manually trigger a refresh

## Understanding Cold Starts

The CTN MCP Server is optimized for cost efficiency. It automatically scales to zero when no one is using it (after 5 minutes of inactivity). This means:

- **First connection after idle**: 5-10 seconds (server is "waking up")
- **Subsequent queries while active**: <1 second (server is "warm")
- **After 5 minutes idle**: Server scales back to zero (saves money)

This is intentional and allows the team to run the service at minimal cost (~€7-10/month for 5 users) instead of ~€50-100/month for always-on hosting.

**Best practice**: If you're doing extensive research, keep asking questions - the server will stay "warm" and responses will be fast.

## Security & Privacy

- The MCP server only has **read-only** access to CTN documentation
- No sensitive data or secrets are stored in the MCP server
- All communication uses HTTPS encryption
- The server cannot access your local files or other data
- Claude Desktop's normal security and privacy policies apply

## Benefits of Using the MCP Server

✅ **Always up-to-date**: Documentation is automatically refreshed after deployments
✅ **Fast search**: Full-text search across all CTN documentation
✅ **Contextual**: Claude understands the full context of your questions
✅ **Convenient**: No need to manually browse documentation
✅ **Accurate**: Responses are based on official CTN documentation, not Claude's general knowledge

## Why Claude Desktop?

While the Model Context Protocol (MCP) is an open standard that could theoretically be supported by any AI tool, **Claude Desktop is currently the primary tool with full MCP support**. Other AI assistants like ChatGPT, GitHub Copilot, and others have not yet adopted the MCP standard.

For this reason, **we recommend using Claude Desktop for CTN project work** when you need access to documentation through the MCP server.

### MCP is an Open Protocol

The MCP protocol is open and could be adopted by other tools in the future. If you prefer other AI tools, you may need to:
- Wait for them to add MCP support
- Access documentation through traditional means (browser)
- Use Claude Desktop when you need documentation integration

## Need Help?

If you encounter issues not covered in this guide:

1. **Check the troubleshooting section** above
2. **Ask in the team chat** - other team members may have experienced the same issue
3. **Contact DevOps team** - they can check server logs and configuration
4. **Try the MCP server health endpoint**: Open `https://YOUR_MCP_SERVER_URL/health` in your browser to check if the server is running

## Summary

**Configuration in 3 steps:**

1. Edit `claude_desktop_config.json`
2. Add CTN MCP server URL with `/mcp/sse` endpoint
3. Restart Claude Desktop

**First connection**: Expect 5-10 second delay (cold start - this is normal!)

**Subsequent queries**: Fast responses (<1 second)

**Recommended tool**: Claude Desktop (best MCP support)

Happy coding with CTN documentation at your fingertips! 🚀
