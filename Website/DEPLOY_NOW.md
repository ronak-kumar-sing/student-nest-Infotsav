# 🚀 Deploy to Hackathon - Quick Start

## Option 1: Automated (Recommended - 1 Command!)

Just copy and paste this ONE command:

```bash
bash /Users/ronakkumarsingh/Desktop/Optimzing/student-nest-new/scripts/deploy-to-hackathon.sh
```

That's it! The script will:
- ✅ Clean target directory
- ✅ Copy all files (excluding build artifacts)
- ✅ Create feature branch
- ✅ Stage changes
- ✅ Create professional commit
- ✅ Generate PR template
- ✅ Give you push command

---

## Option 2: Manual (Step by Step)

### 1. Copy Project
```bash
rsync -av --exclude='.next' --exclude='node_modules' --exclude='.env' --exclude='.env.local' /Users/ronakkumarsingh/Desktop/Optimzing/student-nest-new/ /Users/ronakkumarsingh/Desktop/Optimzing/student-nest-Infotsav/Website/
```

### 2. Go to Repo & Create Branch
```bash
cd /Users/ronakkumarsingh/Desktop/Optimzing/student-nest-Infotsav
git checkout -b feat/map-system-integration
```

### 3. Add & Commit
```bash
git add .
git commit -m "feat: Add Google Maps location filtering system

🗺️ Complete map-based location filtering implementation
✨ Save locations, filter rooms by distance
🔧 RESTful API with JWT authentication
🎨 Interactive Google Maps components
📚 Complete documentation

Co-authored-by: GitHub Copilot <github-copilot@github.com>"
```

### 4. Push
```bash
git push origin feat/map-system-integration
```

---

## After Running Script

You'll see this at the end:
```bash
git push origin feat/map-system-integration-20251010
```

Just copy that command and run it to push to GitHub!

Then create a Pull Request on GitHub.

---

## 📖 Full Details

For complete step-by-step commands, professional commit templates, and git best practices:

```bash
cat HACKATHON_DEPLOY_COMMANDS.md
```

---

## 🎯 That's It!

1. Run the automated script
2. Copy the git push command it gives you
3. Run the push command
4. Create PR on GitHub
5. Present to judges! 🏆

---

**Need help?** Check `HACKATHON_DEPLOY_COMMANDS.md` for detailed guide.
