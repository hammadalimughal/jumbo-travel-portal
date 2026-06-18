import React, { useEffect, useState } from 'react';
import { Modal, Descriptions, Table, Tag, Button, Spin, Typography, Divider, Row, Col, Space, Alert } from 'antd';
import { DownloadOutlined, PrinterOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { API_BASE } from '../config/data';
import { Select, message, Switch } from 'antd';
import { FiTrash, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
const { Title, Text } = Typography;

const QuotationDetailModal = ({ open, onCancel, quotationId, fetchQuotations }) => {
    const navigate = useNavigate();
    const currencySymbols = { USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };
    const getSymbol = (code) => currencySymbols[code] || code || '£';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleMoveToDelete = async () => {
        Modal.confirm({
            title: 'Delete this Quotation?',
            content: 'This quotation will be permanently deleted.',
            okText: 'Delete this Quotation',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                setIsDeleting(true);
                try {
                    const res = await fetch(`${API_BASE}/quotation/mark-trash/${quotationId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const result = await res.json();
                    if (result.success) {
                        message.success('Quotation Deleted Successfully');
                        onCancel(); // Close the modal
                        fetchQuotations()
                        // Optional: If you have a refresh function in parent, call it here
                    } else {
                        throw new Error(result.error);
                    }
                } catch (err) {
                    message.error(err.message || 'Failed to delete quotation');
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

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
            fetchQuotations()
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
            // footer={[
            //     <Button key="close" icon={<CloseOutlined />} onClick={onCancel}>
            //         Close
            //     </Button>,
            //     data && (
            //         <Button key="print" icon={<PrinterOutlined />} onClick={() => {
            //             const printWindow = window.open(data?.invoice, '_blank');
            //             if (printWindow) {
            //                 printWindow.focus();
            //                 // Note: For PDFs, many browsers provide their own print button, 
            //                 // but this triggers the system dialog for HTML-based views.
            //                 printWindow.print();
            //             }
            //         }}>
            //             Print
            //         </Button>
            //     ),
            //     data && (
            //         <Button key="download" type="primary" icon={<DownloadOutlined />} href={data?.invoice} target="_blank">
            //             Download PDF
            //         </Button>
            //     )
            // ]}
            footer={[
                // Add Move to Delete at the start of the footer
                data && (
                    <Button
                        key="delete"
                        danger
                        type="text"
                        loading={isDeleting}
                        icon={<FiTrash2 style={{ transform: 'rotate(45deg)' }} />} // Using a rotated icon as a proxy for delete if DeleteOutlined isn't imported
                        onClick={handleMoveToDelete}
                        style={{ float: 'left' }} // Align to the left side
                    >
                        Delete
                    </Button>
                ),
                data && (
                    <Button
                        key="edit"
                        type="default"
                        onClick={() => {
                            onCancel();
                            navigate(`/edit-quotation/${quotationId}`);
                        }}
                    >
                        Edit
                    </Button>
                ),
                <Button key="close" icon={<CloseOutlined />} onClick={onCancel}>
                    Close
                </Button>,
                data && (
                    <Button key="print" icon={<PrinterOutlined />} onClick={() => {/* print logic */ }}>
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
                            <Descriptions.Item label="Travel Date">{dayjs.utc(data.travel_date).format('DD-MM-YYYY')}</Descriptions.Item>
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
                                { title: 'Date', dataIndex: 'departureDateTime', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                                { title: 'Departure', render: (_, r) => `${r.from} (${dayjs.utc(r.departureDateTime).format('HH:mm')})` },
                                { title: 'Arrival', render: (_, r) => `${r.to} (${dayjs.utc(r.arrivalDateTime).format('HH:mm')})` },
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
                                { 
                                    title: 'Rooms Configuration', 
                                    render: (_, record) => {
                                        if (record.rooms && record.rooms.length > 0) {
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {record.rooms.map((r, rIdx) => (
                                                        <span key={r._id || rIdx}>
                                                            {r.noOfRooms}x {r.room_type} ({r.meal_plan})
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return `${record.noOfRooms || 1}x ${record.room_type || 'N/A'} (${record.meal_plan || 'N/A'})`;
                                    }
                                },
                                { title: 'Nights', dataIndex: 'nights', align: 'center' },
                                { title: 'Check-in', dataIndex: 'check_in', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                                { title: 'Check-out', dataIndex: 'check_out', render: d => dayjs.utc(d).format('DD-MM-YYYY') },
                            ]}
                        />

                        {data.bookingType === 'Group' && data.groups && data.groups.length > 0 && (
                            <div style={{ marginTop: 24 }}>
                                <Title level={5} style={{ marginBottom: 16 }}>Groups Breakdown</Title>
                                {data.groups.map((group, idx) => (
                                    <Descriptions 
                                        key={group._id || idx} 
                                        bordered 
                                        size="small" 
                                        column={{ xs: 1, sm: 2 }} 
                                        title={`Group #${idx + 1} - ${group.customer_name}`} 
                                        style={{ marginBottom: 20 }}
                                    >
                                        <Descriptions.Item label="Email">{group.customer_email || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Phone">{group.customer_phone || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Travel Date">{group.travel_date ? dayjs.utc(group.travel_date).format('DD-MM-YYYY') : 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Passengers" span={2}>
                                            {group.passengers_names || 'N/A'} <br />
                                            <Text type="secondary" style={{ fontSize: '11px' }}>
                                                ({group.adults || 0} Adults, {group.children || 0} Children, {group.infants || 0} Infants)
                                            </Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Accommodations Stays" span={2}>
                                            {(group.hotels || []).map((h, hIdx) => {
                                                const hotelName = h.hotel_id?.name || h.name || 'Manual Entry';
                                                return (
                                                    <div key={h._id || hIdx} style={{ marginBottom: 8, borderBottom: hIdx < (group.hotels.length - 1) ? '1px dashed #f0f0f0' : 'none', paddingBottom: 8 }}>
                                                        <strong>{hotelName}</strong> ({h.nights} Nights, {h.check_in ? dayjs.utc(h.check_in).format('DD-MM-YYYY') : 'N/A'} to {h.check_out ? dayjs.utc(h.check_out).format('DD-MM-YYYY') : 'N/A'})
                                                        <br />
                                                        Rooms: {(h.rooms || []).map((r, rIdx) => `${r.noOfRooms}x ${r.room_type || 'N/A'} (${r.meal_plan || 'N/A'})`).join(', ') || `${h.noOfRooms || 1}x ${h.room_type || 'N/A'} (${h.meal_plan || 'N/A'})`}
                                                    </div>
                                                );
                                            })}
                                        </Descriptions.Item>
                                    </Descriptions>
                                ))}
                            </div>
                        )}

                        {/* Pricing and Totals Section */}
                        <div style={{ marginTop: 24, padding: '16px', borderRadius: '4px' }}>
                            <Row justify="end">
                                <Col>
                                    <Space direction="vertical" align="end" size={0}>
                                        {/* <Text type="secondary">Average Price Per Person: £{(data.pricing.totalPrice / (data.passenger_counts.adults + data.passenger_counts.children)).toFixed(2)}</Text> */}
                                        <Title level={4} style={{ margin: 0, }}>
                                            Total Package Price: {getSymbol(data.pricing.currency)}{data.pricing.totalPrice.toFixed(2)}
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