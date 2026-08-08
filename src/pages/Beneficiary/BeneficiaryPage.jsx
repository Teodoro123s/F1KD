import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import BeneficiaryTable from './BeneficiaryTable';
import {
  CreateCommunityModal,
  CreateBatchModal,
  EditBatchModal,
  CreateGroupModal,
  EditGroupModal,
} from './BeneficiaryModals';
import { MotherFormFields } from './BeneficiaryMother';
import { ChildFormFields } from './BeneficiaryChild';
import {
  SearchIcon,
  PlusIcon,
  BuildingIcon,
  GroupsIcon,
  StatusAllIcon,
  StatusMissingIcon,
  StatusPendingIcon,
  StatusDoneIcon,
} from './BeneficiaryIcons';

const makeMockMother = (id, name, area, progress, batches, records, override = {}) => {
  const parts = name.split(' ');
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.length > 2 ? parts[1] : 'Dela Cruz';
  
  const idNum = parseInt(id.split('-')[1], 10);
  const isHighRisk = override.isHighRisk || (idNum % 5 === 0 ? 'Yes' : 'No');
  
  // LMP date some months ago
  const lmpDaysAgo = 60 + (idNum % 5) * 30;
  const lmpDateObj = new Date();
  lmpDateObj.setDate(lmpDateObj.getDate() - lmpDaysAgo);
  const lmpDate = lmpDateObj.toISOString().split('T')[0];
  
  const eddDateObj = new Date(lmpDateObj.getTime() + 280 * 24 * 60 * 60 * 1000);
  const eddDate = eddDateObj.toISOString().split('T')[0];

  const dobYear = 1990 + (idNum % 10);
  const dobMonth = String((idNum % 12) + 1).padStart(2, '0');
  const dobDay = String((idNum % 28) + 1).padStart(2, '0');
  const dob = `${dobYear}-${dobMonth}-${dobDay}`;

  const prenatalRegDateObj = new Date(lmpDateObj.getTime() + 45 * 24 * 60 * 60 * 1000);
  const prenatalRegDate = prenatalRegDateObj.toISOString().split('T')[0];
  
  const trimesters = ['1st Trimester', '2nd Trimester', '3rd Trimester'];
  const trimester = trimesters[idNum % 3];

  const obHistory = [
    { event: 'G1', gestationalAge: '39 weeks', outcome: 'Normal Vaginal Delivery, Healthy baby' },
    { event: 'G2', gestationalAge: '', outcome: '' },
    { event: 'G3', gestationalAge: '', outcome: '' },
    { event: 'G4', gestationalAge: '', outcome: '' },
    { event: 'G5', gestationalAge: '', outcome: '' },
    { event: 'G6', gestationalAge: '', outcome: '' },
    { event: 'G7', gestationalAge: '', outcome: '' }
  ];

  return {
    id,
    name,
    firstName,
    middleName,
    lastName,
    suffix: '',
    motherId: `M-2026-${String(idNum).padStart(4, '0')}`,
    weight: String(50 + (idNum % 15)),
    height: String(150 + (idNum % 12)),
    dob,
    lmpDate,
    eddDate,
    contactNumber: `0917${String(1234567 + idNum * 99).padEnd(7, '0')}`,
    isHighRisk,
    programType: 'Maternal Health Program',
    emergencyName: `Juan ${lastName}`,
    emergencyContact: `0918${String(7654321 - idNum * 99).padEnd(7, '0')}`,
    emergencyRelationship: 'Husband',
    spouseName: `Juan ${lastName}`,
    address: `${10 + idNum} Mabini St, Barangay ${area}, Province`,
    
    // Prenatal
    prenatalRegDate,
    trimester,
    gestationalAge: String(8 + (idNum % 8)),
    prenatalWeight: String(49 + (idNum % 15)),
    prenatalBp: idNum % 4 === 0 ? '130/90' : '110/70',
    prenatalHeight: String(150 + (idNum % 12)),
    fundalHeight: String(12 + (idNum % 6)),
    fhr: String(140 + (idNum % 10)),

    // OB
    gravida: String(1 + (idNum % 3)),
    para: String(idNum % 3),
    abortion: '0',
    stillbirth: '0',
    obHistory,

    // Medical Conditions
    medicalConditions: {
      hypertension: idNum % 4 === 0,
      diabetes: idNum % 6 === 0,
      asthma: idNum % 7 === 0,
      heartDisease: false,
      kidneyDisease: false,
      epilepsy: false,
      goiter: false,
      tuberculosis: false,
      cancer: false,
      std: false,
      multiplePregnancy: false,
      prevCesarean: idNum % 5 === 0
    },
    otherMedicalHistory: idNum % 7 === 0 ? 'Asthma controlled' : 'None',

    // Dental Health
    dentalCheckupDate: prenatalRegDate,
    dentalFacility: `${area} Health Center`,
    dentistInCharge: 'Dr. Santos Dela Cruz',
    communityDentist: 'Dr. Santos Dela Cruz',
    dentistLicense: 'LIC-789012',
    dentistContact: '09201234567',
    teethCount: '28',
    dentalFindings: 'Normal check-up',
    dentalWork: {
      tartarRemoval: idNum % 3 === 0,
      filling: false,
      cleaning: true,
      extraction: false,
      rootCanal: false,
      other: false
    },
    dentalRemarks: 'Keep brushing twice daily.',

    // Vaccines
    tt1Date: lmpDate,
    tt1Remarks: 'Dose 1',
    tt2Date: prenatalRegDate,
    tt2Remarks: 'Dose 2',
    tt3Date: '',
    tt3Remarks: '',
    tt4Date: '',
    tt4Remarks: '',
    tt5Date: '',
    tt5Remarks: '',

    area,
    batches,
    records,
    progress,
    ...override
  };
};

const initialCommunityData = [
  makeMockMother('SCH-0001', 'Maria Santos', 'Poblacion', 72, 2, 3),
  makeMockMother('SCH-0002', 'Liza Reyes', 'Poblacion', 58, 1, 2),
  makeMockMother('SCH-0003', 'Ana Cruz', 'Poblacion', 84, 2, 4),
  makeMockMother('SCH-0004', 'Teresa Gomez', 'Upland', 65, 3, 8),
  makeMockMother('SCH-0005', 'Isabel Mendoza', 'Downtown', 91, 4, 12),
  makeMockMother('SCH-0006', 'Clara dela Cruz', 'Coastal', 48, 1, 5),
  makeMockMother('SCH-0007', 'Lucia Rivera', 'Riverside', 77, 2, 7),
  makeMockMother('SCH-0008', 'Rosa Fernandez', 'Highland', 69, 2, 6),
  makeMockMother('SCH-0009', 'Elena Mercado', 'Forest', 55, 1, 3),
  makeMockMother('SCH-0010', 'Nora Santos', 'Lowland', 95, 5, 18),
  makeMockMother('SCH-0011', 'May Torres', 'Coastal', 38, 1, 2),
  makeMockMother('SCH-0012', 'Gloria Diaz', 'Highland', 82, 3, 9),
];


const initialBatchesData = [
  { id: 'BAT-0001', name: 'Health Visit 1', community: 'Maria Santos', records: 2, progress: 68, status: 'Active' },
  { id: 'BAT-0002', name: 'Health Visit 2', community: 'Maria Santos', records: 1, progress: 45, status: 'Active' },
  { id: 'BAT-0003', name: 'Health Visit 3', community: 'Liza Reyes', records: 2, progress: 92, status: 'Completed' },
  { id: 'BAT-0004', name: 'Health Visit 4', community: 'Ana Cruz', records: 2, progress: 100, status: 'Completed' },
  { id: 'BAT-0005', name: 'Health Visit 5', community: 'Ana Cruz', records: 2, progress: 57, status: 'Active' },
  { id: 'BAT-0006', name: 'Health Visit 6', community: 'Teresa Gomez', records: 3, progress: 18, status: 'Pending' },
  { id: 'BAT-0007', name: 'Health Visit 7', community: 'Teresa Gomez', records: 3, progress: 74, status: 'Active' },
  { id: 'BAT-0008', name: 'Health Visit 8', community: 'Teresa Gomez', records: 2, progress: 63, status: 'Active' },
  { id: 'BAT-0009', name: 'Health Visit 9', community: 'Isabel Mendoza', records: 4, progress: 88, status: 'Completed' },
  { id: 'BAT-0010', name: 'Health Visit 10', community: 'Isabel Mendoza', records: 3, progress: 41, status: 'Active' },
  { id: 'BAT-0011', name: 'Health Visit 11', community: 'Isabel Mendoza', records: 3, progress: 22, status: 'Pending' },
  { id: 'BAT-0012', name: 'Health Visit 12', community: 'Isabel Mendoza', records: 2, progress: 50, status: 'Active' },
];

const initialGroupsData = [
  {
    id: 'GRP-0001',
    name: 'Child Alpha',
    community: 'Maria Santos',
    assignedBatchIds: ['BAT-0001', 'BAT-0002'],
    leader: 'Liza Reyes',
    members: 12,
    status: 'Active',
    batches: 2,
  },
  {
    id: 'GRP-0002',
    name: 'Child Bravo',
    community: 'Liza Reyes',
    assignedBatchIds: ['BAT-0003'],
    leader: 'Marco Santos',
    members: 8,
    status: 'Pending',
    batches: 1,
  },
  {
    id: 'GRP-0003',
    name: 'Child Delta',
    community: 'Ana Cruz',
    assignedBatchIds: ['BAT-0004', 'BAT-0005', 'BAT-0008'],
    leader: 'Ana Cruz',
    members: 15,
    status: 'Active',
    batches: 3,
  },
  {
    id: 'GRP-0004',
    name: 'Child Sierra',
    community: 'Teresa Gomez',
    assignedBatchIds: [],
    leader: 'Renato Diaz',
    members: 6,
    status: 'Completed',
    batches: 0,
  },
  {
    id: 'GRP-0005',
    name: 'Child Central',
    community: 'Isabel Mendoza',
    assignedBatchIds: ['BAT-0009'],
    leader: 'May Torres',
    members: 9,
    status: 'Active',
    batches: 1,
  },
];

const STATUS_OPTIONS = [
  { key: 'All', label: 'All', icon: StatusAllIcon },
  { key: 'Missing', label: 'Missing', icon: StatusMissingIcon },
  { key: 'Pending', label: 'Pending', icon: StatusPendingIcon },
  { key: 'Done', label: 'Done', icon: StatusDoneIcon },
];

export default function BeneficiaryPage() {
  const [communities, setCommunities] = useState(initialCommunityData);
  const [batches, setBatches] = useState(initialBatchesData);
  const [groups, setGroups] = useState(initialGroupsData);

  const [activeTab, setActiveTab] = useState('groups');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');

  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [beneficiaryView, setBeneficiaryView] = useState('list'); // 'list', 'create_mother', 'edit_mother'
  const [activeFormTab, setActiveFormTab] = useState('general');
  const [showMotherCheckup, setShowMotherCheckup] = useState(false);
  const [activeTrimester, setActiveTrimester] = useState(null);
  const [activeStep, setActiveStep] = useState(null);

  const formTabList = [
    { id: 'general', label: '1. General Info' },
    { id: 'prenatal', label: '2. Prenatal & OB' },
    { id: 'medical_dental', label: '3. Medical & Dental' },
    { id: 'vaccine', label: '4. Vaccine Record' }
  ];

  const handleFormNext = () => {
    if (activeFormTab === 'general') {
      setActiveFormTab('prenatal');
    } else if (activeFormTab === 'prenatal') {
      setActiveFormTab('medical_dental');
    } else if (activeFormTab === 'medical_dental') {
      setActiveFormTab('vaccine');
    }
  };

  const handleFormBack = () => {
    if (activeFormTab === 'vaccine') {
      setActiveFormTab('medical_dental');
    } else if (activeFormTab === 'medical_dental') {
      setActiveFormTab('prenatal');
    } else if (activeFormTab === 'prenatal') {
      setActiveFormTab('general');
    }
  };

  const [communityForm, setCommunityForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    motherId: '',
    weight: '',
    height: '',
    dob: '',
    lmpDate: '',
    eddDate: '',
    contactNumber: '',
    isHighRisk: 'No',
    programType: 'Maternal Health Program',
    emergencyName: '',
    emergencyContact: '',
    emergencyRelationship: '',
    spouseName: '',
    address: '',
    prenatalRegDate: '',
    trimester: '1st Trimester',
    gestationalAge: '',
    prenatalWeight: '',
    prenatalBp: '',
    prenatalHeight: '',
    fundalHeight: '',
    fhr: '',
    gravida: '',
    para: '',
    abortion: '',
    stillbirth: '',
    obHistory: [
      { event: 'G1', gestationalAge: '', outcome: '' },
      { event: 'G2', gestationalAge: '', outcome: '' },
      { event: 'G3', gestationalAge: '', outcome: '' },
      { event: 'G4', gestationalAge: '', outcome: '' },
      { event: 'G5', gestationalAge: '', outcome: '' },
      { event: 'G6', gestationalAge: '', outcome: '' },
      { event: 'G7', gestationalAge: '', outcome: '' },
    ],
    medicalConditions: {
      hypertension: false,
      diabetes: false,
      asthma: false,
      heartDisease: false,
      kidneyDisease: false,
      epilepsy: false,
      goiter: false,
      tuberculosis: false,
      cancer: false,
      std: false,
      multiplePregnancy: false,
      prevCesarean: false,
    },
    otherMedicalHistory: '',
    dentalCheckupDate: '',
    dentalFacility: '',
    dentistInCharge: '',
    communityDentist: '',
    dentistLicense: '',
    dentistContact: '',
    teethCount: '',
    dentalFindings: '',
    dentalWork: {
      tartarRemoval: false,
      filling: false,
      cleaning: false,
      extraction: false,
      rootCanal: false,
      other: false,
    },
    dentalRemarks: '',
    tt1Date: '', tt1Remarks: '',
    tt2Date: '', tt2Remarks: '',
    tt3Date: '', tt3Remarks: '',
    tt4Date: '', tt4Remarks: '',
    tt5Date: '', tt5Remarks: '',
    area: 'Poblacion',
    community: '',
    group: '',
    batch: '',
  });
  const [groupForm, setGroupForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    birthDate: '',
    birthWeight: '',
    birthLength: '',
    gender: '',
    deliveryType: '',
    healthStatus: '',
    community: '',
    assignedBatchIds: [],
    leader: '',
    members: 1,
    status: 'Active',
  });
  const [batchForm, setBatchForm] = useState({ name: '', community: '', records: 1, progress: 0, status: 'Active' });

  const navigate = useNavigate();
  const { schoolId, groupId } = useParams();
  const location = useLocation();

  const selectedSchool = useMemo(
    () => communities.find((comm) => comm.id === schoolId),
    [communities, schoolId]
  );

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === groupId),
    [groups, groupId]
  );

  useEffect(() => {
    if (groupId) {
      setActiveTab('batches');
    } else if (schoolId) {
      setActiveTab('groups');
    } else {
      setActiveTab('groups');
    }
  }, [schoolId, groupId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkup = params.get('checkup');
    setShowMotherCheckup(!!checkup);
    if (checkup) {
      const t = parseInt(params.get('trimester'), 10);
      const s = parseInt(params.get('step'), 10);
      setActiveTrimester(Number.isFinite(t) ? t : null);
      setActiveStep(Number.isFinite(s) ? s : null);
    } else {
      setActiveTrimester(null);
      setActiveStep(null);
    }
  }, [location.search]);

  const breadcrumbItems = useMemo(() => {
    const items = [{ label: 'Beneficiary', clickable: false }];
    const path = location?.pathname || '';

    if (path.includes('/beneficiary/create/mother')) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (path.includes('/beneficiary/create/child')) {
      items.push({ label: 'Child', clickable: false });
      items.push({ label: 'Create', clickable: false });
    } else if (selectedSchool) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: selectedSchool.name, clickable: false });
    } else if (selectedGroup) {
      items.push({ label: 'Mother', clickable: false });
      items.push({ label: selectedGroup.name, clickable: false });
    } else {
      items.push({ label: 'Mother', clickable: false });
    }
    return items;
  }, [location?.pathname, selectedSchool, selectedGroup]);

  const selectedSchoolGroups = useMemo(() => {
    if (!selectedSchool) return [];
    const term = query.trim().toLowerCase();
    return groups
      .filter((group) => group.community === selectedSchool.name)
      .filter((group) => {
        if (!term) return true;
        return (
          group.name.toLowerCase().includes(term) ||
          group.id.toLowerCase().includes(term) ||
          group.leader.toLowerCase().includes(term) ||
          group.status.toLowerCase().includes(term)
        );
      });
  }, [groups, selectedSchool, query]);

  const selectedGroupBatches = useMemo(() => {
    if (!selectedGroup) return [];
    const term = query.trim().toLowerCase();
    const groupBatchIds = selectedGroup.assignedBatchIds || [];
    return batches
      .filter((batch) => groupBatchIds.includes(batch.id))
      .filter((batch) => {
        if (!term) return true;
        return (
          batch.name.toLowerCase().includes(term) ||
          batch.id.toLowerCase().includes(term) ||
          batch.community.toLowerCase().includes(term) ||
          batch.status.toLowerCase().includes(term)
        );
      });
  }, [batches, selectedGroup, query]);

  const getGroupStatusByProgress = (group) => {
    const groupBatchIds = group.assignedBatchIds || [];
    const groupBatches = batches.filter((batch) => groupBatchIds.includes(batch.id));
    const averageProgress = groupBatches.length
      ? Math.round(groupBatches.reduce((sum, batch) => sum + (batch.progress ?? 0), 0) / groupBatches.length)
      : 0;

    if (averageProgress < 60) return 'Missing';
    if (averageProgress < 90) return 'Pending';
    return 'Done';
  };

  useEffect(() => {
    function closeDropdowns() {
      setActiveDropdownId(null);
      setCreateDropdownOpen(false);
    }
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    if (communities.length > 0 && !batchForm.community) {
      setBatchForm((prev) => ({ ...prev, community: communities[0].name }));
    }
    if (communities.length > 0 && !groupForm.community) {
      setGroupForm((prev) => ({ ...prev, community: communities[0].name }));
    }
  }, [communities, batchForm.community, groupForm.community]);

  const handleCommunityRowClick = (row, type) => {
    if (type === 'mother') {
      const school = communities.find((comm) => comm.name === row.community);
      if (school) {
        navigate(`/beneficiary/school/${school.id}?checkup=1`);
      }
      return;
    }

    if (type === 'child') {
      navigate(`/beneficiary/group/${row.id}`);
    }
  };

  const filteredData = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (activeTab === 'communities') {
      if (!term) return communities;
      return communities.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.id.toLowerCase().includes(term) ||
          c.area.toLowerCase().includes(term)
      );
    }

    if (activeTab === 'batches') {
      if (!term) return batches;
      return batches.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.id.toLowerCase().includes(term) ||
          b.community.toLowerCase().includes(term) ||
          b.status.toLowerCase().includes(term)
      );
    }

    // groups tab: search child and mother name and keep all-view sorting by status
    let groupSet = groups;
    if (selectedStatusFilter !== 'All') {
      groupSet = groupSet.filter((g) => getGroupStatusByProgress(g) === selectedStatusFilter);
    }

    if (term) {
      groupSet = groupSet.filter(
        (g) =>
          g.name.toLowerCase().includes(term) ||
          (g.community || '').toLowerCase().includes(term)
      );
    }

    if (selectedStatusFilter === 'All') {
      const statusOrder = { Missing: 0, Pending: 1, Done: 2 };
      groupSet = [...groupSet].sort((a, b) => {
        const statusA = statusOrder[getGroupStatusByProgress(a)];
        const statusB = statusOrder[getGroupStatusByProgress(b)];
        if (statusA !== statusB) return statusA - statusB;
        return a.name.localeCompare(b.name);
      });
    }

    return groupSet;
  }, [activeTab, query, communities, batches, groups, selectedStatusFilter]);

  const currentFilteredData =
    groupId && activeTab === 'batches' ? selectedGroupBatches :
    selectedSchool && activeTab === 'groups' ? selectedSchoolGroups :
    filteredData;
  const pageCount = Math.max(1, Math.ceil(currentFilteredData.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const currentStart = (currentPage - 1) * perPage;
  const currentRows = currentFilteredData.slice(currentStart, currentStart + perPage);

  const rangeStart = currentFilteredData.length === 0 ? 0 : currentStart + 1;
  const rangeEnd = Math.min(currentStart + perPage, currentFilteredData.length);

  const motherProgressByName = useMemo(
    () => Object.fromEntries(communities.map((comm) => [comm.name, comm.progress ?? 0])),
    [communities]
  );

  const displayRows = useMemo(() => {
    if (activeTab === 'groups') {
      return currentRows.map((row) => {
        const groupBatchIds = row.assignedBatchIds || [];
        const groupBatches = batches.filter((batch) => groupBatchIds.includes(batch.id));
        const childProgress = groupBatches.length
          ? Math.round(groupBatches.reduce((sum, batch) => sum + (batch.progress ?? 0), 0) / groupBatches.length)
          : null;
        return { ...row, childProgress };
      });
    }
    return currentRows;
  }, [activeTab, currentRows, batches]);

  const displayLength = currentFilteredData.length;
  const displayRangeStart = rangeStart;
  const displayRangeEnd = rangeEnd;

  const handleSearch = (val) => {
    setQuery(val);
    setPage(1);
  };

  const handlePerPageChange = (val) => {
    setPerPage(Number(val));
    setPage(1);
  };

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  const openCreateModal = (e) => {
    e.stopPropagation();
    setCreateDropdownOpen((open) => !open);
  };

  const openCreateMother = () => {
    setCreateDropdownOpen(false);
    setCreateActiveTab('general');
    setCommunityForm({
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      motherId: '',
      weight: '',
      height: '',
      dob: '',
      lmpDate: '',
      eddDate: '',
      contactNumber: '',
      isHighRisk: 'No',
      programType: 'Maternal Health Program',
      emergencyName: '',
      emergencyContact: '',
      emergencyRelationship: '',
      spouseName: '',
      address: '',
      prenatalRegDate: '',
      trimester: '1st Trimester',
      gestationalAge: '',
      prenatalWeight: '',
      prenatalBp: '',
      prenatalHeight: '',
      fundalHeight: '',
      fhr: '',
      gravida: '',
      para: '',
      abortion: '',
      stillbirth: '',
      obHistory: [
        { event: 'G1', gestationalAge: '', outcome: '' },
        { event: 'G2', gestationalAge: '', outcome: '' },
        { event: 'G3', gestationalAge: '', outcome: '' },
        { event: 'G4', gestationalAge: '', outcome: '' },
        { event: 'G5', gestationalAge: '', outcome: '' },
        { event: 'G6', gestationalAge: '', outcome: '' },
        { event: 'G7', gestationalAge: '', outcome: '' },
      ],
      medicalConditions: {
        hypertension: false,
        diabetes: false,
        asthma: false,
        heartDisease: false,
        kidneyDisease: false,
        epilepsy: false,
        goiter: false,
        tuberculosis: false,
        cancer: false,
        std: false,
        multiplePregnancy: false,
        prevCesarean: false,
      },
      otherMedicalHistory: '',
      dentalCheckupDate: '',
      dentalFacility: '',
      dentistInCharge: '',
      communityDentist: '',
      dentistLicense: '',
      dentistContact: '',
      teethCount: '',
      dentalFindings: '',
      dentalWork: {
        tartarRemoval: false,
        filling: false,
        cleaning: false,
        extraction: false,
        rootCanal: false,
        other: false,
      },
      dentalRemarks: '',
      tt1Date: '', tt1Remarks: '',
      tt2Date: '', tt2Remarks: '',
      tt3Date: '', tt3Remarks: '',
      tt4Date: '', tt4Remarks: '',
      tt5Date: '', tt5Remarks: '',
      area: 'Poblacion',
      community: communities[0]?.name || '',
      group: groups[0]?.name || '',
      batch: batches[0]?.name || '',
    });
    navigate('/beneficiary/create/mother');
  };

  const openCreateChild = () => {
    setCreateDropdownOpen(false);
    setCreateActiveTab('general');
    setGroupForm({
      firstName: '',
      middleName: '',
      lastName: '',
      suffix: '',
      birthDate: '',
      birthWeight: '',
      birthLength: '',
      gender: '',
      deliveryType: '',
      healthStatus: '',
      birthPlace: '',
      birthAttendant: '',
      apgarScore: '',
      feedingType: '',
      nutritionNotes: '',
      medicalConditions: {
        congenitalHeartDisease: false,
        respiratoryIssues: false,
        prematurity: false,
        jaundice: false,
        anemia: false,
        growthDelay: false,
      },
      medicalRemarks: '',
      bcgDate: '',
      bcgRemarks: '',
      hepbDate: '',
      hepbRemarks: '',
      opvDate: '',
      opvRemarks: '',
      dptDate: '',
      dptRemarks: '',
      mmrDate: '',
      mmrRemarks: '',
      community: communities[0]?.name || '',
      batch: '',
      assignedBatchIds: [],
      leader: '',
      members: 1,
      status: 'Active',
    });
    navigate('/beneficiary/create/child');
  };

  const isCreateMother = location.pathname.includes('/beneficiary/create/mother');
  const isCreateChild = location.pathname.includes('/beneficiary/create/child');
  const [createActiveTab, setCreateActiveTab] = useState('general');
  const CREATE_STEPS = ['general', 'prenatal', 'medical_dental', 'vaccine'];
  const createActiveIndex = CREATE_STEPS.indexOf(createActiveTab) >= 0 ? CREATE_STEPS.indexOf(createActiveTab) : 0;
  const createProgressPercent = Math.round(((createActiveIndex + 1) / CREATE_STEPS.length) * 100);

  const openEditMother = (mother) => {
    setSelectedItem(mother);
    setCommunityForm({
      firstName: mother.firstName || '',
      middleName: mother.middleName || '',
      lastName: mother.lastName || '',
      suffix: mother.suffix || '',
      motherId: mother.motherId || '',
      weight: mother.weight || '',
      height: mother.height || '',
      dob: mother.dob || '',
      lmpDate: mother.lmpDate || '',
      eddDate: mother.eddDate || '',
      contactNumber: mother.contactNumber || '',
      isHighRisk: mother.isHighRisk || 'No',
      programType: mother.programType || 'Maternal Health Program',
      emergencyName: mother.emergencyName || '',
      emergencyContact: mother.emergencyContact || '',
      emergencyRelationship: mother.emergencyRelationship || '',
      spouseName: mother.spouseName || '',
      address: mother.address || '',
      prenatalRegDate: mother.prenatalRegDate || '',
      trimester: mother.trimester || '1st Trimester',
      gestationalAge: mother.gestationalAge || '',
      prenatalWeight: mother.prenatalWeight || '',
      prenatalBp: mother.prenatalBp || '',
      prenatalHeight: mother.prenatalHeight || '',
      fundalHeight: mother.fundalHeight || '',
      fhr: mother.fhr || '',
      gravida: mother.gravida || '',
      para: mother.para || '',
      abortion: mother.abortion || '',
      stillbirth: mother.stillbirth || '',
      obHistory: mother.obHistory || [
        { event: 'G1', gestationalAge: '', outcome: '' },
        { event: 'G2', gestationalAge: '', outcome: '' },
        { event: 'G3', gestationalAge: '', outcome: '' },
        { event: 'G4', gestationalAge: '', outcome: '' },
        { event: 'G5', gestationalAge: '', outcome: '' },
        { event: 'G6', gestationalAge: '', outcome: '' },
        { event: 'G7', gestationalAge: '', outcome: '' },
      ],
      medicalConditions: mother.medicalConditions || {
        hypertension: false,
        diabetes: false,
        asthma: false,
        heartDisease: false,
        kidneyDisease: false,
        epilepsy: false,
        goiter: false,
        tuberculosis: false,
        cancer: false,
        std: false,
        multiplePregnancy: false,
        prevCesarean: false,
      },
      otherMedicalHistory: mother.otherMedicalHistory || '',
      dentalCheckupDate: mother.dentalCheckupDate || '',
      dentalFacility: mother.dentalFacility || '',
      dentistInCharge: mother.dentistInCharge || '',
      communityDentist: mother.communityDentist || '',
      dentistLicense: mother.dentistLicense || '',
      dentistContact: mother.dentistContact || '',
      teethCount: mother.teethCount || '',
      dentalFindings: mother.dentalFindings || '',
      dentalWork: mother.dentalWork || {
        tartarRemoval: false,
        filling: false,
        cleaning: false,
        extraction: false,
        rootCanal: false,
        other: false,
      },
      dentalRemarks: mother.dentalRemarks || '',
      tt1Date: mother.tt1Date || '',
      tt1Remarks: mother.tt1Remarks || '',
      tt2Date: mother.tt2Date || '',
      tt2Remarks: mother.tt2Remarks || '',
      tt3Date: mother.tt3Date || '',
      tt3Remarks: mother.tt3Remarks || '',
      tt4Date: mother.tt4Date || '',
      tt4Remarks: mother.tt4Remarks || '',
      tt5Date: mother.tt5Date || '',
      tt5Remarks: mother.tt5Remarks || '',
      area: mother.area || 'Poblacion',
      community: mother.community || '',
      group: mother.group || '',
      batch: mother.batch || '',
    });
    // navigate to the mother's profile page when editing
    navigate(`/beneficiary/school/${mother.id}`);
  };

  

  const openEditModal = (item) => {
    setSelectedItem(item);
    if (activeTab === 'communities') {
      openEditMother(item);
      return;
    }

    if (activeTab === 'groups') {
      setGroupForm({
        name: item.name,
        firstName: item.firstName || '',
        middleName: item.middleName || '',
        lastName: item.lastName || '',
        suffix: item.suffix || '',
        birthDate: item.birthDate || '',
        birthWeight: item.birthWeight || '',
        birthLength: item.birthLength || '',
        gender: item.gender || '',
        deliveryType: item.deliveryType || '',
        healthStatus: item.healthStatus || '',
        community: item.community || communities[0]?.name || '',
        assignedBatchIds: item.assignedBatchIds || [],
        leader: item.leader,
        members: item.members,
        status: item.status,
      });
      setShowModal('editGroup');
      return;
    }

    setBatchForm({
      name: item.name,
      community: item.community,
      records: item.records,
      progress: item.progress ?? 0,
      status: item.status,
    });
    setShowModal('editBatch');
  };

  const handleCreateCommunity = (e) => {
    e.preventDefault();
    if (!communityForm.firstName.trim() || !communityForm.lastName.trim()) return;

    const currentMaxId = communities.reduce((max, c) => {
      const num = parseInt(c.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const fullName = `${communityForm.firstName.trim()} ${communityForm.middleName.trim()} ${communityForm.lastName.trim()} ${communityForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    const newCommunity = {
      id: `COM-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: fullName,
      firstName: communityForm.firstName.trim(),
      middleName: communityForm.middleName.trim(),
      lastName: communityForm.lastName.trim(),
      suffix: communityForm.suffix.trim(),
      motherId: communityForm.motherId,
      weight: communityForm.weight,
      height: communityForm.height,
      dob: communityForm.dob,
      lmpDate: communityForm.lmpDate,
      eddDate: communityForm.eddDate,
      contactNumber: communityForm.contactNumber,
      isHighRisk: communityForm.isHighRisk,
      programType: communityForm.programType,
      emergencyName: communityForm.emergencyName,
      emergencyContact: communityForm.emergencyContact,
      emergencyRelationship: communityForm.emergencyRelationship,
      spouseName: communityForm.spouseName,
      address: communityForm.address,
      prenatalRegDate: communityForm.prenatalRegDate,
      trimester: communityForm.trimester,
      gestationalAge: communityForm.gestationalAge,
      prenatalWeight: communityForm.prenatalWeight,
      prenatalBp: communityForm.prenatalBp,
      prenatalHeight: communityForm.prenatalHeight,
      fundalHeight: communityForm.fundalHeight,
      fhr: communityForm.fhr,
      gravida: communityForm.gravida,
      para: communityForm.para,
      abortion: communityForm.abortion,
      stillbirth: communityForm.stillbirth,
      obHistory: communityForm.obHistory,
      medicalConditions: communityForm.medicalConditions,
      otherMedicalHistory: communityForm.otherMedicalHistory,
      dentalCheckupDate: communityForm.dentalCheckupDate,
      dentalFacility: communityForm.dentalFacility,
      dentistInCharge: communityForm.dentistInCharge,
      communityDentist: communityForm.communityDentist,
      dentistLicense: communityForm.dentistLicense,
      dentistContact: communityForm.dentistContact,
      teethCount: communityForm.teethCount,
      dentalFindings: communityForm.dentalFindings,
      dentalWork: communityForm.dentalWork,
      dentalRemarks: communityForm.dentalRemarks,
      tt1Date: communityForm.tt1Date,
      tt1Remarks: communityForm.tt1Remarks,
      tt2Date: communityForm.tt2Date,
      tt2Remarks: communityForm.tt2Remarks,
      tt3Date: communityForm.tt3Date,
      tt3Remarks: communityForm.tt3Remarks,
      tt4Date: communityForm.tt4Date,
      tt4Remarks: communityForm.tt4Remarks,
      tt5Date: communityForm.tt5Date,
      tt5Remarks: communityForm.tt5Remarks,
      area: communityForm.area,
      batches: 0,
      records: 0,
      progress: 0,
    };

    setCommunities((prev) => [newCommunity, ...prev]);
    setShowModal(null);
    if (isCreateMother) navigate('/beneficiary');
  };

  const handleEditCommunity = (e) => {
    e.preventDefault();
    if (!communityForm.firstName.trim() || !communityForm.lastName.trim()) return;

    const fullName = `${communityForm.firstName.trim()} ${communityForm.middleName.trim()} ${communityForm.lastName.trim()} ${communityForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    setCommunities((prev) =>
      prev.map((c) =>
        c.id === selectedItem.id
          ? {
              ...c,
              name: fullName,
              firstName: communityForm.firstName.trim(),
              middleName: communityForm.middleName.trim(),
              lastName: communityForm.lastName.trim(),
              suffix: communityForm.suffix.trim(),
              motherId: communityForm.motherId,
              weight: communityForm.weight,
              height: communityForm.height,
              dob: communityForm.dob,
              lmpDate: communityForm.lmpDate,
              eddDate: communityForm.eddDate,
              contactNumber: communityForm.contactNumber,
              isHighRisk: communityForm.isHighRisk,
              programType: communityForm.programType,
              emergencyName: communityForm.emergencyName,
              emergencyContact: communityForm.emergencyContact,
              emergencyRelationship: communityForm.emergencyRelationship,
              spouseName: communityForm.spouseName,
              address: communityForm.address,
              prenatalRegDate: communityForm.prenatalRegDate,
              trimester: communityForm.trimester,
              gestationalAge: communityForm.gestationalAge,
              prenatalWeight: communityForm.prenatalWeight,
              prenatalBp: communityForm.prenatalBp,
              prenatalHeight: communityForm.prenatalHeight,
              fundalHeight: communityForm.fundalHeight,
              fhr: communityForm.fhr,
              gravida: communityForm.gravida,
              para: communityForm.para,
              abortion: communityForm.abortion,
              stillbirth: communityForm.stillbirth,
              obHistory: communityForm.obHistory,
              medicalConditions: communityForm.medicalConditions,
              otherMedicalHistory: communityForm.otherMedicalHistory,
              dentalCheckupDate: communityForm.dentalCheckupDate,
              dentalFacility: communityForm.dentalFacility,
              dentistInCharge: communityForm.dentistInCharge,
              communityDentist: communityForm.communityDentist,
              dentistLicense: communityForm.dentistLicense,
              dentistContact: communityForm.dentistContact,
              teethCount: communityForm.teethCount,
              dentalFindings: communityForm.dentalFindings,
              dentalWork: communityForm.dentalWork,
              dentalRemarks: communityForm.dentalRemarks,
              tt1Date: communityForm.tt1Date,
              tt1Remarks: communityForm.tt1Remarks,
              tt2Date: communityForm.tt2Date,
              tt2Remarks: communityForm.tt2Remarks,
              tt3Date: communityForm.tt3Date,
              tt3Remarks: communityForm.tt3Remarks,
              tt4Date: communityForm.tt4Date,
              tt4Remarks: communityForm.tt4Remarks,
              tt5Date: communityForm.tt5Date,
              tt5Remarks: communityForm.tt5Remarks,
              area: communityForm.area,
            }
          : c
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleDeleteCommunity = (id) => {
    if (window.confirm('Are you sure you want to delete this community?')) {
      setCommunities((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleCancelCheckup = () => {
    setShowMotherCheckup(false);
  };

  const handleSaveCheckup = () => {
    if (!selectedSchool) return;
    // persist any changes from selectedSchool back into communities (no-op if unchanged)
    setCommunities((prev) => prev.map((c) => (c.id === selectedSchool.id ? { ...c, ...selectedSchool } : c)));
    setShowMotherCheckup(false);
  };

  const openCheckup = (trimesterNum, stepNum) => {
    if (!selectedSchool) return;
    // navigate with query params for trimester and step
    navigate(`/beneficiary/school/${selectedSchool.id}?checkup=1&trimester=${trimesterNum}&step=${stepNum}`);
    setShowMotherCheckup(true);
    setActiveTrimester(trimesterNum);
    setActiveStep(stepNum);
  };

  const handleCreateBatch = (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    const currentMaxId = batches.reduce((max, b) => {
      const num = parseInt(b.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const newBatch = {
      id: `BAT-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: batchForm.name.trim(),
      community: batchForm.community,
      records: Number(batchForm.records) || 0,
      progress: Number(batchForm.progress) || 0,
      status: batchForm.status,
    };

    setBatches((prev) => [newBatch, ...prev]);
    setShowModal(null);
  };

  const handleEditBatch = (e) => {
    e.preventDefault();
    if (!batchForm.name.trim()) return;

    setBatches((prev) =>
      prev.map((b) =>
        b.id === selectedItem.id
          ? {
              ...b,
              name: batchForm.name.trim(),
              community: batchForm.community,
              records: Number(batchForm.records) || 0,
              progress: Number(batchForm.progress) || 0,
              status: batchForm.status,
            }
          : b
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupForm.firstName.trim() || !groupForm.lastName.trim()) return;

    const currentMaxId = groups.reduce((max, g) => {
      const num = parseInt(g.id.split('-')[1], 10);
      return num > max ? num : max;
    }, 0);

    const fullName = `${groupForm.firstName.trim()} ${groupForm.middleName.trim()} ${groupForm.lastName.trim()} ${groupForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    const newGroup = {
      id: `GRP-${String(currentMaxId + 1).padStart(4, '0')}`,
      name: fullName,
      firstName: groupForm.firstName.trim(),
      middleName: groupForm.middleName.trim(),
      lastName: groupForm.lastName.trim(),
      suffix: groupForm.suffix.trim(),
      birthDate: groupForm.birthDate,
      birthWeight: groupForm.birthWeight,
      birthLength: groupForm.birthLength,
      gender: groupForm.gender,
      deliveryType: groupForm.deliveryType,
      healthStatus: groupForm.healthStatus,
      birthPlace: groupForm.birthPlace,
      birthAttendant: groupForm.birthAttendant,
      apgarScore: groupForm.apgarScore,
      feedingType: groupForm.feedingType,
      nutritionNotes: groupForm.nutritionNotes,
      medicalConditions: groupForm.medicalConditions || {},
      medicalRemarks: groupForm.medicalRemarks,
      bcgDate: groupForm.bcgDate,
      bcgRemarks: groupForm.bcgRemarks,
      hepbDate: groupForm.hepbDate,
      hepbRemarks: groupForm.hepbRemarks,
      opvDate: groupForm.opvDate,
      opvRemarks: groupForm.opvRemarks,
      dptDate: groupForm.dptDate,
      dptRemarks: groupForm.dptRemarks,
      mmrDate: groupForm.mmrDate,
      mmrRemarks: groupForm.mmrRemarks,
      community: groupForm.community,
      batch: groupForm.batch,
      assignedBatchIds: groupForm.assignedBatchIds || [],
      leader: groupForm.leader.trim(),
      members: Number(groupForm.members) || 0,
      status: groupForm.status,
      batches: (groupForm.assignedBatchIds?.length ?? 0),
    };

    setGroups((prev) => [newGroup, ...prev]);
    setShowModal(null);
    if (isCreateChild) navigate('/beneficiary');
  };

  const handleEditGroup = (e) => {
    e.preventDefault();
    if (!groupForm.firstName.trim() || !groupForm.lastName.trim()) return;

    const fullName = `${groupForm.firstName.trim()} ${groupForm.middleName.trim()} ${groupForm.lastName.trim()} ${groupForm.suffix.trim()}`
      .replace(/\s+/g, ' ')
      .trim();

    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedItem.id
          ? {
              ...g,
              name: fullName,
              firstName: groupForm.firstName.trim(),
              middleName: groupForm.middleName.trim(),
              lastName: groupForm.lastName.trim(),
              suffix: groupForm.suffix.trim(),
              birthDate: groupForm.birthDate,
              birthWeight: groupForm.birthWeight,
              birthLength: groupForm.birthLength,
              gender: groupForm.gender,
              deliveryType: groupForm.deliveryType,
              healthStatus: groupForm.healthStatus,
              community: groupForm.community,
              assignedBatchIds: groupForm.assignedBatchIds || [],
              leader: groupForm.leader.trim(),
              members: Number(groupForm.members) || 0,
              status: groupForm.status,
              batches: (groupForm.assignedBatchIds?.length ?? 0),
            }
          : g
      )
    );
    setShowModal(null);
    setSelectedItem(null);
  };

  const handleDeleteBatch = (id) => {
    if (window.confirm('Are you sure you want to delete this batch?')) {
      setBatches((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const handleDeleteGroup = (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];

    buttons.push(
      <button
        key="first"
        type="button"
        className={`pagination-btn${currentPage === 1 ? ' disabled' : ''}`}
        onClick={() => setPage(1)}
        disabled={currentPage === 1}
        aria-label="First page"
      >
        «
      </button>
    );

    const maxVisible = 5;
    if (pageCount <= maxVisible) {
      for (let i = 1; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 3; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
      buttons.push(<span key="el-1" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    } else if (currentPage >= pageCount - 2) {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-2" className="pagination-btn ellipsis">...</span>);
      for (let i = pageCount - 2; i <= pageCount; i += 1) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-btn${currentPage === i ? ' active' : ''}`}
            onClick={() => setPage(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-btn${currentPage === 1 ? ' active' : ''}`}
          onClick={() => setPage(1)}
        >
          1
        </button>
      );
      buttons.push(<span key="el-3" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button key={currentPage} type="button" className="pagination-btn active">
          {currentPage}
        </button>
      );
      buttons.push(<span key="el-4" className="pagination-btn ellipsis">...</span>);
      buttons.push(
        <button
          key={pageCount}
          type="button"
          className={`pagination-btn${currentPage === pageCount ? ' active' : ''}`}
          onClick={() => setPage(pageCount)}
        >
          {pageCount}
        </button>
      );
    }

    buttons.push(
      <button
        key="last"
        type="button"
        className={`pagination-btn${currentPage === pageCount ? ' disabled' : ''}`}
        onClick={() => setPage(pageCount)}
        disabled={currentPage === pageCount}
        aria-label="Last page"
      >
        »
      </button>
    );

    return buttons;
  };

  return (
    <div className="community-page">
      <header className="community-header">
        <div className="community-title-section">
          <h1>Beneficiary</h1>
          <nav className="community-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbItems.map((item, index) => (
              <span key={`${item.label}-${index}`} className="breadcrumb-item">
                {item.clickable ? (
                  <button type="button" className="breadcrumb-link">{item.label}</button>
                ) : (
                  <span className="breadcrumb-current">{item.label}</span>
                )}
                {index < breadcrumbItems.length - 1 && <span className="breadcrumb-separator">›</span>}
              </span>
            ))}
          </nav>
        </div>
        {!(isCreateMother || isCreateChild) && (
          <div className="create-menu-wrapper">
            <button className="btn-create" onClick={openCreateModal} type="button">
              <PlusIcon />
              <span>Create</span>
            </button>
            {createDropdownOpen && (
              <div className="create-dropdown" role="menu">
                <button type="button" className="actions-dropdown-item" onClick={openCreateMother} role="menuitem">
                  Create Mother
                </button>
                <button type="button" className="actions-dropdown-item" onClick={openCreateChild} role="menuitem">
                  Create Child
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {isCreateMother ? (
        <section className="tabs-row create-view">
          <div className="stepper-progress">
            <div className="stepper-steps" role="tablist">
              {CREATE_STEPS.map((s, i) => {
                const label = s === 'general' ? 'General' : s === 'prenatal' ? 'Prenatal/OB' : s === 'medical_dental' ? 'Medical & Dental' : 'Vaccine';
                const isActive = createActiveTab === s;
                const isCompleted = i < createActiveIndex;
                return (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => setCreateActiveTab(s)}
                  >
                    <span className="stepper-step-index">
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="stepper-step-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="create-form-body">
            <form onSubmit={handleCreateCommunity}>
              <div className="modal-body-scrollable">
                <MotherFormFields
                  activeTab={createActiveTab}
                  form={communityForm}
                  setForm={setCommunityForm}
                  communities={communities}
                  groups={groups}
                  batches={batches}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => navigate('/beneficiary')}>Cancel</button>
                {createActiveTab !== 'general' && (
                  <button type="button" className="btn-secondary btn-back" onClick={() => {
                    if (createActiveTab === 'vaccine') setCreateActiveTab('medical_dental');
                    else if (createActiveTab === 'medical_dental') setCreateActiveTab('prenatal');
                    else setCreateActiveTab('general');
                  }}>Back</button>
                )}
                {createActiveTab !== 'vaccine' ? (
                  <button type="button" className="btn-primary btn-next" onClick={() => {
                    if (createActiveTab === 'general') setCreateActiveTab('prenatal');
                    else if (createActiveTab === 'prenatal') setCreateActiveTab('medical_dental');
                    else if (createActiveTab === 'medical_dental') setCreateActiveTab('vaccine');
                  }}>Next</button>
                ) : (
                  <button type="submit" className="btn-primary">Create</button>
                )}
              </div>
            </form>
          </div>
        </section>
      ) : isCreateChild ? (
        <section className="tabs-row create-view">
          <div className="stepper-progress">
            <div className="stepper-steps" role="tablist">
              {CREATE_STEPS.map((s, i) => {
                const label = s === 'general' ? 'General' : s === 'prenatal' ? 'Prenatal/OB' : s === 'medical_dental' ? 'Medical & Dental' : 'Vaccine';
                const isActive = createActiveTab === s;
                const isCompleted = i < createActiveIndex;
                return (
                  <button
                    key={s}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    onClick={() => setCreateActiveTab(s)}
                  >
                    <span className="stepper-step-index">
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="stepper-step-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="create-form-body">
            <form onSubmit={handleCreateGroup}>
              <div className="modal-body-scrollable">
                <ChildFormFields
                  activeTab={createActiveTab}
                  form={groupForm}
                  setForm={setGroupForm}
                  communities={communities}
                  groups={groups}
                  batches={batches}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => navigate('/beneficiary')}>Cancel</button>
                {createActiveTab !== 'general' && (
                  <button type="button" className="btn-secondary btn-back" onClick={() => {
                    if (createActiveTab === 'vaccine') setCreateActiveTab('medical_dental');
                    else if (createActiveTab === 'medical_dental') setCreateActiveTab('prenatal');
                    else setCreateActiveTab('general');
                  }}>Back</button>
                )}
                {createActiveTab !== 'vaccine' ? (
                  <button type="button" className="btn-primary btn-next" onClick={() => {
                    if (createActiveTab === 'general') setCreateActiveTab('prenatal');
                    else if (createActiveTab === 'prenatal') setCreateActiveTab('medical_dental');
                    else if (createActiveTab === 'medical_dental') setCreateActiveTab('vaccine');
                  }}>Next</button>
                ) : (
                  <button type="submit" className="btn-primary">Create</button>
                )}
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="tabs-row">
          <div className="tabs-list" role="tablist" aria-label="Beneficiary status filter">
            {!isCreateMother && !isCreateChild && !selectedSchool ? (
              STATUS_OPTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={selectedStatusFilter === key}
                  type="button"
                  className={`tab-btn${selectedStatusFilter === key ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedStatusFilter(key);
                    setPage(1);
                  }}
                >
                  <Icon />
                  <span>{label}</span>
                </button>
              ))
            ) : (
              <span>{'\u00A0'}</span>
            )}
          </div>
          <div className="search-container">
            {!isCreateMother && !isCreateChild && !selectedSchool ? (
              <>
                <SearchIcon />
                <input
                  type="text"
                  className="search-input-field"
                  placeholder="Search child name..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  aria-label="Search items"
                />
              </>
            ) : (
              <span>{'\u00A0'}</span>
            )}
          </div>
        </section>
      )}

      {selectedSchool && (
        <div className="mother-profile-card">
          <div className="profile-card-header">
            <div className="profile-header-main">
              <div className="profile-title-row">
                <h2>{selectedSchool.name}</h2>
                {selectedSchool.isHighRisk === 'Yes' && (
                  <span className="risk-badge high-risk">⚠️ High Risk</span>
                )}
                <span className="program-badge">{selectedSchool.programType || 'Maternal Health Program'}</span>
              </div>
              <div className="profile-subtitle">
                <span>{'\u00A0'}</span>
                <span className="separator">{'\u00A0'}</span>
                <span>{'\u00A0'}</span>
              </div>

            </div>
            <div className="profile-actions">
              {showMotherCheckup ? (
                <button type="button" className="btn-primary" onClick={() => openEditMother(selectedSchool)}>
                  Edit Profile
                </button>
              ) : (
                <button type="button" className="btn-secondary btn-checkups" onClick={() => setShowMotherCheckup(true)}>
                  Checkups
                </button>
              )}
              <button type="button" className="btn-close-profile" onClick={() => navigate('/beneficiary')} aria-label="Close profile">
                ✕
              </button>
            </div>
          </div>

          <div className="profile-card-body">
            {showMotherCheckup ? (
              <div className="mother-checkup-body">
                <div className="trimester-stepper">
                  {['1st Trimester', '2nd Trimester', '3rd Trimester'].map((trim, tIdx) => {
                    const trimesterIndex = ['1st Trimester', '2nd Trimester', '3rd Trimester'].indexOf(selectedSchool.trimester);
                    // determine how many checkups are completed for this trimester
                    // priority: if detailed `checkups` array is present on selectedSchool, use it
                    // otherwise: past trimesters => all 3 completed; current => fallback to 1 completed; future => 0
                    const detailed = selectedSchool.checkups && Array.isArray(selectedSchool.checkups[tIdx]);
                    const completedCount = detailed
                      ? selectedSchool.checkups[tIdx].filter(Boolean).length
                      : (tIdx < trimesterIndex ? 3 : (tIdx === trimesterIndex ? (selectedSchool.completedChecksThisTrimester ?? 1) : 0));

                    return (
                      <div key={trim} className="trimester">
                        <div className="trimester-title">{trim}</div>
                        <div className="trimester-steps">
                          {[1, 2, 3].map(step => {
                            const completed = step <= completedCount;
                            const isActive = activeTrimester === (tIdx + 1) && activeStep === step;
                            return (
                              <div key={step} className={`step ${completed ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                <button type="button" className="step-btn" onClick={() => openCheckup(tIdx + 1, step)} aria-label={`Open ${trim} checkup ${step}`}>
                                  <div className="step-circle">{completed ? '✓' : step}</div>
                                </button>
                                <div className="step-label">Checkup {step}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Mirror profile content: stats and details */}
                <div className="stats-grid" style={{ marginTop: '16px' }}>
                  <div className="stat-item">
                    <span className="stat-label">Date of Birth</span>
                    <span className="stat-value">{selectedSchool.dob ? new Date(selectedSchool.dob).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Contact Number</span>
                    <span className="stat-value">{selectedSchool.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">LMP Date</span>
                    <span className="stat-value">{selectedSchool.lmpDate ? new Date(selectedSchool.lmpDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">EDD Date</span>
                    <span className="stat-value">{selectedSchool.eddDate ? new Date(selectedSchool.eddDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Weight / Height</span>
                    <span className="stat-value">{selectedSchool.weight ? `${selectedSchool.weight} kg` : 'N/A'} / {selectedSchool.height ? `${selectedSchool.height} cm` : 'N/A'}</span>
                  </div>
                </div>

                <div className="profile-details-grid">
                  <div className="details-section">
                    <h3>Emergency & Spouse Details</h3>
                    <div className="details-list">
                      <div className="detail-row">
                        <span>Emergency Contact:</span>
                        <strong>{selectedSchool.emergencyName || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Emergency Relationship:</span>
                        <strong>{selectedSchool.emergencyRelationship || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Emergency Number:</span>
                        <strong>{selectedSchool.emergencyContact || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Spouse Name:</span>
                        <strong>{selectedSchool.spouseName || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Address:</span>
                        <strong>{selectedSchool.address || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="details-section">
                    <h3>Initial Prenatal Assessment</h3>
                    <div className="details-list">
                      <div className="detail-row">
                        <span>Prenatal Reg Date:</span>
                        <strong>{selectedSchool.prenatalRegDate ? new Date(selectedSchool.prenatalRegDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Trimester / Gest. Age:</span>
                        <strong>{selectedSchool.trimester || 'N/A'} ({selectedSchool.gestationalAge || 'N/A'} weeks)</strong>
                      </div>
                      <div className="detail-row">
                        <span>Blood Pressure (BP):</span>
                        <strong>{selectedSchool.prenatalBp || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Fundal Height / FHR:</span>
                        <strong>{selectedSchool.fundalHeight ? `${selectedSchool.fundalHeight} cm` : 'N/A'} / {selectedSchool.fhr ? `${selectedSchool.fhr} bpm` : 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Weight / Height at Reg:</span>
                        <strong>{selectedSchool.prenatalWeight ? `${selectedSchool.prenatalWeight} kg` : 'N/A'} / {selectedSchool.prenatalHeight ? `${selectedSchool.prenatalHeight} cm` : 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="checkup-footer-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={handleCancelCheckup}>Cancel</button>
                  <button type="button" className="btn-primary" onClick={handleSaveCheckup}>Save</button>
                </div>

              </div>
            ) : (
              <>
                {/* Personal Information */}
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">First Name</span>
                    <span className="stat-value">{selectedSchool.firstName || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Middle Name</span>
                    <span className="stat-value">{selectedSchool.middleName || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Surname</span>
                    <span className="stat-value">{selectedSchool.lastName || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Suffix</span>
                    <span className="stat-value">{selectedSchool.suffix || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Mother ID</span>
                    <span className="stat-value">{selectedSchool.motherId || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Batch</span>
                    <span className="stat-value">{selectedSchool.batch || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Group</span>
                    <span className="stat-value">{selectedSchool.group || 'N/A'}</span>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Date of Birth</span>
                    <span className="stat-value">{selectedSchool.dob ? new Date(selectedSchool.dob).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Contact Number</span>
                    <span className="stat-value">{selectedSchool.contactNumber || 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">LMP Date</span>
                    <span className="stat-value">{selectedSchool.lmpDate ? new Date(selectedSchool.lmpDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">EDD Date</span>
                    <span className="stat-value">{selectedSchool.eddDate ? new Date(selectedSchool.eddDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Weight / Height</span>
                    <span className="stat-value">{selectedSchool.weight ? `${selectedSchool.weight} kg` : 'N/A'} / {selectedSchool.height ? `${selectedSchool.height} cm` : 'N/A'}</span>
                  </div>
                </div>

                {/* Sub-sections Grid */}
                <div className="profile-details-grid">
                  {/* Emergency & Other Details */}
                  <div className="details-section">
                    <h3>Emergency & Spouse Details</h3>
                    <div className="details-list">
                      <div className="detail-row">
                        <span>Emergency Contact:</span>
                        <strong>{selectedSchool.emergencyName || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Emergency Relationship:</span>
                        <strong>{selectedSchool.emergencyRelationship || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Emergency Number:</span>
                        <strong>{selectedSchool.emergencyContact || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Spouse Name:</span>
                        <strong>{selectedSchool.spouseName || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Address:</span>
                        <strong>{selectedSchool.address || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Initial Prenatal Assessment */}
                  <div className="details-section">
                    <h3>Initial Prenatal Assessment</h3>
                    <div className="details-list">
                      <div className="detail-row">
                        <span>Prenatal Reg Date:</span>
                        <strong>{selectedSchool.prenatalRegDate ? new Date(selectedSchool.prenatalRegDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Trimester / Gest. Age:</span>
                        <strong>{selectedSchool.trimester || 'N/A'} ({selectedSchool.gestationalAge || 'N/A'} weeks)</strong>
                      </div>
                      <div className="detail-row">
                        <span>Blood Pressure (BP):</span>
                        <strong>{selectedSchool.prenatalBp || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Fundal Height / FHR:</span>
                        <strong>{selectedSchool.fundalHeight ? `${selectedSchool.fundalHeight} cm` : 'N/A'} / {selectedSchool.fhr ? `${selectedSchool.fhr} bpm` : 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Weight / Height at Reg:</span>
                        <strong>{selectedSchool.prenatalWeight ? `${selectedSchool.prenatalWeight} kg` : 'N/A'} / {selectedSchool.prenatalHeight ? `${selectedSchool.prenatalHeight} cm` : 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Obstetric & Obstetric History */}
                  <div className="details-section full-width-col">
                    <h3>Obstetric History & Pregnancies</h3>
                    <div className="ob-stats-row">
                      <div className="ob-stat">Gravida: <strong>{selectedSchool.gravida || '0'}</strong></div>
                      <div className="ob-stat">Para: <strong>{selectedSchool.para || '0'}</strong></div>
                      <div className="ob-stat">Abortion: <strong>{selectedSchool.abortion || '0'}</strong></div>
                      <div className="ob-stat">Stillbirth: <strong>{selectedSchool.stillbirth || '0'}</strong></div>
                    </div>
                  </div>

                  {/* Medical Conditions & Dental Health */}
                  <div className="details-section">
                    <h3>Medical Conditions History</h3>
                    <div className="medical-conditions-tags">
                      {selectedSchool.medicalConditions && Object.entries(selectedSchool.medicalConditions).map(([key, val]) => (
                        val ? (
                          <span key={key} className="medical-tag" style={{ textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                        ) : null
                      ))}
                      {(!selectedSchool.medicalConditions || !Object.values(selectedSchool.medicalConditions).some(Boolean)) && (
                        <span className="no-conditions-text">No medical conditions reported.</span>
                      )}
                    </div>
                    {selectedSchool.otherMedicalHistory && (
                      <div className="other-medical-notes">
                        <strong>Other Notes:</strong>
                        <p>{selectedSchool.otherMedicalHistory}</p>
                      </div>
                    )}
                  </div>

                  <div className="details-section">
                    <h3>Dental Health Record</h3>
                    <div className="details-list">
                      <div className="detail-row">
                        <span>Check-up Date:</span>
                        <strong>{selectedSchool.dentalCheckupDate ? new Date(selectedSchool.dentalCheckupDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Facility / Dentist:</span>
                        <strong>{selectedSchool.dentalFacility || 'N/A'} ({selectedSchool.dentistInCharge || 'N/A'})</strong>
                      </div>
                      <div className="detail-row">
                        <span>Dentist License / Contact:</span>
                        <strong>{selectedSchool.dentistLicense || 'N/A'} / {selectedSchool.dentistContact || 'N/A'}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Teeth Count / Findings:</span>
                        <strong>{selectedSchool.teethCount || 'N/A'} teeth / {selectedSchool.dentalFindings || 'N/A'}</strong>
                      </div>
                      <div className="detail-row flex-column">
                        <span>Work Done:</span>
                        <div className="dental-work-tags">
                          {selectedSchool.dentalWork && Object.entries(selectedSchool.dentalWork).map(([key, val]) => (
                            val ? (
                              <span key={key} className="dental-tag" style={{ textTransform: 'capitalize' }}>
                                {key.replace(/([A-Z])/g, ' $1')}
                              </span>
                            ) : null
                          ))}
                          {(!selectedSchool.dentalWork || !Object.values(selectedSchool.dentalWork).some(Boolean)) && (
                            <span className="no-work-text">No dental work recorded.</span>
                          )}
                        </div>
                      </div>
                      {selectedSchool.dentalRemarks && (
                        <div className="dental-remarks-box">
                          <strong>Dentist Recommendations:</strong>
                          <p>{selectedSchool.dentalRemarks}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vaccine Record */}
                  <div className="details-section full-width-col">
                    <h3>Tetanus Toxoid (TT) Vaccine Record</h3>
                    <div className="vaccines-display-grid">
                      {[1, 2, 3, 4, 5].map(num => {
                        const dateVal = selectedSchool[`tt${num}Date`];
                        const remarkVal = selectedSchool[`tt${num}Remarks`];
                        return (
                          <div key={num} className={`vaccine-card-item ${dateVal ? 'vaccinated' : 'pending'}`}>
                            <div className="vaccine-title">TT{num}</div>
                            <div className="vaccine-date">{dateVal ? new Date(dateVal).toLocaleDateString() : 'Not Given'}</div>
                            {remarkVal && <div className="vaccine-remarks">{remarkVal}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      )}



      {!(isCreateMother || isCreateChild || selectedSchool) && (
        <BeneficiaryTable
          currentRows={displayRows}
          filteredDataLength={displayLength}
          rangeStart={displayRangeStart}
          rangeEnd={displayRangeEnd}
          perPage={perPage}
          handlePerPageChange={handlePerPageChange}
          renderPaginationButtons={renderPaginationButtons}
          onCommunityRowClick={handleCommunityRowClick}
          motherProgressByName={motherProgressByName}
          communities={communities}
          batches={batches}
        />
      )}

      <CreateCommunityModal
        showModal={showModal === 'createCommunity'}
        onClose={() => setShowModal(null)}
        communityForm={communityForm}
        setCommunityForm={setCommunityForm}
        handleCreateCommunity={handleCreateCommunity}
        communities={communities}
        groups={groups}
        batches={batches}
      />
      {/* EditCommunityModal removed per request */}
      <CreateBatchModal
        showModal={showModal === 'createBatch'}
        onClose={() => setShowModal(null)}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleCreateBatch={handleCreateBatch}
        communities={communities}
      />
      <EditBatchModal
        showModal={showModal === 'editBatch'}
        onClose={() => setShowModal(null)}
        batchForm={batchForm}
        setBatchForm={setBatchForm}
        handleEditBatch={handleEditBatch}
        communities={communities}
      />
      <CreateGroupModal
        showModal={showModal === 'createGroup'}
        onClose={() => setShowModal(null)}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleCreateGroup={handleCreateGroup}
        communities={communities}
        batches={batches}
      />
      <EditGroupModal
        showModal={showModal === 'editGroup'}
        onClose={() => setShowModal(null)}
        groupForm={groupForm}
        setGroupForm={setGroupForm}
        handleEditGroup={handleEditGroup}
        communities={communities}
        batches={batches}
      />
    </div>
  );
}
