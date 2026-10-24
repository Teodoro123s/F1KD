export const splitChildBirthPlace = (value = '') => {
  const place = String(value ?? '').trim();
  if (!place) return { birthPlaceCity: '', birthPlaceProvince: '' };

  const parts = place.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { birthPlaceCity: place, birthPlaceProvince: '' };

  return {
    birthPlaceCity: parts.slice(0, -1).join(', '),
    birthPlaceProvince: parts[parts.length - 1],
  };
};

export const joinChildBirthPlace = (city = '', province = '') => {
  const normalizedCity = String(city ?? '').trim();
  const normalizedProvince = String(province ?? '').trim();
  if (normalizedCity && normalizedProvince) return `${normalizedCity}, ${normalizedProvince}`;
  return normalizedCity || normalizedProvince;
};
