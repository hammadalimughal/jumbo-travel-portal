import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Space, message, Typography, Alert, Spin } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useDataContext } from '../context/DataContext';
import { API_BASE } from '../config/data';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
const { Title } = Typography;

const EditQuotation = ({ isDark }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { id } = useParams();

  const [price, setPrice] = useState({
    adults: 0,
    infant: 0,
    children: 0
  });
  const [passengerType, setPassengerType] = useState({
    adults: 0,
    infant: 0,
    children: 0
  });
  const [rawCodes, setRawCodes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [form] = Form.useForm();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quotationLoading, setQuotationLoading] = useState(true);
  const { hotels } = useDataContext();
  const [formHotels, setFormHotels] = useState([]);

  // Fetch quotation details on mount
  useEffect(() => {
    const fetchQuotationDetails = async () => {
      try {
        const response = await fetch(`${API_BASE}/quotation/detail/${id}`);
        const result = await response.json();
        if (result.success && result.data) {
          const qData = result.data;

          // Prefill Form fields
          form.setFieldsValue({
            customer_name: qData.customer_name,
            customer_email: qData.customer_email,
            customer_phone: qData.customer_phone,
            travel_date: qData.travel_date ? dayjs.utc(qData.travel_date) : null,
            passengers_names: qData.passengers_names,
            adults: qData.passenger_counts?.adults || 0,
            children: qData.passenger_counts?.children || 0,
            infants: qData.passenger_counts?.infants || 0,
            priceAdult: qData.pricing?.priceAdult || 0,
            priceChild: qData.pricing?.priceChild || 0,
            priceInfant: qData.pricing?.priceInfant || 0,
            totalPrice: qData.pricing?.totalPrice || 0,
            special_conditions: qData.special_conditions,
            notes: qData.notes,
            cancellation_policy: qData.cancellation_policy
          });

          // Prefill state variables for pricing auto-calculations
          setPrice({
            adults: qData.pricing?.priceAdult || 0,
            children: qData.pricing?.priceChild || 0,
            infant: qData.pricing?.priceInfant || 0
          });

          setPassengerType({
            adults: qData.passenger_counts?.adults || 0,
            children: qData.passenger_counts?.children || 0,
            infant: qData.passenger_counts?.infants || 0
          });

          // Prefill flights state
          if (qData.flights && qData.flights.length > 0) {
            const loadedFlights = qData.flights.map((f, index) => ({
              ...f,
              id: f._id || (Date.now() + index),
              from: f.from || '',
              to: f.to || '',
              date: f.date ? dayjs.utc(f.date) : null,
              departureDateTime: f.departureDateTime ? dayjs.utc(f.departureDateTime) : null,
              arrivalDateTime: f.arrivalDateTime ? dayjs.utc(f.arrivalDateTime) : null,
              airline: f.airline || ''
            }));
            setFlights(loadedFlights);
          }

          // Prefill hotels state
          if (qData.hotels && qData.hotels.length > 0) {
            const loadedHotels = qData.hotels.map((h, index) => {
              let rooms = h.rooms || [];
              if (rooms.length === 0 && (h.room_type || h.noOfRooms || h.meal_plan)) {
                rooms = [
                  {
                    id: Date.now() + index + 999,
                    room_type: h.room_type,
                    noOfRooms: h.noOfRooms || 1,
                    meal_plan: h.meal_plan
                  }
                ];
              }
              if (rooms.length === 0) {
                rooms = [
                  {
                    id: Date.now() + index + 999,
                    room_type: null,
                    noOfRooms: 1,
                    meal_plan: null
                  }
                ];
              }

              return {
                id: h._id || (Date.now() + index),
                hotel_id: h.hotel_id?._id || h.hotel_id,
                check_in: h.check_in ? dayjs.utc(h.check_in) : null,
                check_out: h.check_out ? dayjs.utc(h.check_out) : null,
                nights: h.nights || 0,
                rooms: rooms.map((r, rIdx) => ({
                  ...r,
                  id: r.id || r._id || (Date.now() + index + rIdx + 1000)
                }))
              };
            });
            setFormHotels(loadedHotels);
          }
        } else {
          message.error(result.error || 'Failed to fetch quotation details');
        }
      } catch (error) {
        console.error(error);
        message.error('Error fetching quotation details: ' + error.message);
      } finally {
        setQuotationLoading(false);
      }
    };

    if (id) {
      fetchQuotationDetails();
    }
  }, [id, form]);

  const addHotel = () => {
    const newHotel = {
      id: Date.now(),
      hotel_id: null,
      check_in: null,
      check_out: null,
      nights: 0,
      rooms: [
        {
          id: Date.now() + 1,
          room_type: null,
          noOfRooms: 1,
          meal_plan: null
        }
      ]
    };
    setFormHotels([...formHotels, newHotel]);
  };

  const removeHotel = (id) => {
    setFormHotels(formHotels.filter(h => h.id !== id));
  };

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

  const addRoomToHotel = (hotelId) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: [
            ...(h.rooms || []),
            {
              id: Date.now(),
              room_type: null,
              noOfRooms: 1,
              meal_plan: null
            }
          ]
        };
      }
      return h;
    }));
  };

  const removeRoomFromHotel = (hotelId, roomId) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: (h.rooms || []).filter(r => r.id !== roomId)
        };
      }
      return h;
    }));
  };

  const updateRoomInHotel = (hotelId, roomId, field, value) => {
    setFormHotels(formHotels.map(h => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: (h.rooms || []).map(r => r.id === roomId ? { ...r, [field]: value } : r)
        };
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

    // Physical update of the value shown in the "totalPrice" InputNumber
    form.setFieldsValue({ totalPrice: total });
  }, [price, passengerType, form]);

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
        const { passengers, flights } = result.data;

        // Format passenger names
        const passengerNames = passengers
          .map(p => `${p.firstName} ${p.lastName}`)
          .join(', ');

        // Set passenger names to form
        form.setFieldValue('passengers_names', passengerNames);

        // Count passengers
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
          infant: infantCount
        });

        // Parse and set flights
        if (flights && flights.length > 0) {
          const parsedFlights = flights.map((flight, index) => ({
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

        message.success('Data parsed and flight segments updated successfully!');
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

  const hotelOptions = hotels.map((item) => ({
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
        h.hotel_id && h.check_in && h.check_out && h.nights >= 0 &&
        h.rooms && h.rooms.length > 0 && h.rooms.every(r => r.room_type && r.meal_plan && r.noOfRooms > 0)
      );

      if (formHotels.length > 0 && !isHotelsValid) {
        message.error("Please fill in all hotel details (Room types, Meal plans, Dates, Nights).");
        return;
      }

      // Format dates
      const formData = {
        ...values,
        created_by: user.id,
        travel_date: values.travel_date ? values.travel_date.format('YYYY-MM-DD') : null,
        flights: flights.map((f) => ({
          ...f,
          date: f.date ? f.date.format('YYYY-MM-DD') : null,
          departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
          arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null
        })),
        hotels: formHotels.map(h => {
          const firstRoom = h.rooms?.[0] || {};
          return {
            hotel_id: h.hotel_id,
            check_in: h.check_in ? h.check_in.format('YYYY-MM-DD') : null,
            check_out: h.check_out ? h.check_out.format('YYYY-MM-DD') : null,
            nights: h.nights,
            rooms: (h.rooms || []).map(r => ({
              room_type: r.room_type,
              noOfRooms: r.noOfRooms,
              meal_plan: r.meal_plan
            })),
            room_type: firstRoom.room_type,
            noOfRooms: firstRoom.noOfRooms || 1,
            meal_plan: firstRoom.meal_plan
          };
        })
      };

      console.log('Update Form Data:', formData);
      const response = await fetch(`${API_BASE}/quotation/update/${id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (result.success) {
        message.success('Quotation updated successfully!');
        navigate('/quotations');
        return;
      }
      message.error(result.error);
    } catch (error) {
      message.error('Failed to update quotation');
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

  if (quotationLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading quotation details..." />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Title level={3} style={{ marginBottom: 0 }}>Edit Quotation</Title>
      </div>

      {/* AI Convert Section */}
      <Card style={cardStyle} size="small">
        <div style={{ marginBottom: 16 }}>
          <Alert message="Paste Amadeus / Airline Itinerary Code then click convert to update flight details." style={{ marginBottom: 8 }} type="info" />
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
        autoComplete="off"
      >
        {/* Customer Details */}
        <Card style={cardStyle} title="Customer Details" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Customer Name"
                name="customer_name"
                rules={[{ required: true, message: 'Please enter customer name' }]}
              >
                <Input placeholder="Enter customer name" />
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
                <DatePicker format="DD-MM-YYYY" style={{ width: '100%' }} />
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
                    <Col xs={24} sm={12} md={6}>
                      <Form.Item
                        label="Hotel"
                        style={{ marginBottom: 0 }}
                        required
                      >
                        <Select
                          placeholder="-- Select Hotel --"
                          options={hotelOptions}
                          value={hotel.hotel_id}
                          onChange={(val) => updateHotel(hotel.id, 'hotel_id', val)}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item
                        label="Check-in"
                        style={{ marginBottom: 0 }}
                        required
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

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item
                        label="Check-out"
                        style={{ marginBottom: 0 }}
                        required
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

                    <Col xs={24} sm={12} md={6}>
                      <Form.Item
                        label="Nights"
                        style={{ marginBottom: 0 }}
                        required
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

                  <div style={{ marginTop: 16, padding: 12, borderRadius: 8, border: '1px dashed #d9d9d9', background: isDark ? '#1f1f1f' : '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 'bold' }}>Rooms Configuration</span>
                      <Button 
                        type="link" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={() => addRoomToHotel(hotel.id)}
                      >
                        Add Room Type
                      </Button>
                    </div>

                    {(hotel.rooms || []).map((room, rIdx) => (
                      <Row gutter={[8, 8]} key={room.id || rIdx} align="middle" style={{ marginBottom: 8 }}>
                        <Col xs={24} sm={8}>
                          <Select
                            placeholder="Room Type"
                            style={{ width: '100%' }}
                            value={room.room_type}
                            onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'room_type', val)}
                            options={[
                              { label: "Single", value: "Single" },
                              { label: "Double", value: "Double" },
                              { label: "Triple", value: "Triple" },
                              { label: "Quad", value: "Quad" },
                              { label: "Suites", value: "Suites" },
                              { label: "Family Room", value: "Family Room" }
                            ]}
                          />
                        </Col>
                        <Col xs={12} sm={6}>
                          <InputNumber
                            min={1}
                            placeholder="No. of Rooms"
                            style={{ width: '100%' }}
                            value={room.noOfRooms}
                            onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'noOfRooms', val)}
                          />
                        </Col>
                        <Col xs={12} sm={8}>
                          <Select
                            placeholder="Meal Plan"
                            style={{ width: '100%' }}
                            value={room.meal_plan}
                            onChange={(val) => updateRoomInHotel(hotel.id, room.id, 'meal_plan', val)}
                            options={[
                              { label: "Room Only", value: "Room Only" },
                              { label: "Breakfast", value: "Breakfast" },
                              { label: "Half Board", value: "Half Board" },
                              { label: "Full Board", value: "Full Board" }
                            ]}
                          />
                        </Col>
                        <Col xs={24} sm={2} style={{ textAlign: 'right' }}>
                          <Button
                            type="text"
                            danger
                            disabled={(hotel.rooms || []).length <= 1}
                            icon={<DeleteOutlined />}
                            onClick={() => removeRoomFromHotel(hotel.id, room.id)}
                          />
                        </Col>
                      </Row>
                    ))}
                  </div>
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
              >
                <Input.TextArea rows={3} placeholder="Enter booking notes" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Terms & Condition"
                name="cancellation_policy"
              >
                <Input.TextArea rows={3} placeholder="Enter cancellation policy" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Submit Button */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" size="medium" loading={loading}>
              Save Quotation Changes
            </Button>
            <Button size="medium" onClick={() => navigate('/quotations')}>
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default EditQuotation;
