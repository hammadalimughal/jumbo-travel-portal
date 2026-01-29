import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, Row, Col, Space, message, Typography, Alert } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDataContext } from '../context/DataContext';
import { API_BASE } from '../config/data';
const { Title } = Typography;

const Quotation = ({ isDark }) => {
  const [passengerType, setPassengerType] = useState({
    adults: 0,
    infant: 0,
    children: 0
  })
  const [rawCodes, setRawCodes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [form] = Form.useForm();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const { hotels } = useDataContext()
  const passengerOptions = Array.from({ length: 30 }, (_, i) => ({
    label: i.toString(),
    value: i,
  }));

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

        // Set number of adults (rough estimate - count passengers)
        form.setFieldValue('adults', passengers.length);

        // Parse and set flights
        if (flights && flights.length > 0) {
          const parsedFlights = flights.map((flight, index) => ({
            id: Date.now() + index,
            from: flight.origin?.city || flight.origin?.iata || '',
            to: flight.destination?.city || flight.destination?.iata || '',
            date: flight.departureISO ? dayjs(flight.departureISO) : null,
            departureDateTime: flight.departureISO ? dayjs(flight.departureISO) : null,
            arrivalDateTime: flight.arrivalISO ? dayjs(flight.arrivalISO) : null,
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
    value: 1,
    label: item.name,
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
      // Format dates
      const formData = {
        ...values,
        travel_date: values.travel_date ? values.travel_date.format('YYYY-MM-DD') : null,
        check_in: values.check_in ? values.check_in.format('YYYY-MM-DD') : null,
        check_out: values.check_out ? values.check_out.format('YYYY-MM-DD') : null,
        flights: flights.map((f) => ({
          ...f,
          date: f.date ? f.date.format('YYYY-MM-DD') : null,
          departureDateTime: f.departureDateTime ? f.departureDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
          arrivalDateTime: f.arrivalDateTime ? f.arrivalDateTime.format('YYYY-MM-DD HH:mm:ss') : null,
        })),
      };

      // Here you would send formData to your backend
      console.log('Form Data:', formData);
      message.success('Quotation saved successfully!');
    } catch (error) {
      message.error('Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
    marginBottom: 24,
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <Title level={3} style={{ marginBottom: 0 }}>New Quotation</Title>
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
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Passengers Names"
                name="passengers_names"
              >
                <Input.TextArea rows={3} placeholder="Auto-populated" readOnly />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Adults"
                name="adults"
                initialValue={1}
              >
                <Select options={passengerOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Children"
                name="children"
                initialValue={0}
              >
                <Select options={passengerOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Infants"
                name="infants"
                initialValue={0}
              >
                <Select options={passengerOptions} />
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
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Hotel"
                name="hotel_id"
              >
                <Select
                  placeholder="-- Select Hotel --"
                  options={hotelOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Room Type"
                name="room_type"
              >
                <Input placeholder="Enter room type" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Meal Plan"
                name="meal_plan"
              >
                <Input placeholder="Enter meal plan" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Check-in"
                name="check_in"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Check-out"
                name="check_out"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                label="Nights"
                name="nights"
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Number of nights" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Pricing */}
        <Card style={cardStyle} title="Pricing" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12}>
              <Form.Item
                label="Total Package Price (£)"
                name="total_price"
                rules={[{ required: true, message: 'Please enter total price' }]}
              >
                <InputNumber
                  step={0.01}
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0.00"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item
                label="Price Per Person (£)"
                name="price_per_person"
                rules={[{ required: true, message: 'Please enter price per person' }]}
              >
                <InputNumber
                  step={0.01}
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="0.00"
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
                label="Cancellation Policy"
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
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Generate Quotation
            </Button>
            <Button size="large">
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Quotation;
