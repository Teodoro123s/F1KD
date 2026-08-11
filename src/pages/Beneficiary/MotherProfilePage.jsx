import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import BeneficiaryMotherProfile from './BeneficiaryMotherProfile';

const DEFAULT_CHECKUPS = [[null, null, null], [null, null, null], [null, null, null]];

const calculateBmi = (weight, height) => {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  if (Number.isNaN(w) || Number.isNaN(h) || h <= 0) return '';
  const meters = h / 100;
  return (w / (meters * meters)).toFixed(1);
};

const getFirstIncompleteCheckup = (checkups = DEFAULT_CHECKUPS) => {
  for (let t = 0; t < 3; t += 1) {
    for (let s = 0; s < 3; s += 1) {
      if (!checkups[t]?.[s]?.completed) {
        return { trimester: t + 1, step: s + 1 };
      }
    }
  }
  return null;
};

export default function MotherProfilePage({ communities, setCommunities }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolId } = useParams();

  const selectedSchool = useMemo(
    () => communities.find((community) => community.id === schoolId),
    [communities, schoolId]
  );

  const [showMotherCheckup, setShowMotherCheckup] = useState(false);
  const [activeTrimester, setActiveTrimester] = useState(null);
  const [activeStep, setActiveStep] = useState(null);

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

  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('Vaginal');
  const [deliveryOutcome, setDeliveryOutcome] = useState('Single Healthy Birth');
  const [deliveryBirthWeight, setDeliveryBirthWeight] = useState('');
  const [deliveryBirthLength, setDeliveryBirthLength] = useState('');
  const [deliveryBabyGender, setDeliveryBabyGender] = useState('Male');
  const [deliveryBabyName, setDeliveryBabyName] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkup = params.get('checkup');
    setShowMotherCheckup(!!checkup);

    if (checkup) {
      const t = Number.parseInt(params.get('trimester'), 10);
      const s = Number.parseInt(params.get('step'), 10);
      setActiveTrimester(Number.isFinite(t) ? t : null);
      setActiveStep(Number.isFinite(s) ? s : null);
    } else {
      setActiveTrimester(null);
      setActiveStep(null);
    }
  }, [location.search]);

  useEffect(() => {
    if (!selectedSchool) return;

    if (selectedSchool.checkups?.[activeTrimester - 1]?.[activeStep - 1]) {
      const record = selectedSchool.checkups[activeTrimester - 1][activeStep - 1] || {};
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
  }, [selectedSchool, activeTrimester, activeStep]);

  useEffect(() => {
    if (!selectedSchool) return;
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
  }, [selectedSchool?.id]);

  const handleCancelCheckup = () => {
    setShowMotherCheckup(false);
    setActiveTrimester(null);
    setActiveStep(null);
    navigate('/beneficiary');
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
      alert('Please fill in all required fields: Blood Pressure, Weight, Fundal Height, and Fetal Heart Rate.');
      return;
    }

    const updatedCheckups = [...(selectedSchool.checkups || DEFAULT_CHECKUPS)];
    const trimesterIdx = activeTrimester - 1;
    const stepIdx = activeStep - 1;

    updatedCheckups[trimesterIdx] = [...(updatedCheckups[trimesterIdx] || [null, null, null])];
    updatedCheckups[trimesterIdx][stepIdx] = {
      motherId: selectedSchool.motherId || selectedSchool.id,
      trimester: activeTrimester,
      checkupNo: activeStep,
      checkupDate,
      serviceProvider: checkupServiceProvider.trim(),
      nextCheckupDate: checkupNextDate,
      bp: checkupBp.trim(),
      weight: parseFloat(checkupWeight.trim()) || checkupWeight.trim(),
      height: parseFloat(checkupHeight.trim()) || checkupHeight.trim(),
      bmi: calculateBmi(checkupWeight.trim(), checkupHeight.trim()),
      nutritionalStatus: checkupNutrition,
      gestationalAge: selectedSchool.lmpDate
        ? Math.max(0, Math.floor((new Date() - new Date(selectedSchool.lmpDate)) / (1000 * 60 * 60 * 24 * 7)))
        : parseInt(selectedSchool.gestationalAge, 10),
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
        quantity: checkupMilkQuantity ? parseInt(checkupMilkQuantity, 10) : '',
      },
      completed: true,
      date: checkupDate || new Date().toISOString().split('T')[0],
    };

    let completedCount = 0;
    for (let t = 0; t < 3; t += 1) {
      for (let s = 0; s < 3; s += 1) {
        if (updatedCheckups[t]?.[s]?.completed) completedCount += 1;
      }
    }

    const newProgress = Math.round((completedCount / 9) * 100);

    setCommunities((prev) =>
      prev.map((community) =>
        community.id === selectedSchool.id
          ? { ...community, checkups: updatedCheckups, progress: newProgress }
          : community
      )
    );

    alert(`Checkup ${activeStep} for Trimester ${activeTrimester} saved successfully!`);

    let nextT = null;
    let nextS = null;
    for (let t = 0; t < 3; t += 1) {
      for (let s = 0; s < 3; s += 1) {
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
      setActiveTrimester(null);
      setActiveStep(null);
      setShowMotherCheckup(true);
      navigate(`/beneficiary/school/${selectedSchool.id}?checkup=1`);
    }
  };

  const onSaveDelivery = (e) => {
    e.preventDefault();
    if (!selectedSchool) return;

    if (!deliveryDate || !deliveryType || !deliveryOutcome || !deliveryBabyGender || !deliveryBabyName.trim() || !deliveryBirthWeight || !deliveryBirthLength) {
      alert('Please fill in all delivery details: Date, Type, Outcome, Gender, Name, Weight, and Length.');
      return;
    }

    const deliveryDetails = {
      deliveryDate,
      deliveryType,
      outcome: deliveryOutcome,
      birthWeight: deliveryBirthWeight,
      birthLength: deliveryBirthLength,
      babyGender: deliveryBabyGender,
      babyName: deliveryBabyName.trim(),
    };

    setCommunities((prev) =>
      prev.map((community) =>
        community.id === selectedSchool.id
          ? {
              ...community,
              delivered: true,
              status: 'Delivered',
              deliveryDetails,
              progress: 100,
            }
          : community
      )
    );

    alert('Delivery details saved successfully!');
  };

  const openCheckup = (trimesterNum, stepNum) => {
    if (!selectedSchool) return;
    setShowMotherCheckup(true);
    setActiveTrimester(trimesterNum);
    setActiveStep(stepNum);
    navigate(`/beneficiary/school/${selectedSchool.id}?checkup=1&trimester=${trimesterNum}&step=${stepNum}`);
  };

  if (!selectedSchool) return null;

  return (
    <BeneficiaryMotherProfile
      selectedSchool={selectedSchool}
      showMotherCheckup={showMotherCheckup}
      activeTrimester={activeTrimester}
      activeStep={activeStep}
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
  );
}
