import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Space, message, Typography, Alert, Table, Tag, Popconfirm, Checkbox } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useDataContext } from '../context/DataContext';
import { API_BASE } from '../config/data';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
const { Title } = Typography;

const NewGroupQuotation = ({ isDark }) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const [selectedCurrency, setSelectedCurrency] = useState('GBP');
    const [exchangeRates, setExchangeRates] = useState({ USD: 1.08, GBP: 0.85, EUR: 1.0, AED: 4.0, SAR: 4.1 });

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const response = await fetch('https://open.er-api.com/v6/latest/EUR');
                const data = await response.json();
                if (data && data.rates) {
                    setExchangeRates(data.rates);
                }
            } catch (error) {
                console.error('Failed to fetch exchange rates, using local fallbacks:', error);
            }
        };
        fetchRates();
    }, []);

    const handleCurrencyChange = (newCurrency) => {
        const prevRate = exchangeRates[selectedCurrency] || 1;
        const newRate = exchangeRates[newCurrency] || 1;
        const factor = newRate / prevRate;

        const adultP = form.getFieldValue('priceAdult');
        const childP = form.getFieldValue('priceChild');
        const infantP = form.getFieldValue('priceInfant');

        const patch = {};

        if (adultP !== undefined && adultP !== null) {
            patch.priceAdult = Number((adultP * factor).toFixed(2));
        }
        if (childP !== undefined && childP !== null) {
            patch.priceChild = Number((childP * factor).toFixed(2));
        }
        if (infantP !== undefined && infantP !== null) {
            patch.priceInfant = Number((infantP * factor).toFixed(2));
        }

        form.setFieldsValue(patch);
        setSelectedCurrency(newCurrency);

        // Manually trigger summary recalculation as setFieldsValue doesn't trigger onValuesChange
        handleValuesChange({}, form.getFieldsValue());
    };

    const currencySymbols = {
        USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR',
        CAD: 'C$', AUD: 'A$', JPY: '¥', INR: '₹', CNY: '¥',
        CHF: 'CHF', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', SEK: 'kr',
        NOK: 'kr', DKK: 'kr', TRY: '₺', RUB: '₽', ZAR: 'R',
        BRL: 'R$', MXN: '$', PLN: 'zł', PHP: '₱', IDR: 'Rp',
        THB: '฿', MYR: 'RM', VND: '₫', KRW: '₩'
    };
    const getSymbol = (code) => currencySymbols[code] || code || '£';

    const [rawCodes, setRawCodes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [form] = Form.useForm();
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(false);
    const { hotels } = useDataContext();
    const [summary, setSummary] = useState({
        groups: [
            {
                index: 1,
                leaderName: "Group #1",
                adults: 0,
                children: 0,
                infants: 0,
                pax: 0,
                amount: 0
            }
        ],
        totals: {
            adults: 0,
            children: 0,
            infants: 0,
            pax: 0,
            amount: 0
        },
        hotels: []
    });

    useEffect(() => {
        // Trigger a calculation on mount to populate summary with initial values
        handleValuesChange({}, form.getFieldsValue());
    }, []);

    const passengerOptions = Array.from({ length: 30 }, (_, i) => ({
        label: i.toString(),
        value: i,
    }));

    const hotelOptions = hotels.map((item) => ({
        value: item._id,
        label: `${item.name} ${item.hotelType ? ` - ${item.hotelType} Stars` : ''}`,
        location: `${item.city}, ${item.country}`,
    }));

    // Auto-calculates nights and global package price
    const handleValuesChange = (changedValues, allValues) => {
        let total = 0;
        const adultPrice = Number(allValues.priceAdult) || 0;
        const childPrice = Number(allValues.priceChild) || 0;
        const infantPrice = Number(allValues.priceInfant) || 0;

        let groupsUpdated = false;
        let totalAdults = 0;
        let totalChildren = 0;
        let totalInfants = 0;
        const summaryGroups = [];



        let topHotelsUpdated = false;
        const topHotels = allValues.hotels || [];
        const updatedTopHotels = topHotels.map((hotel) => {
            if (hotel.check_in && hotel.check_out) {
                const start = dayjs(hotel.check_in);
                const end = dayjs(hotel.check_out);
                const diff = end.diff(start, 'day');
                const expectedNights = diff > 0 ? diff : 0;
                if (hotel.nights !== expectedNights) {
                    topHotelsUpdated = true;
                    return { ...hotel, nights: expectedNights };
                }
            }
            return hotel;
        });
        if (topHotelsUpdated) {
            form.setFieldsValue({ hotels: updatedTopHotels });
        }

        const updatedGroups = (allValues.groups || []).map((group, index) => {
            const adults = Number(group.adults) || 0;
            const children = Number(group.children) || 0;
            const infants = Number(group.infants) || 0;

            totalAdults += adults;
            totalChildren += children;
            totalInfants += infants;

            const groupAmount = (adults * adultPrice) + (children * childPrice) + (infants * infantPrice);
            total += groupAmount;

            summaryGroups.push({
                index: index + 1,
                leaderName: group.customer_name || `Group #${index + 1}`,
                adults,
                childrenCount: children,
                infants,
                pax: adults + children + infants,
                amount: groupAmount
            });

            return group;
        });

        const patch = { totalPrice: total };
        form.setFieldsValue(patch);

        // Compute consolidated hotel summary
        const hotelSummaryMap = {};
        const currentTopHotels = form.getFieldValue('hotels') || [];
        (updatedGroups || []).forEach(group => {
            const extraServices = group.extra_services || [];
            if (!extraServices.includes('Hotels')) return;

            (group.hotels || []).forEach((h, hIdx) => {
                const topHotel = currentTopHotels[hIdx];
                if (!topHotel || (!topHotel.hotel_id && !topHotel.name)) return;

                const hotelObj = hotels.find(item => item._id === topHotel.hotel_id);
                const hotelName = hotelObj ? hotelObj.name : (topHotel.name || 'Manual Entry');
                const checkInStr = topHotel.check_in ? dayjs(topHotel.check_in).format('YYYY-MM-DD') : 'N/A';
                const checkOutStr = topHotel.check_out ? dayjs(topHotel.check_out).format('YYYY-MM-DD') : 'N/A';
                const nights = Number(topHotel.nights) || 0;
                const key = `${hotelName}_${checkInStr}_${checkOutStr}_${nights}`;

                if (!hotelSummaryMap[key]) {
                    hotelSummaryMap[key] = {
                        key,
                        hotelName,
                        checkIn: topHotel.check_in,
                        checkOut: topHotel.check_out,
                        nights,
                        Single: 0,
                        Double: 0,
                        Triple: 0,
                        Quad: 0,
                        Suites: 0,
                        "Family Room": 0,
                        totalRooms: 0
                    };
                }

                if (h.rooms && h.rooms.length > 0) {
                    h.rooms.forEach(r => {
                        const rType = r.room_type || 'Single';
                        const count = Number(r.noOfRooms) || 0;
                        if (hotelSummaryMap[key][rType] !== undefined) {
                            hotelSummaryMap[key][rType] += count;
                        }
                        hotelSummaryMap[key].totalRooms += count;
                    });
                } else {
                    const rType = h.room_type || 'Single';
                    const count = Number(h.noOfRooms) || 1;
                    if (hotelSummaryMap[key][rType] !== undefined) {
                        hotelSummaryMap[key][rType] += count;
                    }
                    hotelSummaryMap[key].totalRooms += count;
                }
            });
        });
        const hotelSummaryList = Object.values(hotelSummaryMap);

        // Update the summary state
        setSummary({
            groups: summaryGroups,
            totals: {
                adults: totalAdults,
                children: totalChildren,
                infants: totalInfants,
                pax: totalAdults + totalChildren + totalInfants,
                amount: total
            },
            hotels: hotelSummaryList
        });
    };

    const addHotelRoom = (groupIndex, hotelIndex) => {
        const currentGroups = form.getFieldValue('groups') || [];
        const group = currentGroups[groupIndex] || {};
        const hotelsList = group.hotels || [];
        const hotel = hotelsList[hotelIndex] || {};
        const rooms = hotel.rooms || [];
        const updatedRooms = [
            ...rooms,
            { room_type: null, noOfRooms: 1, meal_plan: null }
        ];
        form.setFieldValue(['groups', groupIndex, 'hotels', hotelIndex, 'rooms'], updatedRooms);
    };

    const addFlight = () => {
        setFlights([...flights, { id: Date.now(), from: '', to: '', date: null, departureDateTime: null, arrivalDateTime: null, airline: '' }]);
    };

    const removeFlight = (id) => {
        setFlights(flights.filter((flight) => flight.id !== id));
    };

    const updateFlight = (id, field, value) => {
        setFlights(
            flights.map((flight) =>
                flight.id === id ? { ...flight, [field]: value } : flight
            )
        );
    };

    const rawCodesParser = async () => {
        if (!rawCodes.trim()) {
            message.error('Please paste itinerary code first');
            return;
        }
        setProcessing(true);
        try {
            setFlights([]);
            const response = await fetch(`${API_BASE}/quotation/process-raw-codes`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify({ rawCodes })
            });
            const result = await response.json();

            if (result.success && result.data) {
                const { passengers, flights: parsedFlightsData } = result.data;
                const passengerNames = passengers.map(p => `${p.firstName} ${p.lastName}`).join(', ');

                // Auto-fill parsed details to the first group in the list for user convenience
                const currentGroups = form.getFieldValue('groups') || [{}];
                const adultCount = passengers.filter(item => item.type.category === 'adult').length;
                const childCount = passengers.filter(item => item.type.category === 'children').length;
                const infantCount = passengers.filter(item => item.type.category === 'infant').length;

                currentGroups[0] = {
                    ...currentGroups[0],
                    passengers_names: passengerNames,
                    adults: adultCount,
                    children: childCount,
                    infants: infantCount
                };
                form.setFieldsValue({ groups: currentGroups });
                handleValuesChange({}, form.getFieldsValue());

                if (parsedFlightsData && parsedFlightsData.length > 0) {
                    const parsedFlights = parsedFlightsData.map((flight, index) => ({
                        ...flight,
                        id: Date.now() + index,
                        from: flight.origin?.city || flight.origin?.iata || '',
                        to: flight.destination?.city || flight.destination?.iata || '',
                        date: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
                        departureDateTime: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
                        arrivalDateTime: flight.arrivalISO ? dayjs.utc(flight.arrivalISO) : null,
                        airline: flight.airline?.name || flight.airline?.iata || ''
                    }));
                    setFlights(parsedFlights);
                }

                message.success('Data parsed successfully! Flights and Group #1 passenger details updated.');
            } else {
                message.error(result.error || 'Failed to parse itinerary');
            }
        } catch (error) {
            console.error(error);
            message.error('Error parsing itinerary: ' + error.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const formattedTopHotels = (values.hotels || []).map(h => {
                const hotelObj = hotels.find(item => item._id === h.hotel_id);
                return {
                    hotel_id: h.hotel_id,
                    name: hotelObj ? hotelObj.name : (h.name || 'Manual Entry'),
                    check_in: h.check_in ? h.check_in.format('YYYY-MM-DD') : null,
                    check_out: h.check_out ? h.check_out.format('YYYY-MM-DD') : null,
                    nights: h.nights,
                    rooms: []
                };
            });

            const formattedGroups = (values.groups || []).map(group => {
                const extraServices = group.extra_services || [];
                const isHotelsChecked = extraServices.includes('Hotels');
                const formattedHotels = (values.hotels || []).map((topHotel, hIdx) => {
                    const groupHotel = group.hotels?.[hIdx] || {};
                    const firstRoom = isHotelsChecked ? (groupHotel.rooms?.[0] || {}) : {};
                    return {
                        hotel_id: topHotel.hotel_id,
                        check_in: topHotel.check_in ? topHotel.check_in.format('YYYY-MM-DD') : null,
                        check_out: topHotel.check_out ? topHotel.check_out.format('YYYY-MM-DD') : null,
                        nights: topHotel.nights,
                        rooms: isHotelsChecked ? (groupHotel.rooms || []).map(r => ({
                            room_type: r.room_type,
                            noOfRooms: r.noOfRooms,
                            meal_plan: r.meal_plan
                        })) : [],
                        room_type: isHotelsChecked ? firstRoom.room_type : undefined,
                        noOfRooms: isHotelsChecked ? (firstRoom.noOfRooms || 0) : 0,
                        meal_plan: isHotelsChecked ? firstRoom.meal_plan : undefined
                    };
                });
                return {
                    ...group,
                    travel_date: group.travel_date ? group.travel_date.format('YYYY-MM-DD') : null,
                    hotels: formattedHotels
                };
            });

            // Package form details, injecting fallback properties at root level for API compatibility
            const rate = exchangeRates[selectedCurrency] || 1;
            const formData = {
                ...values,
                bookingType: 'Group',
                created_by: user.id,
                currency: selectedCurrency,
                exchangeRate: rate,
                basePriceAdult: Number(((values.priceAdult || 0) / rate).toFixed(2)),
                basePriceChild: Number(((values.priceChild || 0) / rate).toFixed(2)),
                basePriceInfant: Number(((values.priceInfant || 0) / rate).toFixed(2)),
                baseTotalPrice: Number(((values.totalPrice || 0) / rate).toFixed(2)),
                travel_date: formattedGroups[0]?.travel_date || null,
                customer_name: formattedGroups[0]?.customer_name || '',
                customer_email: formattedGroups[0]?.customer_email || '',
                customer_phone: formattedGroups[0]?.customer_phone || '',
                adults: formattedGroups.reduce((sum, g) => sum + (Number(g.adults) || 0), 0),
                children: formattedGroups.reduce((sum, g) => sum + (Number(g.children) || 0), 0),
                infants: formattedGroups.reduce((sum, g) => sum + (Number(g.infants) || 0), 0),
                double_rooms: 0,
                triple_rooms: 0,
                quadruple_rooms: 0,
                total_rooms_required: 0,
                rooms_booked: 0,
                remaining_rooms: 0,
                hotels: formattedTopHotels,
                flights: flights.map((f) => ({
                    ...f,
                    date: f.date ? f.date.format('YYYY-MM-DD') : null,
                    departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
                    arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null
                })),
                groups: formattedGroups
            };

            const response = await fetch(`${API_BASE}/quotation/generate-invoice`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            if (result.success) {
                message.success('Group quotation saved successfully!');
                navigate('/quotations');
                return;
            }
            message.error(result.error);
        } catch (error) {
            message.error('Failed to save group quotation');
        } finally {
            setLoading(false);
        }
    };

    const disabledCheckIn = (current) => {
        return current && current < dayjs().startOf('day');
    };

    const disabledCheckOut = (checkInDate) => (current) => {
        return current && current < dayjs(checkInDate).startOf('day');
    };

    const cardStyle = {
        backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
        marginBottom: 24,
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <Title level={3} style={{ marginBottom: 0 }}>New Group Quotation (Multi-Group)</Title>
            </div>

            {/* AI Convert Section */}
            <Card style={cardStyle} size="small">
                <div style={{ marginBottom: 16 }}>
                    <Alert message="Paste Amadeus / Airline Itinerary Code then click convert to auto-fill flights and Group #1 passengers details." style={{ marginBottom: 8 }} type="info" />
                    <Form.Item name="raw_itinerary" style={{ marginBottom: 8 }}>
                        <Input.TextArea
                            rows={6}
                            placeholder="Paste itinerary..."
                            id="raw_itinerary"
                            onChange={(e) => setRawCodes(e.target.value)}
                        />
                    </Form.Item>
                    <Button type="primary" onClick={rawCodesParser} loading={processing}>
                        Convert Data
                    </Button>
                </div>
            </Card>

            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={handleValuesChange}
                autoComplete="off"
            >
                {/* Global Settings */}
                <Card style={cardStyle} title="Global Settings" size="small">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Quotation Currency"
                                name="currency"
                                initialValue="GBP"
                            >
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    onChange={handleCurrencyChange}
                                    options={Object.keys(exchangeRates).map((code) => {
                                        const sym = currencySymbols[code] ? ` (${currencySymbols[code]})` : '';
                                        return {
                                            value: code,
                                            label: `${code}${sym} - Rate: ${(exchangeRates[code] || 1).toFixed(4)}`
                                        };
                                    })}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Flight Details */}
                <Card style={cardStyle} title="Flight Details" size="small">
                    <div style={{ marginBottom: 16 }}>
                        {flights.length === 0 ? (
                            <p style={{ color: '#999' }}>No flights added yet</p>
                        ) : (
                            flights.map((flight) => (
                                <Card key={flight.id} style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}>
                                    <Row gutter={[16, 16]}>
                                        <Col xs={24} sm={12} md={5}>
                                            <Form.Item label="From" style={{ marginBottom: 0 }}>
                                                <Input
                                                    placeholder="From"
                                                    value={flight.from}
                                                    onChange={(e) => updateFlight(flight.id, 'from', e.target.value)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={5}>
                                            <Form.Item label="To" style={{ marginBottom: 0 }}>
                                                <Input
                                                    placeholder="To"
                                                    value={flight.to}
                                                    onChange={(e) => updateFlight(flight.id, 'to', e.target.value)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={5}>
                                            <Form.Item label="Date" style={{ marginBottom: 0 }}>
                                                <DatePicker
                                                    format="DD-MM-YYYY HH:mm:ss"
                                                    style={{ width: '100%' }}
                                                    value={flight.date}
                                                    onChange={(date) => updateFlight(flight.id, 'date', date)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={5}>
                                            <Form.Item label="Airline" style={{ marginBottom: 0 }}>
                                                <Input
                                                    placeholder="Airline"
                                                    value={flight.airline}
                                                    onChange={(e) => updateFlight(flight.id, 'airline', e.target.value)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={4}>
                                            <Form.Item label=" " style={{ marginBottom: 0 }}>
                                                <Popconfirm
                                                    title="Remove Flight Segment"
                                                    description="Are you sure you want to remove this flight segment?"
                                                    onConfirm={() => removeFlight(flight.id)}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <Button
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                    >
                                                        Remove
                                                    </Button>
                                                </Popconfirm>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
                                        <Col xs={24} sm={12} md={12}>
                                            <Form.Item label="Departure Date & Time" style={{ marginBottom: 0 }}>
                                                <DatePicker
                                                    format="DD-MM-YYYY HH:mm:ss"
                                                    showTime
                                                    style={{ width: '100%' }}
                                                    value={flight.departureDateTime}
                                                    onChange={(date) => updateFlight(flight.id, 'departureDateTime', date)}
                                                    placeholder="Select departure date and time"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} sm={12} md={12}>
                                            <Form.Item label="Arrival Date & Time" style={{ marginBottom: 0 }}>
                                                <DatePicker
                                                    format="DD-MM-YYYY HH:mm:ss"
                                                    showTime
                                                    style={{ width: '100%' }}
                                                    value={flight.arrivalDateTime}
                                                    onChange={(date) => updateFlight(flight.id, 'arrivalDateTime', date)}
                                                    placeholder="Select arrival date and time"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>
                            ))
                        )}
                    </div>
                    <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={addFlight}
                        block
                        style={{ marginBottom: 24 }}
                    >
                        Add Flight Segment
                    </Button>
                </Card>

                {/* Accommodation Stays (All Groups) */}
                <Card style={cardStyle} title="Accommodation Stays (All Groups)" size="small">
                    <Form.List name="hotels" initialValue={[{}]}>
                        {(hotelFields, { add: addHotel, remove: removeHotel }) => (
                            <div>
                                {hotelFields.map(({ key: hKey, name: hName, ...restHField }) => (
                                    <Card
                                        key={hKey}
                                        style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}
                                        extra={
                                            <Popconfirm
                                                title="Remove Hotel Stay"
                                                description="Are you sure you want to remove this hotel stay?"
                                                onConfirm={() => removeHotel(hName)}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                />
                                            </Popconfirm>
                                        }
                                    >
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item
                                                    {...restHField}
                                                    label="Hotel"
                                                    name={[hName, 'hotel_id']}
                                                    style={{ marginBottom: 0 }}
                                                    rules={[{ required: true, message: 'Please select a hotel' }]}
                                                >
                                                    <Select
                                                        showSearch
                                                        placeholder="-- Select Hotel --"
                                                        optionFilterProp="label"
                                                        filterOption={(input, option) => {
                                                            const term = (input || '').toLowerCase();
                                                            const labelMatches = (option?.label || '').toLowerCase().includes(term);
                                                            const locationMatches = (option?.location || '').toLowerCase().includes(term);
                                                            return labelMatches || locationMatches;
                                                        }}
                                                        options={hotelOptions}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item
                                                    {...restHField}
                                                    label="Check-in"
                                                    name={[hName, 'check_in']}
                                                    style={{ marginBottom: 0 }}
                                                    rules={[{ required: true, message: 'Check-in is required' }]}
                                                >
                                                    <DatePicker
                                                        format="DD-MM-YYYY"
                                                        style={{ width: '100%' }}
                                                        disabledDate={disabledCheckIn}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item
                                                    {...restHField}
                                                    label="Check-out"
                                                    name={[hName, 'check_out']}
                                                    style={{ marginBottom: 0 }}
                                                    rules={[{ required: true, message: 'Check-out is required' }]}
                                                >
                                                    <DatePicker
                                                        format="DD-MM-YYYY"
                                                        style={{ width: '100%' }}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={6}>
                                                <Form.Item
                                                    {...restHField}
                                                    label="Nights"
                                                    name={[hName, 'nights']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <InputNumber min={0} style={{ width: '100%' }} readOnly />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                ))}
                                <Button
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={() => addHotel()}
                                    block
                                >
                                    Add Hotel Stay
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </Card>

                {/* Groups Form List */}
                <Form.List name="groups" initialValue={[{}]}>
                    {(fields, { add, remove }) => (
                        <div>
                            {fields.map(({ key, name, ...restField }) => (
                                <Card
                                    key={key}
                                    title={`Group Leader & Room Requirements #${name + 1}`}
                                    style={{
                                        backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9',
                                        border: `1px solid ${isDark ? '#303030' : '#e8e8e8'}`,
                                        marginBottom: 32,
                                        borderRadius: '8px'
                                    }}
                                    extra={
                                        fields.length > 1 && (
                                            <Popconfirm
                                                title="Remove Group"
                                                description="Are you sure you want to remove this group?"
                                                onConfirm={() => remove(name)}
                                                okText="Yes"
                                                cancelText="No"
                                            >
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                >
                                                    Remove Group
                                                </Button>
                                            </Popconfirm>
                                        )
                                    }
                                >
                                    {/* Customer Details */}
                                    <Card style={cardStyle} title="Group Leader Details" size="small">
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Group Leader Name"
                                                    name={[name, 'customer_name']}
                                                    rules={[{ required: true, message: 'Please enter group leader name' }]}
                                                >
                                                    <Input placeholder="Enter group leader name" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Email"
                                                    name={[name, 'customer_email']}
                                                    rules={[{ type: 'email', message: 'Invalid email' }]}
                                                >
                                                    <Input placeholder="Enter email" type="email" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Phone"
                                                    name={[name, 'customer_phone']}
                                                >
                                                    <Input placeholder="Enter phone number" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>

                                    {/* Travel Details */}
                                    <Card style={cardStyle} title="Travel Details" size="small">
                                        <Row gutter={[16, 16]}>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Travel Date"
                                                    name={[name, 'travel_date']}
                                                    rules={[{ required: true, message: 'Please select travel date' }]}
                                                >
                                                    <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Passengers Names"
                                                    name={[name, 'passengers_names']}
                                                >
                                                    <Input.TextArea rows={3} placeholder="Enter passenger names" />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Adults"
                                                    name={[name, 'adults']}
                                                    initialValue={0}
                                                >
                                                    <Select options={passengerOptions} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Children"
                                                    name={[name, 'children']}
                                                    initialValue={0}
                                                >
                                                    <Select options={passengerOptions} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24} sm={12} md={8}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Infants"
                                                    name={[name, 'infants']}
                                                    initialValue={0}
                                                >
                                                    <Select options={passengerOptions} />
                                                </Form.Item>
                                            </Col>
                                            <Col xs={24}>
                                                <Form.Item
                                                    {...restField}
                                                    label="Included Services"
                                                    name={[name, 'extra_services']}
                                                    initialValue={[]}
                                                >
                                                    <Checkbox.Group
                                                        options={[
                                                            { label: 'Air Ticket', value: 'Air Ticket' },
                                                            { label: 'Hotels', value: 'Hotels' },
                                                            { label: 'Transport', value: 'Transport' },
                                                            { label: 'Umrah Visa', value: 'Umrah Visa' }
                                                        ]}
                                                    />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>

                                    {/* Accommodation Room Configurations for Group */}
                                    <Form.Item noStyle dependencies={['hotels', ['groups', name, 'extra_services']]}>
                                        {() => {
                                            const extraServices = form.getFieldValue(['groups', name, 'extra_services']) || [];
                                            const isHotelsChecked = extraServices.includes('Hotels');
                                            if (!isHotelsChecked) return null;

                                            const topHotels = form.getFieldValue('hotels') || [];
                                            if (topHotels.length === 0) {
                                                return (
                                                    <Alert
                                                        message="Please add Accommodation Stays at the top level first."
                                                        type="info"
                                                        showIcon
                                                        style={{ marginBottom: 16 }}
                                                    />
                                                );
                                            }

                                            return (
                                                <Card style={cardStyle} title="Accommodation Room Configurations" size="small">
                                                    {topHotels.map((topHotel, hIdx) => {
                                                        const hotelObj = hotels.find(item => item._id === topHotel.hotel_id);
                                                        const hotelLabel = hotelObj ? hotelObj.name : (topHotel.name || `Stay #${hIdx + 1}`);
                                                        const checkInStr = topHotel.check_in ? dayjs(topHotel.check_in).format('DD-MM-YYYY') : '';
                                                        const checkOutStr = topHotel.check_out ? dayjs(topHotel.check_out).format('DD-MM-YYYY') : '';
                                                        const nights = topHotel.nights || 0;

                                                        return (
                                                            <Card
                                                                key={hIdx}
                                                                type="inner"
                                                                title={
                                                                    <span>
                                                                        <strong>{hotelLabel}</strong>
                                                                        {checkInStr && ` (${checkInStr} to ${checkOutStr}, ${nights} Nights)`}
                                                                    </span>
                                                                }
                                                                style={{ marginBottom: 16 }}
                                                            >
                                                                <Form.List name={[name, 'hotels', hIdx, 'rooms']} initialValue={[{ noOfRooms: 1 }]}>
                                                                    {(roomFields, { add: addRoom, remove: removeRoom }) => (
                                                                        <div>
                                                                            {roomFields.map(({ key: rKey, name: rName, ...restRField }) => (
                                                                                <Row gutter={[8, 8]} key={rKey} align="middle" style={{ marginBottom: 8 }}>
                                                                                    <Col xs={24} sm={8}>
                                                                                        <Form.Item
                                                                                            {...restRField}
                                                                                            name={[rName, 'room_type']}
                                                                                            style={{ marginBottom: 0 }}
                                                                                            rules={[{ required: true, message: 'Required' }]}
                                                                                        >
                                                                                            <Select
                                                                                                placeholder="Room Type"
                                                                                                style={{ width: '100%' }}
                                                                                                options={[
                                                                                                    { label: "Single", value: "Single" },
                                                                                                    { label: "Double", value: "Double" },
                                                                                                    { label: "Triple", value: "Triple" },
                                                                                                    { label: "Quad", value: "Quad" },
                                                                                                    { label: "Suites", value: "Suites" },
                                                                                                    { label: "Family Room", value: "Family Room" }
                                                                                                ]}
                                                                                            />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col xs={12} sm={6}>
                                                                                        <Form.Item
                                                                                            {...restRField}
                                                                                            name={[rName, 'noOfRooms']}
                                                                                            style={{ marginBottom: 0 }}
                                                                                            rules={[{ required: true, message: 'Required' }]}
                                                                                        >
                                                                                            <InputNumber
                                                                                                min={1}
                                                                                                placeholder="Rooms"
                                                                                                style={{ width: '100%' }}
                                                                                            />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col xs={12} sm={8}>
                                                                                        <Form.Item
                                                                                            {...restRField}
                                                                                            name={[rName, 'meal_plan']}
                                                                                            style={{ marginBottom: 0 }}
                                                                                            rules={[{ required: true, message: 'Required' }]}
                                                                                        >
                                                                                            <Select
                                                                                                placeholder="Meal Plan"
                                                                                                style={{ width: '100%' }}
                                                                                                options={[
                                                                                                    { label: "Room Only", value: "Room Only" },
                                                                                                    { label: "Breakfast", value: "Breakfast" },
                                                                                                    { label: "Half Board", value: "Half Board" },
                                                                                                    { label: "Full Board", value: "Full Board" }
                                                                                                ]}
                                                                                            />
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                    <Col xs={24} sm={2} style={{ textAlign: 'right' }}>
                                                                                        {roomFields.length > 1 && (
                                                                                            <Button
                                                                                                type="text"
                                                                                                danger
                                                                                                icon={<DeleteOutlined />}
                                                                                                onClick={() => removeRoom(rName)}
                                                                                            />
                                                                                        )}
                                                                                    </Col>
                                                                                </Row>
                                                                            ))}
                                                                            <Button
                                                                                type="dashed"
                                                                                icon={<PlusOutlined />}
                                                                                onClick={() => addRoom()}
                                                                                block
                                                                                size="small"
                                                                                style={{ marginTop: 8 }}
                                                                            >
                                                                                Add Room Type
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </Form.List>
                                                            </Card>
                                                        );
                                                    })}
                                                </Card>
                                            );
                                        }}
                                    </Form.Item>
                                </Card>
                            ))}
                            <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => add({})}
                                block
                                style={{ marginBottom: 32, height: 48 }}
                            >
                                Add Another Group
                            </Button>
                        </div>
                    )}
                </Form.List>


                {/* Pricing */}
                <Card title="Pricing" size="small" style={{ marginBottom: 24 }}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8}>
                            <Form.Item
                                label={`Adult Price (${getSymbol(selectedCurrency)})`}
                                name="priceAdult"
                                rules={[{ required: true, message: 'Required' }]}
                                initialValue={0}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                label={`Child Price (${getSymbol(selectedCurrency)})`}
                                name="priceChild"
                                rules={[{ required: true, message: 'Required' }]}
                                initialValue={0}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={8}>
                            <Form.Item
                                label={`Infant Price (${getSymbol(selectedCurrency)})`}
                                name="priceInfant"
                                rules={[{ required: true, message: 'Required' }]}
                                initialValue={0}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item
                                label={`Total Package Price (${getSymbol(selectedCurrency)}) (Sum of all groups)`}
                                name="totalPrice"
                                initialValue={0}
                            >
                                <InputNumber
                                    readOnly
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Quotation Summary & Totals */}
                <Card title="Quotation Summary & Totals" size="small" style={{ marginBottom: 24, backgroundColor: isDark ? '#1f1f1f' : '#ffffff' }}>
                    <Table
                        dataSource={summary.groups}
                        columns={[
                            {
                                title: 'Group / Leader',
                                dataIndex: 'leaderName',
                                key: 'leaderName',
                                render: (text, record) => (
                                    <span style={{ fontWeight: 'bold' }}>
                                        {record.index ? `#${record.index} - ` : ''}{text || 'N/A'}
                                    </span>
                                )
                            },
                            {
                                title: 'Adults',
                                dataIndex: 'adults',
                                key: 'adults',
                                align: 'center'
                            },
                            {
                                title: 'Children',
                                dataIndex: 'childrenCount',
                                key: 'childrenCount',
                                align: 'center'
                            },
                            {
                                title: 'Infants',
                                dataIndex: 'infants',
                                key: 'infants',
                                align: 'center'
                            },
                            {
                                title: 'Total Passengers (PAX)',
                                dataIndex: 'pax',
                                key: 'pax',
                                align: 'center',
                                render: (val) => <Tag color="blue">{val}</Tag>
                            },
                            {
                                title: 'Subtotal Amount',
                                dataIndex: 'amount',
                                key: 'amount',
                                align: 'right',
                                render: (val) => <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{getSymbol(selectedCurrency)}{val.toFixed(2)}</span>
                            }
                        ]}
                        pagination={false}
                        rowKey="index"
                        summary={() => (
                            <Table.Summary fixed>
                                <Table.Summary.Row style={{ background: isDark ? '#262626' : '#fafafa', fontWeight: 'bold' }}>
                                    <Table.Summary.Cell index={0}>Overall Totals</Table.Summary.Cell>
                                    <Table.Summary.Cell index={1} align="center">{summary.totals.adults}</Table.Summary.Cell>
                                    <Table.Summary.Cell index={2} align="center">{summary.totals.children}</Table.Summary.Cell>
                                    <Table.Summary.Cell index={3} align="center">{summary.totals.infants}</Table.Summary.Cell>
                                    <Table.Summary.Cell index={4} align="center">
                                        <Tag color="geekblue" style={{ fontSize: '13px', padding: '2px 8px' }}>
                                            {summary.totals.pax} PAX
                                        </Tag>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={5} align="right">
                                        <span style={{ color: '#16a34a', fontSize: '15px' }}>
                                            {getSymbol(selectedCurrency)}{summary.totals.amount.toFixed(2)}
                                        </span>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            </Table.Summary>
                        )}
                    />
                </Card>

                {/* Hotel Accommodation Summary */}
                <Card title="Hotel Accommodation Summary" size="small" style={{ marginBottom: 24, backgroundColor: isDark ? '#1f1f1f' : '#ffffff' }}>
                    <Table
                        dataSource={summary.hotels || []}
                        pagination={false}
                        size="small"
                        rowKey="key"
                        columns={[
                            { title: 'Hotel', dataIndex: 'hotelName' },
                            { title: 'Nights', dataIndex: 'nights', align: 'center' },
                            { title: 'Check-in', dataIndex: 'checkIn', render: d => d ? dayjs(d).format('DD-MM-YYYY') : 'N/A' },
                            { title: 'Check-out', dataIndex: 'checkOut', render: d => d ? dayjs(d).format('DD-MM-YYYY') : 'N/A' },
                            { title: 'Single', dataIndex: 'Single', align: 'center', render: val => val || '-' },
                            { title: 'Double', dataIndex: 'Double', align: 'center', render: val => val || '-' },
                            { title: 'Triple', dataIndex: 'Triple', align: 'center', render: val => val || '-' },
                            { title: 'Quad', dataIndex: 'Quad', align: 'center', render: val => val || '-' },
                            { title: 'Suites', dataIndex: 'Suites', align: 'center', render: val => val || '-' },
                            { title: 'Family Room', dataIndex: 'Family Room', align: 'center', render: val => val || '-' },
                            { title: 'Total Rooms', dataIndex: 'totalRooms', align: 'center', render: val => <Tag color="blue">{val}</Tag> }
                        ]}
                    />
                </Card>

                {/* Additional Information */}
                <Card style={cardStyle} title="Additional Information" size="small">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Form.Item
                                label="Special Conditions"
                                name="special_conditions"
                            >
                                <Input.TextArea rows={3} placeholder="Enter special conditions" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                label="Booking Notes"
                                name="notes"
                                initialValue={``}
                            >
                                <Input.TextArea rows={3} placeholder="Enter booking notes" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item
                                label="Terms & Condition"
                                name="cancellation_policy"
                                initialValue={`Flights Booking Conditions-

· Please carefully check the passenger name(s) and flight details provided above, Passenger name(s) must exactly match the passport. We are not responsible for any issues arising from incorrect details. name change not allowed at all .

· once a deposit or full payment is made, tickets will be issued strictly based on the details provided at the time of booking. Ticket is non-refundable.  Date changes- if permitted, are subject to Airline fare rules and policies,   Applicable date-change penalties, Any fare difference, admin fee which must be paid by the passenger. Please note that some airlines do not allow date changes at all. Jumbo Travel u.k.Ltd reserves the right to cancel reservations, e-tickets &related services without any notification to the customer unless full payment for these are received.

 WE ADVISE YOU TO TAKE TRAVEL INSURANCE TO COVER THESE POSSIBILITIES.

· The deposit is strictly non-refundable and is used to cover airline cancellation and administrative charges. By making a deposit or full payment, you confirm that you have read, understood, and agreed to all the above terms and conditions.

Hotel Booking conditions-

Once a reservation is confirmed, the booking is strictly non-amendable and non-refundable. If the hotel permits modifications, guests must cancel the existing reservation and make a new booking at the current available rate. Any price difference will be the guest’s responsibility. Availability and rates at the time of rebooking are not guaranteed. Room layout, size, view, floor level, bedding configuration (e.g., twin, double, king), smoking/non-smoking preference, and special requests are subject to hotel availability. We do not guarantee specific room features. Guests must contact the hotel directly to request or confirm these preferences. We act solely as a booking agent. The hotel is fully responsible for providing accommodation services, room standards, amenities, and overall guest experience. All bookings are subject to the individual hotel’s policies, including but not limited to check-in/check-out times, security deposits, resort fees, city taxes, and incidental charges. Guests are responsible for complying with the hotel’s rules and regulations. Failure to check in on the scheduled arrival date (no-show) will result in 100% cancellation charges. Early departure or late arrival does not qualify for any refund or adjustment unless approved directly by the hotel. We are not responsible for cancellations, delays, or changes caused by events beyond our control, including natural disasters, government actions, travel restrictions, strikes, or other unforeseen circumstances. Guests are responsible for ensuring they have valid travel documents, visas, and meet entry requirements for their destination. Special requests such as extra beds, baby cots, airport transfers, or accessibility needs are not guaranteed and may incur additional charges payable directly to the hotel. We are not liable for any loss, damage, injury, theft, or inconvenience experienced during the stay. Any issues must be resolved directly with the hotel management.`}
                            >
                                <Input.TextArea
                                    rows={3} placeholder="Enter cancellation policy" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Submit Button */}
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" size="medium" loading={loading}>
                            Generate Multi-Group Quotation
                        </Button>
                        <Button size="medium" onClick={() => form.resetFields()}>
                            Reset Form
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default NewGroupQuotation;
