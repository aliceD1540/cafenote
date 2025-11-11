import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { GetComments } from "./endpoints/getComments";
import { PostComment } from "./endpoints/postComment";
import { GetRooms } from "./endpoints/getRooms";
import { DebugD1 } from "./endpoints/debugD1";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors({
	origin: "*",
	allowMethods: ["GET", "POST", "OPTIONS"],
	allowHeaders: ["Content-Type"],
}));

const openapi = fromHono(app, {
	docs_url: "/",
});

// Debug and development endpoints (must be before /:roomId)
// Only enabled in development environment
// Conditionally register endpoints based on ENVIRONMENT variable
app.use("*", async (c, next) => {
	const env = c.env as Env;
	const isDevelopment = env.ENVIRONMENT === 'development';
	
	if (!c.get('isDevelopment')) {
		c.set('isDevelopment', isDevelopment);
		if (isDevelopment) {
			console.log("[INFO] Debug endpoints enabled (development environment)");
		} else {
			console.log("[INFO] Debug endpoints disabled (production environment)");
		}
	}
	
	await next();
});

// Register debug endpoints
app.get("/debug/d1", async (c) => {
	const isDevelopment = c.get('isDevelopment');
	if (!isDevelopment) {
		return c.json({ error: "Debug endpoints are disabled in production" }, 404);
	}
	
	const debugD1 = new DebugD1();
	return debugD1.handle(c);
});

app.get("/trigger-sync", async (c) => {
	const env = c.env as Env;
	const isDevelopment = c.get('isDevelopment');
	
	if (!isDevelopment) {
		return c.json({ error: "Debug endpoints are disabled in production" }, 404);
	}
	
	console.log("[DEBUG] Manual sync triggered");
	
	try {
		// Check if bindings are available
		if (!env.DB) {
			console.error("[DEBUG] DB binding not found");
			return c.json({ error: "DB binding not configured" }, 500);
		}
		if (!env.COMMENT_CACHE) {
			console.error("[DEBUG] COMMENT_CACHE binding not found");
			return c.json({ error: "COMMENT_CACHE binding not configured" }, 500);
		}
		
		await syncCacheFromDB(env);
		return c.json({ 
			message: "Cache sync triggered manually", 
			timestamp: new Date().toISOString() 
		});
	} catch (error: any) {
		console.error("[DEBUG] Error during manual sync:", error);
		return c.json({ 
			error: "Sync failed", 
			details: error.message,
			timestamp: new Date().toISOString()
		}, 500);
	}
});

app.get("/debug/kv", async (c) => {
	const env = c.env as Env;
	const isDevelopment = c.get('isDevelopment');
	
	if (!isDevelopment) {
		return c.json({ error: "Debug endpoints are disabled in production" }, 404);
	}
	
	try {
		if (!env.COMMENT_CACHE) {
			return c.json({ error: "COMMENT_CACHE binding not configured" }, 500);
		}
		
		const COMMENT_CACHE = env.COMMENT_CACHE;
		
		const roomList = await COMMENT_CACHE.get("room_list");
		console.log("[DEBUG] Raw room_list from KV:", roomList);
		
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
				} else {
					cacheInfo.cached_rooms[roomId] = null;
				}
			}
		}
		
		return c.json(cacheInfo);
	} catch (error: any) {
		console.error("[DEBUG] Error reading KV:", error);
		return c.json({ 
			error: "Failed to read KV", 
			details: error.message 
		}, 500);
	}
});

// API endpoints (/:roomId must be last to avoid conflicts)
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
	const startTime = new Date().toISOString();
	console.log(`[CRON] Cache sync started at ${startTime}`);
	
	try {
		const DB = env.DB;
		const COMMENT_CACHE = env.COMMENT_CACHE;

		// Get rooms with comments in the last hour
		const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
		const roomsResult = await DB.prepare(
			"SELECT DISTINCT room_id FROM comments WHERE created_at > ?"
		)
			.bind(oneHourAgo)
			.all();

		const rooms = roomsResult.results as { room_id: string }[];
		console.log(`[CRON] Found ${rooms.length} active rooms (with comments in last hour)`);

		// Cache room list
		const roomList = rooms.map(r => r.room_id);
		await COMMENT_CACHE.put("room_list", JSON.stringify(roomList), {
			expirationTtl: 3600, // 1時間
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
				expirationTtl: 3600, // 1時間
			});
			console.log(`[CRON] Cached ${comments.length} comments for room: ${room.room_id}`);
		}

		const endTime = new Date().toISOString();
		console.log(`[CRON] Cache sync completed at ${endTime} for ${rooms.length} rooms`);
	} catch (error) {
		console.error("[CRON] Cache sync error:", error);
	}
}

