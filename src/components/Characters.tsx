export function Characters() {
    return (
        <div
            style={{
                maxWidth: 800,
                margin: "0 auto",
                padding: "32px 24px",
                color: "#e8e8f0",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
                lineHeight: 1.7,
            }}
        >
            <h1
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 28,
                    marginBottom: 24,
                    color: "#e8e8f0",
                }}
            >
                Characters
            </h1>

            <Section title="Character Creation">
                <ul>
                    <li>
                        All characters start at <strong>level 1</strong>.
                    </li>
                    <li>
                        <strong>Ability scores:</strong> roll <strong>4d6 drop lowest</strong> three times — those are 3 of your stats. The other 3 stats are
                        each derived by the mirror formula <strong>22 &minus; roll</strong>, pairing with one of your rolled values so each pair averages 11.
                        You then <strong>assign the 6 numbers to STR, DEX, CON, INT, WIS, CHA in whatever order you choose</strong>.
                    </li>
                    <li>
                        Use <strong>standard equipment</strong> from your class and background, plus <strong>10 gold</strong> starting money.
                    </li>
                    <li>
                        <strong>Official content only</strong> for all mechanical choices — races, classes, subclasses, spells, feats, and items must come from
                        published D&amp;D 5e sourcebooks (PHB, XGtE, TCoE, etc.).
                    </li>
                    <li>
                        You are free to <strong>reflavor</strong> anything you like. Rename spells, reskin your weapon's appearance, give your race a custom
                        origin story — as long as the <strong>mechanics stay unchanged</strong>, the flavor is yours.
                    </li>
                </ul>
            </Section>

            <Section title="Leveling Up">
                <p>
                    This campaign uses <strong>standard 5e XP thresholds</strong> for leveling. XP is earned from completing quests and encounters.
                </p>
                <XPTable />
            </Section>

            <Section title="Downtime">
                <p>
                    Between sessions, your character can spend each day doing <strong>one</strong> of the following:
                </p>
                <ul>
                    <li>
                        <strong>Train</strong> — work toward proficiency in a tool or language. It takes <strong>60 days</strong> to gain proficiency. Each day
                        you train with a professional counts for 2 days. Training with a professional costs <strong>1 gp per day</strong>. Self-taught training
                        is possible if materials are available, but takes twice as long. Downtime days do not need to be consecutive.
                    </li>
                    <li>
                        <strong>Shop</strong> — cost depends on what you buy. A list will be available after the first session.
                    </li>
                </ul>
            </Section>

            <Section title="Death and Replacements">
                <ul>
                    <li>
                        The Holdfast can cast <strong>Revivify</strong> on a body that is still in condition to be revived.
                    </li>
                    <li>
                        Replacement PCs start at <strong>level 1</strong> by default. This may change later.
                    </li>
                    <li>
                        <strong>Entering play:</strong> your new character walked into the Holdfast looking for work. It's a refugee town. Nobody asks
                        questions.
                    </li>
                </ul>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 32 }}>
            <h2
                style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    color: "#4ade80",
                    marginBottom: 12,
                }}
            >
                {title}
            </h2>
            {children}
        </div>
    );
}

function XPTable() {
    const levels: [number, string, string][] = [
        [1, "0", "+2"],
        [2, "300", "+2"],
        [3, "900", "+2"],
        [4, "2,700", "+2"],
        [5, "6,500", "+3"],
        [6, "14,000", "+3"],
        [7, "23,000", "+3"],
        [8, "34,000", "+3"],
        [9, "48,000", "+4"],
        [10, "64,000", "+4"],
        [11, "85,000", "+4"],
        [12, "100,000", "+4"],
        [13, "120,000", "+5"],
        [14, "140,000", "+5"],
        [15, "165,000", "+5"],
        [16, "195,000", "+5"],
        [17, "225,000", "+6"],
        [18, "265,000", "+6"],
        [19, "305,000", "+6"],
        [20, "355,000", "+6"],
    ];

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                    <tr>
                        {["Level", "XP Required", "Proficiency Bonus"].map((h) => (
                            <th key={h} style={thStyle}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {levels.map(([level, xp, prof]) => (
                        <tr key={level}>
                            <td style={{ ...tdStyle, color: "#e8e8f0", fontWeight: 600 }}>{level}</td>
                            <td style={{ ...tdStyle, color: "#fbbf24" }}>{xp}</td>
                            <td style={tdStyle}>{prof}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: "2px solid #2e2e4a",
    color: "#9ca3af",
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid #1e1e36",
    color: "#d1d5db",
};
