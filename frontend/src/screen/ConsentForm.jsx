import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Checkbox, Button, Result, Spin, Typography, Space, Collapse } from 'antd';
import { FileTextOutlined, SignatureOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../config/data';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const ConsentForm = ({ isDark }) => {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [quotation, setQuotation] = useState(null);
    const [error, setError] = useState(null);
    const [typedSignature, setTypedSignature] = useState('');
    const [form] = Form.useForm();

    const fetchConsentStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/quotation/consent/${id}`);
            const result = await response.json();
            if (result.success) {
                setQuotation(result.data);
                if (result.data.consent?.clientName) {
                    setTypedSignature(result.data.consent.signature || result.data.consent.clientName);
                }
            } else {
                setError(result.error || 'Quotation consent details not found.');
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch consent details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsentStatus();
    }, [id]);

    const handleFormSubmit = async (values) => {
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/quotation/submit-consent/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientName: values.clientName,
                    signature: values.signature,
                }),
            });
            const result = await response.json();
            if (result.success) {
                setQuotation(result.data);
            } else {
                setError(result.error || 'Failed to submit consent.');
            }
        } catch (err) {
            setError(err.message || 'Error occurred while submitting consent.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: isDark ? '#141414' : '#f5f5f5' }}>
                <Spin size="large" tip="Loading consent form..." />
            </div>
        );
    }

    const containerStyle = {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: isDark ? 'radial-gradient(circle, #262626 0%, #141414 100%)' : 'radial-gradient(circle, #f0f2f5 0%, #e6f7ff 100%)',
        padding: '20px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    };

    const cardStyle = {
        maxWidth: '650px',
        width: '100%',
        boxShadow: isDark ? '0 8px 32px 0 rgba(0, 0, 0, 0.5)' : '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
        borderRadius: '12px',
        border: isDark ? '1px solid #303030' : '1px solid #e8e8e8',
        background: isDark ? '#1f1f1f' : '#ffffff',
    };

    if (error) {
        return (
            <div style={containerStyle}>
                <Card style={cardStyle}>
                    <Result
                        status="error"
                        title="Unable to load consent page"
                        subTitle={error}
                        extra={[
                            <Button type="primary" key="retry" onClick={fetchConsentStatus}>
                                Retry
                            </Button>
                        ]}
                    />
                </Card>
            </div>
        );
    }

    const isAgreed = quotation?.consent?.status === 'Agreed';

    return (
        <div style={containerStyle}>
            <Card style={cardStyle}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'inline-block', padding: '12px', borderRadius: '50%', background: isDark ? '#262626' : '#e6f7ff', marginBottom: '16px' }}>
                        <SignatureOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                    </div>
                    <Title level={3} style={{ margin: 0 }}>Booking Consent Agreement</Title>
                    <Text type="secondary">Quotation Reference: <b>{quotation?.quotation_no}</b></Text>
                </div>

                {isAgreed ? (
                    <div style={{ textAlign: 'center' }}>
                        <Result
                            status="success"
                            title="Consent Confirmed!"
                            subTitle={
                                <Space direction="vertical" style={{ width: '100%', marginTop: '8px' }}>
                                    <Paragraph style={{ margin: 0 }}>
                                        Thank you, <b>{quotation.consent?.clientName}</b>. You have successfully agreed to this booking.
                                    </Paragraph>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        Agreed on {dayjs(quotation.consent?.agreedAt).format('DD MMM YYYY, hh:mm A')} from IP: {quotation.consent?.ipAddress}
                                    </Text>
                                    {quotation.consent?.signature && (
                                        <div style={{ marginTop: '16px', padding: '12px', background: isDark ? '#262626' : '#fafafa', borderRadius: '8px', border: '1px dashed #d9d9d9', display: 'inline-block' }}>
                                            <Text type="secondary" style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Digitally Signed by</Text>
                                            <span style={{ fontFamily: '"Caveat", "Brush Script MT", cursive', fontSize: '26px', color: '#1890ff' }}>
                                                {quotation.consent.signature}
                                            </span>
                                        </div>
                                    )}
                                </Space>
                            }
                            extra={[
                                <Button type="primary" size="large" key="view-details" href={`/booking-detail/${id}`} style={{ background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)', border: 'none', borderRadius: '6px' }}>
                                    View Permanent Booking Details
                                </Button>
                            ]}
                        />
                    </div>
                ) : (
                    <div>
                        <Paragraph>
                            Hello <b>{quotation?.customer_name}</b>,
                        </Paragraph>
                        <Paragraph>
                            Please review your travel details, itinerary, pricing, and terms below. If everything is correct and you accept the terms and conditions, complete the declarations and sign to confirm.
                        </Paragraph>

                        <div style={{ margin: '20px 0', padding: '16px', background: isDark ? '#262626' : '#f0f5ff', borderRadius: '8px', border: isDark ? '1px solid #333' : '1px solid #d6e4ff', textAlign: 'center' }}>
                            <Space align="center" size="small">
                                <FileTextOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
                                <a href={`/booking-detail/${id}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                    Review Full Booking Details & Itinerary (Opens in New Tab)
                                </a>
                            </Space>
                        </div>

                        {/* --- Flight & Hotel Booking Terms & Conditions --- */}
                        <Collapse ghost style={{ background: isDark ? '#141414' : '#fafafa', borderRadius: '8px', border: '1px solid #d9d9d9', marginBottom: '24px' }}>
                            <Panel header={<span style={{ fontWeight: '600' }}><InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} /> Flight & Hotel Booking Terms & Conditions</span>} key="terms">
                                <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px', fontSize: '13px', lineHeight: '1.6' }}>
                                    <p><b>By making a booking, paying a deposit, or making full payment, the customer confirms that they have read, understood, and agreed to all booking terms and conditions outlined below.</b></p>
                                    
                                    <h4>1. Passenger Names & Travel Documents</h4>
                                    <ul>
                                        <li>It is the customer's responsibility to provide all passenger names exactly as they appear in the passport.</li>
                                        <li>Any name correction or amendment requested after ticket issuance may result in airline fees, fare differences, or may not be permitted by the airline.</li>
                                        <li>The customer is responsible for ensuring that all passports, visas, and travel documents are valid and meet the requirements of the destination country.</li>
                                        <li>Passports must generally be valid for at least six (6) months beyond the return travel date unless otherwise specified by the destination country's regulations.</li>
                                        <li>We are not responsible for denied boarding, refused entry, visa issues, or travel disruptions resulting from incorrect, expired, or insufficient travel documents.</li>
                                    </ul>

                                    <h4>2. Flight Booking Conditions</h4>
                                    <ul>
                                        <li>Most airline tickets are non-refundable, non-changeable, and non-transferable after booking confirmation.</li>
                                        <li>Certain airlines may permit cancellations or changes subject to airline rules, cancellation penalties, administration fees, and applicable fare differences.</li>
                                        <li>If a flight change is permitted by the airline, the customer will be responsible for airline change fees, fare/tax increases, and supplier administration fees.</li>
                                        <li>No-show tickets (where a passenger fails to travel without prior notice) are strictly non-refundable and non-changeable.</li>
                                        <li>Flight schedules, routes, aircraft types, seat assignments, and services are subject to change by the airline without prior notice.</li>
                                        <li>We act solely as a travel agent and do not control airline policies, schedule changes, cancellations, delays, baggage rules, or operational decisions.</li>
                                    </ul>

                                    <h4>3. Hotel Booking Conditions</h4>
                                    <ul>
                                        <li>Hotel reservations are generally non-transferable and may not be amended after confirmation unless permitted by the hotel.</li>
                                        <li>Non-refundable hotel bookings are strictly non-changeable, non-cancellable, and non-refundable.</li>
                                        <li>Early departure, late arrival, no-show, or unused nights may not qualify for any refund.</li>
                                        <li>Special requests (such as adjoining rooms, specific views, bedding preferences) cannot be guaranteed and remain subject to hotel availability.</li>
                                    </ul>

                                    <h4>4. Deposits & Payments</h4>
                                    <ul>
                                        <li>A booking is not confirmed until the required deposit or full payment has been received and confirmation has been issued.</li>
                                        <li>Failure to make payment by the due date may result in automatic cancellation of the booking and loss of any deposits paid.</li>
                                    </ul>

                                    <h4>5. Customer Responsibility</h4>
                                    <ul>
                                        <li>The customer is responsible for reviewing all booking details immediately upon receipt and verifying passenger names, dates, and destinations.</li>
                                        <li>Obtaining required visas, transit permits, health certificates, vaccinations, and arriving with sufficient time for airport check-in.</li>
                                    </ul>

                                    <h4>6. Travel Insurance</h4>
                                    <ul>
                                        <li>We strongly recommend that all customers purchase comprehensive travel insurance covering trip cancellation, medical expenses, personal belongings, and travel delays.</li>
                                    </ul>

                                    <h4>7. Agency Responsibility</h4>
                                    <ul>
                                        <li>We act solely as an intermediary between the customer and travel suppliers. We are not liable for supplier actions, schedule changes, cancellations, overbookings, strikes, weather disruptions, or force majeure events.</li>
                                    </ul>
                                </div>
                            </Panel>
                        </Collapse>

                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleFormSubmit}
                            style={{ marginTop: '24px' }}
                            initialValues={{ clientName: quotation?.customer_name }}
                        >
                            <Form.Item
                                name="clientName"
                                label="Your Full Name"
                                rules={[{ required: true, message: 'Please enter your full name' }]}
                            >
                                <Input placeholder="John Doe" size="large" />
                            </Form.Item>

                            <Form.Item
                                name="signature"
                                label="Signature (Type your name to sign)"
                                rules={[{ required: true, message: 'Please type your name to sign' }]}
                            >
                                <Input
                                    placeholder="Type name here"
                                    size="large"
                                    onChange={(e) => setTypedSignature(e.target.value)}
                                />
                            </Form.Item>

                            {typedSignature && (
                                <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', background: isDark ? '#141414' : '#fafafa', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                                    <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>Your Digital Signature</Text>
                                    <span style={{ fontFamily: '"Caveat", "Brush Script MT", cursive', fontSize: '32px', color: '#1890ff', letterSpacing: '1px' }}>
                                        {typedSignature}
                                    </span>
                                </div>
                            )}

                            {/* --- Individual Customer Declarations --- */}
                            <Title level={5} style={{ marginBottom: '16px', marginTop: '8px' }}>Customer Declaration</Title>

                            <Form.Item
                                name="decl_terms"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to confirm you agree.')) }]}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>I have read and understood the booking terms and conditions.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item
                                name="decl_names"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to confirm names are exact.')) }]}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>All passenger names have been provided exactly as shown in the passport.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item
                                name="decl_passports"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to confirm passport validity.')) }]}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>I have verified that all passports are valid for at least six (6) months beyond the return travel date and that all required travel documents are available.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item
                                name="decl_refunds"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to confirm you understand the refund policy.')) }]}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>I understand that most airline tickets and hotel bookings may be non-refundable, non-changeable, and non-transferable.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item
                                name="decl_fees"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to confirm you understand amendment fees.')) }]}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>I understand that any permitted changes may be subject to penalties, administration fees, supplier charges, and fare or rate differences.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item
                                name="decl_deposit"
                                valuePropName="checked"
                                rules={[{ validator: (_, val) => val ? Promise.resolve() : Promise.reject(new Error('Please check this box to accept terms on behalf of all passengers.')) }]}
                                style={{ marginBottom: '24px' }}
                            >
                                <Checkbox><Text strong={!isDark} style={{ color: isDark ? '#bfbfbf' : 'inherit' }}>I understand that by paying a deposit or full payment, I am accepting these booking terms and conditions on behalf of all passengers included in the booking.</Text></Checkbox>
                            </Form.Item>

                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={submitting}
                                    style={{
                                        height: '48px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        background: 'linear-gradient(90deg, #1890ff 0%, #096dd9 100%)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                                    }}
                                >
                                    Submit Consent & Agree
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ConsentForm;