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
import { World } from "./components/World";
import { Shop } from "./components/Shop";
import { ActiveQuests } from "./components/ActiveQuests";
import { InitiativeTracker } from "./components/InitiativeTracker";
import {
  useHexData,
  useQuests,
  useInitiative,
  setHexTerrain,
  setHexChallengeTier,
  createQuest,
  updateQuest,
  deleteQuest,
  joinQuest,
  leaveQuest,
  addInitiativeEntry,
  clearInitiativeTracker,
} from "./hooks/useFirebase";
import { useAdminMode } from "./hooks/useAdminMode";
import type { GeneratedEncounter } from "./data/bestiary";
import type { ChallengeTier, Quest, TerrainType } from "./types";
import "./index.css";

type TopPage = "guild" | "about";
type GuildSub = "map" | "active-quests" | "bounties" | "shop" | "initiative";
type AboutSub = "system" | "world" | "characters";

function App() {
  const [topPage, setTopPage] = useState<TopPage>("guild");
  const [guildSub, setGuildSub] = useState<GuildSub>("map");
  const [aboutSub, setAboutSub] = useState<AboutSub>("system");
  const hexes = useHexData();
  const quests = useQuests();
  const initiativeEntries = useInitiative();

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

  const handleRunEncounter = useCallback(async (encounter: GeneratedEncounter) => {
    try {
      await clearInitiativeTracker();
      const entries: { name: string; initiative: number; isCreature: boolean; stats: { hp: number; ac: number; cr: number } }[] = [];
      for (const group of encounter.groups) {
        for (let i = 0; i < group.count; i++) {
          const roll = 1 + Math.floor(Math.random() * 20);
          const label = group.count > 1
            ? `${group.creature.name} ${i + 1}`
            : group.creature.name;
          entries.push({
            name: label,
            initiative: roll,
            isCreature: true,
            stats: {
              hp: group.creature.hitPoints,
              ac: group.creature.armorClass,
              cr: group.creature.challengeRating,
            },
          });
        }
      }
      await Promise.all(
        entries.map((e) => addInitiativeEntry(e.name, e.initiative, e.isCreature, e.stats))
      );
    } catch (err) {
      console.error("Failed to run encounter:", err);
    }
    setGuildSub("initiative");
  }, []);

  const selectedHexData = selectedHex
    ? hexes.get(`${selectedHex.col}_${selectedHex.row}`)
    : undefined;

  const questBadge = quests.filter(
    (q) =>
      q.status === "in_progress" &&
      (!playerName || !q.players.includes(playerName))
  ).length;

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
      {/* Top Navigation */}
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
        <NavTab
          label="Guild"
          active={topPage === "guild"}
          onClick={() => setTopPage("guild")}
          badge={topPage !== "guild" ? questBadge : undefined}
        />
        <NavTab
          label="About"
          active={topPage === "about"}
          onClick={() => setTopPage("about")}
        />
      </nav>

      {/* Sub Navigation */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "#0f0f1a",
          borderBottom: "1px solid #1e1e36",
          padding: "0 16px",
          height: 36,
          flexShrink: 0,
        }}
      >
        {topPage === "guild" ? (
          <>
            <SubTab label="Map" active={guildSub === "map"} onClick={() => setGuildSub("map")} />
            <SubTab
              label="Active Quests"
              active={guildSub === "active-quests"}
              onClick={() => setGuildSub("active-quests")}
              badge={questBadge}
            />
            <SubTab label="Bounty Board" active={guildSub === "bounties"} onClick={() => setGuildSub("bounties")} />
            <SubTab label="Shop" active={guildSub === "shop"} onClick={() => setGuildSub("shop")} />
            <SubTab label="Initiative" active={guildSub === "initiative"} onClick={() => setGuildSub("initiative")} />
          </>
        ) : (
          <>
            <SubTab label="The System" active={aboutSub === "system"} onClick={() => setAboutSub("system")} />
            <SubTab label="The World" active={aboutSub === "world"} onClick={() => setAboutSub("world")} />
            <SubTab label="Character Creation" active={aboutSub === "characters"} onClick={() => setAboutSub("characters")} />
          </>
        )}
      </nav>

      {isAdmin && topPage === "guild" && guildSub === "map" && (
        <AdminToolbar
          selectedTerrain={selectedTerrain}
          onSelectTerrain={setSelectedTerrain}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          onLogout={logout}
        />
      )}

      {/* Page Content */}
      {topPage === "guild" && guildSub === "map" ? (
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <HexGrid
              hexes={hexes}
              quests={quests}
              selectedHex={selectedHex}
              onHexSelect={handleHexSelect}
              isErasing={isAdmin && selectedTerrain === "unknown"}
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
            onRunEncounter={isAdmin ? handleRunEncounter : undefined}
          />
        </div>
      ) : topPage === "guild" && guildSub === "active-quests" ? (
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
      ) : topPage === "guild" && guildSub === "bounties" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <BountyBoard />
        </div>
      ) : topPage === "guild" && guildSub === "shop" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Shop isAdmin={isAdmin} />
        </div>
      ) : topPage === "guild" && guildSub === "initiative" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <InitiativeTracker
            entries={initiativeEntries}
            playerName={playerName}
            isAdmin={isAdmin}
          />
        </div>
      ) : topPage === "about" && aboutSub === "system" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <About />
        </div>
      ) : topPage === "about" && aboutSub === "world" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <World />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Characters />
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
        padding: "10px 24px",
        fontSize: 15,
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

function SubTab({
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
        borderBottom: active ? "2px solid #c084fc" : "2px solid transparent",
        color: active ? "#e8e8f0" : "#6b7280",
        padding: "7px 16px",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        letterSpacing: "0.3px",
        position: "relative",
      }}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            position: "absolute",
            top: 2,
            right: 2,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "'Segoe UI', sans-serif",
            borderRadius: "50%",
            width: 16,
            height: 16,
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
