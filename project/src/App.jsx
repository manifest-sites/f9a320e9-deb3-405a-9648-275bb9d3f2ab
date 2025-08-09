import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import Monetization from './components/monetization/Monetization'
import Layout from './components/Layout'
import { AppProvider } from './context/AppContext'
import { getRouterBasename } from './utils/routerUtils'
import Dashboard from './pages/Dashboard'
import PeopleList from './pages/People/PeopleList'
import PersonForm from './pages/People/PersonForm'
import PersonProfile from './pages/People/PersonProfile'
import HouseholdsList from './pages/Households/HouseholdsList'
import HouseholdDetail from './pages/Households/HouseholdDetail'
import TagsList from './pages/Tags/TagsList'
import ProfileFields from './pages/Settings/ProfileFields'

function App() {

  return (
    <Monetization>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <AppProvider>
          <Router basename={getRouterBasename()}>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/people" element={<PeopleList />} />
                <Route path="/people/new" element={<PersonForm />} />
                <Route path="/people/:id/edit" element={<PersonForm />} />
                <Route path="/people/:id" element={<PersonProfile />} />
                <Route path="/households" element={<HouseholdsList />} />
                <Route path="/households/:id" element={<HouseholdDetail />} />
                <Route path="/tags" element={<TagsList />} />
                <Route path="/settings/profile-fields" element={<ProfileFields />} />
              </Routes>
            </Layout>
          </Router>
        </AppProvider>
      </ConfigProvider>
    </Monetization>
  )
}

export default App