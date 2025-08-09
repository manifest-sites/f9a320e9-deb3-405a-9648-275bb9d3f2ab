import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  Tag, 
  Space, 
  Card, 
  Dropdown, 
  Checkbox,
  message,
  Modal
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  FilterOutlined, 
  SettingOutlined,
  EditOutlined,
  EyeOutlined,
  UserDeleteOutlined,
  ImportOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { Person } from '../../entities/Person';
import { Tag as TagEntity } from '../../entities/Tag';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import CSVImport from '../../components/ImportExport/CSVImport';
import CSVExport from '../../components/ImportExport/CSVExport';

const { Search } = Input;
const { Option } = Select;

const PeopleList = () => {
  const { currentOrg } = useApp();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [tags, setTags] = useState([]);
  const [profileFields, setProfileFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [tagFilter, setTagFilter] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('people-visible-columns');
    return saved ? JSON.parse(saved) : ['name', 'email', 'phone', 'status', 'tags', 'household'];
  });
  const [importVisible, setImportVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentOrg]);

  useEffect(() => {
    localStorage.setItem('people-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const loadData = async () => {
    if (!currentOrg) return;
    
    try {
      setLoading(true);
      const [peopleRes, tagsRes, fieldsRes] = await Promise.all([
        Person.list(),
        TagEntity.list(),
        ProfileFieldDef.list()
      ]);

      if (peopleRes.success) setPeople(peopleRes.data || []);
      if (tagsRes.success) setTags(tagsRes.data || []);
      if (fieldsRes.success) setProfileFields(fieldsRes.data || []);
    } catch (error) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPeople = people.filter(person => {
    const matchesSearch = !searchTerm || 
      person.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.phone?.includes(searchTerm);
    
    const matchesStatus = !statusFilter || person.status === statusFilter;
    const matchesTags = tagFilter.length === 0 || 
      tagFilter.some(tagId => person.tagIds?.includes(tagId));
    
    return matchesSearch && matchesStatus && matchesTags;
  });

  const handleBulkStatusChange = async (status) => {
    try {
      await Promise.all(
        selectedRowKeys.map(id => Person.update(id, { status }))
      );
      message.success(`Updated ${selectedRowKeys.length} people`);
      setSelectedRowKeys([]);
      loadData();
    } catch (error) {
      message.error('Failed to update people');
    }
  };

  const getTagById = (tagId) => tags.find(tag => tag._id === tagId);

  const baseColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, person) => (
        <Button 
          type="link" 
          onClick={() => navigate(`/people/${person._id}`)}
          className="p-0 h-auto text-left"
        >
          {person.preferredName || `${person.firstName} ${person.lastName}`}
        </Button>
      ),
      sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={
          status === 'active' ? 'green' :
          status === 'inactive' ? 'red' : 'blue'
        }>
          {status?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Tags',
      key: 'tags',
      render: (_, person) => (
        <Space wrap>
          {person.tagIds?.map(tagId => {
            const tag = getTagById(tagId);
            return tag ? (
              <Tag key={tagId} color={tag.color}>
                {tag.name}
              </Tag>
            ) : null;
          })}
        </Space>
      ),
    },
    {
      title: 'Household',
      key: 'household',
      render: () => '-', // TODO: Implement household lookup
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, person) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => navigate(`/people/${person._id}`)}
          />
          <Button 
            icon={<EditOutlined />} 
            size="small"
            onClick={() => navigate(`/people/${person._id}/edit`)}
          />
        </Space>
      ),
    },
  ];

  const dynamicColumns = profileFields
    .filter(field => visibleColumns.includes(field.key))
    .map(field => ({
      title: field.label,
      key: field.key,
      render: (_, person) => person.fields?.[field.key] || '-',
    }));

  const allColumns = baseColumns
    .filter(col => visibleColumns.includes(col.key) || col.key === 'actions')
    .concat(dynamicColumns);

  const columnMenu = {
    items: [
      ...baseColumns.slice(0, -1).map(col => ({
        key: col.key,
        label: (
          <Checkbox
            checked={visibleColumns.includes(col.key)}
            onChange={(e) => {
              if (e.target.checked) {
                setVisibleColumns([...visibleColumns, col.key]);
              } else {
                setVisibleColumns(visibleColumns.filter(k => k !== col.key));
              }
            }}
          >
            {col.title}
          </Checkbox>
        ),
      })),
      { type: 'divider' },
      ...profileFields.map(field => ({
        key: field.key,
        label: (
          <Checkbox
            checked={visibleColumns.includes(field.key)}
            onChange={(e) => {
              if (e.target.checked) {
                setVisibleColumns([...visibleColumns, field.key]);
              } else {
                setVisibleColumns(visibleColumns.filter(k => k !== field.key));
              }
            }}
          >
            {field.label}
          </Checkbox>
        ),
      }))
    ]
  };

  const bulkActions = selectedRowKeys.length > 0 ? (
    <Space>
      <span>{selectedRowKeys.length} selected</span>
      <Button onClick={() => handleBulkStatusChange('inactive')}>
        Mark Inactive
      </Button>
    </Space>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">People</h1>
        <Space>
          <Button 
            icon={<ImportOutlined />}
            onClick={() => setImportVisible(true)}
          >
            Import CSV
          </Button>
          <CSVExport 
            filteredData={filteredPeople}
            visibleColumns={visibleColumns}
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/people/new')}
          >
            Add Person
          </Button>
        </Space>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Search
              placeholder="Search by name, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
              allowClear
            />
            
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              className="w-32"
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="visitor">Visitor</Option>
            </Select>

            <Select
              mode="multiple"
              placeholder="Tags"
              value={tagFilter}
              onChange={setTagFilter}
              className="min-w-[200px]"
            >
              {tags.map(tag => (
                <Option key={tag._id} value={tag._id}>
                  {tag.name}
                </Option>
              ))}
            </Select>

            <Dropdown menu={columnMenu} trigger={['click']}>
              <Button icon={<SettingOutlined />}>
                Columns
              </Button>
            </Dropdown>
          </div>

          {bulkActions}

          <Table
            dataSource={filteredPeople}
            columns={allColumns}
            loading={loading}
            rowKey="_id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} people`,
            }}
            scroll={{ x: 1000 }}
          />
        </div>
      </Card>

      <CSVImport
        visible={importVisible}
        onClose={() => setImportVisible(false)}
        onComplete={() => {
          loadData();
          setImportVisible(false);
        }}
      />
    </div>
  );
};

export default PeopleList;