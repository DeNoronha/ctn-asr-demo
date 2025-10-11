# Quick Start - Kendo React Integration

## 🚀 Installation & Deployment (Quick Reference)

### 1️⃣ Install Dependencies
```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/web
npm install
```

### 2️⃣ Test Locally
```bash
npm start
```
Opens at: http://localhost:3000

### 3️⃣ Build for Production
```bash
npm run build
```

### 4️⃣ Deploy to Azure
```bash
# Option A: Commit and push (triggers GitHub Actions)
git add .
git commit -m "feat: Kendo React integration"
git push origin main

# Option B: Manual deployment via Azure CLI
az staticwebapp upload --name calm-tree-03352ba03 --app-location build
```

### 5️⃣ Verify
Visit: https://calm-tree-03352ba03.1.azurestaticapps.net

---

## 📋 What's New

✅ **Admin Sidebar** - Collapsible navigation (Kendo Drawer)
✅ **Members Grid** - Search, sort, filter (Kendo Grid)  
✅ **Dashboard** - Statistics and analytics
✅ **Token Management** - Dedicated view
✅ **Modern UI** - Professional styling

---

## 🎯 Key Features to Test

1. **Sidebar:** Click ◀/▶ to toggle
2. **Search:** Type in grid search box
3. **Sort:** Click column headers
4. **Register:** Click "+ Register New Member"
5. **Tokens:** Issue tokens from Members view

---

## 📱 Navigation

- **Dashboard** 📊 - Statistics overview
- **Members** 👥 - Full member directory
- **Token Management** 🔑 - BVAD token viewer
- **Settings** ⚙️ - Configuration (coming soon)
- **Documentation** 📚 - Help and guides

---

## 🔗 Important Links

- **Live App:** https://calm-tree-03352ba03.1.azurestaticapps.net
- **API Backend:** https://asr-api.azurewebsites.net/api
- **Docs:** ~/Desktop/Projects/Data in Logistics/repo/ASR/docs/

---

## ⚡ One-Line Deploy

```bash
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/web && npm install && npm run build && git add . && git commit -m "feat: Kendo integration" && git push
```

---

**Status:** Ready to install and deploy! 🎉
