import React from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { Person } from '../../entities/Person';
import { ProfileFieldDef } from '../../entities/ProfileFieldDef';
import { useApp } from '../../context/AppContext';

const CSVExport = ({ 
  filteredData = null, 
  visibleColumns = [], 
  children,
  ...buttonProps 
}) => {
  const { currentOrg } = useApp();

  const exportToCSV = async () => {
    try {
      // Get data to export
      let peopleToExport = filteredData;
      if (!peopleToExport) {
        const result = await Person.list();
        if (result.success) {
          peopleToExport = result.data || [];
        } else {
          throw new Error('Failed to fetch people data');
        }
      }

      if (peopleToExport.length === 0) {
        message.info('No data to export');
        return;
      }

      // Get profile fields for dynamic column headers
      const fieldsResult = await ProfileFieldDef.list();
      const profileFields = fieldsResult.success ? fieldsResult.data || [] : [];

      // Define all possible columns
      const coreColumns = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'preferredName', label: 'Preferred Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'household', label: 'Household' },
        { key: 'tags', label: 'Tags' },
        { key: 'createdAt', label: 'Created Date' },
      ];

      const dynamicColumns = profileFields.map(field => ({
        key: field.key,
        label: field.label,
        isDynamic: true
      }));

      const allColumns = [...coreColumns, ...dynamicColumns];

      // Filter columns based on visible columns if provided
      const columnsToExport = visibleColumns.length > 0 
        ? allColumns.filter(col => visibleColumns.includes(col.key))
        : allColumns;

      // Create CSV headers
      const headers = columnsToExport.map(col => col.label);

      // Create CSV rows
      const rows = peopleToExport.map(person => {
        return columnsToExport.map(col => {
          switch (col.key) {
            case 'firstName':
            case 'lastName':
            case 'preferredName':
            case 'email':
            case 'phone':
            case 'status':
              return person[col.key] || '';
            
            case 'household':
              // TODO: Look up household name
              return person.householdId || '';
            
            case 'tags':
              // TODO: Look up tag names
              return (person.tagIds || []).join('; ');
            
            case 'createdAt':
              return person.createdAt 
                ? new Date(person.createdAt).toLocaleDateString()
                : '';
            
            default:
              // Dynamic field
              if (col.isDynamic && person.fields) {
                const value = person.fields[col.key];
                if (Array.isArray(value)) {
                  return value.join('; ');
                }
                return value || '';
              }
              return '';
          }
        });
      });

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `people-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      message.success(`Exported ${peopleToExport.length} people to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export CSV');
    }
  };

  return (
    <Button 
      icon={<DownloadOutlined />} 
      onClick={exportToCSV}
      {...buttonProps}
    >
      {children || 'Export CSV'}
    </Button>
  );
};

export default CSVExport;