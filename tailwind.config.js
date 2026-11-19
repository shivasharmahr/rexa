/** Single source of truth for the Tailwind theme (was duplicated inline in every page). */
module.exports = {
  content: ['./*.html', './*.js', './partials/*.html'],
  theme: {
    extend: {
      colors: {
        rexa: {
          navy: '#0A1128',
          red: '#E61C24',
          redHover: '#CC1820',
          white: '#FFFFFF',
          offWhite: '#FAFAFA',
          grayBg: '#F8FAFC',
          grayLight: '#F1F5F9',
          softGray: '#F1F5F9',
          textMuted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(10, 17, 40, 0.06)',
        hover: '0 20px 40px -10px rgba(10, 17, 40, 0.1)',
        floating: '0 20px 50px -20px rgba(10, 17, 40, 0.15)',
      },
    },
  },
  plugins: [],
};
