import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { GetComments } from "./endpoints/getComments";
import { PostComment } from "./endpoints/postComment";
import { GetRooms } from "./endpoints/getRooms";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({
	origin: "*",
	allowMethods: ["GET", "POST", "OPTIONS"],
	allowHeaders: ["Content-Type"],
}));

const openapi = fromHono(app, {
	docs_url: "/",
});

openapi.get("/rooms", GetRooms);
openapi.get("/:roomId", GetComments);
openapi.post("/:roomId", PostComment);

export default {
	fetch: app.fetch,
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(syncCacheFromDB(env));
	},
};

async function syncCacheFromDB(env: Env) {
	try {
		const DB = env.DB;
		const COMMENT_CACHE = env.COMMENT_CACHE;

		const roomsResult = await DB.prepare(
			"SELECT DISTINCT room_id FROM comments"
		).all();

		const rooms = roomsResult.results as { room_id: string }[];

		// Cache room list
		const roomList = rooms.map(r => r.room_id);
		await COMMENT_CACHE.put("room_list", JSON.stringify(roomList), {
			expirationTtl: 300,
		});

		for (const room of rooms) {
			const result = await DB.prepare(
				"SELECT id, message, created_at, is_hidden FROM comments WHERE room_id = ? ORDER BY created_at DESC LIMIT 100"
			)
				.bind(room.room_id)
				.all();

			const comments = result.results || [];
			const cacheKey = `comment_cache:${room.room_id}`;

			await COMMENT_CACHE.put(cacheKey, JSON.stringify(comments), {
				expirationTtl: 300,
			});
		}

		console.log(`Cache sync completed for ${rooms.length} rooms`);
	} catch (error) {
		console.error("Cache sync error:", error);
	}
}

