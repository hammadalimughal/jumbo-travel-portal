import React from 'react';
import { Button, Flex, Table, Tag, Space, Popconfirm, message } from 'antd';
import { FiEye, FiTrash } from 'react-icons/fi';
import { useDataContext } from '../context/DataContext';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useEffect } from 'react';
import { API_BASE } from '../config/data';
import QuotationDetailModal from './QuotationDetailModal';
const Quotations = () => {
    const navigate = useNavigate();
    // Assuming you add quotationsLoading and deleteQuotation to your DataContext
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [messageApi, contextHolder] = message.useMessage();
    const [viewId, setViewId] = React.useState(null);
    const [modalOpen, setModalOpen] = React.useState(false);

    const openDetails = (id) => {
        setViewId(id);
        setModalOpen(true);
    };
    const fetchQuotations = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE}/quotation/fetch`)
            const result = await response.json()
            if (result.success) {
                setQuotations(result.data)
            } else {
                messageApi.error(result.error)
            }
        } catch (error) {
            messageApi.error(error.message)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        fetchQuotations()
    }, [])

    const [deletingId, setDeletingId] = React.useState(null);

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            const res = await fetch(`${API_BASE}/quotation/mark-trash/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.success) {
                messageApi.success('Quotation moved to trash successfully');
                fetchQuotations();
            } else {
                messageApi.error(result.error || 'Failed to move quotation to trash');
            }
        } catch (error) {
            messageApi.error(error.message || 'Failed to move quotation to trash');
        } finally {
            setDeletingId(null);
        }
    };

    const columns = [
        {
            title: '#',
            key: 'no',
            render: (_, __, index) => index + 1,
            width: 50,
        },
        {
            title: 'Quotation No',
            dataIndex: 'quotation_no',
            key: 'quotation_no',
            render: (text, record) => {
                const isGroup = record.bookingType === 'Group';
                return (
                    <Space size="small">
                        <span style={{ fontWeight: 'bold' }}>{text}</span>
                        <Tag color={isGroup ? 'purple' : 'blue'} style={{ borderRadius: '4px' }}>
                            {isGroup ? 'Group' : 'Individual'}
                        </Tag>
                    </Space>
                );
            },
        },
        {
            title: 'Customer',
            dataIndex: 'customer_name',
            key: 'customer_name',
        },
        {
            title: 'Travel Date',
            dataIndex: 'travel_date',
            key: 'travel_date',
            render: (date) => dayjs.utc(date).format('DD-MM-YYYY'),
        },
        {
            title: 'Total Price',
            key: 'totalPrice',
            render: (_, record) => {
                const price = record.pricing?.totalPrice;
                const currency = record.pricing?.currency || 'EUR';
                const symbols = { USD: '$', EUR: '€', GBP: '£', AED: 'AED', SAR: 'SAR' };
                const symbol = symbols[currency] || currency;
                return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{symbol}{price?.toFixed(2)}</span>;
            },
        },
        // {
        //     title: 'Status',
        //     dataIndex: 'status',
        //     key: 'status',
        //     render: (status) => {
        //         let color = status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : 'blue';
        //         return <Tag color={color}>{status?.toUpperCase() || 'DRAFT'}</Tag>;
        //     }
        // },
        {
            title: 'Milestones',
            key: 'tracking',
            width: 300,
            render: (_, record) => (
                <Space size="small" wrap>
                    <Tag color={record.tracking?.hotel_booking_done ? 'blue' : 'red'} style={{ borderRadius: '12px' }}>
                        {record.tracking?.hotel_booking_done ? '● Hotel Done' : '○ Hotel Pending'}
                    </Tag>
                    <Tag color={record.tracking?.responded_to_client ? 'purple' : 'red'} style={{ borderRadius: '12px' }}>
                        {record.tracking?.responded_to_client ? '● Responded' : '○ No Response'}
                    </Tag>
                    <Tag color={record.consent?.status === 'Agreed' ? 'green' : 'orange'} style={{ borderRadius: '12px' }}>
                        {record.consent?.status === 'Agreed' ? '● Consent: Agreed' : '○ Consent: Pending'}
                    </Tag>
                    {record.tracking?.alert_sent && (
                        <Tag color="orange" style={{ borderRadius: '12px' }}>
                            Alert Sent
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    {record.invoice && <Button
                        type="link"
                        // icon={<FiEye />}
                        onClick={() => window.open(record.invoice, '_blank')}
                    >
                        PDF
                    </Button>}
                    <Button info type="link"
                        onClick={() => openDetails(record._id)}
                    >
                        Detail
                    </Button>
                    <Button type="link"
                        onClick={() => {
                            const link = `${window.location.origin}/consent/${record._id}`;
                            navigator.clipboard.writeText(link);
                            messageApi.success('Consent link copied to clipboard!');
                        }}
                    >
                        Consent Link
                    </Button>
                    <Button type="link"
                        onClick={() => navigate(`/edit-quotation/${record._id}`)}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Quotation"
                        description="Are you sure you want to move this quotation to trash?"
                        onConfirm={() => handleDelete(record._id)}
                        okButtonProps={{ loading: deletingId === record._id }}
                    >
                        <Button danger type="link" icon={<FiTrash />} loading={deletingId === record._id}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            {contextHolder}
            <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Quotations</h2>
                {/* Button to navigate to your existing New Quotation form */}
                <div>
                    <Button type="primary" onClick={() => navigate('/new-quotation')}>
                        New Quotation
                    </Button>
                    <Button style={{ marginLeft: 8 }} type="primary" onClick={() => navigate('/new-group-quotation')}>
                        New Group Quotation
                    </Button>
                </div>
            </Flex>

            <Table
                columns={columns}
                dataSource={quotations}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
            />
            <QuotationDetailModal
                fetchQuotations={fetchQuotations}
                open={modalOpen}
                quotationId={viewId}
                onCancel={() => setModalOpen(false)}
            />
        </>
    );
};

export default Quotations;