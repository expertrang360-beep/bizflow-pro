import fs from "fs";

const distPath = path.join(__dirname, "dist");

console.log("DIST EXISTS:", fs.existsSync(distPath));
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, "dist")));

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "BizFlow Pro" });
});

app.get("/api/status", (req, res) => {
  res.json({ app: "BizFlow Pro" });
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
