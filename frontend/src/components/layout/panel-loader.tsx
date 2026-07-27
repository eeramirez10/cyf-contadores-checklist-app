type PanelLoaderProps = {
  fullScreen?: boolean;
};

export function PanelLoader({ fullScreen = false }: PanelLoaderProps) {
  return (
    <main
      className={`${fullScreen ? "app-grid-bg min-h-screen" : "min-h-[42vh]"} flex items-center justify-center`}
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#c9e1ef] border-t-[#0b6f9f]"
        aria-label="Cargando"
      />
    </main>
  );
}
