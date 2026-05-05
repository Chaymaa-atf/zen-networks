import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

function App() {
  const [pieData, setPieData] = useState([]);
  const [barData, setBarData] = useState([]);

  useEffect(() => {
    const load = async () => {
      const context = await view.getContext();

      const missions =
        context?.extension?.resourceContext?.missions || [];

      const analyses =
        context?.extension?.resourceContext?.analyses || [];

      // 🔥 PIE (par mission → type)
      const missionMap = {};

      analyses.forEach(a => {
        const mission = missions.find(m =>
          m.id === a.missionId || m.issueKey === a.issueKey
        );

        if (!mission) return;

        const key = mission.titre;

        if (!missionMap[key]) {
          missionMap[key] = {
            transport: 0,
            restaurant: 0,
            hebergement: 0
          };
        }

        const amount = Number(
          String(a.amount || 0)
            .replace(',', '.')
            .replace(/[^\d.]/g, '')
        ) || 0;

        const category = String(a.category || '').toLowerCase();

        if (category.includes('transport')) {
          missionMap[key].transport += amount;
        } else if (category.includes('restaurant')) {
          missionMap[key].restaurant += amount;
        } else {
          missionMap[key].hebergement += amount;
        }
      });

      const firstMission = Object.values(missionMap)[0] || {
        transport: 0,
        restaurant: 0,
        hebergement: 0
      };

      setPieData([
        { name: 'Transport', value: firstMission.transport },
        { name: 'Restaurant', value: firstMission.restaurant },
        { name: 'Hébergement', value: firstMission.hebergement }
      ]);

      // 🔥 BAR (par employé)
      const empMap = {};

      analyses.forEach(a => {
        const mission = missions.find(m =>
          m.id === a.missionId || m.issueKey === a.issueKey
        );

        if (!mission) return;

        const name = `${mission.prenomEmploye} ${mission.nomEmploye}`;

        const amount = Number(
          String(a.amount || 0)
            .replace(',', '.')
            .replace(/[^\d.]/g, '')
        ) || 0;

        empMap[name] = (empMap[name] || 0) + amount;
      });

      const employees = Object.entries(empMap).map(([name, value]) => ({
        name,
        value
      }));

      setBarData(employees);
    };

    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>

      <h2>Répartition des dépenses (Mission)</h2>

      <PieChart width={450} height={300}>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {pieData.map((entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>

      <h2>Dépenses par employé</h2>

      <BarChart width={600} height={300} data={barData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#0088FE" />
      </BarChart>

    </div>
  );
}

export default App;