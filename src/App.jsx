import React, { useState, useEffect } from 'react';
import { Users, Home, Database, Wifi, WifiOff, Save, Plus, Trash2 } from 'lucide-react';

const EnumerationApp = () => {
  const [projectName] = useState('COMMUNITY ENUMERATION PROJECT 2024');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentFamily, setCurrentFamily] = useState([]);
  const [familyHead, setFamilyHead] = useState('');
  const [totalFamilies, setTotalFamilies] = useState(0);
  const [totalPersons, setTotalPersons] = useState(0);
  const [syncStatus, setSyncStatus] = useState('synced');
  
  const [formData, setFormData] = useState({
    newDoorNo: '',
    oldDoorNo: '',
    portionNo: '',
    name: '',
    relationship: '',
    relativeName: '',
    gender: '',
    age: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    voterId: ''
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadStats();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadStats = async () => {
    try {
      const familiesData = await window.storage.list('family:', false);
      const families = familiesData ? familiesData.keys : [];
      setTotalFamilies(families.length);

      let personCount = 0;
      for (const familyKey of families) {
        try {
          const familyResult = await window.storage.get(familyKey, false);
          if (familyResult && familyResult.value) {
            const family = JSON.parse(familyResult.value);
            personCount += family.members ? family.members.length : 0;
          }
        } catch (err) {
          console.log('Skipping family:', familyKey);
        }
      }
      setTotalPersons(personCount);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleInputChange = (field, value) => {
    let processedValue = value;
    
    if (['name', 'relativeName', 'voterId'].includes(field)) {
      processedValue = value.toUpperCase();
    }
    
    if (field === 'dobDay' || field === 'dobMonth') {
      processedValue = value.slice(0, 2);
    }
    if (field === 'dobYear') {
      processedValue = value.slice(0, 4);
    }
    
    setFormData(prev => {
      const updated = {...prev};
      updated[field] = processedValue;
      return updated;
    });
  };

  const handleDOBInput = (field, value, nextFieldId) => {
    const numericValue = value.replace(/\D/g, '');
    let processedValue = numericValue;
    
    if (field === 'dobDay' || field === 'dobMonth') {
      processedValue = numericValue.slice(0, 2);
      if (processedValue.length === 2 && nextFieldId) {
        setTimeout(() => {
          const nextField = document.getElementById(nextFieldId);
          if (nextField) nextField.focus();
        }, 0);
      }
    } else if (field === 'dobYear') {
      processedValue = numericValue.slice(0, 4);
    }
    
    setFormData(prev => {
      const updated = {...prev};
      updated[field] = processedValue;
      return updated;
    });
  };

  const formatDOB = () => {
    const day = formData.dobDay;
    const month = formData.dobMonth;
    const year = formData.dobYear;
    if (day && month && year) {
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      return paddedDay + '/' + paddedMonth + '/' + year;
    }
    return '';
  };

  const addFamilyMember = () => {
    if (!formData.name) {
      alert('Name is required to add a family member');
      return;
    }

    const member = {
      id: Date.now(),
      newDoorNo: formData.newDoorNo,
      oldDoorNo: formData.oldDoorNo,
      portionNo: formData.portionNo,
      name: formData.name,
      relationship: formData.relationship,
      relativeName: formData.relativeName,
      gender: formData.gender,
      age: formData.age,
      dob: formatDOB(),
      voterId: formData.voterId,
      timestamp: new Date().toISOString()
    };

    const updatedFamily = [...currentFamily, member];
    setCurrentFamily(updatedFamily);

    if (updatedFamily.length === 1) {
      setFamilyHead(member.name);
    }

    setFormData({
      newDoorNo: formData.newDoorNo,
      oldDoorNo: formData.oldDoorNo,
      portionNo: formData.portionNo,
      name: '',
      relationship: '',
      relativeName: familyHead || member.name,
      gender: '',
      age: '',
      dobDay: '',
      dobMonth: '',
      dobYear: '',
      voterId: ''
    });
  };

  const removeFamilyMember = (id) => {
    setCurrentFamily(prev => prev.filter(m => m.id !== id));
  };

  const saveFamily = async () => {
    if (currentFamily.length === 0) {
      alert('Add at least one family member before saving');
      return;
    }

    try {
      const familyId = 'family:' + Date.now();
      const familyData = {
        id: familyId,
        doorNo: currentFamily[0].newDoorNo,
        familyHead: familyHead,
        members: currentFamily,
        createdAt: new Date().toISOString(),
        synced: false
      };

      await window.storage.set(familyId, JSON.stringify(familyData), false);
      
      await window.storage.set('sync:pending', 'true', false);
      setSyncStatus('pending');

      alert('Family saved successfully! ' + currentFamily.length + ' member(s) registered.');
      
      setCurrentFamily([]);
      setFamilyHead('');
      setFormData({
        newDoorNo: '',
        oldDoorNo: '',
        portionNo: '',
        name: '',
        relationship: '',
        relativeName: '',
        gender: '',
        age: '',
        dobDay: '',
        dobMonth: '',
        dobYear: '',
        voterId: ''
      });

      loadStats();
      
      if (isOnline) {
        syncData();
      }
    } catch (error) {
      console.error('Error saving family:', error);
      alert('Error saving family. Please try again.');
    }
  };

  const syncData = async () => {
    if (!isOnline) return;

    try {
      setSyncStatus('syncing');
      
      const familiesData = await window.storage.list('family:', false);
      const families = familiesData ? familiesData.keys : [];

      for (const familyKey of families) {
        try {
          const familyResult = await window.storage.get(familyKey, false);
          if (familyResult && familyResult.value) {
            const family = JSON.parse(familyResult.value);
            
            if (!family.synced) {
              const syncedFamily = {...family, synced: true};
              await window.storage.set(familyKey, JSON.stringify(syncedFamily), true);
              await window.storage.set(familyKey, JSON.stringify(syncedFamily), false);
            }
          }
        } catch (err) {
          console.log('Sync error for family:', familyKey, err);
        }
      }

      try {
        await window.storage.delete('sync:pending', false);
      } catch (err) {
        console.log('No pending sync flag');
      }
      setSyncStatus('synced');
      loadStats();
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-indigo-700 text-white rounded-t-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{projectName}</h1>
            </div>
            {isOnline ? (
              <Wifi className="w-6 h-6 text-green-300" />
            ) : (
              <WifiOff className="w-6 h-6 text-red-300" />
            )}
          </div>
          <p className="text-indigo-200 text-sm">Door-to-Door Family Enumeration</p>
        </div>

        <div className="bg-white p-4 shadow-md grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-indigo-600 mb-1">
              <Home className="w-5 h-5" />
              <span className="text-sm font-semibold">Families</span>
            </div>
            <div className="text-3xl font-bold text-indigo-700">{totalFamilies}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
              <Users className="w-5 h-5" />
              <span className="text-sm font-semibold">Persons</span>
            </div>
            <div className="text-3xl font-bold text-green-700">{totalPersons}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
              <Database className="w-5 h-5" />
              <span className="text-sm font-semibold">Status</span>
            </div>
            <div className={'text-xs font-semibold mt-2 px-2 py-1 rounded ' + (
              syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
              syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' :
              syncStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {syncStatus.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-b-xl shadow-lg p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {currentFamily.length === 0 ? 'Register Family Head' : 'Add Family Member (' + (currentFamily.length + 1) + ')'}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">New Door No</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.newDoorNo}
                  onChange={(e) => handleInputChange('newDoorNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={currentFamily.length > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Old Door No</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.oldDoorNo}
                  onChange={(e) => handleInputChange('oldDoorNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={currentFamily.length > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Portion No</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.portionNo}
                  onChange={(e) => handleInputChange('portionNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={currentFamily.length > 0}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                placeholder="FULL NAME"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="F">F (Father)</option>
                  <option value="H">H (Husband)</option>
                  <option value="O">O (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Relative Name</label>
                <input
                  type="text"
                  value={formData.relativeName}
                  onChange={(e) => handleInputChange('relativeName', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                  placeholder={familyHead || "RELATIVE NAME"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select</option>
                  <option value="M">M (Male)</option>
                  <option value="F">F (Female)</option>
                  <option value="O">O (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Age"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth (DD/MM/YYYY)</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.dobDay}
                  onChange={(e) => handleInputChange('dobDay', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                  placeholder="DD"
                  maxLength="2"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.dobMonth}
                  onChange={(e) => handleInputChange('dobMonth', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                  placeholder="MM"
                  maxLength="2"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.dobYear}
                  onChange={(e) => handleInputChange('dobYear', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                  placeholder="YYYY"
                  maxLength="4"
                />
              </div>
              {formatDOB() && (
                <p className="text-sm text-indigo-600 mt-1">Formatted: {formatDOB()}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Voter ID</label>
              <input
                type="text"
                value={formData.voterId}
                onChange={(e) => handleInputChange('voterId', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                placeholder="VOTER ID NUMBER"
              />
            </div>

            <button
              onClick={addFamilyMember}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md"
            >
              <Plus className="w-5 h-5" />
              {currentFamily.length === 0 ? 'Add Family Head' : 'Add Family Member'}
            </button>
          </div>
        </div>

        {currentFamily.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-3">
              Current Family ({currentFamily.length} member{currentFamily.length !== 1 ? 's' : ''})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentFamily.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">
                      {index === 0 && '👤 '}{member.name}
                      {index === 0 && <span className="text-xs ml-2 text-indigo-600">(HEAD)</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {member.gender && member.gender + ', '}
                      {member.age && 'Age: ' + member.age}
                      {member.voterId && ' | ID: ' + member.voterId}
                    </div>
                  </div>
                  {index > 0 && (
                    <button
                      onClick={() => removeFamilyMember(member.id)}
                      className="ml-3 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveFamily}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md"
            >
              <Save className="w-5 h-5" />
              Save Complete Family
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-600 mt-4">
          <p>Data stored securely • Auto-sync when online</p>
          <p className="text-xs mt-1">Powered by Persistent Storage</p>
        </div>
      </div>
    </div>
  );
};

export default EnumerationApp;