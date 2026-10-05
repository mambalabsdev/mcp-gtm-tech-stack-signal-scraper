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



type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

// How long the actor run itself is allowed to take, in seconds. One value for
// every Mamba Labs wrapper, set 2026-10-05: start and poll exists so a long run
// survives, and a shorter limit would end the long runs it was built for. Past
// this limit the run ends TIMED-OUT and the caller is told so, with the run id.
const ACTOR_RUN_TIMEOUT_SECS = 1800;

// How long this wrapper waits for that run, in milliseconds. The actor's own
// timeout plus two minutes, so the run's own TIMED-OUT status is what the
// caller sees rather than the wrapper giving up first and reporting nothing.
const WRAPPER_WAIT_MS = (ACTOR_RUN_TIMEOUT_SECS + 120) * 1000;

// MAMBA_MCP_POLL_INTERVAL_MS exists for the test suite, which drives the poll
// loop against a mocked Apify API. Callers never need to set it.
const POLL_INTERVAL_MS = Number(process.env.MAMBA_MCP_POLL_INTERVAL_MS) || 3000;

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED", "ABORTING"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Shared caller. actorPath is the actor's immutable Apify actor ID (a stable key
// that survives Store renames). The /v2/acts/{id} endpoint accepts it directly,
// so a Store rename never breaks these calls.
//
// START AND POLL, NOT RUN-SYNC. Apify's synchronous endpoints carry a platform
// ceiling of 300 seconds on the HTTP wait itself and answer 408 past it whatever
// the timeout parameter says, so a long run read as a timeout while the actor
// went on to finish and bill. Starting the run, polling it to a terminal status
// and then reading the dataset waits exactly as long as the run takes, and a
// call that stops waiting returns the run id so the result is never lost.
//
// The token is read here rather than at module load, so the tool registers
// unconditionally and a server started without APIFY_TOKEN still advertises its
// capabilities instead of reporting none.
async function runActor(
  actorPath: string,
  actorLabel: string,
  input: Record<string, unknown>,
): Promise<ToolResult> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    return { isError: true, content: [{ type: "text", text: "APIFY_TOKEN is not set. Create a token at https://console.apify.com/account/integrations and set it as the APIFY_TOKEN environment variable." }] };
  }

  const headers = {
    Authorization: `Bearer ${APIFY_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
  };

  const httpError = async (response: Response): Promise<string> => {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) detail = ` ${body.error.message}`;
    } catch {
      detail = "";
    }
    switch (response.status) {
      case 400:
        return `The ${actorLabel} run was rejected as invalid input.${detail}`;
      case 401:
        return "Invalid Apify token. Check your APIFY_TOKEN environment variable.";
      case 402:
        return "Insufficient Apify credits. Check your account balance at https://console.apify.com/billing";
      default:
        return `Apify request to ${actorLabel} failed with status ${response.status}.${detail}`;
    }
  };

  // 1. Start the run.
  let started: Response;
  try {
    started = await fetch(
      `https://api.apify.com/v2/acts/${actorPath}/runs?timeout=${ACTOR_RUN_TIMEOUT_SECS}`,
      { method: "POST", headers, body: JSON.stringify(input) },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Could not reach the Apify API: ${message}` }] };
  }
  if (!started.ok) {
    return { isError: true, content: [{ type: "text", text: await httpError(started) }] };
  }

  let run: { id?: string; status?: string; defaultDatasetId?: string };
  try {
    run = ((await started.json()) as { data?: typeof run }).data ?? {};
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run start returned a response that could not be parsed: ${message}` }] };
  }
  const runId = run.id;
  if (!runId) {
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run start returned no run id, so there is nothing to wait for.` }] };
  }

  // 2. Poll to a terminal status.
  const deadline = Date.now() + WRAPPER_WAIT_MS;
  let status = run.status ?? "READY";
  let datasetId = run.defaultDatasetId;
  while (!TERMINAL.has(status)) {
    if (Date.now() >= deadline) {
      return {
        isError: true,
        content: [{ type: "text", text: `The ${actorLabel} run ${runId} was still ${status} after ${Math.round(WRAPPER_WAIT_MS / 1000)} seconds and this call stopped waiting. The run itself is still on Apify: read it at https://console.apify.com/actors/runs/${runId}` }],
      };
    }
    await sleep(POLL_INTERVAL_MS);
    let poll: Response;
    try {
      poll = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, { headers });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text", text: `Lost contact with the Apify API while waiting for ${actorLabel} run ${runId}: ${message}` }] };
    }
    if (!poll.ok) {
      return { isError: true, content: [{ type: "text", text: await httpError(poll) }] };
    }
    const body = (await poll.json()) as { data?: { status?: string; defaultDatasetId?: string } };
    status = body.data?.status ?? status;
    datasetId = body.data?.defaultDatasetId ?? datasetId;
  }

  // 3. A run that did not succeed is a failure the caller must see, never an
  // empty success. Surfacing it here is what keeps a crashed run from reading
  // as "no results found".
  if (status !== "SUCCEEDED") {
    return {
      isError: true,
      content: [{ type: "text", text: `The ${actorLabel} run did not succeed (run ID: ${runId}, status: ${status}).` }],
    };
  }
  if (!datasetId) {
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run ${runId} succeeded but reported no dataset, so there is nothing to return.` }] };
  }

  // 4. Read the dataset.
  let ds: Response;
  try {
    ds = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?format=json`, { headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Could not read the ${actorLabel} dataset: ${message}` }] };
  }
  if (!ds.ok) {
    return { isError: true, content: [{ type: "text", text: await httpError(ds) }] };
  }

  let items: unknown;
  try {
    items = await ds.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run returned a response that could not be parsed: ${message}` }] };
  }

  if (!Array.isArray(items)) {
    const asObj = items as { error?: { type?: string; message?: string } };
    const detail = asObj?.error?.message
      ? `${asObj.error.message}`
      : JSON.stringify(items);
    return { isError: true, content: [{ type: "text", text: `The ${actorLabel} run did not return a dataset. ${detail}` }] };
  }

  // Pass actor output through unchanged: the wrapper never reinterprets a
  // status field.
  return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
}

const server = new McpServer({
  name: "mamba-gtm-tech-stack-signal-scraper",
  version: pkg.version,
});

server.registerTool(
  "detect_gtm_tech_stack",
  {
    title: "Detect GTM Tech Stack",
    description:
      "Detect which GTM tools a company uses from its public-facing website. Returns CRM, sequencer, and marketing automation signals as a flat, Clay-ready JSON row, with per-tool boolean flags for HubSpot, Salesforce, Apollo, Gong, Intercom, and Marketo, plus a composite tech stack signal. Pass technologies to narrow the answer to named tools. Read-only; requires an APIFY_TOKEN and consumes Apify credits per call.",
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
    domains: z
      .array(z.string())
      .optional()
      .describe(
        "A list of bare company domains to check in one run, one row per domain. The actor processes them in batches inside a single run, so a list costs one run start instead of one per domain. Use this or domain.",
      ),
    crawl_additional_pages: z
      .boolean()
      .optional()
      .describe(
        "If true, crawls up to 2 additional pages per domain (pricing, product) to improve detection coverage. Slightly increases run time. Defaults to true when omitted.",
      ),
    technologies: z
      .array(z.enum(["hubspot", "salesforce", "marketo", "pardot", "intercom", "drift", "apollo", "outreach", "gong", "zoominfo"]))
      .optional()
      .describe(
        "Report only these tools instead of every detectable one, which is how you answer \"is this company using X\". Only the ten tools with a client side fingerprint are selectable; Clay, Salesloft, Instantly and Lemlist leave no trace on a website and cannot be detected from one. Detection is unchanged either way, so a filtered call costs the same and reuses the same cache. Omit for every tool.",
      ),
    skipCache: z
      .boolean()
      .optional()
      .describe(
        "By default a clean detection is cached for 7 days and reused on repeat lookups, skipping the browser launch. Set true to force a fresh detection and ignore any cached result.",
      ),
  },
  },
  async ({ domain, company_domain, url, domains, crawl_additional_pages, technologies, skipCache }) => {
    // The one guard that is NOT a divergence. Measured 2026-08-13: the actor's
    // built schema says required: [], but with no company named at all the run
    // throws "Provide input.domain (single) or input.domains (array)" and exits
    // FAILED. Rejecting here rejects only what the actor itself rejects, and
    // saves the caller a failed billable run.
    const hasBatch = Array.isArray(domains) && domains.length > 0;
    if (!hasBatch && domain === undefined && company_domain === undefined && url === undefined) {
      return {
        isError: true,
        content: [{ type: "text", text: "Provide domain, domains, company_domain or url. The actor cannot run without one of them." }],
      };
    }

    const input: Record<string, unknown> = {};
    if (domain !== undefined) input.domain = domain;
    if (company_domain !== undefined) input.company_domain = company_domain;
    if (url !== undefined) input.url = url;
    if (hasBatch) input.domains = domains;
    if (crawl_additional_pages !== undefined) {
      input.crawl_additional_pages = crawl_additional_pages;
    }
    if (technologies !== undefined) input.technologies = technologies;
    if (skipCache !== undefined) input.skipCache = skipCache;

    return runActor("qyd7nNyqFPelQViBx", "Tech Stack Signal Detector", input);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
