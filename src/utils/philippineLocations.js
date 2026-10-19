import {
  getAllProvinces,
  getAllMunicipalities,
  getBarangaysByMunicipality,
  getMunicipalitiesByProvince,
} from '@aivangogh/ph-address';

const provinces = getAllProvinces();
const municipalities = getAllMunicipalities();

const standaloneAreas = [
  {
    name: 'National Capital Region (NCR)',
    code: '1300000000',
    aliases: ['ncr', 'metro manila', 'metro manila (ncr)', 'national capital region'],
  },
  {
    name: 'Bangsamoro Special Geographic Area',
    code: '1999900000',
    aliases: ['barmm special geographic area', 'special geographic area (barmm)'],
  },
  {
    name: 'Isabela City (Independent City)',
    code: '0990100000',
    aliases: ['isabela city', 'independent city'],
  },
];

const normalizeName = (name) => String(name || '').trim().toLocaleLowerCase();
const displayCityName = (name) => (name === 'Isabela City'
  ? name
  : name.replace(/^City of\s+/i, '').replace(/\s+City$/i, ''));
const normalizeCityName = (name) => normalizeName(name)
  .replace(/^city of\s+/, '')
  .replace(/\s+city$/, '');

const getProvinceOrArea = (name) => {
  const normalizedName = normalizeName(name);
  const province = provinces.find((item) => normalizeName(item.name) === normalizedName);
  if (province) return { code: province.psgcCode, name: province.name };

  return standaloneAreas.find((area) =>
    normalizeName(area.name) === normalizedName
      || area.aliases.includes(normalizedName)
  ) || null;
};

export const getPhilippineProvinceName = (provinceName) =>
  getProvinceOrArea(provinceName)?.name || '';

export const PHILIPPINE_PROVINCES = [
  ...provinces.map((province) => province.name),
  ...standaloneAreas.map((area) => area.name),
].sort((a, b) => a.localeCompare(b));

export const getPhilippineCities = (provinceName) => {
  const area = getProvinceOrArea(provinceName);
  if (!area) return [];

  return getMunicipalitiesByProvince(area.code)
    .map((municipality) => displayCityName(municipality.name))
    .sort((a, b) => a.localeCompare(b));
};

export const getPhilippineBarangays = async (provinceName, cityName) => {
  const area = getProvinceOrArea(provinceName);
  if (!area || !normalizeName(cityName)) return [];

  const municipality = getMunicipalitiesByProvince(area.code)
    .find((item) => normalizeCityName(item.name) === normalizeCityName(cityName));
  if (!municipality) return [];

  const barangays = getBarangaysByMunicipality(municipality.psgcCode);
  if (barangays.length) return barangays.map((barangay) => barangay.name);

  const subMunicipalities = municipalities.filter(
    (item) => item.provinceCode === municipality.psgcCode
  );
  return subMunicipalities
    .flatMap((item) => getBarangaysByMunicipality(item.psgcCode))
    .map((barangay) => barangay.name)
    .sort((a, b) => a.localeCompare(b));
};
