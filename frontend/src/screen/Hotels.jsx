import React from 'react';
import { Button, Flex, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from 'antd';
import { FiEdit2, FiTrash } from 'react-icons/fi';
import { useDataContext } from '../context/DataContext';

const Hotels = () => {
    const { hotels, hotelsLoading, saveHotel, deleteHotel } = useDataContext();
    const [modalOpen, setModalOpen] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [editingHotel, setEditingHotel] = React.useState(null);
    const [deletingId, setDeletingId] = React.useState(null);
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();

    const openCreateModal = () => {
        setEditingHotel(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEditModal = (record) => {
        setEditingHotel(record);
        form.setFieldsValue({
            name: record.name,
            city: record.city,
            country: record.country,
            location: record.location,
            phone: record.phone,
            email: record.email,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            await saveHotel(values, editingHotel?._id);
            setModalOpen(false);
            setEditingHotel(null);
        } catch (error) {
            messageApi.error(error.message || 'Failed to save hotel');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            await deleteHotel(id);
        } catch (error) {
            messageApi.error(error.message || 'Failed to delete hotel');
        } finally {
            setDeletingId(null);
        }
    };

    const columns = [
        {
            title: '#',
            key: 'no',
            render: (_, __, index) => index + 1,
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Hotel Type',
            dataIndex: 'hotelType',
            key: 'hotelType',
            render: (hotelType) => (
                <span style={{whiteSpace: 'nowrap'}}>{hotelType ? `${hotelType} Stars` : 'N/A'}</span>
            )
        },
        {
            title: 'City',
            dataIndex: 'city',
            key: 'city',
        },
        {
            title: 'Country',
            dataIndex: 'country',
            key: 'country',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Phone',
            key: 'phone',
            dataIndex: 'phone',
        },
        {
            title: 'Location',
            key: 'location',
            dataIndex: 'location',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" icon={<FiEdit2 />} onClick={() => openEditModal(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Hotel"
                        description="Are you sure you want to delete this Hotel?"
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
                <h2 style={{ margin: 0 }}>Hotels</h2>
                <Button type="primary" onClick={openCreateModal}>
                    Add Hotel
                </Button>
            </Flex>

            <Table
                columns={columns}
                dataSource={hotels}
                loading={hotelsLoading}
                rowKey="_id"
                pagination={{ pageSize: 10 }}
            />

            <Modal
                title={editingHotel ? 'Edit Hotel' : 'Add Hotel'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                destroyOnHidden
            >
                <Form layout="vertical" form={form}>
                    <Form.Item
                        label="Name"
                        name="name"
                        rules={[{ required: true, message: 'Please enter hotel name' }]}
                    >
                        <Input placeholder="Hotel name" />
                    </Form.Item>
                    <Form.Item
                        label="City"
                        name="city"
                        rules={[{ required: true, message: 'Please enter city' }]}
                    >
                        <Input placeholder="City" />
                    </Form.Item>
                    <Form.Item
                        label="Hotel Type"
                        name="hotelType"
                        rules={[{ required: true, message: 'Please enter hotel type' }]}
                    >
                        <Select
                            options={[
                                { value: 1, label: '1 Star' },
                                { value: 2, label: '2 Star' },
                                { value: 3, label: '3 Star' },
                                { value: 4, label: '4 Star' },
                                { value: 5, label: '5 Star' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        label="Country"
                        name="country"
                        rules={[{ required: true, message: 'Please enter country' }]}
                    >
                        <Input placeholder="Country" />
                    </Form.Item>
                    <Form.Item label="Location" name="location">
                        <Input placeholder="Full address/location" />
                    </Form.Item>
                    <Form.Item label="Phone" name="phone">
                        <Input placeholder="Phone number" />
                    </Form.Item>
                    <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Invalid email' }]}>
                        <Input placeholder="Email address" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default Hotels;