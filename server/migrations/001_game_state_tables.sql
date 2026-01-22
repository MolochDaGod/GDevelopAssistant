-- ============================================
-- OVERDRIVE RACING GAME STATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS overdrive_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id VARCHAR(100) NOT NULL,
  max_players INTEGER DEFAULT 4,
  status VARCHAR(50) DEFAULT 'starting', -- starting, racing, finished, paused
  start_time TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS overdrive_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES overdrive_races(id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  x DECIMAL(10, 2) DEFAULT 0,
  y DECIMAL(10, 2) DEFAULT 0,
  vx DECIMAL(10, 2) DEFAULT 0,
  vy DECIMAL(10, 2) DEFAULT 0,
  rotation DECIMAL(10, 4) DEFAULT 0,
  acceleration DECIMAL(10, 2) DEFAULT 0,
  health INTEGER DEFAULT 100,
  boost INTEGER DEFAULT 0,
  drifting BOOLEAN DEFAULT false,
  checkpoint INTEGER DEFAULT 0,
  finished BOOLEAN DEFAULT false,
  finish_time BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS overdrive_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id VARCHAR(255) NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  track_id VARCHAR(100) NOT NULL,
  time BIGINT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(track_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_overdrive_races_track ON overdrive_races(track_id);
CREATE INDEX IF NOT EXISTS idx_overdrive_vehicles_race ON overdrive_vehicles(race_id);
CREATE INDEX IF NOT EXISTS idx_overdrive_vehicles_player ON overdrive_vehicles(player_id);
CREATE INDEX IF NOT EXISTS idx_overdrive_leaderboard_track ON overdrive_leaderboard(track_id);
CREATE INDEX IF NOT EXISTS idx_overdrive_leaderboard_player ON overdrive_leaderboard(player_id);

-- ============================================
-- MMO WORLD GAME STATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS mmo_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id VARCHAR(255) NOT NULL,
  character_id UUID NOT NULL,
  world_id VARCHAR(100) NOT NULL,
  session_started_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  session_ended_at TIMESTAMP,
  playtime_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mmo_character_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL UNIQUE,
  player_id VARCHAR(255) NOT NULL,
  world_id VARCHAR(100) NOT NULL,
  pos_x DECIMAL(12, 2) DEFAULT 0,
  pos_y DECIMAL(12, 2) DEFAULT 0,
  direction DECIMAL(10, 4) DEFAULT 0,
  animation_state VARCHAR(50) DEFAULT 'idle',
  health INTEGER DEFAULT 100,
  mana INTEGER DEFAULT 50,
  level INTEGER DEFAULT 1,
  experience BIGINT DEFAULT 0,
  last_saved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mmo_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES mmo_character_state(character_id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- weapon, armor, potion, quest, misc
  quantity INTEGER DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mmo_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id VARCHAR(100) NOT NULL,
  character_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'chat', -- chat, system, emote, trade
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmo_sessions_player ON mmo_game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_mmo_sessions_character ON mmo_game_sessions(character_id);
CREATE INDEX IF NOT EXISTS idx_mmo_character_state_player ON mmo_character_state(player_id);
CREATE INDEX IF NOT EXISTS idx_mmo_character_state_world ON mmo_character_state(world_id);
CREATE INDEX IF NOT EXISTS idx_mmo_inventory_character ON mmo_inventory_items(character_id);
CREATE INDEX IF NOT EXISTS idx_mmo_chat_world ON mmo_chat_history(world_id);

-- ============================================
-- SWARM RTS GAME STATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS rts_match_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id VARCHAR(100) NOT NULL,
  game_mode VARCHAR(50) DEFAULT 'pvp', -- pvp, campaign, coop
  max_players INTEGER DEFAULT 2,
  status VARCHAR(50) DEFAULT 'waiting', -- waiting, in_progress, finished, abandoned
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  winner_faction VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rts_player_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES rts_match_sessions(id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  faction_id VARCHAR(50) NOT NULL, -- fabled, legion, crusade
  gold INTEGER DEFAULT 500,
  wood INTEGER DEFAULT 300,
  food INTEGER DEFAULT 300,
  eliminated BOOLEAN DEFAULT false,
  elimination_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rts_unit_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES rts_match_sessions(id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  unit_def_id VARCHAR(100) NOT NULL,
  faction_id VARCHAR(50) NOT NULL,
  x DECIMAL(12, 2) NOT NULL,
  y DECIMAL(12, 2) NOT NULL,
  health INTEGER NOT NULL,
  max_health INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, dead, frozen, stunned
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rts_city_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES rts_match_sessions(id) ON DELETE CASCADE,
  city_id VARCHAR(100) NOT NULL,
  captured_by_faction VARCHAR(50),
  capture_progress INTEGER DEFAULT 0,
  max_capture_progress INTEGER DEFAULT 10000,
  last_capture_attempt TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rts_match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES rts_match_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- unit_spawned, city_captured, player_eliminated, resource_gathered, building_destroyed
  player_id VARCHAR(255),
  faction_id VARCHAR(50),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rts_match_sessions_status ON rts_match_sessions(status);
CREATE INDEX IF NOT EXISTS idx_rts_player_state_match ON rts_player_state(match_id);
CREATE INDEX IF NOT EXISTS idx_rts_player_state_player ON rts_player_state(player_id);
CREATE INDEX IF NOT EXISTS idx_rts_unit_instances_match ON rts_unit_instances(match_id);
CREATE INDEX IF NOT EXISTS idx_rts_unit_instances_player ON rts_unit_instances(player_id);
CREATE INDEX IF NOT EXISTS idx_rts_city_captures_match ON rts_city_captures(match_id);
CREATE INDEX IF NOT EXISTS idx_rts_match_events_match ON rts_match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_rts_match_events_type ON rts_match_events(event_type);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres;
