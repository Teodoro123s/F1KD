function splitBirthPlace(value) {
  const place = String(value ?? '').trim();
  const parts = place.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { birthPlaceCity: place, birthPlaceProvince: '' };
  return {
    birthPlaceCity: parts.slice(0, -1).join(', '),
    birthPlaceProvince: parts[parts.length - 1],
  };
}

module.exports = { splitBirthPlace };
