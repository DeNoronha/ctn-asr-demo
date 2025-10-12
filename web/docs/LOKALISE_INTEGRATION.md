# Lokalise Integration Guide - CTN ASR

## Overview

This document provides comprehensive instructions for integrating **Lokalise** as the translation management platform for the CTN Association Register project. Lokalise enables collaborative translation workflows, automated synchronization, and professional translation management.

## Why Lokalise?

- **Collaborative Translation**: Multiple translators can work simultaneously
- **Translation Memory**: Reuse previous translations automatically
- **Quality Assurance**: Built-in QA checks for translation consistency
- **API Integration**: Programmatic access to translations
- **Version Control**: Track translation changes over time
- **Professional Services**: Access to professional translators

## Current i18n Setup

The CTN ASR project uses **react-i18next** with the following languages:
- **Dutch (nl)**: Primary language (default)
- **English (en)**: Fallback language
- **German (de)**: Additional language

Translation files are located in:
```
web/src/locales/
├── en/
│   └── translation.json
├── nl/
│   └── translation.json
└── de/
    └── translation.json
```

## Lokalise Setup

### Step 1: Create Lokalise Account

1. Go to [Lokalise.com](https://lokalise.com)
2. Sign up for an account (recommended: Team plan for collaboration)
3. Create a new project:
   - **Project Name**: CTN Association Register
   - **Base Language**: Dutch (nl)
   - **Additional Languages**: English (en), German (de)
   - **Project Type**: Web Application

### Step 2: Initial Upload of Translations

Upload the existing translation files to Lokalise:

```bash
# Install Lokalise CLI
npm install -g @lokalise/cli

# Authenticate with Lokalise
lokalise2 --token YOUR_API_TOKEN

# Upload existing translations
lokalise2 file upload \
  --project-id YOUR_PROJECT_ID \
  --file web/src/locales/en/translation.json \
  --lang-iso en \
  --replace-modified

lokalise2 file upload \
  --project-id YOUR_PROJECT_ID \
  --file web/src/locales/nl/translation.json \
  --lang-iso nl \
  --replace-modified

lokalise2 file upload \
  --project-id YOUR_PROJECT_ID \
  --file web/src/locales/de/translation.json \
  --lang-iso de \
  --replace-modified
```

### Step 3: Configure Lokalise Project

In Lokalise project settings:

1. **Format Settings**:
   - File format: JSON
   - JSON structure: Nested
   - Export empty: No
   - Export sort: Original

2. **Key Structure**:
   - Enable nested keys
   - Key separator: `.` (dot)

3. **QA Checks** (recommended):
   - Enable "Check for trailing whitespace"
   - Enable "Check for missing placeholders"
   - Enable "Check for double spaces"
   - Enable "Check translation length"

4. **Translation Memory**:
   - Enable translation memory
   - Set similarity threshold: 85%

5. **Contributors**:
   - Add team members as translators
   - Set language permissions per user

### Step 4: Install Lokalise GitHub/Azure DevOps Integration

#### Option A: GitHub Integration

1. In Lokalise project settings, go to **Integrations**
2. Select **GitHub**
3. Authorize Lokalise to access your repository
4. Configure:
   - **Repository**: `your-org/ctn-asr`
   - **Branch**: `main` or `translations`
   - **Target Directory**: `web/src/locales/{lang_iso}/`
   - **File Pattern**: `translation.json`

#### Option B: Azure DevOps Integration

1. Generate **Personal Access Token** in Azure DevOps
2. In Lokalise, go to **Integrations** → **Azure DevOps**
3. Configure:
   - **Organization URL**: `https://dev.azure.com/your-org`
   - **Project**: `ctn-asr`
   - **Repository**: `ctn-asr-repo`
   - **PAT Token**: Your generated token
   - **Target Branch**: `translations`

### Step 5: Automated Workflow with Lokalise

Create `.lokalise.yml` in the project root:

```yaml
version: 1.0

project_id: YOUR_PROJECT_ID
token: ${LOKALISE_API_TOKEN}

languages:
  - nl
  - en
  - de

download:
  format: json
  export_empty: skip
  export_sort: original
  directory_prefix: web/src/locales/
  original_filenames: false
  bundle_structure: "%LANG_ISO%/translation.json"

upload:
  file: web/src/locales/%LANG_ISO%/translation.json
  lang_iso: "%LANG_ISO%"
  replace_modified: true
  detect_params: true
  cleanup_mode: false
```

### Step 6: CI/CD Integration

#### Azure DevOps Pipeline

Add to `azure-pipelines.yml`:

```yaml
stages:
  - stage: SyncTranslations
    displayName: 'Sync Translations with Lokalise'
    jobs:
      - job: DownloadTranslations
        displayName: 'Download Latest Translations'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
            displayName: 'Install Node.js'

          - script: |
              npm install -g @lokalise/cli
            displayName: 'Install Lokalise CLI'

          - script: |
              lokalise2 file download \
                --project-id $(LOKALISE_PROJECT_ID) \
                --token $(LOKALISE_API_TOKEN) \
                --format json \
                --export-empty skip \
                --original-filenames=false \
                --bundle-structure "%LANG_ISO%/translation.json" \
                --dest web/src/locales/
            displayName: 'Download Translations from Lokalise'
            env:
              LOKALISE_PROJECT_ID: $(LOKALISE_PROJECT_ID)
              LOKALISE_API_TOKEN: $(LOKALISE_API_TOKEN)

          - script: |
              git config --global user.email "devops@ctn.nl"
              git config --global user.name "Azure DevOps"
              git add web/src/locales/
              git commit -m "chore: Update translations from Lokalise" || echo "No changes to commit"
              git push
            displayName: 'Commit and Push Translation Changes'
            condition: ne(variables['Build.Reason'], 'PullRequest')
```

#### GitHub Actions

Create `.github/workflows/lokalise-sync.yml`:

```yaml
name: Sync Translations with Lokalise

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  sync-translations:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Lokalise CLI
        run: npm install -g @lokalise/cli

      - name: Download translations
        env:
          LOKALISE_PROJECT_ID: ${{ secrets.LOKALISE_PROJECT_ID }}
          LOKALISE_API_TOKEN: ${{ secrets.LOKALISE_API_TOKEN }}
        run: |
          lokalise2 file download \
            --project-id $LOKALISE_PROJECT_ID \
            --token $LOKALISE_API_TOKEN \
            --format json \
            --export-empty skip \
            --dest web/src/locales/

      - name: Commit changes
        run: |
          git config --global user.name 'Lokalise Bot'
          git config --global user.email 'devops@ctn.nl'
          git add web/src/locales/
          git commit -m "chore: Update translations from Lokalise" || echo "No changes"
          git push
```

### Step 7: Developer Workflow

#### Adding New Translation Keys

1. Add new keys to `web/src/locales/en/translation.json` (master file)
2. Upload to Lokalise:
   ```bash
   lokalise2 file upload \
     --project-id YOUR_PROJECT_ID \
     --file web/src/locales/en/translation.json \
     --lang-iso en \
     --replace-modified
   ```
3. Lokalise will automatically detect new keys
4. Translators will be notified to translate new keys

#### Downloading Latest Translations

```bash
# Download all languages
lokalise2 file download \
  --project-id YOUR_PROJECT_ID \
  --format json \
  --dest web/src/locales/
```

### Step 8: Using Translations in React Components

```tsx
import { useTranslation } from 'react-i18next';

const MemberComponent: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('members.title')}</h1>
      <p>{t('members.searchMembers')}</p>

      {/* With interpolation */}
      <p>{t('members.selectedCount', { count: 5 })}</p>

      {/* With namespace */}
      <p>{t('common.loading')}</p>
    </div>
  );
};
```

### Step 9: Translation Quality Assurance

1. **Review Process**:
   - All translations require review before publishing
   - Assign reviewers per language in Lokalise

2. **Context and Screenshots**:
   - Add context and screenshots to translation keys in Lokalise
   - Helps translators understand the context

3. **Glossary**:
   - Create a glossary for technical terms:
     - KvK → Chamber of Commerce (keep as KvK)
     - BVAD → keep as BVAD (acronym)
     - Endpoint → Eindpunt (NL), Endpunkt (DE)

4. **QA Checks**:
   - Run Lokalise QA checks before deploying
   - Fix any warnings or errors

### Step 10: Professional Translation Services

If you need professional translators:

1. In Lokalise, go to **Order Translation**
2. Select languages and keys to translate
3. Choose translation service (e.g., Gengo, TextMaster)
4. Lokalise will automatically order and import translations

## API Integration

### Lokalise REST API

Example: Fetch all keys programmatically

```typescript
import axios from 'axios';

const LOKALISE_API_TOKEN = process.env.LOKALISE_API_TOKEN;
const PROJECT_ID = process.env.LOKALISE_PROJECT_ID;

async function fetchTranslations(language: string) {
  const response = await axios.get(
    `https://api.lokalise.com/api2/projects/${PROJECT_ID}/files/download`,
    {
      headers: {
        'X-Api-Token': LOKALISE_API_TOKEN
      },
      params: {
        format: 'json',
        original_filenames: false,
        filter_langs: [language]
      }
    }
  );

  return response.data;
}
```

## Best Practices

1. **Keep English as Source of Truth**:
   - Always add new keys to English first
   - Use English as the base for translations

2. **Use Nested Keys**:
   - Organize keys logically: `members.title`, `members.actions.edit`
   - Makes maintenance easier

3. **Avoid Hardcoded Text**:
   - All user-facing text should use `t()` function
   - No exceptions

4. **Provide Context**:
   - Add comments to translation keys
   - Include screenshots where helpful

5. **Regular Syncs**:
   - Sync translations daily or weekly
   - Keep local files up to date

6. **Version Control**:
   - Commit translation changes separately
   - Use descriptive commit messages: `chore: Update NL translations`

## Troubleshooting

### Translations Not Loading

1. Check browser console for errors
2. Verify translation files exist in `web/src/locales/`
3. Check i18n initialization in `web/src/i18n.ts`

### Lokalise CLI Not Working

```bash
# Re-authenticate
lokalise2 --token YOUR_API_TOKEN

# Verify project access
lokalise2 project list
```

### Merge Conflicts

When multiple developers update translations:

1. Always pull latest before making changes
2. Use Lokalise as single source of truth
3. Resolve conflicts by downloading from Lokalise

## Cost Estimation

### Lokalise Pricing (as of 2025)

- **Free Tier**: 1 project, 500 keys, 2 languages
- **Team Plan**: €180/month - 3 projects, unlimited keys, unlimited languages
- **Business Plan**: €480/month - 10 projects, advanced features

**Recommendation**: Start with **Team Plan** for CTN ASR project.

## Additional Resources

- [Lokalise Documentation](https://docs.lokalise.com/)
- [Lokalise CLI Documentation](https://github.com/lokalise/lokalise-cli)
- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)

---

**Version:** 1.0.0
**Last Updated:** October 12, 2025
**Maintained by:** CTN Development Team
