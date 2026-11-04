# AIIMS One Account – One Device Architecture Specification

## 1. System Overview

The **AIIMS One Account – One Device** subsystem implements strict device binding and session management across both Free and Premium accounts. Every AIIMS learner account can be registered to exactly one device at any given time.

### Core Business Rules
1. **Single Device Binding:** One AIIMS account can only be bound to one physical device or browser enrollment.
2. **Universal Enforcement:** Applies identically to Free and Premium tier learners without exception.
3. **Automatic First-Login Enrollment:** The first successful login from any device automatically registers and binds the account to that device.
4. **Second-Device Rejection:** Login attempts from any other device are strictly rejected.
5. **No Disruptive Invalidation:** A rejected login attempt from a second device never terminates or logs out the active session on the legitimate first device.
6. **Session-Clearing Logout:** Logging out terminates the active session (`sessionId`) but retains the device binding (`deviceIdHash`).
7. **Same-Device Re-authentication:** The bound device can freely log in again after logging out, receiving a fresh active session.
8. **Different-Device Lockout:** A different device cannot log in, even when the bound device is currently logged out.
9. **Administrative Device Reset:** Moving to a new phone or computer strictly requires an administrative reset (`POST /api/admin/users/:userId/device-reset`).
10. **Immutable Audit Logging:** Every device reset event is permanently recorded in dedicated audit records.

---

## 2. Exact User-Facing Messages & Error Codes

When an unauthorized or conflicting device attempts to log in, the backend responds with HTTP 403 and exact deterministic error messages:

| State | Condition | HTTP Code | Error Message (`error`) | Error Code (`code`) |
| :--- | :--- | :--- | :--- | :--- |
| **Concurrent Device Collision** | Account has an active session on the bound device | `403 Forbidden` | `"Account is active on another device."` | `ACCOUNT_ACTIVE_ANOTHER_DEVICE` |
| **Bound Device Lockout** | Account is bound to another device, but currently logged out | `403 Forbidden` | `"This account is registered to another device. Contact support for a device reset."` | `DEVICE_BOUND_ANOTHER_DEVICE` |
| **Device Mismatch on Session** | Token presented from a hardware ID that does not match user's bound device | `401 Unauthorized` | `"Device binding is invalid or has been reset. Please sign in again."` | `DEVICE_MISMATCH` |
| **Revoked / Inactive Session** | Session was logged out or revoked via admin reset | `401 Unauthorized` | `"Session has been revoked or expired. Please sign in again."` | `SESSION_REVOKED` |

---

## 3. Database Architecture & Data Models

### 3.1 User Model Extension (`User.model.ts`)
The `User` schema is extended with a dedicated `deviceBinding` subdocument:

```typescript
export interface IDeviceBinding {
  deviceIdHash: string;                  // SHA-256 cryptographic one-way hash of client device ID
  deviceName?: string;                   // Descriptive client label (e.g. "Chrome on Windows", "Samsung Galaxy S24")
  platform: 'web' | 'android' | 'ios' | 'other';
  boundAt?: Date | null;                 // Timestamp when binding was established
  lastSeenAt?: Date | null;              // Timestamp of most recent activity
  activeSessionId?: string | null;       // UUID of the single active session
  bindingStatus: 'BOUND' | 'UNBOUND';   // Binding lifecycle status
  resetAt?: Date | null;                 // Timestamp of last administrator reset
  resetBy?: string | null;               // Admin User ID who authorized the reset
}
```

**Index Strategy:**
- `UserSchema.index({ 'deviceBinding.deviceIdHash': 1 });` for rapid device lookups.

### 3.2 Session Model (`Session.model.ts`)
A dedicated `Session` collection tracks all issued sessions and their lifecycle:

```typescript
export interface ISession extends Document {
  sessionId: string;                     // UUID v4 unique session identifier
  userId: string;                        // MongoDB ObjectId or User identifier
  deviceIdHash: string;                  // SHA-256 hash of the bound device
  deviceName: string;                    // Device descriptor
  platform: 'web' | 'android' | 'ios' | 'other';
  createdAt: Date;                       // Creation timestamp
  lastSeenAt: Date;                      // Heartbeat activity timestamp
  expiresAt: Date;                       // 7-day expiration timestamp
  revokedAt?: Date | null;               // Timestamp when session was revoked
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}
```

**Index Strategy:**
- Unique compound index on `sessionId`
- Compound index on `{ userId: 1, status: 1 }`
- Compound index on `{ userId: 1, deviceIdHash: 1 }`
- Expiration index on `expiresAt`

### 3.3 Device Reset Audit Model (`DeviceResetAudit.model.ts`)
Every administrative reset generates an immutable compliance audit record:

```typescript
export interface IDeviceResetAudit extends Document {
  targetUserId: string;
  adminUserId: string;
  adminEmail: string;
  previousDeviceIdHash: string;
  previousDeviceName?: string;
  reason: string;
  resetAt: Date;
}
```

---

## 4. Device Identification & Privacy Policy

### 4.1 Plaintext Device ID Privacy
Plaintext hardware identifiers, MAC addresses, or persistent client UUIDs are **never stored** in the database.
- The client transmits the identifier in the `X-Device-Id` header (or request body).
- The server computes a SHA-256 digest:
  $$\text{deviceIdHash} = \text{SHA-256}(\text{deviceId})$$
- Only the 64-character hexadecimal digest is persisted.

### 4.2 Web Client Identification
- Uses a cryptographically strong UUID generated via `crypto.randomUUID()` (or Web Crypto API `getRandomValues`).
- Persisted in browser `localStorage` under `aiims_device_id`.
- Survives browser restarts and normal navigation.
- Transmitted on every API request via `getAuthHeaders()` in `Frontend/src/api/client.ts`.

### 4.3 Android Client Identification
- Uses Capacitor native platform detection (`Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'`).
- Stores persistent installation/hardware UUID.
- Device name identifies manufacturer and model (e.g., `Google Pixel 8 Pro (Capacitor)`).
- Platform explicitly tagged as `'android'`.
- Transmits `X-Client: mobile`, `X-Platform: android`, and `X-Device-Id`.

---

## 5. Lifecycle & State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> UNBOUND: New Registration
    UNBOUND --> BOUND_ACTIVE: First Login (Device A)
    note right of BOUND_ACTIVE: Device A bound.\nActive session created.

    BOUND_ACTIVE --> BOUND_LOGGED_OUT: Logout from Device A
    note right of BOUND_LOGGED_OUT: Session revoked.\nDevice A binding preserved.

    BOUND_LOGGED_OUT --> BOUND_ACTIVE: Device A Re-login
    note right of BOUND_ACTIVE: New session issued to Device A.

    BOUND_ACTIVE --> REJECTED_ACTIVE: Device B Login Attempt
    note right of REJECTED_ACTIVE: HTTP 403: "Account is active on another device."\nDevice A remains untouched.

    BOUND_LOGGED_OUT --> REJECTED_BOUND: Device B Login Attempt
    note right of REJECTED_BOUND: HTTP 403: "This account is registered to another device. Contact support for a device reset."

    BOUND_LOGGED_OUT --> UNBOUND: Admin Device Reset
    BOUND_ACTIVE --> UNBOUND: Admin Device Reset
    note right of UNBOUND: All sessions revoked.\nAudit log recorded.

    UNBOUND --> BOUND_ACTIVE_B: Device B Login
    note right of BOUND_ACTIVE_B: Device B now bound as new primary device.
```

---

## 6. Concurrency & Simultaneous Login Race Protection

When two devices attempt simultaneous first-time logins on an unbound account:
1. In MongoDB Atlas, atomic condition updates guarantee that only the first write transitions `bindingStatus` from `UNBOUND` to `BOUND`.
2. The losing concurrent request fails the condition, reads the newly committed binding, and is immediately rejected with `ACCOUNT_ACTIVE_ANOTHER_DEVICE`.
3. In in-memory development stores, the synchronous event-loop check and assignment before asynchronous dispatch prevents race conditions.

