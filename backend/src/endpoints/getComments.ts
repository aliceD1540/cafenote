import { OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import type { AppContext, Comment } from "../types";

export class GetComments extends OpenAPIRoute {
	schema = {
		tags: ["Comments"],
		summary: "Get comments for a room",
		request: {
			params: z.object({
				roomId: Str({ example: "AAA" }),
			}),
		},
		responses: {
			"200": {
				description: "Returns comments from cache",
				content: {
					"application/json": {
						schema: z.array(
							z.object({
								id: Str(),
								message: Str(),
								created_at: z.number(),
							})
						),
					},
				},
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const { roomId } = data.params;

		const COMMENT_CACHE = c.env.COMMENT_CACHE;
		const cacheKey = `comment_cache:${roomId}`;

		const cached = await COMMENT_CACHE.get(cacheKey, "json");

		if (cached && Array.isArray(cached)) {
			return c.json(cached);
		}

		const DB = c.env.DB;
		const result = await DB.prepare(
			"SELECT id, message, created_at FROM comments WHERE room_id = ? ORDER BY created_at DESC LIMIT 100"
		)
			.bind(roomId)
			.all();

		const comments = result.results || [];

		await COMMENT_CACHE.put(cacheKey, JSON.stringify(comments), {
			expirationTtl: 300,
		});

		return c.json(comments);
	}
}
