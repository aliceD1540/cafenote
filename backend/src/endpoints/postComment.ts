import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext } from "../types";
import { PostCommentRequest } from "../types";
import { moderateContent } from "../moderation";

export class PostComment extends OpenAPIRoute {
	schema = {
		tags: ["Comments"],
		summary: "Post a new comment to a room",
		request: {
			params: z.object({
				roomId: Str({ example: "AAA" }),
			}),
			body: {
				content: {
					"application/json": {
						schema: PostCommentRequest,
					},
				},
			},
		},
		responses: {
			"201": {
				description: "Comment posted successfully",
				content: {
					"application/json": {
						schema: z.object({
							success: z.boolean(),
							id: Str(),
						}),
					},
				},
			},
			"400": {
				description: "Bad request",
				content: {
					"application/json": {
						schema: z.object({
							error: Str(),
						}),
					},
				},
			},
			"429": {
				description: "Rate limit exceeded",
				content: {
					"application/json": {
						schema: z.object({
							error: Str(),
						}),
					},
				},
			},
			"403": {
				description: "Content moderation failed",
				content: {
					"application/json": {
						schema: z.object({
							error: Str(),
							level: z.number().optional(),
						}),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { roomId } = data.params;
		const { message } = data.body;

		if (!message || message.trim().length === 0) {
			return c.json({ error: "Message is required" }, 400);
		}

		if (message.length > 100) {
			return c.json({ error: "Message must be 100 characters or less" }, 400);
		}

		const geminiApiKey = c.env.GEMINI_API_KEY;
		const moderation = await moderateContent(message, geminiApiKey);

		if (!moderation.allowed) {
			return c.json({ error: moderation.warning || "Content not allowed", level: moderation.level }, 403);
		}

		const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Real-IP") || "unknown";
		const ipHash = await this.hashIP(clientIP);

		const IP_LIMIT = c.env.IP_LIMIT;
		const limitKey = `ip_limit:${ipHash}`;
		const lastPost = await IP_LIMIT.get(limitKey);

		if (lastPost) {
			const lastPostTime = parseInt(lastPost, 10);
			const now = Date.now();
			const timeDiff = now - lastPostTime;
			const oneMinute = 60 * 1000;

			if (timeDiff < oneMinute) {
				const remainingSeconds = Math.ceil((oneMinute - timeDiff) / 1000);
				return c.json(
					{ error: `Please wait ${remainingSeconds} seconds before posting again` },
					429
				);
			}
		}

		const sanitizedMessage = this.sanitizeMessage(message);

		let displayMessage = sanitizedMessage;
		if (moderation.level === 2) {
			displayMessage = "***";
		}

		const id = crypto.randomUUID();
		const created_at = Date.now();

		const DB = c.env.DB;
		await DB.prepare(
			"INSERT INTO comments (id, room_id, message, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)"
		)
			.bind(id, roomId, displayMessage, created_at, ipHash)
			.run();

		await IP_LIMIT.put(limitKey, created_at.toString(), {
			expirationTtl: 60,
		});

		const COMMENT_CACHE = c.env.COMMENT_CACHE;
		const cacheKey = `comment_cache:${roomId}`;
		await COMMENT_CACHE.delete(cacheKey);

		return c.json({ 
			success: true, 
			id, 
			warning: moderation.level === 2 ? "軽度の不適切表現が検出されたため、内容は伏せられました。" : undefined 
		}, 201);
	}

	private async hashIP(ip: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(ip);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
		return hashHex;
	}

	private sanitizeMessage(message: string): string {
		return message
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#x27;")
			.replace(/\//g, "&#x2F;");
	}
}
