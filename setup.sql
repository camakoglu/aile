-- ============================================
-- Soyagaci Family Tree - Supabase Setup
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- and click "Run" to set up your database tables

-- ============================================
-- 1. Create Tables
-- ============================================

-- Members table: Stores all family members
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date VARCHAR(50),
    death_date VARCHAR(50),
    birth_place VARCHAR(255),
    death_place VARCHAR(255),
    gender CHAR(1) CHECK (gender IN ('E', 'K', 'U')), -- E=Erkek/Male, K=Kadın/Female, U=Unknown
    gen INTEGER,
    is_spouse BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(255),
    marriage VARCHAR(100),
    note TEXT,
    image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relationships table: Parent-child links
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'biological',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

-- Unions table: Marriages/partnerships
CREATE TABLE unions (
    id SERIAL PRIMARY KEY,
    partner1_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    partner2_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    marriage_date VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner1_id, partner2_id)
);

-- ============================================
-- 2. Create Indexes for Performance
-- ============================================

CREATE INDEX idx_members_gen ON members(gen);
CREATE INDEX idx_members_gender ON members(gender);
CREATE INDEX idx_members_name ON members(name);
CREATE INDEX idx_members_last_name ON members(last_name);
CREATE INDEX idx_relationships_parent ON relationships(parent_id);
CREATE INDEX idx_relationships_child ON relationships(child_id);
CREATE INDEX idx_unions_partners ON unions(partner1_id, partner2_id);

-- ============================================
-- 3. Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create Security Policies
-- ============================================

-- Public read access (anyone can view the family tree)
CREATE POLICY "Public read access for members"
    ON members FOR SELECT
    USING (true);

CREATE POLICY "Public read access for relationships"
    ON relationships FOR SELECT
    USING (true);

CREATE POLICY "Public read access for unions"
    ON unions FOR SELECT
    USING (true);

-- ============================================
-- Optional: Authenticated Write Access
-- ============================================
-- Uncomment these policies if you want to restrict editing
-- to authenticated users only (requires setting up Supabase Auth)

CREATE POLICY "Authenticated users can insert members"
    ON members FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update members"
    ON members FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete members"
    ON members FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert relationships"
    ON relationships FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update relationships"
    ON relationships FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete relationships"
    ON relationships FOR DELETE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert unions"
    ON unions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update unions"
    ON unions FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete unions"
    ON unions FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- 5. Create Helper Functions (Optional)
-- ============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on members table
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Setup Complete!
-- ============================================
-- After running this SQL:
-- 1. Go to Table Editor to verify tables were created
-- 2. Get your Project URL and anon key from Settings > API
-- 3. Add them to your .env.local file
-- 4. Run: npm run dev
-- ============================================
