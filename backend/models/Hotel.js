const { Schema, model } = require('mongoose');

const hotelSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    country: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
    },
}, { timestamps: true });

const Hotel = model('hotel', hotelSchema);
module.exports = Hotel;