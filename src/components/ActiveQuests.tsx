import { useMemo } from "react";
import { QuestCard } from "./QuestCard";
import { QuestFindings } from "./QuestFindings";
import type { HexData, Quest, QuestFinding } from "../types";

interface ActiveQuestsProps {
  quests: Quest[];
  hexes: Map<string, HexData>;
  findings: QuestFinding[];
  playerName: string | null;
  isAdmin: boolean;
  onJoinQuest: (questId: string) => void;
  onLeaveQuest: (questId: string) => void;
  onEditQuest: (quest: Quest) => void;
  onDeleteQuest: (questId: string) => void;
  onSetPlayerName: () => void;
}

export function ActiveQuests({
  quests,
  hexes,
  findings,
  playerName,
  isAdmin,
  onJoinQuest,
  onLeaveQuest,
  onEditQuest,
  onDeleteQuest,
  onSetPlayerName,
}: ActiveQuestsProps) {
  const { inProgress, recruiting, completed } = useMemo(() => {
    const inProgress: Quest[] = [];
    const recruiting: Quest[] = [];
    const completed: Quest[] = [];

    for (const quest of quests) {
      if (quest.status === "completed") {
        completed.push(quest);
      } else if (quest.status === "in_progress") {
        inProgress.push(quest);
      } else if (quest.players.length > 0) {
        recruiting.push(quest);
      }
    }

    return { inProgress, recruiting, completed };
  }, [quests]);

  const totalActive = inProgress.length + recruiting.length + completed.length;

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
      <h1
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 28,
          marginBottom: 8,
          color: "#e8e8f0",
        }}
      >
        Active Quests
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 32 }}>
        Quests that adventurers have signed up for or are underway.
      </p>

      {totalActive === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>No active quests yet.</p>
          <p style={{ fontSize: 13 }}>
            Visit the map and join a quest to see it here.
          </p>
        </div>
      ) : (
        <>
          <QuestSection
            title="In Progress"
            quests={inProgress}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            accentColor="#facc15"
          />
          <QuestSection
            title="Recruiting"
            quests={recruiting}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            accentColor="#60a5fa"
          />
          <QuestSection
            title="Completed"
            quests={completed}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoin={onJoinQuest}
            onLeave={onLeaveQuest}
            onEdit={onEditQuest}
            onDelete={onDeleteQuest}
            accentColor="#4ade80"
            renderExpandedExtras={(quest) => (
              <QuestFindings
                quest={quest}
                findings={findings.filter((f) => f.questId === quest.id)}
                hexes={hexes}
                allQuests={quests}
                playerName={playerName}
                isAdmin={isAdmin}
                onSetPlayerName={onSetPlayerName}
              />
            )}
          />
        </>
      )}
    </div>
  );
}

function QuestSection({
  title,
  quests,
  playerName,
  isAdmin,
  onJoin,
  onLeave,
  onEdit,
  onDelete,
  accentColor,
  renderExpandedExtras,
}: {
  title: string;
  quests: Quest[];
  playerName: string | null;
  isAdmin: boolean;
  onJoin: (questId: string) => void;
  onLeave: (questId: string) => void;
  onEdit: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  accentColor: string;
  renderExpandedExtras?: (quest: Quest) => React.ReactNode;
}) {
  if (quests.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: 18,
            margin: 0,
            color: accentColor,
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontSize: 12,
            color: "#6b7280",
            background: "#1e1e36",
            padding: "2px 10px",
            borderRadius: 10,
          }}
        >
          {quests.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quests.map((quest) => (
          <div key={quest.id}>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                marginBottom: 4,
                paddingLeft: 16,
              }}
            >
              {quest.endHexCol != null && quest.endHexRow != null
                ? `(${quest.hexCol}, ${quest.hexRow}) → (${quest.endHexCol}, ${quest.endHexRow})`
                : `Hex (${quest.hexCol}, ${quest.hexRow})`}
            </div>
            <QuestCard
              quest={quest}
              playerName={playerName}
              isAdmin={isAdmin}
              onJoin={onJoin}
              onLeave={onLeave}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedExtras={
                renderExpandedExtras ? renderExpandedExtras(quest) : undefined
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
