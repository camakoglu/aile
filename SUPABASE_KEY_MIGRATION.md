# Supabase API Key Migration Guide

## What Changed?

Supabase is transitioning from legacy JWT-based keys to new dedicated API keys:

| Old Format | New Format | Timeline |
|------------|------------|----------|
| `eyJhbG...` (anon key) | `sb_publishable_...` (publishable key) | Legacy works until Oct 2025 |
| `eyJhbG...` (service_role key) | `sb_secret_...` (secret key) | Legacy works until Oct 2025 |

**Source:** [Supabase API Keys Discussion](https://github.com/orgs/supabase/discussions/29260)

---

## Do I Need to Migrate Now?

**No, but it's recommended.** Here's the timeline:

- ✅ **Before Nov 1, 2024**: Both formats work
- ✅ **After Nov 1, 2024**: New projects only get new keys
- ⚠️ **Until Oct 1, 2025**: Legacy keys still work
- ❌ **After Oct 1, 2025**: Legacy keys stop working

---

## How to Check Your Key Format

Look at your current `VITE_SUPABASE_ANON_KEY`:

- **Starts with `eyJhbG...`** → Legacy format (still works)
- **Starts with `sb_publishable_...`** → New format ✅

---

## Migration Steps

### Step 1: Get Your New Key

1. Go to Supabase Dashboard → **Settings** > **API**
2. Look for **"Publishable key"** section
3. Copy the key starting with `sb_publishable_...`

### Step 2: Update .env.local

**Option A: Replace old key (recommended)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-new-key...
```

**Option B: Keep both (for transition)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...your-new-key...
VITE_SUPABASE_ANON_KEY=eyJhbG...your-legacy-key...
```

The code will automatically prefer the publishable key.

### Step 3: Update GitHub Actions Secrets (if using)

1. Go to GitHub repo → **Settings** > **Secrets and variables** > **Actions**
2. Add or update:
   - `VITE_SUPABASE_PUBLISHABLE_KEY` with your new key
3. Optionally remove:
   - `VITE_SUPABASE_ANON_KEY` (old key)

### Step 4: Update Workflow File (if exists)

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Build with environment variables
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
  run: npm run build
```

---

## FAQ

### Q: Will my app break if I don't migrate?

**A:** No. Legacy keys work until October 1, 2025. The code supports both formats automatically.

### Q: Can I use both keys at the same time?

**A:** Yes. The code checks for `VITE_SUPABASE_PUBLISHABLE_KEY` first, then falls back to `VITE_SUPABASE_ANON_KEY`.

### Q: What if my Supabase project is old?

**A:** Older projects (before Nov 2024) may not have publishable keys yet. You can:
- Continue using legacy keys until Oct 2025
- Contact Supabase support to generate new keys
- Wait for automatic migration by Supabase

### Q: Do I need to update my database or SQL?

**A:** No. This only affects API keys. Your database, tables, and RLS policies remain unchanged.

---

## Testing Your Migration

After updating your keys:

```bash
# Clear any cached builds
rm -rf dist/ node_modules/.vite/

# Rebuild
npm run build

# Test locally
npm run dev

# Check browser console for:
# "Successfully loaded data from Supabase"
```

If you see that message, migration is successful! ✅

---

## References

- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [GitHub Discussion on Key Changes](https://github.com/orgs/supabase/discussions/29260)
- [Migration Timeline Discussion](https://github.com/orgs/supabase/discussions/40300)
