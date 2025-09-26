import * as React from "react"

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    // Check on mount (client-side only)
    const checkDevice = () => setIsMobile(window.innerWidth < 768);
    checkDevice();

    // Add resize listener
    window.addEventListener("resize", checkDevice);

    // Cleanup listener on component unmount
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return isMobile;
}
