import React from 'react';
import ForgeReconciler from '@forge/react';
import GestionRoles from './GestionRoles';

const RolesApp = () => {
  return <GestionRoles />;
};

ForgeReconciler.render(
  <React.StrictMode>
    <RolesApp />
  </React.StrictMode>
);