import { theme } from "antd";

// Slightly darker primary to improve contrast on light theme (shared across both modes).
const primaryColor = '#065c91';

export const lightTheme = {
    algorithm: theme.defaultAlgorithm,
    // token: {
    //   colorPrimary: primaryColor,
    //   borderRadius: 6,
    //   colorBgContainer: '#FAF9F6',
    //   colorBgLayout: '#f5f5f5',
    //   colorText: '#000000',
    // },
  };
  
  export const darkTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: primaryColor,
      borderRadius: 6,
      colorBgContainer: '#141414',
      colorBgLayout: '#000000',
      colorText: '#ffffff',
      
    },
  };