import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Table, Tag, Button, Spin, Typography, Divider, Row, Col, Space, Alert } from 'antd';
import { DownloadOutlined, PrinterOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE } from '../config/data';
import { Select, message, Switch  } from 'antd';
const { Title, Text } = Typography;

const QuotationDetailModal = ({ open, onCancel, quotationId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [updatingTracking, setUpdatingTracking] = useState(false);
    // Fetch details whenever the modal opens with a specific ID
    useEffect(() => {
        if (open && quotationId) {
            fetchDetails();
        } else {
            // Reset states on close to prevent showing old data
            setData(null);
            setError(null);
        }
    }, [open, quotationId]);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            // API call to your Node.js backend on port 6947
            const res = await fetch(`${API_BASE}/quotation/detail/${quotationId}`);

            if (!res.ok) {
                throw new Error(`Server responded with status: ${res.status}`);
            }

            const result = await res.json();
            if (result.success) {
                setData(result.data);
            } else {
                throw new Error(result.error || 'Failed to retrieve quotation details');
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err.message || 'A network error occurred. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleTrackingChange = async (field, value) => {
        setUpdatingTracking(true);
        try {
            const res = await fetch(`${API_BASE}/quotation/update-tracking/${quotationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }) // Dynamic field update
            });

            const result = await res.json();
            if (result.success) {
                setData({
                    ...data,
                    tracking: { ...data.tracking, [field]: value }
                });
                message.success(`${field.replace(/_/g, ' ')} updated successfully`);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            message.error(err.message || 'Failed to update tracking');
        } finally {
            setUpdatingTracking(false);
        }
    };
    return (
        <Modal
            // Title explicitly set to normal style to avoid brand italics bug
            title={<Text strong style={{ fontSize: '18px', fontStyle: 'normal' }}>
                {data ? `Quotation: ${data.quotation_no}` : 'Loading Quotation...'}
            </Text>}
            open={open}
            onCancel={onCancel}
            width={1000}
            centered
            destroyOnHidden
            footer={[
                <Button key="close" icon={<CloseOutlined />} onClick={onCancel}>
                    Close
                </Button>,
                data && (
                    <Button key="print" icon={<PrinterOutlined />} onClick={() => {
                        const printWindow = window.open(data?.invoice, '_blank');
                        if (printWindow) {
                            printWindow.focus();
                            // Note: For PDFs, many browsers provide their own print button, 
                            // but this triggers the system dialog for HTML-based views.
                            printWindow.print();
                        }
                    }}>
                        Print
                    </Button>
                ),
                data && (
                    <Button key="download" type="primary" icon={<DownloadOutlined />} href={data?.invoice} target="_blank">
                        Download PDF
                    </Button>
                )
            ]}
        >
            <div style={{ minHeight: '300px', fontStyle: 'normal' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <Spin size="large" tip="Fetching quotation data..." />
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px 0' }}>
                        <Alert
                            message="Unable to Load Quotation"
                            description={error}
                            type="error"
                            showIcon
                            action={
                                <Button size="small" danger onClick={fetchDetails} icon={<ReloadOutlined />}>
                                    Try Again
                                </Button>
                            }
                        />
                    </div>
                ) : data ? (
                    <div className="quotation-print-container">
                        {/* Header Branding Section */}

                        <Divider orientation="left">Workflow Tracking</Divider>
                        <Row gutter={16} style={{ marginBottom: 20 }}>
                            <Col span={12}>
                                <Space>
                                    <Text>Hotel Booking Done:</Text>
                                    <Switch
                                        loading={updatingTracking}
                                        checked={data?.tracking?.hotel_booking_done}
                                        onChange={(checked) => handleTrackingChange('hotel_booking_done', checked)}
                                    />
                                </Space>
                            </Col>
                            <Col span={12}>
                                <Space>
                                    <Text>Responded to Client:</Text>
                                    <Switch
                                        loading={updatingTracking}
                                        checked={data?.tracking?.responded_to_client}
                                        onChange={(checked) => handleTrackingChange('responded_to_client', checked)}
                                    />
                                </Space>
                            </Col>
                        </Row>

                        {/* Customer & Passenger Summary */}
                        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} title="Quotation Summary">
                            <Descriptions.Item label="Client Name">{data.customer_name}</Descriptions.Item>
                            <Descriptions.Item label="Contact">{data.customer_phone || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Email">{data.customer_email}</Descriptions.Item>
                            <Descriptions.Item label="Travel Date">{dayjs(data.travel_date).format('DD-MM-YYYY HH:mm')}</Descriptions.Item>
                            <Descriptions.Item label="Passengers" span={2}>
                                {data.passengers_names} <br />
                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                    ({data.passenger_counts?.adults} Adults, {data.passenger_counts?.children} Children, {data.passenger_counts?.infants} Infants)
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Flight Details Table */}
                        <Title level={5} style={{ marginTop: 24, fontStyle: 'normal' }}>Flight Itinerary</Title>
                        <Table
                            dataSource={data.flights}
                            pagination={false}
                            size="small"
                            rowKey="_id"
                            columns={[
                                { title: 'Airline', dataIndex: 'airline', key: 'airline' },
                                { title: 'Date', dataIndex: 'departureDateTime', render: d => dayjs(d).format('DD-MM-YYYY') },
                                { title: 'Departure', render: (_, r) => `${r.from} (${dayjs(r.departureDateTime).format('HH:mm')})` },
                                { title: 'Arrival', render: (_, r) => `${r.to} (${dayjs(r.arrivalDateTime).format('HH:mm')})` },
                            ]}
                        />

                        {/* Hotel Details Table */}
                        <Title level={5} style={{ marginTop: 24, fontStyle: 'normal' }}>Accommodation</Title>
                        <Table
                            dataSource={data.hotels}
                            pagination={false}
                            size="small"
                            rowKey="_id"
                            columns={[
                                { title: 'Hotel', dataIndex: 'hotel_id', render: h => h?.name || 'Manual Entry' },
                                { title: 'Room Type', dataIndex: 'room_type' },
                                { title: 'Meal Plan', dataIndex: 'meal_plan' },
                                { title: 'Nights', dataIndex: 'nights', align: 'center' },
                                { title: 'Check-in', dataIndex: 'check_in', render: d => dayjs(d).format('DD-MM-YYYY') },
                            ]}
                        />

                        {/* Pricing and Totals Section */}
                        <div style={{ marginTop: 24, padding: '16px', borderRadius: '4px' }}>
                            <Row justify="end">
                                <Col>
                                    <Space direction="vertical" align="end" size={0}>
                                        {/* <Text type="secondary">Average Price Per Person: £{(data.pricing.totalPrice / (data.passenger_counts.adults + data.passenger_counts.children)).toFixed(2)}</Text> */}
                                        <Title level={4} style={{ margin: 0, }}>
                                            Total Package Price: £{data.pricing.totalPrice.toFixed(2)}
                                        </Title>
                                    </Space>
                                </Col>
                            </Row>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default QuotationDetailModal;