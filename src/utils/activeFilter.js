export const normalizeActiveFlag = (value) => {
  if (value === true || value === 1 || value === 'true' || value === 'TRUE' || value === 'True' || value === 'active' || value === 'ACTIVE' || value === 'Active') {
    return true;
  }

  if (value === false || value === 0 || value === 'false' || value === 'FALSE' || value === 'False' || value === 'inactive' || value === 'INACTIVE' || value === 'Inactive') {
    return false;
  }

  return value === undefined || value === null || value === '' ? null : true;
};

export const filterActiveRecords = (records = []) => {
  return (records || []).filter((record) => {
    const flag = normalizeActiveFlag(record?.is_active);
    return flag === null || flag === true;
  });
};
