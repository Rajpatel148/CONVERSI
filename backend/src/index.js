import { app } from "./app.js";
import { createServer } from "http";
import { connectDB } from "./db/index.js";
import "dotenv/config";
import { initServer } from "./socket/index.js";

const PORT = process.env.PORT || 4000;

// Server SetUP
const server = createServer(app);


initServer(server);

server.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
    connectDB().catch((error) => {
        console.log(`Failed to connect DATABASE : ${error}`);
    });
});
