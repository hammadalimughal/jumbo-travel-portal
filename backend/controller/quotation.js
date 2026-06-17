const express = require('express');
const convertFlightCodes = require('../utils/convertFlightCodes');
const { generateHtmlToPdf, createPdfHtml, generateHtmlToPdfWindows } = require('../utils/generatePdf');
const router = express.Router();
const path = require('path');
const Quotation = require('../models/Quotation');
const Hotel = require('../models/Hotel');
const cron = require('node-cron');
const sendMail = require('../utils/sendMail');

router.post('/process-raw-codes', async (req, res) => {
    try {
        const { rawCodes } = req.body
        const data = convertFlightCodes(rawCodes)
        res.json({
            success: true,
            data
        })
    } catch (error) {
        console.log(error)
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.get('/fetch', async (req, res) => {
    try {
        const quotations = await Quotation.find({ is_trashed: { $ne: true } }).sort({ created_at: -1 }).lean()
        res.json({
            success: true,
            data: quotations
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.get('/trash', async (req, res) => {
    try {
        const quotations = await Quotation.find({ is_trashed: true }).sort({ created_at: -1 }).lean()
        res.json({
            success: true,
            data: quotations
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.get('/detail/:id', async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await Quotation.findById(id).populate({ path: 'hotels.hotel_id', model: 'hotel' }).lean()
        res.json({
            success: true,
            data: quotation
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.patch('/mark-trash/:id', async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await Quotation.findByIdAndUpdate(id, {
            is_trashed: true,
            deleted_at: Date.now()
        });
        res.json({
            success: true,
            data: quotation
        })
    } catch (error) {
        res.json({
            success: false,
            error: error.message
        })
    }
})

router.patch('/restore-trash/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const quotation = await Quotation.findByIdAndUpdate(id, {
            is_trashed: false, // Changed to false to restore
            deleted_at: null   // Clear the deletion date
        }, { new: true });

        res.json({ success: true, data: quotation });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

router.post('/generate-invoice', async (req, res) => {
    try {
        const data = req.body
        // console.log(JSON.stringify(data))
        // return
        //  const hotels = await Hotel.find().lean()
        // console.log(JSON.stringify({...data, hotels: data.hotels.map((item) => ({
        //         ...item,
        //         ...hotels.find(hotel => hotel._id == item.hotel_id),
        //     })),
        //     // quotation_no: quotation.quotation_no
        // }))
        const normalizedTravelDate = new Date(data.travel_date);
        const quotation = await Quotation.create({
            ...data,
            passenger_counts: {
                adults: data.adults,
                children: data.children,
                infants: data.infants
            },
            pricing: {
                priceAdult: data.priceAdult,
                priceChild: data.priceChild,
                priceInfant: data.priceInfant,
                totalPrice: data.totalPrice
            }
        })
        const hotels = await Hotel.find().lean()
        const pdfHtml = createPdfHtml({
            ...data, hotels: data.hotels.map((item) => ({
                ...item,
                ...hotels.find(hotel => hotel._id == item.hotel_id),
            })),
            quotation_no: quotation.quotation_no
        })
        var url
        try {
            url = await generateHtmlToPdf(pdfHtml, quotation.quotation_no)
            // url = await generateHtmlToPdfWindows(pdfHtml, quotation.quotation_no)
        } catch (error) {
            console.log(error.message)
        }
        quotation.invoice = url?.url
        await quotation.save()
        sendMail()
        return res.json({ success: true, data, url, message: 'Quoation Saved Successfully' })
    } catch (error) {
        console.log(error)
        res.json({
            status: false,
            error: error.message
        })
    }
})

router.get('/dashboard-stats', async (req, res) => {
    const { filter } = req.query;
    let groupFormat = "%Y-%m-%d"; // Default Daily
    if (filter === 'Monthly') groupFormat = "%Y-%m";

    try {
        const stats = await Quotation.aggregate([
            { $match: { is_trashed: { $ne: true } } },
            {
                $group: {
                    _id: { $dateToString: { format: groupFormat, date: "$created_at" } },
                    amount: { $sum: "$pricing.totalPrice" },
                    quotes: { $sum: 1 },
                    flights: { $sum: { $size: "$flights" } }
                }
            },
            { $sort: { _id: -1 } }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/fetch-pending-travel', async (req, res) => {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setUTCDate(today.getUTCDate() + 7);
        nextWeek.setUTCHours(23, 59, 59, 999);

        // Finds items within 7 days where at least one milestone is incomplete
        const pending = await Quotation.find({
            travel_date: { $gte: today, $lte: nextWeek },
            $or: [
                { 'tracking.hotel_booking_done': false },
                { 'tracking.responded_to_client': false }
            ]
        }).sort({ travel_date: 1 });
        console.log('pending', pending)
        res.json({ success: true, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.patch('/update-tracking/:id', async (req, res) => {
    try {
        const updateData = {};
        // Use dot notation to update nested tracking fields
        for (const key in req.body) {
            updateData[`tracking.${key}`] = req.body[key];
        }

        const updated = await Quotation.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, error: 'Quotation not found' });
        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const quotation = await Quotation.findById(id);
        if (!quotation) {
            return res.status(404).json({ success: false, error: 'Quotation not found' });
        }

        // Update fields
        quotation.customer_name = data.customer_name;
        quotation.customer_email = data.customer_email;
        quotation.customer_phone = data.customer_phone;
        if (data.bookingType) {
            quotation.bookingType = data.bookingType;
        }

        quotation.travel_date = data.travel_date;
        quotation.passengers_names = data.passengers_names;
        quotation.passenger_counts = {
            adults: data.adults || 0,
            children: data.children || 0,
            infants: data.infants || 0
        };

        quotation.flights = data.flights || [];
        quotation.hotels = data.hotels || [];

        quotation.pricing = {
            priceAdult: data.priceAdult || 0,
            priceChild: data.priceChild || 0,
            priceInfant: data.priceInfant || 0,
            totalPrice: data.totalPrice || 0
        };

        quotation.special_conditions = data.special_conditions;
        quotation.notes = data.notes;
        quotation.cancellation_policy = data.cancellation_policy;

        // Save triggers the pre-save hook to normalize dates
        await quotation.save();

        // Regenerate PDF
        const hotels = await Hotel.find().lean();
        const pdfHtml = createPdfHtml({
            ...data,
            hotels: (data.hotels || []).map((item) => ({
                ...item,
                ...hotels.find(hotel => hotel._id.toString() === (item.hotel_id ? item.hotel_id.toString() : '')),
            })),
            quotation_no: quotation.quotation_no
        });

        let url;
        try {
            url = await generateHtmlToPdf(pdfHtml, quotation.quotation_no);
        } catch (error) {
            console.log("PDF update generation error:", error.message);
        }

        if (url?.url) {
            quotation.invoice = url.url;
            await quotation.save();
        }

        return res.json({ success: true, data: quotation, url, message: 'Quotation updated successfully' });
    } catch (error) {
        console.log("Quotation update error:", error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;