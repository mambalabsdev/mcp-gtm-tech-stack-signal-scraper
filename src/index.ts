#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Read the package version so the server reports the same version as the package.
const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(here, "..", "package.json"), "utf8"),
) as { version: string; name: string };

// Distinctive UA so Apify run meta.userAgent marks MCP-originated runs.
const USER_AGENT = `mambalabs-mcp ${pkg.name}@${pkg.version}`;

const APIFY_TOKEN = process.env.APIFY_TOKEN;

// The tilde between the org name and the actor name is Apify's required separator
// for the org/actor path. It is not a slash.
const ACTOR_ENDPOINT =
  "https://api.apify.com/v2/acts/qyd7nNyqFPelQViBx/run-sync-get-dataset-items?timeout=300";

const server = new McpServer({
  name: "mamba-gtm-tech-stack-signal-scraper",
  version: pkg.version,
});

server.registerTool(
  "detect_gtm_tech_stack",
  {
    title: "Detect GTM Tech Stack",
    description:
      "Detect which GTM tools a company uses from its public-facing website. Returns CRM, sequencer, and marketing automation signals as a flat, Clay-ready JSON row, with per-tool boolean flags for HubSpot, Salesforce, Apollo, Gong, Intercom, and Marketo, plus a composite tech stack signal. Read-only; requires an APIFY_TOKEN and consumes Apify credits per call.",
    annotations: {
      title: "Detect GTM Tech Stack",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    inputSchema: {
    // The actor's own input schema marks NOTHING required and accepts three
    // ways of naming the company. Marking domain required here made an input
    // the actor accepts invalid at the tool boundary, which is the defect this
    // wrapper existed with since it shipped.
    domain: z
      .string()
      .optional()
      .describe(
        "Bare company domain without https:// and without a trailing slash. Example: stripe.com. Supply this, company_domain or url.",
      ),
    company_domain: z
      .string()
      .optional()
      .describe(
        "Deprecated alias for domain, accepted by the actor for older callers. Prefer domain.",
      ),
    url: z
      .string()
      .optional()
      .describe(
        "Deprecated alias for domain, accepted by the actor as a full company website URL. Prefer domain.",
      ),
    crawl_additional_pages: z
      .boolean()
      .optional()
      .describe(
        "If true, crawls up to 2 additional pages per domain (pricing, product) to improve detection coverage. Slightly increases run time. Defaults to true when omitted.",
      ),
  },
  },
  async ({ domain, company_domain, url, crawl_additional_pages }) => {
    if (!APIFY_TOKEN) {
      return { isError: true, content: [{ type: "text", text: "APIFY_TOKEN is not set. Create a token at https://console.apify.com/account/integrations and set it as the APIFY_TOKEN environment variable." }] };
    }

    // The one guard that is NOT a divergence. Measured 2026-08-13: the actor's
    // built schema says required: [], but with no company named at all the run
    // throws "Provide input.domain (single) or input.domains (array)" and exits
    // FAILED. Rejecting here rejects only what the actor itself rejects, and
    // saves the caller a failed billable run.
    if (domain === undefined && company_domain === undefined && url === undefined) {
      return {
        isError: true,
        content: [{ type: "text", text: "Provide domain, company_domain or url. The actor cannot run without one of them." }],
      };
    }

    const input: Record<string, unknown> = {};
    if (domain !== undefined) input.domain = domain;
    if (company_domain !== undefined) input.company_domain = company_domain;
    if (url !== undefined) input.url = url;
    if (crawl_additional_pages !== undefined) {
      input.crawl_additional_pages = crawl_additional_pages;
    }

    let response: Response;
    try {
      response = await fetch(ACTOR_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APIFY_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify(input),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: `Could not reach the Apify API: ${message}` }],
      };
    }

    if (!response.ok) {
      let detail = "";
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body?.error?.message) detail = ` ${body.error.message}`;
      } catch {
        detail = "";
      }

      let message: string;
      switch (response.status) {
        case 401:
          message = "Invalid Apify token. Check your APIFY_TOKEN environment variable.";
          break;
        case 402:
          message =
            "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
          break;
        case 408:
          message =
            "Actor run timed out after 300 seconds. Try again, or run the actor on Apify directly for longer jobs.";
          break;
        default:
          message = `Apify request failed with status ${response.status}.${detail}`;
      }
      return { isError: true, content: [{ type: "text", text: message }] };
    }

    const items = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
