/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';

export default {
    darkMode: ['selector', '[class="app-dark"]'],
    content: ['./src/**/*.{html,ts,scss,css}', './index.html'],
    plugins: [PrimeUI],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#ebf1f7',
                    100: '#d7e3f0',
                    200: '#afc7e1',
                    300: '#87abcf',
                    400: '#5f8fbe',
                    500: '#1e3a5f',
                    600: '#1a3353',
                    700: '#162a45',
                    800: '#122238',
                    900: '#0e1a2a',
                },
            },
        },
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1920px'
        }
    }
};
