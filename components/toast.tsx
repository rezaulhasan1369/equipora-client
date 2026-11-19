"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
const Context = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState(""),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(""), 4500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Context value={notify}>
      {children}
      {message && (
        <div
          className="toast toast-end toast-top"
          role="status"
          aria-live="polite"
        >
          <div className="alert alert-success">{message}</div>
        </div>
      )}
    </Context>
  );
}
export const useToast = () => useContext(Context);
