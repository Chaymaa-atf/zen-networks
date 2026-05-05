import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Inline,
  Label,
  Stack,
  Text,
  Textfield
} from '@forge/react';

import {
  getAdminUsers,
  addAdminUser,
  removeAdminUser,
  searchJiraUsersForAdmin
} from '../services/missionService';

const GestionRoles = ({ onBack }) => {
  const [admins, setAdmins] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);

  const loadAdmins = async () => {
    const res = await getAdminUsers();

    if (res.success) {
      setAdmins(res.admins || []);
    } else {
      setMessage(res.message);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSearch = async () => {
    if (!searchText || searchText.trim().length < 2) {
      setMessage('Saisir au moins 2 caractères.');
      return;
    }

    setLoadingSearch(true);
    setMessage('');

    const res = await searchJiraUsersForAdmin(searchText);

    if (res.success) {
      setUsers(res.users || []);
    } else {
      setUsers([]);
      setMessage(res.message);
    }

    setLoadingSearch(false);
  };

  const handleAdd = async (user) => {
    const res = await addAdminUser(user.accountId);

    setMessage(res.message);

    if (res.success) {
      setSearchText('');
      setUsers([]);
      await loadAdmins();
    }
  };

  const handleRemove = async (accountId) => {
    const res = await removeAdminUser(accountId);

    setMessage(res.message);

    if (res.success) {
      await loadAdmins();
    }
  };

  return (
    <Box>
      <Stack space="space.200">
        <Inline spread="space-between" alignBlock="center">
          <Heading size="large">Gestion des rôles</Heading>

          {onBack && (
            <Button appearance="subtle" onClick={onBack}>
              ← Retour aux missions
            </Button>
          )}
        </Inline>

        {message && <Text>{message}</Text>}

        <Stack space="space.100">
          <Label>Rechercher un utilisateur Jira</Label>

          <Inline space="space.100" alignBlock="center">
            <Textfield
              value={searchText}
              placeholder="Exemple : Chaymaa, Ahmed..."
              onChange={(e) => setSearchText(e.target.value)}
            />

            <Button appearance="primary" onClick={handleSearch}>
              {loadingSearch ? 'Recherche...' : 'Rechercher'}
            </Button>
          </Inline>
        </Stack>

        {users.length > 0 && (
          <Stack space="space.100">
            <Heading size="small">Résultats de recherche</Heading>

            {users.map((user) => (
              <Box key={user.accountId}>
                <Inline spread="space-between" alignBlock="center">
                  <Stack space="space.025">
                    <Text>{user.displayName}</Text>
                    <Text color="color.text.subtlest">
                      {user.emailAddress || ''}
                    </Text>
                  </Stack>

                  <Button appearance="primary" onClick={() => handleAdd(user)}>
                    Ajouter admin
                  </Button>
                </Inline>
              </Box>
            ))}
          </Stack>
        )}

        <Heading size="medium">Liste des administrateurs</Heading>

        {admins.map((admin) => (
          <Box key={admin.accountId}>
            <Inline spread="space-between" alignBlock="center">
              <Stack space="space.025">
                <Text>{admin.displayName}</Text>
                <Text color="color.text.subtlest">
                  {admin.emailAddress || admin.accountId}
                </Text>
              </Stack>

              {admins.length > 1 && (
                <Button
                  appearance="danger"
                  onClick={() => handleRemove(admin.accountId)}
                >
                  Supprimer
                </Button>
              )}
            </Inline>
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

export default GestionRoles;