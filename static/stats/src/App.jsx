import React, { useEffect, useMemo, useState } from 'react';
import { view, events } from '@forge/bridge';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0C66E4', '#00B8A9', '#FFAB00'];

const normalizeText = (value) =>
  String(value || '').toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeCategory = (value) => {
  const v = normalizeText(value);
  if (v.includes('transport') || v.includes('taxi') || v.includes('avion') || v.includes('train')) return 'Transport';
  if (v.includes('hebergement') || v.includes('hotel') || v.includes('airbnb')) return 'Hébergement';
  if (v.includes('restaurant') || v.includes('repas') || v.includes('restauration') || v.includes('mcdo')) return 'Restaurant';
  return 'Autre';
};

const parseAmount = (value) => {
  if (!value) return 0;
  const cleaned = String(value).replace(',', '.').replace(/[^\d.]/g, '');
  return Number(cleaned) || 0;
};

const convertToDH = (amount, currency) => {
  const devise = normalizeText(currency);
  if (devise.includes('eur')) return amount * 11;
  if (devise.includes('usd')) return amount * 10;
  if (devise.includes('aed')) return amount * 2.7;
  return amount;
};

const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;

  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={14}
      fontWeight="bold"
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

function App() {
  const [missions, setMissions] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedMissionKey, setSelectedMissionKey] = useState('');

  useEffect(() => {
    const updateData = (data) => {
      const missionsData = data?.missions || [];
      const analysesData = data?.analyses || [];

      setMissions(missionsData);
      setAnalyses(analysesData);

      if (missionsData.length > 0) {
        setSelectedMissionKey((prev) => prev || missionsData[0].issueKey);
      }
    };

    const load = async () => {
      const context = await view.getContext();
      const resourceContext =
        context?.extension?.resourceContext ||
        context?.resourceContext ||
        {};

      updateData(resourceContext);
    };

    let subscription;

    load();

    events.on('STATS_DATA', updateData).then((sub) => {
      subscription = sub;
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const selectedMission = missions.find((m) => m.issueKey === selectedMissionKey);

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

      map[employee] = (map[employee] || 0) + 1;
    });

    return Object.entries(map).map(([employee, count]) => ({
      employee,
      missions: count
    }));
  }, [missions]);

  const totalMission = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', color: '#172B4D' }}>
      <h2 style={{ textAlign: 'center' }}>Statistiques des missions</h2>

      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <label>
          Mission :
          <select
            value={selectedMissionKey}
            onChange={(e) => setSelectedMissionKey(e.target.value)}
            style={{ marginLeft: 10, padding: 8, borderRadius: 6 }}
          >
            {missions.map((mission) => (
              <option key={mission.issueKey} value={mission.issueKey}>
                {mission.titre} - {mission.prenomEmploye} {mission.nomEmploye}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <h3>Répartition des dépenses par mission</h3>

        <p>
          {selectedMission
            ? `${selectedMission.titre} - ${selectedMission.prenomEmploye} ${selectedMission.nomEmploye}`
            : 'Aucune mission sélectionnée'}
          <br />
          Total mission : <strong>{totalMission.toFixed(2)} DH</strong>
        </p>

        {pieData.length === 0 ? (
          <p>Aucune dépense trouvée pour cette mission.</p>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              {/* Cercle principal avec % à l'intérieur */}
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                labelLine={false}
                label={renderInsideLabel}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`slice-${entry.name}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              {/* Deuxième Pie seulement pour afficher texte + ligne dehors */}
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="none"
                legendType="none"
                labelLine={{ strokeWidth: 2 }}
                label={({ name, value }) => `${name} - ${Number(value).toFixed(2)} DH`}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`label-${entry.name}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>

              <Tooltip formatter={(value) => `${Number(value).toFixed(2)} DH`} />

              <Legend
                wrapperStyle={{ fontSize: 13 }}
                payload={pieData.map((item, index) => ({
                  value: item.name,
                  type: 'square',
                  color: COLORS[index % COLORS.length]
                }))}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ marginTop: 30, border: '1px solid #ddd', borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <h3>Nombre de missions par employé</h3>

        {barData.length === 0 ? (
          <p>Aucune mission trouvée.</p>
        ) : (
          <div style={{ width: Math.min(650, Math.max(420, barData.length * 180)), margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="employee"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  allowDecimals={false}
                  domain={[0, (dataMax) => Math.max(4, dataMax + 1)]}
                />

                <Tooltip formatter={(value) => `${value} mission(s)`} />

                <Bar
                  dataKey="missions"
                  fill="#4A90E2"
                  barSize={40}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;