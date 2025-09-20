import {
    ListItem,
    ListItemAvatar,
    ListItemText,
    Skeleton,
} from "@mui/material";

const SkeletonChatBar = () => {
    return (
        <ListItem>
            <ListItemAvatar>
                <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
                primary={<Skeleton variant="text" width="80%" />}
                secondary={<Skeleton variant="text" width="60%" />}
            />
        </ListItem>
    );
};

export default SkeletonChatBar;
