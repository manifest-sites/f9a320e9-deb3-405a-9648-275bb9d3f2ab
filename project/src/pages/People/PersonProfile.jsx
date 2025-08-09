import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Descriptions, 
  Tag, 
  Button, 
  Space, 
  List, 
  Input, 
  Select,
  Modal,
  message,
  Divider,
  Row,
  Col,
  Avatar,
  Typography
} from 'antd';
import { 
  EditOutlined, 
  ArrowLeftOutlined,
  PlusOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined,
  TagOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { Note } from '../../entities/Note';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { useApp } from '../../context/AppContext';

const { TextArea } = Input;
const { Title, Text } = Typography;

const PersonProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrg, user } = useApp();
  const [person, setPerson] = useState(null);
  const [tags, setTags] = useState([]);
  const [profileFields, setProfileFields] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('org');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (id && currentOrg) {
      loadData();
    }
  }, [id, currentOrg]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personRes, tagsRes, fieldsRes, notesRes] = await Promise.all([
        Person.get(id),
        TagEntity.list(),
        ProfileFieldDef.list(),
        Note.list() // TODO: Filter by personId
      ]);

      if (personRes.success) setPerson(personRes.data);
      if (tagsRes.success) setTags(tagsRes.data || []);
      if (fieldsRes.success) setProfileFields(fieldsRes.data || []);
      if (notesRes.success) {
        // Filter notes for this person (should be done server-side)
        const personNotes = (notesRes.data || []).filter(note => note.personId === id);
        setNotes(personNotes);
      }
    } catch (error) {
      message.error('Failed to load person data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;

    try {
      setSubmittingNote(true);
      const result = await Note.create({
        organizationId: currentOrg._id,
        personId: id,
        authorUserId: user._id,
        body: newNote.trim(),
        visibility: noteVisibility
      });

      if (result.success) {
        message.success('Note added');
        setNewNote('');
        setNoteModalVisible(false);
        loadData(); // Reload to get the new note
      }
    } catch (error) {
      message.error('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const getTagById = (tagId) => tags.find(tag => tag._id === tagId);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!person) {
    return <div className="p-6">Person not found</div>;
  }

  const displayName = person.preferredName || `${person.firstName} ${person.lastName}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/people')}
          />
          <div>
            <Title level={2} className="m-0">{displayName}</Title>
            <Tag color={
              person.status === 'active' ? 'green' :
              person.status === 'inactive' ? 'red' : 'blue'
            }>
              {person.status?.toUpperCase()}
            </Tag>
          </div>
        </div>
        <Space>
          <Button 
            icon={<PlusOutlined />}
            onClick={() => setNoteModalVisible(true)}
          >
            Add Note
          </Button>
          <Button 
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/people/${id}/edit`)}
          >
            Edit
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title="Contact Information" className="mb-6">
            <Descriptions column={2}>
              <Descriptions.Item label="Name" span={2}>
                <div className="flex items-center space-x-2">
                  <Avatar icon={<UserOutlined />} />
                  <span>{displayName}</span>
                  {person.preferredName && (
                    <Text type="secondary">
                      ({person.firstName} {person.lastName})
                    </Text>
                  )}
                </div>
              </Descriptions.Item>
              {person.email && (
                <Descriptions.Item label="Email">
                  <div className="flex items-center space-x-2">
                    <MailOutlined />
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                  </div>
                </Descriptions.Item>
              )}
              {person.phone && (
                <Descriptions.Item label="Phone">
                  <div className="flex items-center space-x-2">
                    <PhoneOutlined />
                    <a href={`tel:${person.phone}`}>{person.phone}</a>
                  </div>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Status">
                <Tag color={
                  person.status === 'active' ? 'green' :
                  person.status === 'inactive' ? 'red' : 'blue'
                }>
                  {person.status?.toUpperCase()}
                </Tag>
              </Descriptions.Item>
              {person.householdId && (
                <Descriptions.Item label="Household">
                  <div className="flex items-center space-x-2">
                    <HomeOutlined />
                    <Button type="link" className="p-0">
                      View Household
                    </Button>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {profileFields.length > 0 && person.fields && Object.keys(person.fields).length > 0 && (
            <Card title="Additional Information" className="mb-6">
              <Descriptions column={2}>
                {profileFields
                  .filter(field => person.fields[field.key] !== undefined && person.fields[field.key] !== null)
                  .map(field => (
                    <Descriptions.Item key={field._id} label={field.label}>
                      {field.type === 'checkbox' 
                        ? (person.fields[field.key] ? 'Yes' : 'No')
                        : field.type === 'multiselect'
                        ? Array.isArray(person.fields[field.key]) 
                          ? person.fields[field.key].join(', ')
                          : person.fields[field.key]
                        : person.fields[field.key]
                      }
                    </Descriptions.Item>
                  ))}
              </Descriptions>
            </Card>
          )}

          <Card title="Notes" className="mb-6">
            <List
              dataSource={notes}
              renderItem={(note) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div className="flex justify-between items-center">
                        <span>Note</span>
                        <div className="flex items-center space-x-2">
                          <Tag color={note.visibility === 'staff_only' ? 'orange' : 'blue'}>
                            {note.visibility === 'staff_only' ? 'Staff Only' : 'Organization'}
                          </Tag>
                          <Text type="secondary" className="text-sm">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </Text>
                        </div>
                      </div>
                    }
                    description={note.body}
                  />
                </List.Item>
              )}
              locale={{ emptyText: 'No notes yet' }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Tags" className="mb-6">
            <div className="space-y-2">
              {person.tagIds?.map(tagId => {
                const tag = getTagById(tagId);
                return tag ? (
                  <Tag key={tagId} color={tag.color}>
                    {tag.name}
                  </Tag>
                ) : null;
              })}
              {(!person.tagIds || person.tagIds.length === 0) && (
                <Text type="secondary">No tags assigned</Text>
              )}
            </div>
          </Card>

          <Card title="Quick Actions">
            <Space direction="vertical" className="w-full">
              <Button 
                icon={<PlusOutlined />}
                onClick={() => setNoteModalVisible(true)}
                className="w-full"
              >
                Add Note
              </Button>
              <Button 
                icon={<EditOutlined />}
                onClick={() => navigate(`/people/${id}/edit`)}
                className="w-full"
              >
                Edit Person
              </Button>
              <Button 
                icon={<TagOutlined />}
                onClick={() => navigate(`/people/${id}/edit`)}
                className="w-full"
              >
                Manage Tags
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Add Note"
        open={noteModalVisible}
        onOk={handleSubmitNote}
        onCancel={() => setNoteModalVisible(false)}
        confirmLoading={submittingNote}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Note</label>
            <TextArea
              rows={4}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about this person..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <Select
              value={noteVisibility}
              onChange={setNoteVisibility}
              className="w-full"
            >
              <Select.Option value="org">Organization</Select.Option>
              <Select.Option value="staff_only">Staff Only</Select.Option>
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PersonProfile;