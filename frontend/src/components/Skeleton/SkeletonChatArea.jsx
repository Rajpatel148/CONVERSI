import { Box, Skeleton, Avatar } from "@mui/material";

export default function ChatAreaSkeleton() {
    return (
        <Box
            sx={{
                flex: 1,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                overflowY: "auto",
                backgroundColor: "#fff",
                height: "100vh",
            }}
        >
            {/* Incoming message */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton
                    variant="rectangular"
                    width={180}
                    height={25}
                    sx={{ borderRadius: 2 }}
                />
            </Box>

            {/* Outgoing message */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                <Skeleton
                    variant="rectangular"
                    width={140}
                    height={25}
                    sx={{ borderRadius: 2 }}
                />
                <Skeleton variant="circular" width={32} height={32} />
            </Box>

            {/* Another incoming */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton
                    variant="rectangular"
                    width={150}
                    height={25}
                    sx={{ borderRadius: 2 }}
                />
            </Box>

            {/* Another outgoing */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                <Skeleton
                    variant="rectangular"
                    width={170}
                    height={25}
                    sx={{ borderRadius: 2 }}
                />
                <Skeleton variant="circular" width={32} height={32} />
            </Box>

            {/* Typing/loading bubble */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton
                    variant="rectangular"
                    width={100}
                    height={25}
                    sx={{ borderRadius: 2 }}
                />
            </Box>
        </Box>
    );
}
