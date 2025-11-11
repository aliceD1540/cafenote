import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class DebugD1 extends OpenAPIRoute {
schema = {
tags: ["Debug"],
summary: "Debug D1 database contents",
responses: {
"200": {
description: "D1 database contents",
content: {
"application/json": {
schema: z.object({
rooms: z.array(z.string()),
total_comments: z.number(),
}),
},
},
},
},
};

async handle(c: any) {
const env = c.env as Env;
const DB = env.DB;

try {
// Get all distinct room IDs
const roomsResult = await DB.prepare(
"SELECT DISTINCT room_id FROM comments"
).all();

const rooms = roomsResult.results as { room_id: string }[];
const roomIds = rooms.map(r => r.room_id);

// Get total comment count
const countResult = await DB.prepare(
"SELECT COUNT(*) as count FROM comments"
).first();

return c.json({
rooms: roomIds,
total_comments: (countResult as any)?.count || 0,
room_count: rooms.length
});
} catch (error: any) {
console.error("[DEBUG] Error reading D1:", error);
return c.json({ 
error: "Failed to read D1", 
details: error.message 
}, 500);
}
}
}
