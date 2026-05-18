import { useState, useCallback } from "react";

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN ?? "1234";

export function useAdminMode() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const promptPin = useCallback(() => {
    setShowPinModal(true);
  }, []);

  const verifyPin = useCallback((pin: string): boolean => {
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
      setShowPinModal(false);
      return true;
    }
    return false;
  }, []);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
  }, []);

  const logout = useCallback(() => {
    setIsAdmin(false);
  }, []);

  return { isAdmin, showPinModal, promptPin, verifyPin, closePinModal, logout };
}
