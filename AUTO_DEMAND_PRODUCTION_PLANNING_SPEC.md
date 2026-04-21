# Demand-Driven Auto Production Planning Spec

## Purpose

This document defines the target design for automated production planning in FreyaAdmin.

The goal is to move from a fully manual planning process to a demand-driven system that:

1. Reads customer demand from NODA picking requests.
2. Compares that demand against current physical inventory in FIFO priority order.
3. Calculates what must be produced to protect the nearest delivery deadlines.
4. Creates production goals automatically.
5. Assigns those goals to eligible machines automatically.
6. Warns all planner users when the nearest deadline cannot be protected.

This is a planning reference only. No implementation is included in this document.

---

## Core Principles

1. Customer demand drives production, not manual guesswork.
2. Current physical inventory is the main source of truth for supply.
3. Earlier deadlines always win over later deadlines.
4. Machine assignment must use a dedicated equipment capability source of truth.
5. Normal working hours should be used first; overtime is allowed only when required.
6. Manual planning should not be silently overwritten.

---

## Existing Systems In Scope

### NODA Warehouse Requests

- Source collection: `submittedDB.nodaRequestDB`
- Demand is created in bulk request form with line items.
- Relevant fields include:
  - `requestNumber`
  - `便`
  - `納入指示日`
  - `lineItems[].品番`
  - `lineItems[].背番号`
  - `lineItems[].quantity`
  - `lineItems[].status`

### Inventory

- Source collection: `submittedDB.nodaInventoryDB`
- Physical inventory is already used by NODA FIFO logic.
- Planning must use the same physical-inventory-first mindset.

### Product Reference

- Source collection: `Sasaki_Coating_MasterDB.masterDB`
- Used as reference for:
  - `品番`
  - `背番号`
  - `モデル`
  - `品名`
  - `工場`
  - `収容数`
  - material-related fields such as `材料`, `材料背番号`
- `加工設備` in `masterDB` is reference only.
- `加工設備` must not be treated as the source of truth for scheduling.

### Production Planner

- Existing goals collection: `submittedDB.productionGoalsDB`
- Existing planner already supports:
  - goal creation
  - manual scheduling
  - trend-based smart scheduling
  - fixed breaks
  - date/factory scoped plans

---

## Business Rules

### Planning Horizon

- Planning horizon is configurable.
- Default horizon is 3 days.

### Internal Production Deadline

- Customer-facing field: `納入指示日`
- Internal production deadline = `納入指示日 - 1 day`
- If that result lands on Saturday or Sunday, move back to the previous working day.
- Working days are Monday to Friday.

Example:

- `納入指示日 = 2026-04-21`
- Internal production deadline = `2026-04-20`

### Priority Order

Requests must be prioritized in this order:

1. Earliest internal production deadline first.
2. Lower `便` first within the same day.
3. Fallback recommendation if still tied: earlier `createdAt` first.

### Working Hours

- Standard planning window: `09:00-17:30`
- Extended planning window when required: up to `19:00`
- Breaks are fixed across factories:
  - `12:00-12:45`
  - `15:00-15:15`

### Next-Day Scheduling Cutoff

- Next-day auto assignment is allowed only after `16:30`.
- Reason: production scanned into inventory by around `15:00` should be reflected before next-day planning is recalculated.

### Quantity Rounding

- Auto-generated production quantities must be rounded by box quantity.
- Box quantity comes from `収容数` unless a future machine-specific override is defined.

### Safety Stock

- Safety stock is created only after the full demand within the planning horizon is protected.
- Safety stock formula:

```text
safety stock per item = total demand within horizon / number of days in horizon
```

- Safety stock must also be rounded to full box quantity.

### Parallel Machine Split

- A product may be split across multiple machines when needed.
- For v1 planning logic, allow splitting across up to 2 machines.
- Split when either:
  - one machine cannot finish within the required day, or
  - finishing on one machine is considered too risky / too close to the deadline.

### Demand vs Supply Rule

- Only current physical inventory counts as confirmed supply.
- FIFO allocation must be performed against that physical inventory in priority order.

Note:

- A final implementation decision is still needed on whether approved-but-not-yet-scanned production should be tracked as a separate planned-supply layer to prevent duplicate replanning before scan completion.
- Recommendation: yes, but keep it separate from physical inventory.

---

## Equipment Capability Source of Truth

Create a dedicated collection for machine capability.

Recommended collection name:

- `submittedDB.productionCapabilityDB`

This collection defines which machines are allowed to make each `背番号 / 品番` pair.

### Why a Separate Collection Is Needed

`masterDB` should remain the product reference source.

The equipment capability source must support:

1. one product on multiple machines
2. preferred machine order
3. machine-specific cycle time
4. machine-specific `pcPerCycle`
5. machine-specific box overrides if needed later
6. enable/disable by machine
7. future planning metadata

### Recommended Schema

```json
{
  "背番号": "6GN",
  "品番": "74222-X1B17-E0",
  "モデル": "992W(310D)",
  "工場": "小瀬",
  "enabled": true,
  "machines": [
    {
      "設備": "OZNC02",
      "priority": 1,
      "enabled": true,
      "cycleTimeSeconds": null,
      "pcPerCycle": null,
      "boxQuantityOverride": null,
      "preferred": true
    },
    {
      "設備": "OZNC04,OZNC06",
      "priority": 2,
      "enabled": true,
      "cycleTimeSeconds": null,
      "pcPerCycle": null,
      "boxQuantityOverride": null,
      "preferred": false
    }
  ],
  "updatedAt": "ISODate",
  "updatedBy": "User Name"
}
```

### UI Ownership

- The edit UI can live on the MasterDB page.
- The stored data should still be a dedicated equipment-capability collection.

---

## Proposed End-to-End Planning Flow

### Stage 1: Load Demand Candidates

1. Read active NODA requests within the configured horizon.
2. Use `納入指示日` to compute internal production deadline.
3. Ignore requests outside the horizon.
4. Expand line items from request level to item level.

### Stage 2: Enrich Each Item

For each NODA line item:

1. Look up `masterDB` by `背番号 / 品番`.
2. Resolve:
   - `工場`
   - `モデル`
   - `品名`
   - `収容数`
   - material reference fields
3. Look up eligible machines from `productionCapabilityDB`.

### Stage 3: Build Priority Queue

Sort all demand line items by:

1. internal production deadline ascending
2. `便` ascending
3. `createdAt` ascending as fallback

### Stage 4: FIFO Inventory Allocation

For each prioritized line item:

1. Read current physical inventory.
2. Consume physical inventory in order.
3. Track how much of each line item is already covered.
4. Track remaining shortage per product.

Output of this stage:

- covered quantity
- shortage quantity
- shortage boxes
- affected deadline
- affected request references

### Stage 5: Convert Shortage Into Production Demand

For each item shortage:

1. Round shortage to full boxes.
2. Group by:
   - `工場`
   - internal production deadline
   - `背番号 / 品番`
3. Create a proposed production demand row.

This demand is not yet the final machine schedule.

### Stage 6: Machine Assignment

For each proposed production demand row:

1. Load eligible machines from `productionCapabilityDB`.
2. Rank machines by:
   - explicit machine priority
   - least-loaded machine
   - historical trend only as tie-breaker
3. Place work into available time from `09:00-17:30` first.
4. If still required, extend up to `19:00`.
5. Respect breaks.
6. Split across up to 2 machines when needed.

### Stage 7: Safety Stock Fill

After all demand inside the horizon is protected:

1. compute average demand over the horizon
2. convert to full boxes
3. use remaining free capacity to produce safety stock

Safety stock must always be lower priority than actual deadline protection.

### Stage 8: Approval

Recommended v1 behavior:

1. automation creates a proposal
2. user reviews proposal summary
3. supervisor or planner approves
4. approved proposal becomes active goals and machine schedule

Do not blindly overwrite manual plans.

### Stage 9: Alerting

If the nearest deadline still cannot be protected after scheduling:

1. show a blocking or high-visibility modal in the planner page
2. repeat every 5 minutes
3. show it to every user currently on the planner page
4. stop only after inventory or planning changes remove the risk

---

## Proposed Data Additions

### 1. Equipment Capability Collection

- `submittedDB.productionCapabilityDB`

### 2. Auto-Planning Proposal Collection

Recommended collection name:

- `submittedDB.autoPlanningProposalDB`

Purpose:

- store proposal runs before approval
- preserve review history
- support comparison with manual plan

Recommended fields:

```json
{
  "factory": "小瀬",
  "planningDate": "2026-04-20",
  "horizonDays": 3,
  "status": "draft",
  "createdAt": "ISODate",
  "createdBy": "User Name",
  "inputs": {
    "requestIds": [],
    "inventorySnapshotAt": "ISODate"
  },
  "summary": {
    "protectedDemandBoxes": 0,
    "unprotectedDemandBoxes": 0,
    "safetyStockBoxes": 0
  },
  "changes": {
    "newGoals": [],
    "scheduledAssignments": [],
    "unscheduledShortages": []
  }
}
```

### 3. Optional Planned Supply Collection

Recommended collection name:

- `submittedDB.plannedSupplyDB`

Purpose:

- avoid duplicated replanning between approval and physical scan
- keep physical stock separate from planned output

This is recommended, but can be deferred if rollout is staged carefully.

---

## Planner UI Changes

### Production Planner Page

Add a new automation workflow:

1. `Generate Auto Plan`
2. proposal summary modal
3. approval action
4. exception panel
5. repeating alert when nearest deadline is at risk

### Proposal Summary Must Show

1. items protected by deadline
2. items still at risk
3. machine assignments
4. overtime usage
5. safety stock added
6. manual plan conflicts

### Exception Panel Must Show

1. product
2. shortage boxes
3. affected due date
4. missing machine time
5. affected NODA request numbers

---

## MasterDB Page Changes

Add an equipment-capability management UI.

Required editor features:

1. search by `背番号`
2. search by `品番`
3. filter by `モデル`
4. assign one or more machines
5. reorder preferred machines
6. set machine-specific cycle time
7. set machine-specific `pcPerCycle`
8. set optional machine-specific box override
9. enable or disable mappings

Important:

- `背番号 / 品番` is the primary pair.
- `モデル` is grouping/filter context, not the primary unique key.

---

## Conflict Handling Policy

### Manual vs Auto Plan

Recommended policy:

1. Existing manual assignments remain locked by default.
2. Auto-planner proposes additions or changes.
3. User can approve or reject changes.
4. Overwrite mode should be explicit and privileged.

### Machine Conflict Resolution

If two products compete for the same machine window:

1. nearest deadline wins
2. lower `便` wins
3. lower machine priority score loses
4. the losing product is moved to the next eligible machine or reported as shortage

---

## Rollout Plan

### Phase 1: Source of Truth

Build:

1. `productionCapabilityDB`
2. MasterDB page editor for machine capability

No auto-scheduling yet.

### Phase 2: Demand Analysis Proposal

Build:

1. horizon demand loader
2. internal deadline conversion
3. FIFO shortage calculation
4. proposal summary UI

Output is proposal only.

### Phase 3: Auto Goal Creation

Build:

1. convert shortages to production goals
2. approval flow
3. conflict summary against manual plans

### Phase 4: Auto Machine Assignment

Build:

1. machine ranking from capability DB
2. working-hour-aware scheduler
3. split across up to 2 machines
4. overtime extension to `19:00`

### Phase 5: Recalculation and Alerts

Build:

1. `16:30` next-day recalculation behavior
2. repeating 5-minute alert modal
3. unresolved shortage exception panel

### Phase 6: Safety Stock

Build:

1. average-demand safety stock generation
2. free-capacity fill logic

---

## Success Criteria

The new system is successful when:

1. the nearest internal deadline is automatically protected whenever enough capacity exists
2. planners no longer need to manually translate NODA demand into daily goals
3. machine choice comes from explicit capability mapping, not ad hoc memory
4. shortage exceptions are visible immediately
5. the planner can explain why each assignment was made

---

## Open Decisions

### Decision 1: Planned Supply Before Scan

Question:

- Should approved scheduled production count as future supply before workers scan it into inventory?

Recommendation:

- Yes, but store it as separate planned supply, not physical inventory.

Reason:

- This avoids duplicate replanning between approval time and scan time.

### Decision 2: Same-Day Tie After Deadline and 便

Fallback recommendation:

- use `createdAt` ascending.

---

## Summary

This design replaces manual demand translation with a controlled, approval-based automation layer.

It keeps:

1. NODA as the demand source
2. inventory as the physical stock source
3. MasterDB as the product reference source
4. a new dedicated capability collection as the equipment source of truth
5. Production Planner as the final scheduling and alert surface

The design is concrete enough to implement in phases without discarding the current planner.