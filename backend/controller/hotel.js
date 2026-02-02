const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');

// Get all hotels
router.get('/getall', async (req, res) => {
    try {
        const hotels = await Hotel.find().sort({ name: 1 });
        console.log(hotels)
        res.json({ success: true, data: hotels });
    } catch (error) {
        console.error(error);
        res.json({ success: false, error: error.message });
    }
});

// Create hotel
router.post('/create', async (req, res) => {
    try {
        const { name, city, country, location,hotelType, phone, email } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Hotel name is required' });
        }
        
        if (!city) {
            return res.status(400).json({ success: false, error: 'City is required' });
        }
        
        if (!country) {
            return res.status(400).json({ success: false, error: 'Country is required' });
        }
        if (!hotelType) {
            return res.status(400).json({ success: false, error: 'Hotel Type is required' });
        }

        const hotel = await Hotel.create({
            name,
            city,
            country,
            location,
            hotelType,
            phone,
            email,
        });

        return res.status(201).json({ success: true, data: hotel });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Update hotel
router.put('/:id', async (req, res) => {
    try {
        const { name, city, country, location,hotelType, phone, email } = req.body;
        
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) {
            return res.status(404).json({ success: false, error: 'Hotel not found' });
        }

        const changes = [];
        if (hotel.name !== name) changes.push(`Name: '${hotel.name}' -> '${name}'`);
        if (hotel.city !== city) changes.push(`City: '${hotel.city}' -> '${city}'`);
        if (hotel.country !== country) changes.push(`Country: '${hotel.country}' -> '${country}'`);
        if (hotel.location !== location) changes.push(`Location: '${hotel.location}' -> '${location}'`);
        if (hotel.phone !== phone) changes.push(`Phone: '${hotel.phone}' -> '${phone}'`);
        if (hotel.email !== email) changes.push(`Email: '${hotel.email}' -> '${email}'`);
        if (hotel.hotelType !== hotelType) changes.push(`Hotel Type: '${hotel.hotelType}' -> '${hotelType}'`);

        hotel.name = name;
        hotel.city = city;
        hotel.country = country;
        hotel.location = location;
        hotel.phone = phone;
        hotel.email = email;
        hotel.hotelType = hotelType;

        await hotel.save();
        
        return res.json({ 
            success: true, 
            data: hotel,
            changes: changes.length > 0 ? changes.join('; ') : 'No changes made'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Delete hotel
router.delete('/:id', async (req, res) => {
    try {
        const hotel = await Hotel.findById(req.params.id);
        if (!hotel) {
            return res.status(404).json({ success: false, error: 'Hotel not found' });
        }

        await Hotel.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'Hotel deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
