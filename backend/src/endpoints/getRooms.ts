import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class GetRooms extends OpenAPIRoute {
	schema = {
		tags: ["Rooms"],
		summary: "Get list of all room IDs",
		responses: {
			"200": {
				description: "List of room IDs",
				content: {
					"application/json": {
						schema: z.array(z.string()),
					},
				},
			},
		},
	};

	async handle(c: any) {
		const env = c.env as Env;
		const COMMENT_CACHE = env.COMMENT_CACHE;

		try {
			// Try to get from KV cache first
			const cachedRooms = await COMMENT_CACHE.get("room_list");

			if (cachedRooms) {
				const rooms = JSON.parse(cachedRooms);
				return c.json(rooms);
			}

			// If cache miss, return empty array
			// Cache will be populated by the next cron job
			return c.json([]);
		} catch (error) {
			console.error("Error fetching rooms:", error);
			return c.json([], 500);
		}
	}
}
