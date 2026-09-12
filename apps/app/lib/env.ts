export const API_URL =
	process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// Server-only: never exposed to the client bundle (no NEXT_PUBLIC_ prefix).
// Read directly from the container environment, same as the Dockerfile's
// runtime stage -- route handlers execute server-side, so this needs no
// build-time injection through next.config.ts's `env:` block.
export const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export function isMarketing(): boolean {
	return process.env.IS_MARKETING === "true";
}
