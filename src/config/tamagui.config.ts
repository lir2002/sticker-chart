import { createTamagui, createTokens } from "tamagui";

const size = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  true: 16,
};

export const tokens = createTokens({
  size,
  space: { ...size },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    true: 100,
  },
  color: {
    primary: "#007AFF",
    background: "#FFFFFF",
    text: "#000000",
    secondary: "#5856D6",
    lightGray: "#F5F5F5",
    gray: "#666",
    overlay: "rgba(0,0,0,0.5)",
    border: "#CCCCCC",
    icon: "#000000",
    modalBackground: "#FFFFFF",
    selectedBackground: "#E0F0FF", // New color for selected items
    photoBackground: "#000000",
    verified: "#34C759",
    disabled: "#B0B0B0",
  },
});

const themes = {
  light: {
    background: tokens.color.background,
    text: tokens.color.text,
    primary: tokens.color.primary,
    secondary: tokens.color.secondary,
    lightGray: tokens.color.lightGray,
    gray: tokens.color.gray,
    overlay: tokens.color.overlay,
    border: tokens.color.border,
    icon: tokens.color.icon,
    modalBackground: tokens.color.modalBackground,
    selectedBackground: tokens.color.selectedBackground, // Light blue for light mode
    photoBackground: tokens.color.photoBackground,
    verified: tokens.color.verified,
    disabled: tokens.color.disabled,
  },
  dark: {
    background: "#1C1C1E",
    text: "#FFFFFF",
    primary: "#0A84FF",
    secondary: "#5E5CE6",
    lightGray: "#2C2C2E",
    gray: "#8E8E93",
    overlay: "rgba(255,255,255,0.2)",
    border: "#3A3A3C",
    icon: "#FFFFFF",
    modalBackground: "#2C2C2E",
    selectedBackground: "#3A3A3C", // Lighter gray for dark mode
    photoBackground: "#000000",
    verified: "#30D158",
    disabled: "#505050",
  },
  blue: {
    background: "#007AFF",
    color: "#FFFFFF",
    borderColor: "#005BB5",
  },
  gray: {
    background: "#8E8E93",
    color: "#FFFFFF",
    borderColor: "#6B6B70",
  },
};

const tamaguiConfig = createTamagui({
  tokens,
  themes,
  defaultTheme: "light", // Set default theme
  media: {
    sm: { maxWidth: 640 },
    md: { maxWidth: 768 },
    lg: { maxWidth: 1024 },
  },
  fonts: {
    heading: {
      family: "System",
      weight: {
        normal: "400",
        bold: "700",
      },
      size: {
        1: 12,
        2: 14,
        3: 16,
        4: 18,
        5: 24,
        true: 16,
      },
    },
    body: {
      family: "System",
      weight: {
        normal: "400",
        bold: "700",
      },
      size: {
        1: 12,
        2: 14,
        3: 16,
        4: 18,
        5: 24,
        true: 16,
      },
    },
  },
  shorthands: {
    p: "padding",
    px: "paddingHorizontal",
    py: "paddingVertical",
    m: "margin",
    mx: "marginHorizontal",
    my: "marginVertical",
    mb: "marginBottom",
    mt: "marginTop",
    ml: "marginLeft",
    mr: "marginRight",
    f: "flex",
    w: "width",
    h: "height",
    br: "borderRadius",
    bg: "backgroundColor",
    jc: "justifyContent",
    ai: "alignItems",
    ta: "textAlign",
  } as const,
});

export type Conf = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends Conf {}
}

export default tamaguiConfig;
