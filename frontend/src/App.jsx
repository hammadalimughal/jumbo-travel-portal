import React, { useEffect, useMemo, useState } from 'react';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  ProjectOutlined,
  DollarCircleOutlined,
  FileTextOutlined,
  BankOutlined,
  LineChartOutlined,
  DeleteOutlined,
  SolutionOutlined,
  LogoutOutlined,
  SearchOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { lightTheme, darkTheme } from './config/theme';
import { Layout, Menu, theme, Button, ConfigProvider, Switch, Result } from 'antd';
const { Header, Content, Footer, Sider } = Layout;
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import Register from './screen/Register'
import ForgotPassword from './screen/ForgotPassword'
import VerifyOTP from './screen/VerifyOTP'
import ResetPassword from './screen/ResetPassword'
import { useAuthContext } from './context/AuthContext'
import LogIn from './screen/Login';
import Dashboard from './screen/Dashboard';
import Quotation from './screen/Quotation';
import Hotels from './screen/Hotels';


const items = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Dashboard'
  },
  {
    key: '/hotels',
    icon: <TeamOutlined />,
    label: 'Hotels'
  },
  {
    key: '/quotation',
    icon: <ProjectOutlined />,
    label: 'Quotations'
  },
  {
    key: 'log-out',
    icon: <LogoutOutlined />,
    label: 'Log Out'
  },
]

const flattenItems = (menuItems) => {
  const flat = [];
  const walk = (nodes) => {
    nodes.forEach((n) => {
      flat.push(n);
      if (n.children) walk(n.children);
    });
  };
  walk(menuItems);
  return flat;
};

// Route protection components
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated ? children : <Navigate to='/login' replace />
}

// const PublicRoute = ({ element }) => {
//   const { isAuthenticated } = useAuthContext()
//   return !isAuthenticated ? element : <Navigate to='/' replace />
// }

const App = () => {
  // return (
  //   <>
  //     <Navbar />
  //     <Routes>
  //       <Route path='/login' element={<PublicRoute element={<Login />} />} />
  //       <Route path='/register' element={<PublicRoute element={<Register />} />} />
  //       <Route path='/forgot-password' element={<PublicRoute element={<ForgotPassword />} />} />
  //       <Route path='/verify-otp' element={<PublicRoute element={<VerifyOTP />} />} />
  //       <Route path='/reset-password' element={<PublicRoute element={<ResetPassword />} />} />
  //       <Route path='/' element={<ProtectedRoute element={<div>Dashboard</div>} />} />
  //     </Routes>
  //   </>
  // )
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuthContext()
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark';
    } catch {
      return false;
    }
  });
  const siderStyle = {
    overflow: 'auto',
    height: '100vh',
    position: 'sticky',
    insetInlineStart: 0,
    top: 0,
    scrollbarWidth: 'thin',
    scrollbarGutter: 'stable',
    // backgroundColor: isDark ? '#141414' : '#fff'
    backgroundColor: '#141414'
  };
  const { isAuthenticated, logout } = useAuthContext();
  const [selectedNav, setSelectedNav] = useState(items[0].key)
  const navigate = useNavigate()
  const location = useLocation()
  const flatItems = useMemo(() => flattenItems(items), [])
  useEffect(() => {
    setSelectedNav(location.pathname)
    const current = flatItems.find(item => item.key === location.pathname)
    document.title = `${current?.label || 'Jumbo Travels'} | Jumbo Travels`
  }, [location.pathname, flatItems])
  const {
    token: { borderRadiusLG },
  } = theme.useToken();
  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleMenuChange = ({ key }) => {
    if (key === 'log-out') {
      logout();
      navigate('/login');
      return;
    }
    navigate(key)
  }

  return (
    <ConfigProvider
      theme={isDark ? darkTheme : lightTheme}
    >
      {!isAuthenticated ? <LogIn isDark={isDark} /> :
        <Layout hasSider>
          <Sider collapsed={collapsed} style={siderStyle}>
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', padding: collapsed ? '10px' : '30px 20px' }}>
              <Link to="/">
                <img style={{ maxWidth: '100%' }} src="/logo.png" alt="logo" />
              </Link>
            </div>
            <Menu
              onClick={handleMenuChange} style={{
                backgroundColor: '#141414'
              }}
              theme="dark"
              mode="inline"
              selectedKeys={[selectedNav]}
              items={items}
            />
          </Sider>
          <Layout>
            <Header style={{ padding: 0, background: isDark ? '#141414' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: 64,
                  height: 64,
                }}
              />
              <Switch checked={isDark} onChange={() => {
                setIsDark(!isDark)
              }} />
            </Header>
            <Content style={{ margin: '24px 16px 0', overflow: 'initial' }}>
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  background: isDark ? '#141414' : '#ffffff',
                  borderRadius: borderRadiusLG,
                  height: '100%',
                }}
              >
                <div className="content-wrapper">
                  <Routes>
                    <Route path='/' element={<ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                    } />
                    <Route path='/hotels' element={<ProtectedRoute>
                      <Hotels isDark={isDark} />
                    </ProtectedRoute>
                    } />
                    <Route path='/quotation' element={<ProtectedRoute>
                      <Quotation isDark={isDark} />
                    </ProtectedRoute>
                    } />
                    <Route path='*' element={<Result
                      status="404"
                      title="404"
                      subTitle="Sorry, the page you visited does not exist."
                      extra={<Button type="primary" onClick={() => navigate('/')}>Back Home</Button>}
                    />} />
                  </Routes>
                </div>
              </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>
              <p>Jumbo Travels ©{new Date().getFullYear()} Created by <a target='_blank' href="https://www.californiawebsiteagency.com/">California Website Agency</a></p>
            </Footer>
          </Layout>
        </Layout>}
    </ConfigProvider>
  );
}

export default App
