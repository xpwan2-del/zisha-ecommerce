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
    primaryRgb: string;
    accentRgb: string;
    borderRgb: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  designElements: {
    patterns: string[];
    decorations: string[];
  };
  components: {
    buttons: {
      primary: {
        default: {
          background: string;
          text: string;
          border: string;
          borderRadius: string;
          boxShadow: string;
        };
        hover: {
          background: string;
          text: string;
          border: string;
          transform: string;
          boxShadow: string;
        };
      };
      secondary: {
        default: {
          background: string;
          text: string;
          border: string;
          borderRadius: string;
        };
        hover: {
          background: string;
          text: string;
          border: string;
        };
      };
    };
    loading: {
      color: string;
      style: string;
    };
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
      textMuted: "#6B7280",
      border: "#E5E7EB",
      card: "#FFFFFF",
      primaryRgb: "26, 35, 126",
      accentRgb: "93, 59, 109",
      borderRgb: "229, 231, 235",
      colorRed: "#DC2626",
      colorGreen: "#16A34A",
      colorBlue: "#2563EB",
      colorYellow: "#EAB308",
      colorOrange: "#F97316",
    },
    fonts: {
      heading: "Cormorant, serif",
      body: "Inter, sans-serif",
    },
    designElements: {
      patterns: ["祥云", "龙纹", "青花瓷"],
      decorations: ["中国结", "书法", "传统图案"],
    },
    components: {
      buttons: {
        primary: {
          default: {
            background: "#1A237E",
            text: "#FFFFFF",
            border: "#D4AF37",
            borderRadius: "4px",
            boxShadow: "0 4px 14px rgba(26, 35, 126, 0.3)",
          },
          hover: {
            background: "#151E63",
            text: "#FFFFFF",
            border: "#E6C250",
            transform: "scale(1.05)",
            boxShadow: "0 6px 20px rgba(26, 35, 126, 0.4)",
          },
        },
        secondary: {
          default: {
            background: "transparent",
            text: "#1A237E",
            border: "2px solid #1A237E",
            borderRadius: "4px",
          },
          hover: {
            background: "#1A237E",
            text: "#FFFFFF",
            border: "2px solid #1A237E",
          },
        },
      },
      loading: {
        color: "#1A237E",
        style: "旋转动画，传统中国元素装饰",
      },
    },
  },
  middleEastern: {
    name: "中东高档风",
    colors: {
      primary: "#5D3B6D",
      secondary: "#D4AF37",
      accent: "#1E3A8A",
      dark: "#1F2937",
      light: "#F3F4F6",
      background: "#F3F4F6",
      backgroundAlt: "#E5E7EB",
      text: "#1F2937",
      textMuted: "#6B7280",
      border: "#D1D5DB",
      card: "#FFFFFF",
      primaryRgb: "93, 59, 109",
      accentRgb: "30, 58, 138",
      borderRgb: "209, 213, 219",
      colorRed: "#DC2626",
      colorGreen: "#16A34A",
      colorBlue: "#2563EB",
      colorYellow: "#EAB308",
      colorOrange: "#F97316",
    },
    fonts: {
      heading: "Cormorant, serif",
      body: "Inter, sans-serif",
    },
    designElements: {
      patterns: ["几何图案", "阿拉伯花纹", "奢华质感"],
      decorations: ["金色装饰", "几何边框", "异域风情"],
    },
    components: {
      buttons: {
        primary: {
          default: {
            background: "#5D3B6D",
            text: "#FFFFFF",
            border: "#D4AF37",
            borderRadius: "4px",
            boxShadow: "0 4px 14px rgba(93, 59, 109, 0.3)",
          },
          hover: {
            background: "#4A2C5A",
            text: "#FFFFFF",
            border: "#E6C250",
            transform: "scale(1.05)",
            boxShadow: "0 6px 20px rgba(93, 59, 109, 0.4)",
          },
        },
        secondary: {
          default: {
            background: "transparent",
            text: "#5D3B6D",
            border: "2px solid #5D3B6D",
            borderRadius: "4px",
          },
          hover: {
            background: "#5D3B6D",
            text: "#FFFFFF",
            border: "2px solid #5D3B6D",
          },
        },
      },
      loading: {
        color: "#5D3B6D",
        style: "旋转动画，几何图案装饰",
      },
    },
  },
  amazon: {
    name: "亚马逊风",
    colors: {
      primary: "#FF9900",
      secondary: "#007185",
      accent: "#374151",
      dark: "#111111",
      light: "#F5F5F5",
      background: "#FFFFFF",
      backgroundAlt: "#F5F5F5",
      text: "#111111",
      textMuted: "#6B7280",
      border: "#E5E7EB",
      card: "#FFFFFF",
      primaryRgb: "255, 153, 0",
      accentRgb: "55, 65, 81",
      borderRgb: "229, 231, 235",
      colorRed: "#DC2626",
      colorGreen: "#16A34A",
      colorBlue: "#2563EB",
      colorYellow: "#EAB308",
      colorOrange: "#F97316",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    designElements: {
      patterns: ["简洁现代", "鲜明对比", "清晰层次"],
      decorations: ["橙色按钮", "蓝色链接", "白色背景"],
    },
    components: {
      buttons: {
        primary: {
          default: {
            background: "#FF9900",
            text: "#111111",
            border: "none",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(255, 153, 0, 0.2)",
          },
          hover: {
            background: "#E68A00",
            text: "#111111",
            border: "none",
            transform: "scale(1.05)",
            boxShadow: "0 4px 8px rgba(255, 153, 0, 0.3)",
          },
        },
        secondary: {
          default: {
            background: "transparent",
            text: "#FF9900",
            border: "2px solid #FF9900",
            borderRadius: "4px",
          },
          hover: {
            background: "#FF9900",
            text: "#111111",
            border: "2px solid #FF9900",
          },
        },
      },
      loading: {
        color: "#FF9900",
        style: "旋转动画，简洁现代设计",
      },
    },
  },
  middleEasternLuxury: {
    name: "中东奢华风",
    colors: {
      primary: "#5D3B6D",
      secondary: "#D4AF37",
      accent: "#8B4513",
      dark: "#1F2937",
      light: "#F3F4F6",
      background: "#F3F4F6",
      backgroundAlt: "#E5E7EB",
      text: "#1F2937",
      textMuted: "#6B7280",
      border: "#D1D5DB",
      card: "#FFFFFF",
      primaryRgb: "93, 59, 109",
      accentRgb: "139, 69, 19",
      borderRgb: "209, 213, 219",
      colorRed: "#DC2626",
      colorGreen: "#16A34A",
      colorBlue: "#2563EB",
      colorYellow: "#EAB308",
      colorOrange: "#F97316",
    },
    fonts: {
      heading: "Cormorant, serif",
      body: "Inter, sans-serif",
    },
    designElements: {
      patterns: ["阿拉伯花纹", "几何图案", "奢华质感"],
      decorations: ["金色装饰", "传统中东元素", "现代简约"],
    },
    components: {
      buttons: {
        primary: {
          default: {
            background: "linear-gradient(135deg, #5D3B6D 0%, #D4AF37 100%)",
            text: "#FFFFFF",
            border: "#D4AF37",
            borderRadius: "4px",
            boxShadow: "0 4px 14px rgba(93, 59, 109, 0.3)",
          },
          hover: {
            background: "linear-gradient(135deg, #4A2C5A 0%, #E6C250 100%)",
            text: "#FFFFFF",
            border: "#E6C250",
            transform: "scale(1.05)",
            boxShadow: "0 6px 20px rgba(93, 59, 109, 0.4)",
          },
        },
        secondary: {
          default: {
            background: "transparent",
            text: "#5D3B6D",
            border: "2px solid #5D3B6D",
            borderRadius: "4px",
          },
          hover: {
            background: "#5D3B6D",
            text: "#FFFFFF",
            border: "2px solid #5D3B6D",
          },
        },
      },
      loading: {
        color: "#D4AF37",
        style: "旋转动画，奢华质感设计",
      },
    },
  },
};