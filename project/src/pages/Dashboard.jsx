import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, List, Typography, Button } from 'antd';
import { UserOutlined, EyeOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import { Person } from '../entities/Person';
import { Tag } from '../entities/Tag';
import { Note } from '../entities/Note';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { currentOrg } = useApp();
  const [stats, setStats] = useState({
    totalPeople: 0,
    activePeople: 0,
    inactivePeople: 0,
    visitors: 0,
    thisMonth: 0
  });
  const [topTags, setTopTags] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        const [peopleResponse, tagsResponse, notesResponse] = await Promise.all([
          Person.list(),
          Tag.list(),
          Note.list('createdAt:-1')
        ]);

        if (peopleResponse.success) {
          const people = peopleResponse.data || [];
          const total = people.length;
          const active = people.filter(p => p.status === 'active').length;
          const inactive = people.filter(p => p.status === 'inactive').length;
          const visitors = people.filter(p => p.status === 'visitor').length;
          
          const thisMonth = people.filter(person => {
            const created = new Date(person.createdAt);
            const now = new Date();
            return created.getMonth() === now.getMonth() && 
                   created.getFullYear() === now.getFullYear();
          }).length;

          setStats({
            totalPeople: total,
            activePeople: active,
            inactivePeople: inactive,
            visitors,
            thisMonth
          });
        }

        if (tagsResponse.success) {
          const tags = tagsResponse.data || [];
          setTopTags(tags.slice(0, 5));
        }

        if (notesResponse.success) {
          const notes = notesResponse.data || [];
          setRecentNotes(notes.slice(0, 10));
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentOrg]);

  return (
    <div className="space-y-6">
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total People"
              value={stats.totalPeople}
              prefix={<UserOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Members"
              value={stats.activePeople}
              prefix={<TeamOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Visitors"
              value={stats.visitors}
              prefix={<EyeOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Added This Month"
              value={stats.thisMonth}
              prefix={<CalendarOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top Tags" loading={loading}>
            <List
              dataSource={topTags}
              renderItem={(tag) => (
                <List.Item>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#1890ff' }}
                    />
                    <Text>{tag.name}</Text>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: 'No tags found' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Recent Notes" 
            loading={loading}
            extra={<Button type="link" onClick={() => window.location.href = '/people'}>View All</Button>}
          >
            <List
              dataSource={recentNotes}
              renderItem={(note) => (
                <List.Item>
                  <div className="w-full">
                    <Text ellipsis className="block">{note.body}</Text>
                    <Text type="secondary" className="text-xs">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </Text>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: 'No recent notes' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;