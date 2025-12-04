# GitHub Setup Checklist

This document ensures the repository is ready for your team on GitHub.

## ✅ Pre-Commit Checklist

### Files to Verify

- [x] `.gitignore` - Properly excludes `.env` but includes `.env.backup`
- [x] `README.md` - Complete setup instructions for all platforms
- [x] `CURSOR_README.md` - Cursor AI-specific instructions
- [x] `.env.backup` - Template with demo keys for team setup
- [x] `startup-wizard.ps1` - Windows GUI wizard
- [x] `setup.sh` - Mac/Linux setup script
- [x] `start.sh` - Mac/Linux start script
- [x] `docker-compose.yml` - All services defined

### Security Notes

**Demo API Keys in `.env.backup`:**
- `VERIFIED_API_KEYS=demo-verified-key-123`
- `ADMIN_API_KEYS=demo-admin-key-123`

These are **intentionally simple** for team testing. In production:
1. Generate secure keys using `scripts/generate-admin-key.ps1`
2. Update `.env.backup` with production keys (or remove and document separately)
3. Each team member gets their own `.env` file (gitignored)

### Platform Compatibility

**Windows Setup Wizard:**
- ✅ Works on any Windows 10/11 machine
- ✅ Requires PowerShell (included with Windows)
- ✅ Requires Docker Desktop
- ✅ No additional dependencies

**Mac/Linux Setup:**
- ✅ Uses standard bash scripts
- ✅ Requires Docker Desktop
- ✅ Same functionality as Windows wizard (CLI instead of GUI)

### What Gets Committed

✅ **Committed to Git:**
- All source code
- `.env.backup` (template with demo keys)
- `docker-compose.yml`
- Setup scripts (`startup-wizard.ps1`, `setup.sh`, `start.sh`)
- Documentation (`README.md`, `CURSOR_README.md`)

❌ **NOT Committed (gitignored):**
- `.env` (created from `.env.backup` by each developer)
- `node_modules/`
- Build outputs
- Logs

### Team Onboarding

When a team member clones the repo:

1. **Windows:**
   ```bash
   start.bat
   ```
   Wizard handles everything automatically.

2. **Mac/Linux:**
   ```bash
   chmod +x *.sh
   ./setup.sh
   ./start.sh
   ```

3. **Access:**
   - Portal: http://localhost:3000/portal
   - Use `DEMO_LOGIN_ADMIN` to test admin dashboard
   - Use `DEMO_LOGIN_VERIFIED` to test verified dashboard

### Testing Before Push

1. ✅ Run `start.bat (Windows)` or `./setup.sh && ./start.sh` (Mac/Linux)
2. ✅ Verify all services start: `docker-compose ps`
3. ✅ Test portal: http://localhost:3000/portal
4. ✅ Test demo logins work
5. ✅ Test admin dashboard with `DEMO_LOGIN_ADMIN`
6. ✅ Verify `.env` is NOT in git: `git status` (should not show `.env`)

### Final Steps

1. Review all changes: `git status`
2. Ensure `.env` is not tracked: `git check-ignore .env` (should return `.env`)
3. Commit changes: `git add . && git commit -m "Ready for team - setup wizard and demo logins"`
4. Push to GitHub: `git push origin main`

## 🎯 Quick Reference for Team

**Start Application:**
- Windows: `start.bat`
- Mac/Linux: `./setup.sh && ./start.sh`

**Demo Access:**
- `DEMO_LOGIN_VERIFIED` - Verified dashboard
- `DEMO_LOGIN_NON_VERIFIED` - Non-verified dashboard
- `DEMO_LOGIN_ADMIN` - Admin dashboard

**API Keys (in `.env` after setup):**
- `demo-verified-key-123` - Verified access
- `demo-admin-key-123` - Admin access

