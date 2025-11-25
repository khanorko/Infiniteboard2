-- Supabase Schema for Ephemeral Infinity Board
-- Run this SQL in your Supabase Dashboard -> SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Notes table (stores sticky notes with BigInt coordinates as text)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id TEXT NOT NULL DEFAULT 'public',
  x TEXT NOT NULL,  -- BigInt stored as text for unlimited precision
  y TEXT NOT NULL,  -- BigInt stored as text for unlimited precision
  text TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  rotation FLOAT NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 200,   -- Note width in pixels
  height INTEGER NOT NULL DEFAULT 200,  -- Note height in pixels
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Migration: Add width/height columns to existing notes table
-- Run this if you already have a notes table without these columns:
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 200;
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 200;

-- Clusters table (groups of notes)
CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id TEXT NOT NULL DEFAULT 'public',
  title TEXT NOT NULL,
  x TEXT NOT NULL,  -- BigInt stored as text
  y TEXT NOT NULL,  -- BigInt stored as text
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster board queries
CREATE INDEX IF NOT EXISTS notes_board_id_idx ON notes(board_id);
CREATE INDEX IF NOT EXISTS clusters_board_id_idx ON clusters(board_id);

-- Index for expiring notes
CREATE INDEX IF NOT EXISTS notes_expires_at_idx ON notes(expires_at);

-- Enable Row Level Security (RLS) for public access
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for anonymous users (public board)
CREATE POLICY "Allow all for notes" ON notes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all for clusters" ON clusters
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for both tables
-- In Supabase Dashboard: Database -> Replication -> Enable for notes and clusters tables
-- Or run these commands:
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE clusters;

-- Optional: Function to auto-delete expired notes (run periodically via pg_cron)
-- You can set up a cron job in Supabase to run this every minute
CREATE OR REPLACE FUNCTION delete_expired_notes()
RETURNS void AS $$
BEGIN
  DELETE FROM notes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- To schedule automatic cleanup (requires pg_cron extension):
-- SELECT cron.schedule('cleanup-expired-notes', '* * * * *', 'SELECT delete_expired_notes();');

