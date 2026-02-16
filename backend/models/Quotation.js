const mongoose = require('mongoose');

const FlightSegmentSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    date: { type: Date }, // DD-MM-YYYY format from your UI
    departureDateTime: { type: Date },
    arrivalDateTime: { type: Date },
    airline: { type: String }
});

const HotelBookingSchema = new mongoose.Schema({
    hotel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'hotel' }, // Reference to your DataContext hotels
    room_type: {
        type: String,
        enum: ["Single", "Double", "Triple", "Quad", "Suites", "Family Room"]
    },
    meal_plan: {
        type: String,
        enum: ["Room Only", "Breakfast", "Half Board", "Full Board"]
    },
    check_in: { type: Date },
    check_out: { type: Date },
    nights: { type: Number, default: 0 },
    noOfRooms: { type: Number, default: 1 }
});

const QuotationSchema = new mongoose.Schema({
    // Customer Details
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    customer_phone: { type: String },

    // Travel Details
    travel_date: { type: Date, required: true },
    passengers_names: { type: String }, // Stored as the joined string from your parser
    passenger_counts: {
        adults: { type: Number, default: 0 },
        children: { type: Number, default: 0 },
        infants: { type: Number, default: 0 }
    },

    // Dynamic Arrays
    flights: [FlightSegmentSchema],
    hotels: [HotelBookingSchema],

    // Pricing Logic
    pricing: {
        priceAdult: { type: Number, default: 0 },
        priceChild: { type: Number, default: 0 },
        priceInfant: { type: Number, default: 0 },
        totalPrice: { type: Number, required: true }
    },

    // Additional Information
    special_conditions: { type: String },
    notes: { type: String },
    cancellation_policy: { type: String },

    // Metadata for webversedesigns
    status: {
        type: String,
        enum: ['Draft', 'Sent', 'Confirmed', 'Expired'],
        default: 'Draft'
    },
    tracking: {
        // is_confirmed: { type: Boolean, default: false },
        hotel_booking_done: { type: Boolean, default: false },
        responded_to_client: { type: Boolean, default: false },
        // alert_sent: { type: Boolean, default: false } // To prevent duplicate alerts
    },
    quotation_no: { type: String, unique: true }, // e.g., QA|10136
    invoice: { type: String }, // e.g., QA|10136
    created_at: { type: Date, default: Date.now },
    created_by: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }
}, { timestamps: true });

const CounterSchema = new mongoose.Schema({
    id: { type: String, required: true },
    seq: { type: Number, default: 10000 } // Start from 10000
});
const Counter = mongoose.model('Counter', CounterSchema);

QuotationSchema.pre('save', async function () {
    // Check if the document is new
    if (!this.isNew) return;

    try {
        const counter = await Counter.findOneAndUpdate(
            { id: 'quotationId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        // Sets the auto-generated number for your "webversedesigns" brand
        this.quotation_no = `QA-${counter.seq}`;
    } catch (error) {
        // In async hooks, throwing the error is the correct way to stop the save
        throw error;
    }
});
const Quotation = mongoose.model('quotation', QuotationSchema);
module.exports = Quotation