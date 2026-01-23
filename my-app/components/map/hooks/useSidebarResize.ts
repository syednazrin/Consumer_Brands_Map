import { useEffect, useRef } from 'react';

export function useSidebarResize() {
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const resizeHandle = resizeHandleRef.current;
    
    if (!sidebar || !resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;
      sidebar.classList.add('select-none', 'transition-none');
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Calculate new width (resize from left edge, so subtract the difference)
      const deltaX = startX - e.clientX;
      const newWidth = startWidth + deltaX;

      // Apply constraints
      const minWidth = 300;
      const maxWidth = 800;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      sidebar.style.width = `${constrainedWidth}px`;
    };

    const handleMouseUp = () => {
      if (isResizing) {
        isResizing = false;
        sidebar.classList.remove('select-none', 'transition-none');
        document.body.style.cursor = '';
      }
    };

    resizeHandle.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizeHandle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { sidebarRef, resizeHandleRef };
}
