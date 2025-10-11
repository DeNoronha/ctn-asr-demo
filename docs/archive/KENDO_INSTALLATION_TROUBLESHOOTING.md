# Kendo React Installation Guide - Lessons Learned

## ⚠️ Critical Installation Notes

Installing Kendo React v8.5.0 with React 19 requires careful dependency management due to peer dependency conflicts and missing transitive dependencies.

---

## Working Installation Command

Use this exact command to install all required dependencies:

```bash
rm -rf node_modules package-lock.json

npm install react@18 react-dom@18 \
  @progress/kendo-react-buttons@8.5.0 \
  @progress/kendo-react-grid@8.5.0 \
  @progress/kendo-react-layout@8.5.0 \
  @progress/kendo-react-inputs@8.5.0 \
  @progress/kendo-react-common@8.5.0 \
  @progress/kendo-react-animation@8.5.0 \
  @progress/kendo-react-dateinputs@8.5.0 \
  @progress/kendo-react-dropdowns@8.5.0 \
  @progress/kendo-react-dialogs@8.5.0 \
  @progress/kendo-react-data-tools@8.5.0 \
  @progress/kendo-react-intl@8.5.0 \
  @progress/kendo-react-popup@8.5.0 \
  @progress/kendo-react-labels@8.5.0 \
  @progress/kendo-react-progressbars@8.5.0 \
  @progress/kendo-react-treeview@8.5.0 \
  @progress/kendo-data-query \
  @progress/kendo-theme-default@8.0.0 \
  @progress/kendo-licensing \
  @progress/kendo-date-math \
  @progress/kendo-drawing \
  @progress/kendo-intl \
  @progress/kendo-popup-common \
  @progress/kendo-svg-icons \
  react-transition-group \
  --legacy-peer-deps

npm start
```

---

## Key Issues Encountered

### 1. React 19 Incompatibility
**Problem:** Kendo React 8.5.0 expects React 16-18, but project used React 19.

**Solution:** Downgraded to React 18:
```bash
npm install react@18 react-dom@18 --legacy-peer-deps
```

### 2. Missing Peer Dependencies
**Problem:** Kendo packages don't declare all transitive dependencies. Installing one package led to cascading "Module not found" errors.

**Errors encountered:**
- `Cannot resolve '@progress/kendo-react-common'`
- `Cannot resolve '@progress/kendo-react-popup'`
- `Cannot resolve '@progress/kendo-intl'`
- `Cannot resolve '@progress/kendo-date-math'`
- `Cannot resolve '@progress/kendo-popup-common'`
- `Cannot resolve '@progress/kendo-inputs-common'`
- `Cannot resolve 'react-transition-group'`
- And 15+ more...

**Solution:** Install ALL dependencies explicitly (see command above).

### 3. Version Mismatches
**Problem:** Installing `@progress/kendo-react-common@latest` (v8.6.0) conflicted with other packages at v8.5.0.

**Errors:**
- `export 'shouldShowValidationUI' was not found`
- `export 'getLicenseMessage' was not found`
- `export 'keepFocusInContainer' was not found`

**Solution:** Lock ALL `@progress/kendo-react-*` packages to exact version 8.5.0.

### 4. Non-existent Package Versions
**Problem:** Some documentation references versions that don't exist on npm:
- `@progress/kendo-inputs-common@^1.8.0` ❌
- `@progress/kendo-intl@^5.2.0` ❌
- `@progress/kendo-popup-common@^1.8.2` ❌

**Solution:** Install without version constraints (use latest).

### 5. Theme Version Mismatch
**Problem:** Initially specified `@progress/kendo-theme-default@^9.3.0` which doesn't exist.

**Solution:** Use version 8.0.0:
```bash
npm install @progress/kendo-theme-default@8.0.0
```

---

## Required Packages (Complete List)

### React Core
- `react@18`
- `react-dom@18`

### Kendo React Components (v8.5.0 exact)
- `@progress/kendo-react-buttons`
- `@progress/kendo-react-grid`
- `@progress/kendo-react-layout`
- `@progress/kendo-react-inputs`
- `@progress/kendo-react-common`
- `@progress/kendo-react-animation`
- `@progress/kendo-react-dateinputs`
- `@progress/kendo-react-dropdowns`
- `@progress/kendo-react-dialogs`
- `@progress/kendo-react-data-tools`
- `@progress/kendo-react-intl`
- `@progress/kendo-react-popup`
- `@progress/kendo-react-labels`
- `@progress/kendo-react-progressbars`
- `@progress/kendo-react-treeview`

### Kendo Core Utilities (latest)
- `@progress/kendo-data-query`
- `@progress/kendo-theme-default@8.0.0`
- `@progress/kendo-licensing`
- `@progress/kendo-date-math`
- `@progress/kendo-drawing`
- `@progress/kendo-intl`
- `@progress/kendo-popup-common`
- `@progress/kendo-svg-icons`

### Third-Party
- `react-transition-group`

---

## Why `--legacy-peer-deps`?

Required because:
1. Kendo React 8.5.0 declares peer dependency on React 16-18
2. We're using React 18, but npm's strict resolution blocks it
3. Components work fine with React 18, npm just prevents installation

---

## Troubleshooting

### Build Fails with "Module not found"
Install the missing package explicitly (see list above).

### Version Conflicts
Use exact versions (8.5.0) for all `@progress/kendo-react-*` packages.

### "export '...' was not found"
Version mismatch. Reinstall all Kendo packages with exact versions.

### Fresh Install
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
# Run installation command from top of this document
```

---

## License Information

**Using Kendo React FREE tier:**
- Yellow license warning banner appears (cosmetic only)
- All features fully functional
- No license key required
- Unlimited developer seats

To remove banner: Purchase commercial license from Telerik/Progress.

---

## Future Maintenance

**When updating Kendo React:**
1. Update ALL `@progress/kendo-react-*` packages to SAME version
2. Check compatibility with React version
3. Test thoroughly before deploying
4. Expect similar dependency issues with major version bumps

**Recommended approach:**
- Stay on working version (8.5.0) as long as possible
- Only update when critical security fixes required
- Budget significant testing time for updates

---

## Estimated Installation Time

- **First attempt (following standard docs):** 30-60 minutes (fails)
- **With this guide:** 5 minutes
- **Troubleshooting without guide:** 2-3 hours

---

## Documentation References

- **Kendo React Docs:** https://www.telerik.com/kendo-react-ui/components/
- **Grid Component:** https://www.telerik.com/kendo-react-ui/components/grid/
- **Drawer Component:** https://www.telerik.com/kendo-react-ui/components/layout/drawer/

---

**Last Updated:** October 7, 2025  
**Verified Working:** React 18.3.1, Kendo React 8.5.0  
**Node Version:** v16+ (tested on Node 16)
