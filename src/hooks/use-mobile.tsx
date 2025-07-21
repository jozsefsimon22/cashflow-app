
import * as React from "react"

const MOBILE_BREAKPOINT = 768

const getSnapshot = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT
}

const getServerSnapshot = () => {
    return false;
}

const subscribe = (callback: () => void) => {
    window.addEventListener("resize", callback)
    return () => {
      window.removeEventListener("resize", callback)
    }
}

export function useIsMobile() {
    return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
