import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Text } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [message, setMessage] = useState('Chargement...');

  useEffect(() => {
    invoke('getMessage')
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Erreur lors du chargement'));
  }, []);

  return <Text>{message}</Text>;
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);