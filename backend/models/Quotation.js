const mongoose = require('mongoose');

const FlightSegmentSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    date: { type: Date }, // DD-MM-YYYY format from your UI
    departureDateTime: { type: Date },
    arrivalDateTime: { type: Date },
    airline: { type: String }
});

const RoomConfigSchema = new mongoose.Schema({
    room_type: {
        type: String,
        enum: ["Single", "Double", "Triple", "Quad", "Suites", "Family Room"]
    },
    noOfRooms: { type: Number, default: 1 },
    meal_plan: {
        type: String,
        enum: ["Room Only", "Breakfast", "Half Board", "Full Board"]
    }
});

const HotelBookingSchema = new mongoose.Schema({
    hotel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'hotel' }, // Reference to your DataContext hotels
    check_in: { type: Date },
    check_out: { type: Date },
    nights: { type: Number, default: 0 },
    rooms: [RoomConfigSchema], // Support multiple rooms

    // Retained for backward compatibility
    room_type: {
        type: String,
        enum: ["Single", "Double", "Triple", "Quad", "Suites", "Family Room"]
    },
    meal_plan: {
        type: String,
        enum: ["Room Only", "Breakfast", "Half Board", "Full Board"]
    },
});

const GroupSchema = new mongoose.Schema({
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    customer_phone: { type: String },
    travel_date: { type: Date },
    passengers_names: { type: String },
    adults: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
    hotels: [HotelBookingSchema],
    extra_services: { type: [String], default: [] }
});

const QuotationSchema = new mongoose.Schema({
    // Customer Details
    customer_name: { type: String, required: true },
    customer_email: { type: String },
    customer_phone: { type: String },
    bookingType: {
        type: String,
        enum: ['Group', 'Individual'],
        default: 'Individual'
    },
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
    groups: [GroupSchema],

    // Pricing Logic
    pricing: {
        currency: { type: String, default: 'GBP' },
        exchangeRate: { type: Number, default: 0.85 },
        priceAdult: { type: Number, default: 0 },
        priceChild: { type: Number, default: 0 },
        priceInfant: { type: Number, default: 0 },
        totalPrice: { type: Number, required: true },
        basePriceAdult: { type: Number, default: 0 },
        basePriceChild: { type: Number, default: 0 },
        basePriceInfant: { type: Number, default: 0 },
        baseTotalPrice: { type: Number, default: 0 }
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
    is_trashed: {
        type: Boolean,
        default: false
    },
    deleted_at: {
        type: Date,
        default: null
    },
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

    try {
        if (this.isNew) {
            const counter = await Counter.findOneAndUpdate(
                { id: 'quotationId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            // Sets the auto-generated number for your "webversedesigns" brand
            this.quotation_no = `QA-${counter.seq}`;
        }

        if (this.travel_date) {
            const d = new Date(this.travel_date);
            d.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC
            this.travel_date = d;
        }

        if (this.flights && this.flights.length > 0) {
            this.flights.forEach(flight => {
                if (flight.date) {
                    const fd = new Date(flight.date);
                    fd.setUTCHours(0, 0, 0, 0);
                    flight.date = fd;
                }
            });
        }

        if (this.hotels && this.hotels.length > 0) {
            this.hotels.forEach(item => {
                if (item.check_in) {
                    const cid = new Date(item.check_in);
                    cid.setUTCHours(0, 0, 0, 0);
                    item.check_in = cid;
                }
                if (item.check_out) {
                    const cod = new Date(item.check_out);
                    cod.setUTCHours(0, 0, 0, 0);
                    item.check_out = cod;
                }
            });
        }

    } catch (error) {
        // In async hooks, throwing the error is the correct way to stop the save
        throw error;
    }
});
const Quotation = mongoose.model('quotation', QuotationSchema);
module.exports = Quotation