import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
  	fontSize: {
  		xs: '0.625rem',
  		sm: '0.75rem',
  		md: '0.875rem',
  		lg: '1rem',
  		xl: '1.125rem',
  		'2xl': '1.25rem',
  		'3xl': '1.563rem',
  		'4xl': '1.953rem',
  		'5xl': '2.441rem',
  		'6xl': '3.052rem',
  		'7xl': '3.815rem'
  	},
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		gridTemplateColumns: {
  			'23': 'repeat(23, minmax(0, 1fr))'
  		},
  		screens: {
  			xs: '475px',
  			'3xl': '1600px',
  			'4xl': '1920px',
  			'5xl': '2400px',
  			'6xl': '2700px',
  			'7xl': '3840px'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			brand: {
  				700: '#2A3B63',
  				600: '#334A7A',
  				500: '#3F5FA3',
  				400: '#5C7BCB',
  				300: '#8FA8E6',
  				DEFAULT: '#3F5FA3',
  				foreground: '#FFFFFF'
  			},
  			bg: {
  				0: '#FFFFFF',
  				50: '#F7F8FB',
  				100: '#EEF1F7'
  			},
  			ink: {
  				900: '#0D1321',
  				700: '#2A3245',
  				500: '#55607A'
  			},
  			stroke: {
  				200: '#DDE3F0'
  			},
  			tan: {
  				500: '#8A5A3C',
  				200: '#E6C9B7'
  			},
  			teal: {
  				500: '#22B8B2'
  			},
  			coral: {
  				500: '#FF5A6B'
  			},
  			lime: {
  				500: '#40D57C'
  			},
  			amber: {
  				500: '#FFB020'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: '14px',
  			md: '12px',
  			sm: '8px',
  			xl: '16px',
  			pill: '999px'
  		},
  		boxShadow: {
  			card: '0 8px 24px rgba(13,19,33,0.10)',
  			float: '0 16px 40px rgba(13,19,33,0.16)',
  			pressable: '0 6px 0 rgba(42,59,99,0.25), 0 10px 24px rgba(13,19,33,0.10)',
  			'pressable-pressed': '0 2px 0 rgba(42,59,99,0.20), 0 6px 16px rgba(13,19,33,0.08)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
