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
import { CharacterModal } from "./components/CharacterModal";
import {
  useHexData,
  useQuests,
  useInitiative,
  useQuestFindings,
  useCharacters,
  setHexTerrain,
  setHexChallengeTier,
  setHexLandmark,
  createQuest,
  updateQuest,
  deleteQuest,
  joinQuest,
  leaveQuest,
  addInitiativeEntry,
  clearInitiativeTracker,
} from "./hooks/useFirebase";
import { useAdminMode } from "./hooks/useAdminMode";
import { useIsMobile } from "./hooks/useIsMobile";
import type { GeneratedEncounter } from "./data/bestiary";
import type { ChallengeTier, Landmark, Quest, TerrainType } from "./types";
import "./index.css";

type TopPage = "guild" | "about";
type GuildSub =
  | "map"
  | "active-quests"
  | "bounties"
  | "shop"
  | "initiative";
type AboutSub = "system" | "world" | "characters";

// Read ?tab=<sub> on first load so Discord (or any other deep link) can
// route the user straight to a specific page. Recognized values match
// GuildSub keys.
function initialGuildSubFromUrl(): GuildSub {
  if (typeof window === "undefined") return "map";
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  if (
    tab === "map" ||
    tab === "active-quests" ||
    tab === "bounties" ||
    tab === "shop" ||
    tab === "initiative"
  ) {
    return tab;
  }
  return "map";
}

function App() {
  const [topPage, setTopPage] = useState<TopPage>("guild");
  const [guildSub, setGuildSub] = useState<GuildSub>(initialGuildSubFromUrl);
  const [aboutSub, setAboutSub] = useState<AboutSub>("system");
  const hexes = useHexData();
  const quests = useQuests();
  const initiativeEntries = useInitiative();
  const questFindings = useQuestFindings();
  const characters = useCharacters();
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const isMobile = useIsMobile();
  const [sidePanelOpen, setSidePanelOpen] = useState(!isMobile);

  // Selection
  const [selectedHex, setSelectedHex] = useState<{
    col: number;
    row: number;
  } | null>(null);

  // Admin
  const { isAdmin, adminPin, showPinModal, promptPin, verifyPin, closePinModal, logout } =
    useAdminMode();
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType | null>(
    null
  );
  const [selectedTier, setSelectedTier] = useState<ChallengeTier | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<
    Landmark | null | "clear"
  >(null);

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
      if (isAdmin && adminPin && selectedTerrain) {
        setHexTerrain(adminPin, col, row, selectedTerrain).catch((err) => {
          console.error("setHexTerrain failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      if (isAdmin && adminPin && selectedTier != null) {
        setHexChallengeTier(adminPin, col, row, selectedTier).catch((err) => {
          console.error("setHexChallengeTier failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      if (isAdmin && adminPin && selectedLandmark != null) {
        const value = selectedLandmark === "clear" ? null : selectedLandmark;
        setHexLandmark(adminPin, col, row, value).catch((err) => {
          console.error("setHexLandmark failed:", err);
          alert(`Admin write rejected: ${err.message}`);
        });
        return;
      }
      setSelectedHex((prev) =>
        prev?.col === col && prev?.row === row ? null : { col, row }
      );
      // Selecting a hex auto-opens the (possibly collapsed) info panel.
      setSidePanelOpen(true);
    },
    [isAdmin, adminPin, selectedTerrain, selectedTier, selectedLandmark]
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

  const handleDeleteQuest = useCallback(
    (questId: string) => {
      if (!adminPin) return;
      deleteQuest(adminPin, questId).catch((err) => {
        console.error("deleteQuest failed:", err);
        alert(`Admin write rejected: ${err.message}`);
      });
    },
    [adminPin]
  );

  const handleQuestSave = useCallback(
    (questData: Omit<Quest, "id">) => {
      if (!adminPin) return;
      const op = questEditor.quest
        ? updateQuest(adminPin, questEditor.quest.id, questData)
        : createQuest(adminPin, questData);
      op.catch((err) => {
        console.error("quest save failed:", err);
        alert(`Admin write rejected: ${err.message}`);
      });
      setQuestEditor({ isOpen: false, hexCol: 0, hexRow: 0 });
    },
    [adminPin, questEditor.quest]
  );

  const handleRunEncounter = useCallback(async (encounter: GeneratedEncounter) => {
    if (!adminPin) return;
    try {
      await clearInitiativeTracker(adminPin);
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
  }, [adminPin]);

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
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0f0f1a",
        overflow: "hidden",
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
          selectedLandmark={selectedLandmark}
          onSelectLandmark={setSelectedLandmark}
          onLogout={logout}
        />
      )}

      {/* Page Content */}
      {topPage === "guild" && guildSub === "map" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            minHeight: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              flex: "1 1 0",
              position: "relative",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <HexGrid
              hexes={hexes}
              quests={quests}
              selectedHex={selectedHex}
              onHexSelect={handleHexSelect}
              isErasing={isAdmin && selectedTerrain === "unknown"}
            />
            <Legend isMobile={isMobile} sidePanelOpen={sidePanelOpen} />

            {/* Reopen tab when the side panel is collapsed */}
            {!sidePanelOpen && (
              <button
                onClick={() => setSidePanelOpen(true)}
                title="Show info panel"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: 0,
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 64,
                  borderRadius: "8px 0 0 8px",
                  background: "#1e1e36",
                  border: "1px solid #2e2e4a",
                  borderRight: "none",
                  color: "#9ca3af",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 90,
                }}
              >
                &#9664;
              </button>
            )}
          </div>

          <SidePanel
            selectedHex={selectedHex}
            hexData={selectedHexData}
            quests={quests}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
            onAddQuest={handleAddQuest}
            onRunEncounter={isAdmin ? handleRunEncounter : undefined}
            isMobile={isMobile}
            isOpen={sidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
          />
        </div>
      ) : topPage === "guild" && guildSub === "active-quests" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <ActiveQuests
            quests={quests}
            hexes={hexes}
            findings={questFindings}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            onJoinQuest={handleJoinQuest}
            onLeaveQuest={handleLeaveQuest}
            onEditQuest={handleEditQuest}
            onDeleteQuest={handleDeleteQuest}
            onSetPlayerName={() => setShowNameModal(true)}
          />
        </div>
      ) : topPage === "guild" && guildSub === "bounties" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <BountyBoard />
        </div>
      ) : topPage === "guild" && guildSub === "shop" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <Shop isAdmin={isAdmin} adminPin={adminPin} />
        </div>
      ) : topPage === "guild" && guildSub === "initiative" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <InitiativeTracker
            entries={initiativeEntries}
            playerName={playerName}
            isAdmin={isAdmin}
            adminPin={adminPin}
            characters={characters}
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

      {/* Global admin lock — visible on every page until logged in */}
      {!isAdmin && (
        <button
          onClick={promptPin}
          title="Admin Login"
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            width: 44,
            height: 44,
            borderRadius: 8,
            background: "#1e1e36",
            border: "1px solid #2e2e4a",
            color: "#6b7280",
            fontSize: 20,
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

      {/* Global character editor — visible on every page */}
      <button
        onClick={() => {
          if (!playerName) {
            setShowNameModal(true);
            return;
          }
          setShowCharacterModal(true);
        }}
        title={
          playerName
            ? `Edit character (${playerName})`
            : "Set player name first"
        }
        style={{
          position: "fixed",
          bottom: 16,
          left: isAdmin ? 16 : 68,
          width: 44,
          height: 44,
          borderRadius: 8,
          background: "#1e1e36",
          border: "1px solid #2e2e4a",
          color: "#9ca3af",
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
      >
        &#128100;
      </button>

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

      {showCharacterModal && playerName && (
        <CharacterModal
          currentName={playerName}
          character={characters.get(playerName)}
          onClose={() => setShowCharacterModal(false)}
          onSaved={(newName) => {
            localStorage.setItem("hexmap_player_name", newName);
            setPlayerName(newName);
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
