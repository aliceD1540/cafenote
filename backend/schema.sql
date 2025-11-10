-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    ip_hash TEXT NOT NULL,
    is_hidden INTEGER DEFAULT 0
);

-- Create index for efficient room-based queries
CREATE INDEX IF NOT EXISTS idx_room_id ON comments(room_id, created_at DESC);

-- Create index for IP hash lookups
CREATE INDEX IF NOT EXISTS idx_ip_hash ON comments(ip_hash);
