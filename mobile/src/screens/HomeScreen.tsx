import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinModal } from "../components/PinModal";
import { startSync } from "../data/initiative";
import { Overlay } from "../native/Overlay";
import { CombatPanel } from "../overlay/CombatPanel";
import { useStore } from "../store";
import { colors } from "../theme";

// Same identity model as the web app's localStorage key.
const PLAYER_NAME_KEY = "hexmap_player_name";

export function HomeScreen() {
  const playerName = useStore((s) => s.playerName);
  const setPlayerName = useStore((s) => s.setPlayerName);
  const adminPin = useStore((s) => s.adminPin);
  const setAdminPin = useStore((s) => s.setAdminPin);
  const isAdmin = adminPin != null;

  const [nameDraft, setNameDraft] = useState("");
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);

  useEffect(() => {
    startSync();
    AsyncStorage.getItem(PLAYER_NAME_KEY).then((stored) => {
      if (stored) {
        setPlayerName(stored);
        setNameDraft(stored);
      }
    });
    if (Platform.OS === "android" && Platform.Version >= 33) {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }
  }, [setPlayerName]);

  const checkPermission = useCallback(() => {
    Overlay.hasOverlayPermission().then(setHasPermission);
  }, []);

  // The overlay-permission settings screen gives no result callback;
  // re-check whenever the app comes back to the foreground.
  useEffect(() => {
    checkPermission();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermission();
    });
    return () => sub.remove();
  }, [checkPermission]);

  function saveName() {
    const name = nameDraft.trim();
    if (!name) return;
    setPlayerName(name);
    AsyncStorage.setItem(PLAYER_NAME_KEY, name);
  }

  async function toggleOverlay() {
    if (overlayOn) {
      Overlay.stopOverlay();
      setOverlayOn(false);
      return;
    }
    const started = await Overlay.startOverlay();
    if (started) {
      setOverlayOn(true);
    } else {
      Overlay.requestOverlayPermission();
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Hexmap Combat Companion</Text>

      <View style={styles.settings}>
        <View style={styles.row}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Player name"
            placeholderTextColor={colors.textFaint}
            style={styles.nameInput}
            onSubmitEditing={saveName}
          />
          <Pressable onPress={saveName} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>
              {playerName === nameDraft.trim() && playerName
                ? "Saved"
                : "Save"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={() =>
              isAdmin ? setAdminPin(null) : setPinModalVisible(true)
            }
            style={[styles.gmButton, isAdmin && styles.gmButtonActive]}
          >
            <Text style={styles.gmButtonText}>
              {isAdmin ? "GM mode ON — tap to exit" : "Enter GM mode"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={toggleOverlay}
            style={[styles.overlayButton, overlayOn && styles.overlayButtonOn]}
          >
            <Text style={styles.overlayButtonText}>
              {overlayOn ? "Stop overlay" : "Start floating overlay"}
            </Text>
          </Pressable>
        </View>
        {hasPermission === false && (
          <Text style={styles.permissionNote}>
            Overlay permission not granted — starting the overlay opens Android
            settings. Enable "Display over other apps" for this app.
          </Text>
        )}
      </View>

      <View style={styles.trackerWrap}>
        <CombatPanel embedded />
      </View>

      <PinModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 48 },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  settings: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  nameInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  saveButtonText: { color: "#000", fontWeight: "600", fontSize: 13 },
  gmButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.purple,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: "center",
  },
  gmButtonActive: { backgroundColor: colors.indigoDark },
  gmButtonText: { color: colors.purple, fontWeight: "600", fontSize: 13 },
  overlayButton: {
    flex: 1,
    backgroundColor: colors.indigo,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
  },
  overlayButtonOn: { backgroundColor: colors.redDark },
  overlayButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  permissionNote: { color: colors.gold, fontSize: 12 },
  trackerWrap: { flex: 1, marginTop: 16 },
});
