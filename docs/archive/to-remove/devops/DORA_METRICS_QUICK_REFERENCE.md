# DORA Metrics Quick Reference

**Print this card and keep at your workspace**

---

## Dashboard Access

**URL:** https://dev.azure.com/ctn-demo/ASR/_dashboards

**Documentation:** `docs/devops/DORA_METRICS_DASHBOARD.md`

---

## Elite Performance Targets

| Metric                       | Elite Target        |
|------------------------------|---------------------|
| Deployment Frequency         | Multiple per day    |
| Lead Time for Changes        | <60 minutes         |
| Mean Time to Restore (MTTR)  | <60 minutes         |
| Change Failure Rate (CFR)    | 0-15%               |

---

## Red Flags (Alert DevOps Lead Immediately)

- Change Failure Rate >20% for 2 consecutive weeks
- MTTR exceeds 4 hours for any single incident
- Lead Time exceeds 60 minutes average for a week
- Deployment Frequency drops below 1/day for a week

---

## Review Cadence

- **Daily:** Glance at dashboard during standup (2 min)
- **Weekly:** Trend analysis in team meeting (10 min)
- **Monthly:** Deep dive + improvement planning (60 min)

---

## Commands

### Generate DORA Report (Last 30 Days)

```bash
./scripts/generate-dora-report.sh 30
```

### Calculate MTTR

```bash
./scripts/calculate-mttr.sh 30
```

### View Recent Deployments

```bash
az pipelines runs list \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --top 10 \
  --output table
```

---

## Interpretation Guide

### Deployment Frequency

- **Increasing:** Good - smaller, safer changes
- **Decreasing:** Bad - investigate blockers
- **Spikes:** Check for batch deployments (anti-pattern)

### Lead Time

- **Increasing:** Bad - pipeline slowdowns
- **Decreasing:** Good - optimizations working
- **Outliers:** Identify slow deployments (DB migrations, large bundles)

### MTTR

- **Increasing:** Bad - recovery processes degrading
- **Decreasing:** Good - improved rollback/monitoring
- **High variance:** Inconsistent incident response

### Change Failure Rate

- **Increasing:** Bad - quality issues, insufficient testing
- **Decreasing:** Good - better test coverage
- **Threshold breach (>15%):** Urgent - review testing strategy

---

## What Each Metric Tells You

**Deployment Frequency**
- How often you ship to production
- Indicator of team velocity and confidence
- Elite = Multiple times per day

**Lead Time for Changes**
- Time from commit to production
- Measures pipeline efficiency
- Elite = Less than 1 hour

**Mean Time to Restore**
- How fast you recover from failures
- Measures incident response effectiveness
- Elite = Less than 1 hour

**Change Failure Rate**
- Percentage of deployments that fail
- Measures code quality and testing effectiveness
- Elite = 0-15%

---

## Contact

**Questions?**
- Slack: `#devops-team`
- Email: `devops@denoronha.consulting`

**Dashboard Issues?**
- Create work item in Azure DevOps ASR project
- Tag: `DevOps`

---

**Document:** `docs/devops/DORA_METRICS_QUICK_REFERENCE.md`
**Last Updated:** November 17, 2025
