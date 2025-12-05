# Soyagaci Setup Guide

## Database Setup (Supabase)

This project now supports using Supabase as a database backend. If not configured, it will automatically fall back to Google Sheets.

### Step 1: Create Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: soyagaci-family-tree (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait ~2 minutes for provisioning

### Step 2: Create Database Tables (3 minutes)

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy and paste the following SQL:

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

-- Enable Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access" ON members FOR SELECT USING (true);
CREATE POLICY "Public read access" ON relationships FOR SELECT USING (true);
CREATE POLICY "Public read access" ON unions FOR SELECT USING (true);

-- Optional: Add policies for authenticated write access
-- Uncomment these if you want to restrict editing to authenticated users
-- CREATE POLICY "Authenticated users can insert" ON members FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can update" ON members FOR UPDATE USING (auth.role() = 'authenticated');
-- CREATE POLICY "Authenticated users can delete" ON members FOR DELETE USING (auth.role() = 'authenticated');
```

4. Click "Run" to execute the SQL
5. Verify tables were created by going to **Table Editor** (left sidebar)

### Step 3: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** > **API** (left sidebar)
2. Find these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJhbG...`

### Step 4: Configure Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key...
   VITE_GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The app will now load data from Supabase! Check the browser console for:
   ```
   Loading family data from Supabase database...
   Successfully loaded data from Supabase
   ```

### Step 5: Migrate Your Google Sheets Data (Optional)

If you have existing data in Google Sheets, you can migrate it to Supabase:

1. Run the migration script:
   ```bash
   npm run migrate
   ```

2. The script will:
   - Fetch your Google Sheets data
   - Convert it to SQL format
   - Insert it into your Supabase database

See `MIGRATION_PLAN.md` for more details.

---

## GitHub Pages Deployment with Supabase

To deploy your app to GitHub Pages with Supabase:

### Option 1: Using GitHub Actions Secrets (Recommended)

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Add the following repository secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

4. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build with environment variables
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

5. Push to master and your site will auto-deploy with Supabase connection!

### Option 2: Build Locally and Deploy

If you prefer to build locally:

```bash
# Make sure .env.local has your Supabase credentials
npm run build

# Deploy dist/ folder to GitHub Pages using your preferred method
```

---

## Troubleshooting

### "Supabase is not configured" warning

**Solution**: Make sure your `.env.local` file exists and has the correct credentials.

### "Error fetching members" in console

**Solution**:
1. Check that your Supabase tables are created correctly
2. Verify Row Level Security policies allow public read access
3. Test your connection in Supabase SQL Editor:
   ```sql
   SELECT * FROM members LIMIT 5;
   ```

### Data not loading from Supabase

**Solution**: Open browser DevTools (F12) > Console and look for error messages. The app will automatically fall back to Google Sheets if Supabase fails.

### CORS errors

**Solution**: The Supabase anon key should work automatically from any domain. If you see CORS errors, double-check you're using the **anon** key (not the service role key).

---

## Data Source Priority

The app tries data sources in this order:

1. **Supabase** (if configured)
2. **Google Sheets** (fallback)
3. **LocalStorage cache** (if network fails)

This means you can:
- Use Supabase for production
- Use Google Sheets for development
- Work offline with cached data

---

## Security Notes

### Is it safe to expose the Supabase anon key?

**Yes!** The anon key is designed to be used in client-side code. Security is enforced through:

1. **Row-Level Security (RLS)** policies on your database
2. **API rate limiting** by Supabase
3. **Database rules** that you define

The setup above enables public read access but no write access by default.

### Restricting Edit Access

To restrict editing to authenticated users only:

1. In Supabase, go to **Authentication** > **Providers**
2. Enable your preferred auth method (Email, Google, GitHub, etc.)
3. Uncomment the authenticated policies in the SQL above
4. Update the app to require login before editing (see `src/ui/editor/actions.ts`)

---

## Cost

**Supabase Free Tier includes:**
- 500 MB database storage
- 2 GB file storage
- 50,000 monthly active users
- Unlimited API requests (with rate limiting)

**GitHub Pages Free Tier includes:**
- Unlimited static hosting for public repos
- 100 GB bandwidth/month
- Custom domain support

**Total cost: $0/month** for typical family tree usage!

When you exceed limits:
- Supabase Pro: $25/month (8 GB database, 100 GB storage)
- GitHub Pages has no paid tier (always free for public repos)

---

## Next Steps

- ✅ Set up Supabase database
- ✅ Configure environment variables
- ✅ Deploy to GitHub Pages
- 🔜 Migrate existing Google Sheets data
- 🔜 Add authentication for editing
- 🔜 Set up automatic backups

For more information, see `MIGRATION_PLAN.md`.
