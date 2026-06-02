let envLoaded = false;

export async function loadEnv() {
  if (envLoaded) return;
  try {
    // Dynamically import node modules to prevent bundling/load-time errors in non-Node environments (like workerd or browser)
    const fs = await import("node:fs");
    const path = await import("node:path");

    const envPaths = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "dev-server", ".env"),
      path.resolve(process.cwd(), "..", ".env"),
    ];
    
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;
          const index = trimmed.indexOf("=");
          if (index > 0) {
            const key = trimmed.substring(0, index).trim();
            let val = trimmed.substring(index + 1).trim();
            // strip inline comments
            const commentIndex = val.indexOf("//");
            if (commentIndex >= 0) {
              val = val.substring(0, commentIndex).trim();
            }
            // strip surrounding quotes if any
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            // Populate process.env if not already defined (or overwrite if empty/placeholder)
            if (!process.env[key] || process.env[key].includes("placeholder") || process.env[key] === "") {
              process.env[key] = val;
            }
          }
        });
        console.log(`[Env Loader] Loaded environment variables from ${envPath}`);
        envLoaded = true;
        break;
      }
    }
  } catch (err) {
    console.error("[Env Loader] Failed to load env file programmatically:", err);
  }
}
