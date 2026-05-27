# Security Specification: Vendor Onboarding Gateway

## 1. Data Invariants
1. **Vendor Autonomy**: A Vendor document can only be created by an unauthenticated onboarding entity (to initialize they receive a unique Serial Code) or an authenticated user. An authenticated user can only edit elements owned by themselves (where `id` or `authUid` equals their `request.auth.uid`).
2. **Contact & Domain Integrity**: Vendor fields like `email`, `phone`, and `preferredDomain` must conform to typing and boundaries (strict length validation).
3. **Serials & Identification ID Protection**: Path variable for `{vendorId}` must be valid alphanumeric symbols of safe size (`size() <= 64`).
4. **Merchandise Scope**: A Product document cannot exist without a parent Vendor record. Unauthenticated clients can only write products within the vendor session they currently possess.
5. **Admin Access Gate**: Bootstrapped administrator `kingjudecole@gmail.com` has absolute read, list, and delete privileges on all collections.
6. **Immutable Markers**: Creation timestamps (`createdAt`) must be protected from tampering post-instantiation.

---

## 2. The "Dirty Dozen" Malicious Payloads

### Payload 1: Identity Hijacking (Overwriting another vendor's profile)
* **Goal**: Hijack an existing vendor's registration space.
* **Path**: `/vendors/vendor_target_123`
* **Payload**:
```json
{
  "id": "vendor_target_123",
  "serialCode": "VEN-HACK-ER99",
  "firstName": "Malicious",
  "lastName": "Attacker",
  "businessName": "Infiltrated Brand"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Privilege Escalation (Self-assigned Auth alignment)
* **Goal**: Force associate a victim's session with a custom rogue auth identifier.
* **Path**: `/vendors/v_victim_456`
* **Payload**:
```json
{
  "authUid": "rogue_attacker_uid",
  "serialCode": "VEN-AAAA-BBBB"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Invalid ID Poisoning (Resource exhaustion with gigantic keys)
* **Goal**: Inject exceptionally long or toxic characters into the document identifier key.
* **Path**: `/vendors/v_poison_very_long_junk_characters_999999999999999...`
* **Payload**:
```json
{
  "serialCode": "VEN-POIS-ONED"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Arbitrary Collection Listing (Scraping all registered partner corporate emails)
* **Goal**: Execute a raw collection-wide query to harvest details of all premium vendors.
* **Path**: `/vendors`
* **Query**: `getDocs(collection(db, "vendors"))`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Zero-Value Theft (Product pricing under zero)
* **Goal**: Inject a negative or zero price for premium merchandise to skip payment checks.
* **Path**: `/vendors/v_test_789/products/p_free_999`
* **Payload**:
```json
{
  "id": "p_free_999",
  "name": "Luxury Silk Robe",
  "price": -100.00,
  "weight": 0.5,
  "createdAt": "2026-05-26T23:13:21Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 6: Untyped Giant Payload (Injecting 1MB toxic string into the product name)
* **Goal**: Exhaust resource quota through giant input attributes.
* **Path**: `/vendors/v_test_789/products/p_toxic_123`
* **Payload**:
```json
{
  "id": "p_toxic_123",
  "name": "[Giant 1MB string of junk characters...]",
  "price": 250.00,
  "weight": 0.5,
  "createdAt": "2026-05-26T23:13:21Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Timestamp Tampering (Altering historic records to live indefinitely)
* **Goal**: Backdate `createdAt` timestamps so draft sessions skip automated 30-day purge routines.
* **Path**: `/vendors/v_active_222`
* **Payload**:
```json
{
  "id": "v_active_222",
  "serialCode": "VEN-GOOD-TIME",
  "createdAt": "2000-01-01T00:00:00Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Foreign Orphans (Cataloging products under a non-existent vendor profile)
* **Goal**: Link inventory records to a ghost vendor ID.
* **Path**: `/vendors/v_ghost_999/products/p_item_555`
* **Payload**:
```json
{
  "id": "p_item_555",
  "name": "Golden Cufflinks",
  "price": 490.00,
  "weight": 0.1,
  "createdAt": "2026-05-26T23:13:21Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 9: Rogue Completion Overrides (Bypassing step requirements)
* **Goal**: Force mark a brand-new registration session as "completed: true" without filling profile fields.
* **Path**: `/vendors/v_test_789`
* **Payload**:
```json
{
  "id": "v_test_789",
  "serialCode": "VEN-SKIP-STEP",
  "completed": true,
  "progress": 100
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 10: Unauthorized Administrative Purging
* **Goal**: Trigger a full-system deletion sweep as an unauthorized caller.
* **Path**: `/vendors/vendor_victim_999`
* **Operation**: `delete`
* **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Shadow Updates (Injecting unapproved fields like "isVipMember")
* **Goal**: Update profile to inject rogue metadata fields.
* **Path**: `/vendors/v_test_789`
* **Payload**:
```json
{
  "id": "v_test_789",
  "serialCode": "VEN-SAFE-CODE",
  "isVipMember": true
}
```
* **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Product Weight Exploits (Exceeding logisitic mass capacity)
* **Goal**: Inject a giant inventory weight value (e.g. 500,000kg) to fail delivery pipelines.
* **Path**: `/vendors/v_test_789/products/p_heavy_888`
* **Payload**:
```json
{
  "id": "p_heavy_888",
  "name": "Anchor Steel weight",
  "price": 200.00,
  "weight": 999999.00,
  "createdAt": "2026-05-26T23:13:21Z"
}
```
* **Expected Result**: `PERMISSION_DENIED`

---

## 3. Security Tests Mock Definition (firestore.rules.test.ts)

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Verification suite validates all Dirty Dozen cases mapping security restrictions against rule configurations.
```
