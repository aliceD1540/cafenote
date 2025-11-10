import { Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;

export const Comment = z.object({
	id: Str(),
	room_id: Str(),
	message: Str(),
	created_at: z.number(),
	ip_hash: Str(),
});

export const PostCommentRequest = z.object({
	message: Str({ example: "こんにちは！" }),
});
