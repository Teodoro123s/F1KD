import React from 'react';
import MotherCheckup from './MotherCheckup';

const calculateAge = (dobString) => {
  if (!dobString) return 26;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const getInitials = (name) => {
  if (!name) return 'NA';
  const parts = name.trim().split(' ');
  const initials = [parts[0]?.[0], parts[parts.length - 1]?.[0]]
    .filter(Boolean)
    .join('');
  return initials.toUpperCase();
};

const getTrimesterNumber = (trimester) => {
  if (trimester?.includes('1st')) return 1;
  if (trimester?.includes('2nd')) return 2;
  if (trimester?.includes('3rd')) return 3;
  return 1;
};

const countCompletedCheckups = (checkups = []) =>
  (checkups.flatMap((row) => row || []).filter((item) => item?.completed).length || 0);

export default function MotherDetailPage({ selectedMother, onClose }) {
  if (!selectedMother) return null;

  const motherName = selectedMother.motherName || selectedMother.communityName || selectedMother.name;
  const batchName = selectedMother.batchName || selectedMother.batch || 'Oct 2023';
  const age = calculateAge(selectedMother.dob);
  const motherId = selectedMother.motherId || selectedMother.id || '177430';
  const bloodType = selectedMother.bloodType || 'O+';
  const trimester = selectedMother.trimester || '2nd Trimester';
  const completedCheckupsCount = countCompletedCheckups(selectedMother.checkups);
  const checkupProgress = Math.round((completedCheckupsCount / 9) * 100);
  const initials = getInitials(motherName);
  const trimesterNumber = getTrimesterNumber(trimester);
  // Additional user-management fields (mapped when viewing a user)
  const firstName = selectedMother.firstName || '';
  const lastName = selectedMother.lastName || '';
  const middleInitial = selectedMother.middleInitial || '';
  const contactNumber = selectedMother.contactNumber || selectedMother.contact || '';
  const email = selectedMother.email || '';
  const gender = selectedMother.gender || '';
  const location = selectedMother.location || '';
  const role = selectedMother.role || '';
  const status = selectedMother.status || '';

  return (
    <section className="community-page" style={{ padding: '0 0 24px' }}>
      {/* 
        Underline placed here – right after the breadcrumb (rendered by parent)
        and before the container that holds everything.
      */}
      <div style={{ width: '100%', height: '1px', background: '#E2E8F0', marginBottom: '12px' }} />

      {/* Container: wraps mother's name, actions, and stats */}
      <div className="mother-detail-header-card">
        <div className="mother-detail-header-main">
          <div className="mother-detail-text-block">
            <div className="mother-detail-title-row">
              <h1 className="mother-detail-name-text">{motherName}</h1>
              <div className={`mother-detail-trimester-badge trimester-badge--${trimesterNumber}`}>
                {trimester}
              </div>
            </div>

            <div className="mother-detail-user-info" style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div><strong>First Name:</strong> {firstName || initials}</div>
                <div><strong>Last Name:</strong> {lastName || '-'}</div>
                <div><strong>Middle Initial:</strong> {middleInitial || '-'}</div>
                <div><strong>Contact:</strong> {contactNumber || '-'}</div>
                <div><strong>Email:</strong> {email || '-'}</div>
                <div><strong>Gender:</strong> {gender || '-'}</div>
                <div><strong>Location:</strong> {location || batchName}</div>
                <div><strong>Role:</strong> {role || '-'}</div>
                <div><strong>Status:</strong> {status || '-'}</div>
              </div>
            </div>

            <div className="mother-detail-progress-row">
              <div className="mother-detail-progress-bar">
                <div
                  className="mother-detail-progress-fill"
                  style={{ width: `${checkupProgress}%` }}
                />
              </div>
              <div className="mother-detail-progress-text">
                {completedCheckupsCount}/9 checkups completed
              </div>
            </div>
          </div>
        </div>

        <div className="mother-detail-actions-block">
          <button type="button" className="btn-edit-profile-custom" onClick={() => {}}>
            Edit Profile
          </button>
          <button type="button" className="btn-close-profile-custom" onClick={onClose} aria-label="Close mother profile">
            ✕
          </button>
        </div>
      </div>

      <MotherCheckup mother={selectedMother} onCancel={onClose} />
    </section>
  );
}