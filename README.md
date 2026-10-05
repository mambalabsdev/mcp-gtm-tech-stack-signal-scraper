# Tech Stack Signal Detector MCP Server

[![Smithery](https://smithery.ai/badge/mambabuilt/mcp-gtm-tech-stack-signal-scraper)](https://smithery.ai/servers/mambabuilt/mcp-gtm-tech-stack-signal-scraper) [![Glama score](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper/badges/score.svg)](https://glama.ai/mcp/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![MCP Registry](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.modelcontextprotocol.io%2Fv0%2Fservers%3Fsearch%3Dcom.mambabuilt%252Fmcp-gtm-tech-stack-signal-scraper%26limit%3D1&query=%24.servers%5B0%5D._meta%5B%22io.modelcontextprotocol.registry%2Fofficial%22%5D.status&label=mcp%20registry&color=blue)](https://registry.modelcontextprotocol.io/v0/servers?search=com.mambabuilt/mcp-gtm-tech-stack-signal-scraper&limit=1) [![npm version](https://img.shields.io/npm/v/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/package/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![npm downloads](https://img.shields.io/npm/dm/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://www.npmjs.com/package/@mambalabsdev/mcp-gtm-tech-stack-signal-scraper) [![license](https://img.shields.io/github/license/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)](https://github.com/mambalabsdev/mcp-gtm-tech-stack-signal-scraper/blob/main/LICENSE) [![mcpservers.org](https://img.shields.io/badge/mcpservers.org-listed-blue)](https://mcpservers.org/servers/mambalabsdev/mcp-gtm-tech-stack-signal-scraper)

An MCP server that detects which go-to-market tools a company runs, straight from its public website. It wraps the Mamba Labs Tech Stack Signal Detector actor on Apify and returns a Clay-ready flat JSON row to any MCP client.

## What's Inside

- [What it does](#what-it-does)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Example prompts](#example-prompts)
- [Inputs](#inputs)
- [Output](#output)
- [Example output](#example-output)
- [Features](#features)
- [How each call runs](#how-each-call-runs)
- [Full actor documentation](#full-actor-documentation)
- [Mamba Labs GTM Suite](#mamba-labs-gtm-suite)
- [License](#license)

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

Every input the tool accepts, generated from the server's own tool list.

| Input | Type | Required | Description |
| --- | --- | --- | --- |
| `domain` | string | no | Bare company domain without https:// and without a trailing slash. Example: stripe.com. Supply this, company_domain or url. |
| `company_domain` | string | no | Deprecated alias for domain, accepted by the actor for older callers. Prefer domain. |
| `url` | string | no | Deprecated alias for domain, accepted by the actor as a full company website URL. Prefer domain. |
| `domains` | array of string | no | A list of bare company domains to check in one run, one row per domain. The actor processes them in batches inside a single run, so a list costs one run start instead of one per domain. Use this or domain. |
| `crawl_additional_pages` | boolean | no | If true, crawls up to 2 additional pages per domain (pricing, product) to improve detection coverage. Slightly increases run time. Defaults to true when omitted. |
| `technologies` | array of `hubspot`, `salesforce`, `marketo`, `pardot`, `intercom`, `drift`, `apollo`, `outreach`, `gong`, `zoominfo` | no | Report only these tools instead of every detectable one, which is how you answer "is this company using X". Only the ten tools with a client side fingerprint are selectable; Clay, Salesloft, Instantly and Lemlist leave no trace on a website and cannot be detected from one. Detection is unchanged either way, so a filtered call costs the same and reuses the same cache. Omit for every tool. |
| `skipCache` | boolean | no | By default a clean detection is cached for 7 days and reused on repeat lookups, skipping the browser launch. Set true to force a fresh detection and ignore any cached result. |

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

## How each call runs

Each call starts the actor run, polls it until it finishes, then reads the dataset. The run is allowed 1,800 seconds. If the run is still going when this call stops waiting, the call returns the run id and a console link instead of a timeout, so the result is never lost.

## Full actor documentation

This server is a thin client and holds no detection logic. For the complete input and output reference, pricing, and run history, see the Apify Store page:

https://apify.com/mambalabs/gtm-tech-stack-signal-scraper

---

## Mamba Labs GTM Suite

This server is one of 54 Mamba Labs MCP servers, each backed by a dedicated Apify actor and published under [@mambalabsdev on npm](https://www.npmjs.com/org/mambalabsdev). The ones closest to this server:

| Actor | Immutable Actor ID |
|---|---|
| [GTM Hiring Signal Scraper](https://apify.com/mambalabs/gtm-hiring-signal-scraper) | `D7O1SA2EqwHGsGr1P` |
| [Tech Stack Signal Detector](https://apify.com/mambalabs/gtm-tech-stack-signal-scraper) | `qyd7nNyqFPelQViBx` |
| [GTM Signals Aggregator](https://apify.com/mambalabs/b2b-buying-signals-hiring-tech-stack-intent-for-clay) | `xKdRfnfFNkdMpFuNs` |
| [Job Board Keyword Signal Scanner](https://apify.com/mambalabs/job-board-keyword-signal-scanner) | `4DvqpvhMR74NLcDDY` |
| [Domain to LinkedIn URL Resolver](https://apify.com/mambalabs/domain-to-linkedin-url-resolver) | `3HtnSaqPHOg1Qg5gx` |
| [ICP Fit Scorer](https://apify.com/mambalabs/icp-account-lead-scoring-fit-scorer-0-100-for-clay) | `W161DT8W4kW55dMFh` |
| [Domain Deliverability Checker](https://apify.com/mambalabs/domain-deliverability-checker) | `0tVgxI7A6o9jMlxmc` |
| [Company Firmographic Enricher](https://apify.com/mambalabs/company-firmographic-enricher) | `YlUtLWjfPpqykmB8g` |
| [Company Social Presence Mapper](https://apify.com/mambalabs/company-social-presence-mapper) | `4k6CCemkgBDz18m2h` |
| [Company Identity Resolver](https://apify.com/mambalabs/company-identity-resolver) | `lr8fTRAmZCBZmuwwh` |
| [Company Change Event Feed](https://apify.com/mambalabs/company-change-event-feed) | `oX44rS0fkEJ3rXLWe` |
| [Funding and Press Signal Scanner](https://apify.com/mambalabs/funding-press-signal-scanner) | `FS13X6dhQVgX3XOM6` |

To get twenty one of them in one install, use [@mambalabsdev/mcp-gtm-suite](https://www.npmjs.com/package/@mambalabsdev/mcp-gtm-suite).

> Built by [Mamba Labs](https://mambabuilt.com) | [npm](https://www.npmjs.com/org/mambalabsdev) | [Apify Store](https://apify.com/mambalabs)

## License

MIT

Built by Mamba Labs. https://apify.com/mambalabs
