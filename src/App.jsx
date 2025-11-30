import React, { useState, useEffect } from 'react';
import { Users, Home, Database, Wifi, WifiOff, Save, Plus, Trash2, Download, Settings } from 'lucide-react';

const EnumerationApp = () => {
  const [projectName] = useState('COMMUNITY ENUMERATION PROJECT 2025');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentFamily, setCurrentFamily] = useState([]);
  const [familyHead, setFamilyHead] = useState('');
  const [totalFamilies, setTotalFamilies] = useState(0);
  const [totalPersons, setTotalPersons] = useState(0);
  const [syncStatus, setSyncStatus] = useState('synced');
  const [db, setDb] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(localStorage.getItem('googleSheetUrl') || '');
  const [enumeratorName, setEnumeratorName] = useState(localStorage.getItem('enumeratorName') || '');
  
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
    initDB();
    
    const handleOnline = () => {
      setIsOnline(true);
      syncToGoogleSheets();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (db) {
      loadStats();
    }
  }, [db]);

  const initDB = () => {
    const request = indexedDB.open('EnumerationDB', 1);
    
    request.onerror = () => {
      console.error('Database failed to open');
      alert('Failed to initialize database. Please refresh the page.');
    };
    
    request.onsuccess = () => {
      const database = request.result;
      setDb(database);
    };
    
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      
      if (!database.objectStoreNames.contains('families')) {
        const objectStore = database.createObjectStore('families', { keyPath: 'id' });
        objectStore.createIndex('doorNo', 'doorNo', { unique: false });
        objectStore.createIndex('synced', 'synced', { unique: false });
      }
    };
  };

  const loadStats = () => {
    if (!db) return;
    
    const transaction = db.transaction(['families'], 'readonly');
    const objectStore = transaction.objectStore('families');
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
      const families = request.result;
      setTotalFamilies(families.length);
      
      let personCount = 0;
      families.forEach(family => {
        personCount += family.members ? family.members.length : 0;
      });
      setTotalPersons(personCount);
    };
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
      return day.padStart(2, '0') + '/' + month.padStart(2, '0') + '/' + year;
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

  const saveFamily = () => {
    if (currentFamily.length === 0) {
      alert('Add at least one family member before saving');
      return;
    }

    if (!db) {
      alert('Database not ready. Please wait a moment and try again.');
      return;
    }

    const familyId = 'family_' + Date.now();
    const familyData = {
      id: familyId,
      doorNo: currentFamily[0].newDoorNo,
      familyHead: familyHead,
      members: currentFamily,
      createdAt: new Date().toISOString(),
      enumerator: enumeratorName || 'Unknown',
      synced: false
    };

    const transaction = db.transaction(['families'], 'readwrite');
    const objectStore = transaction.objectStore('families');
    const request = objectStore.add(familyData);
    
    request.onsuccess = () => {
      alert('Family saved! ' + currentFamily.length + ' member(s) registered locally.');
      
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
      setSyncStatus('pending');
      
      if (isOnline && googleSheetUrl) {
        syncToGoogleSheets();
      }
    };
    
    request.onerror = () => {
      alert('Error saving family. Please try again.');
    };
  };

  const syncToGoogleSheets = async () => {
    if (!isOnline || !db || !googleSheetUrl) {
      return;
    }

    setSyncStatus('syncing');
    
    const transaction = db.transaction(['families'], 'readonly');
    const objectStore = transaction.objectStore('families');
    const request = objectStore.getAll();
    
    request.onsuccess = async () => {
      const families = request.result;
      const unsyncedFamilies = families.filter(f => !f.synced);
      
      if (unsyncedFamilies.length === 0) {
        setSyncStatus('synced');
        return;
      }

      const rows = [];
      unsyncedFamilies.forEach(family => {
        family.members.forEach(member => {
          rows.push({
            familyId: family.id,
            doorNo: member.newDoorNo || '',
            oldDoorNo: member.oldDoorNo || '',
            portionNo: member.portionNo || '',
            familyHead: family.familyHead,
            memberName: member.name,
            relationship: member.relationship || '',
            relativeName: member.relativeName || '',
            gender: member.gender || '',
            age: member.age || '',
            dob: member.dob || '',
            voterId: member.voterId || '',
            enumerator: family.enumerator || '',
            createdAt: family.createdAt
          });
        });
      });

      try {
        await fetch(googleSheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rows: rows })
        });

        const updateTransaction = db.transaction(['families'], 'readwrite');
        const updateStore = updateTransaction.objectStore('families');
        
        unsyncedFamilies.forEach(family => {
          family.synced = true;
          updateStore.put(family);
        });
        
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('pending');
      }
    };
  };

  const saveSettings = () => {
    localStorage.setItem('googleSheetUrl', googleSheetUrl);
    localStorage.setItem('enumeratorName', enumeratorName);
    setShowSettings(false);
    alert('Settings saved!');
    if (isOnline && googleSheetUrl) {
      syncToGoogleSheets();
    }
  };

  const exportData = () => {
    if (!db) return;
    
    const transaction = db.transaction(['families'], 'readonly');
    const objectStore = transaction.objectStore('families');
    const request = objectStore.getAll();
    
    request.onsuccess = () => {
      const families = request.result;
      const csvRows = [];
      
      csvRows.push('Family ID,Door No,Old Door,Portion,Family Head,Name,Relation,Relative,Gender,Age,DOB,Voter ID,Enumerator,Date');
      
      families.forEach(family => {
        family.members.forEach(member => {
          const row = [
            family.id,
            member.newDoorNo || '',
            member.oldDoorNo || '',
            member.portionNo || '',
            family.familyHead,
            member.name,
            member.relationship || '',
            member.relativeName || '',
            member.gender || '',
            member.age || '',
            member.dob || '',
            member.voterId || '',
            family.enumerator || '',
            family.createdAt
          ];
          csvRows.push(row.map(f => '"' + f + '"').join(','));
        });
      });
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enumeration_' + new Date().toISOString().split('T')[0] + '.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-indigo-700 text-white rounded-t-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="w-8 h-8" />
              <h1 className="text-xl font-bold">{projectName}</h1>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi className="w-5 h-5 text-green-300" /> : <WifiOff className="w-5 h-5 text-red-300" />}
              <button onClick={exportData} className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500" title="Export CSV">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-indigo-200 text-sm">Door-to-Door Enumeration</p>
          {enumeratorName && <p className="text-indigo-300 text-xs mt-1">By: {enumeratorName}</p>}
        </div>

        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-screen overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">⚙️ Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Your Name</label>
                  <input
                    type="text"
                    value={enumeratorName}
                    onChange={(e) => setEnumeratorName(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border-2 rounded-lg uppercase"
                    placeholder="YOUR NAME"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Google Script URL</label>
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    className="w-full px-3 py-2 border-2 rounded-lg text-sm"
                    placeholder="https://script.google.com/..."
                  />
                  <p className="text-xs text-gray-600 mt-1">Paste Web App URL from Google</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                  <p className="text-xs"><strong>ℹ️ Note:</strong> Data saves locally even without Google Sheets. Sync is optional for team sharing.</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={saveSettings} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">
                  Save
                </button>
                <button onClick={() => setShowSettings(false)} className="flex-1 bg-gray-200 py-2 rounded-lg font-bold">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-4 shadow-md grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-indigo-600 mb-1">
              <Home className="w-5 h-5" />
              <span className="text-sm font-bold">Families</span>
            </div>
            <div className="text-3xl font-bold text-indigo-700">{totalFamilies}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
              <Users className="w-5 h-5" />
              <span className="text-sm font-bold">Persons</span>
            </div>
            <div className="text-3xl font-bold text-green-700">{totalPersons}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
              <Database className="w-5 h-5" />
              <span className="text-sm font-bold">Sync</span>
            </div>
            <div className={'text-xs font-bold mt-2 px-2 py-1 rounded ' + (
              syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
              syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' :
              'bg-yellow-100 text-yellow-700'
            )}>
              {syncStatus.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-b-xl shadow-lg p-6 mb-4">
          <h2 className="text-xl font-bold mb-4">
            {currentFamily.length === 0 ? '👤 Register Family Head' : '➕ Add Member (' + (currentFamily.length + 1) + ')'}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">New Door</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.newDoorNo}
                  onChange={(e) => handleInputChange('newDoorNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                  disabled={currentFamily.length > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Old Door</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.oldDoorNo}
                  onChange={(e) => handleInputChange('oldDoorNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                  disabled={currentFamily.length > 0}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Portion</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.portionNo}
                  onChange={(e) => handleInputChange('portionNo', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                  disabled={currentFamily.length > 0}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border-2 rounded-lg uppercase"
                placeholder="FULL NAME"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">Relationship</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="F">F (Father)</option>
                  <option value="H">H (Husband)</option>
                  <option value="O">O (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Relative Name</label>
                <input
                  type="text"
                  value={formData.relativeName}
                  onChange={(e) => handleInputChange('relativeName', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg uppercase"
                  placeholder={familyHead || "NAME"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="M">M (Male)</option>
                  <option value="F">F (Female)</option>
                  <option value="O">O (Other)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full px-3 py-2 border-2 rounded-lg"
                  placeholder="Age"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Date of Birth</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    id="dobDay"
                    type="tel"
                    inputMode="numeric"
                    value={formData.dobDay}
                    onChange={(e) => handleDOBInput('dobDay', e.target.value, 'dobMonth')}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center font-bold"
                    placeholder="DD"
                    maxLength="2"
                  />
                  <p className="text-xs text-center mt-1">2 digits</p>
                </div>
                <div>
                  <input
                    id="dobMonth"
                    type="tel"
                    inputMode="numeric"
                    value={formData.dobMonth}
                    onChange={(e) => handleDOBInput('dobMonth', e.target.value, 'dobYear')}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center font-bold"
                    placeholder="MM"
                    maxLength="2"
                  />
                  <p className="text-xs text-center mt-1">2 digits</p>
                </div>
                <div>
                  <input
                    id="dobYear"
                    type="tel"
                    inputMode="numeric"
                    value={formData.dobYear}
                    onChange={(e) => handleDOBInput('dobYear', e.target.value, null)}
                    className="w-full px-3 py-2 border-2 rounded-lg text-center font-bold"
                    placeholder="YYYY"
                    maxLength="4"
                  />
                  <p className="text-xs text-center mt-1">4 digits</p>
                </div>
              </div>
              {formatDOB() && <p className="text-sm text-indigo-600 mt-1 font-bold">📅 {formatDOB()}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Voter ID</label>
              <input
                type="text"
                value={formData.voterId}
                onChange={(e) => handleInputChange('voterId', e.target.value)}
                className="w-full px-3 py-2 border-2 rounded-lg uppercase"
                placeholder="VOTER ID"
              />
            </div>

            <button
              onClick={addFamilyMember}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {currentFamily.length === 0 ? 'Add Family Head' : 'Add Member'}
            </button>
          </div>
        </div>

        {currentFamily.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h3 className="text-lg font-bold mb-3">
              Current Family ({currentFamily.length} member{currentFamily.length !== 1 ? 's' : ''})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {currentFamily.map((member, index) => (
                <div key={member.id} className="flex justify-between bg-gray-50 p-3 rounded-lg border-2">
                  <div>
                    <div className="font-bold">
                      {index === 0 && '👤 '}{member.name}
                      {index === 0 && <span className="text-xs ml-2 text-indigo-600">(HEAD)</span>}
                    </div>
                    <div className="text-sm text-gray-600">
                      {member.gender && member.gender + ' | '}
                      {member.age && 'Age: ' + member.age}
                      {member.voterId && ' | ' + member.voterId}
                    </div>
                  </div>
                  {index > 0 && (
                    <button onClick={() => removeFamilyMember(member.id)} className="text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveFamily}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              💾 Save Complete Family
            </button>
          </div>
        )}

        <div className="text-center text-sm text-gray-600 mt-4 bg-white rounded-lg p-3">
          <p className="font-bold">✅ Works Offline | 💾 Local Storage | ☁️ Auto-Sync</p>
        </div>
      </div>
    </div>
  );
};

export default EnumerationApp;
