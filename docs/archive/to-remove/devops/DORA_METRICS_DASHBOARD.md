# DORA Metrics Dashboard Setup Guide

**Project:** CTN Association Register (ASR)
**Version:** 1.0
**Last Updated:** November 17, 2025
**Owner:** DevOps Team

---

## Table of Contents

1. [Overview](#overview)
2. [DORA Metrics Explained](#dora-metrics-explained)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Dashboard Configuration](#dashboard-configuration)
6. [Azure DevOps Analytics Queries](#azure-devops-analytics-queries)
7. [Widget Setup](#widget-setup)
8. [Application Insights Integration](#application-insights-integration)
9. [Interpretation Guide](#interpretation-guide)
10. [Alerts & Automation](#alerts--automation)
11. [Team Training](#team-training)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides step-by-step instructions for implementing a DORA (DevOps Research and Assessment) metrics dashboard for the CTN ASR monorepo. DORA metrics are industry-standard indicators of DevOps performance based on Google's DevOps Research and Assessment team research.

### What are DORA Metrics?

DORA metrics measure four key indicators:

1. **Deployment Frequency (DF)** - How often deployments reach production
2. **Lead Time for Changes (LT)** - Time from commit to production
3. **Mean Time to Restore (MTTR)** - Time to recover from failures
4. **Change Failure Rate (CFR)** - Percentage of deployments causing failures

### Benefits for CTN ASR

- **Visibility:** Real-time insight into DevOps performance
- **Continuous Improvement:** Data-driven optimization targets
- **Benchmarking:** Compare against industry standards (Elite/High/Medium/Low)
- **Accountability:** Track team progress over time
- **Early Warning:** Detect degradation in deployment health

---

## DORA Metrics Explained

### 1. Deployment Frequency (DF)

**Definition:** Number of successful deployments to production per day/week.

**Why it matters:** Higher deployment frequency indicates:
- Smaller, safer changes
- Faster feedback cycles
- Mature CI/CD pipeline
- Reduced deployment risk

**CTN ASR Specific:**
- **Pipelines tracked:** `asr-api.yml`, `admin-portal.yml`, `member-portal.yml`
- **Success criteria:** Pipeline status = `Succeeded` AND health check passes
- **Target:** Elite = Multiple deploys per day

**Calculation:**
```
DF = Count(Successful Deployments) / Time Period (days)
```

**Example Query:**
Count all successful pipeline runs to production in the last 30 days, divided by 30.

---

### 2. Lead Time for Changes (LT)

**Definition:** Time from git commit to successful production deployment.

**Why it matters:** Shorter lead times indicate:
- Efficient build/test/deploy pipeline
- Minimal manual intervention
- Fast value delivery to users
- Quick iteration cycles

**CTN ASR Specific:**
- **Start event:** Git commit pushed to `main` branch
- **End event:** Pipeline completion + health check success
- **Target:** Elite = Less than 1 hour

**Calculation:**
```
LT = Pipeline Finish Time - Commit Timestamp
```

**Example:**
- Commit pushed: 10:00 AM
- Pipeline completes: 10:15 AM
- Lead Time: 15 minutes (Elite tier)

---

### 3. Mean Time to Restore (MTTR)

**Definition:** Average time from deployment failure detection to successful recovery.

**Why it matters:** Lower MTTR indicates:
- Effective rollback procedures
- Strong incident response
- Good monitoring/alerting
- Reliable recovery processes

**CTN ASR Specific:**
- **Failure detection:** Pipeline status = `Failed` OR health check fails
- **Recovery:** Next successful deployment to same service
- **Target:** Elite = Less than 1 hour

**Calculation:**
```
MTTR = Avg(Recovery Deployment Time - Failure Detection Time)
```

**Example:**
- API deployment fails: 2:00 PM
- Hotfix deployed successfully: 2:45 PM
- MTTR: 45 minutes (Elite tier)

---

### 4. Change Failure Rate (CFR)

**Definition:** Percentage of deployments causing production failures or rollbacks.

**Why it matters:** Lower CFR indicates:
- High-quality code
- Effective testing
- Stable deployments
- Fewer production incidents

**CTN ASR Specific:**
- **Failure criteria:**
  - Pipeline status = `Failed`
  - Deployment succeeds but health check fails
  - Rollback/revert commit within 24 hours
- **Target:** Elite = 0-15%

**Calculation:**
```
CFR = (Failed Deployments / Total Deployments) × 100
```

**Example:**
- Total deployments last month: 60
- Failed deployments: 5
- CFR: 8.3% (Elite tier)

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Git Commits (GitHub/Azure Repos)                           │
│  - Commit timestamp                                         │
│  - Commit hash                                              │
│  - Author                                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Azure Pipelines (CI/CD)                                    │
│  - asr-api.yml (API deployments)                            │
│  - admin-portal.yml (Admin portal deployments)              │
│  - member-portal.yml (Member portal deployments)            │
│                                                             │
│  Captured Data:                                             │
│  - Pipeline start/finish time                               │
│  - Build result (Succeeded/Failed)                          │
│  - Commit hash deployed                                     │
│  - Health check status                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Azure DevOps Analytics                                     │
│  - Pipeline run history                                     │
│  - Build/Release metadata                                   │
│  - Custom Analytics Views                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  Application Insights (Optional)                            │
│  - Runtime health metrics                                   │
│  - API response times                                       │
│  - Error rates                                              │
│  - Custom events                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│  DORA Metrics Dashboard (Azure DevOps)                      │
│  - Deployment Frequency widget                              │
│  - Lead Time trend chart                                    │
│  - MTTR gauge                                               │
│  - Change Failure Rate pie chart                            │
│  - Recent deployments table                                 │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  CTN ASR - DORA Metrics Dashboard                                    │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │ Deployment     │  │ Lead Time      │  │ MTTR           │         │
│  │ Frequency      │  │ for Changes    │  │                │         │
│  │                │  │                │  │                │         │
│  │   12.5/day     │  │   14 mins      │  │   28 mins      │         │
│  │   (Elite)      │  │   (Elite)      │  │   (Elite)      │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Deployment Frequency Trend (Last 30 Days)                   │    │
│  │                                                              │    │
│  │  [Line chart: Deployments per day over time]                │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────┐  ┌────────────────────┐   │
│  │  Lead Time Distribution              │  │ Change Failure     │   │
│  │                                      │  │ Rate               │   │
│  │  [Area chart: Lead time over time]  │  │                    │   │
│  │                                      │  │  [Pie chart:       │   │
│  │                                      │  │   Success vs Fail] │   │
│  └──────────────────────────────────────┘  └────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Recent Deployments (Last 10)                                │    │
│  │  ┌────────┬──────────┬───────────┬─────────┬───────────┐     │    │
│  │  │ Time   │ Pipeline │ Result    │ Lead    │ Commit    │     │    │
│  │  │        │          │           │ Time    │           │     │    │
│  │  ├────────┼──────────┼───────────┼─────────┼───────────┤     │    │
│  │  │ 10:15  │ API      │ Success ✅│ 12 min  │ 7ba47c7   │     │    │
│  │  │ 09:42  │ Admin    │ Success ✅│ 8 min   │ fc7b3b1   │     │    │
│  │  │ 09:05  │ Member   │ Failed ❌ │ -       │ 93e5388   │     │    │
│  │  └────────┴──────────┴───────────┴─────────┴───────────┘     │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Slowest Deployments (Top 5)                                 │    │
│  │  ┌────────────┬──────────┬─────────────────────────┐         │    │
│  │  │ Pipeline   │ Lead Time│ Commit                  │         │    │
│  │  ├────────────┼──────────┼─────────────────────────┤         │    │
│  │  │ API        │ 28 min   │ Database migration run  │         │    │
│  │  │ Admin      │ 18 min   │ Large bundle size       │         │    │
│  │  └────────────┴──────────┴─────────────────────────┘         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Permissions

1. **Azure DevOps Project Administrator** (to create dashboards)
2. **Build Administrator** (to view pipeline analytics)
3. **Reader** access to Application Insights (for runtime metrics)

### Required Services

1. **Azure DevOps Organization:** `https://dev.azure.com/ctn-demo`
2. **Azure DevOps Project:** `ASR`
3. **Azure Pipelines:** Enabled with existing pipelines
4. **Application Insights:** `appi-ctn-demo-asr-dev` (optional, for runtime metrics)

### Required Extensions

Install the following Azure DevOps marketplace extensions (free):

1. **Analytics Extension** (pre-installed in Azure DevOps Services)
2. **Devops Performance Metrics** (optional, simplifies DORA tracking)
   - URL: https://marketplace.visualstudio.com/items?itemName=FalckDevOps.DevopsPerformanceMetrics
   - Install to organization: `ctn-demo`

---

## Dashboard Configuration

### Step 1: Create New Dashboard

1. Navigate to Azure DevOps: `https://dev.azure.com/ctn-demo/ASR`
2. Click **Overview** → **Dashboards**
3. Click **+ New Dashboard**
4. Configure:
   - **Name:** `DORA Metrics - CTN ASR`
   - **Description:** `DevOps performance metrics for Association Register system`
   - **Team:** `ASR Team` (or leave as default)
   - **Permissions:** Set to `Team members` or `Project members` based on visibility needs
5. Click **Create**

### Step 2: Enable Analytics Views

1. Navigate to **Project Settings** (gear icon, bottom left)
2. Select **General** → **Overview**
3. Ensure **Azure DevOps Analytics** is enabled
4. If not enabled, click **Enable Analytics** (may require admin approval)

### Step 3: Create Custom Analytics Views

Analytics Views are custom data queries that power dashboard widgets.

#### Analytics View: Pipeline Success Rate (Last 30 Days)

1. Navigate to **Analytics views** (under **Boards** or **Pipelines** menu)
2. Click **+ New view**
3. Configure:
   - **Name:** `ASR Pipeline Success Rate (30d)`
   - **Work item type:** Leave unchecked
   - **Filter:** Pipeline runs
   - **Time period:** Last 30 days
4. In **Fields**, add:
   - `Build.Pipeline Name`
   - `Build.Result`
   - `Build.Finish Time`
   - `Build.Start Time`
   - `Build.Queue Time`
5. In **Filters**, add:
   - `Build.Pipeline Name` IN (`Association-Register-API`, `Association-Register-Admin`, `Association-Register-Member`)
   - `Build.Reason` = `IndividualCI` OR `Manual`
6. Save view

#### Analytics View: Deployment Lead Time

1. Create another Analytics View
2. Configure:
   - **Name:** `ASR Deployment Lead Time`
   - **Time period:** Last 30 days
3. In **Fields**, add:
   - `Build.Pipeline Name`
   - `Build.Queue Time` (represents commit time)
   - `Build.Finish Time` (deployment complete)
   - `Build.Result`
   - `Build.Source Version` (commit hash)
4. In **Filters**, add:
   - `Build.Result` = `Succeeded`
   - `Build.Pipeline Name` IN (`Association-Register-API`, `Association-Register-Admin`, `Association-Register-Member`)
5. Save view

---

## Azure DevOps Analytics Queries

### Query 1: Deployment Frequency (Last 30 Days)

**Purpose:** Count successful deployments per day.

**Analytics Query (OData):**
```odata
https://analytics.dev.azure.com/ctn-demo/ASR/_odata/v4.0-preview/PipelineRuns?
  $apply=
    filter(
      PipelineId in (123, 124, 125) and  // Replace with actual pipeline IDs
      CompletedDate ge {30 days ago} and
      RunResult eq 'Succeeded'
    )/
    groupby(
      (CompletedDate),
      aggregate($count as DeploymentCount)
    )
```

**How to use:**
1. Replace `{30 days ago}` with actual date (e.g., `2025-10-18T00:00:00Z`)
2. Replace pipeline IDs with actual IDs (see below for how to find them)
3. Use this query in a **Chart for Build Pipelines** widget

**Finding Pipeline IDs:**
```bash
# Using Azure CLI
az pipelines list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --query "[].{name:name, id:id}" \
  --output table
```

**Expected Output:**
```
Name                          Id
---------------------------   ---
Association-Register-API      123
Association-Register-Admin    124
Association-Register-Member   125
```

### Query 2: Lead Time for Changes (Avg, Last 30 Days)

**Purpose:** Calculate average time from commit to deployment.

**Analytics Query (OData):**
```odata
https://analytics.dev.azure.com/ctn-demo/ASR/_odata/v4.0-preview/PipelineRuns?
  $apply=
    filter(
      CompletedDate ge {30 days ago} and
      RunResult eq 'Succeeded'
    )/
    compute(
      (CompletedOn sub QueueTime) div 60 as LeadTimeMinutes
    )/
    aggregate(
      LeadTimeMinutes with average as AvgLeadTimeMinutes,
      LeadTimeMinutes with max as MaxLeadTimeMinutes,
      LeadTimeMinutes with min as MinLeadTimeMinutes
    )
```

**Explanation:**
- `QueueTime` = Time commit was pushed (pipeline queued)
- `CompletedOn` = Time deployment finished
- Division by 60 converts seconds to minutes
- Result: `AvgLeadTimeMinutes`, `MaxLeadTimeMinutes`, `MinLeadTimeMinutes`

### Query 3: Change Failure Rate (Last 30 Days)

**Purpose:** Calculate percentage of failed deployments.

**Analytics Query (OData):**
```odata
https://analytics.dev.azure.com/ctn-demo/ASR/_odata/v4.0-preview/PipelineRuns?
  $apply=
    filter(
      CompletedDate ge {30 days ago}
    )/
    groupby(
      (RunResult),
      aggregate($count as Count)
    )
```

**Post-processing (manual calculation):**
```
Total Deployments = Count(Succeeded) + Count(Failed) + Count(PartiallySucceeded)
Failed Deployments = Count(Failed) + Count(PartiallySucceeded)
CFR = (Failed Deployments / Total Deployments) × 100
```

**Example:**
- Succeeded: 55
- Failed: 3
- PartiallySucceeded: 2
- Total: 60
- CFR: (5 / 60) × 100 = 8.3%

### Query 4: MTTR (Mean Time to Restore)

**Purpose:** Average time from failure to recovery.

**Manual Process (Azure DevOps doesn't auto-track this):**

1. **Identify failures:**
   ```bash
   az pipelines runs list \
     --org https://dev.azure.com/ctn-demo \
     --project ASR \
     --pipeline-ids 123 124 125 \
     --result failed \
     --query-order FinishTimeDesc \
     --top 50
   ```

2. **For each failure, find next successful run:**
   ```bash
   # Get failed run details
   az pipelines runs show \
     --id <run-id> \
     --org https://dev.azure.com/ctn-demo \
     --project ASR \
     --query "finishTime"

   # Find next successful run
   az pipelines runs list \
     --org https://dev.azure.com/ctn-demo \
     --project ASR \
     --pipeline-ids <pipeline-id> \
     --result succeeded \
     --query "[?finishTime > '<failed-run-finish-time>'] | [0]"
   ```

3. **Calculate time difference:**
   ```
   MTTR = Recovery Time - Failure Time
   ```

**Automation Script:**
See [Appendix A: MTTR Calculation Script](#appendix-a-mttr-calculation-script)

---

## Widget Setup

### Widget 1: Deployment Frequency (Markdown)

**Widget Type:** Markdown
**Size:** 1x1

**Configuration:**
```markdown
## Deployment Frequency
**Last 30 days**

### 12.5 deploys/day
*Elite Performance*

---
📊 Target: >1/day (Elite)
```

**Update frequency:** Manual update weekly or automated via API

---

### Widget 2: Deployment Frequency Trend (Chart)

**Widget Type:** Chart for Build Pipelines
**Size:** 2x2

**Configuration:**
1. Add widget: **Chart for Build Pipelines**
2. Configure:
   - **Chart type:** Line chart
   - **Pipelines:** Select `Association-Register-API`, `Association-Register-Admin`, `Association-Register-Member`
   - **Metric:** Count of builds
   - **Period:** Last 30 days
   - **Group by:** Day
   - **Filter:** Result = Succeeded
3. Chart appearance:
   - **Title:** `Deployment Frequency (Last 30 Days)`
   - **Color:** Green for success
   - **Axis:** Days on X-axis, Count on Y-axis

---

### Widget 3: Lead Time for Changes (Query Results)

**Widget Type:** Query Results
**Size:** 1x1

**Configuration:**
1. Create custom work item query (or use OData endpoint)
2. Query definition:
   ```sql
   SELECT
     AVG(DATEDIFF(minute, QueueTime, FinishTime)) AS AvgLeadTimeMinutes
   FROM PipelineRuns
   WHERE
     CompletedDate >= DATEADD(day, -30, GETDATE())
     AND RunResult = 'Succeeded'
   ```
3. Display as single value widget
4. Add label: `Lead Time (Avg)`
5. Add benchmark indicator:
   - Green (Elite): <60 min
   - Yellow (High): 60-1440 min (<1 day)
   - Orange (Medium): 1440-10080 min (<1 week)
   - Red (Low): >10080 min

---

### Widget 4: Change Failure Rate (Pie Chart)

**Widget Type:** Chart for Build Pipelines
**Size:** 1x1

**Configuration:**
1. Add widget: **Chart for Build Pipelines**
2. Configure:
   - **Chart type:** Pie chart
   - **Pipelines:** All ASR pipelines
   - **Metric:** Count of builds
   - **Period:** Last 30 days
   - **Group by:** Result
3. Chart appearance:
   - **Title:** `Change Failure Rate (30d)`
   - **Legend:**
     - Succeeded (Green)
     - Failed (Red)
     - PartiallySucceeded (Orange)
4. Add calculated percentage in title:
   - Example: `CFR: 8.3% (Elite)`

---

### Widget 5: Recent Deployments (Build History)

**Widget Type:** Build History
**Size:** 2x2

**Configuration:**
1. Add widget: **Build History**
2. Configure:
   - **Build pipelines:** All ASR pipelines
   - **Count:** 10 most recent
   - **Columns:**
     - Build number
     - Result
     - Completed time
     - Commit (short hash)
     - Duration
3. Widget title: `Recent Deployments`

---

### Widget 6: MTTR Gauge (Manual/Markdown)

**Widget Type:** Markdown (or custom)
**Size:** 1x1

**Configuration:**
```markdown
## MTTR
**Mean Time to Restore**

### 28 minutes
*Elite Performance*

---
🎯 Target: <60 min (Elite)
📈 30-day avg
```

**Update:** Manually weekly using MTTR calculation script

---

### Widget 7: Top 5 Slowest Deployments (Query Tiles)

**Widget Type:** Query Tiles
**Size:** 2x1

**Configuration:**
1. Create Analytics View: `Slowest Deployments (30d)`
2. Fields: Pipeline Name, Lead Time, Commit, Finish Time
3. Sort by: Lead Time (descending)
4. Top: 5
5. Display columns:
   - Pipeline
   - Lead Time (minutes)
   - Commit message (truncated)

---

## Application Insights Integration

### Optional: Runtime Metrics

For deeper insights into application health post-deployment, integrate Application Insights custom events.

#### Custom Event: Deployment Success

**Location:** `api/src/index.ts` (or deployment verification script)

**Code:**
```typescript
import { AppInsights } from './utils/appInsights';

// After health check passes
AppInsights.trackEvent({
  name: 'DeploymentCompleted',
  properties: {
    commitHash: process.env.COMMIT_HASH,
    pipelineId: process.env.BUILD_ID,
    deploymentTime: new Date().toISOString(),
    result: 'Success'
  },
  measurements: {
    leadTimeMinutes: calculateLeadTime()
  }
});
```

#### Kusto Query: Deployment Events (Last 30 Days)

**Application Insights → Logs:**
```kusto
customEvents
| where name == "DeploymentCompleted"
| where timestamp > ago(30d)
| project
    timestamp,
    commitHash = tostring(customDimensions.commitHash),
    result = tostring(customDimensions.result),
    leadTimeMinutes = todouble(customMeasurements.leadTimeMinutes)
| summarize
    DeploymentCount = count(),
    AvgLeadTime = avg(leadTimeMinutes),
    FailureCount = countif(result == "Failed")
    by bin(timestamp, 1d)
| extend ChangeFailureRate = (FailureCount * 100.0 / DeploymentCount)
| project
    Date = format_datetime(timestamp, 'yyyy-MM-dd'),
    Deployments = DeploymentCount,
    AvgLeadTimeMin = round(AvgLeadTime, 2),
    CFR = strcat(round(ChangeFailureRate, 2), "%")
| order by Date desc
```

**Output:**
```
Date         Deployments  AvgLeadTimeMin  CFR
---------    -----------  --------------  ------
2025-11-17   15           12.5            6.67%
2025-11-16   18           14.2            5.56%
2025-11-15   12           18.3            8.33%
```

---

## Interpretation Guide

### DORA Performance Tiers

Based on **Google DORA 2023 State of DevOps Report**:

| Metric                  | Elite          | High             | Medium            | Low               |
|-------------------------|----------------|------------------|-------------------|-------------------|
| **Deployment Frequency**| Multiple/day   | Weekly-Daily     | Monthly-Weekly    | <Monthly          |
| **Lead Time**           | <1 hour        | <1 day           | <1 week           | >1 month          |
| **MTTR**                | <1 hour        | <1 day           | <1 day            | >1 week           |
| **Change Failure Rate** | 0-15%          | 16-30%           | 16-30%            | >30%              |

### Current CTN ASR Performance (Example - Update Quarterly)

**As of November 17, 2025:**

| Metric                  | Current Value  | Tier    | Target           | Status |
|-------------------------|----------------|---------|------------------|--------|
| **Deployment Frequency**| 12.5/day       | Elite ✅| >1/day           | ✅     |
| **Lead Time**           | 14 minutes     | Elite ✅| <60 min          | ✅     |
| **MTTR**                | 28 minutes     | Elite ✅| <60 min          | ✅     |
| **Change Failure Rate** | 8.3%           | Elite ✅| <15%             | ✅     |

**Overall Rating:** **Elite Performance**

### Trend Analysis (Monthly Review)

**What to look for:**

1. **Deployment Frequency:**
   - **Increasing trend:** Good - more frequent, smaller changes
   - **Decreasing trend:** Investigate - Are pipelines blocked? Confidence issues?
   - **Spikes:** Check for batch deployments (anti-pattern)

2. **Lead Time:**
   - **Increasing trend:** Bad - Pipeline slowdowns, bottlenecks
   - **Decreasing trend:** Good - Pipeline optimizations working
   - **Outliers:** Identify slow deployments (database migrations, large bundles)

3. **MTTR:**
   - **Increasing trend:** Bad - Recovery processes degrading
   - **Decreasing trend:** Good - Improved rollback/monitoring
   - **High variance:** Inconsistent incident response

4. **Change Failure Rate:**
   - **Increasing trend:** Bad - Quality issues, insufficient testing
   - **Decreasing trend:** Good - Better test coverage, code quality
   - **Threshold breach (>15%):** Urgent - Review testing strategy

### Red Flags

**Immediate action required if:**

- CFR exceeds 20% for 2 consecutive weeks
- MTTR exceeds 4 hours for any single incident
- Lead Time exceeds 1 hour average for a week
- Deployment Frequency drops below 1/day for a week

**Escalation:**
1. Alert DevOps team lead
2. Schedule retrospective
3. Implement corrective action plan
4. Monitor daily until back in Elite tier

---

## Alerts & Automation

### Azure Monitor Alert: High Change Failure Rate

**Create alert when CFR exceeds 15% in a day:**

1. Navigate to **Azure Monitor** → **Alerts**
2. Click **+ New alert rule**
3. Configure:
   - **Scope:** Azure DevOps organization (via Log Analytics or custom metric)
   - **Condition:** Custom metric `ChangeFailureRate > 15`
   - **Action Group:** Email DevOps team
   - **Alert name:** `DORA - High Change Failure Rate`
   - **Severity:** Warning (Sev 2)

**Alert Logic (pseudo-code):**
```
IF (Failed Deployments Today / Total Deployments Today) > 0.15 THEN
  SEND EMAIL TO devops@denoronha.consulting
  SUBJECT: "Alert: Change Failure Rate exceeded 15%"
  BODY: "Review recent deployments and test coverage."
END IF
```

### Azure Monitor Alert: Long Lead Time

**Create alert when lead time exceeds 60 minutes:**

1. Configure condition:
   - `AvgLeadTimeMinutes > 60`
   - Evaluation frequency: Every 30 minutes
2. Action: Slack notification to `#devops-alerts`

### Automation: Daily DORA Metrics Report

**Azure DevOps Pipeline (scheduled):**

**File:** `.azure-pipelines/dora-metrics-report.yml`

```yaml
# Daily DORA Metrics Email Report
# Runs: 8:00 AM UTC (9:00 AM CET)

schedules:
  - cron: "0 8 * * *"
    displayName: Daily DORA metrics report
    branches:
      include:
        - main

trigger: none

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    displayName: 'Generate DORA metrics report'
    inputs:
      azureSubscription: 'Azure-CTN-ASR-ServiceConnection'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        # Fetch last 24 hours of pipeline runs
        RUNS=$(az pipelines runs list \
          --org https://dev.azure.com/ctn-demo \
          --project ASR \
          --top 100 \
          --query "[?finishTime >= '$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)']")

        # Count successes and failures
        SUCCESS_COUNT=$(echo "$RUNS" | jq '[.[] | select(.result == "succeeded")] | length')
        FAILED_COUNT=$(echo "$RUNS" | jq '[.[] | select(.result == "failed")] | length')
        TOTAL_COUNT=$((SUCCESS_COUNT + FAILED_COUNT))

        # Calculate CFR
        if [ $TOTAL_COUNT -gt 0 ]; then
          CFR=$(echo "scale=2; ($FAILED_COUNT * 100) / $TOTAL_COUNT" | bc)
        else
          CFR=0
        fi

        # Calculate average lead time (minutes)
        AVG_LEAD_TIME=$(echo "$RUNS" | jq -r '
          [.[] | select(.result == "succeeded") |
           ((.finishTime | fromdateiso8601) - (.queueTime | fromdateiso8601)) / 60] |
          add / length | round
        ')

        # Generate report
        REPORT="DORA Metrics Daily Report - $(date +%Y-%m-%d)

        Deployment Frequency: $TOTAL_COUNT deployments (last 24h)
        Lead Time (Avg): $AVG_LEAD_TIME minutes
        Change Failure Rate: $CFR%

        Status: $([ $CFR -lt 15 ] && echo '✅ Elite' || echo '⚠️ Review Required')

        View dashboard: https://dev.azure.com/ctn-demo/ASR/_dashboards/dashboard/DORA-Metrics
        "

        echo "$REPORT"

        # Send email (requires Azure Logic App or SendGrid integration)
        # Example: Post to Slack webhook
        curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
          -H 'Content-Type: application/json' \
          -d "{\"text\":\"$REPORT\"}"
```

**Setup:**
1. Create pipeline: `dora-metrics-report.yml`
2. Configure Slack webhook or email integration
3. Enable pipeline schedule
4. Test with manual run

---

## Team Training

### Training Session Outline (60 minutes)

**Audience:** DevOps team, developers, tech leads

#### Session 1: DORA Metrics Introduction (15 min)

**Topics:**
- What are DORA metrics?
- Why do they matter for CTN ASR?
- Industry benchmarks (Elite/High/Medium/Low)
- Our current performance

**Activity:** Review live dashboard together

#### Session 2: Dashboard Walkthrough (20 min)

**Topics:**
- How to access the dashboard
- Understanding each widget
- How metrics are calculated
- Where data comes from (pipelines, commits, health checks)

**Hands-on:**
- Navigate to dashboard
- Drill down into specific deployments
- Interpret trend charts

#### Session 3: Using Metrics for Improvement (15 min)

**Topics:**
- Spotting degradation early
- Root cause analysis from metrics
- Case study: "How we reduced lead time from 30 to 14 minutes"
- Action items when metrics decline

**Discussion:**
- Team shares observations from dashboard
- Brainstorm improvement ideas

#### Session 4: Q&A and Best Practices (10 min)

**Topics:**
- When to check the dashboard (daily standup, retrospectives)
- Setting team goals
- Escalation procedures for red flags
- Continuous improvement mindset

### Quick Reference Card

**Print this and post near team workspace:**

```
┌────────────────────────────────────────────────────────────┐
│  DORA Metrics Quick Reference - CTN ASR                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📊 Dashboard URL:                                         │
│     https://dev.azure.com/ctn-demo/ASR/_dashboards         │
│                                                            │
│  🎯 Elite Performance Targets:                             │
│     ✅ Deployment Frequency: >1/day                        │
│     ✅ Lead Time: <60 minutes                              │
│     ✅ MTTR: <60 minutes                                   │
│     ✅ Change Failure Rate: <15%                           │
│                                                            │
│  🚨 Red Flags (Alert DevOps Lead):                         │
│     ❌ CFR >20% for 2 weeks                                │
│     ❌ MTTR >4 hours (single incident)                     │
│     ❌ Lead Time >60 min avg (1 week)                      │
│     ❌ Deployment Freq <1/day (1 week)                     │
│                                                            │
│  📅 Review Cadence:                                        │
│     - Daily: Check dashboard during standup                │
│     - Weekly: Trend analysis in team meeting               │
│     - Monthly: Deep dive + improvement planning            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Issue: Dashboard shows "No data available"

**Symptoms:**
- Widgets display "No data" or empty charts
- Analytics queries return zero results

**Causes:**
1. Analytics not enabled for project
2. Incorrect time range (data older than retention period)
3. Pipeline filters excluding all data

**Solutions:**
1. Verify Analytics is enabled:
   - **Project Settings** → **Overview** → Ensure **Analytics** toggle is ON
2. Adjust time range:
   - Change widget filter from "Last 30 days" to "Last 7 days" to test
3. Check pipeline filters:
   - Verify pipeline names are correct (case-sensitive)
   - Confirm pipeline IDs match active pipelines
4. Rebuild Analytics cache:
   - **Project Settings** → **Analytics** → **Refresh views**

---

### Issue: Lead Time calculation seems incorrect

**Symptoms:**
- Lead time shows negative values
- Lead time excessively high (hours when expected minutes)

**Causes:**
1. Using wrong timestamps (`QueueTime` vs `StartTime`)
2. Time zone mismatch
3. Commit timestamp not captured correctly

**Solutions:**
1. Verify timestamp fields:
   ```
   Lead Time = FinishTime - QueueTime (not StartTime)
   ```
   - `QueueTime` = When commit triggers pipeline
   - `StartTime` = When build agent starts work (includes queue wait)
   - `FinishTime` = When deployment completes
2. Ensure all times are UTC
3. Check pipeline YAML includes commit hash capture:
   ```yaml
   - script: |
       git log -1 --format="%H %ai"
     displayName: 'Capture commit timestamp'
   ```

---

### Issue: Change Failure Rate not updating

**Symptoms:**
- CFR widget shows stale data
- Manual calculation differs from widget

**Causes:**
1. Widget refresh frequency too low
2. Failed builds not counted (filtered out)
3. Partially succeeded builds not included

**Solutions:**
1. Set widget auto-refresh:
   - Edit widget → **Advanced** → **Auto-refresh** = Every 5 minutes
2. Include all failure types:
   ```
   Failed Deployments = Count(Result = 'Failed') +
                        Count(Result = 'PartiallySucceeded')
   ```
3. Manually refresh dashboard (F5 or Ctrl+R)

---

### Issue: MTTR cannot be calculated

**Symptoms:**
- MTTR widget shows "N/A" or zero
- Script returns no failures

**Causes:**
1. No deployment failures in time period (good problem!)
2. Recovery deployments not tagged correctly
3. Script filtering too restrictive

**Solutions:**
1. If truly no failures, display "0 incidents (30d)" instead of "N/A"
2. Expand time range to 60 or 90 days for low-failure environments
3. Manually review recent failures:
   ```bash
   az pipelines runs list \
     --org https://dev.azure.com/ctn-demo \
     --project ASR \
     --result failed \
     --top 10
   ```
4. Document manual MTTR calculation in widget description

---

### Issue: Pipeline runs not appearing in dashboard

**Symptoms:**
- Recent deployments missing from widgets
- Dashboard lags behind actual pipeline activity

**Causes:**
1. Analytics indexing delay (up to 30 minutes)
2. Pipeline not included in widget filter
3. Build result not finalized (still running or abandoned)

**Solutions:**
1. Wait 30 minutes for Analytics to index new runs
2. Verify pipeline is included in widget filter:
   - Edit widget → **Pipelines** → Ensure all three ASR pipelines selected
3. Check pipeline status:
   ```bash
   az pipelines runs list \
     --org https://dev.azure.com/ctn-demo \
     --project ASR \
     --status completed \
     --top 5
   ```
4. For real-time view, use **Pipelines** page instead of dashboard

---

## Appendix A: MTTR Calculation Script

**File:** `scripts/calculate-mttr.sh`

```bash
#!/bin/bash
#
# MTTR Calculation Script for CTN ASR
# Calculates Mean Time to Restore from deployment failures
#
# Usage: ./scripts/calculate-mttr.sh [days]
# Example: ./scripts/calculate-mttr.sh 30

set -euo pipefail

# Configuration
ORG="https://dev.azure.com/ctn-demo"
PROJECT="ASR"
DAYS_BACK=${1:-30}

# Pipeline IDs (update these)
API_PIPELINE_ID=123
ADMIN_PIPELINE_ID=124
MEMBER_PIPELINE_ID=125

echo "📊 Calculating MTTR for last $DAYS_BACK days..."
echo ""

# Calculate date range
START_DATE=$(date -u -d "$DAYS_BACK days ago" +%Y-%m-%dT%H:%M:%SZ)

# Fetch failed runs
FAILED_RUNS=$(az pipelines runs list \
  --org "$ORG" \
  --project "$PROJECT" \
  --pipeline-ids $API_PIPELINE_ID $ADMIN_PIPELINE_ID $MEMBER_PIPELINE_ID \
  --result failed \
  --query "[?finishTime >= '$START_DATE']" \
  --output json)

FAILURE_COUNT=$(echo "$FAILED_RUNS" | jq 'length')

if [ "$FAILURE_COUNT" -eq 0 ]; then
  echo "✅ No deployment failures in last $DAYS_BACK days!"
  echo "   MTTR: N/A (0 incidents)"
  exit 0
fi

echo "Found $FAILURE_COUNT deployment failures"
echo ""

# For each failure, find recovery time
TOTAL_MTTR=0
RECOVERIES=0

echo "$FAILED_RUNS" | jq -c '.[]' | while read -r FAILED_RUN; do
  RUN_ID=$(echo "$FAILED_RUN" | jq -r '.id')
  PIPELINE_ID=$(echo "$FAILED_RUN" | jq -r '.definition.id')
  PIPELINE_NAME=$(echo "$FAILED_RUN" | jq -r '.definition.name')
  FAILURE_TIME=$(echo "$FAILED_RUN" | jq -r '.finishTime')

  echo "Analyzing failure: $PIPELINE_NAME (Run #$RUN_ID) at $FAILURE_TIME"

  # Find next successful run for same pipeline
  RECOVERY_RUN=$(az pipelines runs list \
    --org "$ORG" \
    --project "$PROJECT" \
    --pipeline-ids "$PIPELINE_ID" \
    --result succeeded \
    --query "[?finishTime > '$FAILURE_TIME'] | [0]" \
    --output json)

  if [ "$(echo "$RECOVERY_RUN" | jq 'length')" -eq 0 ]; then
    echo "  ⚠️  No recovery deployment found (still broken?)"
    continue
  fi

  RECOVERY_TIME=$(echo "$RECOVERY_RUN" | jq -r '.finishTime')

  # Calculate MTTR for this incident (in minutes)
  FAILURE_EPOCH=$(date -d "$FAILURE_TIME" +%s)
  RECOVERY_EPOCH=$(date -d "$RECOVERY_TIME" +%s)
  MTTR_SECONDS=$((RECOVERY_EPOCH - FAILURE_EPOCH))
  MTTR_MINUTES=$((MTTR_SECONDS / 60))

  echo "  ✅ Recovered in $MTTR_MINUTES minutes"

  TOTAL_MTTR=$((TOTAL_MTTR + MTTR_MINUTES))
  RECOVERIES=$((RECOVERIES + 1))
done

if [ "$RECOVERIES" -eq 0 ]; then
  echo ""
  echo "⚠️  No recoveries found for $FAILURE_COUNT failures"
  echo "   This may indicate unresolved failures"
  exit 0
fi

# Calculate average MTTR
AVG_MTTR=$((TOTAL_MTTR / RECOVERIES))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 MTTR Summary (Last $DAYS_BACK days)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Incidents: $FAILURE_COUNT"
echo "Recoveries: $RECOVERIES"
echo "Average MTTR: $AVG_MTTR minutes"
echo ""

# Determine performance tier
if [ "$AVG_MTTR" -lt 60 ]; then
  TIER="Elite ✅"
elif [ "$AVG_MTTR" -lt 1440 ]; then
  TIER="High ⚠️"
else
  TIER="Medium/Low ❌"
fi

echo "Performance Tier: $TIER"
echo "Target: <60 minutes (Elite)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
```

**Setup:**
```bash
# Make executable
chmod +x scripts/calculate-mttr.sh

# Run for last 30 days
./scripts/calculate-mttr.sh 30

# Run for last 90 days
./scripts/calculate-mttr.sh 90
```

---

## Appendix B: Dashboard Export/Import

### Export Dashboard Configuration

**For backup or sharing with other teams:**

1. Navigate to dashboard: `https://dev.azure.com/ctn-demo/ASR/_dashboards`
2. Click dashboard menu (three dots) → **Export**
3. Save as: `dora-dashboard-config.json`
4. Commit to repo: `docs/devops/dora-dashboard-config.json`

### Import Dashboard to Another Project

1. Navigate to target project's dashboards
2. Click **+ New Dashboard**
3. Create blank dashboard
4. Click dashboard menu → **Import**
5. Upload `dora-dashboard-config.json`
6. Adjust pipeline IDs and filters for new project

---

## Appendix C: Useful Azure CLI Commands

### List All Pipeline Runs (Last 7 Days)

```bash
az pipelines runs list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --top 50 \
  --query "[].{id:id, pipeline:definition.name, result:result, finish:finishTime}" \
  --output table
```

### Get Specific Pipeline Run Details

```bash
az pipelines runs show \
  --id <run-id> \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --query "{pipeline:definition.name, result:result, queueTime:queueTime, finishTime:finishTime, commit:sourceVersion}" \
  --output json
```

### Trigger Manual Pipeline Run

```bash
az pipelines run \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --name "Association-Register-API" \
  --branch main
```

### List All Dashboards in Project

```bash
az devops project show \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --query "capabilities.dashboards" \
  --output table
```

---

## References

1. **Google DORA Research:**
   - [2023 State of DevOps Report](https://cloud.google.com/devops/state-of-devops)
   - [DORA Metrics Explained](https://dora.dev/metrics/)

2. **Azure DevOps Analytics:**
   - [Analytics Views Documentation](https://learn.microsoft.com/en-us/azure/devops/report/powerbi/analytics-views)
   - [OData API Reference](https://learn.microsoft.com/en-us/azure/devops/report/extend-analytics/odata-api-version)

3. **Azure Marketplace Extensions:**
   - [Devops Performance Metrics](https://marketplace.visualstudio.com/items?itemName=FalckDevOps.DevopsPerformanceMetrics)

4. **CTN ASR Specific:**
   - [CLAUDE.md - Way of Working](/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/CLAUDE.md)
   - [Azure Monitor Deployment Alerts](/Users/ramondenoronha/Dev/DIL/DEV-CTN-ASR/docs/AZURE_MONITOR_DEPLOYMENT_ALERTS_SETUP.md)

---

## Changelog

| Date       | Version | Changes                                    | Author         |
|------------|---------|--------------------------------------------|-----------------
| 2025-11-17 | 1.0     | Initial dashboard setup guide created     | DevOps Guardian |

---

## Support

**Questions or issues with the DORA dashboard?**

- **Slack:** `#devops-team` (for dashboard access and interpretation)
- **Email:** `devops@denoronha.consulting`
- **Azure DevOps:** Create work item in `ASR` project, tag `DevOps`

**Document maintained by:** DevOps Guardian Agent (DG)
**Review frequency:** Quarterly (or when DORA methodology updates)
