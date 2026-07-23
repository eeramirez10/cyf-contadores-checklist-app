"use client";

import { useCallback, useMemo, useState } from "react";

const DESKTOP_WIDTH = 1024;

export const useAdminSidebar = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const toggleMainSidebar = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen((value) => !value);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const handleToggleForViewport = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= DESKTOP_WIDTH) {
      toggleMainSidebar();
      return;
    }
    toggleMobileSidebar();
  }, [toggleMainSidebar, toggleMobileSidebar]);

  const expandedOnDesktop = useMemo(
    () => isExpanded || isHovered,
    [isExpanded, isHovered],
  );

  return {
    isExpanded,
    isHovered,
    isMobileOpen,
    expandedOnDesktop,
    setIsHovered,
    toggleMainSidebar,
    toggleMobileSidebar,
    closeMobileSidebar,
    handleToggleForViewport,
  };
};

