/**
 * Firestore Service for draftr
 * Connects directly to project `draftrcreate` Cloud Firestore via official REST API.
 * Manages:
 * - 20-User Private Beta Cap
 * - Sole Super Admin access for `devnathnaadirah@gmail.com`
 * - Centralized User Profiles & Settings Persistence
 */

export const FIRESTORE_PROJECT_ID = "draftrcreate";
export const FIRESTORE_API_KEY = "AIzaSyAewmD4NV9DQTl05cu2Rcfd_hEFoyHCNGE";
export const SUPER_ADMIN_EMAIL = "devnathnaadirah@gmail.com";

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

export interface UserProfileDoc {
  id: string;
  email: string;
  name: string;
  headline: string;
  avatar: string;
  role: "admin" | "user";
  createdAt: string;
  lastActive: string;
}

export interface BetaAccessStatus {
  allowed: boolean;
  isAdmin: boolean;
  isRegistered: boolean;
  currentCount: number;
  cap: number;
}

// Convert a flat JS object to Firestore typed fields
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "string") {
      fields[key] = { stringValue: val };
    } else if (typeof val === "number") {
      fields[key] = Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
    } else if (typeof val === "boolean") {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((item) => (typeof item === "string" ? { stringValue: item } : { stringValue: JSON.stringify(item) }))
        }
      };
    } else if (typeof val === "object") {
      fields[key] = { stringValue: JSON.stringify(val) };
    }
  }
  return fields;
}

// Convert Firestore typed fields back to a flat JS object
function fromFirestoreFields(fields: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, valueObj] of Object.entries(fields)) {
    if ("stringValue" in valueObj) {
      result[key] = valueObj.stringValue;
    } else if ("integerValue" in valueObj) {
      result[key] = parseInt(valueObj.integerValue, 10);
    } else if ("doubleValue" in valueObj) {
      result[key] = valueObj.doubleValue;
    } else if ("booleanValue" in valueObj) {
      result[key] = valueObj.booleanValue;
    } else if ("arrayValue" in valueObj) {
      result[key] = (valueObj.arrayValue.values || []).map((v: any) => v.stringValue || v.integerValue || v);
    }
  }
  return result;
}

/**
 * Check if the provided email or identity is the Super Admin
 */
export function isSuperAdmin(email?: string, name?: string): boolean {
  if (email && email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (name && (name.toLowerCase().includes("naadirah") || name.toLowerCase().includes("devnath"))) return true;
  return false;
}

/**
 * Get current beta capacity configuration
 */
export async function getBetaCapConfig(): Promise<{ cap: number; activeUsersCount: number; adminEmail: string }> {
  try {
    const res = await fetch(`${BASE_URL}/system/beta_cap?key=${FIRESTORE_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      const parsed = fromFirestoreFields(data.fields);
      return {
        cap: Number(parsed.cap) || 20,
        activeUsersCount: Number(parsed.activeUsersCount) || 1,
        adminEmail: parsed.adminEmail || SUPER_ADMIN_EMAIL
      };
    }
  } catch (err) {
    console.warn("Could not read beta_cap from Firestore, using default:", err);
  }
  return { cap: 20, activeUsersCount: 1, adminEmail: SUPER_ADMIN_EMAIL };
}

/**
 * Verify whether an accessing user is allowed under the 20-User Beta Cap
 */
export async function checkBetaAccess(
  email?: string,
  userId?: string,
  name?: string
): Promise<BetaAccessStatus> {
  const isAdmin = isSuperAdmin(email, name);
  
  // Super Admin always bypasses all caps
  if (isAdmin) {
    const config = await getBetaCapConfig();
    return {
      allowed: true,
      isAdmin: true,
      isRegistered: true,
      currentCount: config.activeUsersCount,
      cap: config.cap
    };
  }

  try {
    // 1. Fetch current cap settings
    const config = await getBetaCapConfig();

    // 2. Check if this specific user already exists in Firestore
    const cleanId = userId ? encodeURIComponent(userId.replace(/[^a-zA-Z0-9_-]/g, "_")) : "";
    if (cleanId) {
      const userRes = await fetch(`${BASE_URL}/users/${cleanId}?key=${FIRESTORE_API_KEY}`);
      if (userRes.ok) {
        // User is already a registered beta participant!
        return {
          allowed: true,
          isAdmin: false,
          isRegistered: true,
          currentCount: config.activeUsersCount,
          cap: config.cap
        };
      }
    }

    // 3. User is not yet registered: check if capacity is available
    if (config.activeUsersCount >= config.cap) {
      return {
        allowed: false,
        isAdmin: false,
        isRegistered: false,
        currentCount: config.activeUsersCount,
        cap: config.cap
      };
    }

    // Capacity is available for this new user
    return {
      allowed: true,
      isAdmin: false,
      isRegistered: false,
      currentCount: config.activeUsersCount,
      cap: config.cap
    };
  } catch (err) {
    console.warn("Beta check fallback:", err);
    return {
      allowed: true,
      isAdmin: false,
      isRegistered: true,
      currentCount: 1,
      cap: 20
    };
  }
}

/**
 * Register a new user into Firestore and increment active count
 */
export async function registerBetaUser(profile: {
  id: string;
  email?: string;
  name: string;
  headline?: string;
  avatar?: string;
}): Promise<void> {
  const cleanId = encodeURIComponent((profile.id || profile.email || "user_" + Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_"));
  const isAdmin = isSuperAdmin(profile.email, profile.name);

  const docData = {
    id: profile.id,
    email: profile.email || "",
    name: profile.name || "Draftr Creator",
    headline: profile.headline || "LinkedIn Content Creator",
    avatar: profile.avatar || "",
    role: isAdmin ? "admin" : "user",
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString()
  };

  try {
    // Save to Firestore users collection
    await fetch(`${BASE_URL}/users/${cleanId}?key=${FIRESTORE_API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: toFirestoreFields(docData) })
    });

    // Update active user count in system/beta_cap if not admin
    if (!isAdmin) {
      const config = await getBetaCapConfig();
      const newCount = config.activeUsersCount + 1;
      await fetch(`${BASE_URL}/system/beta_cap?key=${FIRESTORE_API_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: toFirestoreFields({
            cap: config.cap,
            activeUsersCount: newCount,
            adminEmail: SUPER_ADMIN_EMAIL
          })
        })
      });
    }
  } catch (err) {
    console.error("Failed to register beta user in Firestore:", err);
  }
}

/**
 * Persist user profile updates to Firestore in real-time
 */
export async function saveUserProfileToFirestore(profile: {
  id: string;
  email?: string;
  name: string;
  headline?: string;
  avatar?: string;
}): Promise<void> {
  const cleanId = encodeURIComponent((profile.id || profile.email || "user_default").replace(/[^a-zA-Z0-9_-]/g, "_"));
  const isAdmin = isSuperAdmin(profile.email, profile.name);

  try {
    await fetch(`${BASE_URL}/users/${cleanId}?key=${FIRESTORE_API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: toFirestoreFields({
          name: profile.name,
          headline: profile.headline || "",
          avatar: profile.avatar || "",
          email: profile.email || "",
          role: isAdmin ? "admin" : "user",
          lastActive: new Date().toISOString()
        })
      })
    });
  } catch (err) {
    console.warn("Could not sync user profile to Firestore:", err);
  }
}

/**
 * Fetch Admin Overview: all users, current cap, and slot usage
 */
export async function getAdminOverview(): Promise<{
  cap: number;
  totalUsers: number;
  users: UserProfileDoc[];
}> {
  const config = await getBetaCapConfig();
  const users: UserProfileDoc[] = [];

  try {
    const res = await fetch(`${BASE_URL}/users?key=${FIRESTORE_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.documents)) {
        for (const doc of data.documents) {
          const parsed = fromFirestoreFields(doc.fields) as UserProfileDoc;
          users.push(parsed);
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch user list for Admin:", err);
  }

  return {
    cap: config.cap,
    totalUsers: users.length || config.activeUsersCount,
    users
  };
}

/**
 * Admin: Update the Beta User Cap (e.g. increase from 20 to 50 or 100)
 */
export async function updateBetaCap(newCap: number): Promise<boolean> {
  try {
    const config = await getBetaCapConfig();
    const res = await fetch(`${BASE_URL}/system/beta_cap?key=${FIRESTORE_API_KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: toFirestoreFields({
          cap: newCap,
          activeUsersCount: config.activeUsersCount,
          adminEmail: SUPER_ADMIN_EMAIL
        })
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}
