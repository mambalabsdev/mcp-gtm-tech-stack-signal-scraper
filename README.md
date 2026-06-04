# GTM Tech Stack Signal Enrichment MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-gtm-tech-stack-signal-scraper)](https://smithery.ai/server/mambabuilt/mcp-gtm-suite) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-suite) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-gtm-tech-stack-signal-scraper%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-gtm-suite&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/~mambalabsdev) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/~mambalabsdev) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://github.com/mambalabsdev) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)

An MCP server that detects which go-to-market tools a company runs, straight from its public website. It wraps the Mamba Labs GTM Tech Stack Signal Enrichment actor on Apify and returns a Clay-ready flat JSON row to any MCP client.

## What it does

Give it a company domain and it inspects the public-facing scripts and pages to detect the CRM, sequencer, and marketing automation tools in use. You get back per-tool boolean flags (HubSpot, Salesforce, Apollo, Gong, Intercom, Marketo), counts, and a composite tech stack signal, ready to drop into Clay, a CRM, or an AI agent workflow. All of the detection runs on Apify. This package is a thin client that calls the actor and hands back the result.

## Quick start

You need Node.js 18 or newer and an Apify account with an API token.

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "mamba-gtm-tech-stack": {
      "command": "npx",
      "args": ["-y", "@mambalabsdev/mcp-gtm-tech-stack-signal-scraper"],
      "env": {
        "APIFY_TOKEN": "your-apify-token"
      }
    }
  }
}
```

Get your token at https://console.apify.com/account/integrations, paste it in, and restart Claude Desktop. The `detect_gtm_tech_stack` tool will be available.

## Prerequisites

- Node.js 18 or newer
- An Apify account with an API token

## Example prompts

- "What GTM tools does stripe.com run? Check their tech stack."
- "Does openai.com use HubSpot or Salesforce? Detect their CRM."
- "Pull the marketing automation and sequencer signals for figma.com."
- "Detect the GTM tech stack for datadoghq.com and list every tool found."

## Inputs

- `domain` (required): the bare company domain, no `https://` and no trailing slash. Example: `stripe.com`
- `crawl_additional_pages` (optional): if true, crawls up to 2 extra pages (pricing, product) for better coverage. Defaults to true when omitted.

## Output

The tool returns the actor's flat JSON row for the scanned company. Fields include the detected CRM, sequencer, and marketing automation tools, a GTM tool count, a composite tech stack signal, and per-tool boolean flags such as `uses_hubspot`, `uses_salesforce`, `uses_apollo`, `uses_gong`, `uses_intercom`, and `uses_marketo`. See the Apify Store page for the full output schema.

## Example output

```json
{
  "company_domain": "hubspot.com",
  "crm_detected": "hubspot",
  "seq_tool_detected": null,
  "uses_hubspot": true,
  "uses_salesforce": false,
  "uses_apollo": false,
  "uses_gong": false,
  "uses_intercom": true,
  "uses_marketo": false,
  "marketing_automation_detected": "hubspot",
  "gtm_tool_count": 2,
  "tech_stack_signal": "high"
}
```

## Features

- Per-tool boolean flags: HubSpot, Salesforce, Apollo, Gong, Intercom, Marketo
- CRM and sequencer classification, plus marketing automation detection
- Composite tech_stack_signal and gtm_tool_count
- Flat JSON, every field present in every row

## Full actor documentation

This server is a thin client and holds no detection logic. For the complete input and output reference, pricing, and run history, see the Apify Store page:

https://apify.com/mambalabs/gtm-tech-stack-signal-scraper

## Mamba Labs GTM Suite

This is one of six actors in the Mamba Labs GTM Suite, covering hiring signals, tech stack detection, signal aggregation, job board keyword scanning, LinkedIn URL resolution, and ICP scoring. See them all at https://apify.com/mambalabs.

## Related Mamba Labs MCP servers

The rest of the Mamba Labs GTM toolkit, each as its own MCP server:

- [Mamba Labs GTM Suite (all six tools)](https://github.com/mambalabsdev/mcp-gtm-suite)
- [GTM Hiring Signal Scraper](https://github.com/mambalabsdev/mcp-gtm-hiring-signal-scraper)
- [GTM Signals Aggregator](https://github.com/mambalabsdev/mcp-gtm-signals-aggregator)
- [Job Board Keyword Signal Scanner](https://github.com/mambalabsdev/mcp-job-board-keyword-signal-scanner)
- [Domain to LinkedIn URL Resolver](https://github.com/mambalabsdev/mcp-domain-to-linkedin-url-resolver)
- [ICP Fit Scorer](https://github.com/mambalabsdev/mcp-icp-fit-scorer)

## License

MIT

Built by Mamba Labs. https://apify.com/mambalabs
