// types/pretext.d.ts
declare module "pretext" {
  import { ReactNode } from "react";

  interface PreTextProps {
    text: string;
    className?: string;
    style?: React.CSSProperties;
    splitBy?: "characters" | "words" | "lines";
    render?: (item: string, index: number) => ReactNode;
    children?: ReactNode;
  }

  export const PreText: React.FC<PreTextProps>;
}
