import { useState, useCallback, useMemo } from "react";
import { HexGrid } from "./components/HexGrid";
import { SidePanel } from "./components/SidePanel";
import { AdminToolbar } from "./components/AdminToolbar";
import { AdminPinModal } from "./components/AdminPinModal";
import { PlayerNameModal } from "./components/PlayerNameModal";
import { QuestEditor } from "./components/QuestEditor";
import { Legend } from "./components/Legend";
import { BountyBoard } from "./components/BountyBoard";
import { ActiveQuests } from "./components/ActiveQuests";
import {
  useHexData,
  useQuests,
  setHexTerrain,
  setHexChallengeTier,
  createQuest,
  updateQuest,
  deleteQuest,
  joinQuest,
  leaveQuest,
} from "./hooks/useFirebase";
import { useAdminMode } from "./hooks/useAdminMode";
import { hexNeighbors } from "./utils/hexMath";
import type { ChallengeTier, Quest, TerrainType } from "./types";
import "./index.css";

type Page = "map" | "bounties" | "active-quests";

function App() {
  const [page, setPage] = useState<Page>("map");
  const hexes = useHexData();
  const quests = useQuests();

  // Compute exploration hexes: unknown/unmapped hexes adjacent to known terrain
  const explorationHexes = useMemo(() => {
    const set = new Set<string>();
    for (const hex of hexes.values()) {
      if (hex.terrain === "unknown") continue;
      for (const neighbor of hexNeighbors(hex.col, hex.row)) {
        const nKey = `${neighbor.col}_${neighbor.row}`;
        const neighborHex = hexes.get(nKey);
        if (!neighborHex || neighborHex.terrain === "unknown") {
          set.add(nKey);
        }
      }
    }
    return set;
  }, [hexes]);

  // Build virtual exploration quests for the side panel
  const allQuests = useMemo(() => {
    const virtualQuests: Quest[] = [];
    for (const key of explorationHexes) {
      const [colStr, rowStr] = key.split("_");
      const col = Number(colStr);
      const row = Number(rowStr);
      const hasRealQuest = quests.some(
        (q) => q.hexCol === col && q.hexRow === row && q.status !== "completed"
      );
      if (!hasRealQuest) {
        virtualQuests.push({
          id: `explore-${key}`,
          title: "Explore Unknown Territory",
          description: "Venture into uncharted lands and report your findings.",
          reward: "50gp",
          level: "explore",
          status: "available",
          hexCol: col,
          hexRow: row,
          players: [],
        });
      }
    }
    return [...quests, ...virtualQuests];
  }, [quests, explorationHexes]);

  // Selection
  const [selectedHex, setSelectedHex] = useState<{
    col: number;
    row: number;
  } | null>(null);

  // Admin
  const { isAdmin, showPinModal, promptPin, verifyPin, closePinModal, logout } =
    useAdminMode();
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType | null>(
    null
  );
  const [selectedTier, setSelectedTier] = useState<ChallengeTier | null>(null);

  // Player
  const [playerName, setPlayerName] = useState<string | null>(() =>
    localStorage.getItem("hexmap_player_name")
  );
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingJoinQuestId, setPendingJoinQuestId] = useState<string | null>(
    null
  );

  // Quest editor
  const [questEditor, setQuestEditor] = useState<{
    isOpen: boolean;
    quest?: Quest;
    hexCol: number;
    hexRow: number;
  }>({ isOpen: false, hexCol: 0, hexRow: 0 });

  const handleHexSelect = useCallback(
    (col: number, row: number) => {
      if (isAdmin && selectedTerrain) {
        setHexTerrain(col, row, selectedTerrain);
        return;
      }
      if (isAdmin && selectedTier) {
        setHexChallengeTier(col, row, selectedTier);
        return;
      }
      setSelectedHex((prev) =>
        prev?.col === col && prev?.row === row ? null : { col, row }
      );
    },
    [isAdmin, selectedTerrain, selectedTier]
  );

  const handleJoinQuest = useCallback(
    async (questId: string) => {
      if (!playerName) {
        setPendingJoinQuestId(questId);
        setShowNameModal(true);
        return;
      }
      if (questId.startsWith("explore-")) {
        const virtualQuest = allQuests.find((q) => q.id === questId);
        if (virtualQuest) {
          await createQuest({
            title: virtualQuest.title,
            description: virtualQuest.description,
            reward: virtualQuest.reward,
            level: virtualQuest.level,
            status: "in_progress",
            hexCol: virtualQuest.hexCol,
            hexRow: virtualQuest.hexRow,
            players: [playerName],
          });
        }
        return;
      }
      joinQuest(questId, playerName);
    },
    [playerName, allQuests]
  );

  const handleNameConfirm = useCallback(
    (name: string) => {
      localStorage.setItem("hexmap_player_name", name);
      setPlayerName(name);
      setShowNameModal(false);
      if (pendingJoinQuestId) {
        joinQuest(pendingJoinQuestId, name);
        setPendingJoinQuestId(null);
      }
    },
    [pendingJoinQuestId]
  );

  const handleLeaveQuest = useCallback(
    (questId: string) => {
      if (playerName) {
        leaveQuest(questId, playerName);
      }
    },
    [playerName]
  );

  const handleAddQuest = useCallback(() => {
    if (!selectedHex) return;
    setQuestEditor({
      isOpen: true,
      hexCol: selectedHex.col,
      hexRow: selectedHex.row,
    });
  }, [selectedHex]);

  const handleEditQuest = useCallback((quest: Quest) => {
    setQuestEditor({
      isOpen: true,
      quest,
      hexCol: quest.hexCol,
      hexRow: quest.hexRow,
    });
  }, []);

  const handleDeleteQuest = useCallback((questId: string) => {
    deleteQuest(questId);
  }, []);

  const handleQuestSave = useCallback(
    (questData: Omit<Quest, "id">) => {
      if (questEditor.quest) {
        updateQuest(questEditor.quest.id, questData);
      } else {
        createQuest(questData);
      }
      setQuestEditor({ isOpen: false, hexCol: 0, hexRow: 0 });
    },
    [questEditor.quest]
  );

  const selectedHexData = selectedHex
    ? hexes.get(`${selectedHex.col}_${selectedHex.row}`)
    : undefined;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f1a",
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "#12121f",
          borderBottom: "1px solid #2e2e4a",
          padding: "0 16px",
          height: 42,
          flexShrink: 0,
        }}
      >
        <NavTab label="Map" active={page === "map"} onClick={() => setPage("map")} />
        <NavTab label="Active Quests" active={page === "active-quests"} onClick={() => setPage("active-quests")} />
        <NavTab label="Bounty Board" active={page === "bounties"} onClick={() => setPage("bounties")} />
      </nav>

      {isAdmin && page === "map" && (
        <AdminToolbar
          selectedTerrain={selectedTerrain}
          onSelectTerrain={setSelectedTerrain}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          onLogout={logout}
        />
      )}

      {page === "map" ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <HexGrid
              hexes={hexes}
              quests={allQuests}
              explorationHexes={explorationHexes}
              selectedHex={selectedHex}
              onHexSelect={handleHexSelect}
            />
            <Legend />

            {!isAdmin && (
              <button
                onClick={promptPin}
                title="Admin Login"
                style={{
                  position: "fixed",
                  bottom: 16,
                  left: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#1e1e36",
                  border: "1px solid #2e2e4a",
                  color: "#6b7280",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 100,
                }}
              >
                &#128274;
              </button>
            )}
          </div>

          <SidePanel
            selectedHex={selectedHex}
            hexData={selectedHexData}
            quests={allQuests}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
            onAddQuest={handleAddQuest}
          />
        </div>
      ) : page === "active-quests" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <ActiveQuests
            quests={allQuests}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
          />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <BountyBoard />
        </div>
      )}

      {/* Modals */}
      {showPinModal && (
        <AdminPinModal onVerify={verifyPin} onClose={closePinModal} />
      )}

      {showNameModal && (
        <PlayerNameModal
          onConfirm={handleNameConfirm}
          onCancel={() => {
            setShowNameModal(false);
            setPendingJoinQuestId(null);
          }}
        />
      )}

      {questEditor.isOpen && (
        <QuestEditor
          quest={questEditor.quest}
          hexCol={questEditor.hexCol}
          hexRow={questEditor.hexRow}
          onSave={handleQuestSave}
          onCancel={() =>
            setQuestEditor({ isOpen: false, hexCol: 0, hexRow: 0 })
          }
        />
      )}
    </div>
  );
}

function NavTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: active ? "2px solid #4ade80" : "2px solid transparent",
        color: active ? "#e8e8f0" : "#6b7280",
        padding: "10px 20px",
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "'Cinzel', serif",
        letterSpacing: "0.5px",
      }}
    >
      {label}
    </button>
  );
}

export default App;
