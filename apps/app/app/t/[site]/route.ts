import { CONFIG_MAX_AGE_SECONDS, isSiteId } from "@crm/db/tracking";
import { API_URL, APP_URL } from "@/lib/env";
import { trackerSource } from "@/lib/tracking/tracker";

const EMPTY = "/* no tracking site is configured */\n";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ site: string }> },
): Promise<Response> {
	const { site } = await params;
	const siteId = site.replace(/\.js$/, "");

	if (!isSiteId(siteId)) return empty();

	let payload: { config: unknown; hash?: string } | null = null;

	try {
		const upstream = await fetch(`${API_URL}/api/t/config/${siteId}`, {
			headers: { accept: "application/json" },
		});

		if (upstream.ok) {
			payload = (await upstream.json()) as { config: unknown; hash?: string };
		}
	} catch {
		return empty();
	}

	if (!payload?.config) return empty();

	// `new URL(request.url).origin` reflects the raw socket the app server
	// sees, not the public Host -- under `next start` behind nginx this comes
	// back as the container's bind address (0.0.0.0:3000), never the real
	// public origin, confirmed by forcing Host/X-Forwarded-* headers directly
	// against the container and observing no change. APP_URL is the known-good
	// public origin already used for this exact purpose elsewhere in the stack.
	const origin = APP_URL;
	const source = trackerSource(
		payload.config as Parameters<typeof trackerSource>[0],
		`${origin}/api/t/e`,
	);

	const headers = new Headers({
		"content-type": "application/javascript; charset=utf-8",
		"cache-control": `public, max-age=${CONFIG_MAX_AGE_SECONDS}, s-maxage=${CONFIG_MAX_AGE_SECONDS}`,
		"x-content-type-options": "nosniff",
	});
	if (payload.hash) headers.set("etag", `"${payload.hash}"`);

	return new Response(source, { headers });
}

function empty(): Response {
	return new Response(EMPTY, {
		headers: {
			"content-type": "application/javascript; charset=utf-8",
			"cache-control": "public, max-age=60, s-maxage=60",
			"x-content-type-options": "nosniff",
		},
	});
}
