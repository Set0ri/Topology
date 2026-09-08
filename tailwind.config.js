/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cat: {
          // Mocha (Dark)
          mocha: {
            rosewater: '#f5e0dc',
            flamingo: '#f2cdcd',
            pink: '#f5c2e7',
            mauve: '#cba6f7',
            red: '#f38ba8',
            maroon: '#eba0ac',
            peach: '#fab387',
            yellow: '#f9e2af',
            green: '#a6e3a1',
            teal: '#94e2d5',
            sky: '#89dceb',
            sapphire: '#74c7ec',
            blue: '#89b4fa',
            lavender: '#b4befe',
            text: '#cdd6f4',
            subtext1: '#bac2de',
            subtext0: '#a6adc8',
            overlay2: '#9399b2',
            overlay1: '#7f849c',
            overlay0: '#6c7086',
            surface2: '#585b70',
            surface1: '#45475a',
            surface0: '#313244',
            base: '#1e1e2e',
            mantle: '#181825',
            crust: '#11111b',
          },
          // Latte (Light)
          latte: {
            rosewater: '#dc8a78',
            flamingo: '#dd7878',
            pink: '#ea76cb',
            mauve: '#8839ef',
            red: '#d20f39',
            maroon: '#e64553',
            peach: '#fe640b',
            yellow: '#df8e1d',
            green: '#40a02b',
            teal: '#179299',
            sky: '#04a5e5',
            sapphire: '#209fb5',
            blue: '#1e66f5',
            lavender: '#7287fd',
            text: '#4c4f69',
            subtext1: '#5c5f77',
            subtext0: '#6c6f85',
            overlay2: '#7c7f93',
            overlay1: '#8c8fa1',
            overlay0: '#9ca0b0',
            surface2: '#acb0be',
            surface1: '#bcc0cc',
            surface0: '#ccd0da',
            base: '#eff1f5',
            mantle: '#e6e9ef',
            crust: '#dce0e8',
          }
        }
      },
      boxShadow: {
        'elevated-sm': '0 4px 12px -2px rgba(0, 0, 0, 0.18), 0 2px 6px -1px rgba(0, 0, 0, 0.12)',
        'elevated-md': '0 10px 25px -3px rgba(0, 0, 0, 0.25), 0 4px 10px -2px rgba(0, 0, 0, 0.15)',
        'elevated-lg': '0 20px 40px -4px rgba(0, 0, 0, 0.35), 0 8px 16px -3px rgba(0, 0, 0, 0.20)',
        'glow-mauve': '0 0 25px -4px rgba(203, 166, 247, 0.35)',
        'glow-sapphire': '0 0 25px -4px rgba(116, 199, 236, 0.35)',
        'glow-peach': '0 0 25px -4px rgba(250, 179, 135, 0.35)',
        'glow-green': '0 0 25px -4px rgba(166, 227, 161, 0.35)',
        'glow-red': '0 0 25px -4px rgba(243, 139, 168, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
