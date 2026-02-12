import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Table, Tag, Button, Spin, Typography, Divider, Row, Col, Space, Alert } from 'antd';
import { DownloadOutlined, PrinterOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { API_BASE } from '../config/data';

const { Title, Text } = Typography;

const QuotationDetailModal = ({ open, onCancel, quotationId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
            destroyOnClose
            footer={[
                <Button key="close" icon={<CloseOutlined />} onClick={onCancel}>
                    Close
                </Button>,
                data && (
                    <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
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
                        <Row justify="space-between" align="middle">
                            <Col>
                                {/* <Title level={2} style={{ color: '#E02D0D', margin: 0, letterSpacing: '-1px' }}>
                                    ZAARVEL
                                </Title> */}
                            </Col>
                            <Col style={{ textAlign: 'right' }}>
                                <Tag color={data.status === 'Confirmed' ? 'green' : 'blue'} style={{ marginBottom: 8 }}>
                                    {data.status?.toUpperCase() || 'DRAFT'}
                                </Tag>
                                <div>
                                    <Text strong>Date:</Text> {dayjs(data.created_at).format('DD MMM YYYY')}
                                </div>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

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