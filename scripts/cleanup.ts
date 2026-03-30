import { spawnSync } from "node:child_process";
import { unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

console.log("🚀 Starting automated cleanup for pns-server...");

// 1. Run ESLint Fix
console.log("🔍 Running ESLint to remove unused code...");
const eslintResult = spawnSync("bun", ["eslint", "src", "--fix", "--max-warnings", "0"], {
  stdio: "inherit",
});

if (eslintResult.status !== 0) {
  console.error("❌ ESLint failed with errors or warnings. Please fix them before committing.");
  process.exit(1);
}

// 2. Run Knip to find unused files
console.log("📦 Running Knip to find unused files and dependencies...");
const knipResult = spawnSync("bun", ["knip", "--reporter", "json"], {
  encoding: "utf-8",
});

try {
  const output = JSON.parse(knipResult.stdout);
  let filesDeleted = 0;

  if (output.issues) {
    if (output.issues.files) {
      for (const file of output.issues.files) {
        const filePath = join(process.cwd(), file);
        
        // Skip common NestJS entry points and special files
        if (
          file.endsWith('main.ts') || 
          file.endsWith('app.module.ts') ||
          file.includes('seed') ||
          file.includes('migrate')
        ) {
             console.log(`🛡️ Skipping entry point or special file: ${file}`);
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
  console.log("Knip output was:", knipResult.stdout);
}

console.log("✨ Cleanup process finished!");
