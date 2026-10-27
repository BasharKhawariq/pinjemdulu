/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
          hover: 'var(--secondary-hover)',
          'hover-foreground': 'var(--secondary-hover-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          foreground: 'var(--danger-foreground)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          foreground: 'var(--brand-foreground)',
        },
        'brand-solid': {
          DEFAULT: 'var(--brand-solid)',
          foreground: 'var(--brand-solid-foreground)',
        },
        avatar: {
          DEFAULT: 'var(--avatar)',
          foreground: 'var(--avatar-foreground)',
        },
        'day-booked': {
          DEFAULT: 'var(--day-booked)',
          foreground: 'var(--day-booked-foreground)',
        },
        'day-buffer': {
          DEFAULT: 'var(--day-buffer)',
          foreground: 'var(--day-buffer-foreground)',
        },
        'day-blocked': {
          DEFAULT: 'var(--day-blocked)',
          foreground: 'var(--day-blocked-foreground)',
        },
        'day-partial': {
          DEFAULT: 'var(--day-partial)',
          foreground: 'var(--day-partial-foreground)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        poppins: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
};
