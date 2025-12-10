import React from 'react';
import { ProcessingStatus, ProjectStatus, CompanyStatus } from '@rag/types';
import { Badge } from './Badge';

type StatusType = ProcessingStatus | ProjectStatus | CompanyStatus | string;

interface StatusConfig {
  variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  label: string;
}

const statusConfigs: Record<string, StatusConfig> = {
  // Processing Status
  PENDING: { variant: 'warning', label: 'Pending' },
  PROCESSING: { variant: 'info', label: 'Processing' },
  COMPLETED: { variant: 'success', label: 'Completed' },
  FAILED: { variant: 'danger', label: 'Failed' },
  RETRYING: { variant: 'warning', label: 'Retrying' },

  // Project Status
  ACTIVE: { variant: 'success', label: 'Active' },
  ARCHIVED: { variant: 'default', label: 'Archived' },
  DELETED: { variant: 'danger', label: 'Deleted' },

  // Company Status
  SUSPENDED: { variant: 'danger', label: 'Suspended' },
  TRIAL: { variant: 'purple', label: 'Trial' },
  CANCELLED: { variant: 'default', label: 'Cancelled' },

  // Job Status
  IN_PROGRESS: { variant: 'info', label: 'In Progress' },
};

export interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfigs[status] || { variant: 'default', label: status };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};
