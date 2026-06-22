# GTM Tech Stack Signal Enrichment MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-gtm-tech-stack-signal-scraper)](https://smithery.ai/servers/mambabuilt/mcp-gtm-tech-stack-signal-scraper) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-gtm-tech-stack-signal-scraper%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-gtm-tech-stack-signal-scraper&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/package/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/package/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://github.com/mambalabsdev/mcp-gtm-tech-stack-signal-scraper/blob/main/LICENSE) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)

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

---

## Mamba Labs GTM Suite

This server is part of the **Mamba Labs GTM Suite**, a fleet of twelve specialized MCP servers for go-to-market signal intelligence, each backed by a dedicated Apify actor.

| Actor | Immutable Actor ID |
|---|---|
| [GTM Hiring Signal Scraper](https://console.apify.com/actors/D7O1SA2EqwHGsGr1P) | `D7O1SA2EqwHGsGr1P` |
| [GTM Tech Stack Signal Enrichment](https://console.apify.com/actors/qyd7nNyqFPelQViBx) | `qyd7nNyqFPelQViBx` |
| [GTM Signals Aggregator](https://console.apify.com/actors/xKdRfnfFNkdMpFuNs) | `xKdRfnfFNkdMpFuNs` |
| [Job Board Keyword Signal Scanner](https://console.apify.com/actors/4DvqpvhMR74NLcDDY) | `4DvqpvhMR74NLcDDY` |
| [Domain to LinkedIn URL Resolver](https://console.apify.com/actors/3HtnSaqPHOg1Qg5gx) | `3HtnSaqPHOg1Qg5gx` |
| [ICP Fit Scorer](https://console.apify.com/actors/W161DT8W4kW55dMFh) | `W161DT8W4kW55dMFh` |
| [Domain Deliverability Checker](https://console.apify.com/actors/0tVgxI7A6o9jMlxmc) | `0tVgxI7A6o9jMlxmc` |
| [Company Firmographic Enricher](https://console.apify.com/actors/YlUtLWjfPpqykmB8g) | `YlUtLWjfPpqykmB8g` |
| [Company Social Presence Mapper](https://console.apify.com/actors/4k6CCemkgBDz18m2h) | `4k6CCemkgBDz18m2h` |
| [Company Identity Resolver](https://console.apify.com/actors/lr8fTRAmZCBZmuwwh) | `lr8fTRAmZCBZmuwwh` |
| [Company Change-Event Feed](https://console.apify.com/actors/oX44rS0fkEJ3rXLWe) | `oX44rS0fkEJ3rXLWe` |
| [Funding & Press Signal Scanner](https://console.apify.com/actors/FS13X6dhQVgX3XOM6) | `FS13X6dhQVgX3XOM6` |

> Built by [Mamba Labs](https://github.com/mambalabsdev) | [npm](https://www.npmjs.com/org/mambalabsdev) | [Apify Store](https://apify.com/mambalabs)

## License

MIT

Built by Mamba Labs. https://apify.com/mambalabs
