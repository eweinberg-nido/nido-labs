// =========================================================================================
// Firebase Configuration for Nidoships Portal
// =========================================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyB-RWL3eCPfwQxCyVpoeiSA3Gq-CsmyK50",
  authDomain: "nidoships.firebaseapp.com",
  projectId: "nidoships",
  storageBucket: "nidoships.firebasestorage.app",
  messagingSenderId: "981522315968",
  appId: "1:981522315968:web:5edac7fda1a3a429040b25"
};

// Robust parser that handles JSON, JS objects, const statements, etc.
export function parseFirebaseConfigText(rawInput) {
  if (!rawInput || typeof rawInput !== "string") return null;
  let clean = rawInput.trim();
  
  // 1. Try strict JSON parse first
  try {
    const obj = JSON.parse(clean);
    if (obj && (obj.apiKey || obj.projectId)) return obj;
  } catch (e) {}

  // 2. Remove "const firebaseConfig =" or "var firebaseConfig =" or export
  clean = clean.replace(/^(export\s+)?(const|var|let)\s+firebaseConfig\s*=\s*/i, "");
  clean = clean.replace(/;\s*$/, "").trim();

  // 3. Try safe JavaScript evaluator
  try {
    const fn = new Function("return (" + clean + ");");
    const res = fn();
    if (res && (res.apiKey || res.projectId)) return res;
  } catch (e) {}

  // 4. Regex fallback extraction
  const extractKey = (keyName) => {
    const match = rawInput.match(new RegExp('["\']?' + keyName + '["\']?\\s*:\\s*["\']([^"\'\\n,]+)["\']', "i"));
    return match ? match[1].trim() : "";
  };

  const config = {
    apiKey: extractKey("apiKey"),
    authDomain: extractKey("authDomain"),
    projectId: extractKey("projectId"),
    storageBucket: extractKey("storageBucket"),
    messagingSenderId: extractKey("messagingSenderId"),
    appId: extractKey("appId")
  };

  if (config.apiKey && config.projectId) return config;
  return null;
}

// Check if credentials have been populated
export function isFirebaseConfigured(config = firebaseConfig) {
  return Boolean(
    config &&
    config.apiKey &&
    config.apiKey.length > 5 &&
    config.projectId &&
    config.projectId.length > 2
  );
}

// Get active config (checks localStorage override first, then default config object)
export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('nidoships_firebase_config');
    if (saved) {
      const parsed = parseFirebaseConfigText(saved);
      if (isFirebaseConfigured(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved Firebase config:', e);
  }
  return firebaseConfig;
}

export function saveFirebaseConfig(newConfig) {
  try {
    const configObj = typeof newConfig === 'string' ? parseFirebaseConfigText(newConfig) : newConfig;
    if (!configObj) return false;
    localStorage.setItem('nidoships_firebase_config', JSON.stringify(configObj));
    return true;
  } catch (e) {
    console.error('Error saving Firebase config:', e);
    return false;
  }
}

export function clearFirebaseConfig() {
  try {
    localStorage.removeItem('nidoships_firebase_config');
  } catch (e) {
    console.error('Error clearing Firebase config:', e);
  }
}
