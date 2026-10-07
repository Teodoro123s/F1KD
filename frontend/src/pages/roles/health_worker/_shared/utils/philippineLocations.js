import provinces from 'psgc/dist/provinces';
import barangaysDataUrl from 'psgc/dist/data/barangays.json?url';

const provinceRecords = provinces.all();
let barangaysPromise;

export const PHILIPPINE_PROVINCES = provinceRecords
  .map((province) => province.name)
  .sort((a, b) => a.localeCompare(b));

export const getPhilippineCities = (provinceName) => {
  const province = provinceRecords.find((item) => item.name === provinceName);
  return (province?.municipalities || []).map((municipality) => municipality.name);
};

export const getPhilippineBarangays = async (provinceName, cityName) => {
  const province = provinceRecords.find((item) => item.name === provinceName);
  const municipality = province?.municipalities?.find((item) => item.name === cityName);
  if (municipality?.barangays?.length) return municipality.barangays.map((barangay) => barangay.name);

  const cityAliases = new Set([cityName, `${cityName} City`, `${cityName} City Capital`]);
  if (!barangaysPromise) {
    barangaysPromise = fetch(barangaysDataUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load Philippine barangay data (${response.status})`);
        return response.json();
      })
      .catch((error) => {
        barangaysPromise = undefined;
        throw error;
      });
  }

  const barangayRecords = await barangaysPromise;
  return barangayRecords
    .filter((barangay) => cityAliases.has(barangay.citymun))
    .map((barangay) => barangay.name);
};