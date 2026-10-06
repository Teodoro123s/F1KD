import { barangays, provinces } from 'psgc';

const provinceRecords = provinces.all();

export const PHILIPPINE_PROVINCES = provinceRecords
  .map((province) => province.name)
  .sort((a, b) => a.localeCompare(b));

export const getPhilippineCities = (provinceName) => {
  const province = provinceRecords.find((item) => item.name === provinceName);
  return (province?.municipalities || []).map((municipality) => municipality.name);
};

export const getPhilippineBarangays = (provinceName, cityName) => {
  const province = provinceRecords.find((item) => item.name === provinceName);
  const municipality = province?.municipalities?.find((item) => item.name === cityName);
  if (municipality?.barangays?.length) return municipality.barangays.map((barangay) => barangay.name);

  const cityAliases = new Set([cityName, `${cityName} City`, `${cityName} City Capital`]);
  return barangays.all()
    .filter((barangay) => cityAliases.has(barangay.citymun))
    .map((barangay) => barangay.name);
};