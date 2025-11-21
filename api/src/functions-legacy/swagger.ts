/**
 * Swagger UI Function
 * Serves OpenAPI documentation with Swagger UI
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as fs from 'fs';
import * as path from 'path';

// Read OpenAPI specification
const openApiSpec = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../openapi.json'), 'utf-8')
);

export async function swagger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Swagger UI requested');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    };
  }

  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CTN ASR API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.4/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .topbar {
      display: none;
    }
    .swagger-ui .info .title {
      color: #003366;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.4/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.29.4/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        tryItOutEnabled: true,
        displayRequestDuration: true,
        filter: true,
        syntaxHighlight: {
          activate: true,
          theme: "monokai"
        }
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
  `;

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    },
    body: swaggerHtml
  };
}

// Register HTTP trigger for Swagger UI
app.http('swagger', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'swagger/ui',
  handler: swagger
});

// Also serve the raw OpenAPI JSON
export async function openapiJson(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('OpenAPI JSON requested');

  if (request.method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    };
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(openApiSpec, null, 2)
  };
}

app.http('openapiJson', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'swagger/openapi.json',
  handler: openapiJson
});
