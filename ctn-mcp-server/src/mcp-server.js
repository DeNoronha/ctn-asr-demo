/**
 * MCP Server Protocol Implementation for CTN Documentation
 *
 * Implements the Model Context Protocol to serve documentation as:
 * - Resources: List and read documentation pages
 * - Tools: Search, get page, list topics
 *
 * Optimized for use with Claude Desktop and other MCP clients.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

/**
 * MCP Server for CTN Documentation
 */
class CTNMCPServer {
  constructor(documentationLoader, config, logger) {
    this.documentationLoader = documentationLoader;
    this.config = config;
    this.logger = logger;
    this.server = new Server(
      {
        name: 'ctn-documentation',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  setupHandlers() {
    // List available resources (documentation pages)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.logger.debug({ message: 'MCP: ListResources request' });

      const pages = this.documentationLoader.listPages();

      return {
        resources: pages.map(page => ({
          uri: `ctn-doc://${page.path}`,
          name: page.title,
          mimeType: 'text/plain',
          description: `Documentation page: ${page.title} (${page.wordCount} words)`,
        })),
      };
    });

    // Read specific resource (documentation page)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      this.logger.debug({ message: 'MCP: ReadResource request', uri });

      if (!uri.startsWith('ctn-doc://')) {
        throw new Error(`Invalid resource URI: ${uri}`);
      }

      const path = uri.replace('ctn-doc://', '');
      const page = this.documentationLoader.getPage(path);

      if (!page) {
        throw new Error(`Resource not found: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'text/plain',
            text: `# ${page.title}\n\n${page.content}`,
          },
        ],
      };
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug({ message: 'MCP: ListTools request' });

      return {
        tools: [
          {
            name: 'search_documentation',
            description: 'Search across all CTN documentation. Returns relevant pages with snippets.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query string',
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 10)',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_page',
            description: 'Retrieve a specific documentation page by path or title.',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Page path (e.g., "/getting-started" or "/")',
                },
                title: {
                  type: 'string',
                  description: 'Page title (alternative to path)',
                },
              },
            },
          },
          {
            name: 'list_topics',
            description: 'List all available documentation topics and sections.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.info({ message: 'MCP: CallTool request', tool: name, arguments: args });

      switch (name) {
        case 'search_documentation':
          return this.handleSearchDocumentation(args);

        case 'get_page':
          return this.handleGetPage(args);

        case 'list_topics':
          return this.handleListTopics(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Handle search_documentation tool call
   * @param {Object} args - Tool arguments
   * @returns {Object} Tool result
   */
  async handleSearchDocumentation(args) {
    const { query, maxResults = 10 } = args;

    if (!query || typeof query !== 'string') {
      throw new Error('query parameter is required and must be a string');
    }

    const results = this.documentationLoader.search(query, maxResults);

    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No results found for query: "${query}"`,
          },
        ],
      };
    }

    // Format results as text
    const resultText = results
      .map((result, index) => {
        return `${index + 1}. **${result.title}** (${result.path})\n   ${result.snippet}\n`;
      })
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `Found ${results.length} result(s) for "${query}":\n\n${resultText}`,
        },
      ],
    };
  }

  /**
   * Handle get_page tool call
   * @param {Object} args - Tool arguments
   * @returns {Object} Tool result
   */
  async handleGetPage(args) {
    const { path, title } = args;

    let page = null;

    if (path) {
      page = this.documentationLoader.getPage(path);
    } else if (title) {
      // Search by title
      const pages = this.documentationLoader.listPages();
      const matchingPage = pages.find(p => p.title.toLowerCase() === title.toLowerCase());
      if (matchingPage) {
        page = this.documentationLoader.getPage(matchingPage.path);
      }
    } else {
      throw new Error('Either path or title parameter is required');
    }

    if (!page) {
      return {
        content: [
          {
            type: 'text',
            text: `Page not found: ${path || title}`,
          },
        ],
      };
    }

    // Format page content
    const headingsText = page.headings.length > 0
      ? `\n\n## Table of Contents\n${page.headings.map(h => `${'  '.repeat(h.level - 1)}- ${h.text}`).join('\n')}`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `# ${page.title}\n\n**Path:** ${page.path}\n**Word Count:** ${page.wordCount}${headingsText}\n\n---\n\n${page.content}`,
        },
      ],
    };
  }

  /**
   * Handle list_topics tool call
   * @param {Object} args - Tool arguments
   * @returns {Object} Tool result
   */
  async handleListTopics(args) {
    const pages = this.documentationLoader.listPages();

    if (pages.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No documentation pages loaded. Please refresh the documentation.',
          },
        ],
      };
    }

    // Group pages by top-level path
    const topics = new Map();

    pages.forEach(page => {
      const parts = page.path.split('/').filter(p => p.length > 0);
      const topLevel = parts.length > 0 ? parts[0] : 'root';

      if (!topics.has(topLevel)) {
        topics.set(topLevel, []);
      }
      topics.get(topLevel).push(page);
    });

    // Format topics as text
    let topicsText = `# CTN Documentation Topics\n\n`;
    topicsText += `Total pages: ${pages.length}\n\n`;

    topics.forEach((topicPages, topic) => {
      topicsText += `## ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n`;
      topicPages.forEach(page => {
        topicsText += `- ${page.title} (${page.path}) - ${page.wordCount} words\n`;
      });
      topicsText += '\n';
    });

    return {
      content: [
        {
          type: 'text',
          text: topicsText,
        },
      ],
    };
  }

  /**
   * Connect server with stdio transport (for local use)
   * @returns {Promise<void>}
   */
  async connectStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info({ message: 'MCP server connected via stdio' });
  }

  /**
   * Create SSE transport for HTTP mode (for Azure deployment)
   * @param {Object} expressApp - Express app instance
   * @returns {void}
   */
  setupSSETransport(expressApp) {
    this.logger.info({ message: 'Setting up MCP SSE transport for HTTP mode' });

    // SSE endpoint for MCP communication
    expressApp.get('/mcp/sse', async (req, res) => {
      this.logger.info({ message: 'MCP SSE connection established', ip: req.ip });

      const transport = new SSEServerTransport('/mcp/message', res);
      await this.server.connect(transport);
    });

    // Message endpoint for MCP communication
    expressApp.post('/mcp/message', async (req, res) => {
      // Transport handles the request
      res.status(200).send();
    });
  }

  /**
   * Get server instance
   * @returns {Server} MCP server instance
   */
  getServer() {
    return this.server;
  }
}

module.exports = CTNMCPServer;
