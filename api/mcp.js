// Vercel Serverless Function: Atlassian MCP Endpoint (JSON-RPC 2.0)
const { processRpc } = require('../dist/mcp/mcpServer');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      status: 'ONLINE',
      server: 'arthakavacham-mcp-server',
      version: '1.0.0',
      description: 'Atlassian Model Context Protocol (MCP) Server on Vercel',
      endpoints: ['POST /api/mcp (JSON-RPC 2.0)']
    });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const response = await processRpc(payload || {});
    return res.status(200).json(response);
  } catch (error) {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32700, message: error.message || 'Parse error' }
    });
  }
};
