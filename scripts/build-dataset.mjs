import fs from "node:fs/promises";
import path from "node:path";
import iconv from "iconv-lite";

const projectRoot = path.resolve(process.cwd());
const txtDir = path.join(projectRoot, "txt");
const outDir = path.join(projectRoot, "public", "data");
const outFile = path.join(outDir, "articles.json");

async function main() {
  const entries = await fs.readdir(txtDir, { withFileTypes: true });
  const txtFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  const articles = [];

  for (const fileName of txtFiles) {
    const fullPath = path.join(txtDir, fileName);
    const bytes = await fs.readFile(fullPath);
    const decoded = iconv.decode(bytes, "cp1251");

    const normalized = decoded.replace(/\r\n?/g, "\n");
    const lines = normalized.split("\n");

    const headerCategory = extractHeaderValue(lines[0], "Категория");
    const headerAuthor = extractHeaderValue(lines[1], "Автор");
    const headerTitle = extractHeaderValue(lines[2], "Название");

    const categories = headerCategory
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const content = lines.slice(3).join("\n").trim();

    articles.push({
      id: path.basename(fileName, ".txt"),
      fileName,
      categories,
      author: headerAuthor,
      title: headerTitle,
      content
    });
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalArticles: articles.length,
        articles
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Готово: ${articles.length} статей -> ${outFile}`);
}

function extractHeaderValue(line, label) {
  if (!line) return "";
  const clean = line.trim();
  const prefix = `${label}:`;
  if (clean.startsWith(prefix)) {
    return clean.slice(prefix.length).trim();
  }
  const idx = clean.indexOf(":");
  if (idx === -1) return clean;
  return clean.slice(idx + 1).trim();
}

main().catch((error) => {
  console.error("Ошибка при сборке данных:", error);
  process.exitCode = 1;
});
