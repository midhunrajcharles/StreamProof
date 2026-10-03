// Start `next dev` from inside web/ (Next 16 on Windows doubles an absolute
// project path when started from another working directory).
//   node web/tools/dev.cjs [port]      (default 3200)
const path = require("path");
const dir = path.resolve(__dirname, "..");
process.chdir(dir);
const next = path.join(dir, "node_modules", "next", "dist", "bin", "next");
process.argv = [process.argv[0], next, "dev", "-p", process.argv[2] || "3200"];
require(next);
