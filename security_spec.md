# AurumPulse Firestore Security Specification

## 1. Data Invariants
1. **Zero Blanket Reads**: No unauthenticated or cross-user `get` or `list` is permitted on `/users/{userId}`, `/users/{userId}/holdings/{holdingId}`, or `/users/{userId}/alerts/{alertId}`.
2. **Verified Identity & Ownership**: All writes require `request.auth != null`, `request.auth.token.email_verified == true`, and `userId == request.auth.uid` matching `incoming().userId`.
3. **Master Gate Parent Integrity**: Subcollection single-document writes (`holdings`, `alerts`) verify that the parent `/users/{userId}` document exists. List queries strictly enforce `resource.data.userId == request.auth.uid` without calling `get()` or `exists()`.
4. **Strict Schema & Bounds**: Every string field enforces `.size()`, every document enforces `keys().hasAll(...)` and `keys().hasOnly(...)`, every ID validates against `^[a-zA-Z0-9_\-]+$`, and numeric amounts/prices are bounded above 0.
5. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update; `userId` is immutable.
6. **Terminal State Locking**: Once a `PriceAlert` reaches `status == 'triggered'`, no further updates are permitted (immutable trigger audit log; users may delete or create a fresh alert).

## 2. The Dirty Dozen Adversarial Payloads
1. **Unauthenticated Read**: `GET /users/uid_a/holdings/h1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read**: `uid_b` attempts `GET /users/uid_a/holdings/h1` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: `uid_a` with `email_verified: false` creates `/users/uid_a` -> `PERMISSION_DENIED`.
4. **Identity Spoofing**: `uid_a` creates `/users/uid_a/holdings/h1` with `userId: "uid_b"` -> `PERMISSION_DENIED`.
5. **Shadow Ghost Field**: `uid_a` creates `/users/uid_a` adding extra field `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Path ID Poisoning**: `uid_a` creates `/users/uid_a/holdings/bad$id!@#` -> `PERMISSION_DENIED`.
7. **Denial-of-Wallet String Overflow**: `uid_a` writes 500-char `label` on holding (> 60 max) -> `PERMISSION_DENIED`.
8. **Client Timestamp Forgery**: `uid_a` creates holding with backdated `createdAt` (`!= request.time`) -> `PERMISSION_DENIED`.
9. **Immutable Field Tampering**: `uid_a` updates holding attempting to alter `createdAt` or `userId` -> `PERMISSION_DENIED`.
10. **Terminal Alert Re-open**: `uid_a` attempts to update a `status: "triggered"` alert back to `"active"` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: `uid_a` updates `targetPrice` to `"not-a-number"` or `-500` -> `PERMISSION_DENIED`.
12. **Orphaned Subcollection Write**: `uid_a` creates `/users/uid_a/alerts/a1` when parent `/users/uid_a` does not exist -> `PERMISSION_DENIED`.
