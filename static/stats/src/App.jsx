import React, { useEffect, useMemo, useState } from 'react';
import { view } from '@forge/bridge';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (value) => {
  const v = normalizeText(value);

  if (v.includes('transport') || v.includes('taxi') || v.includes('avion')) return 'Transport';
  if (v.includes('hebergement') || v.includes('hotel') || v.includes('airbnb')) return 'Hébergement';
  if (v.includes('restaurant') || v.includes('repas') || v.includes('restauration')) return 'Restaurant';

  return 'Autre';
};

const parseAmount = (value) => {
  if (!value) return 0;

  const cleaned = String(value)
    .replace(',', '.')
    .replace(/[^\d.]/g, '');

  return Number(cleaned) || 0;
};

const convertToDH = (amount, currency) => {
  const devise = normalizeText(currency);

  if (devise.includes('eur')) return amount * 11;
  if (devise.includes('usd')) return amount * 10;
  if (devise.includes('aed')) return amount * 2.7;

  return amount;
};

function App() {
  const [missions, setMissions] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedMissionKey, setSelectedMissionKey] = useState('');

  useEffect(() => {
    const load = async () => {
      const context = await view.getContext();

      const missionsData =
        context?.extension?.resourceContext?.missions || [];

      const analysesData =
        context?.extension?.resourceContext?.analyses || [];

      setMissions(missionsData);
      setAnalyses(analysesData);

      if (missionsData.length > 0) {
        setSelectedMissionKey(missionsData[0].issueKey);
      }
    };

    load();
  }, []);

  const selectedMission = missions.find(
    (m) => m.issueKey === selectedMissionKey
  );

  const pieData = useMemo(() => {
    if (!selectedMissionKey) return [];

    const map = {
      Hébergement: 0,
      Transport: 0,
      Restaurant: 0
    };

    analyses
      .filter((a) => a.missionIssueKey === selectedMissionKey)
      .forEach((a) => {
        const category = normalizeCategory(a.category || a.type);
        const amount = parseAmount(a.amount || a.montant);
        const amountDH = convertToDH(amount, a.currency || a.devise);

        if (map[category] !== undefined) {
          map[category] += amountDH;
        }
      });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      }))
      .filter((item) => item.value > 0);
  }, [analyses, selectedMissionKey]);

  const barData = useMemo(() => {
    const map = {};

    missions.forEach((mission) => {
      const employee =
        `${mission.prenomEmploye || ''} ${mission.nomEmploye || ''}`.trim() ||
        'Employé inconnu';

      if (!map[employee]) {
        map[employee] = 0;
      }

      map[employee] += 1;
    });

    return Object.entries(map).map(([employee, count]) => ({
      employee,
      missions: count
    }));
  }, [missions]);

  const totalMission = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h2>Statistiques des missions</h2>

      <div style={{ marginBottom: 20 }}>
        <label>
          Mission :
          <select
            value={selectedMissionKey}
            onChange={(e) => setSelectedMissionKey(e.target.value)}
            style={{ marginLeft: 10, padding: 8 }}
          >
            {missions.map((mission) => (
              <option key={mission.issueKey} value={mission.issueKey}>
                {mission.titre} - {mission.prenomEmploye} {mission.nomEmploye}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 20 }}>
        <h3>
          Répartition des dépenses par mission
        </h3>

        <p>
          {selectedMission
            ? `${selectedMission.titre} - ${selectedMission.prenomEmploye} ${selectedMission.nomEmploye}`
            : 'Aucune mission sélectionnée'}
        </p>

        {pieData.length === 0 ? (
          <p>Aucune dépense trouvée pour cette mission.</p>
        ) : (
          <>
            <p>Total mission : <strong>{totalMission.toFixed(2)} DH</strong></p>

            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} DH`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      <div style={{ marginTop: 30, border: '1px solid #ddd', borderRadius: 12, padding: 20 }}>
        <h3>Nombre de missions par employé</h3>

        {barData.length === 0 ? (
          <p>Aucune mission trouvée.</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employee" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="missions" name="Nombre de missions" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default App;