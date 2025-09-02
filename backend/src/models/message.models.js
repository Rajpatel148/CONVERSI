import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            require: true,
        },
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            require: true,
        },
        text: {
            type: String,
            require: function () {
                return !this.imageUrl;
            },
        },
        imageUrl: {
            type: String,
            require: function () {
                return !this.text;
            },
        },
        reaction: {
            type: String,
            default: "",
        },
        seenBy: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                seenAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        deletedFrom: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: "Message",
        },
    },
    {
        timestamps: true,
    }
);

export const Message = mongoose.model("Message", messageSchema);
