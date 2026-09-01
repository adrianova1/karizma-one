# Production 60,000 Canonical Scenario Bank Manifest

**Generated:** 2026-08-27T17:38:58.795Z  
**Status:** `PRODUCTION_READY_60K_LOCKED`  
**Execution Duration:** `12.68s`

---

## 1. Source Integration & Deduplication Breakdown

| Source Name | Parsed | Added Unique | Duplicate / Merged |
| :--- | :---: | :---: | :---: |
| **Base 51 Backup** (`data/scenarios.backup.json`) | 51 | 51 | 0 |
| **Scenario_Bank.txt** | 8707 | 8233 | 474 |
| **karizma_scenario_bank_import.txt** | 4364 | 1075 | 3289 |
| **Sample Imports** (`data/imports/1_hazir_javabi_sample.txt`) | 150 | 101 | 49 |
| **Existing JSON Bank** | 51 | 0 | 51 |
| **TOTAL UNIQUE AFTER MERGE** | - | **9,460** | **3,863** |
| **New Dilemmas Generated to Complete 60K** | - | **50,540** | - |
| **FINAL CANONICAL PRODUCTION TOTAL** | - | **60,000** | - |

---

## 2. Response Pools & Conversational Vectors

| Metric | Count |
| :--- | :---: |
| **Total Scenarios** | **60,000** |
| **Total User Triggers** | **262,179** |
| **Total Conversational Aliases** | **202,160** |
| **Total 5-Tone Responses** | **300,000** |
| - Direct Pool (`direct`) | 60,000 |
| - Funny Pool (`funny`) | 60,000 |
| - Charismatic Pool (`charismatic`) | 60,000 |
| - Emotional Pool (`emotional`) | 60,000 |
| - Psychology Pool (`psychology`) | 60,000 |

---

## 3. Production Disk Locations
- `data/scenarios.json` (314.13 MB)
- `data/coach/scenarios.json`
- Preserved Backup: `data/scenarios.backup.json`
