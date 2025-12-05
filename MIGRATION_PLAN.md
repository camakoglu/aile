# Database Migration & Free Hosting Plan

## Current Architecture
- **Data Source:** Google Sheets (CSV export URL)
- **Storage:** LocalStorage cache for offline access
- **Hosting:** GitHub Pages (static only)
- **Editor:** Client-side only (updates Google Sheets via API)

## Recommended Migration

### 🎯 Best Free Hosting Option: **Vercel + Supabase**

#### Why This Combo?

**Vercel (Frontend + API):**
- ✅ Free tier: Unlimited personal projects
- ✅ Automatic deployments from Git
- ✅ Serverless Functions (API endpoints)
- ✅ Edge Network (fast worldwide)
- ✅ Zero config TypeScript/Vite support
- ✅ 100GB bandwidth/month free

**Supabase (Database):**
- ✅ PostgreSQL database (500MB free)
- ✅ Auto-generated REST API
- ✅ Real-time subscriptions
- ✅ Row-level security (RLS)
- ✅ Built-in authentication
- ✅ 2GB file storage included
- ✅ No credit card required

**Total Cost:** $0/month for typical family tree usage

---

## Alternative Free Options

### Option 2: Cloudflare Pages + Turso
- **Cloudflare Pages:** Unlimited bandwidth, fast edge network
- **Turso:** SQLite edge database (9GB free, fastest globally)
- **Best for:** Maximum performance, global users

### Option 3: Netlify + PlanetScale
- **Netlify:** Similar to Vercel (100GB bandwidth)
- **PlanetScale:** MySQL (5GB free, auto-scaling)
- **Best for:** MySQL preference, larger datasets

### Option 4: Railway (All-in-One)
- **Railway:** Backend + Database in one place
- **Free tier:** $5/month credits (enough for small apps)
- **Best for:** Simplicity, one platform

---

## Database Schema Design

```sql
-- Members table
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    birth_date VARCHAR(50),
    death_date VARCHAR(50),
    birth_place VARCHAR(255),
    death_place VARCHAR(255),
    gender CHAR(1) CHECK (gender IN ('E', 'K', 'U')),
    gen INTEGER,
    is_spouse BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(255),
    marriage VARCHAR(100),
    note TEXT,
    image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relationships table (for parent-child links)
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) DEFAULT 'biological',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_id, child_id)
);

-- Unions table (for marriages/partnerships)
CREATE TABLE unions (
    id SERIAL PRIMARY KEY,
    partner1_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    partner2_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    marriage_date VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner1_id, partner2_id)
);

-- Indexes for performance
CREATE INDEX idx_members_gen ON members(gen);
CREATE INDEX idx_members_gender ON members(gender);
CREATE INDEX idx_relationships_parent ON relationships(parent_id);
CREATE INDEX idx_relationships_child ON relationships(child_id);
CREATE INDEX idx_unions_partners ON unions(partner1_id, partner2_id);
```

---

## Migration Steps

### Step 1: Setup Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create account (GitHub OAuth)
3. Create new project (choose region closest to you)
4. Copy these credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon/Public Key: `eyJhbG...`
   - Service Role Key: `eyJhbG...` (keep secret!)

### Step 2: Create Database Tables (2 minutes)

1. Go to SQL Editor in Supabase
2. Run the schema from above
3. Insert your Google Sheets data (I can help with migration script)

### Step 3: Setup Vercel (3 minutes)

1. Push code to GitHub (already done!)
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...
   ```
5. Deploy!

### Step 4: Update Code (I'll help you with this)

**Files to modify:**
- `src/services/data/sheetLoader.ts` → `src/services/data/databaseLoader.ts`
- `src/main.ts` - Change data source
- `src/ui/editor/actions.ts` - Update to use Supabase API
- Add Supabase client library

---

## Cost Comparison

### Current (Google Sheets)
- Hosting: **$0** (GitHub Pages)
- Database: **$0** (Google Sheets)
- Limitations:
  - 10 million cells max
  - No real transactions
  - API rate limits

### Recommended (Vercel + Supabase)
- Hosting: **$0** (100GB bandwidth/month)
- Database: **$0** (500MB database)
- API Calls: **$0** (50,000/month free)
- Bandwidth: **$0** (2GB/month free from Supabase)

**When you'd need to upgrade:**
- 500+ family members → $25/month (Supabase Pro)
- 1M+ page views → $20/month (Vercel Pro)
- Multiple family trees → Still free!

---

## Feature Improvements You'd Get

### With Database:
✅ **Real-time collaboration** - Multiple people editing simultaneously
✅ **Version history** - Track all changes
✅ **Better search** - Full-text search across all fields
✅ **Data validation** - Ensure data integrity
✅ **File uploads** - Store photos in Supabase Storage
✅ **Authentication** - Password-protect editing
✅ **Audit logs** - See who changed what
✅ **Backup/Export** - Automatic backups
✅ **API access** - Build mobile app later

### Performance:
- ⚡ Faster loading (no CSV parsing)
- ⚡ Instant updates (no cache invalidation)
- ⚡ Better offline support (Supabase has offline-first SDK)

---

## Quick Start Guide

Want me to implement this? Here's what I'll do:

1. **Create migration script** to convert your Google Sheets data to SQL
2. **Add Supabase SDK** to the project
3. **Create API layer** for database operations
4. **Update data loader** to use database instead of CSV
5. **Update editor** to save directly to database
6. **Add authentication** (optional, for edit protection)
7. **Setup Vercel config** for deployment

**Time estimate:** ~2-3 hours of implementation
**Your time:** ~10 minutes of setup (Supabase + Vercel accounts)

---

## Even Simpler Option: Firebase (Google)

If you prefer staying in Google ecosystem:

**Firebase (by Google):**
- **Firestore Database:** 1GB storage free
- **Hosting:** Free tier (10GB/month)
- **Authentication:** Built-in
- **File Storage:** 5GB free

**Pros:**
- One platform for everything
- Great offline support
- Real-time by default

**Cons:**
- NoSQL (different from your current tabular structure)
- Can get expensive at scale
- Vendor lock-in

Would you like me to proceed with the Vercel + Supabase migration, or do you prefer another option?
