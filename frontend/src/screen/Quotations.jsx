import React from 'react';
import { Button, Flex, Table, Tag, Space, Popconfirm, message } from 'antd';
import { FiEye, FiTrash } from 'react-icons/fi';
import { useDataContext } from '../context/DataContext';
import dayjs from 'dayjs';
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

    // const [deletingId, setDeletingId] = React.useState(null);

    // const handleDelete = async (id) => {
    //     setDeletingId(id);
    //     try {
    //         await deleteQuotation(id);
    //         messageApi.success('Quotation deleted');
    //     } catch (error) {
    //         messageApi.error(error.message || 'Failed to delete');
    //     } finally {
    //         setDeletingId(null);
    //     }
    // };

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
            render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
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
            render: (date) => dayjs(date).format('DD-MM-YYYY'),
        },
        {
            title: 'Total Price',
            dataIndex: ['pricing', 'totalPrice'], // Mapping to nested pricing object
            key: 'totalPrice',
            render: (price) => <span style={{ color: '#16a34a', fontWeight: 'bold' }}>£{price?.toFixed(2)}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = status === 'Paid' ? 'green' : status === 'Overdue' ? 'red' : 'blue';
                return <Tag color={color}>{status?.toUpperCase() || 'DRAFT'}</Tag>;
            }
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
                    onClick={()=>openDetails(record._id)}
                    //  icon={<FiTrash />} 
                    //  loading={deletingId === record._id}
                    >
                        Detail
                    </Button>
                    {/* <Popconfirm
                        title="Delete Quotation"
                        onConfirm={() => handleDelete(record._id)}
                        okButtonProps={{ loading: deletingId === record._id }}
                    >
                        <Button danger type="link" icon={<FiTrash />} loading={deletingId === record._id}>
                            Delete
                        </Button>
                    </Popconfirm> */}
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
                <Button type="primary" onClick={() => navigate('/new-quotation')}>
                    New Quotation
                </Button>
            </Flex>

            <Table
                columns={columns}
                dataSource={quotations}
                loading={loading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
            />
            <QuotationDetailModal
                open={modalOpen}
                quotationId={viewId}
                onCancel={() => setModalOpen(false)}
            />
        </>
    );
};

export default Quotations;