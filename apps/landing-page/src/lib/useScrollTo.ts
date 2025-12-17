import { useCallback } from 'react';

export function useScrollTo() {
  const scrollTo = useCallback((targetId: string) => {
    // Remove the # if present
    const id = targetId.replace('#', '');
    const element = document.getElementById(id);
    
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault();
      scrollTo(targetId);
    },
    [scrollTo]
  );

  return { scrollTo, handleClick };
}

// Standalone function for use outside of React components
export function scrollToSection(targetId: string) {
  const id = targetId.replace('#', '');
  const element = document.getElementById(id);
  
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}

