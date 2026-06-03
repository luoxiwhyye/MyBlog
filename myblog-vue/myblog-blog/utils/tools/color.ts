interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const clamp = (value: number) => {
  return Math.min(255, Math.max(0, Math.round(value)));
};

const normalizeHex = (input: string) => {
  const hex = input.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
    throw new Error("请输入合法的 HEX 颜色值，例如 #409EFF。");
  }

  if (hex.length === 3) {
    return hex
      .split("")
      .map((segment) => `${segment}${segment}`)
      .join("")
      .toUpperCase();
  }

  return hex.toUpperCase();
};

const parseRgb = (input: string): RgbColor => {
  const matched = input
    .trim()
    .match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);

  if (!matched) {
    throw new Error("请输入合法的 RGB 颜色值，例如 rgb(64, 158, 255)。");
  }

  const [, red, green, blue] = matched;
  return {
    r: clamp(Number.parseInt(red ?? "0", 10)),
    g: clamp(Number.parseInt(green ?? "0", 10)),
    b: clamp(Number.parseInt(blue ?? "0", 10)),
  };
};

const rgbToHex = ({ r, g, b }: RgbColor) => {
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
};

const hexToRgb = (input: string): RgbColor => {
  const normalized = normalizeHex(input);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHsl = ({ r, g, b }: RgbColor) => {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        hue = (blue - red) / delta + 2;
        break;
      default:
        hue = (red - green) / delta + 4;
        break;
    }

    hue /= 6;
  }

  return `hsl(${Math.round(hue * 360)}, ${Math.round(saturation * 100)}%, ${Math.round(
    lightness * 100,
  )}%)`;
};

export const convertColorValue = (input: string, mode: string) => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("请输入颜色值。");
  }

  const resolvedMode =
    mode === "auto"
      ? trimmed.startsWith("#")
        ? "hex-to-rgb"
        : "rgb-to-hex"
      : mode;
  const rgbColor =
    resolvedMode === "hex-to-rgb" ? hexToRgb(trimmed) : parseRgb(trimmed);
  const hex = rgbToHex(rgbColor);
  const rgb = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;

  return {
    swatch: hex,
    output: resolvedMode === "hex-to-rgb" ? rgb : hex,
    variants: [
      { label: "HEX", value: hex },
      { label: "RGB", value: rgb },
      { label: "HSL", value: rgbToHsl(rgbColor) },
    ],
  };
};

export const describePickedColor = (input: string, format: string) => {
  const rgbColor = hexToRgb(input);
  const hex = rgbToHex(rgbColor);
  const rgb = `rgb(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b})`;
  const hsl = rgbToHsl(rgbColor);
  const outputMap: Record<string, string> = {
    hex,
    rgb,
    hsl,
  };

  return {
    swatch: hex,
    output: outputMap[format] ?? hex,
    variants: [
      { label: "HEX", value: hex },
      { label: "RGB", value: rgb },
      { label: "HSL", value: hsl },
    ],
  };
};
