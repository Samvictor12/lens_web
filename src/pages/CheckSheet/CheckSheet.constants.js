export const checkSheetFilters = {
  activeStatus: 'all',
};

export const defaultCheckSheet = {
  name: '',
  check_key: '',
  description: '',
  primary_colour: '',
  class: 'General',
  type: '',
  activeStatus: true,
};

export const checkSheetClassOptions = [
  { value: 'General',          label: 'General' },
  { value: 'Quality Check',    label: 'Quality Check' },
  { value: 'Inspection',       label: 'Inspection' },
  { value: 'Pre-Fitting',   label: 'Pre-Fitting' },
  { value: 'Post-Fitting',  label: 'Post-Fitting' },
];

export const checkSheetTypeOptions = [
  { value: 'Incoming',  label: 'Incoming' },
  { value: 'In-Process', label: 'In-Process' },
  { value: 'Final',     label: 'Final' },
  { value: 'Periodic',  label: 'Periodic' },
];

export const activeStatusOptions = [
  { value: true,    label: 'Active' },
  { value: false,   label: 'Inactive' },
];
