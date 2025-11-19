# Canonical Data Store Migration Plan (Firestore → Supabase)

## Goal
Adopt Supabase as the single canonical store for releases and retailers to enable low-latency realtime channels, SQL analytics, and unified ingestion. Firestore remains temporarily for legacy UI reads until cutover.

## Phases
1. Assessment (Day 0–1)
   - Inventory Firestore collections: `sneakers`, `sneakers_canonical`, `retailers`, `releases`, `stock_snapshots`.
   - Map fields → Supabase schema (ensure `ingestion_started`, `ingestion_completed`, `latency_ms`).
2. Dual-Write (Day 2–5)
   - Pipeline writes to Supabase first, then Firestore (adapter shim).
   - Add `_sync_version` to each row/document for debugging.
3. Verification (Day 6–7)
   - Consistency checks (counts, null/missing fields, status drift).
   - Daily diff report (Supabase vs Firestore) committed as artifact.
4. Cutover (Day 8)
   - Switch UIs to Supabase endpoints / realtime subscriptions.
   - Freeze Firestore writes; keep read-only for 2 weeks.
5. Decommission (Week 3)
   - Remove Firestore triggers and dual-write shim.

## Dual-Write Adapter Sketch
```
async function dualWriteRelease(release) {
  await supabase.from('releases').upsert(release, { onConflict: 'sku,source' });
  await firestore.collection('releases').doc(release.sku + '::' + release.source).set(release, { merge: true });
}
```

## Metrics & SLAs
- Insert/Update latency P95 < 60s from external source detection.
- Consistency Drift: < 0.5% rows mismatched by field.
- Event propagation (status change) to client subscribers < 3s (P95).

## Rollback Strategy
If Supabase outage > 5 min:
- Fallback writes to Firestore only.
- Queue pending Supabase writes; replay once healthy.

## Open Items
- Final decision on stock snapshot storage location (timescale vs Supabase).
- Evaluate row-level security policies before API exposure.

## Owner & Sign-off
Migration Lead: TBD
Sign-off Criteria: All SLAs green for 48h post cutover.
