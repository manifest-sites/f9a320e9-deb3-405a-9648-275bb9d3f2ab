import React, { useState } from 'react';
import { 
  Modal, 
  Upload, 
  Button, 
  Steps, 
  Table, 
  Select, 
  message, 
  Alert,
  Typography,
  Space
} from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { Person } from '../../entities/Person';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { useApp } from '../../context/AppContext';

const { Step } = Steps;
const { Option } = Select;
const { Text } = Typography;

const CSVImport = ({ visible, onClose, onComplete }) => {
  const { currentOrg } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [profileFields, setProfileFields] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);

  const coreFields = [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'preferredName', label: 'Preferred Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'status', label: 'Status', required: true },
  ];

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          message.error('CSV file must have at least a header row and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row = { _index: index };
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });

        setCsvHeaders(headers);
        setCsvData(data);
        setCurrentStep(1);

        // Load profile fields for mapping
        loadProfileFields();
      } catch (error) {
        message.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    return false; // Prevent upload
  };

  const loadProfileFields = async () => {
    try {
      const result = await ProfileFieldDef.list();
      if (result.success) {
        setProfileFields(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load profile fields:', error);
    }
  };

  const handleColumnMapping = (csvColumn, fieldKey) => {
    setColumnMapping({
      ...columnMapping,
      [csvColumn]: fieldKey
    });
  };

  const validateData = () => {
    const errors = [];
    const mappedFields = Object.values(columnMapping);
    
    // Check required fields are mapped
    const requiredFields = coreFields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f.key));
    
    if (missingRequired.length > 0) {
      errors.push({
        type: 'mapping',
        message: `Missing required field mappings: ${missingRequired.map(f => f.label).join(', ')}`
      });
    }

    // Validate data rows
    csvData.forEach((row, index) => {
      Object.entries(columnMapping).forEach(([csvCol, fieldKey]) => {
        const field = coreFields.find(f => f.key === fieldKey) || 
                     profileFields.find(f => f.key === fieldKey);
        
        if (field && field.required && !row[csvCol]) {
          errors.push({
            type: 'data',
            row: index + 1,
            field: field.label,
            message: `${field.label} is required but empty`
          });
        }

        // Validate status values
        if (fieldKey === 'status' && row[csvCol]) {
          const validStatuses = ['active', 'inactive', 'visitor'];
          if (!validStatuses.includes(row[csvCol].toLowerCase())) {
            errors.push({
              type: 'data',
              row: index + 1,
              field: 'Status',
              message: `Invalid status "${row[csvCol]}". Must be: ${validStatuses.join(', ')}`
            });
          }
        }
      });
    });

    setValidationErrors(errors);
    setCurrentStep(2);
  };

  const handleImport = async () => {
    if (validationErrors.filter(e => e.type === 'mapping' || e.type === 'data').length > 0) {
      message.error('Please fix validation errors before importing');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of csvData) {
        try {
          const personData = {
            organizationId: currentOrg._id,
            tagIds: []
          };

          // Map core fields
          Object.entries(columnMapping).forEach(([csvCol, fieldKey]) => {
            const value = row[csvCol];
            if (value) {
              if (coreFields.find(f => f.key === fieldKey)) {
                personData[fieldKey] = fieldKey === 'status' ? value.toLowerCase() : value;
              } else {
                // Dynamic field
                if (!personData.fields) personData.fields = {};
                personData.fields[fieldKey] = value;
              }
            }
          });

          await Person.create(personData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error('Import error for row:', row, error);
        }
      }

      message.success(`Import completed: ${successCount} people imported${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
      onComplete?.();
      handleClose();
    } catch (error) {
      message.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCsvData([]);
    setCsvHeaders([]);
    setColumnMapping({});
    setValidationErrors([]);
    onClose();
  };

  const allFields = [
    ...coreFields,
    ...profileFields.map(f => ({ key: f.key, label: f.label, required: f.required }))
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-8">
            <Upload.Dragger
              accept=".csv"
              beforeUpload={handleFileUpload}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag CSV file to upload</p>
              <p className="ant-upload-hint">
                CSV should have headers in first row
              </p>
            </Upload.Dragger>
          </div>
        );

      case 1:
        return (
          <div>
            <Alert
              message="Map CSV columns to person fields"
              description="Select which person field each CSV column should map to."
              type="info"
              className="mb-4"
            />
            
            <Table
              dataSource={csvHeaders.map(header => ({ csvColumn: header }))}
              columns={[
                {
                  title: 'CSV Column',
                  dataIndex: 'csvColumn',
                  key: 'csvColumn',
                },
                {
                  title: 'Sample Data',
                  key: 'sample',
                  render: (_, record) => {
                    const samples = csvData.slice(0, 3)
                      .map(row => row[record.csvColumn])
                      .filter(Boolean)
                      .join(', ');
                    return <Text type="secondary">{samples || 'No data'}</Text>;
                  },
                },
                {
                  title: 'Map to Field',
                  key: 'mapping',
                  render: (_, record) => (
                    <Select
                      placeholder="Select field"
                      value={columnMapping[record.csvColumn]}
                      onChange={(value) => handleColumnMapping(record.csvColumn, value)}
                      className="w-full"
                    >
                      <Option value="">Skip column</Option>
                      {allFields.map(field => (
                        <Option key={field.key} value={field.key}>
                          {field.label} {field.required && <Text type="danger">*</Text>}
                        </Option>
                      ))}
                    </Select>
                  ),
                },
              ]}
              pagination={false}
              size="small"
            />
          </div>
        );

      case 2:
        return (
          <div>
            {validationErrors.length > 0 ? (
              <Alert
                message="Validation Issues"
                description="Please review and fix the issues below"
                type="warning"
                className="mb-4"
              />
            ) : (
              <Alert
                message="Ready to Import"
                description={`${csvData.length} records ready for import`}
                type="success"
                className="mb-4"
              />
            )}
            
            {validationErrors.length > 0 && (
              <div className="max-h-60 overflow-y-auto mb-4">
                {validationErrors.map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 border border-red-200 rounded mb-2">
                    <Text type="danger">
                      {error.type === 'mapping' 
                        ? `Mapping Error: ${error.message}`
                        : `Row ${error.row}, ${error.field}: ${error.message}`
                      }
                    </Text>
                  </div>
                ))}
              </div>
            )}

            <Table
              dataSource={csvData.slice(0, 5)}
              columns={Object.entries(columnMapping)
                .filter(([_, fieldKey]) => fieldKey)
                .map(([csvCol, fieldKey]) => ({
                  title: allFields.find(f => f.key === fieldKey)?.label || fieldKey,
                  dataIndex: csvCol,
                  key: csvCol,
                }))
              }
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
              title={() => `Preview (showing first 5 of ${csvData.length} rows)`}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getStepButtons = () => {
    switch (currentStep) {
      case 1:
        return (
          <Space>
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button type="primary" onClick={validateData}>
              Next: Validate
            </Button>
          </Space>
        );
      case 2:
        return (
          <Space>
            <Button onClick={() => setCurrentStep(1)}>Back</Button>
            <Button 
              type="primary" 
              onClick={handleImport}
              loading={importing}
              disabled={validationErrors.filter(e => e.type === 'mapping').length > 0}
            >
              Import {csvData.length} People
            </Button>
          </Space>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      title="Import People from CSV"
      open={visible}
      onCancel={handleClose}
      footer={getStepButtons()}
      width={800}
    >
      <Steps current={currentStep} className="mb-6">
        <Step title="Upload" description="Upload CSV file" />
        <Step title="Map" description="Map columns to fields" />
        <Step title="Import" description="Review and import" />
      </Steps>

      {renderStep()}
    </Modal>
  );
};

export default CSVImport;