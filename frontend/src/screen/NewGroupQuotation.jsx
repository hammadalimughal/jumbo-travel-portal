import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Space, message, Typography, Alert } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useDataContext } from '../context/DataContext';
import { API_BASE } from '../config/data';
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext';
const { Title } = Typography;

const NewGroupQuotation = ({ isDark }) => {
    const { user } = useAuthContext()
    const navigate = useNavigate();
    const [price, setPrice] = useState({
        adults: 0,
        infant: 0,
        children: 0
    })
    const [passengerType, setPassengerType] = useState({
        adults: 0,
        infant: 0, // Keep this consistent throughout
        children: 0
    });
    const [rawCodes, setRawCodes] = useState('')
    const [processing, setProcessing] = useState(false)
    const [form] = Form.useForm();
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(false);
    const { hotels } = useDataContext()
    const [formHotels, setFormHotels] = useState([]);

    const addHotel = () => {
        const newHotel = {
            id: Date.now(),
            hotel_id: null,
            room_type: null,
            meal_plan: null,
            check_in: null,
            check_out: null,
            nights: 0,
            noOfRooms: 0,
        };
        setFormHotels([...formHotels, newHotel]);
    };

    const removeHotel = (id) => {
        setFormHotels(formHotels.filter(h => h.id !== id));
    };

    // const updateHotel = (id, field, value) => {
    //   setFormHotels(formHotels.map(h => h.id === id ? { ...h, [field]: value } : h));
    // };
    const updateHotel = (id, field, value) => {
        setFormHotels(formHotels.map(h => {
            if (h.id === id) {
                const updatedHotel = { ...h, [field]: value };

                // Auto-calculate nights if both dates exist
                if (updatedHotel.check_in && updatedHotel.check_out) {
                    const start = dayjs(updatedHotel.check_in);
                    const end = dayjs(updatedHotel.check_out);

                    // Calculate difference in days
                    const diff = end.diff(start, 'day');

                    // Ensure we don't have negative nights
                    updatedHotel.nights = diff > 0 ? diff : 0;
                }

                return updatedHotel;
            }
            return h;
        }));
    };

    const passengerOptions = Array.from({ length: 30 }, (_, i) => ({
        label: i.toString(),
        value: i,
    }));

    useEffect(() => {
        const total =
            (price.adults * passengerType.adults) +
            (price.children * passengerType.children) +
            (price.infant * passengerType.infant);

        // This physically updates the value shown in the "totalPrice" InputNumber
        form.setFieldsValue({ totalPrice: total });
    }, [price, passengerType, form]);

    const rawCodesParser = async () => {
        if (!rawCodes.trim()) {
            message.error('Please paste itinerary code first');
            return;
        }
        setProcessing(true);
        try {
            setFlights([])
            form.resetFields()
            const response = await fetch(`${API_BASE}/quotation/process-raw-codes`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify({ rawCodes })
            });
            const result = await response.json();

            if (result.success && result.data) {
                console.log(JSON.stringify(result.data))
                const { passengers, flights } = result.data;

                // Format passenger names
                const passengerNames = passengers
                    .map(p => `${p.firstName} ${p.lastName}`)
                    .join(', ');

                // Set passenger names to form
                form.setFieldValue('passengers_names', passengerNames);
                // setPassengerType({
                //   adults: passengers.filter(item => item.type.category == 'adult').length,
                //   infant: passengers.filter(item => item.type.category == 'children').length,
                //   children: passengers.filter(item => item.type.category == 'infant').length
                // })
                // Set number of adults (rough estimate - count passengers)
                const adultCount = passengers.filter(item => item.type.category === 'adult').length;
                const childCount = passengers.filter(item => item.type.category === 'children').length;
                const infantCount = passengers.filter(item => item.type.category === 'infant').length;

                // 1. Update the Form (for the UI)
                form.setFieldsValue({
                    adults: adultCount,
                    children: childCount,
                    infants: infantCount
                });

                // 2. Update the State (for the Pricing Math)
                setPassengerType({
                    adults: adultCount,
                    children: childCount,
                    infant: infantCount // Match your state key name
                });

                // Parse and set flights
                if (flights && flights.length > 0) {
                    const parsedFlights = flights.map((flight, index) => ({
                        ...flight,
                        id: Date.now() + index,
                        from: flight.origin?.city || flight.origin?.iata || '',
                        to: flight.destination?.city || flight.destination?.iata || '',
                        // Use .utc(true) to parse the string and keep the time exactly as is
                        date: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
                        departureDateTime: flight.departureISO ? dayjs.utc(flight.departureISO) : null,
                        arrivalDateTime: flight.arrivalISO ? dayjs.utc(flight.arrivalISO) : null,
                        airline: flight.airline?.name || flight.airline?.iata || ''
                    }));
                    setFlights(parsedFlights);
                }

                message.success('Data parsed and auto-filled successfully!');
            } else {
                message.error(result.error || 'Failed to parse itinerary');
            }
        } catch (error) {
            console.error(error);
            message.error('Error parsing itinerary: ' + error.message);
        } finally {
            setProcessing(false);
        }
    }

    const hotelOptions = hotels.map((item) => ({
        // Use the actual database ID instead of a hardcoded 1
        value: item._id,
        label: `${item.name} ${item.hotelType ? ` - ${item.hotelType} Stars` : ''}`,
        location: `${item.city}, ${item.country}`,
    }));

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

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const isHotelsValid = formHotels.every(h =>
                h.hotel_id && h.room_type && h.meal_plan && h.check_in && h.check_out && h.nights >= 0 && h.noOfRooms > 0
            );

            if (formHotels.length > 0 && !isHotelsValid) {
                message.error("Please fill in all hotel details (Room, Dates, Nights).");
                return;
            }
            // Format dates
            const formData = {
                ...values,
                created_by: user.id,
                travel_date: values.travel_date ? values.travel_date.format('YYYY-MM-DD') : null,
                check_in: values.check_in ? values.check_in.format('YYYY-MM-DD') : null,
                check_out: values.check_out ? values.check_out.format('YYYY-MM-DD') : null,
                flights: flights.map((f) => ({
                    ...f,
                    date: f.date ? f.date.format('YYYY-MM-DD') : null,
                    departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
                    arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null
                })),
                hotels: formHotels.map(h => ({
                    ...h,
                    check_in: h.check_in ? h.check_in.format('YYYY-MM-DD') : null,
                    check_out: h.check_out ? h.check_out.format('YYYY-MM-DD') : null
                }))
            };

            // Here you would send formData to your backend
            console.log('Form Data:', formData);
            const response = await fetch(`${API_BASE}/quotation/generate-invoice`, {
                method: 'POST',
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const result = await response.json();
            console.log(result)
            if (result.success) {
                message.success('Quotation saved successfully!');
                navigate('/quotations')
                return
            }
            message.error(result.error);
        } catch (error) {
            message.error('Failed to save quotation');
        } finally {
            setLoading(false);
        }
    };// Add these helper functions at the top of your component
    const disabledCheckIn = (current) => {
        // Can't select days before today
        return current && current < dayjs().startOf('day');
    };

    const disabledCheckOut = (checkInDate) => (current) => {
        // Allow the same day by only disabling dates strictly BEFORE the check-in date
        return current && current < dayjs(checkInDate).startOf('day');
    };

    const cardStyle = {
        backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
        marginBottom: 24,
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <Title level={3} style={{ marginBottom: 0 }}>New Group Quotation</Title>
            </div>

            {/* AI Convert Section */}
            <Card style={cardStyle} size="small">
                <div style={{ marginBottom: 16 }}>
                    {/* <div style={{ 
                padding: '12px 16px', 
                backgroundColor: '#e6f4ff', 
                border: '1px solid #91caff',
                borderRadius: '4px',
                marginBottom: 16,
                color: '#0050b3'
              }}>
                Paste Amadeus / Airline Itinerary Code then click AI Convert to auto-fill.
              </div> */}
                    <Alert title="Paste Amadeus / Airline Itinerary Code then click convert to auto-fill" style={{ marginBottom: 8 }} type="info" />
                    <Form.Item name="raw_itinerary" style={{ marginBottom: 8 }}>
                        <Input.TextArea
                            rows={6}
                            placeholder="Paste itinerary..."
                            id="raw_itinerary"
                            // ✅ Use e.target.value to get the string
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
                autoComplete="off"
            >
                {/* Customer Details */}
                <Card style={cardStyle} title="Customer Details" size="small">
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Group Leader Name"
                                name="customer_name"
                                rules={[{ required: true, message: 'Please enter group leader name' }]}
                            >
                                <Input placeholder="Enter group leader name" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Email"
                                name="customer_email"
                                rules={[
                                    { type: 'email', message: 'Invalid email' },
                                ]}
                            >
                                <Input placeholder="Enter email" type="email" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Phone"
                                name="customer_phone"
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
                                label="Travel Date"
                                name="travel_date"
                                rules={[{ required: true, message: 'Please select travel date' }]}
                            >
                                <DatePicker
                                    format="DD-MM-YYYY" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Passengers Names"
                                name="passengers_names"
                            >
                                <Input.TextArea rows={3} placeholder="Auto-populated" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Adults"
                                name="adults"
                                initialValue={0}
                            >
                                <Select
                                    onChange={(val) => setPassengerType({ ...passengerType, adults: val })}
                                    options={passengerOptions}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Children"
                                name="children"
                                initialValue={0}
                            >
                                <Select
                                    onChange={(val) => setPassengerType({ ...passengerType, children: val })}
                                    options={passengerOptions}
                                />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Form.Item
                                label="Infants"
                                name="infants"
                                initialValue={0}
                            >
                                <Select
                                    onChange={(val) => setPassengerType({ ...passengerType, infant: val })}
                                    options={passengerOptions}
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
                                                <Button
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeFlight(flight.id)}
                                                >
                                                    Remove
                                                </Button>
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
                    >
                        Add Flight Segment
                    </Button>
                </Card>

                {/* Hotel Details */}
                <Card style={cardStyle} title="Hotel Details" size="small">
                    <div style={{ marginBottom: 16 }}>
                        {formHotels.length === 0 ? (
                            <p style={{ color: '#999' }}>No hotels added yet</p>
                        ) : (
                            formHotels.map((hotel) => (
                                <Card
                                    key={hotel.id}
                                    style={{ marginBottom: 12, backgroundColor: isDark ? '#262626' : '#fafafa' }}
                                    extra={
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeHotel(hotel.id)}
                                        />
                                    }
                                >
                                    <Row gutter={[16, 16]}>
                                        {/* 1. Hotel Selection - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Hotel"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Please select a hotel' }]}
                                            >
                                                <Select
                                                    placeholder="-- Select Hotel --"
                                                    options={hotelOptions}
                                                    value={hotel._id}
                                                    onChange={(val) => updateHotel(hotel.id, 'hotel_id', val)}
                                                />
                                            </Form.Item>
                                        </Col>

                                        {/* 2. Room Type - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Room Type"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Room type is required' }]}
                                            >
                                                <Select
                                                    placeholder="Select Room type"
                                                    value={hotel.room_type}
                                                    onChange={(val) => updateHotel(hotel.id, 'room_type', val)}
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
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="No. of Rooms"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'No of rooms is required' }]}
                                            >
                                                <InputNumber
                                                    min={1}
                                                    style={{ width: '100%' }}
                                                    placeholder="Number of rooms"
                                                    value={hotel.noOfRooms}
                                                    onChange={(val) => updateHotel(hotel.id, 'noOfRooms', val)}
                                                />
                                            </Form.Item>
                                        </Col>

                                        {/* 3. Meal Plan - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Meal Plan"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Meal plan is required' }]}
                                            >
                                                <Select
                                                    placeholder="Select meal plan"
                                                    value={hotel.meal_plan}
                                                    onChange={(val) => updateHotel(hotel.id, 'meal_plan', val)}
                                                    options={[
                                                        { label: "Room Only", value: "Room Only" },
                                                        { label: "Breakfast", value: "Breakfast" },
                                                        { label: "Half Board", value: "Half Board" },
                                                        { label: "Full Board", value: "Full Board" }
                                                    ]}
                                                />
                                            </Form.Item>
                                        </Col>

                                        {/* 4. Check-in - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Check-in"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Check-in date is required' }]}
                                            >
                                                <DatePicker
                                                    format="DD-MM-YYYY"
                                                    style={{ width: '100%' }}
                                                    disabledDate={disabledCheckIn}
                                                    value={hotel.check_in}
                                                    onChange={(date) => updateHotel(hotel.id, 'check_in', date)}
                                                />
                                            </Form.Item>
                                        </Col>

                                        {/* 5. Check-out - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Check-out"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Check-out date is required' }]}
                                            >
                                                <DatePicker
                                                    format="DD-MM-YYYY"
                                                    style={{ width: '100%' }}
                                                    value={hotel.check_out}
                                                    disabled={!hotel.check_in}
                                                    disabledDate={disabledCheckOut(hotel.check_in)}
                                                    onChange={(date) => updateHotel(hotel.id, 'check_out', date)}
                                                />
                                            </Form.Item>
                                        </Col>

                                        {/* 6. Nights - REQUIRED */}
                                        <Col xs={24} sm={12} md={8}>
                                            <Form.Item
                                                label="Nights"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: true, message: 'Nights count is required' }]}
                                            >
                                                <InputNumber
                                                    min={0}
                                                    style={{ width: '100%' }}
                                                    placeholder="Number of nights"
                                                    value={hotel.nights}
                                                    onChange={(val) => updateHotel(hotel.id, 'nights', val)}
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
                        onClick={addHotel}
                        block
                    >
                        Add Hotel Room
                    </Button>
                </Card>

                {/* Pricing */}
                <Card title="Pricing" size="small" style={{ marginBottom: 24 }}>
                    <Row gutter={[16, 16]}>
                        {/* Adult Price */}
                        <Col xs={24} sm={8}>
                            <Form.Item
                                label="Adult Price (£)"
                                name="priceAdult"
                                rules={[{ required: passengerType.adults, message: 'Required' }]}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    onChange={val => setPrice({ ...price, adults: Number(val) })}
                                />
                            </Form.Item>
                        </Col>

                        {/* Child Price - FIXED: Moved onChange to InputNumber */}
                        <Col xs={24} sm={8}>
                            <Form.Item
                                label="Child Price (£)"
                                name="priceChild"
                                rules={[{ required: passengerType.children, message: 'Required' }]}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    onChange={val => setPrice({ ...price, children: Number(val) })}
                                />
                            </Form.Item>
                        </Col>

                        {/* Infant Price */}
                        <Col xs={24} sm={8}>
                            <Form.Item
                                label="Infant Price (£)"
                                name="priceInfant"
                                rules={[{ required: passengerType.infant, message: 'Required' }]}
                            >
                                <InputNumber
                                    min={0}
                                    step={0.01}
                                    style={{ width: '100%' }}
                                    onChange={val => setPrice({ ...price, infant: Number(val) })}
                                />
                            </Form.Item>
                        </Col>

                        {/* Total Price - READ ONLY suggested */}
                        <Col span={24}>
                            <Form.Item
                                label="Total Package Price (£)"
                                name="totalPrice"
                            >
                                <InputNumber
                                    readOnly
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
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
                            Generate Quotation
                        </Button>
                        <Button size="medium">
                            Reset Form
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </div>
    );
};

export default NewGroupQuotation;
