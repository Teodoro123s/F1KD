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
import BeneficiaryMotherProfile from './BeneficiaryMotherProfile';
import BeneficiaryChildProfile from './BeneficiaryChildProfile';

const DEFAULT_CHECKUPS = [[null, null, null], [null, null, null], [null, null, null]];

const calculateGestationalDetails = (lmpDate) => {
  if (!lmpDate) return { gestationalAge: '', trimester: '1st Trimester' };
  const lmp = new Date(lmpDate);
  if (Number.isNaN(lmp.getTime())) return { gestationalAge: '', trimester: '1st Trimester' };

  const today = new Date();
  const diffDays = Math.max(0, Math.floor((today - lmp) / (1000 * 60 * 60 * 24)));
  const gestationalAge = String(Math.floor(diffDays / 7));

  let trimester = '1st Trimester';
  if (gestationalAge > 26) trimester = '3rd Trimester';
  else if (gestationalAge > 12) trimester = '2nd Trimester';

  return { gestationalAge, trimester };
};

const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const getInitialCheckups = (trimester, bp, weight, fHeight, fRate, regDate, lmpDate) => {
  const checkups = [[null, null, null], [null, null, null], [null, null, null]];
  const trimIndex = ['1st Trimester', '2nd Trimester', '3rd Trimester'].indexOf(trimester || '1st Trimester');
  const todayStr = new Date().toISOString().split('T')[0];
  const dateVal = regDate || lmpDate || todayStr;

  for (let t = 0; t < 3; t++) {
    if (t < trimIndex) {
      for (let s = 0; s < 3; s++) {
        checkups[t][s] = {
          completed: true,
          autoMarked: true,
          bp: bp || '120/80',
          weight: weight || '55',
          fundalHeight: fHeight || '15',
          fhr: fRate || '140',
          notes: `Auto-completed based on registration in ${trimester || '2nd Trimester'}.`,
          date: dateVal,
        };
      }
    }
  }
  return checkups;
};

const getFirstIncompleteCheckup = (checkups = DEFAULT_CHECKUPS) => {
  for (let t = 0; t < 3; t++) {
    for (let s = 0; s < 3; s++) {
      if (!checkups[t]?.[s]?.completed) {
        return { trimester: t + 1, step: s + 1 };
      }
    }
  }
  return null;
};

const getStepStatus = (mother, tIdx, stepIdx) => {
  if (!mother) return 'locked';
  const checkups = mother.checkups || DEFAULT_CHECKUPS;
  if (checkups[tIdx]?.[stepIdx]?.completed) return 'completed';

  const firstIncomplete = getFirstIncompleteCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete.trimester === tIdx + 1 && firstIncomplete.step === stepIdx + 1) {
    return 'active';
  }

  return 'locked';
};

const PEDIATRIC_CHECKPOINTS = ['Birth / 0 Weeks', '6 Weeks', '3 Months', '6 Months', '9 Months', '12 Months (48 Weeks)'];
const DEFAULT_PEDIA_CHECKUPS = Array(PEDIATRIC_CHECKPOINTS.length).fill(null);

const getFirstIncompletePediaCheckup = (checkups = DEFAULT_PEDIA_CHECKUPS) => {
  for (let i = 0; i < PEDIATRIC_CHECKPOINTS.length; i++) {
    if (!checkups[i]?.completed) {
      return i + 1;
    }
  }
  return null;
};

const getPediaStepStatus = (child, stepIdx) => {
  if (!child) return 'locked';
  const checkups = child.childCheckups || DEFAULT_PEDIA_CHECKUPS;
  if (checkups[stepIdx]?.completed) return 'completed';
  const firstIncomplete = getFirstIncompletePediaCheckup(checkups);
  if (!firstIncomplete) return 'completed';
  if (firstIncomplete === stepIdx + 1) return 'active';
  return 'locked';
};

const getPediaBmiStatus = (bmi) => {
  const value = parseFloat(bmi);
  if (Number.isNaN(value)) return '';
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Normal';
  if (value < 30) return 'Overweight';
  return 'Obese';
};

const getTrimesterLabelFromCheckups = (checkups = DEFAULT_CHECKUPS) => {
  const firstIncomplete = getFirstIncompleteCheckup(checkups);
  if (!firstIncomplete) return '3rd Trimester';
  return ['1st Trimester', '2nd Trimester', '3rd Trimester'][firstIncomplete.trimester - 1];
};

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

  // Pre-populate detailed checkups array based on progress value
  const completedCheckupsCount = Math.min(9, Math.max(0, Math.round(progress / 11)));
  const checkups = [[null, null, null], [null, null, null], [null, null, null]];
  let count = 0;
  for (let t = 0; t < 3; t++) {
    for (let s = 0; s < 3; s++) {
      if (count < completedCheckupsCount) {
        checkups[t][s] = {
          completed: true,
          autoMarked: false,
          bp: override.prenatalBp || (idNum % 4 === 0 ? '130/90' : '110/70'),
          weight: override.prenatalWeight || override.weight || String(50 + (idNum % 15)),
          fundalHeight: override.fundalHeight || String(12 + (idNum % 6)),
          fhr: override.fhr || String(140 + (idNum % 10)),
          notes: 'Mock checkup record from initial data loading.',
          date: prenatalRegDate
        };
        count++;
      }
    }
  }

  const finalProgress = Math.round((completedCheckupsCount / 9) * 100);

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
    progress: finalProgress,
    checkups,
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
  const [showChildCheckup, setShowChildCheckup] = useState(false);
  const [activePediaStep, setActivePediaStep] = useState(null);

  // Checkup Form States
  const [checkupDate, setCheckupDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkupServiceProvider, setCheckupServiceProvider] = useState('');
  const [checkupNextDate, setCheckupNextDate] = useState('');
  const [checkupBp, setCheckupBp] = useState('');
  const [checkupWeight, setCheckupWeight] = useState('');
  const [checkupHeight, setCheckupHeight] = useState('');
  const [checkupNutrition, setCheckupNutrition] = useState('Normal');
  const [checkupFundalHeight, setCheckupFundalHeight] = useState('');
  const [checkupFhr, setCheckupFhr] = useState('');
  const [checkupReferral, setCheckupReferral] = useState(false);
  const [checkupLabAssistance, setCheckupLabAssistance] = useState(false);
  const [checkupAssistanceAmount, setCheckupAssistanceAmount] = useState('');
  const [checkupAssistanceSource, setCheckupAssistanceSource] = useState('');
  const [checkupMaternityType, setCheckupMaternityType] = useState('Govt');
  const [checkupMilkDate, setCheckupMilkDate] = useState('');
  const [checkupMilkQuantity, setCheckupMilkQuantity] = useState('');
  const [checkupNotes, setCheckupNotes] = useState('');

  const [pediaCheckupDate, setPediaCheckupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pediaWeight, setPediaWeight] = useState('');
  const [pediaHeight, setPediaHeight] = useState('');
  const [pediaHeadCircumference, setPediaHeadCircumference] = useState('');
  const [pediaFeeding, setPediaFeeding] = useState('Exclusive Breastfeeding');
  const [pediaVaccinesGiven, setPediaVaccinesGiven] = useState('');
  const [pediaDevelopmentNotes, setPediaDevelopmentNotes] = useState('');
  const [pediaReferral, setPediaReferral] = useState(false);
  const [pediaNextAppointment, setPediaNextAppointment] = useState('');
  const [pediaNotes, setPediaNotes] = useState('');
  const [pediaAgeMonths, setPediaAgeMonths] = useState('');
  const [pediaServiceProvider, setPediaServiceProvider] = useState('');
  const [pediaLabRequest, setPediaLabRequest] = useState(false);
  const [pediaAmount, setPediaAmount] = useState('');
  const [pediaSourceOfFunds, setPediaSourceOfFunds] = useState('Municipal Fund');
  const [pediaFacilityType, setPediaFacilityType] = useState('Govt');

  // Delivery Form States
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('Vaginal');
  const [deliveryOutcome, setDeliveryOutcome] = useState('Single Healthy Birth');
  const [deliveryBirthWeight, setDeliveryBirthWeight] = useState('');
  const [deliveryBirthLength, setDeliveryBirthLength] = useState('');
  const [deliveryBabyGender, setDeliveryBabyGender] = useState('Male');
  const [deliveryBabyName, setDeliveryBabyName] = useState('');

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
    const pedia = params.get('pedia');
    setShowMotherCheckup(!!checkup);
    setShowChildCheckup(!!pedia);

    if (checkup) {
      const t = parseInt(params.get('trimester'), 10);
      const s = parseInt(params.get('step'), 10);
      setActiveTrimester(Number.isFinite(t) ? t : null);
      setActiveStep(Number.isFinite(s) ? s : null);
    } else {
      setActiveTrimester(null);
      setActiveStep(null);
    }

    if (pedia) {
      const s = parseInt(params.get('step'), 10);
      setActivePediaStep(Number.isFinite(s) ? s : null);
    } else {
      setActivePediaStep(null);
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
      items.push({ label: 'Child', clickable: false });
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

  useEffect(() => {
    if (selectedSchool && activeTrimester && activeStep) {
      const record = selectedSchool.checkups?.[activeTrimester - 1]?.[activeStep - 1] || {};
      setCheckupDate(record.checkupDate || new Date().toISOString().split('T')[0]);
      setCheckupServiceProvider(record.serviceProvider || '');
      setCheckupNextDate(record.nextCheckupDate || '');
      setCheckupBp(record.bp || '');
      setCheckupWeight(record.weight || '');
      setCheckupHeight(record.height || selectedSchool.height || '');
      setCheckupNutrition(record.nutritionalStatus || 'Normal');
      setCheckupFundalHeight(record.fundalHeight || '');
      setCheckupFhr(record.fhr || '');
      setCheckupReferral(record.referral || false);
      setCheckupLabAssistance(record.labAssistance || false);
      setCheckupAssistanceAmount(record.amount || '');
      setCheckupAssistanceSource(record.sourceOfFunds || '');
      setCheckupMaternityType(record.maternityType || 'Govt');
      setCheckupMilkDate(record.milkSubsidy?.dateProvided || '');
      setCheckupMilkQuantity(record.milkSubsidy?.quantity ?? '');
      setCheckupNotes(record.notes || '');
    }
  }, [selectedSchool?.id, activeTrimester, activeStep]);

  useEffect(() => {
    if (selectedSchool) {
      if (selectedSchool.delivered && selectedSchool.deliveryDetails) {
        const details = selectedSchool.deliveryDetails;
        setDeliveryDate(details.deliveryDate || '');
        setDeliveryType(details.deliveryType || 'Vaginal');
        setDeliveryOutcome(details.outcome || 'Single Healthy Birth');
        setDeliveryBirthWeight(details.birthWeight || '');
        setDeliveryBirthLength(details.birthLength || '');
        setDeliveryBabyGender(details.babyGender || 'Male');
        setDeliveryBabyName(details.babyName || '');
      } else {
        setDeliveryDate(new Date().toISOString().split('T')[0]);
        setDeliveryType('Vaginal');
        setDeliveryOutcome('Single Healthy Birth');
        setDeliveryBirthWeight('');
        setDeliveryBirthLength('');
        setDeliveryBabyGender('Male');
        setDeliveryBabyName('');
      }
    }
  }, [selectedSchool?.id]);

  const handleCommunityRowClick = (row, type) => {
    if (type === 'mother') {
      const school = communities.find((comm) => comm.name === row.community);
      if (school) {
        navigate(`/beneficiary/school/${school.id}?checkup=1`);
      }
      return;
    }

    if (type === 'child') {
      const childGroup = groups.find((group) => group.id === row.id);
      if (childGroup) {
        navigate(`/beneficiary/group/${childGroup.id}`);
      }
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

    const initialCheckups = getInitialCheckups(
      communityForm.trimester,
      communityForm.prenatalBp,
      communityForm.prenatalWeight || communityForm.weight,
      communityForm.fundalHeight,
      communityForm.fhr,
      communityForm.prenatalRegDate,
      communityForm.lmpDate
    );
    let completedCount = 0;
    for (let t = 0; t < 3; t++) {
      for (let s = 0; s < 3; s++) {
        if (initialCheckups[t][s]?.completed) completedCount++;
      }
    }
    const initialProgress = Math.round((completedCount / 9) * 100);

    const { gestationalAge, trimester } = calculateGestationalDetails(communityForm.lmpDate);
    const resolvedTrimester = communityForm.lmpDate ? trimester : communityForm.trimester;
    const resolvedGestationalAge = communityForm.lmpDate ? gestationalAge : communityForm.gestationalAge;

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
      trimester: resolvedTrimester,
      gestationalAge: resolvedGestationalAge,
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
      progress: initialProgress,
      checkups: initialCheckups,
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
      prev.map((c) => {
        if (c.id === selectedItem.id) {
          const trimesterChanged = c.trimester !== communityForm.trimester;
          const updatedCheckups = trimesterChanged
            ? getInitialCheckups(
                communityForm.trimester,
                communityForm.prenatalBp,
                communityForm.prenatalWeight || communityForm.weight,
                communityForm.fundalHeight,
                communityForm.fhr,
                communityForm.prenatalRegDate,
                communityForm.lmpDate
              )
            : (c.checkups || getInitialCheckups(
                communityForm.trimester,
                communityForm.prenatalBp,
                communityForm.prenatalWeight || communityForm.weight,
                communityForm.fundalHeight,
                communityForm.fhr,
                communityForm.prenatalRegDate,
                communityForm.lmpDate
              ));

          let completedCount = 0;
          for (let t = 0; t < 3; t++) {
            for (let s = 0; s < 3; s++) {
              if (updatedCheckups[t][s]?.completed) completedCount++;
            }
          }
          const updatedProgress = Math.round((completedCount / 9) * 100);

          return {
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
            checkups: updatedCheckups,
            progress: updatedProgress,
          };
        }
        return c;
      })
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
    setActiveTrimester(null);
    setActiveStep(null);
    navigate(`/beneficiary/school/${selectedSchool?.id}`);
  };

  const onClearCheckupForm = () => {
    setCheckupDate(new Date().toISOString().split('T')[0]);
    setCheckupServiceProvider('');
    setCheckupNextDate('');
    setCheckupBp('');
    setCheckupWeight('');
    setCheckupHeight(selectedSchool?.height || '');
    setCheckupNutrition('Normal');
    setCheckupFundalHeight('');
    setCheckupFhr('');
    setCheckupReferral(false);
    setCheckupLabAssistance(false);
    setCheckupAssistanceAmount('');
    setCheckupAssistanceSource('');
    setCheckupMaternityType('Govt');
    setCheckupMilkDate('');
    setCheckupMilkQuantity('');
    setCheckupNotes('');
  };

  const onSaveCheckup = () => {
    if (!selectedSchool || !activeTrimester || !activeStep) return;

    if (!checkupBp.trim() || !checkupWeight.trim() || !checkupFundalHeight.trim() || !checkupFhr.trim()) {
      alert("Please fill in all required fields: Blood Pressure, Weight, Fundal Height, and Fetal Heart Rate.");
      return;
    }

    const updatedCheckups = [...(selectedSchool.checkups || [[null, null, null], [null, null, null], [null, null, null]])];
    const trimesterIdx = activeTrimester - 1;
    const stepIdx = activeStep - 1;

    updatedCheckups[trimesterIdx] = [...(updatedCheckups[trimesterIdx] || [null, null, null])];
    updatedCheckups[trimesterIdx][stepIdx] = {
      motherId: selectedSchool.motherId || selectedSchool.id,
      trimester: activeTrimester,
      checkupNo: activeStep,
      checkupDate: checkupDate,
      serviceProvider: checkupServiceProvider.trim(),
      nextCheckupDate: checkupNextDate,

      bp: checkupBp.trim(),
      weight: parseFloat(checkupWeight.trim()) || checkupWeight.trim(),
      height: parseFloat(checkupHeight.trim()) || checkupHeight.trim(),
      bmi: calculateBmi(checkupWeight.trim(), checkupHeight.trim()),
      nutritionalStatus: checkupNutrition,

      gestationalAge: selectedSchool.lmpDate ? Math.max(0, Math.floor((new Date() - new Date(selectedSchool.lmpDate)) / (1000 * 60 * 60 * 24 * 7))) : parseInt(selectedSchool.gestationalAge, 10),
      fundalHeight: checkupFundalHeight.trim(),
      fhr: parseInt(checkupFhr.trim(), 10) || checkupFhr.trim(),

      referral: checkupReferral,
      notes: checkupNotes.trim(),

      labAssistance: checkupLabAssistance,
      amount: checkupAssistanceAmount.trim(),
      sourceOfFunds: checkupAssistanceSource.trim(),
      maternityType: checkupMaternityType,
      milkSubsidy: {
        dateProvided: checkupMilkDate,
        quantity: checkupMilkQuantity ? parseInt(checkupMilkQuantity, 10) : ''
      },

      completed: true,
      date: checkupDate || new Date().toISOString().split('T')[0]
    };

    // Calculate completed checks
    let completedCount = 0;
    for (let t = 0; t < 3; t++) {
      for (let s = 0; s < 3; s++) {
        if (updatedCheckups[t]?.[s]?.completed) completedCount++;
      }
    }
    const newProgress = Math.round((completedCount / 9) * 100);

    const updatedMother = {
      ...selectedSchool,
      checkups: updatedCheckups,
      progress: newProgress,
      prenatalBp: checkupBp.trim(),
      prenatalWeight: checkupWeight.trim(),
      fundalHeight: checkupFundalHeight.trim(),
      fhr: checkupFhr.trim(),
    };

    setCommunities((prev) => prev.map((c) => (c.id === selectedSchool.id ? updatedMother : c)));

    alert(`Checkup ${activeStep} for Trimester ${activeTrimester} saved successfully!`);

    // Auto-advance logic
    let nextT = null;
    let nextS = null;
    for (let t = 0; t < 3; t++) {
      for (let s = 0; s < 3; s++) {
        if (!updatedCheckups[t]?.[s]?.completed) {
          nextT = t;
          nextS = s;
          break;
        }
      }
      if (nextT !== null) break;
    }

    if (nextT !== null) {
      openCheckup(nextT + 1, nextS + 1);
    } else {
      // All prenatal checks complete. Open delivery transition card.
      setActiveTrimester(null);
      setActiveStep(null);
      setShowMotherCheckup(true);
      navigate(`/beneficiary/school/${selectedSchool.id}?checkup=1`);
    }
  };

  const openPediaCheckup = (step) => {
    if (!selectedGroup) return;
    setShowChildCheckup(true);
    setActivePediaStep(step);
    navigate(`/beneficiary/group/${selectedGroup.id}?pedia=1&step=${step}`);
  };

  const onClearPediaCheckupForm = () => {
    setPediaCheckupDate(new Date().toISOString().split('T')[0]);
    setPediaWeight('');
    setPediaHeight('');
    setPediaHeadCircumference('');
    setPediaFeeding('Exclusive Breastfeeding');
    setPediaVaccinesGiven('');
    setPediaDevelopmentNotes('');
    setPediaReferral(false);
    setPediaNextAppointment('');
    setPediaNotes('');
    setPediaAgeMonths('');
    setPediaServiceProvider('');
    setPediaLabRequest(false);
    setPediaAmount('');
    setPediaSourceOfFunds('Municipal Fund');
    setPediaFacilityType('Govt');
  };

  const onSavePediaCheckup = () => {
    if (!selectedGroup || !activePediaStep) return;
    if (!pediaCheckupDate || !pediaWeight.trim() || !pediaHeight.trim()) {
      alert('Please fill in the pediatric checkup date, weight, and height.');
      return;
    }

    const updatedCheckups = [...(selectedGroup.childCheckups || DEFAULT_PEDIA_CHECKUPS)];
    const stepIdx = activePediaStep - 1;
    const bmiValue = calculateBmi(pediaWeight.trim(), pediaHeight.trim());
    updatedCheckups[stepIdx] = {
      step: activePediaStep,
      label: PEDIATRIC_CHECKPOINTS[stepIdx],
      checkupDate: pediaCheckupDate,
      ageInMonths: pediaAgeMonths.trim(),
      weight: pediaWeight.trim(),
      height: pediaHeight.trim(),
      headCircumference: pediaHeadCircumference.trim(),
      feedingType: pediaFeeding,
      bmi: bmiValue,
      bmiStatus: getPediaBmiStatus(bmiValue),
      serviceProvider: pediaServiceProvider.trim(),
      vaccinesGiven: pediaVaccinesGiven.trim(),
      developmentNotes: pediaDevelopmentNotes.trim(),
      referral: pediaReferral,
      nextAppointment: pediaNextAppointment,
      labRequest: pediaLabRequest,
      amount: pediaAmount.trim(),
      sourceOfFunds: pediaSourceOfFunds.trim(),
      facilityType: pediaFacilityType,
      notes: pediaNotes.trim(),
      completed: true,
    };

    const completedCount = updatedCheckups.filter((checkup) => checkup?.completed).length;
    const newProgress = Math.round((completedCount / PEDIATRIC_CHECKPOINTS.length) * 100);

    const updatedGroup = {
      ...selectedGroup,
      childCheckups: updatedCheckups,
      progress: newProgress,
      lastPediaCheckup: pediaCheckupDate,
    };

    setGroups((prev) => prev.map((g) => (g.id === selectedGroup.id ? updatedGroup : g)));
    alert(`Pediatric checkup ${activePediaStep} saved successfully!`);

    const nextIncomplete = getFirstIncompletePediaCheckup(updatedCheckups);
    if (nextIncomplete) {
      openPediaCheckup(nextIncomplete);
    } else {
      setActivePediaStep(null);
      setShowChildCheckup(true);
      navigate(`/beneficiary/group/${selectedGroup.id}?pedia=1`);
    }
  };

  const onSaveDelivery = (e) => {
    e.preventDefault();
    if (!selectedSchool) return;

    if (!deliveryDate || !deliveryType || !deliveryOutcome || !deliveryBabyGender || !deliveryBabyName.trim() || !deliveryBirthWeight || !deliveryBirthLength) {
      alert("Please fill in all delivery details: Date, Type, Outcome, Gender, Name, Weight, and Length.");
      return;
    }

    const deliveryDetails = {
      deliveryDate,
      deliveryType,
      outcome: deliveryOutcome,
      birthWeight: deliveryBirthWeight,
      birthLength: deliveryBirthLength,
      babyGender: deliveryBabyGender,
      babyName: deliveryBabyName.trim()
    };

    const updatedMother = {
      ...selectedSchool,
      delivered: true,
      status: 'Delivered',
      deliveryDetails,
      progress: 100
    };

    setCommunities((prev) => prev.map((c) => (c.id === selectedSchool.id ? updatedMother : c)));
    alert("Delivery details saved successfully!");

    // Prefill child registration form (groupForm)
    setGroupForm({
      firstName: deliveryBabyName.trim(),
      middleName: selectedSchool.middleName || '',
      lastName: selectedSchool.lastName || '',
      suffix: '',
      birthDate: deliveryDate,
      birthWeight: deliveryBirthWeight,
      birthLength: deliveryBirthLength,
      gender: deliveryBabyGender,
      deliveryType: deliveryType,
      healthStatus: 'Healthy',
      birthPlace: `${selectedSchool.area} Health Center`,
      birthAttendant: 'Midwife',
      apgarScore: '9',
      feedingType: 'Exclusive Breastfeeding',
      nutritionNotes: 'Healthy newborn, transitioned from maternal flow.',
      medicalConditions: {
        congenitalHeartDisease: false,
        respiratoryIssues: false,
        prematurity: false,
        jaundice: false,
        anemia: false,
        growthDelay: false,
      },
      medicalRemarks: 'Healthy transition.',
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
      community: selectedSchool.name,
      batch: '',
      assignedBatchIds: [],
      leader: '',
      members: 1,
      status: 'Active',
    });

    setCreateActiveTab('general');
    navigate('/beneficiary/create/child');
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

  const renderMotherProfile = () => {
    if (!selectedSchool) return null;
    return null;
  };

  const renderChildProfile = () => {
    if (!selectedGroup) return null;
    return null;
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
        <BeneficiaryMotherProfile
          selectedSchool={selectedSchool}
          showMotherCheckup={showMotherCheckup}
          activeTrimester={activeTrimester}
          activeStep={activeStep}
          openEditMother={openEditMother}
          openCheckup={openCheckup}
          handleCancelCheckup={handleCancelCheckup}
          onClearCheckupForm={onClearCheckupForm}
          onSaveCheckup={onSaveCheckup}
          onSaveDelivery={onSaveDelivery}
          deliveryDate={deliveryDate}
          setDeliveryDate={setDeliveryDate}
          deliveryType={deliveryType}
          deliveryOutcome={deliveryOutcome}
          deliveryBirthWeight={deliveryBirthWeight}
          deliveryBirthLength={deliveryBirthLength}
          deliveryBabyGender={deliveryBabyGender}
          deliveryBabyName={deliveryBabyName}
          setActiveTrimester={setActiveTrimester}
          setActiveStep={setActiveStep}
          setShowMotherCheckup={setShowMotherCheckup}
          navigate={navigate}
          checkupDate={checkupDate}
          setCheckupDate={setCheckupDate}
          checkupServiceProvider={checkupServiceProvider}
          setCheckupServiceProvider={setCheckupServiceProvider}
          checkupNextDate={checkupNextDate}
          setCheckupNextDate={setCheckupNextDate}
          checkupBp={checkupBp}
          setCheckupBp={setCheckupBp}
          checkupWeight={checkupWeight}
          setCheckupWeight={setCheckupWeight}
          checkupHeight={checkupHeight}
          setCheckupHeight={setCheckupHeight}
          checkupNutrition={checkupNutrition}
          setCheckupNutrition={setCheckupNutrition}
          checkupFundalHeight={checkupFundalHeight}
          setCheckupFundalHeight={setCheckupFundalHeight}
          checkupFhr={checkupFhr}
          setCheckupFhr={setCheckupFhr}
          checkupReferral={checkupReferral}
          setCheckupReferral={setCheckupReferral}
          checkupLabAssistance={checkupLabAssistance}
          setCheckupLabAssistance={setCheckupLabAssistance}
          checkupAssistanceAmount={checkupAssistanceAmount}
          setCheckupAssistanceAmount={setCheckupAssistanceAmount}
          checkupAssistanceSource={checkupAssistanceSource}
          setCheckupAssistanceSource={setCheckupAssistanceSource}
          checkupMaternityType={checkupMaternityType}
          setCheckupMaternityType={setCheckupMaternityType}
          checkupMilkDate={checkupMilkDate}
          setCheckupMilkDate={setCheckupMilkDate}
          checkupMilkQuantity={checkupMilkQuantity}
          setCheckupMilkQuantity={setCheckupMilkQuantity}
          checkupNotes={checkupNotes}
          setCheckupNotes={setCheckupNotes}
        />
      )}



      {selectedGroup && (
        <BeneficiaryChildProfile
          selectedGroup={selectedGroup}
          showChildCheckup={showChildCheckup}
          activePediaStep={activePediaStep}
          openPediaCheckup={openPediaCheckup}
          handleCancelCheckup={handleCancelCheckup}
          onClearPediaCheckupForm={onClearPediaCheckupForm}
          onSavePediaCheckup={onSavePediaCheckup}
          setActivePediaStep={setActivePediaStep}
          setShowChildCheckup={setShowChildCheckup}
          navigate={navigate}
          pediaCheckupDate={pediaCheckupDate}
          setPediaCheckupDate={setPediaCheckupDate}
          pediaAgeMonths={pediaAgeMonths}
          setPediaAgeMonths={setPediaAgeMonths}
          pediaServiceProvider={pediaServiceProvider}
          setPediaServiceProvider={setPediaServiceProvider}
          pediaWeight={pediaWeight}
          setPediaWeight={setPediaWeight}
          pediaHeight={pediaHeight}
          setPediaHeight={setPediaHeight}
          pediaHeadCircumference={pediaHeadCircumference}
          setPediaHeadCircumference={setPediaHeadCircumference}
          pediaFeeding={pediaFeeding}
          setPediaFeeding={setPediaFeeding}
          pediaVaccinesGiven={pediaVaccinesGiven}
          setPediaVaccinesGiven={setPediaVaccinesGiven}
          pediaLabRequest={pediaLabRequest}
          setPediaLabRequest={setPediaLabRequest}
          pediaAmount={pediaAmount}
          setPediaAmount={setPediaAmount}
          pediaSourceOfFunds={pediaSourceOfFunds}
          setPediaSourceOfFunds={setPediaSourceOfFunds}
          pediaFacilityType={pediaFacilityType}
          setPediaFacilityType={setPediaFacilityType}
          pediaDevelopmentNotes={pediaDevelopmentNotes}
          setPediaDevelopmentNotes={setPediaDevelopmentNotes}
          pediaNotes={pediaNotes}
          setPediaNotes={setPediaNotes}
        />
      )}

      {!selectedGroup && !(isCreateMother || isCreateChild || selectedSchool) && (
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
