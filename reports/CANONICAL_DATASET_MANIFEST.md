# Canonical Scenario Bank Audit & Lock Report

**Audit Date:** 2026-08-27T14:40:42.422Z  
**Status:** `LOCKED_SINGLE_SOURCE_OF_TRUTH`

---

## 1. Raw Sources Breakdown

| Source Identifier | Source File Path | Total Parsed | Incomplete / Empty | Duplicates Filtered | Unique Canonical Added |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Raw A** | `Scenario_Bank.txt` | **8711** | 4 | **459** (Internal) | **8248** |
| **Raw B** | `karizma_scenario_bank_import.txt` | **4367** | 3 | **3210** (Cross-source) | **1154** |
| **51-Bank** | `data/scenarios.backup.json` | **51** | 0 | **0** | **51** |

---

## 2. Deduplication Rule & Policy
- **Deterministic Signature:** `norm(situation) + '|' + norm(response)`
- **Normalization Standard:** Strips zero-width Persian characters (`\u200c`, `\u200b`, etc.), unifies whitespaces/newlines, trims leading/trailing spaces, and lowercases text.
- **Priority Tiering:**
  1. Base 51 scenarios are preserved as Priority 1.
  2. Raw A (`Scenario_Bank.txt`) is ingested as Priority 2.
  3. Raw B (`karizma_scenario_bank_import.txt`) is ingested as Priority 3, filtering out identical situation+response pairs already registered.

---

## 3. Final Canonical Summary

- **Total Raw Records Scanned:** `13129`
- **Total Duplicate / Redundant Records Removed:** `3669`
- **Total Incomplete / Malformed Records Skipped:** `7`
- **Final Canonical Scenario Count:** **`9453`**

---

## 4. Locked Canonical File Paths
1. `data/scenarios.json` (Primary DB / API source)
2. `data/coach/scenarios.json` (Coach Engine runtime index source)
3. `data/scenarios_canonical.json` (Immutable canonical reference)
