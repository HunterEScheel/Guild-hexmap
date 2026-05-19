import { useState, useEffect, useMemo } from "react";

const BOUNTY_FILE = "/bounties.md";

interface BountyRow {
  name: string;
  size: string;
  bounty: string;
}

type SortKey = "name" | "size" | "bounty";

const SIZE_ORDER = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];

// Converts a displayed bounty ("349 gp", "9 sp", "1 cp") into copper for sorting.
function bountyToCopper(text: string): number {
  const match = text.match(/^([\d,]+)\s*(gp|sp|cp)$/i);
  if (!match) return 0;
  const amount = parseInt(match[1].replace(/,/g, ""), 10);
  const unit = match[2].toLowerCase();
  return unit === "gp" ? amount * 100 : unit === "sp" ? amount * 10 : amount;
}

// Splits the bounty markdown into the lore before the creature table, the
// parsed table rows, and the lore after it.
function splitBountyTable(md: string): {
  before: string;
  rows: BountyRow[];
  after: string;
} {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const headerIdx = lines.findIndex(
    (l) => l.trim() === "| Creature | Size | Bounty |"
  );
  if (headerIdx === -1) return { before: md, rows: [], after: "" };

  let endIdx = headerIdx + 2;
  while (endIdx < lines.length && lines[endIdx].trim().startsWith("|")) {
    endIdx++;
  }

  const rows: BountyRow[] = lines
    .slice(headerIdx + 2, endIdx)
    .map((line) => {
      const cells = line
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      return { name: cells[0] ?? "", size: cells[1] ?? "", bounty: cells[2] ?? "" };
    })
    .filter((r) => r.name);

  return {
    before: lines.slice(0, headerIdx).join("\n"),
    rows,
    after: lines.slice(endIdx).join("\n"),
  };
}

export function BountyBoard() {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(BOUNTY_FILE)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.text();
      })
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => {
        setMarkdown("# Bounty Board\n\n*No bounties posted yet.*");
        setLoading(false);
      });
  }, []);

  const { before, rows, after } = useMemo(
    () => splitBountyTable(markdown),
    [markdown]
  );

  if (loading) {
    return (
      <div style={{ color: "#9ca3af", padding: 40, textAlign: "center" }}>
        Loading bounties...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 24px",
        color: "#e8e8f0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(before) }}
      />
      {rows.length > 0 && <BountyTable rows={rows} />}
      {after.trim() && (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(after) }}
        />
      )}
    </div>
  );
}

function BountyTable({ rows }: { rows: BountyRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? rows.filter((r) => r.name.toLowerCase().includes(query))
      : rows;

    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "size") {
        cmp = SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size);
      } else {
        cmp = bountyToCopper(a.bounty) - bountyToCopper(b.bounty);
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const arrow = (key: SortKey) =>
    key === sortKey ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search creatures..."
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#1e1e36",
          border: "1px solid #2e2e4a",
          borderRadius: 6,
          padding: "8px 12px",
          color: "#e8e8f0",
          fontSize: 14,
          marginBottom: 8,
        }}
      />
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 12 }}>
        {visible.length} of {rows.length} creatures
      </p>
      {visible.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          No creatures match your search.
        </p>
      ) : (
        <div className="markdown-body">
          <table>
            <thead>
              <tr>
                {(
                  [
                    ["name", "Creature"],
                    ["size", "Size"],
                    ["bounty", "Bounty"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={{
                      cursor: "pointer",
                      userSelect: "none",
                      color: key === sortKey ? "#e8e8f0" : "#c084fc",
                    }}
                  >
                    {label}
                    {arrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td>{r.size}</td>
                  <td>{r.bounty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function renderMarkdown(md: string): string {
  // Normalize line endings — Windows checkouts deliver CRLF, which would
  // otherwise break the line-anchored table and list patterns below.
  let html = md.replace(/\r\n?/g, "\n");

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Headers
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr />");

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Tables
  html = html.replace(
    /^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm,
    (_m, headerRow: string, _separator: string, bodyRows: string) => {
      const headers = headerRow
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th>${c.trim()}</th>`)
        .join("");
      const rows = bodyRows
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Ordered lists
  html = html.replace(/^((?:\d+\. .+\n?)+)/gm, (_m, block: string) => {
    const items = block
      .trim()
      .split("\n")
      .map((line: string) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Unordered lists
  html = html.replace(/^((?:[-*] .+\n?)+)/gm, (_m, block: string) => {
    const items = block
      .trim()
      .split("\n")
      .map((line: string) => `<li>${line.replace(/^[-*] /, "")}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Paragraphs (lines not already wrapped in tags)
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<hr")
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
