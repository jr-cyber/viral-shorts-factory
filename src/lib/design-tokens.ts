// Design Tokens - Retro-Futuristic Aesthetic
export const tokens = {
  // Colors - Neon on Dark
  colors: {
    background: '#050510',
    surface: '#0A0A1A',
    surfaceLight: '#12122A',
    surfaceLighter: '#1A1A3A',
    
    // Neon Accents
    primary: '#FF006E',      // Hot pink
    secondary: '#8338EC',    // Purple
    tertiary: '#3A86FF',     // Blue
    quaternary: '#06D6A0',   // Teal
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #FF006E 0%, #8338EC 50%, #3A86FF 100%)',
    gradientSecondary: 'linear-gradient(135deg, #8338EC 0%, #3A86FF 100%)',
    gradientAccent: 'linear-gradient(135deg, #06D6A0 0%, #3A86FF 100%)',
    gradientMesh: 'radial-gradient(at 40% 20%, rgba(255, 0, 110, 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(131, 56, 236, 0.15) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(6, 214, 160, 0.1) 0px, transparent 50%)',
    
    // Text
    text: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textTertiary: 'rgba(255, 255, 255, 0.5)',
    
    // Status
    success: '#06D6A0',
    warning: '#FFD166',
    error: '#FF006E',
    
    // Glow effects
    glowPrimary: '0 0 30px rgba(255, 0, 110, 0.4)',
    glowSecondary: '0 0 30px rgba(131, 56, 236, 0.4)',
  },
  
  // Typography
  typography: {
    fontFamily: {
      display: "'Space Grotesk', -apple-system, sans-serif",
      body: "'Inter', -apple-system, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.1,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing (8pt grid)
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
    '3xl': '4rem',   // 64px
    '4xl': '6rem',   // 96px
  },
  
  // Border Radius
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  
  // Shadows
  shadow: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(255, 0, 110, 0.3)',
    glowSecondary: '0 0 20px rgba(131, 56, 236, 0.3)',
  },
  
  // Transitions
  transition: {
    fast: '0.15s ease',
    normal: '0.3s ease',
    slow: '0.5s ease',
    spring: '0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index
  zIndex: {
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
  },
}

export type DesignTokens = typeof tokens
export default tokens