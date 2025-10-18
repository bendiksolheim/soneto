-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points JSONB NOT NULL,
  distance NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT routes_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT routes_points_is_array CHECK (jsonb_typeof(points) = 'array')
);

-- Create indexes for performance
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_created_at ON routes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own routes
CREATE POLICY "Users can view own routes"
  ON routes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own routes
CREATE POLICY "Users can create routes"
  ON routes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own routes
CREATE POLICY "Users can update own routes"
  ON routes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own routes
CREATE POLICY "Users can delete own routes"
  ON routes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE routes IS 'User-created running routes with elevation data';
COMMENT ON COLUMN routes.points IS 'Array of {latitude, longitude} coordinate objects';
COMMENT ON COLUMN routes.distance IS 'Total route distance in kilometers';
