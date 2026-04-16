import fs from "node:fs";

fs.rmSync("_site", { recursive: true, force: true });
