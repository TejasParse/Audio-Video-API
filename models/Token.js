const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
    files: [
        {
            filename: String,
            filepath: String
        }
    ]
});

const Token = new mongoose.model("Token",TokenSchema);

module.exports.Token = Token;