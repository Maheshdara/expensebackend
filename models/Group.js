const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
    {
        groupName: {
            type: String,
            required: true,
        },

        groupImage: {
            type: String,
            default: "",
        },

        createdbyId: { type: Number, required: true },
        user: { type: String, required: true },

        members: [
            {
                userId: String,
                name: String,
                phone: String,
                image: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Group", groupSchema);