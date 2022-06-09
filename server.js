const express = require("express");
const path = require("path");

const app = express();

const CURRENT_WORKING_DIR = process.cwd();

app.use(express.static(path.join(CURRENT_WORKING_DIR, "public")));

app.listen("13337", () => console.log(`listening on http://localhost:13337`));
