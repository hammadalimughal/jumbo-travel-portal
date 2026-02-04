import { Card, Typography, Form, Input, Button, Space, Divider } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';

const LogIn = ({ isDark }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { login, authLoading } = useAuthContext();

  const handleSubmit = async (values, e) => {
    e?.preventDefault?.();
    const result = await login(values.email, values.password);
    if (result.success) {
      navigate('/');
    } else {
      form.setFields([
        { name: 'email', errors: [] },
        { name: 'password', errors: [result.error || 'Login failed'] },
      ]);
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
        height: '100vh',
      }}
    >
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            Welcome Back
          </Typography.Title>
          <Typography.Text type="secondary">
            Sign in to continue
          </Typography.Text>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="you@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 8 }}>
            <Link to="/forgot-password" style={{ color: '#1890ff', float: 'right' }}>
              Forgot password?
            </Link>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={authLoading}>
              Log In
            </Button>
          </Form.Item>
          {/*<Divider plain>Don't have an account?</Divider>
          <Form.Item>
            <Link to="/register" style={{ textDecoration: 'none' }}>
              <Button type="default" block>
                Create Account
              </Button>
            </Link>
          </Form.Item> */}
        </Form>
      </Card>
    </div>
  );
};

export default LogIn;