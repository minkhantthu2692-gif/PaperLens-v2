import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { FocusModeContext } from './FocusModeContext';
import {
  persistFullWorkspaceEnabled,
  readFullWorkspaceEnabled,
} from '@/services/settings/fullWorkspace';

type NavigatorWithUserActivation = Navigator & {
  userActivation?: { isActive?: boolean };
};

// Browsers only grant fullscreen from a live user gesture. Opening a workspace
// from the library is such a gesture, but loading a workspace URL directly is
// not, so only ask for fullscreen when activation is actually available.
function hasUserActivation(): boolean {
  const activation = (navigator as NavigatorWithUserActivation).userActivation;
  return activation?.isActive ?? true;
}

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [fullWorkspaceEnabled, setFullWorkspaceEnabledState] = useState(readFullWorkspaceEnabled);
  const [fullscreenError, setFullscreenError] = useState(false);
  const activeWorkspaceRef = useRef<string | null>(null);

  const handleSetFocusMode = useCallback((enabled: boolean) => {
    setFullscreenError(false);
    setIsFocusMode(enabled);
    if (enabled) {
      const requestFullscreen = document.documentElement.requestFullscreen;
      if (typeof requestFullscreen !== 'function') {
        setFullscreenError(true);
        return;
      }
      void requestFullscreen.call(document.documentElement).catch(() => setFullscreenError(true));
      return;
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setFullscreenError(true));
    }
  }, []);

  useEffect(() => {
    if (!pathname.startsWith('/workspace/')) {
      activeWorkspaceRef.current = null;
      handleSetFocusMode(false);
      return;
    }
    if (activeWorkspaceRef.current === pathname) {
      return;
    }
    activeWorkspaceRef.current = pathname;
    if (fullWorkspaceEnabled) {
      // Honor the global preference with the same experience as the Focus
      // control: request browser fullscreen on the opening gesture, falling back
      // to the in-app mode when the browser blocks or lacks it.
      if (hasUserActivation()) {
        handleSetFocusMode(true);
      } else {
        setFullscreenError(false);
        setIsFocusMode(true);
      }
      return;
    }
    handleSetFocusMode(false);
  }, [pathname, fullWorkspaceEnabled, handleSetFocusMode]);

  useEffect(() => {
    if (!isFocusMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !document.querySelector('dialog[open], [role="dialog"], [role="menu"]')
      ) {
        handleSetFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, handleSetFocusMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === document.documentElement;
      if (!active && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFocusMode]);

  const handleSetFullWorkspaceEnabled = useCallback((enabled: boolean) => {
    setFullWorkspaceEnabledState(enabled);
    persistFullWorkspaceEnabled(enabled);
  }, []);

  const clearFullscreenError = useCallback(() => setFullscreenError(false), []);

  const value = useMemo(
    () => ({
      isFocusMode,
      setFocusMode: handleSetFocusMode,
      fullWorkspaceEnabled,
      setFullWorkspaceEnabled: handleSetFullWorkspaceEnabled,
      fullscreenError,
      clearFullscreenError,
    }),
    [
      isFocusMode,
      handleSetFocusMode,
      fullWorkspaceEnabled,
      handleSetFullWorkspaceEnabled,
      fullscreenError,
      clearFullscreenError,
    ],
  );
  return <FocusModeContext.Provider value={value}>{children}</FocusModeContext.Provider>;
}
