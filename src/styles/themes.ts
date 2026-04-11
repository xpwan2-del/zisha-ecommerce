export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
    background: string;
    backgroundAlt: string;
    text: string;
    textMuted: string;
    border: string;
    card: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  designElements: {
    patterns: string[];
    decorations: string[];
  };
}

export const themes = {
  chinese: {
    name: "传统中国风",
    colors: {
      primary: "#1A237E",
      secondary: "#D4AF37",
      accent: "#5D3B6D",
      dark: "#1C1C1C",
      light: "#F9F5E9",
      background: "#F9F5E9",
      backgroundAlt: "#F0E6D2",
      text: "#1C1C1C",
      textMuted: "