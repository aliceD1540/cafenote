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

// Development endpoints for testing
app.get("/trigger-sync", async (c) => {
	const env = c.env as Env;
	console.log("[DEBUG] Manual sync triggered");
	await syncCacheFromDB(env);
	return c.json({ message: "Cache sync triggered manually", timestamp: new Date().toISOString() });
});

app.get("/debug/kv", async (c) => {
	const env = c.env as Env;
	const COMMENT_CACHE = env.COMMENT_CACHE;
	
	const roomList = await COMMENT_CACHE.get("room_list");
	const roomListParsed = roomList ? JSON.parse(roomList) : null;
	
	const cacheInfo: any = {
		room_list: roomListParsed,
		cached_rooms: {}
	};
	
	// Get cache info for each room
	if (roomListParsed && Array.isArray(roomListParsed)) {
		for (const roomId of roomListParsed) {
			const cacheKey = `comment_cache:${roomId}`;
			const cached = await COMMENT_CACHE.get(cacheKey);
			if (cached) {
				const comments = JSON.parse(cached);
				cacheInfo.cached_rooms[roomId] = {
					comment_count: comments.length,
					last_comment: comments[0] || null
				};
			}
		}
	}
	
	return c.json(cacheInfo);
});

export default {
	fetch: app.fetch,
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(syncCacheFromDB(env));
	},
};

async function syncCacheFromDB(env: Env) {
	const startTime = new Date().toISOString();
	console.log(`[CRON] Cache sync started at ${startTime}`);
	
	try {
		const DB = env.DB;
		const COMMENT_CACHE = env.COMMENT_CACHE;

		const roomsResult = await DB.prepare(
			"SELECT DISTINCT room_id FROM comments"
		).all();

		const rooms = roomsResult.results as { room_id: string }[];
		console.log(`[CRON] Found ${rooms.length} rooms to sync`);

		// Cache room list
		const roomList = rooms.map(r => r.room_id);
		await COMMENT_CACHE.put("room_list", JSON.stringify(roomList), {
			expirationTtl: 300,
		});
		console.log(`[CRON] Room list cached: ${roomList.join(', ')}`);

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
			console.log(`[CRON] Cached ${comments.length} comments for room: ${room.room_id}`);
		}

		const endTime = new Date().toISOString();
		console.log(`[CRON] Cache sync completed at ${endTime} for ${rooms.length} rooms`);
	} catch (error) {
		console.error("[CRON] Cache sync error:", error);
	}
}

