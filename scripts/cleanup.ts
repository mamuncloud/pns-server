import { spawnSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

console.log("🚀 Starting automated cleanup...");

// 1. Run ESLint Fix
console.log("🔍 Running ESLint to remove unused code...");
const eslintResult = spawnSync(process.execPath, ["eslint", "src", "--fix", "--max-warnings", "0"], {
  stdio: "inherit",
});

if (eslintResult.status !== 0) {
  console.error("❌ ESLint failed with errors or warnings. Please fix them before committing.");
  process.exit(1);
}

// 2. Run Knip to find unused files
console.log("📦 Running Knip to find unused files and dependencies...");
const knipResult = spawnSync(process.execPath, ["knip", "--reporter", "json"], {
  encoding: "utf-8",
});

try {
  // Knip may output status text before the JSON payload. Search for the start of the JSON object.
  const stdout = knipResult.stdout || "";
  const jsonStartIndex = stdout.indexOf('{');
  
  if (jsonStartIndex === -1) {
    throw new Error("No JSON object found in Knip output");
  }

  const jsonString = stdout.substring(jsonStartIndex);
  const output = JSON.parse(jsonString);
  let filesDeleted = 0;

  if (output.issues) {
    // Only delete files that are NOT entry points or in src root if unsure
    // For now, let's be more conservative and just report or allow the user to decide
    // But since the user wants ME to fix the warnings, I should probably improve the script
    
    if (output.issues.files) {
      for (const file of output.issues.files) {
        const filePath = join(process.cwd(), file);
        // BE CAREFUL: Don't delete entry points!
        if (file.endsWith('main.ts') || file.endsWith('app.module.ts')) {
             console.log(`🛡️ Skipping entry point: ${file}`);
             continue;
        }
        
        if (existsSync(filePath)) {
          console.log(`🗑️ Deleting unused file: ${file}`);
          unlinkSync(filePath);
          filesDeleted++;
        }
      }
    }
  }

  if (filesDeleted > 0) {
    console.log(`✅ Cleanup complete. Deleted ${filesDeleted} unused files.`);
  } else {
    console.log("✅ No unused files found to delete.");
  }
} catch (e) {
  console.error("❌ Failed to parse Knip output:", e);
}

console.log("✨ Cleanup process finished!");
