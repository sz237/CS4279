import { DefaultTheme, Theme } from '@react-navigation/native';

export const NAV_THEME: { light: Theme; dark: Theme } = {
  light: {
    ...DefaultTheme, // This ensures 'fonts' and other default properties exist
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: 'hsl(221.2 83.2% 53.3%)',
      background: 'hsl(0 0% 100%)',
      card: 'hsl(0 0% 100%)',
      text: 'hsl(222.2 84% 4.9%)',
      border: 'hsl(214.3 31.8% 91.4%)',
      notification: 'hsl(0 84.2% 60.2%)',
    },
  },
  dark: {
    ...DefaultTheme, 
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      primary: 'hsl(217.2 91.2% 59.8%)',
      background: 'hsl(222.2 84% 4.9%)',
      card: 'hsl(222.2 84% 4.9%)',
      text: 'hsl(210 40% 98%)',
      border: 'hsl(217.2 32.6% 17.5%)',
      notification: 'hsl(0 62.8% 30.6%)',
    },
  },
};