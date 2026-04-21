# Auto Demand Production Implementation Plan

## Status

This is the canonical implementation reference for the demand-driven auto production planning project.

If future conversations lose context, start from this file first.

Related file:

- `AUTO_DEMAND_PRODUCTION_PLANNING_SPEC.md` = conceptual design reference
- `AUTO_DEMAND_PRODUCTION_IMPLEMENTATION_PLAN.md` = final v1 rules and implementation plan

---

## Final V1 Objective

Automatically generate the next production day's plan from NODA demand using the latest physical inventory snapshot after the daily inventory scan.

The v1 system must:

1. create a machine-level production proposal for the next working day
2. prioritize the nearest internal deadlines first
3. use only physical inventory as official supply for the planning run
4. assign products only to explicitly allowed equipment
5. keep manual plans protected unless explicitly approved for change
6. surface clear shortage alerts when capacity cannot protect the nearest deadline

---

## Final V1 Operating Assumptions

### Daily Inventory Scan Rule

1. Physical inventory is scanned every day at around `15:00`.
2. By `16:30`, the inventory state is assumed stable enough for the official next-day planning run.
3. The v1 implementation should treat `16:30` as the official daily planning cutoff.

### Official Planning Run Rule

1. The system generates the official plan for production date `D` at `16:30` on the previous working day.
2. That plan is based on physical inventory after the daily scan.
3. Same-day re-planning before the scan window is not part of the main v1 automation flow.

Example:

- At `2026-04-20 16:30`, generate the official production plan for `2026-04-21`.

### Supply Model for V1

1. Official planning supply source = physical inventory only.
2. `pressDB` is used as operational visibility only in v1.
3. Approved-but-not-yet-scanned planned supply is deferred to a later phase.

Reason:

- The 15:00 daily scan and 16:30 planning cutoff give a reliable physical inventory snapshot, which lets v1 stay simpler and safer.

---

## Final Business Rules

### Demand Horizon

1. Horizon is configurable.
2. Default = `3 days`.

### Internal Production Deadline

1. Customer field = `納入指示日`.
2. Internal production deadline = `納入指示日 - 1 day`.
3. If that lands on Saturday or Sunday, move back to the previous working day.
4. Working days are Monday to Friday.

### Production-Date Planning Rule

When planning production date `P`:

1. calculate shortage demand across the configured horizon
2. include items whose internal production deadline falls between `P` and the horizon end
3. use the machine capacity of production date `P` only
4. fill that capacity by priority order

This means the plan for one production date can start protecting later future deadlines if higher-priority demand is already covered and capacity remains.

### Priority Order

Requests and derived shortages must be prioritized in this order:

1. earliest internal production deadline
2. lower `便`
3. earlier `createdAt`

### Factory Rule

1. Product factory comes from `masterDB.工場`.
2. Equipment eligibility does not come from `masterDB.加工設備`.
3. `加工設備` is reference only and must be ignored as scheduling truth.

### Equipment Source of Truth

1. Machine eligibility must come from a dedicated capability collection.
2. One `背番号 / 品番` pair may belong to more than one machine.
3. Machine priority must be explicit.

### Working Hours

1. Standard shift window = `09:00-17:30`.
2. Overtime window = up to `19:00` when required.
3. Fixed breaks:
   - `12:00-12:45`
   - `15:00-15:15`

### Quantity Rule

1. All proposed production quantities must be rounded to full box quantity.
2. Box quantity comes from `masterDB.収容数` unless future machine-specific override is introduced.

### Parallel Split Rule

1. A product may be split across up to `2 machines` in v1.
2. Split is allowed only when both machines are explicitly eligible.
3. Split is required when one machine cannot finish by `19:00`.
4. Split is recommended when one-machine completion would exceed the configured risk threshold.

Recommended default v1 risk threshold:

- split if estimated single-machine completion time is later than `17:00` and a second eligible machine materially reduces risk.

### Safety Stock Rule

1. Safety stock is allowed only after all shortage demand inside the horizon is protected.
2. Safety stock formula:

```text
safety stock per item = total demand within horizon / number of days in horizon
```

3. Safety stock must also be rounded to full boxes.

### Manual Plan Protection Rule

1. Manual plans are locked by default.
2. Auto-planner creates a proposal, not a silent overwrite.
3. Changes must be approved before becoming active.

### Alert Rule

If the nearest internal deadline still cannot be protected:

1. show a high-visibility modal on the planner page
2. repeat every `5 minutes`
3. show it to every user currently on that page

---

## V1 In Scope

### Included

1. equipment capability source of truth
2. next-day planning run at `16:30`
3. horizon demand calculation from NODA
4. internal deadline conversion
5. FIFO allocation against physical inventory
6. proposal generation
7. approval flow
8. machine assignment for one production date
9. overtime extension to `19:00`
10. shortage exception reporting
11. repeating planner alerts

### Explicitly Deferred

1. planned-supply layer before inventory scan
2. using `pressDB` as official supply in planning math
3. same-day continuous auto re-planning before scan completion
4. production run reconciliation across schedule -> pressDB -> inventory
5. holiday calendar beyond Monday-Friday weekend logic

---

## System Sources of Truth

### Demand Source

- `submittedDB.nodaRequestDB`

Fields used:

1. `requestNumber`
2. `便`
3. `納入指示日`
4. `createdAt`
5. `lineItems[].品番`
6. `lineItems[].背番号`
7. `lineItems[].quantity`
8. `lineItems[].status`

### Official Supply Source for V1

- `submittedDB.nodaInventoryDB`

Use this only for the official planning supply calculation.

### Product Reference Source

- `Sasaki_Coating_MasterDB.masterDB`

Fields used:

1. `品番`
2. `背番号`
3. `モデル`
4. `品名`
5. `工場`
6. `収容数`
7. `材料`
8. `材料背番号`

### Equipment Capability Source

New collection:

- `submittedDB.productionCapabilityDB`

### Actual Production Visibility Source

- `submittedDB.pressDB`

Use in v1 for:

1. visibility in planner UI
2. comparison against scheduled output
3. future enhancement groundwork

Do not use in v1 as the official supply basis for the 16:30 planning run.

---

## New Collections

### 1. Production Capability Collection

Recommended name:

- `submittedDB.productionCapabilityDB`

Purpose:

1. define eligible machines per `背番号 / 品番`
2. define machine priority order
3. hold machine-specific planning metadata

Recommended document shape:

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
      "preferred": true,
      "cycleTimeSeconds": null,
      "pcPerCycle": null,
      "boxQuantityOverride": null
    },
    {
      "設備": "OZNC11",
      "priority": 2,
      "enabled": true,
      "preferred": false,
      "cycleTimeSeconds": null,
      "pcPerCycle": null,
      "boxQuantityOverride": null
    }
  ],
  "updatedAt": "ISODate",
  "updatedBy": "User Name"
}
```

### 2. Auto Planning Proposal Collection

Recommended name:

- `submittedDB.autoPlanningProposalDB`

Purpose:

1. store proposal runs
2. store approval state
3. preserve why the plan was generated
4. preserve exception results

Recommended document shape:

```json
{
  "factory": "小瀬",
  "runType": "official-next-day",
  "runDate": "2026-04-20",
  "targetProductionDate": "2026-04-21",
  "horizonDays": 3,
  "status": "draft",
  "createdAt": "ISODate",
  "createdBy": "system-or-user",
  "inventorySnapshotAt": "ISODate",
  "rulesVersion": "v1",
  "inputs": {
    "requestIds": [],
    "factory": "小瀬"
  },
  "summary": {
    "protectedBoxes": 0,
    "unprotectedBoxes": 0,
    "safetyStockBoxes": 0,
    "overtimeMinutes": 0
  },
  "changes": {
    "goals": [],
    "assignments": [],
    "exceptions": []
  }
}
```

---

## Canonical V1 Algorithm

### Step 1: Determine Target Production Date

At `16:30` on working day `D`:

1. set target production date `P` = next working day after `D`
2. load the selected factory context

### Step 2: Load Demand Horizon

1. read active NODA requests
2. derive internal production deadline for each request from `納入指示日`
3. include requests whose internal deadline is between `P` and the configured horizon end
4. flatten requests into line-item demand rows

### Step 3: Enrich Demand Rows

For each demand row:

1. look up `masterDB`
2. resolve `工場`, `モデル`, `品名`, `収容数`, material fields
3. discard or flag rows missing required product reference
4. look up equipment capability mapping
5. discard or flag rows missing eligible equipment

### Step 4: Build FIFO Priority Queue

Sort by:

1. internal deadline ascending
2. `便` ascending
3. `createdAt` ascending

### Step 5: Allocate Physical Inventory

1. load current physical inventory per `背番号`
2. allocate inventory against the FIFO queue in order
3. calculate remaining shortage quantity per demand row
4. convert shortages to shortage boxes using `収容数`

### Step 6: Build Production Candidate Queue For Date P

1. group shortage rows by `背番号 / 品番 / factory`
2. preserve the earliest affected internal deadline per grouped item
3. create candidate rows for scheduling on production date `P`

### Step 7: Load Capacity For Production Date P

1. load active manual plan blocks already occupying the timeline for date `P`
2. compute available machine windows from `09:00-17:30`
3. allow extension to `19:00` only if needed
4. subtract fixed breaks

### Step 8: Schedule By Priority

For each candidate row in priority order:

1. rank eligible machines by explicit capability priority
2. prefer the least-loaded eligible machine when priorities are equal
3. use historical trend only as tie-breaker
4. calculate estimated duration from cycle time rules
5. attempt single-machine placement first
6. if single-machine placement fails or crosses split threshold, attempt split across up to 2 machines
7. if no valid placement exists, record exception

### Step 9: Fill Safety Stock

Only after all demand in the horizon is protected:

1. calculate average demand across the horizon
2. convert to full boxes
3. fill remaining free capacity with safety stock candidates

### Step 10: Save Proposal

Store result in `autoPlanningProposalDB` with:

1. generated goal rows
2. generated machine assignments
3. exception list
4. overtime usage
5. shortage summary

### Step 11: Approval

On approval:

1. create or update `productionGoalsDB`
2. create or update planner assignments for target production date `P`
3. keep manual assignments locked unless explicitly replaced

### Step 12: Alerting

If exceptions affect the nearest internal deadline:

1. show alert modal on planner page
2. repeat every `5 minutes`
3. include product, shortage boxes, due date, missing machine time, and request numbers

---

## Concrete Default Rules For V1

Use these defaults unless intentionally changed:

1. `planningHorizonDays = 3`
2. `officialRunTime = 16:30`
3. `inventoryScanTargetTime = 15:00`
4. `workStartTime = 09:00`
5. `regularShiftEnd = 17:30`
6. `maxShiftEnd = 19:00`
7. `splitMachineLimit = 2`
8. `parallelSplitRiskThreshold = 17:00`
9. `break1 = 12:00-12:45`
10. `break2 = 15:00-15:15`
11. `sameDayTieBreaker = createdAt`
12. `quantityRoundingMode = full-box-up`
13. `manualPlansLockedByDefault = true`
14. `alertRepeatMinutes = 5`

---

## API / Service Work Required

### Backend

Implement these new endpoints or equivalent services:

1. `GET /api/production-capability`
2. `POST /api/production-capability`
3. `PUT /api/production-capability/:id`
4. `POST /api/auto-planning/run`
5. `GET /api/auto-planning/proposals`
6. `GET /api/auto-planning/proposals/:id`
7. `POST /api/auto-planning/proposals/:id/approve`
8. `POST /api/auto-planning/proposals/:id/reject`
9. `GET /api/auto-planning/exceptions`

### Scheduling Trigger

Support both:

1. server-side scheduled daily run at `16:30`
2. manual re-run button for authorized users

Recommended behavior:

- server-side scheduled run creates draft proposal only
- approval is still explicit unless a later phase changes that policy

---

## UI Work Required

### MasterDB Page

Add equipment capability editor with:

1. search by `背番号`
2. search by `品番`
3. filter by `モデル`
4. add or remove eligible machines
5. set machine priority order
6. set machine-specific cycle time
7. set machine-specific `pcPerCycle`
8. set optional machine-specific box override
9. enable or disable mapping

### Production Planner Page

Add:

1. `Generate Auto Plan` button
2. proposal summary modal
3. approval and reject actions
4. exception panel
5. repeating deadline-risk modal
6. display of official target production date

### Proposal Summary Must Show

1. items scheduled by machine
2. protected shortage boxes
3. remaining unprotected shortage boxes
4. overtime used
5. safety stock added
6. manual conflicts

### Exception Panel Must Show

1. `背番号`
2. `品番`
3. shortage boxes
4. affected internal deadline
5. missing machine minutes
6. affected NODA request numbers

---

## Implementation Phases

### Phase 1: Data Foundation

Build:

1. `productionCapabilityDB`
2. capability CRUD API
3. MasterDB page editor UI

Deliverable:

- explicit machine source of truth exists

### Phase 2: Demand Engine

Build:

1. internal deadline conversion logic
2. horizon demand loader
3. FIFO inventory allocation logic
4. shortage candidate builder

Deliverable:

- server can calculate shortage queue for a target production date

### Phase 3: Proposal Engine

Build:

1. `autoPlanningProposalDB`
2. official `16:30` run logic
3. proposal save and retrieval API
4. proposal summary UI

Deliverable:

- system can generate and review next-day draft plan

### Phase 4: Machine Scheduler

Build:

1. available-window calculation
2. machine ranking
3. split-across-2-machines logic
4. overtime-to-19:00 logic
5. safety stock fill logic

Deliverable:

- system can produce machine-level schedule proposal

### Phase 5: Approval And Planner Integration

Build:

1. approval action
2. write-through to `productionGoalsDB`
3. planner timeline assignment integration
4. manual-plan conflict handling

Deliverable:

- approved proposal becomes active planner data

### Phase 6: Alerts And Exception Handling

Build:

1. exception API
2. planner risk modal
3. 5-minute repeating alerts
4. exception detail panel

Deliverable:

- unresolved nearest-deadline risk is visible to all planner users

### Phase 7: Phase 2 Enhancements

Future work only:

1. integrate `pressDB` as actual-unscanned production layer
2. add planned-supply layer before scan
3. add production run ID for reconciliation
4. support same-day dynamic replanning

---

## Non-Negotiable Guardrails

1. Never use `masterDB.加工設備` as scheduling truth.
2. Never overwrite manual plans silently.
3. Never schedule a product onto a machine unless capability mapping explicitly allows it.
4. Never count safety stock before shortage demand is protected.
5. Never make the official next-day run before the `16:30` cutoff.
6. Never treat `pressDB` as official planning supply in v1.

---

## Success Criteria

The implementation is considered successful when:

1. the next production day's plan can be generated automatically after `16:30`
2. the plan uses physical inventory after the daily scan
3. the nearest internal deadlines are prioritized correctly
4. machine selection comes from explicit capability mapping
5. planners can review and approve changes before they become active
6. unresolved shortage risk is obvious and persistent in the planner

---

## Resume Checklist For Future Sessions

If context is lost, re-read this file and confirm these first:

1. v1 official run time is `16:30`
2. v1 official supply source is physical inventory only
3. `pressDB` is visibility only in v1
4. machine truth comes from `productionCapabilityDB`
5. `masterDB.加工設備` must be ignored for scheduling truth
6. auto-planner creates proposals first, not blind overwrites
7. split across max 2 machines is allowed
8. alerts repeat every 5 minutes when nearest deadline is at risk

This file should be updated first whenever the business rules change.