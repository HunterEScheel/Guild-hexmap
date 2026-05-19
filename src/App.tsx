import { useState, useCallback } from "react";
import { HexGrid } from "./components/HexGrid";
import { SidePanel } from "./components/SidePanel";
import { AdminToolbar } from "./components/AdminToolbar";
import { AdminPinModal } from "./components/AdminPinModal";
import { PlayerNameModal } from "./components/PlayerNameModal";
import { QuestEditor } from "./components/QuestEditor";
import { Legend } from "./components/Legend";
import { BountyBoard } from "./components/BountyBoard";
import { DatePickerModal } from "./components/DatePickerModal";
import { About } from "./components/About";
import { Characters } from "./components/Characters";
import { Shop } from "./components/Shop";
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
import type { ChallengeTier, Quest, TerrainType } from "./types";
import "./index.css";

type Page = "map" | "bounties" | "active-quests" | "shop" | "characters" | "about";

function App() {
  const [page, setPage] = useState<Page>("map");
  const hexes = useHexData();
  const quests = useQuests();


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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDateQuestId, setPendingDateQuestId] = useState<string | null>(
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
      if (isAdmin && selectedTier != null) {
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
      const quest = quests.find((q) => q.id === questId);
      if (quest && quest.players.length === 0) {
        // First player — must pick a date
        setPendingDateQuestId(questId);
        setShowDatePicker(true);
        return;
      }
      joinQuest(questId, playerName);
    },
    [playerName, quests]
  );

  const handleDateConfirm = useCallback(
    async (date: string) => {
      setShowDatePicker(false);
      if (!playerName || !pendingDateQuestId) return;

      await joinQuest(pendingDateQuestId, playerName, date);
      setPendingDateQuestId(null);
    },
    [playerName, pendingDateQuestId, quests]
  );

  const handleNameConfirm = useCallback(
    (name: string) => {
      localStorage.setItem("hexmap_player_name", name);
      setPlayerName(name);
      setShowNameModal(false);
      if (pendingJoinQuestId) {
        // After name is set, re-trigger join which will check for date
        const quest = quests.find((q) => q.id === pendingJoinQuestId);
        if (quest && quest.players.length === 0) {
          setPendingDateQuestId(pendingJoinQuestId);
          setShowDatePicker(true);
        } else {
          joinQuest(pendingJoinQuestId, name);
        }
        setPendingJoinQuestId(null);
      }
    },
    [pendingJoinQuestId, quests]
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
        <NavTab
          label="Active Quests"
          active={page === "active-quests"}
          onClick={() => setPage("active-quests")}
          badge={quests.filter(
            (q) =>
              q.status === "in_progress" &&
              (!playerName || !q.players.includes(playerName))
          ).length}
        />
        <NavTab label="Bounty Board" active={page === "bounties"} onClick={() => setPage("bounties")} />
        <NavTab label="Shop" active={page === "shop"} onClick={() => setPage("shop")} />
        <NavTab label="Characters" active={page === "characters"} onClick={() => setPage("characters")} />
        <NavTab label="About" active={page === "about"} onClick={() => setPage("about")} />
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
              quests={quests}
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
            quests={quests}
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
            quests={quests}
            playerName={playerName}
            isAdmin={isAdmin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
          />
        </div>
      ) : page === "bounties" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <BountyBoard />
        </div>
      ) : page === "shop" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Shop isAdmin={isAdmin} />
        </div>
      ) : page === "characters" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Characters />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <About />
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

      {showDatePicker && (
        <DatePickerModal
          onConfirm={handleDateConfirm}
          onCancel={() => {
            setShowDatePicker(false);
            setPendingDateQuestId(null);
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
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
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
        position: "relative",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            background: "#ef4444",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            borderRadius: "50%",
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export default App;
