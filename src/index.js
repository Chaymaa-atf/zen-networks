import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [message, setMessage] = useState("Chargement...");

  useEffect(() => {
    invoke('getMessage')
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Erreur lors du chargement"));
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <h1>Forge fonctionne 🚀</h1>
      <p>{message}</p>
    </div>
  );
};

export default App;