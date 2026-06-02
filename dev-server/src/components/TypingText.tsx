import { useEffect, useState } from "react";

export function TypingText({ text, speed = 14 }: { text: string; speed?: number }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    setOut("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span>
      {out}
      <span className="inline-block w-[2px] h-4 bg-primary align-middle ml-0.5 animate-pulse" />
    </span>
  );
}
