import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
    {
        members: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        latestMsg: {
            type: String,
            default: "",
        },
        isGroup: {
            type: Boolean,
            default: false,
        },  
        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            require: function () {
                return this.isGroup;
            },
        },
        name: {
            type: String,
            require: function () {
                return this.isGroup;
            },
        },
        unreadCounts: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                count: {
                    type: Number,
                    default: 0,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Chat = mongoose.model("Chat", chatSchema);
