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
			// Always include Default room
			let rooms = ["Default"];
			
			// Try to get from KV cache
			const cachedRooms = await COMMENT_CACHE.get("room_list");

			if (cachedRooms) {
				const cachedList = JSON.parse(cachedRooms) as string[];
				// Add other rooms (excluding Default if it's already in the cache)
				const otherRooms = cachedList.filter(r => r !== "Default");
				rooms = [...rooms, ...otherRooms];
			}

			return c.json(rooms);
		} catch (error) {
			console.error("Error fetching rooms:", error);
			// Even on error, return Default room
			return c.json(["Default"]);
		}
	}
}
