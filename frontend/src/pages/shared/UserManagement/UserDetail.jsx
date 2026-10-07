import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import MotherDetailPage from '../Beneficiary/MotherDetailPage';

export default function UserDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = location?.state?.user || { id };

  // Map user fields into the shape expected by MotherDetailPage
  const selectedMother = {
    motherName: user.name,
    dob: user.dob || user.dateOfBirth || '',
    motherId: user.id,
    batchName: user.location || '',
    bloodType: user.bloodType || '',
    trimester: user.trimester || '1st Trimester',
    checkups: user.checkups || [],
  };

  const handleClose = () => navigate('/user-management');

  return <MotherDetailPage selectedMother={selectedMother} onClose={handleClose} />;
}
