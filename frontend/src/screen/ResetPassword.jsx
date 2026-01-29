import React from 'react';
import { Card, Typography, Form, Input, Button, message, Space, Divider } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const ResetPassword = ({ isDark }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { resetPassword, authLoading, resetToken } = useAuthContext();

  const handleSubmit = async (values, e) => {
    e?.preventDefault?.();
    const token = resetToken || localStorage.getItem('resetToken');
    
    if (!token) {
      message.error('Invalid or missing token. Please start over.');
      navigate('/forgot-password');
      return;
    }

    const result = await resetPassword(token, values.newPassword, values.confirmPassword);
    if (result.success) {
      message.success('Password reset successfully!');
      navigate('/login');
    } else {
      message.error(result.error || 'Failed to reset password');
    }
  };

  return (
    <div
      style={{
        padding: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark ? '#141414' : '#ffffff',
        borderRadius: 0,
        minHeight: '100vh',
      }}
    >
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            Reset Password
          </Typography.Title>
          <Typography.Text type="secondary">
            Create a new strong password
          </Typography.Text>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 6, message: 'Password must be at least 6 characters' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              Reset Password
            </Button>
          </Form.Item>
          <Divider plain>Remember your password?</Divider>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Link to="/login" style={{ textDecoration: 'none' }}>
              <Button type="default" block>
                Back to Login
              </Button>
            </Link>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button type="text" block>
                Create new account
              </Button>
            </Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
};

export default ResetPassword;