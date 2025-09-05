// hooks/useIsMobile.js
import { useTheme, useMediaQuery } from "@mui/material";

const useIsMobile = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // md = 900px
    return isMobile;
};

export default useIsMobile;
